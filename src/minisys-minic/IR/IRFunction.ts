import { MiniCType } from "./IRVariable"

export class IRFunction {
  name: string
  returnType: MiniCType
  entryLabel: string

  constructor(name: string, returnType: MiniCType, entryLabel: string) {
    this.name = name
    this.returnType = returnType
    this.entryLabel = entryLabel
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
}