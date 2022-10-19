export abstract class AbstractInstruction {

  public abstract getDebugInfo(): string

  public abstract getRawInstruction(): number

  public abstract getOp(): string
}
