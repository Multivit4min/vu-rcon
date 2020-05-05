import { Player } from "../nodes/Player"
import { PlayerSubsetAbstract } from "../subsets/PlayerSubsetAbstract"
import { Weapon } from "../weapons/Weapon"
import { Battlefield3 } from "Battlefield3"

export interface OnRoundOver {
  winner: number
}

export interface OnLevelLoaded {
  map: string
  mode: string
  roundsPlayed: number
  roundsTotal: number
}

export interface MaxPlayerCountChange {
  maxPlayerCount: number
}

export interface OnTeamChange {
  player: Player,
  team: number
  squad: Battlefield3.Squad
}

export interface OnSquadChange {
  player: Player,
  team: number
  squad: Battlefield3.Squad
}

export interface OnAuthenticated {
  name: string
}

export interface OnLeave extends Player.Info {
}

export interface OnJoining {
  name: string
  guid: string
}

export interface PunkBuster {
  event: string
  messages: string[]
}

export interface PlayerOnKill {
  killer?: Player
  killed: Player
  weapon: Weapon
  headshot: boolean
}

export interface PlayerOnSpawn {
  player: Player
  team: number
}

export type PlayerOnChat = PlayerOnChatTeam|PlayerOnChatSquad|PlayerOnChatPlayer|PlayerOnChatAll
export interface PlayerOnChatBase {
  player: Player|"Server"
  msg: string
  subset: PlayerSubsetAbstract.Type
}
export interface PlayerOnChatTeam extends PlayerOnChatBase {
  subset: PlayerSubsetAbstract.Type.TEAM
  team: number
}
export interface PlayerOnChatSquad extends PlayerOnChatBase {
  subset: PlayerSubsetAbstract.Type.SQUAD
  team: number
  squad: number
}
export interface PlayerOnChatPlayer extends PlayerOnChatBase {
  subset: PlayerSubsetAbstract.Type.PLAYER
}
export interface PlayerOnChatAll extends PlayerOnChatBase {
  subset: PlayerSubsetAbstract.Type.ALL
}