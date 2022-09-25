import { Production } from "../Production"

export class LR1Item {
  private production: Production
  private dot: number
  private expect: string

  constructor(production: Production, dot: number, expect: string) {
    this.production = production
    this.dot = dot
    this.expect = expect
  }

  public equals(another: LR1Item): boolean {
    return (
      this.dot === another.dot &&
      this.production.equals(another.production) &&
      this.expect === another.expect
    )
  }

  public deepCopy(): LR1Item {
    return new LR1Item(this.production.deepCopy(), this.dot, this.expect)
  }

  public getHeader(): string | null {
    if (this.dot < this.production.getRight().length && this.production.getRight()[0] !== '')
      return this.production.getRight()[this.dot]
    else {
      return null
    }
  }

  public getReduceAction(productionList: Production[]): number {
    let idx = productionList.findIndex(production => production.equals(this.production))
    // This shouldn't happen
    if (idx === -1) {
      throw new Error()
    }
    return idx
  }

  public getExpect(): string {
    return this.expect
  }

  public getDot(): number {
    return this.dot
  }

  public getNext(): LR1Item | null {
    if (this.dot >= this.production.getRight().length) {
      return null
    }
    return new LR1Item(this.production, this.dot + 1, this.expect)
  }

  public getPriority() {
    return this.production.getPriority()
  }

  public getPriorityTerminator() {
    return this.production.getPriorityTerminator()
  }

  public getProduction() {
    return this.production
  }
}