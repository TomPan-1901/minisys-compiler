import InstructionBase from "./InstructionBase";

class InstructionR extends InstructionBase{
  public getDebugInfo(): string {
    return ''
  }
  constructor(op: number, rs: number, rt: number, rd: number, sa: number, func: number) {
    super()
    let instruction = 
    (op << 26) + // 5 + 5 + 5 + 5 + 6
    (rs << 21) + // 5 + 5 + 5 + 6
    (rt << 16) + // 5 + 5 + 6
    (rd << 11) + // 5 + 6
    (sa << 6) + // 6
    func
    this.instruction.writeUint32BE(instruction)
  }
}