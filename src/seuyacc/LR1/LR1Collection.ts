import { LR1Item } from "./LR1Item"

export class LR1Collection {
  private items: LR1Item[]
  private coreItems: LR1Item[] = []

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
    return new LR1Collection(this.items.map(item => item.deepCopy())).generateCore()
  }

  public equals(another: LR1Collection): boolean {
    return this.coreItems.length === another.coreItems.length && this.coreItems.every((item => another.coreItems.some(i => i.equals(item))))
  }

  public generateCore(): LR1Collection {
    this.coreItems = this.items.flatMap(item => (item.getProduction().getLeft() === '__SEU_YACC_START' || item.getDot() > 0) ? [item] : [])
    return this
  }
}