import { EventEmitter } from "events";

export interface RunEventPayload {
  runId: string;
  step: string; // analyzing | investigating | planning | testing | awaiting_approval | pr_created | failed
  message: string;
  progress?: number;
  data?: any;
}

class RunEventEmitter extends EventEmitter {
  public emitRunEvent(payload: RunEventPayload): void {
    this.emit(`run:${payload.runId}`, payload);
  }
}

export const runEvents = new RunEventEmitter();
