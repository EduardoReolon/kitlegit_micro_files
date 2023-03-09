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
  }

  processesAdd() {
    if (ProcessKill.toKill) {
      throw new Error('Server is about to close');
    }

    ProcessKill.processesCount += 1;
  }

  processesRemove() {
    ProcessKill.processesCount -= 1;
    if (ProcessKill.toKill && ProcessKill.processesCount < 1) {
      new Log({route: 'processKill middleware - processRemove'}).save();
      process.exit(0);
    }
  }

  public async handle({}: HttpContextContract, next: () => Promise<void>) {
    this.processesAdd();
    try {
      await next();
      this.processesRemove();
    } catch (error) {
      this.processesRemove();
      throw error;
    }
  }
}

process.on('SIGINT', ProcessKill.startKill)
