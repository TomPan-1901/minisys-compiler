import { Data } from "../data/DataTypes";
import { Text } from "../text/TextTypes";

export abstract class AbstractInstruction {

  public abstract getDebugInfo(): string

  public abstract getRawInstruction(): number

  public abstract getOp(): string

  public abstract resolveSymbols(symbolTable: Data, text: Text): void;
}
