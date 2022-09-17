import { Queue } from '@datastructures-js/queue'
import { DFAEdgeSchema, DFANodeSchema } from './DFANodeSchema'
import { RegToken } from './RegToken'


export class NFAState {
  private next: Map<string | null, NFAState[]>
  private acceptable = false
  private action: string | null

  constructor(acceptable: boolean = false, action: string | null = null, next: Map<string | null, NFAState[]> | null = null) {
    this.next = next === null ? new Map() : next
    this.acceptable = acceptable
    this.action = action
  }

  public setAcceptable(acceptable: boolean): void {
    this.acceptable = acceptable
  }

  public getAcceptable(): boolean {
    return this.acceptable
  }

  public addEdge(char: string | null, state: NFAState): void {
    if (!this.next.has(char)) {
      this.next.set(char, [])
    }
    this.next.get(char)?.push(state)
  }

  public getNext(): Map<string | null, NFAState[]> {
    return this.next
  }

  public setNext(next: Map<string | null, NFAState[]>): void {
    this.next = next
  }

  public deepCopy(): NFAState {
    let copyNext: Map<string | null, NFAState[]> = new Map()
    this.next.forEach((v, k) => copyNext.set(k, v))
    return new NFAState(this.acceptable, this.action, copyNext)
  }

  public setAction(action: string | null) {
    this.action = action
  }

  public getAction(): string | null {
    return this.action
  }

  public static fromStateList(stateList: NFAState[], actionPriority: Map<string, number>): NFAState {
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
    return new NFAState(acceptable, action)
  }
}

export class NFA {
  private start: NFAState
  private end: NFAState

  constructor(start: NFAState, end: NFAState) {
    this.start = start
    this.end = end
  }

  public getStart(): NFAState {
    return this.start
  }

  public getEnd(): NFAState {
    return this.end
  }

  public deepCopy(): NFA {
    let endCopy: NFAState = this.start
    let visitedState: Set<NFAState> = new Set()
    let oldNewStateMap: Map<NFAState, NFAState> = new Map()
    let dfs = (state: NFAState): void => {
      if (!visitedState.has(state)) {
        visitedState.add(state)
        state.getNext().forEach(value => value.forEach(item => dfs(item)))
      }
    }
    dfs(this.start)
    for (let [v, _v] of visitedState.entries()) {
      oldNewStateMap.set(v, new NFAState(v.getAcceptable()))
    }
    for (let [k, v] of oldNewStateMap) {
      k.getNext().forEach((value, key) => value.forEach(item => v.addEdge(key, oldNewStateMap.get(item) as NFAState)))
    }
    return new NFA(oldNewStateMap.get(this.start) as NFAState, oldNewStateMap.get(this.end as NFAState) as NFAState)
  }

  private static atom({ token, tokenType }: RegToken): NFA {
    // This shouldn't happen
    if (tokenType === 'operator') {
      throw new Error()
    }
    let start = new NFAState()
    let end = new NFAState(true)
    start.addEdge(token, end)
    return new NFA(start, end)
  }

  private static concat(first: NFA, second: NFA): NFA {
    first = first.deepCopy()
    first.getEnd().setAcceptable(false)
    second = second.deepCopy()
    first.getEnd().setNext(second.getStart().getNext())
    return new NFA(first.getStart(), second.getEnd())
  }

  private static union(first: NFA, second: NFA): NFA {
    first = first.deepCopy()
    second = second.deepCopy()
    let vis: Set<NFAState> = new Set()
    let dfs = (state: NFAState): void => {
      if (vis.has(state)) {
        return
      }
      vis.add(state)
      for (let [k, v] of state.getNext().entries()) {
        for (let i = 0; i < v.length; i++) {
          dfs(v[i])
          if (v[i].getAcceptable() === true) {
            // This shouldn't happen
            if (v[i].getNext().size > 0) {
              throw new Error(`Acceptable state with out degree`)
            }
            v[i] = first.getEnd() as NFAState
          }
        }
      }
    }
    dfs(second.getStart())
    for (let [k, v] of second.getStart().getNext().entries()) {
      v.forEach(item => first.getStart().addEdge(k, item))
    }
    return first
  }

  private static star(first: NFA): NFA {
    first = first.deepCopy()
    first.getEnd().setAcceptable(false)
    let newStart = new NFAState()
    let middle = new NFAState()
    let newEnd = new NFAState(true)
  
    middle.addEdge(null, first.getStart())
    first.getEnd().addEdge(null, middle)
    newStart.addEdge(null, middle)
    middle.addEdge(null, newEnd)
  
    return new NFA(newStart, newEnd)
  }

  private static question(first: NFA): NFA {
    first = first.deepCopy()
    let newStart = new NFAState()
    let newEnd = new NFAState(true)
    first.getEnd().setAcceptable(false)
    newStart.addEdge(null, first.getStart())
    first.getEnd().addEdge(null, newEnd)
    newStart.addEdge(null, newEnd)
    return new NFA(newStart, newEnd)
  }

  private static plus(first: NFA): NFA {
    let newStart = new NFAState()
    let newEnd = new NFAState(true)

    first.getEnd().setAcceptable(false)

    let leftExp = first.deepCopy()
    newStart.addEdge(null, leftExp.getStart())

    let midExp = first.deepCopy()
    let midState = new NFAState()
    midState.addEdge(null, midExp.getStart())
    midExp.getEnd().addEdge(null, midState)
    midState.addEdge(null, newEnd)

    leftExp.getEnd().addEdge(null, midState)
    return new NFA(newStart, newEnd)
  }

  public static fromSuffixRegDef(suffixRegDef: Map<string, RegToken[]>): NFA {
    let start = new NFAState()
    let end = new NFAState(true)
    let nfaList: NFA[] = []
    suffixRegDef.forEach((value, key) => {
      let operandStack: NFA[] = []
      value.forEach(v => {
        if (v.tokenType === 'operand') {
          operandStack.push(NFA.atom(v))
        }
        else {
          let first: NFA | undefined = undefined
          let second: NFA | undefined = undefined
          switch (v.token) {
            case '|':
              second = operandStack.pop() as NFA
              first = operandStack.pop() as NFA
              // This shouldn't happen
              if (second === undefined || first === undefined) {
                throw new Error()
              }
              operandStack.push(NFA.union(first, second))
              break
            case '.':
              second = operandStack.pop() as NFA
              first = operandStack.pop() as NFA
              // This shouldn't happen
              if (second === undefined || first === undefined) {
                throw new Error()
              }
              operandStack.push(NFA.concat(first, second))
              break
            case '*':
              first = operandStack.pop() as NFA
              // This shouldn't happen
              if (first === undefined) {
                throw new Error()
              }
              operandStack.push(NFA.star(first))
              break
            case '+':
              first = operandStack.pop() as NFA
              // This shouldn't happen
              if (first === undefined) {
                throw new Error()
              }
              operandStack.push(NFA.plus(first))
              break
            case '?':
              first = operandStack.pop() as NFA
              // This shouldn't happen
              if (first === undefined) {
                throw new Error()
              }
              operandStack.push(NFA.question(first))
              break
          }
        }
      })
      let result = operandStack.pop() as NFA
      // This shouldn't happen
      if (result === undefined) {
        throw new Error()
      }
      result.getEnd().setAcceptable(true)
      result.getEnd().setAction(key)
      console.log(key)
      dfs(result.getStart(), new Set())
      nfaList.push(result)
    })
    nfaList.forEach(value => {
      start.addEdge(null, value.getStart())
      value.getEnd().addEdge(null, end)
    })
    return new NFA(start, end)
  }
}

let dfs = (state: NFAState, vis: Set<NFAState>): void => {
  if (state.getAcceptable() === true) {
    console.log('Find Acceptable State')
  }
  vis.add(state)
  for (let [k, v] of state.getNext().entries()) {
    v.forEach(value => {
      if (!vis.has(value)) {
        dfs(value, vis)
      }
    })
  }
}
export let constructAtomNFA = ({ token, tokenType }: RegToken): NFA => {
  // This shouldn't happen
  if (tokenType === 'operator') {
    throw new Error()
  }
  let start = new NFAState()
  let end = new NFAState(true)
  start.addEdge(token, end)
  return new NFA(start, end)
}

// . 运算
export let concatNFA = (first: NFA, second: NFA): NFA => {
  first = first.deepCopy()
  first.getEnd().setAcceptable(false)
  second = second.deepCopy()
  first.getEnd().setNext(second.getStart().getNext())
  return new NFA(first.getStart(), second.getEnd())
}

// | 运算
export let unionNFA = (first: NFA, second: NFA): NFA => {
  first = first.deepCopy()
  second = second.deepCopy()
  let vis: Set<NFAState> = new Set()
  let dfs = (state: NFAState): void => {
    if (vis.has(state)) {
      return
    }
    vis.add(state)
    for (let [k, v] of state.getNext().entries()) {
      for (let i = 0; i < v.length; i++) {
        dfs(v[i])
        if (v[i].getAcceptable() === true) {
          // This shouldn't happen
          if (v[i].getNext().size > 0) {
            throw new Error(`Acceptable state with out degree`)
          }
          v[i] = first.getEnd() as NFAState
        }
      }
    }
  }
  dfs(second.getStart())
  for (let [k, v] of second.getStart().getNext().entries()) {
    v.forEach(item => first.getStart().addEdge(k, item))
  }
  return first
}

// * 运算
export let addClosure = (first: NFA): NFA => {
  first = first.deepCopy()
  first.getEnd().setAcceptable(false)
  let newStart = new NFAState()
  let middle = new NFAState()
  let newEnd = new NFAState(true)

  middle.addEdge(null, first.getStart())
  first.getEnd().addEdge(null, middle)
  newStart.addEdge(null, middle)
  middle.addEdge(null, newEnd)

  return new NFA(newStart, newEnd)
}

export let addQuestion = (first: NFA): NFA => {
  first = first.deepCopy()
  let newStart = new NFAState()
  let newEnd = new NFAState(true)
  first.getEnd().setAcceptable(false)
  newStart.addEdge(null, first.getStart())
  first.getEnd().addEdge(null, newEnd)
  newStart.addEdge(null, newEnd)
  return new NFA(newStart, newEnd)
}

export let addPlus = (first: NFA): NFA => {
  let newStart = new NFAState()
  let newEnd = new NFAState(true)

  first.getEnd().setAcceptable(false)

  let leftExp = first.deepCopy()
  newStart.addEdge(null, leftExp.getStart())

  let midExp = first.deepCopy()
  let midState = new NFAState()
  midState.addEdge(null, midExp.getStart())
  midExp.getEnd().addEdge(null, midState)
  midState.addEdge(null, newEnd)

  leftExp.getEnd().addEdge(null, midState)
  return new NFA(newStart, newEnd)
}
export let constructNFA = (suffixRegDef: Map<string, RegToken[]>): NFA => {
  let start = new NFAState()
  let end = new NFAState(true)
  let nfaList: NFA[] = []
  suffixRegDef.forEach((value, key) => {
    let operandStack: NFA[] = []
    value.forEach(v => {
      if (v.tokenType === 'operand') {
        operandStack.push(constructAtomNFA(v))
      }
      else {
        let first: NFA | undefined = undefined
        let second: NFA | undefined = undefined
        switch (v.token) {
          case '|':
            second = operandStack.pop() as NFA
            first = operandStack.pop() as NFA
            // This shouldn't happen
            if (second === undefined || first === undefined) {
              throw new Error()
            }
            operandStack.push(unionNFA(first, second))
            break
          case '.':
            second = operandStack.pop() as NFA
            first = operandStack.pop() as NFA
            // This shouldn't happen
            if (second === undefined || first === undefined) {
              throw new Error()
            }
            operandStack.push(concatNFA(first, second))
            break
          case '*':
            first = operandStack.pop() as NFA
            // This shouldn't happen
            if (first === undefined) {
              throw new Error()
            }
            operandStack.push(addClosure(first))
            break
          case '+':
            first = operandStack.pop() as NFA
            // This shouldn't happen
            if (first === undefined) {
              throw new Error()
            }
            operandStack.push(addPlus(first))
            break
          case '?':
            first = operandStack.pop() as NFA
            // This shouldn't happen
            if (first === undefined) {
              throw new Error()
            }
            operandStack.push(addQuestion(first))
            break
        }
      }
    })
    let result = operandStack.pop() as NFA
    // This shouldn't happen
    if (result === undefined) {
      throw new Error()
    }
    result.getEnd().setAcceptable(true)
    result.getEnd().setAction(key)
    console.log(key)
    dfs(result.getStart(), new Set())
    nfaList.push(result)
  })
  nfaList.forEach(value => {
    start.addEdge(null, value.getStart())
    value.getEnd().addEdge(null, end)
  })
  return new NFA(start, end)
}



// export let nfaToDFA = (nfa: NFA, actionPriority: Map<string, number>): DFA => {
//   let unmarkedStates: NFAState[][] = []
//   let stateSet: NFAState[][] = []
//   let newStateMap: Map<NFAState[], NFAState> = new Map()
//   let startClosure = eClosure(nfa.getStart())
//   newStateMap.set(startClosure, NFAState.fromStateList(startClosure, actionPriority))
//   unmarkedStates.push(startClosure)
//   stateSet.push(startClosure)
//
//   while (unmarkedStates.length > 0) {
//     let currentState = unmarkedStates.pop() as NFAState[]
//     let acceptableCharSet = []
//     for (let char of ALLSET) {
//       let u = eClosure(move(currentState, char))
//       if (u.length === 0) {
//         continue
//       }
//       acceptableCharSet.push(char)
//       let nextState = stateSet.find(value => value.length === u.length && value.every(item => u.includes(item)))
//       if (!nextState) {
//         nextState = u
//         newStateMap.set(u, NFAState.fromStateList(nextState, actionPriority))
//         stateSet.push(u)
//         unmarkedStates.push(u)
//       }
//       (newStateMap.get(currentState) as NFAState).addEdge(char, (newStateMap.get(nextState) as NFAState))
//     }
//     console.log(`Total states: ${stateSet.length}, unmarkedStates: ${unmarkedStates.length}, accept: ${acceptableCharSet.join()}`)
//   }
//   return new DFA(newStateMap.get(startClosure) as NFAState)
// }