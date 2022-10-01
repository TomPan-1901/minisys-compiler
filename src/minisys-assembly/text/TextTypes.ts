export class Text {
  private segmentStartAddress: number
  private code: Buffer[]

  constructor(segmentStartAddress: number, code: Buffer[]) {
    this.segmentStartAddress = segmentStartAddress
    this.code = code
  }
  
}
