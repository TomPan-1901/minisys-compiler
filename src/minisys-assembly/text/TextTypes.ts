import { AbstractInstruction as AbstractInstruction } from "../instruction/AbstractInstruction"

export class Text {
  private segmentStartAddress: number
  private code: Order[]

  constructor(segmentStartAddress: number, code: Order[]) {
    this.segmentStartAddress = segmentStartAddress
    this.code = code
  }
  
}

export class Order {
  private segmentID?: string
  private instruction: AbstractInstruction

  constructor(instruction: AbstractInstruction, segmentID?: string) {
    this.segmentID = segmentID
    this.instruction = instruction
  }

  public setSegmentID(segmentID?: string): void {
    this.segmentID = segmentID
  }

  public getSegmentID(): string | undefined {
    return this.segmentID
  }
}