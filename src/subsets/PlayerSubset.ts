import { Subset } from "./Subset"
import { Player } from "../nodes/Player"

export class PlayerSubset extends Subset {

  readonly subset = Subset.Type.PLAYER
  readonly player: Player

  constructor(player: Player) {
    super()
    this.player = player
  }

  serializeable() {
    return [this.subset, this.player.name]
  }
}