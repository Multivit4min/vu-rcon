export class IdType {

  readonly type: IdType.Type
  id: string = ""

  constructor(type: IdType.Type, id: string) {
    this.type = type
    this.id = id
  }

  serializeable() {
    return [this.type, this.id]
  }
}

export namespace IdType {
  export enum Type {
    NAME = "name",
    IP = "ip",
    GUID = "guid"
  }
}