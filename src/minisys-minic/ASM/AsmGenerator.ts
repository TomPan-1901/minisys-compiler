import { IRArray } from "../IR/IRArray";
import { IRGenerator } from "../IR/IRGenerator";
import { IRVarialble } from "../IR/IRVariable";

type StackFrametype = {
  actualParameter: number,
  returnValue: number,
  controlLink: number,
  machineState: {
    returnAddress: 4,
    savedRegisters: number
  },
  localVariables: number
}
export class AsmGenerator {

  asm: string[]
  private readonly registers = <const>[
    '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7', '$t8', '$t9', // 子程序可以破坏其中的值
    '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7', // 子程序必须保持前后的值
  ]
  private stackFrame: StackFrametype[]
  context: IRGenerator

  constructor(irContext: IRGenerator) {
    this.context = irContext
    this.asm = []
    this.stackFrame = []
    this.generateStackFrameInfo()
    this.asm.push('.data')
    this.generateGlobalVariables()
    this.asm.push('.text')
  }

  generateStackFrameInfo() {
    /**
     * 实在参数
     * 返回值
     * 控制链
     * 保存的机器状态
     * 局部数据
     * 临时变量
     */
    const functions = this.context.getFunctions()
    functions.forEach(f => {
      // 实在参数
      const params = f.getParams()
      const actualParameter = params.length * 4
      const returnValue = f.getReturnType() === "int" ? 4 : 0
      const controlLink = 4
      const machineState = {
        returnAddress: <const>4,
        savedRegisters: -1
      }
      const functionVars = f.getLocalVariables()
      const localVariables = functionVars.reduce<number>((prev, current) => {
        if (current instanceof IRArray) {
          return prev + current.getLen() * 4
        }
        else if (current instanceof IRVarialble) {
          return prev + 4
        }
        else {
          throw new Error('Error in local variables')
        }
      }, 0)
      this.stackFrame.push({
        actualParameter,
        controlLink,
        returnValue,
        machineState,
        localVariables
      })
    })
  }

  generateGlobalVariables() {
    const globalVariables = this.context.getVariables().filter(v => v.scope.length === 1 && v.scope[0] === 0)
    globalVariables.forEach(v => {
      if (v instanceof IRVarialble) {
        this.asm.push(`${v.id}: .word 0x00000000`)
        return
      }
      else if (v instanceof IRArray) {
        this.asm.push(`${v.id}: .word ${new Array(v.getLen()).fill('0x00000000').join(', ')}`)
        return
      }
      throw new Error()
    })
  }
}