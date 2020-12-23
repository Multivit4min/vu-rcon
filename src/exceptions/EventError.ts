export class EventError extends Error {

  readonly event: string

  constructor(message: string, event: string) {
    super(message)
    this.event = event
  }

}