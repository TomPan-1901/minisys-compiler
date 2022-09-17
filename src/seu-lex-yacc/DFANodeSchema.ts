export type DFANodeSchema = {
  id: number,
  action: string | null,
  acceptable: boolean,
  edge: DFAEdgeSchema
}

export type DFAEdgeSchema = {
  char: string,
  to: number
}