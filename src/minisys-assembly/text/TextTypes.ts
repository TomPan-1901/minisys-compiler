import { AbstractInstruction as AbstractInstruction } from "../instruction/AbstractInstruction"
import { InstructionI } from "../instruction/InstructionI"
import { InstructionJ } from "../instruction/InstructionJ"

export class Text {
  private segmentStartAddress: number
  private code: Order[]
  public segmentAddressRecord: Record<string, number>

  constructor(segmentStartAddress: number, code: Order[]) {
    this.segmentStartAddress = segmentStartAddress
    this.code = code
    this.segmentAddressRecord = {}
    let currentAddress = this.segmentStartAddress
    this.code.forEach(c => {
      const name = c.getSegmentID()
      if (name) {
        console.log(`name ${name}, address ${currentAddress}`)
        this.segmentAddressRecord[name] = currentAddress
      }
      currentAddress++
    })
  }

  public getCode(): Order[] {
    return this.code
  }
  
  public generateMinisysROM(variableAddressMap: Map<string, number>): Buffer {
    let rom = Buffer.alloc(64 * 1024)
    let romPointer = this.segmentStartAddress
    let segmentAddressMap: Map<string, number> = new Map()
    const loadCommands: Set<string> = new Set([
      'lb',
      'lbu',
      'lh',
      'lhu',
      'sb',
      'sh',
      'lw',
      'sw',
    ])
    this.code.forEach((order, index) => {
      let id = order.getSegmentID()
      if (id) {
        segmentAddressMap.set(id, index * 4 + this.segmentStartAddress)
      }
    })
    this.code.forEach(order => {
      let instruction = order.getInstruction()
      if (instruction instanceof InstructionJ) {
        if (typeof(instruction.getAddress()) === 'string') {
          let address = segmentAddressMap.get(instruction.getAddress() as string)
          if (address === undefined) {
            throw new Error(`Unresolved mark ${instruction.getAddress()}`)
          }
          instruction.setAddress(address)
        }
      }
      else if (instruction instanceof InstructionI) {
        if (loadCommands.has(instruction.getOp())) {
          let immediate = instruction.getImmediate()
          if (typeof(immediate) === 'string') {
            let address = variableAddressMap.get(immediate)
            if (!address) {
              throw new Error(`Unresolved mark ${immediate}`)
            }
            instruction.setImmediate(address)
          }
        }
      }
    })
    this.code.forEach(order => {
      rom.writeUInt32LE(order.getInstruction().getRawInstruction(), romPointer)
      romPointer += 4
    })
    return rom
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

  public getInstruction(): AbstractInstruction {
    return this.instruction
  }

  public setInstruction(instruction: AbstractInstruction): void {
    this.instruction = instruction
  }
}