export class Production {
  private left: string
  private right: string[]
  private priority?: number

  constructor(left: string, right: string[], priorityMap?: Map<string, number>) {
    this.left = left
    this.right = right
    if (priorityMap === undefined) {
      return
    }
    for (let i = right.length - 1; i >= 0; i--) {
      if ((priorityMap as Map<string, number>).has(right[i])) {
        this.priority = (priorityMap as Map<string, number>).get(right[i])
        break
      }
    }
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

  public setPriority(priority?: number) {
    this.priority = priority
  }

  public getPriority(): number | undefined {
    return this.priority
  }

  public deepCopy(): Production {
    let ans = new Production(this.left, this.right.map(item => item))
    ans.setPriority(this.priority)
    return ans
  }
}
export type ReduceAction = {
  leftToken: string,
  rightItemCount: number
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
    // This shouldn't happen
    if (this.dot >= this.production.getRight().length) {
      return null
    }
    return new LR1Item(this.production, this.dot + 1, this.expect)
  }

  public getPriority() {
    return this.production.getPriority()
  }

  public getProduction() {
    return this.production
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

type Action = {
  action: 'shift' | 'reduce' | 'accept',
  target: number
}

type ActionSchema = {
  token: string,
  action: Action
}

type GoToSchema = {
  token: string,
  to: number
}

type LR1DFASchema = {
  action: ActionSchema[][],
  goto: GoToSchema[][]
}
export class LR1DFA {
  private action: Map<string, Action>[]
  private goto: Map<string, number>[]
  private productionList: Production[]

  constructor(action: Map<string, Action>[], goto: Map<string, number>[], productionList: Production[]) {
    this.action = action
    this.goto = goto
    this.productionList = productionList
  }

  /**
   * 如果[A -> `alpha`.a`beta`, b]，并且`GOTO(i, a) = j`
   */
  public static createLR1DFA(
    lr1CollectionList: LR1Collection[],
    gotoTable: Map<number, Map<string, number>>,
    productionList: Production[],
    terminatorSet: Set<string>,
    nonTerminatorSet: Set<string>,
    leftSet: Set<string>,
    rightSet: Set<string>,
    priorityMap: Map<string, number>
  ) {
    let action: Map<string, Action>[]
      = new Array(lr1CollectionList.length)
        .fill(null)
        .map(_value => new Map())
    let goto: Map<string, number>[]
      = new Array(lr1CollectionList.length)
        .fill(null)
        .map(_value => new Map())
    for (let stateI = 0; stateI < lr1CollectionList.length; stateI++) {
      let collectionI = lr1CollectionList[stateI]
      collectionI.getItem().forEach(lr1Item => {
        let currentHeader = lr1Item.getHeader()
        let currentExpect = lr1Item.getExpect()
        let expectPriority = priorityMap.get(currentExpect)
        let itemPriority = lr1Item.getPriority()

        if (currentHeader !== null) {
          if (nonTerminatorSet.has(currentHeader)) {
            // 要么表里没有填
            // 如果填了，那就是currentExpect优先级高，或者相等+右结合
            // 如果判断不出优先级，移入
            if (
              !action[stateI].has(currentExpect) ||
              !expectPriority ||
              !itemPriority ||
              expectPriority > itemPriority ||
              (expectPriority === itemPriority && rightSet.has(currentExpect))
            )
              action[stateI].set(currentExpect, {
                action: 'shift',
                target: (gotoTable.get(stateI) as Map<string, number>).get(currentHeader) as number
              })
          }
          else if (terminatorSet.has(currentHeader)) {
            goto[stateI].set(currentHeader, (gotoTable.get(stateI) as Map<string, number>).get(currentHeader) as number)
          }
          else {
            // This shouldn't happen
            throw new Error()
          }
        }
        else {
          if (currentExpect === '') {
            action[stateI].set(currentExpect, {
              action: "accept",
              target: 0
            })
          }
          // 要么表里没有填
          // 如果填了，那么当前的产生式优先级高，或者相等+左结合
          // 里面是shift，判断不出，不动
          // 处理规约-规约冲突
          let currentProductionIdx = productionList.findIndex(production => production.equals(lr1Item.getProduction()))
          let existedProductionIdx = action[stateI].get(currentExpect)?.target
          if (!action[stateI].has(currentExpect) ||
            currentProductionIdx < (existedProductionIdx as number) ||
            (currentProductionIdx === existedProductionIdx && leftSet.has(currentExpect)) ||
            ((!expectPriority || !itemPriority) && action[stateI].get(currentExpect)?.action === "shift")
          )
            action[stateI].set(currentExpect, {
              action: 'reduce',
              target: lr1Item.getReduceAction(productionList)
            })
        }
      })
    }
    return new LR1DFA(action, goto, productionList)
  }

  public serializeToSchema(): LR1DFASchema {
    let action: ActionSchema[][] = []
    let goto: GoToSchema[][] = []
    this.action.forEach(actionRow => {
      let ans: ActionSchema[] = []
      for (let [k, v] of actionRow.entries()) {
        ans.push({ token: k, action: v })
      }
      action.push(ans)
    })
    this.goto.forEach(gotoRow => {
      let ans: GoToSchema[] = []
      for (let [k, v] of gotoRow.entries()) {
        ans.push({ token: k, to: v })
      }
      goto.push(ans)
    })
    return {
      action: action,
      goto: goto
    }
  }
}