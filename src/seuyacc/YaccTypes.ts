export class Production {
  private left: string
  private right: string[]

  constructor(left: string, right: string[]) {
    this.left = left
    this.right = right
  }

  public getLeft(): string {
    return this.left
  }

  public getRight(): string[] {
    return this.right
  }

  public setLeft(left: string): void {
    this.left = left
  }

  public setRight(right: string[]): void {
    this.right = right
  }

  public equals(another: Production): boolean {
    return (
      this.left === another.left &&
      this.right.length === another.right.length &&
      this.right.every((value, index) => another.right[index] === value)
    )
  }

  public deepCopy(): Production {
    return new Production(this.left, this.right.map(item => item))
  }
}

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
    if (this.dot < this.production.getRight().length)
      return this.production.getRight()[this.dot]
    else {
      return null
    }
  }
  
  public getExpect(): string {
    return this.expect
  }

  public getDot(): number {
    return this.dot
  }

  public getNext(): LR1Item | null {
    // This shouldn't happen
    if (this.dot >= this.production.getRight().length) {
      return null
    }
    return new LR1Item(this.production, this.dot + 1, this.expect)
  }
}

export class LR1Collection {
  private items: LR1Item[]

  constructor(items: LR1Item[]) {
    this.items = [...items]
  }

  public getItem(): LR1Item[] {
    return this.items
  }

  public addItem(item: LR1Item): void {
    this.items.push(item)
  }

  public deepCopy(): LR1Collection {
    return new LR1Collection(this.items.map(item => item.deepCopy()))
  }

  public equals(another: LR1Collection): boolean {
    return this.items.length === another.items.length && this.items.every(item => another.items.find(i => i.equals(item)))
  }

}