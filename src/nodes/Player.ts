import { Abstract } from "./Abstract"
import { PlayerSubset } from "../subsets/PlayerSubset"

export class Player extends Abstract<Player.Info> {

  get name() {
    return this.props.name
  }

  reload() {
    throw new Error("not implemented")
  }

  /**
   * sends a message to this player
   * @param msg message to send
   */
  say(msg: string) {
    return this.parent.say(msg, this.getSubset())
  }

  /**
   * yells a message
   * @param msg message to send
   * @param duration time in seconds to display the message
   */
  yell(msg: string, duration?: number) {
    return this.parent.yell(msg, duration, this.getSubset())
  }

  /**
   * kicks the player from the server
   * @param reason reason to display
   */
  kick(reason?: string) {
    return this.parent.kickPlayer(this.name, reason)
  }

  /**
   * moves a player to another team and squad
   * @param teamId the team to move the client to
   * @param squadId the squad to move the client
   * @param forceKill kills the player to move the client to the other team
   */
  move(teamId: number, squadId: number, forceKill: boolean) {
    return this.parent.movePlayer(this.name, teamId, squadId, forceKill)
  }

  /**
   * kills the player
   */
  kill() {
    return this.parent.killPlayer(this.name)
  }

  /**
   * gets the player subset
   */
  getSubset() {
    return new PlayerSubset(this)
  }
}

export namespace Player {
  export interface Info {
    name: string
    guid: string
    teamId: number
    squadId: number
    kills: number
    deaths: number
    score: number
    rank: number
    ping: number
  }
}