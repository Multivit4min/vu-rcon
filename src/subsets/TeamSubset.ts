import { Subset } from "./Subset"

export class TeamSubset extends Subset {

  readonly subset = Subset.Type.TEAM
  readonly team: any

  constructor(team: any) {
    super()
    this.team = team
  }

  serializeable() {
    return [this.subset, this.team.id]
  }
}