import { reduceEachLeadingCommentRange } from "typescript";
import { IRArray } from "../IR/IRArray";
import { IRGenerator } from "../IR/IRGenerator";
import { IRVarialble } from "../IR/IRVariable";

type StackFrameType = {
  // 实参
  actualParameter: number,
  actualParameterList: {
    param: IRVarialble,
    memoryAddress: string
  }[]
  // 返回值
  returnValue: number,
  // 调用链，指向上一个栈顶
  controlLink: number,
  machineState: {
    returnAddress: 4,
  },
  localVariables: number,
  localVariablesList: {
    param: (IRVarialble | IRArray),
    memoryAddress: string
  }[]
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

  getARegister(variableId: string, load = false): AsmGenerator["registers"][number] {
    let addressSet = this.addressDescriptors[variableId]
    if (!addressSet) {
      this.addressDescriptors[variableId] = new Set()
      addressSet = this.addressDescriptors[variableId]
    }
    let memoryAddress = ''
    // 如果变量已经在寄存器中，选择这个寄存器
    for (let [address, _] of addressSet.entries()) {
      if (address.startsWith('$')) {
        this.registerDescriptors[address as AsmGenerator["registers"][number]].add(address)
        this.addressDescriptors[variableId].add(address)
        return address as AsmGenerator["registers"][number]
      }
      else {
        memoryAddress = address
      }
    }

    // 如果变量不在寄存器中并且有可用寄存器，加入这个寄存器

    const availableRegister = this.registers.find(value => !(value.startsWith('$a')) && this.registerDescriptors[value].size === 0)
    if (availableRegister) {
      addressSet.add(availableRegister)
      this.registerDescriptors[availableRegister].add(variableId)
      if (load && memoryAddress.length) {
        if (memoryAddress.endsWith(`($sp)`))
          this.asm.push(`lw ${availableRegister}, ${memoryAddress}`)
        else {
          this.asm.push(`lw ${availableRegister}, ${memoryAddress}($zero)`)
        }
      }
      this.registerDescriptors[availableRegister as AsmGenerator["registers"][number]].add(variableId)
      this.addressDescriptors[variableId].add(availableRegister)
      return availableRegister
    }

    // 如果不可用，写回一个变量
    // 找到需要写回变量最少的那个寄存器

    let min = Infinity
    let result = ''
    this.registers.forEach(
      value => {
        if (value.startsWith('$a')) {
          return
        }
        const variableCount = this.registerDescriptors[value].size
        if (variableCount < min) {
          result = value
          min = variableCount
        }
      }
    )
    this.registerDescriptors[result as AsmGenerator["registers"][number]].forEach(
      v => {
        if (v.endsWith('($sp)'))
          this.asm.push(`sw ${result}, ${v}`)
        else {
          this.asm.push(`sw ${result}, ${v}($zero)`)
        }
      }
    )
    if (load && memoryAddress.length) {
      if (memoryAddress.endsWith(`($sp)`))
        this.asm.push(`lw ${availableRegister}, ${memoryAddress}`)
      else {
        this.asm.push(`lw ${availableRegister}, ${memoryAddress}($zero)`)
      }
    }
    this.registerDescriptors[result as AsmGenerator["registers"][number]].add(variableId)
    this.addressDescriptors[variableId].add(result)
    return result as AsmGenerator["registers"][number]
  }

  generateStackFrameInfo() {
    /**
     * 实在参数
     * 返回值
     * 控制链
     * 保存的机器状态
     * 局部数据
     */
    const functions = this.context.getFunctions()
    functions.forEach(f => {
      // 实在参数
      const params = f.getParams()
      const actualParameter = params.length * 4
      const returnValue = f.getReturnType() === "int".toUpperCase() ? 4 : 0
      const controlLink = 4
      const machineState = {
        returnAddress: <const>4,
      }
      const l = f.getLocalVariables().length
      const functionVars = f.getLocalVariables().map((value, i) => {
        return {
          param: value,
          memoryAddress: `${(l - 1 - i) * 4}($sp)`
        }
      })
      const localVariables = functionVars.reduce<number>((prev, current) => {
        if (current.param instanceof IRArray) {
          return prev + current.param.getLen() * 4
        }
        else if (current.param instanceof IRVarialble) {
          return prev + 4
        }
        else {
          throw new Error('Error in local variables')
        }
      }, 0)
      const baseOffset =
        localVariables
        + controlLink
        + returnValue
        + machineState.returnAddress
      const paramsCount = f.getParams().length
      const functionParams = f.getParams().map((p, i) => ({
        param: p,
        memoryAddress: `${baseOffset + (paramsCount - i - 1) * 4}$(sp)`
      }))
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

          // 计算出实在参数的地址并放到地址描述符里面
          const actualParameterCount = functionStackFrame.actualParameterList.length
          if (actualParameterCount < 4) {
            for (let j = 0; j < actualParameterCount; j++) {
              this.registerDescriptors[`$a${j as 0 | 1 | 2 | 3}`].add(functionStackFrame.actualParameterList[j].param.id)
              const id = functionStackFrame.actualParameterList[j].param.id
              this.addressDescriptors[id] = new Set()
              this.addressDescriptors[id].add(`$a${j as 0 | 1 | 2 | 3}`)
            }
          }
          else {
            for (let j = 0; j < 4; j++) {
              this.registerDescriptors[`$a${j as 0 | 1 | 2 | 3}`].add(functionStackFrame.actualParameterList[j].param.id)
              this.addressDescriptors[functionStackFrame.actualParameterList[j].param.id].add(`$a${j as 0 | 1 | 2 | 3}`)
            }
            const baseOffset =
              functionStackFrame.localVariables
              + functionStackFrame.controlLink
              + functionStackFrame.returnValue
              + functionStackFrame.machineState.returnAddress
            for (let j = 4; j < actualParameterCount; j++) {
              this.addressDescriptors[functionStackFrame.actualParameterList[j].param.id].add(`${baseOffset + (actualParameterCount - j) * 4}$(sp)`)
            }
          }


          // 计算出局部变量的位置
          for (let i = 0; i < functionStackFrame.localVariablesList.length; i++) {
            this.addressDescriptors[
              functionStackFrame.localVariablesList[i].param.id
            ] = new Set()
            this.addressDescriptors[
              functionStackFrame.localVariablesList[i].param.id
            ].add(`${functionStackFrame.localVariables - 4 * i - 4}($sp)`)
          }
          this.asm.push(`${result}:`)
        }
        else if (result.startsWith('__MiniC_Exit_')) {
          currentFunction = result.slice(13)
          console.log('exit function %s', currentFunction)
          // 移除所有的局部变量和参数
          this.stackFrame[currentFunction].actualParameterList.forEach(
            ({ param }) => {
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
                  if (this.registerDescriptors[r].has(variable.param.id)) {
                    this.registerDescriptors[r].delete(variable.param.id)
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
          let regId = ''
          let memAddr = ''
          for (let v of this.addressDescriptors[result].values()) {
            // 如果变量已经加载入寄存器，直接写寄存器
            if (v.startsWith('$')) {
              regId = v
            }
            else {
              memAddr = v
            }
          }
          if (regId.length) {
            if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
              this.asm.push(`lui ${regId}, ${(constantValues[arg1] >>> 16).toString(16)}`)
              this.asm.push(`ori ${regId}, ${(constantValues[arg1] & 0xffff).toString(16)}`)
            }
            else {
              this.asm.push(`addi ${regId}, $zero, ${constantValues[arg1]}`)
            }
            this.addressDescriptors[result] = new Set([regId])
            this.registerDescriptors[regId as AsmGenerator["registers"][number]].add(result)
          }
          else {
            const targetReg = this.getARegister(result)
            if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
              this.asm.push(`lui ${targetReg}, ${(constantValues[arg1] >>> 16).toString(16)}`)
              this.asm.push(`ori ${targetReg}, ${(constantValues[arg1] & 0xffff).toString(16)}`)
            }
            else {
              this.asm.push(`addi ${targetReg}, $zero, ${constantValues[arg1]}`)
            }
            this.addressDescriptors[result] = new Set([targetReg])
            this.registerDescriptors[targetReg].add(result)
          }
        }
        else {
          // 看变量位置
          let regId = ''
          let memAddr = ''
          for (let v of this.addressDescriptors[arg1].values()) {
            // 如果变量已经加载入寄存器，直接写入
            if (v.startsWith('$')) {
              regId = v
            }
            else {
              memAddr = v
            }
          }
          if (regId.length) {
            this.registerDescriptors[regId as AsmGenerator["registers"][number]].add(result)
            if (!this.addressDescriptors[result]) {
              this.addressDescriptors[result] = new Set()
            }
            this.addressDescriptors[result] = new Set([regId])
          }
          else if (memAddr.length) {
            const targetReg = this.getARegister(result)
            if (memAddr.endsWith('($sp)'))
              this.asm.push(`lw ${targetReg}, ${memAddr}`)
            else
              this.asm.push(`lw ${targetReg}, ${memAddr}($zero)`)

            if (!this.addressDescriptors[result]) {
              this.addressDescriptors[result] = new Set()
            }
            this.addressDescriptors[result].add(targetReg)
          }
        }
      }
      else if (op === 'readArray') {
        const targetReg = this.getARegister(result)
        const offsetReg = this.getARegister(arg2)
        if (constantValues[arg2]) {
          if (constantValues[arg2] > 32767 || constantValues[arg2] < -32768) {
            this.asm.push(`lui ${targetReg}, ${(constantValues[arg2] >>> 16).toString(16)}`)
            this.asm.push(`ori ${targetReg} ${(constantValues[arg2] & 0xffff).toString(16)}`)
          }
          else {
            this.asm.push(`addi ${targetReg}, $zero, ${constantValues[arg2]}`)
          }
        }
        this.asm.push(`lw ${targetReg}, ${arg1}(${offsetReg})`)
      }
      else if (op === 'assignArray') {
        const sourceReg = this.getARegister(arg1)
        const offsetReg = this.getARegister(arg2)
        if (constantValues[arg1]) {
          if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
            this.asm.push(`lui ${sourceReg}, ${(constantValues[arg1] >>> 16).toString(16)}`)
            this.asm.push(`ori ${sourceReg} ${(constantValues[arg1] & 0xffff).toString(16)}`)
          }
          else {
            this.asm.push(`addi ${sourceReg}, $zero, ${constantValues[arg1]}`)
          }
        }
        this.asm.push(`sw ${sourceReg}, ${result}(${offsetReg})`)
      }
      else if (op === 'call') {
        const functionName = arg1
        const argumentList = arg2.split(',')
        console.log('call function %s', functionName)
        console.log(`arguments: ${argumentList}`)

        // 方便起见先写回所有寄存器中的变量
        Object.entries(this.registerDescriptors).forEach(
          entry => {
            let [key, value] = entry
            for (let id of value.values()) {
              // 全局变量
              if (this.globalVariablePool[id]) {
                this.asm.push(`sw ${key}, ${this.globalVariablePool[id]}($zero)`)
                this.addressDescriptors[id] = new Set([this.globalVariablePool[id]])
                this.registerDescriptors[key as AsmGenerator["registers"][number]].clear()
                continue
              }
              // 局部变量

              const localId = this.stackFrame[currentFunction].localVariablesList.find(({ param }) =>
                param.id === id
              )
              if (localId) {
                this.asm.push(`sw ${key}, ${localId.memoryAddress}`)
                this.addressDescriptors[id] = new Set([localId.memoryAddress])
                this.registerDescriptors[key as AsmGenerator["registers"][number]].clear()
                continue
              }
              // 函数形参
              const actualId = this.stackFrame[currentFunction].actualParameterList.find(({ param }) =>
                param.id === id
              )
              if (actualId) {
                this.asm.push(`sw ${key}, ${actualId.memoryAddress}`)
                this.addressDescriptors[id] = new Set([actualId.memoryAddress])
                this.registerDescriptors[key as AsmGenerator["registers"][number]].clear()
                continue
              }

              throw new Error()
            }
          }
        )

        if (argumentList[0] === '' && argumentList.length === 1) {
          // 调整$sp
          this.asm.push(`addiu $sp, $sp, ${-this.getTotalStackFrameSize(functionName)}`)
          this.asm.push(`jal __Minic_Entry_${functionName}`)
          continue
        }

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
            else {
              throw new Error()
            }
          }
          // 如果是常数，直接加载
          if (constantValues[argumentList[index]] !== undefined) {
            if (constantValues[argumentList[index]] > 32767 || constantValues[argumentList[index]] < -32768) {
              this.asm.push(`lui $a${index}, ${(constantValues[argumentList[index]] >>> 16).toString(16)}`)
              this.asm.push(`ori $a${index}, ${(constantValues[argumentList[index]] & 0xffff).toString(16)}`)
            }
            else {
              this.asm.push(`addi $a${index}, $zero, ${constantValues[argumentList[index]]}`)
            }
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
                this.asm.push(`lw $a${index}, ${argumentList[index]}($zero)`)
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
        const sourceReg = this.getARegister(arg1, true)
        if (constantValues[arg1]) {
          if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
            this.asm.push(`lui ${sourceReg}, ${(constantValues[arg1] >>> 16).toString(16)}`)
            this.asm.push(`ori ${sourceReg} ${(constantValues[arg1] & 0xffff).toString(16)}`)
          }
          else {
            this.asm.push(`addi ${sourceReg}, $zero, ${constantValues[arg1]}`)
          }
        }
        this.asm.push(`add $v0, ${sourceReg}, $zero`)
      }
      else if (op === 'returnVoid') {
        // 写回所有的全局变量
        Object.entries(this.addressDescriptors).forEach(
          (entry) => {
            let [key, value] = entry
            if (this.globalVariablePool[key]) {
              if (this.addressDescriptors[key].size === 1) {
                for (let a of this.addressDescriptors[key].values()) {
                  if (a.startsWith('$')) {
                    this.asm.push(`sw ${a}, ${this.globalVariablePool[key]}($zero)`)
                  }
                }
                this.addressDescriptors[key] = new Set([this.globalVariablePool[key]])
              }
            }
          }
        )

        // 恢复栈指针
        this.asm.push(`addiu $sp, $sp, ${this.getTotalStackFrameSize(currentFunction)}`)

        this.asm.push('jr $ra')
      }
      else if (op === 'jFalse') {
        // 看标号位置
        const regId = Object.entries(this.registerDescriptors).find(v => v[1].has(arg1))
        // 如果是常数，直接跳
        if (constantValues[arg1]) {
          if (constantValues[arg1] !== 0)
            this.asm.push(`j ${result}`)
        }
        // 如果已经加载到寄存器
        else if (regId) {
          this.asm.push(`bne ${regId}, $zero, ${result}`)
        }
        // 先加载到内存再跳
        else {
          const targetReg = this.getARegister(arg1)
          for (let v of this.addressDescriptors[arg1].values()) {
            if (v.endsWith(`($sp)`))
              this.asm.push(`lw ${targetReg}, ${v}`)
            else {
              this.asm.push(`lw ${targetReg}, ${v}($zero)`)
            }
          }
          this.asm.push(`bne ${targetReg}, $zero, ${result}`)
        }
      }
      else if (op === 'jTrue') {
        // 看标号位置
        const regId = Object.entries(this.registerDescriptors).find(v => v[1].has(arg1))
        // 如果是常数，直接跳
        if (constantValues[arg1]) {
          if (constantValues[arg1] === 0)
            this.asm.push(`j ${result}`)
        }
        // 如果已经加载到寄存器
        else if (regId) {
          this.asm.push(`beq ${regId}, $zero, ${result}`)
        }
        // 先加载到内存再跳
        else {
          const targetReg = this.getARegister(arg1)
          for (let v of this.addressDescriptors[arg1].values()) {
            if (v.endsWith(`($sp)`))
              this.asm.push(`lw ${targetReg}, ${v}`)
            else {
              this.asm.push(`lw ${targetReg}, ${v}($zero)`)
            }
          }
          this.asm.push(`beq ${targetReg}, $zero, ${result}`)
        }
      }
      else if (op === 'j') {
        this.asm.push(`j ${result}`)
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
            else if (arg2 === '') {
              const arg1Reg = this.getARegister(arg1, true)
              this.registerDescriptors[arg1Reg].add(result)
            }
            else {
              if (constantValues[arg1] && !constantValues[arg2]) {
                const targetReg = this.getARegister(result)
                const rightReg = this.getARegister(arg2, true)
                if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
                  this.asm.push(`lui ${targetReg}, ${(constantValues[arg1] >>> 16).toString(16)}`)
                  this.asm.push(`ori ${targetReg} ${(constantValues[arg1] & 0xffff).toString(16)}`)
                }
                else {
                  this.asm.push(`addi ${targetReg}, $zero, ${constantValues[arg1]}`)
                }
                this.asm.push(`add ${targetReg}, ${targetReg}, ${rightReg}`)
                this.addressDescriptors[result] = new Set([targetReg])
              }
              else if (!constantValues[arg1] && constantValues[arg2]) {
                // TODO: arg2大于16位
                const leftReg = this.getARegister(arg1, true)
                const targetReg = this.getARegister(result)
                this.asm.push(`addi ${targetReg}, ${leftReg}, ${constantValues[arg2]}`)
                this.addressDescriptors[result] = new Set([targetReg])
                this.registerDescriptors[targetReg].add(result)
              }
              else {
                const rs = this.getARegister(arg1, true)
                const rt = this.getARegister(arg2, true)
                const rd = this.getARegister(result, true)
                this.asm.push(`add ${rd}, ${rs}, ${rt}`)
                this.addressDescriptors[result] = new Set([rd])
              }
            }
            break
          case '-':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] - constantValues[arg2])
            }
            else if (constantValues[arg1] && arg2 === '') {
              constantValues[result] = -constantValues[arg1]
            }
            else if (arg2 === '') {
              const arg1Reg = this.getARegister(arg1, true)
              this.registerDescriptors[arg1Reg].add(result)
            }
            else {
              if (constantValues[arg1] && !constantValues[arg2]) {
                const targetReg = this.getARegister(result)
                const rightReg = this.getARegister(arg2, true)
                if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
                  this.asm.push(`lui ${targetReg}, ${(constantValues[arg1] >>> 16).toString(16)}`)
                  this.asm.push(`ori ${targetReg} ${(constantValues[arg1] & 0xffff).toString(16)}`)
                }
                else {
                  this.asm.push(`addi ${targetReg}, $zero, ${constantValues[arg1]}`)
                }
                this.asm.push(`sub ${targetReg}, ${targetReg}, ${rightReg}`)
                this.addressDescriptors[result] = new Set([targetReg])
              }
              else if (!constantValues[arg1] && constantValues[arg2]) {
                // TODO: arg2大于16位
                const leftReg = this.getARegister(arg1, true)
                const targetReg = this.getARegister(result)
                this.asm.push(`subi ${targetReg}, ${leftReg}, ${constantValues[arg2]}`)
                this.addressDescriptors[result] = new Set([targetReg])
                this.registerDescriptors[targetReg].add(result)
              }
              else {
                const rs = this.getARegister(arg1, true)
                const rt = this.getARegister(arg2, true)
                const rd = this.getARegister(result, true)
                this.asm.push(`sub ${rd}, ${rs}, ${rt}`)
                this.addressDescriptors[result] = new Set([rd])
              }
            }
            break
          case '|':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] | constantValues[arg2])
            }
            else {
              if (constantValues[arg1] && !constantValues[arg2]) {
                const targetReg = this.getARegister(result)
                const rightReg = this.getARegister(arg2, true)
                if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
                  this.asm.push(`lui ${targetReg}, ${(constantValues[arg1] >>> 16).toString(16)}`)
                  this.asm.push(`ori ${targetReg} ${(constantValues[arg1] & 0xffff).toString(16)}`)
                }
                else {
                  this.asm.push(`addi ${targetReg}, $zero, ${constantValues[arg1]}`)
                }
                this.asm.push(`or ${targetReg}, ${targetReg}, ${rightReg}`)
                this.addressDescriptors[result] = new Set([targetReg])
              }
              else if (!constantValues[arg1] && constantValues[arg2]) {
                // TODO: arg2大于16位
                const leftReg = this.getARegister(arg1, true)
                const targetReg = this.getARegister(result)
                this.asm.push(`ori ${targetReg}, ${leftReg}, ${constantValues[arg2]}`)
                this.addressDescriptors[result] = new Set([targetReg])
                this.registerDescriptors[targetReg].add(result)
              }
              else {
                const rs = this.getARegister(arg1, true)
                const rt = this.getARegister(arg2, true)
                const rd = this.getARegister(result, true)
                this.asm.push(`or ${rd}, ${rs}, ${rt}`)
                this.addressDescriptors[result] = new Set([rd])
              }
            }
            break
          case '&':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] & constantValues[arg2])
            }
            else {
              if (constantValues[arg1] && !constantValues[arg2]) {
                const targetReg = this.getARegister(result)
                const rightReg = this.getARegister(arg2, true)
                if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
                  this.asm.push(`lui ${targetReg}, ${(constantValues[arg1] >>> 16).toString(16)}`)
                  this.asm.push(`ori ${targetReg} ${(constantValues[arg1] & 0xffff).toString(16)}`)
                }
                else {
                  this.asm.push(`addi ${targetReg}, $zero, ${constantValues[arg1]}`)
                }
                this.asm.push(`and ${targetReg}, ${targetReg}, ${rightReg}`)
                this.addressDescriptors[result] = new Set([targetReg])
              }
              else if (!constantValues[arg1] && constantValues[arg2]) {
                // TODO: arg2大于16位
                const leftReg = this.getARegister(arg1, true)
                const targetReg = this.getARegister(result)
                this.asm.push(`andi ${targetReg}, ${leftReg}, ${constantValues[arg2]}`)
                this.addressDescriptors[result] = new Set([targetReg])
                this.registerDescriptors[targetReg].add(result)
              }
              else {
                const rs = this.getARegister(arg1, true)
                const rt = this.getARegister(arg2, true)
                const rd = this.getARegister(result, true)
                this.asm.push(`and ${rd}, ${rs}, ${rt}`)
                this.addressDescriptors[result] = new Set([rd])
              }
            }
            break
          case '^':
            if (constantValues[arg1] && constantValues[arg2]) {
              constantValues[result] = +(constantValues[arg1] ^ constantValues[arg2])
            }
            else {
              if (constantValues[arg1] && !constantValues[arg2]) {
                const targetReg = this.getARegister(result)
                const rightReg = this.getARegister(arg2, true)
                if (constantValues[arg1] > 32767 || constantValues[arg1] < -32768) {
                  this.asm.push(`lui ${targetReg}, ${(constantValues[arg1] >>> 16).toString(16)}`)
                  this.asm.push(`ori ${targetReg} ${(constantValues[arg1] & 0xffff).toString(16)}`)
                }
                else {
                  this.asm.push(`addi ${targetReg}, $zero, ${constantValues[arg1]}`)
                }
                this.asm.push(`xor ${targetReg}, ${targetReg}, ${rightReg}`)
                this.addressDescriptors[result] = new Set([targetReg])
              }
              else if (!constantValues[arg1] && constantValues[arg2]) {
                // TODO: arg2大于16位
                const leftReg = this.getARegister(arg1, true)
                const targetReg = this.getARegister(result)
                this.asm.push(`xori ${targetReg}, ${leftReg}, ${constantValues[arg2]}`)
                this.addressDescriptors[result] = new Set([targetReg])
                this.registerDescriptors[targetReg].add(result)
              }
              else {
                const rs = this.getARegister(arg1, true)
                const rt = this.getARegister(arg2, true)
                const rd = this.getARegister(result, true)
                this.asm.push(`xori ${rd}, ${rs}, ${rt}`)
                this.addressDescriptors[result] = new Set([rd])
              }
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
            // TODO
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