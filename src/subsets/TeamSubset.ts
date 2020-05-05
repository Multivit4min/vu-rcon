import { PlayerSubsetAbstract } from "./PlayerSubsetAbstract"
import { Player } from "../nodes/Player"

export class TeamSubset extends PlayerSubsetAbstract {

  readonly subset = PlayerSubsetAbstract.Type.TEAM
  readonly team: any

  constructor(team: any) {
    super()
    this.team = team
  }

  includesPlayer(player: Player) {
    return player.team === this.team
  }

  serializeable() {
    return [this.subset, this.team.id]
  }
}