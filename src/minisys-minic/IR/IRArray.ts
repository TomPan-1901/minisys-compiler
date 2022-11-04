import { MiniCType } from "./IRVariable";
export class IRArray {
  id: string
  type: MiniCType
  name: string
  len: number
  scope: number[]

  constructor(id: string, type: MiniCType, name: string, len: number, scope: number[] | undefined) {
    this.id = id
    this.type = type
    this.name = name
    this.len = len
    this.scope = scope ? scope : []
  }

  public getId(): string {
    return this.id
  }

  public setId(id: string): void {
    this.id = id
  }

  public getType(): MiniCType {
    return this.type
  }

  public setType(type: MiniCType): void {
    this.type = type
  }

  public getName(): string {
    return this.name
  }

  public setName(name: string): void {
    this.name = name 
  }

  public getLen(): number {
    return this.len
  }

  public setLen(len: number): void {
    this.len = len
  }
  
}