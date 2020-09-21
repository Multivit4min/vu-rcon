import { Rcon } from "./transport/Rcon"
import { Word } from "./transport/protocol/Word"
import * as Event from "./types/Event"
import { createHash } from "crypto"
import { EventEmitter } from "events"
import { Variable } from "./Variable"

export interface Battlefield {
  on(event: "close", handler: (err: Error|undefined) => void): this
  on(event: "ready", handler: () => void): this
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
  on(event: "roundOverPlayers", handler: (data: Event.OnRoundOver) => void): this
  on(event: "roundOverTeamScores", handler: (data: Event.OnRoundOverTeamScores) => void): this
  on(event: "event", handler: (data: Event.OnUnhandled) => void): this
  on(event: "request", handler: (data: Event.OnRequestCreate) => void): this
}

export class Battlefield extends EventEmitter {

  readonly options: Battlefield.Options
  private rcon: Rcon
  private rconError?: Error
  private pbAddressCache: Record<string, string> = {}
  version: { game: Battlefield.Version, version: number } = {
    game: Battlefield.Version.UNKNOWN,
    version: 0
  }

  readonly vu: Variable<Battlefield.VuVariable>
  readonly var: Variable<Battlefield.Variables>

  constructor(options: Battlefield.Options) {
    super()
    this.options = options
    this.rcon = new Rcon({
      ...this.options,
      eventHandler: this.eventHandler.bind(this)
    })
    this.var = new Variable(this.rcon, "vars")
    this.vu = new Variable(this.rcon, "vu")
    if (this.options.autoconnect !== false) this.rcon.connect()
    this.rcon.on("error", err => this.rconError = err)
    this.rcon.on("close", () => this.emit("close", this.rconError))
  }

  /**
   * tests an rcon connection and disconnects after
   */
  static async testConnection(options: Omit<Battlefield.Options, "autoconnect">):Promise<true|Error> {
    let bf3: Battlefield
    try {
      bf3 = await Battlefield.connect(options)
      bf3.quit()
      return true
    } catch (e) {
      return e
    }
  }

  /**
   * creates a new Battlefield instance
   * @param options 
   */
  static async connect(options: Omit<Battlefield.Options, "autoconnect">) {
    const bf3 = new Battlefield({ ...options, autoconnect: false })
    return bf3.connect()
  }

  /** connects and initializes the query */
  async connect() {
    await this.rcon.connect()
    try {
      return this.initialize()
    } catch (e) {
      this.rcon.stop()
      throw e
    }
  }

  /** initializes the connection */
  private async initialize() {
    await this.fetchVersion()
    await this.login(this.options.password)
    await this.enableEvents(true)
    this.emit("ready")
    return this
  }

  /**
   * sleeps a certain time
   * @param time 
   */
  static sleep(time: number) {
    return new Promise(fulfill => {
      setTimeout(fulfill, time)
    })
  }

  /**
   * attempts to reconnects to the battlefield server
   * @param maxAttempts number of tries <= 0 tries to connect forever 
   * @param timeout timeout in ms between connection attempts
   */
  async reconnect(maxAttempts: number = -1, timeout: number = 1000) {
    let attempts = 0
    while (attempts++ < maxAttempts || maxAttempts <= 0) {
      await Battlefield.sleep(timeout)
      try {
        await this.connect()
        return this
      } catch(e) {
        console.log(`reconnect attempt #${attempts} failed`, e)
      }
    }
    throw new Error(`could not reconnect after ${maxAttempts} tries`)
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
      default:
        this.emit("event", { event, words })
    }
  }

  private onRoundOverTeamScores(words: Word[]) {
    this.emit("roundOverTeamScores", this.getScores(words))
  }

  private onRoundOverPlayers(words: Word[]) {
    this.emit("roundOverPlayers", { players: this.parseClientList()(words) })
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
    const players = this.parseClientList()(words.slice(1))
    players.forEach(player => {
      const ip = this.pbAddressCache[player.name]
      if (ip) {
        player.ip = ip
        delete this.pbAddressCache[player.name]
      }
      this.emit("playerLeave", { player })
    })
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
    event = event.split(".").slice(1).join(".")
    const messages = words.map(w => w.toString())
    messages.forEach(msg => {
      const regex = /PunkBuster Server: New Connection \(slot #\d+\) (.*):(\d+) \[.*\] "(.*)" \(.*\)/
      const match = msg.match(regex)
      if (!match) return
      this.pbAddressCache[match[3]] = match[1]
    })
    this.emit("punkbuster", { event, messages })
  }

  private async playerOnKill(words: Word[]) {
    this.emit("kill", {
      killer: words[0].toString(),
      killed: words[1].toString(),
      weapon: words[2].toString(),
      headshot: words[3].toBoolean()
    } as Event.PlayerOnKill)
  }

  private async playerOnSpawn(words: Word[]) {
    const player = await this.getPlayerByName(words[0].toString())
    if (!player) throw new Error(`could not find player with name ${name} in event player.onSpawn`)
    this.emit("spawn", { player, team: words[1].toString() })
  }

  private async playerOnChat(words: Word[]) {
    const event: Partial<Event.PlayerOnChat> = {
      player: words[0].toString(),
      msg: words[1].toString(),
      subset: words[2].toString() as Battlefield.Subset
    }
    if (event.subset === "team") {
      event.team = words[3].toNumber()
    } else if (event.subset === "squad") {
      event.team = words[3].toNumber()
      event.squad = words[4].toNumber()
    }
    this.emit("chat", event)
  }

  private createCommand<T>(cmd: string, ...args: Rcon.Argument[]) {
    const request = this.rcon.createCommand<T>(cmd, ...args)
    this.emit("request", { request })
    return request
  }

  /** sends the help command to the server */
  help() {
    return this.createCommand("admin.help").send()
  }

  /**
   * Set whether or not the server will send events to the current connection
   * @param set enable or disable events
   */
  enableEvents(set: boolean) {
    return this.createCommand("admin.eventsEnabled", set).send()
  }

  /** Game server type and build ID uniquely identify the server, and the protocol it is running. */
  private fetchVersion() {
    return this.createCommand<{ game: string, version: number}>("version")
      .format(w => ({ game: w[0].toString(), version: w[1].toNumber() })).send()
      .then(({ version, game }) => {
        this.version = (() => {
          switch (game) {
            case "BF3": 
              return { game, version } as any
            default:
              throw new Error(`unsupported game ${version}`)
          }
        })()
        return this.version
      })
  }

  /** get the battlefield server salt */
  private getSalt() {
    return this.createCommand<Buffer>("login.hashed")
      .priorize()
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
    return this.rcon
      .createCommand("login.hashed", this.getPasswordHash(password, await this.getSalt()))
      .priorize()
      .send()
  }

  /** Logout from game server */
  logout() {
    return this.createCommand("logout").send()
  }

  /** return list of all players on the server, but with zeroed out GUIDs */
  getPlayers(subset: Battlefield.PlayerSubset = ["all"]) {
    return this.rcon
      .createCommand<Battlefield.PlayerList>("admin.listPlayers", ...subset)
      .format(this.parseClientList()).send()
      .then(players => {
        return players.map(p => {
          if (typeof p.ip === "string") return p
          p.ip = this.pbAddressCache[p.name]
          return p
        })
      })
  }

  /** Disconnect from server */
  quit() {
    return this.rcon.stop()
  }

  /** retrieves basic serverinformations */
  serverInfo() {
    return this.createCommand<Battlefield.ServerInfo>("serverinfo")
      .format(words => ({
        name: words.shift()!.toString(),
        slots: words.shift()!.toNumber(),
        totalSlots: words.shift()!.toNumber(),
        mode: words.shift()!.toString(),
        map: words.shift()!.toString(),
        roundsPlayed: words.shift()!.toNumber(),
        roundsTotal: words.shift()!.toNumber(),
        ...this.getScores(words),
        onlineState: words.shift()!.toString(),
        ranked: words.shift()!.toBoolean(),
        punkBuster: words.shift()!.toBoolean(),
        password: words.shift()!.toBoolean(),
        uptime: words.shift()!.toNumber(),
        roundTime: words.shift()!.toNumber(),
        address: words.shift()!.toString(),
        punkBusterVersion: words.shift()!.toString(),
        joinQueueEnabled: words.shift()!.toBoolean(),
        region: words.shift()!.toString(),
        closesPingSite: words.shift()!.toString(),
        country: words.shift()!.toString(),
        matchmaking: words.shift()!.toBoolean()
      }))
      .send()
  }

  /** gets the amount of players a server can have */
  effectiveMaxPlayers() {
    return this.createCommand<number>("admin.effectiveMaxPlayers").format(([w]) => w.toNumber()).send()
  }

  /**
   * gets the idle duration of a specific client in seconds
   * @param name name of the player to retrieve idle duration for
   */
  idleDuration(name: string) {
    return this.createCommand<number>("player.idleDuration", name).format(([w]) => w.toNumber()).send()
  }

  /**
   * checks wether a client is dead or alive
   * @param name name of the player to check
   */
  playerAlive(name: string) {
    return this.createCommand<boolean>("player.isAlive", name).format(([w]) => w.toBoolean()).send()
  }

  /**
   * Kick player <soldier name> from server
   * @param name player name to kick
   * @param reason kick reason
   */
  playerKick(name: string, reason?: string) {
    return this.createCommand("admin.kickPlayer", name, reason).send()
  }

  /**
   * Move a player to another team and/or squad
   * Only works if player is dead. This command will kill player if forceKill is true
   * @param name player name to move
   * @param teamId 
   * @param squadId 
   * @param forceKill kill the player to move?
   */
  playerMove(name: string, teamId: number, squadId: number, forceKill: boolean) {
    return this.createCommand("admin.movePlayer", name, teamId, squadId, forceKill).send()
  }

  /**
   * Kill a player without any stats effect
   * @param name 
   */
  playerKill(name: string) {
    return this.createCommand("admin.killPlayer", name).send()
  }

  /**
   * returns the players ping
   * @param name name of the player to check
   */
  playerPing(name: string) {
    return this.createCommand<boolean>("player.ping", name).format(([w]) => w.toBoolean()).send()
  }

  /** Query whether the PunkBuster server module is active */
  punkBusterActive() {
    return this.createCommand<boolean>("punkBuster.isActive").format(([w]) => w.toBoolean()).send()
  }

  /** Attempt to activate PunkBuster server module if it currently is inactive */
  punkBusterActivate() {
    return this.createCommand("punkBuster.active").send()
  }

  /**
   * Send a raw PunkBuster command to the PunkBuster server
   * @param cmd command to send
   */
  punkBusterSendCommand(cmd: string) {
    return this.createCommand("punkBuster.pb_sv_command", cmd).send()
  }

  /**
   * Send a chat message to players. The message must be less than 128 characters long.
   * @param msg message to send
   * @param subset subset to send message to
   */
  say(msg: string, subset: string[]) {
    return this.createCommand("admin.say", msg, ...subset).send()
  }

  /** Retrieves a single player by its name */
  getPlayerByName(name: string) {
    return this.getPlayers().then(players => players.find(p => p.name === name))
  }

  /** retrieves multiple players by their name */
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
  yell(msg: string, duration?: number, subset: string[] = []) {
    return this.createCommand("admin.yell", msg, duration, ...subset).send()
  }

  /** Load list of VIP players from file */
  loadReservedSlots() {
    return this.createCommand("reservedSlotsList.load").send()
  }

  /** Save list of VIP players from file */
  saveReservedSlots() {
    return this.createCommand("reservedSlotsList.save").send()
  }

  /**
   * Add player to VIP list
   * @param name player to add
   * @param save save the list
   */
  addReservedSlot(name: string, save: boolean = true) {
    return this.createCommand("reservedSlotsList.add", name).send()
      .then(() => save ? this.saveReservedSlots() : [] as string[])
  }

  /**
   * Remove a player from the VIP list
   * @param name player to remove
   * @param id
   */
  delReservedSlot(name: string, save: boolean = true) {
    return this.createCommand("reservedSlotsList.remove", name).send()
      .then(() => save ? this.saveReservedSlots() : [] as string[])
  }

  /** clears VIP list */
  clearReservedSlots(save: boolean = true) {
    return this.createCommand("reservedSlotsList.clear").send()
      .then(() => save ? this.saveReservedSlots() : [] as string[])
  }

  /** return a section of the list of VIP players’ name */
  getReservedSlots(offset?: number) {
    return this.createCommand("reservedSlotsList.list", offset).send()
  }

  /**
   * enable or disable aggressive join
   * @param enable wether it should be enabled or not
   */
  aggressiveJoin(enable: boolean) {
    return this.createCommand("reservedSlotsList.aggressiveJoin", enable).send()
  }

  /** load list of banned players/IPs/GUIDs from file */
  loadBans() {
    return this.createCommand("banList.load").send()
  }

  /** save list of banned players/IPs/GUIDs to file */
  saveBans() {
    return this.createCommand("banList.save").send()
  }

  /** retrieve the banlist */
  getBans() {
    return this.createCommand<Battlefield.BanList>("banList.list")
      .format(words => {
        return words.reduce((acc, curr, index) => {
          const current = () => acc[acc.length - 1]
          switch(index % 6) {
            case 0:
              acc.push({})
              current().subset = [curr.toString()]
              return acc
            case 1: return (current().subset.push(curr.toString()), acc)
            case 2: return (current().timeout = [curr.toString()], acc)
            case 3: return (current().timeout.push(curr.toNumber()), acc)
            case 4: return (current().unknown = curr.toString(), acc)
            case 5: return (current().reason = curr.toString(), acc)
          }
        }, <any>[])
      })
      .send()
  }

  /**
   * adding a new name/IP/GUID ban will replace any previous ban for that name/IP/GUID
   * @param type define wether its a guid, ip or name
   * @param id
   * @param timeout 
   * @param reason displayed ban reason
   * @param save save the list
   */
  addBan(type: Battlefield.IdType, timeout: Battlefield.Timeout, reason?: string, save: boolean = true) {
    return this.createCommand("banList.add", ...type, ...timeout, reason).send()
    .then(() => save ? this.saveBans() : [] as string[])
  }

  /**
   * Remove name/ip/guid from banlist
   * @param type id type to remove
   * @param save save the list
   */
  delBan(type: string[], save: boolean = true) {
    return this.createCommand("banList.remove", ...type).send()
    .then(() => save ? this.saveBans() : [] as string[])
  }

  /** clears ban list */
  clearBanList(save: boolean = true) {
    return this.createCommand("banList.clear").send()
      .then(() => save ? this.saveBans() : [] as string[])
  }

  /** clears the map list and loads it from disk again */
  loadMaps() {
    return this.createCommand("mapList.load").send()
  }

  /** saves the maplist to disk */
  saveMaps() {
    return this.createCommand("mapList.save").send()
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
  addMap(map: string, mode: string, rounds: number = 2, index?: number, save: boolean = true) {
    return this.createCommand("mapList.add", map, mode, rounds, index).send()
      .then(() => save ? this.saveMaps() : [] as string[])
  }

  /**
   * Removes the map at offset <index> from the maplist
   * @param index 
   */
  delMap(index: number, save: boolean = true) {
    return this.createCommand("mapList.remove", index).send()
    .then(() => save ? this.saveMaps() : [] as string[])
  }

  /** clears the map list */
  clearMaps(save: boolean = true) {
    return this.createCommand("mapList.clear").send()
      .then(() => save ? this.saveMaps() : [] as string[])
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
    return this.createCommand<Battlefield.MapList>("mapList.list", offset)
      .format(w => {
        return w.slice(2).reduce((acc, _, i, arr) => {
          if (i % 3 !== 0) return acc
          return [...acc, {
            map: arr[i].toString(),
            mode: arr[i+1].toString(),
            rounds: arr[i+2].toNumber(),
            index: (offset||0) + i / 3
          }]
        }, [] as Battlefield.MapList)
      })
      .send()
  }

  /**
   * Specifies which map to switch to once the current round completes. If there are rounds remaining
   * on the current map, those rounds will be skipped.
   * @param index 
   */
  setNextMapIndex(index: number) {
    return this.createCommand("mapList.setNextMapIndex", index).send()
  }

  /** returns the index of the map that is currently being played, and the index of the next map to run. */
  getMapIndices() {
    return this.createCommand<{ index: number, next: number }>("mapList.getMapIndices")
      .format(w => ({ index: w[0].toNumber(), next: w[1].toNumber() }))
      .send()
  }

  /** switches immediately to the next round, without going through the end-of-round sequence. */
  nextRound() {
    return this.createCommand("mapList.runNextRound").send()
  }

  /** restarts the current round, without going through the end of round sequence */
  restartRound() {
    return this.createCommand("mapList.restartRound").send()
  }

  /**
   * Lists the mods to load on the next server restart.
   * This basically lists all mods present in the ModList.txt file
   * and may not be the same as the list of mods that are currently running.
   */
  getMods() {
    return this.createCommand<string[]>("modList.List").send()
  }

  /** lists the mods that are available to be added to the mod list */
  getAvailableMods() {
    return this.createCommand<string[]>("modList.Available").send()
  }

  /**
   * Removes a mod from the list of mods to load on the next server restart
   * and saves the changes to the ModList.txt file.
   * This will not unload any currently running mods.
   * @param name name of the mod to remove
   */
  delMod(name: string) {
    return this.createCommand("modList.Remove", name).send()
  }

  /**
   * Adds a mod to the list of mods to load on the next server restart
   * and saves the changes to the ModList.txt file.
   * This will not load the mod immediately.
   * @param name name of the mod to add
   */
  addMod(name: string) {
    return this.createCommand("modList.Add", name).send()
  }


  /**
   * Clears the list of mods to loads on the next server restart
   * and saves the changes to the ModList.txt file.
   * This will not unload any currently running mods.
   */
  clearMods() {
    return this.createCommand("modList.Clear").send()
  }

  /**
   * Lists all currently loaded / running mods.
   */
  getRunningMods() {
    return this.createCommand<string[]>("modList.ListRunning").send()
  }


  /** 
   * reloads all currently loaded mods.
   * keep in mind that this can cause significant server and client lag
   * and also crashes as not all mods support reloading
   */
  reloadExtensions() {
    return this.createCommand("modList.ReloadExtensions").send()
  }

  /**
   * accepts a single boolean argument (true or false) which toggles debug mode for any loaded extensions
   * when set to true, any scripts will be built with debug symbols enabled, 
   * which will make it so errors printed on the server and the clients will
   * contain more useful information about their source.
   */
  debugExtensions(toggle: boolean) {
    return this.createCommand("modList.Debug", toggle).send()
  }

  /**
   * dnd the current round, declaring <winner> as the winning team
   */
  endRound(winner: number) {
    return this.createCommand("mapList.endRound", winner).send()
  }

  /**
   * returns the (1-based) current round number, and total number of rounds before switching map.
   */
  getRounds() {
    return this.createCommand<{ current: number, total: number }>("mapList.getRounds")
      .format(w => ({ current: w[0].toNumber(), total: w[1].toNumber() }))
      .send()
  }

  private getScores(words: Word[]) {
    return {
      scores: (() => {
        if (isNaN(words[0].toNumber())) return []
        return new Array(words.shift()!.toNumber()).fill(0).map(() => words.shift()!.toNumber())
      })(),
      targetScore: (() => {
        if (isNaN(words[0].toNumber())) return 0
        return words.shift()!.toNumber()
      })()
    }
  }

  private parseClientList() {
    return this.parseList<Battlefield.Player>((word, name) => {
      switch (name) {
        case "name": return word.toString()
        case "teamId": return word.toNumber()
        case "guid": return word.toString()
        case "playerGuid": return word.toString()
        case "spectator": return word.toBoolean()
        case "squadId": return word.toNumber()
        case "kills": return word.toNumber()
        case "deaths": return word.toNumber()
        case "score": return word.toNumber()
        case "rank": return word.toString()
        case "ping": return word.toNumber()
        case "ip": return word.toString()
        default: return word.toString()
      }
    })
  }

  private parseList<T extends {}>(
    cb: (word: Word, name: keyof T) => any,
    replace: Record<string, string|Battlefield.ParseListReplaceOption> = {}
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
        if (name === Battlefield.ParseListReplaceOption.OMIT) return acc
        //@ts-ignore
        if (index === 0) acc[acc.length-1][name] = curr.toNumber()
        //@ts-ignore
        acc[acc.length-1][name] = cb(curr, <any>name)
        return acc
      }, [] as T[])
    }
  }

}

export namespace Battlefield {
  export interface Options {
    host: string
    port: number
    password: string
    autoconnect?: boolean
  }

  export enum ParseListReplaceOption {
    OMIT
  }

  export enum Version {
    UNKNOWN,
    BF3 = "BF3",
    VU = ""
  }

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
    scores: number[]
    targetScore: number,
    onlineState: string,
    ranked: boolean
    punkBuster: boolean
    password: boolean
    uptime: number
    roundTime: number
    address: string
    punkBusterVersion: string
    joinQueueEnabled: boolean
    region: string
    closesPingSite: string
    country: string
    matchmaking: boolean
  }

  export enum Squad {
    NONE = 0,
    ALPHA = 1,    BRAVO = 2,     CHARLIE = 3,  DELTA = 4,
    ECHO = 5,     FOXTROT = 6,   GOLF = 7,     HOTEL = 8,
    INDIA = 9,    JULIET = 10,   KILO = 11,    LIMA = 12,
    MIKE = 13,    NOVEMBER = 14, OSCAR = 15,   PAPA = 16, 
    QUEBEC = 17,  ROMEO = 18,    SIERRA = 19,  TANGO = 20,
    UNIFORM = 21, VICTOR = 22,   WHISKEY = 23, XRAY = 24,
    YANKEE = 25,  ZULU = 26,     HAGGARD = 27, SWEETWATER = 28,
    PRESTON = 29, REDFORD = 30,  FAITH = 31,   CELESTE = 32
  }
  
  export type Subset = "all"|"team"|"squad"|"player"
  export type PlayerSubset = [Subset, (string|number)?]

  export type Timeout = ["perm"|"rounds"|"seconds", number?]
  export type IdType = ["name"|"ip"|"guid", string]
  export type PlayerList = Player[]
  export interface Player {
    name: string
    guid: string
    teamId: number
    squadId: number
    kills: number
    deaths: number
    score: number
    rank: string
    ping: number
    playerGuid: string
    spectator: boolean
    ip?: string
  }

  export type BanList = BanEntry[]

  export interface BanEntry {
    subset: ["ip"|"name"|"guid", string]
    timeout: ["perm"|"seconds"|"rounds", number]
    unknown: string
    reason: string
  }

  export interface VuVariable extends Variable.List {
    DestructionEnabled: boolean
    SuppressionMultiplier: number
    DesertingAllowed: boolean
    VehicleDisablingEnabled: boolean
    HighPerformanceReplication: boolean
    SetTeamTicketCount: [number, number]
    FrequencyMode: string
    SpectatorCount: number
    FadeOutAll: void
    FadeInAll: void
  }

  export interface Variables extends Variable.List {
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
    "3dSpotting": boolean
    /* Set if spotted targets are visible on the minimap */
    miniMapSpotting: boolean
    /* Set if nametags should be displayed */
    nametag: boolean
    /* Set if players should be allowed to switch to third-person vehicle cameras */
    "3pCam": boolean
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
    unlockMode: string|"stats"
    /* Set if server should be exclusive to Premium players */
    premiumStatus: boolean
    /** set what weapons preset to use when playing the gun master game mode */
    gunMasterWeaponsPreset: number
  }
}