import { Abstract } from "./Abstract"
import { PlayerSubset } from "../subsets/PlayerSubset"

export class Player extends Abstract<Player.Info> {

  get name() {
    return this.props.name
  }

  get guid() {
    return this.props.guid
  }

  get team() {
    return this.props.teamId
  }

  get squad() {
    return this.props.squadId
  }

  get kills() {
    return this.props.kills
  }

  get deaths() {
    return this.props.deaths
  }

  get ping() {
    return this.props.ping
  }

  get score() {
    return this.props.score
  }

  get rank() {
    return this.props.rank
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
   * adds the player guid to the vip list
   * @param save save the list after
   */
  addReservedSlot(save?: boolean) {
    return this.parent.addReserverSlotList(this.name, save)
  }

  /**
   * remove the players name from the VIP list
   * @param save save the list after
   */
  removeReservedSlot(save?: boolean) {
    this.parent.removeReservedSlotsList(this.name, save)
  }

  banGuid() {
    return this.parent.createBan().guid(this.guid)
  }

  banName() {
    return this.parent.createBan().name(this.name)
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