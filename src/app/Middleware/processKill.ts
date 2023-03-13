import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";
import Log from "../services/log";

export default class ProcessKill implements middlewareContract {
  priority = 2;
  isGlobal: boolean = true;
  static toKill: boolean = false;
  static blockIncoming: boolean = false;
  static processesCount: number = 0;

  static startKill() {
    ProcessKill.toKill = true;
    new Log({route: 'processKill middleware - processAdd'}).setSideData({processesCount: ProcessKill.processesCount}).save();
    ProcessKill.processesRemove(0);
  }

  processesAdd() {
    if (ProcessKill.blockIncoming) {
      throw new Error('Server is about to restart');
    }

    ProcessKill.processesCount += 1;
  }

  static processesRemove(value: number = 1) {
    ProcessKill.processesCount -= value;
    if (ProcessKill.toKill && ProcessKill.processesCount < 1) {
      ProcessKill.blockIncoming = true;
      new Log({route: 'processKill middleware - processRemove'}).save();
      setTimeout(() => process.exit(0), 200);
    }
  }

  public async handle({}: HttpContextContract, next: () => Promise<void>) {
    this.processesAdd();
    try {
      await next();
      ProcessKill.processesRemove();
    } catch (error) {
      ProcessKill.processesRemove();
      throw error;
    }
  }
}

process.on('SIGINT', ProcessKill.startKill)
