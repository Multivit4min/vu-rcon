import { Player } from "../nodes/Player"

export abstract class PlayerSubsetAbstract {
  /** gets sendable data for this subset */
  abstract serializeable(): (string|number)[]
  /** checks if a player is included in this subset */
  abstract includesPlayer(player: Player): boolean
}
export namespace PlayerSubsetAbstract {
  
  /**
   * all - sends to all players
   * team <teamid> - sends to a specific team
   * squad <teamid> <squadnumber> - sends to a specific squad
   * player <name> - sends to a specific player
   */
  export enum Type {
    ALL = "all",
    TEAM = "team",
    SQUAD = "squad",
    PLAYER = "player"
  }
}