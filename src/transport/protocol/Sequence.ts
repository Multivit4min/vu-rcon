export class Sequence {

  static MAX_SEQUENCE_NUMBER = 0x3FFFFFFF
  private buffer: Buffer
  readonly sequence: number
  readonly origin: Sequence.Origin
  readonly type: Sequence.Type

  constructor(buffer: Buffer|number) {
    if (typeof buffer === "number") {
      this.buffer = Buffer.alloc(4)
      this.buffer.writeUInt32LE(buffer, 0)
    } else {
      this.buffer = buffer
    }
    this.origin = Sequence.getOrigin(this.buffer)
    this.type = Sequence.getType(this.buffer)
    this.sequence = Sequence.getSequenceNumber(this.buffer)
  }

  /** retrieves the next sequence number */
  nextSequence(opts: Sequence.NextSequenceOptions) {
    let seq = this.sequence + 1
    if (seq > Sequence.MAX_SEQUENCE_NUMBER) seq = 0
    return Sequence.from({
      sequence: (seq <= Sequence.MAX_SEQUENCE_NUMBER) ? seq : 0,
      ...opts
    })
  }

  /** returns a copy of the word as buffer */
  getBuffer() {
    const buffer = Buffer.alloc(this.buffer.byteLength)
    this.buffer.copy(buffer)
    return buffer
  }

  /** builds a new sequence buffer */
  static from(opts: Sequence.SequenceOptions) {
    let sequence = opts.sequence
    if (opts.origin === Sequence.Origin.CLIENT) {
      const s = sequence | 0x8000000
      sequence = s < 0 ? s * -1 : s
    }
    if (opts.type === Sequence.Type.RESPONSE) sequence = sequence | 0x40000000
    return new Sequence(sequence)
  }

  static getOrigin(buf: Buffer) {
    return (!(buf.readUInt32LE(0) & 0x80000000)) ? Sequence.Origin.SERVER : Sequence.Origin.CLIENT
  }

  static getType(buf: Buffer) {
    return (!(buf.readUInt32LE(0) & 0x40000000)) ? Sequence.Type.REQUEST : Sequence.Type.RESPONSE
  }

  static getSequenceNumber(buf: Buffer) {
    return buf.readUInt32LE(0) & 0x3FFFFFFF
  }
}

export namespace Sequence {
  export enum Origin {
    SERVER = 0,
    CLIENT = 1
  }

  export enum Type {
    REQUEST = 0,
    RESPONSE = 1
  }

  export type NextSequenceOptions = Omit<SequenceOptions, "sequence">

  export interface SequenceOptions {
    sequence: number
    type: Type
    origin: Origin
  }
}