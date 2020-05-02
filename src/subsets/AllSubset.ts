import { Subset } from "./Subset"

export class AllSubset extends Subset {

  readonly subset = Subset.Type.ALL

  serializeable() {
    return [this.subset]
  }
}