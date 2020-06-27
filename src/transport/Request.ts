import { Packet } from "./protocol/Packet"
import { Word } from "./protocol/Word"

export class Request<T = string[]> {

  static RESPONSE_OK = "OK"

  readonly packet: Packet
  private sendable: Request.Send
  private response?: Packet
  priorized: boolean = false
  private fulfill: any
  private reject: any
  private responseParams: Request.ResponseParameter[] = []
  private formater: Request.ResponseFormater<T> = words => <any>words.map(w => w.toString())
  private stack = (new Error()).stack
  private callbacks: ((data: T) => void)[] = []

  constructor(options: Request.Options) {
    this.packet = options.packet
    this.sendable = options.send
  }

  get sequenceNumber() {
    return this.packet.sequence.sequence
  }

  /**
   * marks the request as a priority request
   * this will make the query send this packet first
   * and withhold all other queued packets till this has finnished
   */
  priorize() {
    this.priorized = true
    return this
  }

  format(cb: Request.ResponseFormater<T>) {
    this.formater = cb
    return this
  }

  getResponse() {
    if (!this.response) throw new Error("no response has been received yet")
    return this.response.words[0].toString()
  }

  onResolved(cb: (data: T) => void) {
    if (this.response) return cb(this.getResponseContent())
    this.callbacks.push(cb)
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
    if (this.isOk()) {
      const res = this.getResponseContent()
      this.fulfill(res)
      this.callbacks.forEach(cb => cb(res))
      return 
    }
    const error = new Error(`${this.getResponse()}: ${this.packet.words.join(" ")}`)
    if (this.stack && error.stack) {
      const [_, ...stack] = this.stack.split("\n")
      error.stack = `${error.stack.split("\n")[0]}\n${stack.join("\n")}`
    }
    return this.reject(error)
  }

  expect(parameter: Request.ResponseParameter) {
    this.responseParams.push(parameter)
    return this
  }

  send() {
    return new Promise<T>((fulfill, reject) => {
      this.stack = (new Error()).stack
      this.fulfill = fulfill
      this.reject = reject
      this.sendable(this)
    })
  }
}

export namespace Request {
  export interface Options {
    packet: Packet
    send: Send
  }

  export type Send = (req: Request<any>) => void

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