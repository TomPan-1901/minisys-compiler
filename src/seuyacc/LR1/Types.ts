export type Action = {
  action: 'shift' | 'reduce' | 'accept',
  target: number
}

export type ActionSchema = {
  token: string,
  action: Action
}

export type GoToSchema = {
  token: string,
  to: number
}

export type LR1DFASchema = {
  action: ActionSchema[][],
  goto: GoToSchema[][],
  reduceAction: ReduceAction[],
  restoreList: number[]
}

export type ReduceAction = {
  leftToken: string,
  rightItemCount: number,
  action: string
}
