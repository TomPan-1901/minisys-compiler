export class Data {
  private segmentStartAddress: number
  private dataSegment: DataSegment[]

  constructor(segmentStartAddress: number, data: DataSegment[]) {
    this.segmentStartAddress = segmentStartAddress
    this.dataSegment = data
  }

  public getSegmentStartAddress(): number {
    return this.segmentStartAddress
  }

  public setSegmentStartAddress(segmentStartAddress: number): void {
    this.segmentStartAddress = segmentStartAddress
  }

  public getDataSegment(): DataSegment[] {
    return this.dataSegment
  }

  public setDataSegment(dataSegment: DataSegment[]): void {
    this.dataSegment = dataSegment
  }
}
export class Variable {
  private data: DataSegment[]
  private name: string

  constructor(name: string, data: DataSegment[]) {
    this.data = data
    this.name = name
  }

  public getData(): DataSegment[] {
    return this.data
  }
  
  public setData(data: DataSegment[]): void {
    this.data = data
  }

  public getName(): string {
    return this.name
  }

  public setName(name: string): void {
    this.name = name
  }
}

export class DataSegment {
  private type: 'word' | 'half' | 'byte' | 'align' | 'space'
  private data: number[]

  constructor(type: 'word' | 'half' | 'byte' | 'align' | 'space', data: number[]) {
    this.type = type
    this.data = data
  }

  public getType(): 'word' | 'half' | 'byte' | 'align' | 'space'{
    return this.type
  }

  public setType(type: 'word' | 'half' | 'byte' | 'align' | 'space'): void {
    this.type = type  
  }

  public getData(): number[] {
    return this.data
  }

  public setData(data: number[]): void {
    this.data = data
  }
}