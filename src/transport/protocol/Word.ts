export class Word {
  
  static SIZE_OFFSET = 0
  static SIZE_LEN = 4
  static CONTENT_OFFSET = 4
  static TERMINATOR_LEN = 1

  readonly word: string
  readonly size: number
  
  constructor(word: string, size?: number) {
    this.word = word
    this.size = typeof size === "number" ? size : Word.getSize(word)
  }

  /** retrieves the response as string */
  toString() {
    return this.word
  }

  /** retrieves the response as number */
  toNumber() {
    return parseFloat(this.toString())
  }

  /** retrieves the response as boolean */
  toBoolean() {
    return this.toString() === "true"
  }

  /** returns a copy of the word as buffer */
  toBuffer() {
    const content = Buffer.from(this.word, "utf8")
    const size = Buffer.alloc(4)
    size.writeUInt32LE(content.byteLength)
    return Buffer.concat([size, content, Buffer.alloc(1)])
  }

  /** gets the total size of the for this word */
  static getSize(word: string) {
    return Word.SIZE_LEN + Buffer.from(word).byteLength + Word.TERMINATOR_LEN
  }

  /** creates a new word based on the command */
  static from(buffer: Buffer) {
    const size = buffer.readUInt32LE(Word.SIZE_OFFSET)
    const totalSize = size + Word.SIZE_LEN + Word.TERMINATOR_LEN
    if (totalSize > buffer.byteLength)
      throw new Error(`expected word to be atleast ${totalSize} bytes but got ${buffer.byteLength}`)
    return new Word(buffer.slice(
      Word.CONTENT_OFFSET,
      totalSize - Word.TERMINATOR_LEN
    ).toString("utf8"), totalSize)
  }


}