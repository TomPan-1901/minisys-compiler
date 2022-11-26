import { IRArray } from "../IR/IRArray";
import { IRGenerator } from "../IR/IRGenerator";
import { IRVarialble } from "../IR/IRVariable";

type StackFrameType = {
  // 实参
  actualParameter: number,
  actualParameterList: IRVarialble[],
  // 返回值
  returnValue: number,
  // 调用链，指向上一个栈顶
  controlLink: number,
  machineState: {
    returnAddress: 4,
  },
  localVariables: number,
  localVariablesList: (IRVarialble | IRArray)[]
}
export class AsmGenerator {

  asm: string[]
  private readonly registers = <const>[
    '$a0', '$a1', '$a2', '$a3', // 传参用寄存器，嵌套调用函数要写回它们
    '$t0', '$t1', '$t2', '$t3', '$t4', '$t5', '$t6', '$t7', '$t8', '$t9', // 子程序可以破坏其中的值
    '$s0', '$s1', '$s2', '$s3', '$s4', '$s5', '$s6', '$s7', // 子程序必须保持前后的值
  ]
  private stackFrame: Record<string, StackFrameType>
  private registerDescriptors: Record<AsmGenerator["registers"][number], Set<string>>
  private addressDescriptors: Record<string, Set<string>>
  private globalVariablePool: Record<string, string>
  context: IRGenerator

  constructor(irContext: IRGenerator) {
    this.context = irContext
    this.asm = []
    this.stackFrame = {}
    this.addressDescriptors = {}
    this.registerDescriptors = {} as unknown as Record<AsmGenerator["registers"][number], Set<string>>
    this.registers.forEach(v => this.registerDescriptors[v] = new Set())
    this.globalVariablePool = {}


    this.generateStackFrameInfo()
    this.asm.push('.data')
    this.generateGlobalVariables()
    this.asm.push('.text')
    this.asm.push('j main')
    this.generateTextSegments()
  }

  getTotalStackFrameSize(functionName: string) {
    if (this.stackFrame[functionName] === undefined)
      throw new Error()
    const info = this.stackFrame[functionName]
    return (
      info.actualParameter
      + info.controlLink
      + info.localVariables
      + info.machineState.returnAddress
      + info.returnValue
    )
  }

  getARegister(variableId: string) {
    const addressSet = this.addressDescriptors[variableId]
    if (!addressSet) {
      throw new Error()
    }
    // 如果变量已经在寄存器中，选择这个寄存器
    for (let [address, _] of addressSet.entries()) {
      if (address.startsWith('$')) {
        return address
      }
    }

    // 如果变量不在寄存器中并且有可用寄存器，加入这个寄存器

    // 如果不可用，写回一个变量
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
      }
      const functionVars = f.getLocalVariables()
      const functionParams = f.getParams()
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
        localVariablesList: functionVars,
        actualParameterList: functionParams
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
        this.globalVariablePool[v.id] = currentAddress.toString(16)
        currentAddress += 4
        return
      }
      else if (v instanceof IRArray) {
        this.asm.push(`${v.id}: .word ${new Array(v.getLen()).fill('0x00000000').join(', ')}`)
        this.addressDescriptors[v.id] = new Set()
        this.addressDescriptors[v.id].add(currentAddress.toString(16))
        this.globalVariablePool[v.id] = currentAddress.toString(16)
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
            ].add(`${functionStackFrame.localVariables - 4 * i - 4}($sp)`)
          }
          this.asm.push(`${result}:`)
        }
        else if (result.startsWith('__MiniC_Exit_')) {
          currentFunction = result.slice(13)
          console.log('exit function %s', currentFunction)
          // 移除所有的局部变量和参数
          this.stackFrame[currentFunction].actualParameterList.forEach(
            param => {
              this.registers.forEach(r => {
                if (this.registerDescriptors[r].has(param.id)) {
                  this.registerDescriptors[r].delete(param.id)
                }
              })
            }
          )
          this.stackFrame[currentFunction].localVariablesList
            .forEach(
              variable => {
                this.registers.forEach(r => {
                  if (this.registerDescriptors[r].has(variable.id)) {
                    this.registerDescriptors[r].delete(variable.id)
                  }
                })
              })
        }
        else {
          this.asm.push(`${result}:`)
        }
      }
      else if (op === 'assignConst') {
        constantValues[result] = parseInt(arg1)
      }
      else if (op === 'assign') {
        if (constantValues[arg1]) {
          constantValues[result] = constantValues[arg1]
        }
      }
      else if (op === 'readArray') {

      }
      else if (op === 'assignArray') {

      }
      else if (op === 'call') {
        const functionName = arg1
        const argumentList = arg2.split(',')
        console.log('call function %s', functionName)
        console.log(`arguments: ${argumentList}`)
        // 先传参
        const loadInto$a = (index: 1 | 2 | 3 | 0) => {
          // 先确定有没有变量被加载进这个寄存器，如果有先写回去
          for (let [k, _] of this.registerDescriptors[`$a${index}`].entries()) {
            const allAddress = this.addressDescriptors[k]
            if (allAddress) {
              let memoryAddress = ''
              for (let [_, v] of allAddress.entries()) {
                if (!v.startsWith('$')) {
                  memoryAddress = v
                }
              }
              if (memoryAddress.endsWith('($sp)')) 
                this.asm.push(`sw $a${index}, ${memoryAddress}`)
              else
                this.asm.push(`sw $a${index}, ${k}($zero)`)
            }
          }
          // 如果是常数，直接加载
          if (constantValues[argumentList[index]] !== undefined) {
            if (constantValues[argumentList[index]] > 32767 || constantValues[argumentList[index]] < -32768) {
              this.asm.push(`lui $a${index}, ${(constantValues[argumentList[index]] >>> 16).toString(16)}`)
            }
            this.asm.push(`ori $a${index}, ${(constantValues[argumentList[index]] & 0xffff).toString(16)}`)
          }
          else {
            // 如果标号已经在某个寄存器
            let findedRegister: string | undefined = undefined
            let memoryAddress = ''
            for (let [v, _] of this.addressDescriptors[argumentList[index]].entries()) {
              if (v.startsWith('$')) {
                findedRegister = v
              }
              else {
                memoryAddress = v
              }
            }
            if (findedRegister) {
              this.asm.push(`addu $a${index}, ${findedRegister}, $zero`)
            }
            else {
              if (memoryAddress.endsWith('($sp)')) {
                this.asm.push(`lw $a${index}, ${memoryAddress}`)
              }
              // 全局变量
              else {
                this.asm.push(`lw $a${index}, ${this.globalVariablePool[argumentList[index]]}`)
              }
            }
          }
        }
        if (argumentList.length < 4) {
          // 用$a0-$a3来存放参数
          for (let j = 0; j < argumentList.length; j++) {
            loadInto$a(j as 0 | 1 | 2 | 3)
          }
        }
        else {
          for (let j = 0; j < 4; j++) {
            loadInto$a(j as 0 | 1 | 2 | 3)
          }
          for (let j = 4; j < argumentList.length; j++) {
            // 如果是常数，直接加载
            // TODO
            if (constantValues[argumentList[j]] !== undefined) {
              this.asm.push(`sw `)
            }
            else {
              // 如果标号已经在某个寄存器
              let findedRegister: string | undefined = undefined
              let memoryAddress = ''
              for (let [v, _] of this.addressDescriptors[argumentList[j]].entries()) {
                if (v.startsWith('$')) {
                  findedRegister = v
                }
                else {
                  memoryAddress = v
                }
              }
              if (findedRegister) {
                this.asm.push(`sw ${findedRegister}, ${(j + 1) * 4}($sp)`)
              }
              else {
                if (memoryAddress.endsWith('($sp)')) {
                  this.asm.push(`lw $a${j}, ${memoryAddress}`)
                }
                // 全局变量
                else {
                  this.asm.push(`lw $a${j}, ${argumentList[j]}($zero)`)
                }
              }
            }

          }
        }

        // 调整$sp
        this.asm.push(`addiu $sp, $sp, ${-this.getTotalStackFrameSize(functionName)}`)
        this.asm.push(`jal __Minic_Entry_${functionName}`)
      }
      else if (op === 'returnExpr') {

      }
      else if (op === 'returnVoid') {

      }
      else if (op === 'jFalse') {

      }
      else if (op === 'jTrue') {

      }
      else if (op === 'j') {

      }
      else {
        switch (op) {
          case 'OR':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] || constantValues[arg2])
            }
            break
          case 'AND':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] && constantValues[arg2])
            }
            break
          case 'EQ':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] === constantValues[arg2])
            }
            break
          case 'NE':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] !== constantValues[arg2])
            }
            break
          case 'LE':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] <= constantValues[arg2])
            }
            break
          case 'GE':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] >= constantValues[arg2])
            }
            break
          case '<':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] < constantValues[arg2])
            }
            break
          case '>':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] > constantValues[arg2])
            }
            break
          case '+':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] + constantValues[arg2])
            }
            else if (constantValues[arg1] && arg2 === '') {
              constantValues[result] = constantValues[arg1]
            }
            break
          case '-':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] - constantValues[arg2])
            }
            else if (constantValues[arg1] && arg2 === '') {
              constantValues[result] = -constantValues[arg1]
            }
            break
          case '|':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] | constantValues[arg2])
            }
            break
          case '&':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] & constantValues[arg2])
            }
            break
          case '^':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] ^ constantValues[arg2])
            }
            break
          case '*':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] * constantValues[arg2])
            }
            break
          case '/':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +Math.floor((constantValues[arg1] / constantValues[arg2]))
            }
            break
          case '%':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] % constantValues[arg2])
            }
            break
          case 'LSHIFT':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] << constantValues[arg2])
            }
            break
          case 'RSHIFT':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] >> constantValues[arg2])
            }
            break
          case '!':
            if (constantValues[arg1]) {
              constantValues[result] = +(!constantValues[arg1])
            }
            break
          case '~':
            if (constantValues[arg1]) {
              constantValues[result] = +(~constantValues[arg1])
            }
            break
        }
      }
    }
  }
}