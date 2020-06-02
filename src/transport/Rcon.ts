import net from "net"
import { Sequence } from "./protocol/Sequence"
import { Packet } from "./protocol/Packet"
import { Request } from "./Request"
import { Word } from "./protocol/Word"
import { EventEmitter } from "events"

export class Rcon extends EventEmitter {

  private socket!: net.Socket
  private options: Rcon.ConnectionOptions
  private sequence?: Sequence
  private pending: Rcon.Pending = []
  private queued: Rcon.Queued = []
  private waitForPriorized: boolean = false
  private buffer = Buffer.alloc(0)

  constructor(options: Rcon.ConnectionOptions) {
    super()
    this.options = options
  }

  /**
   * connects to the socket
   * @param host hostname to connect to
   * @param port port to connect to
   */
  connect() {
    return new Promise((fulfill, reject) => {
      if (this.socket && !this.socket.destroyed)
        return reject(new Error("already connected to rcon"))
      if (this.socket) this.socket.removeAllListeners()
      this.socket = net.connect({
        host: this.options.host,
        port: this.options.port,
      })
      const handler = async (err?: Error) => {
        this.socket.removeListener("error", handler)
        this.socket.removeListener("connect", handler)
        if (err instanceof Error) return reject(err)
        await fulfill()
        this.continueWithQueue()
        this.socket.on("close", this.onClose.bind(this))
        this.socket.on("data", this.onData.bind(this))
      }
      this.socket.on("error", handler)
      this.socket.on("connect", handler)
    })
  }

  /**
   * push all pending sequences back to queued
   * after a successfull reconnect all queued packets get resent
   */
  private onClose() {
    this.pending.forEach(req => this.queued.unshift(req))
    this.pending = []
    this.emit("close")
  }

  private onData(buffer: Buffer) {
    const { buffers, remainder } = Packet.getPacketBuffers(Buffer.concat([this.buffer, buffer]))
    this.buffer = remainder
    buffers.forEach(buffer => this.handlePacket(buffer))
  }

  private handlePacket(buffer: Buffer) {
    const packet = Packet.from(buffer)
    const request = this.pending.find(p => p.sequenceNumber === packet.sequence.sequence)
    if (!request) return this.handleEvent(packet)
    this.pending.splice(this.pending.indexOf(request), 1)
    if (this.pending.length === 0 && this.waitForPriorized) {
      this.waitForPriorized = false
      this.continueWithQueue()
    }
    request.setResponse(packet)
  }

  private handleEvent(packet: Packet) {
    this.options.eventHandler(packet.words[0].toString(), packet.words.slice(1))
  }

  createCommand<T = string[]>(cmd: string, ...args: Rcon.Argument[]) {
    let request: Request<T>
    const packet = this.wrapInPacket([cmd, ...Rcon.toStrings(args)])
    request = new Request<T>({ packet, send: this.sendRequest.bind(this) })
    return request
  }

  /**
   * sends a request, either writes it to the socket
   * or pushes it to queue if its currently not writeable
   * @param req
   */
  private sendRequest(req: Request, force: boolean = false) {
    if (!this.socket || !this.socket.writable || (this.waitForPriorized && !force)) {
      this.queued.push(req)
    } else {
      if (req.priorized) this.waitForPriorized = true
      this.pending.push(req)
      this.write(req.packet.toBuffer())
    }
  }

  /**
   * continues with queued items
   * handles priorized items one after one
   */
  private continueWithQueue() {
    const queued = [...this.queued]
    this.queued = []
    const prio = queued.filter(r => r.priorized)
    if (prio.length > 0) {
      const request = prio.shift()!
      this.queued = [...prio, ...queued.filter(r => !r.priorized)]
      this.sendRequest(request, true)
    } else {
      queued.forEach(r => this.sendRequest(r))
    }
  }

  write(buffer: Buffer) {
    return new Promise((fulfill, reject) => {
      this.socket.write(buffer, err => {
        if (err) return reject(err)
        fulfill()
      })
    })
  }

  stop() {
    return this.socket.destroy()
  }

  private getNextSequence(opts: Sequence.NextSequenceOptions) {
    if (this.sequence) {
      this.sequence = this.sequence.nextSequence(opts)
    } else {
      this.sequence = new Sequence({ sequence: 0, ...opts })
    }
    return this.sequence
  }

  private wrapInPacket(words: string[]) {
    return new Packet({
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
    host: string
    port: number
    eventHandler: eventHandler
  }

  export type eventHandler = (event: string, words: Word[]) => void
  export type Argument = boolean|string|number|undefined
  export type Pending = Request<any>[]
  export type Queued = Request<any>[]
}