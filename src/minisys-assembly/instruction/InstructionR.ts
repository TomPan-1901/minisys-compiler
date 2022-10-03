import { getHigh6OpCode, getRLow6OpCode, getRegisterId } from "../utils";
import { AbstractInstruction } from "./AbstractInstruction";
type InstructionRParameterType = {
  op: string,
  rs: string,
  rt: string,
  rd: string,
  sa: number,
  func?: number
}
export class InstructionR extends AbstractInstruction{
  private op: string
  private rs: string
  private rt: string
  private rd: string
  private sa: number
  private func?: number

  constructor({op, rs, rt, rd, sa, func}: InstructionRParameterType) {
    super()
    if (op === undefined || rs === undefined || rt === undefined || sa === undefined) {
      throw new Error()
    }
    this.op = op
    this.rs = rs
    this.rt = rt
    this.rd = rd
    this.sa = sa
    this.func = func
  }

  public getRawInstruction(): number {
    let instruction = 
    (getHigh6OpCode(this.op) << 26 >>> 0) + // 5 + 5 + 5 + 5 + 6
    (getRegisterId(this.rs) << 21 >>> 0) + // 5 + 5 + 5 + 6
    (getRegisterId(this.rt) << 16 >>> 0) + // 5 + 5 + 6
    (getRegisterId(this.rd) << 11 >>> 0) + // 5 + 6
    (this.sa << 6 >>> 0) + // 6
    (this.func ? this.func : getRLow6OpCode(this.op))
    return instruction
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

  public getRd(): string {
    return this.rd
  }
  
  public setRd(rd: string): void {
    this.rd = rd
  }

  public getDebugInfo(): string {
    return ''
  }
}
