export abstract class Subset {
  abstract serializeable(): string[]
}
export namespace Subset {
  
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