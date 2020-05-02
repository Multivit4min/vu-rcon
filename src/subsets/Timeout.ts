export class Timeout {

  readonly type: Timeout.Type
  time: number = 0

  constructor(type: Timeout.Type) {
    this.type = type
  }

  duration(duration: number) {
    this.time = duration
    return this
  }

  serializeable() {
    if (this.type === Timeout.Type.PERM) return [this.type]
    return [this.type, this.time]
  }
}

export namespace Timeout {
  export enum Type {
    PERM = "perm",
    ROUNDS = "rounds",
    SECONDS = "seconds"
  }
}