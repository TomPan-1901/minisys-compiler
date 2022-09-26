import ASTNode from "../../entities/ASTNode"
import { LR1Collection } from "./LR1Collection"
import { Production } from "../Production"
import { Action, ReduceAction, LR1DFASchema, ActionSchema, GoToSchema } from "./Types"

export class LR1DFA {
  private action: Map<string, Action>[]
  private goto: Map<string, number>[]
  private reduceActionList: ReduceAction[]
  private stateStack: number[] = [0]
  private astNodeStack: ASTNode[] = []
  private restoreList: Set<number>

  constructor(action: Map<string, Action>[], goto: Map<string, number>[], reduceActionList: ReduceAction[], restoreList: Set<number>) {
    this.action = action
    this.goto = goto
    this.reduceActionList = reduceActionList
    this.restoreList = restoreList
  }

  public transfer(token: string, yylval: any) {
    let topState = this.stateStack[this.stateStack.length - 1]
    let currentAction = this.action[topState].get(token)
    if (!currentAction) {
      throw new Error()
    }
    if (currentAction.action === 'accept') {
      this.stateStack.pop()
      return this.astNodeStack.pop()
    }
    while (currentAction.action === 'reduce') {
      let { leftToken, rightItemCount } = this.reduceActionList[currentAction.target]
      let children: ASTNode[] = []
      for (let i = 0; i < rightItemCount; i++) {
        children.push(this.astNodeStack.pop() as ASTNode)
        this.stateStack.pop()
      } 
      let currentTopState = this.stateStack[this.stateStack.length - 1]
      this.astNodeStack.push(ASTNode.fromNonTerminator(leftToken, children.reverse()))
      this.stateStack.push(this.goto[currentTopState].get(leftToken) as number)
      topState = this.stateStack[this.stateStack.length - 1]
      currentAction = this.action[topState].get(token)
      if (!currentAction) {
        throw new Error()
      }
    }
    if (currentAction.action === 'accept') {
      this.stateStack.pop()
      return this.astNodeStack.pop()
    }
    this.stateStack.push(currentAction.target)
    this.astNodeStack.push(ASTNode.fromTerminator(token, yylval))
  }

  public restore(): void {
    let topState = this.stateStack[this.stateStack.length - 1]
    while (!this.restoreList.has(topState)) {
      topState = this.stateStack.pop() as number
      if (topState === undefined) {
        throw new Error()
      }
    }
    console.log(this.reduceActionList[topState].action)
    this.transfer('error', '')
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
    priorityMap: Map<string, number>,
    actionList: string[],
    restoreList: number[]
  ): LR1DFA {
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
      collectionI.getItem().forEach((lr1Item, index, array) => {
        let currentHeader = lr1Item.getHeader()
        let currentExpect = lr1Item.getExpect()

        if (currentHeader !== null) {
          if (terminatorSet.has(currentHeader)) {
            // 要么表里没有填
            // 如果填了，那就是currentExpect优先级高，或者相等+右结合
            // 如果判断不出优先级，移入
            let existedAction = action[stateI].get(currentHeader)?.action
            let existedTarget = action[stateI].get(currentHeader)?.target
            let targetPriority = existedAction === 'reduce' && existedTarget ? productionList[existedTarget].getPriority() : undefined
            let headerPriority = priorityMap.get(currentHeader)
            if (!existedAction || // 表里没有填
              !targetPriority ||
              !headerPriority ||
              headerPriority > targetPriority ||
              headerPriority === targetPriority && rightSet.has(currentHeader)
            ) {
              // Shift-shift conflict, shouldn't happen
              if (existedAction === 'shift' && (gotoTable.get(stateI) as Map<string, number>).get(currentHeader) as number !== existedTarget) {
                throw new Error()
              }
              action[stateI].set(currentHeader, {
                action: 'shift',
                target: (gotoTable.get(stateI) as Map<string, number>).get(currentHeader) as number
              })
            }
          }
          else if (nonTerminatorSet.has(currentHeader)) {
            goto[stateI].set(currentHeader, (gotoTable.get(stateI) as Map<string, number>).get(currentHeader) as number)
          }
          else {
            // This shouldn't happen
            throw new Error()
          }
        }
        else {
          if (currentExpect === '' && lr1Item.getProduction().getLeft() === '__SEU_YACC_START') {
            action[stateI].set(currentExpect, {
              action: "accept",
              target: 0
            })
          }
          // 要么表里没有填
          // 如果填了，那么当前的产生式优先级高，或者相等+左结合
          // 里面是shift，判断不出，不动
          // 处理规约-规约冲突
          let existedAction = action[stateI].get(currentExpect)?.action
          let existedTarget = action[stateI].get(currentExpect)?.target
          let targetPriority = lr1Item.getPriority()
          let existedPriority = priorityMap.get(currentExpect)
          let currentPriorityTerminator = lr1Item.getPriorityTerminator()
          let existedProductionPriority = existedTarget
          let currentProductionPriority = productionList.findIndex(item => item.equals(lr1Item.getProduction()))
          if (currentProductionPriority === -1) {
            throw new Error()
          }
          if (!existedAction ||
            (existedAction === 'shift' &&
              targetPriority &&
              existedPriority &&
              currentPriorityTerminator &&
              (targetPriority > existedPriority ||
                targetPriority === existedPriority && leftSet.has(currentPriorityTerminator)
              )
            ) ||
            (existedAction === 'reduce' &&
              currentProductionPriority < (existedProductionPriority as number)
            )
          )
            action[stateI].set(currentExpect, {
              action: 'reduce',
              target: lr1Item.getReduceAction(productionList)
            })
        }
      })
    }
    return new LR1DFA(action, goto, productionList.map((production, index) => {
      let leftToken = production.getLeft()
      let rightItems = production.getRight()
      if (rightItems.length === 1 && rightItems[0] === '') {
        return {
          leftToken: leftToken,
          rightItemCount: 0,
          action: actionList[index]
        }
      }
      return {
        leftToken: leftToken,
        rightItemCount: rightItems.length,
        action: actionList[index]
      }
    }), new Set(restoreList))
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
    let r: number[] = []
    this.restoreList.forEach(value => r.push(value))
    return {
      action: action,
      goto: goto,
      reduceAction: this.reduceActionList,
      restoreList: r
    }
  }

  public static deserializeFromSchema(schema: LR1DFASchema): LR1DFA {
    let { action, goto, reduceAction, restoreList} = schema
    let actionMapList: Map<string, Action>[] = []
    let gotoMapList: Map<string, number>[] = []
    action.forEach(value => {
      let actionMap: Map<string, Action> = new Map()
      value.forEach(({ token, action }) => actionMap.set(token, action))
      actionMapList.push(actionMap)
    })
    goto.forEach(value => {
      let gotoMap: Map<string, number> = new Map()
      value.forEach(({ token, to }) => gotoMap.set(token, to))
      gotoMapList.push(gotoMap)
    })
    return new LR1DFA(actionMapList, gotoMapList, reduceAction, new Set(restoreList))
  }
}