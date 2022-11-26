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
  localVariables: number,
  localVariablesList: (IRVarialble | IRArray)[]
}
export class AsmGenerator {

  asm: string[]
  private readonly registers = <const>[
    '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7', '$t8', '$t9', // 子程序可以破坏其中的值
    '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7', // 子程序必须保持前后的值
  ]
  private stackFrame: Record<string, StackFrametype>
  private registerDescriptors: Record<AsmGenerator["registers"][number], Set<string>>
  private addressDescriptors: Record<string, Set<string>>
  private globalVariablePool: Set<string>
  context: IRGenerator

  constructor(irContext: IRGenerator) {
    this.context = irContext
    this.asm = []
    this.stackFrame = {}
    this.addressDescriptors = {}
    this.registerDescriptors = {} as unknown as Record<AsmGenerator["registers"][number], Set<string>>
    this.registers.forEach(v => this.registerDescriptors[v] = new Set())
    this.globalVariablePool = new Set()


    this.generateStackFrameInfo()
    this.asm.push('.data')
    this.generateGlobalVariables()
    this.asm.push('.text')
    this.asm.push('j main')
    this.generateTextSegments()
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
      const generatedInfo = {
        actualParameter,
        controlLink,
        returnValue,
        machineState,
        localVariables,
        localVariablesList: functionVars
      }
      console.log('function %s\'s info:', f.getName())
      console.log(generatedInfo)
      this.stackFrame[f.getName()] = generatedInfo
    })
  }

  generateGlobalVariables() {
    const globalVariables = this.context.getVariables().filter(v => v.scope.length === 1 && v.scope[0] === 0)
    let currentAddress = 0x0
    globalVariables.forEach(v => {
      if (v instanceof IRVarialble) {
        this.asm.push(`${v.id}: .word 0x00000000`)
        this.addressDescriptors[v.id] = new Set()
        this.addressDescriptors[v.id].add(currentAddress.toString(16))
        currentAddress += 4
        return
      }
      else if (v instanceof IRArray) {
        this.asm.push(`${v.id}: .word ${new Array(v.getLen()).fill('0x00000000').join(', ')}`)
        this.addressDescriptors[v.id] = new Set()
        this.addressDescriptors[v.id].add(currentAddress.toString(16))
        currentAddress += 4 * v.getLen()
        return
      }
      throw new Error()
    })
  }

  generateTextSegments() {
    const quadruples = this.context.getQuadruples()
    let constantValues: Record<string, number> = {} 
    let currentFunction = ''
    for (let i = 0; i < quadruples.length; i++) {
      const { op, arg1, arg2, result } = quadruples[i]
      if (op === 'setLabel') {
        if (result.startsWith('__MiniC_Entry_')) {
          currentFunction = result.slice(14)
          console.log('in funtion %s', currentFunction)
          const functionStackFrame = this.stackFrame[currentFunction]
          for (let i = 0; i < functionStackFrame.localVariablesList.length; i++) {
            this.addressDescriptors[
              functionStackFrame.localVariablesList[i].id
            ] = new Set()
            this.addressDescriptors[
              functionStackFrame.localVariablesList[i].id
            ].add(`${functionStackFrame.localVariables - 4 * i}($sp)`)
          }
        }
        else if (result.startsWith('__MiniC_Exit_')) {
          currentFunction = result.slice(13)
          console.log('exit function %s', currentFunction)
        }
      }
      else if (op === 'assignConst') {
        constantValues[result] = parseInt(arg1)
      }
      else if (op === 'call') {
        
      }
    }
  }
}