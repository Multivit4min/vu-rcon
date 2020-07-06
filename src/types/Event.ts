import { Battlefield } from "../Battlefield"
import { Word } from "../transport/protocol/Word"
import { Request } from "../transport/Request"

export interface OnRoundOver {
  winner: number
}

export interface OnRoundOverPlayers {
  players: Battlefield.PlayerList
}

export interface OnRoundOverTeamScores {
  scores: number[]
  targetScore: number
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
  player: string,
  team: number
  squad: Battlefield.Squad
}

export interface OnSquadChange {
  player: string,
  team: number
  squad: Battlefield.Squad
}

export interface OnAuthenticated {
  name: string
}

export interface OnLeave {
  player: Battlefield.Player
}

export interface OnJoining {
  name: string
  guid: string
}

export interface OnUnhandled {
  event: string
  words: Word[]
}

export interface OnRequestCreate {
  request: Request<any>
}

export interface PunkBuster {
  event: string
  messages: string[]
}

export interface PlayerOnKill {
  killer?: string
  killed: string
  weapon: string
  headshot: boolean
}

export interface PlayerOnSpawn {
  player: string
  team: number
}

export type PlayerOnChat = PlayerOnChatTeam|PlayerOnChatSquad|PlayerOnChatPlayer|PlayerOnChatAll
export interface PlayerOnChatBase {
  player: string
  msg: string
  subset: Battlefield.Subset
}
export interface PlayerOnChatTeam extends PlayerOnChatBase {
  subset: "team"
  team: number
}
export interface PlayerOnChatSquad extends PlayerOnChatBase {
  subset: "squad"
  team: number
  squad: number
}
export interface PlayerOnChatPlayer extends PlayerOnChatBase {
  subset: "player"
}

export interface PlayerOnChatAll extends PlayerOnChatBase {
  subset: "all"
}