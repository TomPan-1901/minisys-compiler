export class Data {
  private segmentStartAddress: number
  private variables: Variable[]
  public variableRecord: Record<string, number>

  constructor(segmentStartAddress: number, variables: Variable[]) {
    this.segmentStartAddress = segmentStartAddress
    this.variables = variables
    this.variableRecord = {}
    let currentAddress = this.segmentStartAddress
    variables.forEach(v => {
      const name = v.getName()
      const data = v.getData()
      this.variableRecord[name] = currentAddress
      data.forEach(d => {
        const type = d.getType()
        const size = d.getData().length
        switch (type)
        {
          case "byte":
            currentAddress += size * 1
            break
          case "half":
            currentAddress += size * 2
            break
          case "space":
            currentAddress += size * 1
            break
          case "word":
            currentAddress += size * 4
            break
          case "align":
            const mod = 1 << d.getData()[0]
            while (currentAddress % mod)
              currentAddress++
        }
      })
    })
  }

  public generateMinisysRAM(): [Buffer, Map<string, number>] {
    let ram = Buffer.alloc(64 * 1024)
    let variableAddress: Map<string, number> = new Map()
    let ramPointer = this.segmentStartAddress
    this.variables.forEach(variable => {
      let dataSegments = variable.getData()
      let name = variable.getName()
      variableAddress.set(name, ramPointer)
      dataSegments.forEach(segment => {
        let type = segment.getType()
        let data = segment.getData()
        switch (type) {
          case "byte":
            data.forEach(byteNumber => {
              if ((byteNumber >>> 0 & 0xff) !== byteNumber >>> 0) {
                throw new Error()
              }
              ram.writeUint8(byteNumber >>> 0, ramPointer)
              ramPointer += 1
            })
            break
          case "half":
            while ((ramPointer & 0x1) !== 0) {
              ramPointer++
            }
            data.forEach(halfNumber => {
              if ((halfNumber >>> 0 & 0xffff) !== halfNumber >>> 0) {
                throw new Error()
              }
              ram.writeUint16LE(halfNumber >>> 0, ramPointer)
              ramPointer += 2
            })
            break
          case "word":
            while ((ramPointer & 0b11) !== 0) {
              ramPointer++
            }
            data.forEach(wordNumber => {
              if ((wordNumber >>> 0 & 0xffffffff) !== wordNumber >>> 0) {
                throw new Error()
              }
              ram.writeUInt32LE(wordNumber >>> 0, ramPointer)
              ramPointer += 4
            })
            break
          case "align":
            break
          case "space":
            ramPointer += data[0]
            break
        }
      })
    })
    return [ram, variableAddress]
  }

  public getSegmentStartAddress(): number {
    return this.segmentStartAddress
  }

  public setSegmentStartAddress(segmentStartAddress: number): void {
    this.segmentStartAddress = segmentStartAddress
  }

  public getVariables(): Variable[] {
    return this.variables
  }

  public setVariables(variables: Variable[]): void {
    this.variables = variables
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

  public getType(): 'word' | 'half' | 'byte' | 'align' | 'space' {
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