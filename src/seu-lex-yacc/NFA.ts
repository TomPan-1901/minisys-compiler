class NFAState {
  isAcceptable: boolean = false
  next: Map<string | ((s: string) => boolean), NFAState> = new Map()
}
export class NFA {
  start: NFAState | null = null
  end: NFAState | null = null
}
export let concatNFA = (first: NFA, second: NFA) => {

}

export let unionNFA = (first: NFA, second: NFA) => {

}

export let addClosure = (first: NFA) => {
  
}
