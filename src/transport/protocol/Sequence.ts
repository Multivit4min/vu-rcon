export class Sequence {

  static MAX_SEQUENCE_NUMBER = 0x3FFFFFFF
  readonly sequence: number
  readonly origin: Sequence.Origin
  readonly type: Sequence.Type

  constructor(props: Sequence.SequenceOptions) {
    this.origin = props.origin
    this.type = props.type
    this.sequence = props.sequence
  }

  /** retrieves the next sequence number */
  nextSequence(opts: Sequence.NextSequenceOptions) {
    let seq = this.sequence + 1
    return new Sequence({
      sequence: seq > Sequence.MAX_SEQUENCE_NUMBER ? 0 : seq,
      ...opts
    })
  }

  /** returns a copy of the word as buffer */
  toBuffer() {
    let sequence = this.sequence
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(sequence, 0)
    Sequence.setOrigin(buffer, this.origin)
    Sequence.setType(buffer, this.type)
    return buffer
  }

  /** parses a sequence from a buffer */
  static from(buffer: Buffer) {
    const uint = buffer.readUInt32LE(0)
    return new Sequence({
      origin: Sequence.getOrigin(uint),
      type: Sequence.getType(uint),
      sequence: Sequence.getSequenceNumber(uint)
    })
  }

  static setOrigin(sequence: Buffer, origin: Sequence.Origin) {
    let seq = sequence.readInt32LE(0)
    if (origin) {
      seq |= Sequence.Mask.ORIGIN
    } else {
      seq &= ~Sequence.Mask.ORIGIN
    }
    sequence.writeInt32LE(seq, 0)
  }

  static setType(sequence: Buffer, type: Sequence.Type) {
    let seq = sequence.readInt32LE(0)
    if (type) {
      seq |= Sequence.Mask.TYPE
    } else {
      seq &= ~Sequence.Mask.TYPE
    }
    sequence.writeInt32LE(seq, 0)
  }

  static getOrigin(uint: number) {
    if ((uint & Sequence.Mask.ORIGIN) === Sequence.Mask.ORIGIN) {
      return Sequence.Origin.CLIENT
    } else {
      return Sequence.Origin.SERVER
    }
  }

  static getType(uint: number) {
    if ((uint & Sequence.Mask.TYPE) === Sequence.Mask.TYPE) {
      return Sequence.Type.RESPONSE
    } else {
      return Sequence.Type.REQUEST
    }
  }

  static getSequenceNumber(uint: number) {
    return uint & ~(Sequence.Mask.ORIGIN | Sequence.Mask.TYPE)
  }
}

export namespace Sequence {

  export enum Mask {
    ORIGIN = 0x80000000,
    TYPE = 0x40000000
  }

  export enum Origin {
    SERVER = 1,
    CLIENT = 0
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