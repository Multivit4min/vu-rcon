import { PlayerSubsetAbstract } from "./PlayerSubsetAbstract"
import { Player } from "../nodes/Player"

export class PlayerSubset extends PlayerSubsetAbstract {

  readonly subset = PlayerSubsetAbstract.Type.PLAYER
  readonly player: Player

  constructor(player: Player) {
    super()
    this.player = player
  }

  serializeable() {
    return [this.subset, this.player.name]
  }
}