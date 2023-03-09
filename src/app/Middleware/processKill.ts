import { HttpContextContract, middlewareContract } from "../../contracts/requestsContracts";
import Log from "../services/log";

export default class ProcessKill implements middlewareContract {
  priority = 2;
  isGlobal: boolean = true;
  static toKill: boolean = false;
  static processesCount: number = 0;

  static startKill() {
    ProcessKill.toKill = true
    new Log({route: 'processKill middleware - processAdd'}).setSideData({processesCount: this.processesCount}).save();
    ProcessKill.processesRemove(0);
  }

  processesAdd() {
    if (ProcessKill.toKill) {
      throw new Error('Server is about to close');
    }

    ProcessKill.processesCount += 1;
  }

  static processesRemove(value: number = 1) {
    ProcessKill.processesCount -= value;
    if (ProcessKill.toKill && ProcessKill.processesCount < 1) {
      new Log({route: 'processKill middleware - processRemove'}).save();
      process.exit(0);
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
