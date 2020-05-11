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

  private buffer: Buffer
  readonly sequence: Buffer
  private seq?: Sequence
  readonly size: number
  readonly numWords: number
  readonly words: Word[] = []

  constructor(buffer: Buffer) {
    this.buffer = buffer
    this.sequence = this.buffer.slice(Packet.SEQUENCE_OFFSET, Packet.SEQUENCE_LEN)
    this.size = this.buffer.readUInt32LE(Packet.SIZE_OFFSET)
    if (this.size > this.buffer.byteLength)
      throw new Error(`expected packet of ${this.size} bytes but got ${this.buffer.byteLength} bytes`)
    this.numWords = this.buffer.readUInt32LE(Packet.WORDCOUNT_OFFSET)
    let i = 0
    let wordBuffer = this.buffer.slice(Packet.WORDS_OFFSET)
    while (i++ < this.numWords) {
      const word = new Word(wordBuffer)
      this.words.push(word)
      wordBuffer = wordBuffer.slice(word.totalSize)
    }
  }

  getSequence() {
    if (!this.seq) this.seq = new Sequence(this.sequence)
    return this.seq    
  }

  /** returns a copy of the word as buffer */
  getBuffer() {
    const buffer = Buffer.alloc(this.buffer.byteLength)
    this.buffer.copy(buffer)
    return buffer
  }

  static from(opts: Packet.CreateOptions) {
    const words = Buffer.concat(opts.words.map(word => Word.from(word).getBuffer()))
    const size = Buffer.alloc(Packet.SIZE_LEN)
    size.writeUInt32LE(Packet.SEQUENCE_LEN + Packet.SIZE_LEN + Packet.WORDCOUNT_LEN + words.byteLength, 0)
    const wordCount = Buffer.alloc(4)
    wordCount.writeUInt32LE(opts.words.length, 0)
    return new Packet(Buffer.concat([
      opts.sequence.getBuffer(), size, wordCount, words
    ]))
  }
}

export namespace Packet {
  export interface CreateOptions {
    words: string[]
    sequence: Sequence
  }
}