import Register from './Register'
import { GeneralHigh6OpCode, RLow6OpCode } from './OpCode'
export let getRegisterId = (registerName: string): number => {
  if (registerName.charCodeAt(1) >= '0'.charCodeAt(0) && registerName.charCodeAt(0) <= '9'.charCodeAt(0)) {
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