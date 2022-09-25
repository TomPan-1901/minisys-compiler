import { LR1Item } from "./LR1Item"

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