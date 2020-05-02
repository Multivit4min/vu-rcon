export class Weapon {

  readonly name: string
  readonly type: Weapon.Type
  readonly className: string
  readonly isExplosive: boolean
  readonly isVehicle: boolean

  constructor(config: Weapon.Config) {
    this.className = config.className
    this.type = config.type
    this.isExplosive = config.isExplosive || false
    this.isVehicle = config.isVehicle || false
    this.name = config.name || config.className
  }

  static from(className: string) {
    return new Weapon(
      Weapons.find(w => w.className === className) ||
      { className, type: Weapon.Type.UNKNOWN }
    )
  }
}

export namespace Weapon {

  export enum Type {
    UNKNOWN,
    GADGET,
    PISTOL,
    MACHINE_PISTOL,
    MACHINE_GUN,
    SHOTGUN,
    ASSAULT_RIFLE
  }

  export interface Config {
    className: string
    type: Weapon.Type
    name?: string
    isExplosive?: boolean
    isVehicle?: boolean
  }
}


const Weapons: Weapon.Config[] = [{
  className: "Weapons/Gadgets/C4/C4",
  type: Weapon.Type.GADGET,
  name: "C4",
  isExplosive: true
}]