import { PlayerSubsetAbstract } from "./PlayerSubsetAbstract"

export class SquadSubset extends PlayerSubsetAbstract {

  readonly subset = PlayerSubsetAbstract.Type.TEAM
  readonly team: any
  readonly squad: any

  constructor(team: any, squad: any) {
    super()
    this.team = team
    this.squad = squad
  }

  serializeable() {
    return [this.subset, this.team.id, this.squad.id]
  }
}