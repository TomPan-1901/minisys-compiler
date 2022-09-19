import { Queue } from "@datastructures-js/queue"
import { NFA, NFAState } from "./NFA"

const ALLSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!\"#%'()*+,-./:;<=>\?[\\]^{|}_ \n\t\v\f~&"

type DFANodeSchema = {
  id: number,
  action: string | null,
  acceptable: boolean,
  edge: DFAEdgeSchema[]
}

type DFAEdgeSchema = {
  char: string,
  to: number
}

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
  private current: DFAState

  // Only use static method to construct DFA
  private constructor(start: DFAState) {
    this.start = start
    this.current = start
  }

  public transfer(char: string): boolean {
    if (this.current.getEdge().has(char)) {
      this.current = this.current.getEdge().get(char) as DFAState
      return true
    }
    return false
  }

  public reset(): void {
    this.current = this.start
  }

  public getCurrentAction(): string | null {
    return this.current.getAction()
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

  public static deserializeFromSchema(schema: DFANodeSchema[]): DFA {
    let idMap: Map<number, DFAState> = new Map()

    schema.forEach(
      ({ id, action, acceptable, edge }) => {
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

  public static minimizedDFA(dfa: DFA): DFA {
    let dfaStates = dfa.serializeToSchema()
    let stateSet: Set<Set<DFANodeSchema>> = new Set()
    let initialStateMap: Map<string | null, Set<DFANodeSchema>> = new Map()
    dfaStates.forEach(value => {
      if (!initialStateMap.has(value.action)) {
        initialStateMap.set(value.action, new Set())
      }
      (initialStateMap.get(value.action) as Set<DFANodeSchema>).add(value)
    })
    initialStateMap.forEach(value => stateSet.add(value))
    while (true) {
      let toBeDeletedStateSetList: Set<DFANodeSchema>[] = []
      let splitStateSetList: Set<DFANodeSchema>[] = []
      for (let [v, _v] of stateSet.entries()) {
        for (let i = 0; i < ALLSET.length; i++) {
          let stateMap: Map<Set<DFANodeSchema> | null, Set<DFANodeSchema>> = new Map()
          v.forEach(value => {
            let outEdge = value.edge.find(item => item.char === ALLSET[i])
            if (outEdge === undefined) {
              if (!stateMap.has(null)) {
                stateMap.set(null, new Set())
              }
              (stateMap.get(null) as Set<DFANodeSchema>).add(value)
              return
            }
            for (let [nodeSet, _nodeSet] of stateSet.entries()) {
              let flag = false
              for (let edge of nodeSet.values()) {
                if (edge.id === outEdge?.to) {
                  if (!stateMap.has(nodeSet)) {
                    stateMap.set(nodeSet, new Set())
                  }
                  (stateMap.get(nodeSet) as Set<DFANodeSchema>).add(value)
                  flag = true
                  break
                }
              }
              if (flag) {
                break
              }
            }
          })
          if (stateMap.size > 1) {
            stateMap.forEach(splitState => splitStateSetList.push(splitState))
            toBeDeletedStateSetList.push(v)
            break
          }
        }
      }
      if (toBeDeletedStateSetList.length === 0) {
        break
      }
      toBeDeletedStateSetList.forEach(toBeDeletedStateSet => stateSet.delete(toBeDeletedStateSet))
      splitStateSetList.forEach(splitStateSet => stateSet.add(splitStateSet))
    }
    let resultDFANodeMap: Map<Set<DFANodeSchema>, DFAState> = new Map()
    stateSet.forEach(value => resultDFANodeMap.set(value, new DFAState()))
    let newStart: DFAState = new DFAState()
    stateSet.forEach(state => {
      let hasSetAction = false
      for (let node of state.values()) {
        if (!hasSetAction) {
          resultDFANodeMap.get(state)?.setAcceptable(node.acceptable)
          resultDFANodeMap.get(state)?.setAction(node.action)
          hasSetAction = true
        }
        node.edge.forEach(nodeEdge => {
          for (let nodeSet of resultDFANodeMap.keys()) {
            let flag = false
            for (let node of nodeSet.values()) {
              if (node.id === 0) {
                newStart = resultDFANodeMap.get(nodeSet) as DFAState
              }
              if (node.id === nodeEdge.to) {
                (resultDFANodeMap.get(state) as DFAState).addEdge(nodeEdge.char, (resultDFANodeMap.get(nodeSet) as DFAState))
                flag = true
                break
              }
            }
            if (flag)
              break
          }
        })
        break
      }
    })
    return new DFA(newStart)
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
  let ansSet: Set<NFAState> = new Set()
  let ans: NFAState[] = []
  for (let i = 0; i < stateList.length; i++) {
    stateList[i].getNext().get(char)?.forEach(value => {
      ansSet.add(value)
    })
  }
  ansSet.forEach(value => ans.push(value))
  return ans
}