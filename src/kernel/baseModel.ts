import { modelContract } from "../contracts/modelContracts";

export default class BaseModel implements modelContract {
  async save() {
    return this;
  }
}
