import { Packet } from "./protocol/Packet"
import { Rcon } from "./Rcon"
import { Word } from "./protocol/Word"

export class Request<T = string[]> {

  static RESPONSE_OK = "OK"

  private request: Packet
  private rcon: Rcon
  private response?: Packet
  private fulfill: any
  private reject: any
  private responseParams: Request.ResponseParameter[] = []
  private formater: Request.ResponseFormater<T> = words => <any>words.map(w => w.toString())

  constructor(options: Request.Options) {
    this.request = options.packet
    this.rcon = options.rcon
  }

  get sequenceNumber() {
    return this.request.getSequence().sequence
  }

  format(cb: Request.ResponseFormater<T>) {
    this.formater = cb
    return this
  }

  getResponse() {
    if (!this.response) throw new Error("no response has been received yet")
    return this.response.words[0].toString()
  }

  getContentWords() {
    if (!this.response) throw new Error("no response has been received yet")
    return this.response.words.slice(1, this.response.words.length)
  }

  isOk() {
    return this.getResponse() === Request.RESPONSE_OK
  }

  getResponseContent() {
    return this.formater(this.getContentWords())
  }

  setResponse(packet: Packet) {
    this.response = packet
    if (this.isOk()) return this.fulfill(this.getResponseContent())
    return this.reject(new Error(this.getResponse()))
  }

  expect(parameter: Request.ResponseParameter) {
    this.responseParams.push(parameter)
    return this
  }

  send() {
    return new Promise<T>((fulfill, reject) => {
      this.fulfill = fulfill
      this.reject = reject
      this.rcon.write(this.request.getBuffer())
    })
  }
}

export namespace Request {
  export interface Options {
    packet: Packet
    rcon: Rcon
  }

  export type ResponseFormater<T> = (words: Word[]) => T
  export type ResponseParameter = Parameter | Subset

  export enum Parameter {
    STRING,
    BOOLEAN,
    HEXSTRING,
    PASSWORD,
    FILENAME,
    CLANTAG,
    PLAYER_NAME,
    GUID,
    TEAM_ID,
    SQUAD_ID
  }

  export enum Subset {
    TIMEOUT,
    ID_TYPE,
    PLAYER_INFO_BLOCK,
    TEAM_SCORES,
    IP_PORT_PAIR,
    MAP_LIST,
    UNLOCK_MODE
  }
}