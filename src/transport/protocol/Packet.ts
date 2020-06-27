import { Word } from "./Word"
import { Sequence } from "./Sequence"

export class Packet {

  static MAX_SIZE = 16384
  static SEQUENCE_OFFSET = 0
  static SEQUENCE_LEN = 4
  static SIZE_OFFSET = 4
  static SIZE_LEN = 4
  static WORDCOUNT_OFFSET = 8
  static WORDCOUNT_LEN = 4
  static WORDS_OFFSET = 12

  readonly sequence: Sequence
  readonly words: Word[] = []

  constructor(props: Packet.CreateOptions) {
    this.words = props.words.map(word => {
      if (word instanceof Word) return word
      return new Word(word)
    })
    this.sequence = props.sequence
  }

  /** creates a buffer from the packet */
  toBuffer() {
    const words = Buffer.concat(this.words.map(w => w.toBuffer()))
    const size = Buffer.alloc(Packet.SIZE_LEN)
    size.writeUInt32LE(Packet.SEQUENCE_LEN + Packet.SIZE_LEN + Packet.WORDCOUNT_LEN + words.byteLength, 0)
    const wordCount = Buffer.alloc(4)
    wordCount.writeUInt32LE(this.words.length, 0)
    return Buffer.concat([ this.sequence.toBuffer(), size, wordCount, words ])
  }

  /** parses a packet from buffer */
  static from(buffer: Buffer) {
    const sequence = buffer.slice(Packet.SEQUENCE_OFFSET, Packet.SEQUENCE_LEN)
    const size = buffer.readUInt32LE(Packet.SIZE_OFFSET)
    if (size !== buffer.byteLength)
      throw new Error(`expected packet of ${size} bytes but got ${buffer.byteLength} bytes`)
    const wordCount = buffer.readUInt32LE(Packet.WORDCOUNT_OFFSET)
    const words: Word[] = []
    let i = 0
    let wordBuffer = buffer.slice(Packet.WORDS_OFFSET)
    while (i++ < wordCount) {
      const word = Word.from(wordBuffer)
      words.push(word)
      wordBuffer = wordBuffer.slice(word.size)
    }
    return new Packet({ words, sequence: Sequence.from(sequence) })
  }

  /** retrieves an array of buffers */
  static getPacketBuffers(buffer: Buffer) {
    let remainder: Buffer = Buffer.alloc(0)
    const buffers: Buffer[] = []
    while (buffer.byteLength > 0) {        
      if (
        buffer.byteLength >= (Packet.SIZE_OFFSET + Packet.SIZE_LEN) &&
        buffer.byteLength >= Packet.getSizeDirty(buffer)
      ) {
        const size = Packet.getSizeDirty(buffer)
        buffers.push(buffer.slice(0, size))
        buffer = buffer.slice(size)
      } else {
        remainder = buffer.slice(0)
        buffer = Buffer.alloc(0)
      }
    }
    return { buffers, remainder }
  }

  /** returns an estimated byte size for the packet */
  static getSizeDirty(buffer: Buffer) {
    return buffer.readUInt32LE(4)
  }
}

export namespace Packet {
  export interface CreateOptions {
    words: (Word|string)[]
    sequence: Sequence
  }
}