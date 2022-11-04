import { Data } from "../data/DataTypes";
import { Text } from "../text/TextTypes";
import { getHigh6OpCode } from "../utils";
import { AbstractInstruction } from "./AbstractInstruction";

type InstructionJParameterType = {
  op: string,
  address: number | string
}
export class InstructionJ extends AbstractInstruction{
  private op: string
  private address: string | number

  public resolveSymbols(symbolTable: Data, textTable: Text): void {
    if (typeof this.address === 'string') {
      const realAddress = textTable.segmentAddressRecord[this.address]
      console.log(`replace ${this.address} to ${realAddress}`)
      this.address = realAddress
      if (this.address === undefined)
        throw new Error()
    }
  }

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
