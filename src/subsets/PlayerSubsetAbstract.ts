export abstract class PlayerSubsetAbstract {
  abstract serializeable(): string[]
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