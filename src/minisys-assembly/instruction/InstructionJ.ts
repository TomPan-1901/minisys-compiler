import { getHigh6OpCode, getRLow6OpCode, getRegisterId } from "../utils";
import { AbstractInstruction } from "./AbstractInstruction";

type InstructionJParameterType = {
  op: string,
  address: number | string
}
export class InstructionJ extends AbstractInstruction{
  private op: string
  private address: string | number

  constructor({op, address}: InstructionJParameterType) {
    super()
    if (op === undefined || address === undefined) {
      throw new Error()
    }
    this.op = op
    this.address = address
  }

  public getDebugInfo(): string {
    return ''
  }

  public getRawInstruction(): number {
    if (typeof(this.address) === 'string' || this.address as any instanceof String) {
      throw new Error(`Unresolved variable ${this.address}`)
    }
    let instruction = 
    (getHigh6OpCode(this.op) << 26 >>> 0) + 
    this.address
    return instruction
  }

  public getOp(): string {
    return this.op
  }

  public setOp(op: string): void {
    this.op = op
  }

  public getAddress(): string | number {
    return this.address
  }

  public setAddress(address: string | number): void {
    this.address = address
  }
}
