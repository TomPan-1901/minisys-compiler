import { InstructionBase } from "./InstructionBase";

export class InstructionJ extends InstructionBase{
  public getDebugInfo(): string {
    return ''
  }
  constructor(op: number, address: number) {
    super()
    let instruction = 
    (op << 26) + 
    address
    this.instruction.writeUInt32BE(instruction)
  }
}
