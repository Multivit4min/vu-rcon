import { PlayerSubsetAbstract } from "./PlayerSubsetAbstract"
import { Player } from "../nodes/Player"
import { Battlefield3 } from "Battlefield3"

export class SquadSubset extends PlayerSubsetAbstract {

  readonly subset = PlayerSubsetAbstract.Type.TEAM
  readonly team: number
  readonly squad: Battlefield3.Squad

  constructor(team: any, squad: any) {
    super()
    this.team = team
    this.squad = squad
  }

  includesPlayer(player: Player) {
    return player.team === this.team && player.squad === this.squad
  }

  serializeable() {
    return [this.subset, this.team, this.squad]
  }
}