import { PlayerSubsetAbstract } from "./PlayerSubsetAbstract"

export class AllSubset extends PlayerSubsetAbstract {

  readonly subset = PlayerSubsetAbstract.Type.ALL

  serializeable() {
    return [this.subset]
  }

  includesPlayer() {
    return true
  }
}