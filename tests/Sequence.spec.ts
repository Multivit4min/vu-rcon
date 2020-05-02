import { Sequence } from "../src/protocol/Sequence"

describe("Sequence", () => {

  describe("checks a sequence with 0", () => {

    it("should validate a number", () => {
      const seq = new Sequence(0)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(0)
    })

    it("should validate a buffer", () => {
      const seq = new Sequence(Buffer.alloc(4))
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(0)
    })

  })


  describe("checks a sequence with origin set to Client", () => {

    it("should validate a number", () => {
      const seq = new Sequence(0x80000000)
      expect(seq.origin).toBe(Sequence.Origin.CLIENT)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(0)
    })

    it("should validate a buffer", () => {
      const buffer = Buffer.alloc(4)
      buffer.writeUInt32LE(0x80000000, 0)
      const seq = new Sequence(buffer)
      expect(seq.origin).toBe(Sequence.Origin.CLIENT)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(0)
    })

  })


  describe("checks a sequence with type set to Response", () => {

    it("should validate a number", () => {
      const seq = new Sequence(0x40000000)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.RESPONSE)
      expect(seq.sequence).toBe(0)
    })

    it("should validate a buffer", () => {
      const buffer = Buffer.alloc(4)
      buffer.writeUInt32LE(0x40000000, 0)
      const seq = new Sequence(buffer)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.RESPONSE)
      expect(seq.sequence).toBe(0)
    })

  })


  describe("should get the correct sequence number", () => {

    it("should validate a number", () => {
      const seq = new Sequence(0x20538003)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(542343171)
    })

    it("should validate a buffer", () => {
      const buffer = Buffer.alloc(4)
      buffer.writeUInt32LE(0x20538003, 0)
      const seq = new Sequence(buffer)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(542343171)
    })

  })


  describe("should get the correct consecutive sequence number", () => {

    it("should get the correct sequence", () => {
      let seq = new Sequence(0xC0000000)
      expect(seq.origin).toBe(Sequence.Origin.CLIENT)
      expect(seq.type).toBe(Sequence.Type.RESPONSE)
      expect(seq.sequence).toBe(0)
      seq = seq.nextSequence({ origin: Sequence.Origin.SERVER, type: Sequence.Type.REQUEST })
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(1)
    })

  })

})