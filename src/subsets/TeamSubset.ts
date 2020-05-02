import { PlayerSubsetAbstract } from "./PlayerSubsetAbstract"

export class TeamSubset extends PlayerSubsetAbstract {

  readonly subset = PlayerSubsetAbstract.Type.TEAM
  readonly team: any

  constructor(team: any) {
    super()
    this.team = team
  }

  serializeable() {
    return [this.subset, this.team.id]
  }
}