import { Subset } from "./Subset"

export class SquadSubset extends Subset {

  readonly subset = Subset.Type.TEAM
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