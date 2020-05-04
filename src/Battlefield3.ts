import { Rcon } from "./Rcon"
import { Word } from "./protocol/Word"
import { Player } from "./nodes/Player"
import { PlayerSubsetAbstract } from "./subsets/PlayerSubsetAbstract"
import { AllSubset } from "./subsets/AllSubset"
import { Weapon } from "./weapons/Weapon"
import * as Event from "./types/Event"
import { createHash } from "crypto"
import { EventEmitter } from "events"
import { Timeout } from "./subsets/Timeout"
import { IdType } from "./subsets/IdType"
import { Ban } from "./util/Ban"

export interface Battlefield3 {
  on(event: "chat", handler: (data: Event.PlayerOnChat) => void): this
  on(event: "spawn", handler: (data: Event.PlayerOnSpawn) => void): this
  on(event: "kill", handler: (data: Event.PlayerOnKill) => void): this
  on(event: "punkbuster", handler: (data: Event.PunkBuster) => void): this
  on(event: "playerAuthenticated", handler: (data: Event.OnAuthenticated) => void): this
  on(event: "playerJoin", handler: (data: Event.OnJoining) => void): this
  on(event: "playerLeave", handler: (data: Event.OnLeave) => void): this
  on(event: "teamChange", handler: (data: Event.OnTeamChange) => void): this
  on(event: "squadChange", handler: (data: Event.OnSquadChange) => void): this
  on(event: "maxPlayerCountChange", handler: (data: Event.MaxPlayerCountChange) => void): this
  on(event: "levelLoaded", handler: (data: Event.MaxPlayerCountChange) => void): this
  on(event: "roundOver", handler: (data: Event.OnRoundOver) => void): this
}

export class Battlefield3 extends EventEmitter {

  private options: Battlefield3.Options
  private rcon: Rcon
  private players: Player[] = []

  constructor(options: Battlefield3.Options) {
    super()
    this.options = options
    this.rcon = new Rcon({
      ...this.options,
      eventHandler: this.eventHandler.bind(this)
    })
  }

  static async connect(options: Battlefield3.Options & { password: string }) {
    const { password, ...rest } = options
    const bf3 = new Battlefield3(rest)
    await bf3.login(options.password)
    await bf3.getPlayers()
    await bf3.eventsEnabled(true)
    return bf3
  }

  private eventHandler(event: string, words: Word[]): any {
    if (event.startsWith("punkBuster.")) return this.onPunkBuster(event, words)
    switch (event) {
      case "player.onChat": return this.playerOnChat(words)
      case "player.onSpawn": return this.playerOnSpawn(words)
      case "player.onKill": return this.playerOnKill(words)
      case "player.onJoin": return this.onJoin(words)
      case "player.onSquadChange": return this.onSquadChange(words)
      case "player.onTeamChange": return this.onTeamChange(words)
      case "player.onAuthenticated": return this.onAuthenticated(words)
      case "player.onLeave": return this.playerOnLeave(words)
      case "server.onMaxPlayerCountChange": return this.onMaxPlayerCountChange(words)
      case "server.onLevelLoaded": return this.onLevelLoaded(words)
      case "server.onRoundOver": return this.onRoundOver(words)
      case "server.onRoundOverPlayers": return this.onRoundOverPlayers(words)
      case "server.onRoundOverTeamScores": return this.onRoundOverTeamScores(words)
      default: console.log("unhandled event", event, words.map(w => w.toString()))
    }
  }

  private onRoundOverTeamScores(words: Word[]) {
    //@todo
    console.log("onRoundOverTeamScores", words.map(w => w.toString()))
  }

  private onRoundOverPlayers(words: Word[]) {
    //@todo
    console.log("onRoundOverPlayers", words.map(w => w.toString()))
  }

  private onRoundOver(words: Word[]) {
    this.emit("roundOver", { winner: words[0].toNumber() })
  }

  private onLevelLoaded(words: Word[]) {
    this.emit("levelLoaded", {
      map: words[0].toString(),
      mode: words[1].toString(),
      roundsPlayed: words[2].toNumber(),
      roundsTotal: words[3].toNumber()
    })
  }

  private onMaxPlayerCountChange(words: Word[]) {
    this.emit("maxPlayerCountChange", { maxPlayerCount: words[0].toNumber() })
  }

  private playerOnLeave(words: Word[]) {
    this.emit("playerLeave", this.parseClientList()(words.slice(1))[0])
  }

  private onSquadChange(words: Word[]) {
    const name = words[0].toString()
    const player = this.getPlayerByName(name)
    if (!player) throw new Error(`could not find player ${name} in event player.onSquadChange`)
    this.emit("squadChange", {
      player,
      team: words[1].toNumber(),
      squad: words[2].toNumber(),
    })
  }

  private onTeamChange(words: Word[]) {
    const name = words[0].toString()
    const player = this.getPlayerByName(name)
    if (!player) throw new Error(`could not find player ${name} in event player.onSquadChange`)
    this.emit("teamChange", {
      player,
      team: words[1].toNumber(),
      squad: words[2].toNumber(),
    })
  }

  private async onAuthenticated(words: Word[]) {
    this.emit("playerAuthenticated", { name: words[0].toString() })
  }

  private async onJoin(words: Word[]) {
    this.emit("playerJoin", { name: words[0].toString(), guid: words[1].toString() })
  }

  private onPunkBuster(event: string, words: Word[]) {
    this.emit("punkbuster", { event, messages: words.map(w => w.toString())})
  }

  private async playerOnKill(words: Word[]) {
    const { killer, killed } = await this.getPlayersByName({
      killer: words[0].toString(),
      killed: words[1].toString()
    })
    if (!killed) throw new Error(`could not find killer ${words[1].toString()} in event player.onKill`)
    this.emit("kill", {
      killer,
      killed,
      weapon: Weapon.from(words[2].toString()),
      headshot: words[3].toBoolean()
    } as Event.PlayerOnKill)
  }

  private async playerOnSpawn(words: Word[]) {
    const player = await this.getPlayerByName(words[0].toString())
    if (!player) throw new Error(`could not find player with name ${name} in event player.onSpawn`)
    this.emit("spawn", { player, team: words[1].toString() })
  }

  private async playerOnChat(words: Word[]) {
    let player: Player|"Server"
    let name = words[0].toString()
    if (name === "Server") {
      player = "Server"
    } else {
      const p = await this.getPlayerByName(name)
      if (!p) throw new Error(`could not find player with name ${name} in event player.onChat`)
      player = p
    }
    const event: Partial<Event.PlayerOnChat> = {
      player,
      msg: words[1].toString(),
      subset: words[2].toString() as PlayerSubsetAbstract.Type
    }
    if (event.subset === PlayerSubsetAbstract.Type.TEAM) {
      event.team = words[3].toNumber()
    } else if (event.subset === PlayerSubsetAbstract.Type.SQUAD) {
      event.team = words[3].toNumber()
      event.squad = words[4].toNumber()
    }
    this.emit("chat", event)
  }

  help() {
    return this.rcon.createCommand("admin.help")
  }

  /**
   * Set whether or not the server will send events to the current connection
   * @param set enable or disable events
   */
  eventsEnabled(set: boolean) {
    return this.rcon.createCommand("admin.eventsEnabled", set).send()
  }

  /**
   * Game server type and build ID uniquely identify the server, and the protocol it is running.
   */
  version() {
    return this.rcon.createCommand<{ game: string, version: number}>("version")
      .format(w => ({ game: w[0].toString(), version: w[1].toNumber() }))
      .send()
  }

  /** get the battlefield server salt */
  private getSalt() {
    return this.rcon.createCommand<Buffer>("login.hashed")
      .format(w => Buffer.from(w[0].toString(), "hex"))
      .send()
  }

  /** creates the hashed password from the actual password and the hash */
  private getPasswordHash(password: string, hash: Buffer) {
    return createHash("md5")
      .update(hash)
      .update(password)
      .digest("hex")
      .toUpperCase()
  }

  /**
   * Securely logs you in with a hashed password
   * @param password password to login with
   */
  async login(password: string) {
    return this.rcon.createCommand("login.hashed", this.getPasswordHash(password, await this.getSalt())).send()
  }

  /**
   * Logout from game server
   */
  logout() {
    return this.rcon.createCommand("logout").send()
  }

  /**
   * return list of all players on the server, but with zeroed out GUIDs
   * @todo fix remove when only specific subset is selected
   */
  getPlayers(subset: string = "all"): Promise<Player[]> {
    return this.rcon
      .createCommand<Battlefield3.ListPlayer>("admin.listPlayers", subset)
      .format(this.parseClientList())
      .send()
      .then(list => {
        let toRemove = [...this.players]
        list.forEach(entry => {
          let player = this.players.find(p => p.name === entry.name)
          if (!player) {
            player = new Player(this, entry)
            this.players.push(player)
          }
          player.updateProps(entry)
          toRemove = toRemove.filter(p => p !== player)
        })
        toRemove.forEach(p => this.players.splice(this.players.indexOf(p), 1))
        return this.players
      })
  }

  /**
   * Disconnect from server
   */
  quit() {
    return this.rcon.createCommand("quit").send()
  }

  serverInfo() {
    return this.rcon.createCommand<Battlefield3.ServerInfo>("serverinfo")
      .format(words => ({
        name: words[0].toString(),
        slots: words[1].toNumber(),
        totalSlots: words[2].toNumber(),
        mode: words[3].toString(),
        map: words[4].toString(),
        roundsPlayed: words[5].toNumber(),
        roundsTotal: words[6].toNumber(),
        scores: [ words[7].toNumber(), words[8].toNumber() ],
        //@todo
        onlineState: [ words[9].toString(), words[10].toString(), words[11].toString() ],
        ranked: words[12].toBoolean(),
        punkBuster: words[13].toBoolean(),
        password: words[14].toBoolean(),
        uptime: words[15].toNumber(),
        roundTime: words[16].toNumber(),
        address: words[17].toString(),
        punkBusterVersion: words[18].toString(),
        joinQueueEnabled: words[19].toBoolean()
      }))
      .send()
  }

  /**
   * Query whether the PunkBuster server module is active
   */
  punkBusterActive() {
    return this.rcon.createCommand<boolean>("punkBuster.isActive").format(([w]) => w.toBoolean()).send()
  }

  /**
   * Attempt to activate PunkBuster server module if it currently is inactive
   */
  punkBusterActivate() {
    return this.rcon.createCommand("punkBuster.active").send()
  }

  /**
   * Send a raw PunkBuster command to the PunkBuster server
   * @param cmd command to send
   */
  punkBusterSendCommand(cmd: string) {
    return this.rcon.createCommand("punkBuster.pb_sv_command", cmd).send()
  }

  /**
   * Send a chat message to players. The message must be less than 128 characters long.
   * @param msg message to send
   * @param subset subset to send message to
   */
  say(msg: string, subset: PlayerSubsetAbstract = new AllSubset()) {
    return this.rcon.createCommand("admin.say", msg, ...subset.serializeable()).send()
  }

  /**
   * Kick player <soldier name> from server
   * @param name player name to kick
   * @param reason kick reason
   */
  kickPlayer(name: string, reason?: string) {
    return this.rcon.createCommand("admin.kickPlayer", name, reason).send()
  }

  /**
   * Move a player to another team and/or squad
   * Only works if player is dead. This command will kill player if forceKill is true
   * @param name player name to move
   * @param teamId 
   * @param squadId 
   * @param forceKill kill the player to move?
   */
  movePlayer(name: string, teamId: number, squadId: number, forceKill: boolean) {
    return this.rcon.createCommand("admin.kickPlayer", name, teamId, squadId, forceKill).send()
  }

  /**
   * Kill a player without any stats effect
   * @param name 
   */
  killPlayer(name: string) {
    return this.rcon.createCommand("admin.killPlayer", name).send()
  }

  /**
   * Retrieves a single player by its name
   */
  getPlayerByName(name: string) {
    return this.getPlayers().then(players => players.find(p => p.name === name))
  }

  /**
   * retrieves multiple players by their name
   */
  async getPlayersByName(names: string[]|Record<string, string>) {
    const ns = Array.isArray(names) ? names = Object.fromEntries(names.map(n => [n, n])) : names
    let players = await this.getPlayers()
    players = players.filter(p => Object.values(ns).includes(p.name))
    return Object.fromEntries(Object.keys(ns).map(n => [n, players.find(p => p.name === ns[n])]))
  }

  /**
   * Show an obnoxious message on players’ screens for the specified duration.
   * If duration is left out, a default of 10 seconds is assumed.
   * If players are left out, the message will go to all players.
   * The message must be less than 256 characters long.
   * @param msg message to send
   * @param duration duration in seconds to display the message
   * @param subset subset to send message to
   */
  yell(msg: string, duration?: number, subset?: PlayerSubsetAbstract) {
    const data = subset ? subset.serializeable() : []
    return this.rcon.createCommand("admin.yell", msg, duration, ...data).send()
  }

  /**
   * Load list of VIP players from file
   */
  loadReserveredSlotList() {
    return this.rcon.createCommand("reservedSlotsList.load").send()
  }

  /**
   * Save list of VIP players from file
   */
  saveReserveredSlotList() {
    return this.rcon.createCommand("reservedSlotsList.save").send()
  }

  /**
   * Add player to VIP list
   * @param name player to add
   * @param save save the list
   */
  addReserverSlotList(name: string, save: boolean = true) {
    return this.rcon.createCommand("reservedSlotsList.add", name).send()
      .then(() => save ? this.saveReserveredSlotList() : [] as string[])
  }

  /**
   * Remove a player from the VIP list
   * @param name player to remove
   * @param id
   */
  removeReservedSlotsList(name: string, save: boolean = true) {
    return this.rcon.createCommand("reservedSlotsList.remove",  IdType.Type.NAME, name).send()
      .then(() => save ? this.saveReserveredSlotList() : [] as string[])
  }

  /**
   * clears VIP list
   */
  clearReservedSlotList(save: boolean = true) {
    return this.rcon.createCommand("reservedSlotsList.clear").send()
      .then(() => save ? this.saveReserveredSlotList() : [] as string[])
  }

  /**
   * enable or disable aggressive join
   * @param enable wether it should be enabled or not
   */
  aggressiveJoin(enable: boolean) {
    return this.rcon.createCommand("reservedSlotsList.aggressiveJoin", enable).send()
  }

  /**
   * return a section of the list of VIP players’ name
   */
  getReservedSlotList(offset?: number) {
    return this.rcon.createCommand("reservedSlotsList.list", offset).send()
  }

  /**
   * load list of banned players/IPs/GUIDs from file
   */
  loadBanList() {
    return this.rcon.createCommand("banList.load").send()
  }

  /**
   * save list of banned players/IPs/GUIDs to file
   */
  saveBanList() {
    return this.rcon.createCommand("banList.save").send()
  }

  /**
   * adding a new name/IP/GUID ban will replace any previous ban for that name/IP/GUID
   * @param type define wether its a guid, ip or name
   * @param id
   * @param timeout 
   * @param reason displayed ban reason
   * @param save save the list
   */
  addBan(type: IdType, timeout: Timeout, reason?: string, save: boolean = true) {
    return this.rcon.createCommand("banList.add", ...type.serializeable(), ...timeout.serializeable(), reason).send()
    .then(() => save ? this.saveBanList() : [] as string[])
  }

  /**
   * creates a new name/IP/GUID ban will replace any previous ban for that name/IP/GUID
   */
  createBan() {
    return new Ban(this)
  }

  /**
   * Remove name/ip/guid from banlist
   * @param type id type to remove
   * @param save save the list
   */
  removeBan(type: IdType, save: boolean = true) {
    return this.rcon.createCommand("banList.remove", ...type.serializeable()).send()
    .then(() => save ? this.saveBanList() : [] as string[])
  }

  /**
   * clears ban list
   */
  clearBanList(save: boolean = true) {
    return this.rcon.createCommand("banList.clear").send()
      .then(() => save ? this.saveBanList() : [] as string[])
  }

  /**
   * clears the map list and loads it from disk again
   */
  loadMapList() {
    return this.rcon.createCommand("mapList.load").send()
  }

  /**
   * saves the maplist to disk
   */
  saveMapList() {
    return this.rcon.createCommand("mapList.save").send()
  }

  /**
   * Adds the map <map>, with gamemode <gamemode>, for <rounds> rounds, to the
   * maplist. If <index> is not specified, it is appended to the end; otherwise, it is inserted
   * before the map which is currently at position <index>.
   * @param map 
   * @param mode 
   * @param rounds 
   * @param index 
   */
  addMap(map: string, mode: string, rounds: number = 2, index?: number) {
    return this.rcon.createCommand("mapList.add", map, mode, rounds, index).send()
  }

  /**
   * Removes the map at offset <index> from the maplist
   * @param index 
   */
  removeMap(index: number) {
    return this.rcon.createCommand("mapList.remove", index).send()
  }

  /**
   * clears the map list.
   */
  clearMapList() {
    return this.rcon.createCommand("mapList.clear").send()
  }

  /**
   * Returns a section of the map list.
   * At most 100 entries will be returned by the command.
   * To retrieve the full list, perform several mapList.list calls with increasing offset until the
   * server returns 0 entries.
   * (There is an unsolved synchronization problem hidden there: if the map list is edited by another
   * RCON client during this process, then entries may be missed during retrieval. There is no
   * known workaround for this.)
   * @param offset 
   */
  getMaps(offset?: number) {
    return this.rcon.createCommand<Battlefield3.MapList>("mapList.list", offset)
      .format(w => {
        return w.slice(2).reduce((acc, _, i, arr) => {
          if (i % 3 !== 0) return acc
          return [...acc, {
            map: arr[i].toString(),
            mode: arr[i+1].toString(),
            rounds: arr[i+2].toNumber(),
            index: (offset||0) + i / 3 + 1
          }]
        }, [] as Battlefield3.MapList)
      })
      .send()
  }

  /**
   * Specifies which map to switch to once the current round completes. If there are rounds remaining
   * on the current map, those rounds will be skipped.
   * @param index 
   */
  setNextMapIndex(index: number) {
    return this.rcon.createCommand("mapList.setNextMapIndex", index).send()
  }

  /**
   * returns the index of the map that is currently being played, and the index of the next map to run.
   */
  getMapIndices() {
    return this.rcon.createCommand<{ index: number, next: number }>("mapList.getMapIndices")
      .format(w => ({ index: w[0].toNumber(), next: w[1].toNumber() }))
      .send()
  }

  /**
   * switches immediately to the next round, without going through the end-of-round sequence.
   */
  nextRound() {
    return this.rcon.createCommand("mapList.runNextRound").send()
  }

  /**
   * dnd the current round, declaring <winner> as the winning team
   */
  endRound(winner: number) {
    return this.rcon.createCommand("mapList.endRound", winner).send()
  }

  /**
   * returns the (1-based) current round number, and total number of rounds before switching map.
   */
  getRounds() {
    return this.rcon.createCommand<{ current: number, total: number }>("mapList.getRounds")
      .format(w => ({ current: w[0].toNumber(), total: w[1].toNumber() }))
      .send()
  }

  /**
   * updates a set of variables
   * @param vars 
   */
  setVariables(vars: Battlefield3.Variables) {
    return Promise.all(
      //@ts-ignore
      Object.keys(vars).map(k => this.setVariable(k, vars[k]))
    )
  }

  /** gets a set of variables */
  getVariables(vars: (keyof Battlefield3.Variables)[]): Promise<Record<keyof Battlefield3.Variables, string>> {
    return Promise.all(vars.map(v => [v, this.getVariable(v)])).then(res => Object.fromEntries(res))
  }

  getVariable(name: keyof Battlefield3.Variables) {
    return this.rcon.createCommand<string>(`vars.${(name.startsWith("_")) ? name.substr(1) : name}`)
      .format(w => w[0].toString())
      .send()
  }

  setVariable(name: keyof Battlefield3.Variables, value: boolean|number|string) {
    return this.rcon.createCommand(`vars.${(name.startsWith("_")) ? name.substr(1) : name}`, value)
      .send()
  }

  /**
   * creates a new timeout instance
   * @param type duration
   */
  static createTimeout(type: Timeout.Type) {
    return new Timeout(type)
  }

  /**
   * creates a new idtype instance
   * @param type type to create
   * @param id
   */
  static createIdType(type: IdType.Type, id: string) {
    return new IdType(type, id)
  }

  private parseClientList() {
    return this.parseList<Player.Info>((word, name) => {
      switch (name) {
        case "name": return word.toString()
        case "teamId": return word.toNumber()
        case "guid": return word.toString()
        case "squadId": return word.toNumber()
        case "kills": return word.toNumber()
        case "deaths": return word.toNumber()
        case "score": return word.toNumber()
        case "rank": return word.toNumber()
        case "ping": return word.toNumber()
        default: return word.toString()
      }
    })
  }

  private parseList<T extends {}>(
    cb: (word: Word, name: keyof T) => any,
    replace: Record<string, string|Battlefield3.ParseListReplaceOption> = {}
  ): (words: Word[]) => T[] {
    return (words: Word[]) => {
      const entries = words[0].toNumber()
      const names = words.slice(1, entries+1)
        .map(w => w.toString())
        .map(s => Object.keys(replace).includes(s) ? replace[s] : s)
      return words.slice(entries+2).reduce((acc, curr, i) => {
        const index = i % entries
        if (index === 0) acc.push({} as T)
        const name = names[index]
        if (name === Battlefield3.ParseListReplaceOption.OMIT) return acc
        //@ts-ignore
        if (index === 0) acc[acc.length-1][name] = curr.toNumber()
        //@ts-ignore
        acc[acc.length-1][name] = cb(curr, <any>name)
        return acc
      }, [] as T[])
    }
  }

}

export namespace Battlefield3 {
  export interface Options {
    protocol?: "ipv4"|"ipv6"
    host: string
    port: number
  }

  export enum ParseListReplaceOption {
    OMIT
  }

  export type ListPlayer = Player.Info[]

  export type MapList = MapEntry[]

  export interface MapEntry {
    map: string
    mode: string
    rounds: number
    index: number
  }

  export interface ServerInfo {
    name: string
    slots: number
    totalSlots: number
    mode: string
    map: string
    roundsPlayed: number
    roundsTotal: number
    scores: [number, number]
    onlineState: [string, string, string],
    ranked: boolean
    punkBuster: boolean
    password: boolean
    uptime: number
    roundTime: number
    address: string
    punkBusterVersion: string
    joinQueueEnabled: boolean
  }

  

  export interface Variables {
    /* This command can only be used during startup. It can only be used to switch the server from ranked to unranked mode; the server can never switch back to ranked mode again. */
    ranked: boolean
    /* Set server name */
    serverName: string
    /* Set the game password for the server, use it with an empty string to reset */
    gamePassword: string
    /* Set if the server should autobalance */
    autoBalance: boolean
    /* Set if the server should allow team damage */
    friendlyFire: boolean
    /* Set desired maximum number of players */
    maxPlayers: number
    /* Sets the server description. This string is displayed on the server’s detail page on Battlelog.
     * This string must be less than 256 characters in length. */
    serverDescription: string
    /* Sets the server welcome message. This message will be displayed via an admin.yell to each player the first time that player deploys in on the server.
     * The message is displayed for 5 seconds. This string must be less than 256 characters in length. */
    serverMessage: string
    /* Set if killcam is enabled */
    killCam: boolean
    /* Set if minimap is enabled */
    miniMap: boolean
    /* Set if players hud is available */
    hud: boolean
    /* Set if crosshair for all weapons is enabled */
    crossHair: boolean
    /* Set if spotted targets are visible in the 3d-world */
    _3dSpotting: boolean
    /* Set if spotted targets are visible on the minimap */
    miniMapSpotting: boolean
    /* Set if nametags should be displayed */
    nametag: boolean
    /* Set if players should be allowed to switch to third-person vehicle cameras */
    _3pCam: boolean
    /* Set if players health regeneration is active */
    regenerateHealth: boolean
    /* Set number of teamkills allowed during one round, before the game kicks the player in question Set to 0 to disable kill counting */
    teamKillCountForKick: number
    /* Set the highest kill-value allowed before a player is kicked for teamkilling Set to 0 to disable kill value mechanism */
    teamKillValueForKick: number
    /* Set the value of a teamkill (adds to the player’s current kill-value) */
    teamKillValueIncrease: number
    /* Set how much every player’s kill-value should decrease per second */
    teamKillValueDecreasePerSecond: number
    /* Set how many teamkill-kicks will lead to permaban Set to 0 to disable feature */
    teamKillKickForBan: number
    /* Set how many seconds a player can be idle before he/she is kicked from server Set to 0 to disable idle kick */
    idleTimeout: number
    /* Set how many rounds an idle-kick person should be banned Set to 0 to disable ban mechanism */
    idleBanRounds: number
    /* Set the minimum number of players required to begin a round */
    roundStartPlayerCount: number
    /* Set the minimum number of players for the round to restart in pre-round */
    roundRestartPlayerCount: number
    /* Set the duration of pre-round */
    roundLockdownCountdown: number
    /* Set whether vehicles should spawn in-game */
    vehicleSpawnAllowed: number
    /* Set vehicle spawn delay scale factor, in percent */
    vehicleSpawnDelay: number
    /* Set soldier max health scale factor, in percent */
    soldierHealth: number
    /* Set player respawn time scale factor, in percent */
    playerRespawnTime: number
    /* Set player man-down time scale factor, in percent */
    playerManDownTime: number
    /* Set bullet damage scale factor, in percent */
    bulletDamage: number
    /* Set scale factor for number of tickets to end round, in percent */
    gameModeCounter: number
    /* Set if players can only spawn on their squad leader */
    onlySquadLeaderSpawn: boolean
    /* Set which group of weapons/unlock should be available to players on an unranked server */
    //@todo specification
    unlockMode: string
    /* Set if server should be exclusive to Premium players */
    premiumStatus: boolean
  }
}