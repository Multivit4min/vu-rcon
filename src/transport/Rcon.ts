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
  private waitForPriorized: boolean = true
  private buffer = Buffer.alloc(0)

  constructor(options: Rcon.ConnectionOptions) {
    super()
    this.options = options
  }

  setWaitForPriorized(to: boolean) {
    this.waitForPriorized = to
    if (!to) this.continueWithQueue()
    return this
  }

  /**
   * connects to the socket
   * @param forceReconnect if its connected the current connection will be destroyed
   */
  connect(forceReconnect: boolean = true) {
    return new Promise<void>((fulfill, reject) => {
      if (this.socket && !this.socket.destroyed) {
        if (!forceReconnect) return reject(new Error("already connected to rcon"))
        this.socket.destroy()
      }
      if (this.socket) this.socket.removeAllListeners()
      this.socket = net.connect({
        host: this.options.host,
        port: this.options.port,
        timeout: this.options.timeout
      })
      const timeout = setTimeout(
        () => handler(new Error("received timeout while connecting")),
        this.options.timeout
      )
      const handler = async (err?: Error) => {
        clearTimeout(timeout)
        this.socket.removeListener("error", handler)
        this.socket.removeListener("connect", handler)
        if (err instanceof Error) {
          this.socket.destroy()
          return reject(err)
        }
        this.socket.on("error", this.onError.bind(this))
        this.socket.on("close", this.onClose.bind(this))
        this.socket.on("data", this.onData.bind(this))
        fulfill()
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
    this.setWaitForPriorized(true)
    //destroy it just to be save
    this.socket.destroy()
    this.emit("close")
  }

  private onData(buffer: Buffer) {
    const { buffers, remainder } = Packet.getPacketBuffers(Buffer.concat([this.buffer, buffer]))
    this.buffer = remainder
    buffers.forEach(buffer => this.handlePacket(buffer))
  }

  private onError(err: Error) {
    this.emit("error", err)
  }

  private handlePacket(buffer: Buffer) {
    const packet = Packet.from(buffer)
    const request = this.pending.find(p => p.sequenceNumber === packet.sequence.sequence)
    if (!request) return this.handleEvent(packet)
    this.pending.splice(this.pending.indexOf(request), 1)
    if (this.pending.length === 0 && this.waitForPriorized) this.continueWithQueue()
    request.setResponse(packet)
    this.emit("requestReceive", { request })
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
  private async sendRequest(request: Request) {
    if (
        !this.socket ||
        !this.socket.writable ||
        (this.waitForPriorized && !request.priorized)
      ) {
      this.queued.push(request)
    } else {
      this.pending.push(request)
      await this.write(request.packet.toBuffer())
      this.emit("requestSend", { request })
    }
  }

  /**
   * continues with queued items
   * handles priorized items one after one
   */
  continueWithQueue() {
    const queued = [...this.queued]
    this.queued = []
    //try to send the request
    queued.forEach(request => this.sendRequest(request))
  }

  write(buffer: Buffer) {
    return new Promise<void>((fulfill, reject) => {
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
    timeout: number
    eventHandler: eventHandler
  }

  export type eventHandler = (event: string, words: Word[]) => void
  export type Argument = boolean|string|number|undefined
  export type Pending = Request<any>[]
  export type Queued = Request<any>[]
}