import { Battlefield3 } from "../Battlefield3"

export abstract class Abstract<T extends {}> {

  protected parent: Battlefield3
  protected props: T

  constructor(parent: Battlefield3, props: T) {
    this.parent = parent
    this.props = props
  }

  /**
   * updates some props from cache
   * @param props props to update
   */
  updateProps(props: Partial<T>) {
    this.props = { ...this.props, ...props }
    return this
  }
}