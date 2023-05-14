import Helpers from "../Helpers";
import fs from 'fs';
import child_process from 'child_process';
import Storage from "./storage";

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

  static async call({args}: {args: string[]}) {
    Python.defineArgExec();
    const storageSettings = Storage.getSettings();
    return child_process.spawnSync(argExec, [
        Helpers.appRoot('/python/init.py'),
        `--account ${storageSettings.azure.account}`,
        `--account_key ${storageSettings.azure.account_key}`,
        `--container ${storageSettings.azure.container}`,
        ...args,
        // '--target storage',
        // '--func downloadAsCv2',
        // `--relPath testing/img.jpg`,
      ],
      {encoding: 'utf-8', stdio: ['ignore', 'pipe', 'inherit'], shell: true})
    // console.log('stdout:', stdout);
    // console.log('stderr:', stderr);
  }
}
