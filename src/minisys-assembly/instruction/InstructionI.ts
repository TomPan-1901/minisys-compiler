import { Data } from "../data/DataTypes";
import { getHigh6OpCode, getRegisterId } from "../utils";
import { AbstractInstruction } from "./AbstractInstruction";

type InstructionIParameterType = {
  op: string,
  rs: string,
  rt: string,
  immediate: string | number
}
export class InstructionI extends AbstractInstruction{
  public resolveSymbols(symbolTable: Data): void {
    if (typeof this.immediate === 'string')
    {
      const realImmediate = symbolTable.variableRecord[this.immediate]
      console.log(`replace ${this.immediate} to ${realImmediate}`)
      this.immediate = realImmediate
      if (this.immediate === undefined)
        throw new Error()
    }
  }

  private op: string
  private rs: string
  private rt: string
  private immediate: string | number

  constructor({op, rs, rt, immediate}: InstructionIParameterType) {
    super()
    if (op === undefined || rs === undefined || rt === undefined || immediate === undefined) {
      throw new Error()
    }
    this.op = op
    this.rs = rs
    this.rt = rt
    this.immediate = immediate
    
  }

  public getDebugInfo(): string {
    return ''
  }

  public getRawInstruction(): number {
    let immediate = this.immediate
    if (typeof(immediate) === 'string') {
      throw new Error(`Unsolved mark ${immediate}`)
    }
    let instruction = 
    (getHigh6OpCode(this.op) << 26 >>> 0) + // 5 + 5 + 16
    (getRegisterId(this.rs) << 21 >>> 0) + // 5 + 16
    (getRegisterId(this.rt) << 16 >>> 0) + // 16
    immediate >>> 0 & 0xffff
    return instruction
  }

  public setImmediate(immediate: string | number): void {
    this.immediate = immediate
  }

  public getImmediate(): string | number {
    return this.immediate
  }

  public getOp(): string {
    return this.op
  }
  
  public setOp(op: string): void {
    this.op = op
  }

  public getRs(): string {
    return this.rs
  }
  
  public setRs(rs: string): void {
    this.rs = rs
  }

  public getRt(): string {
    return this.rs
  }
  
  public setRt(rt: string): void {
    this.rt = rt
  }
}
