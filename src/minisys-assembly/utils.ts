import Register from './Register'
import { GeneralHigh6OpCode, RLow6OpCode } from './OpCode'
import { AbstractInstruction } from './instruction/AbstractInstruction'
import { InstructionR } from './instruction/InstructionR'
import { InstructionI } from './instruction/InstructionI'
export let getRegisterId = (registerName: string): number => {
  if (registerName.charCodeAt(1) >= '0'.charCodeAt(0) && registerName.charCodeAt(1) <= '9'.charCodeAt(0)) {
    return parseInt(registerName.substring(1))
  }
  else {
    return Register.getRegisterId(registerName)
  }
}

export let getHigh6OpCode = (opAlias: string): number => {
  if (!GeneralHigh6OpCode.has(opAlias))
    throw new Error()
  return GeneralHigh6OpCode.get(opAlias) as number
}

export let getRLow6OpCode = (opAlias: string): number => {
  if (!RLow6OpCode.has(opAlias)) {
    throw new Error()
  }
  return RLow6OpCode.get(opAlias) as number
}

export let solveJBCOM = (op: string, reg1: string, reg2: string, address: number | string): AbstractInstruction[] => {
  switch (op) {
    case 'jg':
      return [
        new InstructionR({
          op: 'slt',
          rs: reg2,
          rt: reg1,
          rd: '$1',
          sa: 0
        }),
        new InstructionI({
          op: 'bne',
          rs: '$1',
          rt: '$0',
          immediate: address
        })
      ]
    case 'jle':
      return [
        new InstructionR({
          op: 'slt',
          rs: reg2,
          rt: reg1,
          rd: '$1',
          sa: 0
        }),
        new InstructionI({
          op: 'beq',
          rs: '$1',
          rt: '$0',
          immediate: address
        })
      ]
    case 'jl':
      return [
        new InstructionR({
          op: 'slt',
          rs: reg1,
          rt: reg2,
          rd: '$1',
          sa: 0
        }),
        new InstructionI({
          op: 'bne',
          rs: '$1',
          rt: '$0',
          immediate: address
        })
      ]
    case 'jge':
      return [
        new InstructionR({
          op: 'slt',
          rs: reg1,
          rt: reg2,
          rd: '$1',
          sa: 0
        }),
        new InstructionI({
          op: 'beq',
          rs: '$1',
          rt: '$0',
          immediate: address
        })
      ]
    default:
      // This shouldn't happen
      throw new Error(``)
  }
}

export let solveSRCOM = (op: string, reg: string): AbstractInstruction => {
  switch (op) {
    case 'mfhi':
    case 'mflo':
      return new InstructionR({
        op: op,
        rs: '$0',
        rt: '$0',
        rd: reg,
        sa: 0
      })
    case 'mthi':
    case 'mtlo':
      return new InstructionR({
        op: op,
        rd: '$0',
        rt: '$0',
        rs: reg,
        sa: 0
      })
    case 'jr':
      return new InstructionR({
        op: op,
        rd: '$0',
        rt: '$0',
        rs: reg,
        sa: 0
      })
    default:
      throw new Error()
  }
}