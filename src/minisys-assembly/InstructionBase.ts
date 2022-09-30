abstract class InstructionBase {
  protected instruction: Buffer

  constructor() {
    this.instruction = Buffer.alloc(4)
  }

  public getRawInstruction(): Buffer {
    return this.instruction
  }

  public abstract getDebugInfo(): string
}

export default InstructionBase