export type MiniCType = 'int' | 'void'

export class IRVarialble {
  id: string
  name: string
  type: MiniCType
  scope: number[]

  constructor(id: string, name: string, type: MiniCType, scope: undefined | number[]) {
    this.id = id
    this.name = name
    this.type = type
    this.scope = scope ? [...scope] : []
  }
}