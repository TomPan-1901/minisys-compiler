import { IRArray } from "./IRArray"
import { IRVarialble, MiniCType } from "./IRVariable"

export class IRFunction {
  name: string
  returnType: MiniCType
  entryLabel: string
  exitLabel: string
  params: IRVarialble[]
  localVariables: (IRVarialble | IRArray)[]
  symbol: boolean

  constructor(name: string, returnType: MiniCType, entryLabel: string, exitLabel: string, symbol=false) {
    this.name = name
    this.returnType = returnType
    this.entryLabel = entryLabel
    this.exitLabel = exitLabel
    this.params = []
    this.localVariables = []
    this.symbol = symbol
  }

  public getName(): string {
    return this.name
  }

  public setName(name: string): void {
    this.name = name
  }

  public getReturnType(): MiniCType {
    return this.returnType
  }

  public setReturnType(returnType: MiniCType): void {
    this.returnType = returnType
  }
  public getEntryLabel(): string {
    return this.entryLabel
  }

  public setEntryLabel(entryLabel: string): void {
    this.entryLabel = entryLabel
  }

  public getParams(): IRVarialble[] {
    return this.params
  }

  public getLocalVariables(): (IRVarialble | IRArray)[] {
    return this.localVariables
  }
}