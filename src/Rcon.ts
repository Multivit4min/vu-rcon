import net from "net"
import { Sequence } from "./protocol/Sequence"
import { Packet } from "./protocol/Packet"
import { Request } from "./Request"
import { Word } from "./protocol/Word"

export class Rcon {

  private socket: net.Socket
  private sequence?: Sequence
  private pending: Rcon.Pending = []
  private eventHandler: Rcon.eventHandler

  constructor(options: Rcon.ConnectionOptions) {
    this.socket = net.connect({
      host: options.host,
      port: options.port
    })
    this.eventHandler = options.eventHandler
    this.socket.on("data", this.onData.bind(this))
  }

  private onData(buffer: Buffer) {
    const packet = new Packet(buffer)
    const request = this.pending.find(p => p.sequenceNumber === packet.getSequence().sequence)
    if (!request) return this.handleEvent(packet)
    this.pending.splice(this.pending.indexOf(request), 1)
    request.setResponse(packet)
  }

  private handleEvent(packet: Packet) {
    this.eventHandler(packet.words[0].toString(), packet.words.slice(1))
  }

  createCommand<T = string[]>(cmd: string, ...args: Rcon.Argument[]) {
    let request: Request<T>
    const packet = this.wrapInPacket([cmd, ...Rcon.toStrings(args)])
    request = new Request<T>({ packet, rcon: this })
    this.pending.push(request)
    return request
  }

  write(buffer: Buffer) {
    this.socket.write(buffer, err => {
      if (err) throw err
    })
  }

  private getNextSequence(opts: Sequence.NextSequenceOptions) {
    if (this.sequence) {
      this.sequence = Sequence.from({ sequence: this.sequence.sequence + 1, ...opts })
    } else {
      this.sequence = Sequence.from({ sequence: 0, ...opts })
    }
    return this.sequence
  }

  private wrapInPacket(words: string[]) {
    return Packet.from({
      words,
      sequence: this.getNextSequence({
        origin: Sequence.Origin.CLIENT,
        type: Sequence.Type.REQUEST
      })
    })
  }

  static toStrings(args: Rcon.Argument[]): string[] {
    return args
      .filter(arg => arg !== undefined)
      .map((arg: any) => {
        switch (typeof arg) {
          case "number":
            return arg.toString()
          case "boolean":
            return arg === true ? "true" : "false"
          case "string":
          default:
            return arg
        }
      })
  }
}

export namespace Rcon {
  export interface ConnectionOptions {
    type?: "udp4"|"udp6"
    host: string
    port: number
    eventHandler: eventHandler
  }

  export type eventHandler = (event: string, words: Word[]) => void
  export type Argument = boolean|string|number|undefined
  export type Pending = Request<any>[]
}