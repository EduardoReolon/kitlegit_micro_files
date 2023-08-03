import Helpers from "../Helpers";
import fs from 'fs';
import child_process from 'child_process';
import Storage from "./storage";
const zmq = require("zeromq");

let argExec = process.platform.match(/win/i) ? 'py' : 'python3';

export default class Python {
  static argExecDefined = false;
  static defineArgExec () {
    if (Python.argExecDefined) return;
    if (fs.existsSync(Helpers.appRoot('/venv/Scripts'))) {
      argExec = Helpers.appRoot('/venv/Scripts/python');
      argExec = argExec.split(/\\|\//g).map((w) => {
        if (!w) return '';
        if (w.match(/[a-z]:/i)) return w;
        if (w.includes(' ')) return `"${w}"`;
        return w;
      }).join(`/`)
    }
    Python.argExecDefined = true;
  }

  static async socketCall({args}: {args: string[]}) {
    const storageSettings = Storage.getSettings();

    const params: {[key: string]: string | number} = {
      account: storageSettings.azure.account,
      account_key: storageSettings.azure.account_key,
      container: storageSettings.azure.container,
    }
    for (const arg of args) {
      const arr = arg.slice(2).split(' ');
      params[arr[0]] = arr[1];
    }

    const sock = new zmq.Request;
    let tries = 0;
    sock.events.on('connect:retry', () => {
      tries += 1;
      if (tries > 3) throw new Error('No socket connection');
    });

    sock.connect("tcp://localhost:5555");

    await sock.send(JSON.stringify(params))
    let [result]: [Buffer | string] = await sock.receive() as [Buffer];


    result = result.toString();
    if (result === 'error') throw new Error('Error inside python');

    return {
      stdout: JSON.parse(JSON.parse(result)),
      stderr: undefined
    };
  }

  static async call({args, method = 'socket'}: {args: string[], method?: 'socket' | 'spawn'}): Promise<{stdout: string, stderr: string | undefined}> {
    Python.defineArgExec();
    const storageSettings = Storage.getSettings();

    if (method === 'spawn') {
      return child_process.spawnSync(argExec, [
          Helpers.appRoot('/python/init.py'),
          '--connectionMethod spawn',
          `--account ${storageSettings.azure.account}`,
          `--account_key ${storageSettings.azure.account_key}`,
          `--container ${storageSettings.azure.container}`,
          ...args,
        ],
        {encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'], shell: true})
    } else {
      try {
        return await Python.socketCall({args});
      } catch (error) {
        return await Python.call({args, method: 'spawn'});
      }
    }
  }
}
