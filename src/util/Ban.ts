import { Battlefield3 } from "../Battlefield3"
import { Timeout } from "../subsets/Timeout"
import { IdType } from "../subsets/IdType"

export class Ban {

  private parent: Battlefield3
  private timeout: Timeout = Battlefield3.createTimeout(Timeout.Type.PERM)
  private id?: IdType
  private reason?: string
  private saveBan: boolean = true
  
  constructor(parent: Battlefield3) {
    this.parent = parent
  }

  /** sets the ban to be permanent */
  permanent() {
    this.timeout = Battlefield3.createTimeout(Timeout.Type.PERM)
    return this
  }

  /** ban for a specific amount of rounds */
  rounds(rounds: number) {
    this.timeout = Battlefield3.createTimeout(Timeout.Type.ROUNDS).duration(rounds)
    return this
  }

  /** ban for a specific amount of seconds */
  seconds(time: number) {
    this.timeout = Battlefield3.createTimeout(Timeout.Type.SECONDS).duration(time)
    return this
  }

  /** sets a guid for the ban */
  guid(guid: string) {
    this.id = Battlefield3.createIdType(IdType.Type.GUID, guid)
    return this
  }

  /** sets a name for the ban */
  name(name: string) {
    this.id = Battlefield3.createIdType(IdType.Type.NAME, name)
    return this
  }

  /** sets a guid for the ban */
  ip(ip: string) {
    this.id = Battlefield3.createIdType(IdType.Type.IP, ip)
    return this
  }

  save(save: boolean) {
    this.saveBan = save
    return this
  }

  /** sends the ban to the server */
  send() {
    if (!this.id) throw new Error(`no id given to ban`)
    return this.parent.addBan(this.id, this.timeout, this.reason, this.saveBan)
  }

}