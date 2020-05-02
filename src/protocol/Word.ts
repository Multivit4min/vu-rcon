export class Word {
  
  static SIZE_OFFSET = 0
  static SIZE_LEN = 4
  static CONTENT_OFFSET = 4
  static TERMINATOR_LEN = 1

  private buffer: Buffer
  readonly size: number
  readonly content: Buffer
  readonly totalSize: number
  
  constructor(word: Buffer) {
    this.buffer = word
    this.size = word.readUInt32LE(Word.SIZE_OFFSET)
    this.totalSize = this.size + Word.SIZE_LEN + Word.TERMINATOR_LEN
    if (this.totalSize > word.byteLength)
      throw new Error(`expected word to be atleast ${this.totalSize} bytes but got ${word.byteLength}`)
    this.content = word.slice(Word.CONTENT_OFFSET, Word.CONTENT_OFFSET + this.size)
    this.buffer = word.slice(0, this.totalSize)
  }

  /** retrieves the response as string */
  toString() {
    return this.content.toString("utf8")
  }

  /** retrieves the response as number */
  toNumber() {
    return parseFloat(this.toString())
  }

  toBoolean() {
    return this.toString() === "true"
  }

  /** returns a copy of the word as buffer */
  getBuffer() {
    const buffer = Buffer.alloc(this.buffer.byteLength)
    this.buffer.copy(buffer)
    return buffer
  }

  /** creates a new word based on the command */
  static from(command: string) {
    const buffer = Buffer.alloc(command.length + Word.SIZE_LEN + Word.TERMINATOR_LEN)
    buffer.writeUInt32LE(command.length, Word.SIZE_OFFSET)
    buffer.write(command, Word.CONTENT_OFFSET, "utf8")
    return new Word(buffer)
  }


}