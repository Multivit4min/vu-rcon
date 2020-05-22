import { Rcon } from "./transport/Rcon"

export class Variable<T extends Variable.List> {

  private rcon: Rcon
  private prefix: string

  constructor(parent: Rcon, prefix: string) {
    this.rcon = parent
    this.prefix = prefix
  }

  set<Y extends keyof T>(key: Y, value: T[Y]) {
    let arr = Array.isArray(value) ? value : [value]
    return this.rcon.createCommand(`${this.prefix}.${key}`, ...arr).send()
  }

  get<Y extends keyof T>(key: Y)  {
    return this.rcon.createCommand<string>(`${this.prefix}.${key}`)
      .format(w => w[0].toString())
      .send()
  }
}

export namespace Variable {
  export type List = Record<string, Variable.ArrayList|Variable.Simple>
  export type ArrayList = (Variable.Simple)[]
  export type Simple = boolean|number|string|void
}