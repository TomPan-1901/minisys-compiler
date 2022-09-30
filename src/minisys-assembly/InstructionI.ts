import InstructionBase from "./InstructionBase";

class InstructionI extends InstructionBase{

  public getDebugInfo(): string {
    return ''
  }
  constructor(op: number, rs: number, rt: number, immediate: number) {
    super()
    let instruction = 
    (op << 26) + // 5 + 5 + 16
    (rs << 21) + // 5 + 16
    (rt << 16) + // 16
    immediate
    this.instruction.writeUint32BE(instruction)
  }
}

export default InstructionI