import { Queue } from "@datastructures-js/queue"
import { DFAEdgeSchema, DFANodeSchema } from "./DFANodeSchema"
import { NFA, NFAState } from "./NFA"

const ALLSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!\"#%'()*+,-./:;<=>\?[\\]^{|}_ \n\t\v\f~&"

export class DFAState {
  private edge: Map<string, DFAState>
  private acceptable: boolean
  private action: string | null

  constructor(acceptable: boolean = false, action: string | null = null, edge: Map<string, DFAState> | null = null) {
    this.acceptable = acceptable
    this.action = action
    if (edge !== null) {
      this.edge = edge
    }
    else {
      this.edge = new Map()
    }
  }

  public setEdge(edge: Map<string, DFAState>): void {
    this.edge = edge
  }

  public getEdge(): Map<string, DFAState> {
    return this.edge
  }

  public setAcceptable(acceptable: boolean): void {
    this.acceptable = acceptable
  }

  public getAcceptable(): boolean {
    return this.acceptable
  }

  public getAction(): string | null {
    return this.action
  }

  public setAction(action: string | null): void {
    this.action = action 
  }

  public addEdge(char: string, state: DFAState): void {
    // This shouldn't happen
    if (this.edge.has(char)) {
      throw new Error()
    }
    this.edge.set(char, state)
  }

  public static fromNFAStateList(stateList: NFAState[], actionPriority: Map<string, number>): DFAState {
    let acceptable = stateList.find(value => value.getAcceptable() === true) !== undefined
    let action = null
    let curPriority = +Infinity
    stateList.forEach(value => {
      let a = value.getAction()
      if (a !== null && (actionPriority.get(a) as number) < curPriority) {
        action = a
        curPriority = (actionPriority.get(a) as number)
      }
    })
    console.log(`${acceptable}, ${action}`)
    return new DFAState(acceptable, action)
  }
}
export class DFA {
  private start: DFAState

  // Only use static method to construct DFA
  private constructor(start: DFAState) {
    this.start = start
  }

  public serializeToSchema(): DFANodeSchema[] {
    let ans: DFANodeSchema[] = []

    let idMap: Map<DFAState, number> = new Map()
    let nextId = 0
    let generateId = (state: DFAState) => {
      if (idMap.has(state)) {
        return
      }
      idMap.set(state, nextId)
      nextId += 1
      for (let [k, v] of state.getEdge().entries()) {
        // This shouldn't happen
        generateId(v)
      }
    }

    let generateAns = (state: DFAState, vis: Set<DFAState>) => {
      if (vis.has(state)) {
        return
      }
      let edge: DFAEdgeSchema[] = []
      for (let [k, v] of state.getEdge().entries()) {
        edge.push({ char: k as string, to: idMap.get(v) as number })
      }
      vis.add(state)
      ans.push({
        id: idMap.get(state) as number,
        action: state.getAction(),
        acceptable: state.getAcceptable(),
        edge: edge
      })
      for (let [_k, v] of state.getEdge().entries()) {
        generateAns(v, vis)
      }
    }
    generateId(this.start)
    generateAns(this.start, new Set())
    return ans
  }

  public static deserailizeFromSchema(schema: DFANodeSchema[]): DFA {
    let idMap: Map<number, DFAState> = new Map()

    schema.forEach(
      ({id, action, acceptable, edge}) => {
        if (!idMap.has(id)) {
          idMap.set(id, new DFAState())
        }
        let state = idMap.get(id) as DFAState
        state.setAcceptable(acceptable)
        state.setAction(action)
        edge.forEach(
          ({ char, to }) => {
            if (!idMap.has(to)) {
              idMap.set(to, new DFAState())
            }
            state.addEdge(char, idMap.get(to) as DFAState)
          }
        )
      }
    )

    return new DFA(idMap.get(0) as DFAState)
  }

  public static fromNFA(nfa: NFA, actionPriority: Map<string, number>): DFA {
    let unmarkedStates: NFAState[][] = []
    let stateSet: NFAState[][] = []
    let newStateMap: Map<NFAState[], DFAState> = new Map()
    let startClosure = eClosure(nfa.getStart())
    newStateMap.set(startClosure, DFAState.fromNFAStateList(startClosure, actionPriority))
    unmarkedStates.push(startClosure)
    stateSet.push(startClosure)

    while (unmarkedStates.length > 0) {
      let currentState = unmarkedStates.pop() as NFAState[]
      let acceptableCharSet = []
      for (let char of ALLSET) {
        let u = eClosure(move(currentState, char))
        if (u.length === 0) {
          continue
        }
        acceptableCharSet.push(char)
        let nextState = stateSet.find(value => value.length === u.length && value.every(item => u.includes(item)))
        if (!nextState) {
          nextState = u
          newStateMap.set(u, DFAState.fromNFAStateList(nextState, actionPriority))
          stateSet.push(u)
          unmarkedStates.push(u)
        }
        (newStateMap.get(currentState) as DFAState).addEdge(char, (newStateMap.get(nextState) as DFAState))
      }
      console.log(`Total states: ${stateSet.length}, unmarkedStates: ${unmarkedStates.length}, accept: ${acceptableCharSet.join()}`)
    }
    return new DFA(newStateMap.get(startClosure) as DFAState)
  }
}

let eClosure = (stateList: NFAState | NFAState[]): NFAState[] => {
  if (!(stateList instanceof Array)) {
    stateList = [stateList]
  }
  let ans: NFAState[] = []
  let q: Queue<NFAState> = Queue.fromArray(stateList)

  while (!q.isEmpty()) {
    let cur = q.pop()
    ans.push(cur)

    let next = cur.getNext().get(null)
    if (next !== undefined) {
      for (let i = 0; i < next.length; i++) {
        if (!ans.includes(next[i])) {
          q.push(next[i])
        }
      }
    }
  }

  return ans
}

let move = (stateList: NFAState | NFAState[], char: string): NFAState[] => {
  if (!(stateList instanceof Array)) {
    stateList = [stateList]
  }
  let ans: NFAState[] = []
  for (let i = 0; i < stateList.length; i++) {
    stateList[i].getNext().get(char)?.forEach(value => {
      ans.push(value)
    })
  }
  return ans
}