import { Sequence } from "../src/transport/protocol/Sequence"

describe("Sequence", () => {

  describe("checks a sequence with 0", () => {

    it("should validate a buffer", () => {
      const seq = Sequence.from(Buffer.alloc(4))
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(0)
    })

  })


  describe("checks a sequence with origin set to Client", () => {

    it("should validate a buffer", () => {
      const buffer = Buffer.alloc(4)
      buffer.writeUInt32LE(0x80000000, 0)
      const seq = Sequence.from(buffer)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(0)
    })

  })


  describe("checks a sequence with type set to Response", () => {

    it("should validate a buffer", () => {
      const buffer = Buffer.alloc(4)
      buffer.writeUInt32LE(0x40000000, 0)
      const seq = Sequence.from(buffer)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.RESPONSE)
      expect(seq.sequence).toBe(0)
    })

  })


  describe("should get the correct sequence number", () => {

    it("should validate a buffer", () => {
      const buffer = Buffer.alloc(4)
      buffer.writeUInt32LE(0x20538003, 0)
      const seq = Sequence.from(buffer)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(542343171)
    })

  })


  describe("should get the correct consecutive sequence number", () => {

    it("should get the correct sequence", () => {
      const buffer = Buffer.alloc(4)
      buffer.writeUInt32LE(0xC0000000, 0)
      let seq = Sequence.from(buffer)
      expect(seq.origin).toBe(Sequence.Origin.SERVER)
      expect(seq.type).toBe(Sequence.Type.RESPONSE)
      expect(seq.sequence).toBe(0)
      seq = seq.nextSequence({ origin: Sequence.Origin.CLIENT, type: Sequence.Type.REQUEST })
      expect(seq.origin).toBe(Sequence.Origin.CLIENT)
      expect(seq.type).toBe(Sequence.Type.REQUEST)
      expect(seq.sequence).toBe(1)
    })

  })

})