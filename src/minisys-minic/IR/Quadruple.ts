export class Quadruple {
  op: string
  arg1: string
  arg2: string
  result: string

  constructor(op: string, arg1: string, arg2: string, result: string) {
    this.op = op
    this.arg1 = arg1
    this.arg2 = arg2
    this.result = result
  }

  public generateString(): string {
    return `(${this.op}, ${this.arg1}, ${this.arg2}, ${this.result})`
  }

  public getOp(): string {
    return this.op
  }

  public setOp(op: string): void {
    this.op = op
  }

  public getArg1(): string {
    return this.arg1
  }

  public setArg1(arg1: string): void {
    this.arg1 = arg1
  }

  public getArg2(): string {
    return this.arg2
  }

  public setArg2(arg2: string): void {
    this.arg2 = arg2
  }

  public getResult(): string {
    return this.result
  }

  public setResult(result: string): void {
    this.result = result
  }
}