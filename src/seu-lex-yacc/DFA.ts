import { Queue } from "@datastructures-js/queue"
import { DFAEdgeSchema, DFANodeSchema } from "./DFANodeSchema"
import { NFA, NFAState } from "./NFA"

const ALLSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!\"#%'()*+,-./:;<=>\?[\\]^{|}_ \n\t\v\f~&"

export class DFAState {
  private edge: Map<string, DFAState>
  private acceptable: boolean
  private action: string | null

  constructor(edge: Map<string, DFAState>, acceptable: boolean, action: string | null) {
    this.edge = edge
    this.acceptable = acceptable
    this.action = action
  }
}
export class DFA {
  private start: NFAState

  // Only use static method to construct DFA
  private constructor(start: NFAState) {
    this.start = start
  }

  public serializeToJson(): DFANodeSchema[] {
    let ans: DFANodeSchema[] = []

    let idMap: Map<NFAState, number> = new Map()
    let generateId = (state: NFAState, nextId: number = 0) => {
      if (idMap.has(state)) {
        return
      }
      idMap.set(state, nextId)
      for (let [k, v] of state.getNext().entries()) {
        // This shouldn't happen
        if (v.length !== 1) {
          throw new Error()
        }
        generateId(v[0], nextId + 1)
      }
    }

    let generateAns = (state: NFAState, vis: Set<NFAState>) => {
      if (vis.has(state)) {
        return
      }
      let edge: DFAEdgeSchema | undefined = undefined
      for (let [k, v] of state.getNext().entries()) {
        // This shouldn't happen
        if (v.length !== 1) {
          throw new Error()
        }
        edge = {
          char: k as string,
          to: idMap.get(v[0]) as number
        }
      }
      vis.add(state)
      ans.push({
        id: idMap.get(state) as number,
        action: state.getAction(),
        acceptable: state.getAcceptable(),
        edge: edge as DFAEdgeSchema
      })
      for (let [k, v] of state.getNext().entries()) {
        // This shouldn't happen
        if (v.length !== 1) {
          throw new Error()
        }
        generateAns(v[0], vis)
      }
    }
    generateId(this.start)
    generateAns(this.start, new Set())
    return ans
  }

  public static fromNFA(nfa: NFA, actionPriority: Map<string, number>): DFA {
    let unmarkedStates: NFAState[][] = []
    let stateSet: NFAState[][] = []
    let newStateMap: Map<NFAState[], NFAState> = new Map()
    let startClosure = eClosure(nfa.getStart())
    newStateMap.set(startClosure, NFAState.fromStateList(startClosure, actionPriority))
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
          newStateMap.set(u, NFAState.fromStateList(nextState, actionPriority))
          stateSet.push(u)
          unmarkedStates.push(u)
        }
        (newStateMap.get(currentState) as NFAState).addEdge(char, (newStateMap.get(nextState) as NFAState))
      }
      console.log(`Total states: ${stateSet.length}, unmarkedStates: ${unmarkedStates.length}, accept: ${acceptableCharSet.join()}`)
    }
    return new DFA(newStateMap.get(startClosure) as NFAState)
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