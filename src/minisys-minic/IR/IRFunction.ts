import { IRArray } from "./IRArray"
import { IRVarialble, MiniCType } from "./IRVariable"

export class IRFunction {
  name: string
  returnType: MiniCType
  entryLabel: string
  exitLabel: string
  params: IRVarialble[]
  localVariables: (IRVarialble | IRArray)[]

  constructor(name: string, returnType: MiniCType, entryLabel: string, exitLabel: string) {
    this.name = name
    this.returnType = returnType
    this.entryLabel = entryLabel
    this.exitLabel = exitLabel
    this.params = []
    this.localVariables = []
  }

  public getName(): string {
    return this.name
  }

  public setName(name: string): void {
    this.name = name
  }

  public getReturnType(): string {
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
}