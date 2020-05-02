import { Player } from "../nodes/Player"
import { Subset } from "../subsets/Subset"
import { Weapon } from "../weapons/Weapon"

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
  squad: number
}

export interface OnSquadChange {
  player: Player,
  team: number
  squad: number
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
  subset: Subset.Type
}
export interface PlayerOnChatTeam extends PlayerOnChatBase {
  subset: Subset.Type.TEAM
  team: number
}
export interface PlayerOnChatSquad extends PlayerOnChatBase {
  subset: Subset.Type.SQUAD
  team: number
  squad: number
}
export interface PlayerOnChatPlayer extends PlayerOnChatBase {
  subset: Subset.Type.PLAYER
}
export interface PlayerOnChatAll extends PlayerOnChatBase {
  subset: Subset.Type.ALL
}