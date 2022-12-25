/* eslint-disable @typescript-eslint/no-non-null-assertion */
import ASTNode from "../../entities/ASTNode";
import { IRArray } from "./IRArray";
import { IRFunction } from "./IRFunction";
import { IRVarialble, MiniCType } from "./IRVariable";
import { Quadruple } from "./Quadruple";

export const GlobalScope = [0]
export const LabelId = '__label__'
type JumpContext = {
  trueLabel: string,
  falseLabel: string,
  used: boolean
}

type BasicBlock = {
  id: number,
  content: Quadruple[]
}

export class IRGenerator {
  private functions: IRFunction[]
  private variables: (IRVarialble | IRArray)[]
  private quadruples: Quadruple[]
  private scopeStack: number[]
  private jumpContextStack: JumpContext[]
  private scopeId: number[]
  private scopeCount: number
  private variableCount: number
  private jumpLabelCount: number
  private functionContextInfo?: {
    entryLabel: string,
    exitLabel: string,
    functionName: string
  }
  private loopContext: {
    loopLabel: string,
    breakLabel: string
  }[] = []
  private basicBlock: BasicBlock[]
  private hashPrefix: string

  constructor(hashPrefix: string) {
    this.hashPrefix = hashPrefix
    this.functions = []
    this.variables = []
    this.quadruples = []
    this.scopeStack = [0]
    this.scopeId = []
    this.basicBlock = []
    this.scopeCount = 1
    this.variableCount = 0
    this.jumpContextStack = []
    this.jumpLabelCount = 0
  }

  public static getMergedContext(...generators: IRGenerator[]): IRGenerator {
    let result = new IRGenerator('')
    let functionRecords: Record<string, IRFunction> = {}
    generators.map(v => v.functions).flat().forEach(
      f => {
        functionRecords[f.name] = f
      }
    )
    result.functions = Object.keys(functionRecords).map(v => functionRecords[v])
    result.variables = generators.map(v => v.variables).flat()
    result.quadruples = generators.map(v => v.quadruples).flat()
    return result
  }

  public getFunctions(): IRFunction[] {
    return this.functions
  }

  public getVariables(): (IRVarialble | IRArray)[] {
    return this.variables
  }

  public getBasicBlocks(): readonly BasicBlock[] {
    return this.basicBlock
  }

  public getQuadruples(): readonly Quadruple[] {
    return this.quadruples
  }

  divideBasicBlocks() {
    let startCommand = []
    let jNext = false
    for (let i = 0; i < this.quadruples.length; i++) {
      if (jNext) {
        startCommand.push(i)
        jNext = false
      }
      if (i === 0) {
        startCommand.push(i)
        continue
      }
      if (this.quadruples[i].getOp() === 'setLabel' && this.quadruples[i].getResult().startsWith('__MiniC_Entry_')) {
        startCommand.push(i)
        continue
      }
      const op = this.quadruples[i].getOp()
      if (op === 'j' || op === 'jFalse' || op === 'jTrue') {
        startCommand.push(this.quadruples.findIndex(v => v.op === 'setLabel' && v.result === this.quadruples[i].result))
        jNext = true
        continue
      }
      if (op === 'call') {
        jNext = true
        continue
      }
      if (op === 'returnVoid' || op === 'returnExpr') { // 紧跟在一个条件或无条件转移指令之后的目标指令是一个首指令
        jNext = true
        continue
      }
    }
    startCommand = [...new Set(startCommand)].sort((a, b) => a - b)
    for (let i = 0; i < startCommand.length; i++) {
      let temp: Quadruple[] = []
      for (let j = startCommand[i]; j < (startCommand[i + 1] || this.quadruples.length); j++) {
        temp.push(this.quadruples[j])
      }
      this.basicBlock.push({ id: i, content: temp })
    }
  }

  debugInfo() {
    console.log(this.functions)
    console.log(this.variables)
    console.log('Basic Blocks:')
    this.basicBlock.forEach(b => {
      b.content.forEach(v => console.log(v.generateString()))
      console.log('\n')
    })
    console.log(this.quadruples.map(v => v.generateString()).join('\n'))
  }

  getVariableByName(vName: string): IRVarialble | IRArray {
    const currentScope = [...this.scopeStack]
    let scopes: number[][] = []
    while (currentScope.length) {
      scopes.push([...currentScope])
      currentScope.pop()
    }
    for (let scope of scopes) {
      for (let v of this.variables) {
        if (v.name === vName && scope.length === v.scope.length && scope.every((s, i) => s === v.scope[i]))
          return v
      }
    }
    throw new Error(`未找到变量${vName}`)
  }

  newVariableId(): string {
    return `__MiniC_Variable_${this.hashPrefix}_${this.variableCount++}`
  }

  public start(node: ASTNode) {
    this.parseProgram(node)
  }

  parseProgram(node: ASTNode) {
    this.parseDeclList(node.child[0])
  }

  parseDeclList(node: ASTNode) {
    if (node.child[0].label === 'decl_list') {
      this.parseDeclList(node.child[0])
      this.parseDecl(node.child[1])
    }
    else {
      this.parseDecl(node.child[0])
    }
  }

  parseDecl(node: ASTNode) {
    console.log(node.child[0].label)
    if (node.child[0].label === 'var_decl') {
      this.parseVarDecl(node.child[0])
    }
    else {
      this.parseFunDecl(node.child[0])
    }
  }

  parseVarDecl(node: ASTNode) {
    // TODO
    const type = this.parseTypeSpec(node.child[0]) as MiniCType
    const id = node.child[1].attributes
    console.log(`全局变量${type} ${id}`)
    if (node.child[2].label === ';') { //变量
      if (type === 'void') {
        throw new Error('变量类型不能为void')
      }
      if (this.variables.some(v => v.name === id && v.scope.length === 1 && v.scope.every((v, i) => v === GlobalScope[i])))
        throw new Error('重复定义的变量')
      this.variables.push(new IRVarialble(this.newVariableId(), id, type, [...GlobalScope]))
    }
    else { //数组
      const len = this.parseIntLiteral(node.child[3]) as number
      if (this.variables.some(v => v.name === id && v.scope.length === 1 && v.scope.every((v, i) => v === GlobalScope[i])))
        throw new Error('重复定义的变量')
      this.variables.push(new IRArray(this.newVariableId(), type, id, len, [...GlobalScope]))
    }
  }

  parseTypeSpec(node: ASTNode) {
    return node.child[0].label
  }

  parseFunDecl(node: ASTNode) {
    // TODO
    const id = this.parseFunctionIdent(node.child[1])
    const returnType = this.parseTypeSpec(node.child[0]) as MiniCType
    console.log(`函数${returnType} ${id}`)

    if (this.variables.some(v => v.name === id && v.scope.length === 1 && v.scope.every((v, i) => v === GlobalScope[i])))
      throw new Error(`重复定义的函数`)

    const entryLabel = `__MiniC_Entry_${id}`
    const exitLabel = `__MiniC_Exit_${id}`
    this.functionContextInfo = {
      entryLabel: entryLabel,
      exitLabel: exitLabel,
      functionName: id
    }

    const functionContext = new IRFunction(id, returnType, entryLabel, exitLabel, node.child[5].label === ';')
    const existedContext = this.functions.find(v => v.name === functionContext.name)
    if (existedContext !== undefined) {
      existedContext.symbol = (node.child[5].label === ';')
    }
    else {
      this.functions.push(functionContext)
    }
    this.parseParams(node.child[3], id)
    if (node.child[5].label === ';') {
      return
    }
    if (existedContext !== undefined) {
      existedContext.symbol = false
    }
    else {
      functionContext.symbol = false
    }
    this.scopeStack.push(this.scopeCount++)
    this.quadruples.push(new Quadruple('setLabel', '', '', entryLabel))
    this.parseCompoundStmt(node.child[5], functionContext)
    this.quadruples.push(new Quadruple('setLabel', '', '', exitLabel))

    this.scopeStack.pop()
    return
  }

  parseFunctionIdent(node: ASTNode) {
    return node.child[0].attributes as string
  }

  parseParams(node: ASTNode, functionName: string) {
    // 参数为空的情况下不用解析
    if (node.child[0].label !== 'VOID') {
      this.parseParamList(node.child[0], functionName)
    }
  }

  parseParamList(node: ASTNode, functionName: string) {
    // TODO
    if (node.child[0].label === 'param_list') {
      this.parseParamList(node.child[0], functionName)
      this.parseParam(node.child[2], functionName)
    }
    else {
      this.parseParam(node.child[0], functionName)
    }
  }

  parseParam(node: ASTNode, functionName: string) {
    const type = this.parseTypeSpec(node.child[0]) as MiniCType
    const id = node.child[1].attributes
    const variable = new IRVarialble(this.newVariableId(), id, type, this.scopeStack)
    this.variables.push(variable)
    this.functions.find(v => v.name === functionName)!.getParams().push(variable)
  }

  parseStmtList(node: ASTNode) {
    if (node.child.length === 0) {
      return
    }
    if (node.child[0].label === 'stmt_list') {
      this.parseStmtList(node.child[0])
      this.parseStmt(node.child[1])
    }
    else {
      this.parseStmt(node.child[0])
    }
  }

  parseStmt(node: ASTNode) {
    switch (node.child[0].label) {
      case 'expr_stmt':
        this.parseExprStmt(node.child[0])
        break
      case 'block_stmt':
        this.parseBlockStmt(node.child[0])
        break
      case 'if_stmt':
        this.parseIfStmt(node.child[0])
        break
      case 'while_stmt':
        this.parseWhileStmt(node.child[0])
        break
      case 'return_stmt':
        this.parseReturnStmt(node.child[0])
        break
      case 'continue_stmt':
        this.parseContinueStmt(node.child[0])
        break
      case 'break_stmt':
        this.parseBreakStmt(node.child[0])
    }
  }

  parseExprStmt(node: ASTNode) {
    switch (node.child[1].label) {
      case '=':
        const left = this.getVariableByName(node.child[0].attributes)
        const right = this.parseExpr(node.child[2])
        this.quadruples.push(new Quadruple('assign', right, '', left.id))
        break
      case '[':
        const index = this.parseExpr(node.child[2])
        const arrayVar = this.getVariableByName(node.child[0].attributes)
        const rightResult = this.parseExpr(node.child[5])
        this.quadruples.push(new Quadruple('assignArray', index, rightResult, arrayVar.id))
        break
      case 'expr':
        const address = this.parseExpr(node.child[1])
        const result = this.parseExpr(node.child[3])
        this.quadruples.push(new Quadruple('assignMem', result, '', address))
        break
      case '(':
        const functionName = node.child[0].attributes
        const args = this.parseArgs(node.child[2])
        const target = this.newVariableId()
        this.quadruples.push(new Quadruple('call', functionName, args.join(','), target))
        break
    }
  }

  parseWhileStmt(node: ASTNode) {

    const loopLabel = `loop_${this.hashPrefix}_${this.jumpLabelCount}`
    const breakLabel = `break_${this.hashPrefix}_${this.jumpLabelCount}`
    this.jumpLabelCount++
    this.jumpContextStack.push({ trueLabel: loopLabel, falseLabel: breakLabel, used: false })
    const expr = this.parseExpr(node.child[2], true)
    this.loopContext.push({ loopLabel, breakLabel })
    this.quadruples.push(new Quadruple('setLabel', '', '', loopLabel))
    if (expr !== '')
      this.quadruples.push(new Quadruple('jFalse', expr, '', breakLabel))
    this.parseStmt(node.child[4])
    this.quadruples.push(new Quadruple('j', '', '', loopLabel))
    this.quadruples.push(new Quadruple('setLabel', '', '', breakLabel))
    this.loopContext.pop()
  }

  parseWhileIdent(_node: ASTNode) {
    return
  }

  parseBlockStmt(node: ASTNode) {
    this.parseStmtList(node.child[1])
  }

  parseCompoundStmt(node: ASTNode, functionContext: IRFunction) {
    this.parseLocalDecls(node.child[1], functionContext)
    this.parseStmtList(node.child[2])
  }

  parseLocalDecls(node: ASTNode, functionContext: IRFunction) {
    if (node.child.length === 0)
      return
    if (node.child[0].label === 'local_decls') {
      this.parseLocalDecls(node.child[0], functionContext)
      this.parseLocalDecl(node.child[1], functionContext)
    }
    else {
      this.parseLocalDecl(node.child[0], functionContext)
    }
  }

  parseLocalDecl(node: ASTNode, functionContext: IRFunction) {
    const type = this.parseTypeSpec(node.child[0]) as MiniCType
    const id = node.child[1].attributes as string
    if (this.variables.some(v => v.name === id && v.scope.length === this.scopeStack.length && v.scope.every((v, i) => v === this.scopeStack[i])))
      throw new Error('重复定义的变量')
    const localVariable = new IRVarialble(this.newVariableId(), id, type, [...this.scopeStack])
    functionContext.getLocalVariables().push(localVariable)
    this.variables.push(localVariable)
  }

  parseIfStmt(node: ASTNode) {
    const trueLabel = `${this.hashPrefix}_true_${this.jumpLabelCount}`
    const falseLabel = `${this.hashPrefix}_false_${this.jumpLabelCount}`
    this.jumpLabelCount++
    this.jumpContextStack.push({ trueLabel, falseLabel, used: false })
    const expr = this.parseExpr(node.child[2], true)
    if (expr !== '')
      this.quadruples.push(new Quadruple('jFalse', expr, '', falseLabel))
    this.quadruples.push(new Quadruple('setLabel', '', '', trueLabel))
    this.parseStmt(node.child[4])
    this.quadruples.push(new Quadruple('setLabel', '', '', falseLabel))
    if (node.child.length === 7) {
      this.parseStmt(node.child[6])
    }
    this.jumpContextStack.pop()
  }

  parseReturnStmt(node: ASTNode) {
    console.log(this.functionContextInfo)
    this.functions.find(v => v.name === this.functionContextInfo?.functionName)
    if (node.child.length === 2) {
      this.quadruples.push(new Quadruple('returnVoid', '', '', this.functionContextInfo!.exitLabel))
    }
    else {
      const expr = this.parseExpr(node.child[1])
      this.quadruples.push(new Quadruple('returnExpr', expr, '', this.functionContextInfo!.exitLabel))
    }
  }

  parseExpr(node: ASTNode, inJumpContext = false) {
    // 整数字面量
    if (node.child[0].label === 'int_literal') {
      const resultVariable = this.newVariableId()
      this.quadruples.push(new Quadruple('assignConst', this.parseIntLiteral(node.child[0]).toString(), '', resultVariable))
      return resultVariable
    }

    // 括号表达式
    if (node.child[0].label === '(') {
      const result = this.parseExpr(node.child[1], inJumpContext)
      if (inJumpContext)
        return ''
      const target = this.newVariableId()
      this.quadruples.push(new Quadruple('assign', result, '', target))
      return target
    }

    // 其他变量赋值
    if (node.child[0].label === 'IDENT') {
      if (node.child.length === 1) {
        const target = this.getVariableByName(node.child[0].attributes)
        return target.id
      }
      else {
        if (node.child[1].label === '[') {
          const arrayBase = this.getVariableByName(node.child[0].attributes) as IRArray
          const index = this.parseExpr(node.child[2])
          const result = this.newVariableId()
          this.quadruples.push(new Quadruple('readArray', arrayBase.id, index, result))
          return result
        }
        else if (node.child[1].label === '(') {
          const functionName = node.child[0].attributes
          const args = this.parseArgs(node.child[2])
          const target = this.newVariableId()
          this.quadruples.push(new Quadruple('call', functionName, args.join(','), target))
          return target
        }
      }
    }

    if (inJumpContext) {
      const { trueLabel, falseLabel } = this.jumpContextStack[this.jumpContextStack.length - 1]
      if (node.child.length === 3 && node.child[1].label === 'OR') {
        const blockJumpLabel = `${this.hashPrefix}_false_${this.jumpLabelCount}`
        this.jumpLabelCount++
        this.jumpContextStack.push({ trueLabel: trueLabel, falseLabel: blockJumpLabel, used: false })
        const left = this.parseExpr(node.child[0], true) as string
        if (left !== '') {
          this.quadruples.push(new Quadruple('jTrue', left, '', trueLabel))
          this.jumpContextStack[this.jumpContextStack.length - 2].used = true
        }
        if (this.jumpContextStack[this.jumpContextStack.length - 1].used)
          this.quadruples.push(new Quadruple('setLabel', '', '', blockJumpLabel))
        this.jumpContextStack.pop()
        const right = this.parseExpr(node.child[2], true) as string
        if (right !== '') {
          this.quadruples.push(new Quadruple('jTrue', right, '', trueLabel))
          this.jumpContextStack[this.jumpContextStack.length - 1].used = true
        }
        this.quadruples.push(new Quadruple('j', '', '', falseLabel))
        this.jumpContextStack[this.jumpContextStack.length - 1].used = true
        return ''
      }
      else if (node.child.length === 3 && node.child[1].label === 'AND') {
        const blockJumpLabel = `${this.hashPrefix}_false_${this.jumpLabelCount}`
        this.jumpLabelCount++
        this.jumpContextStack.push({ trueLabel: blockJumpLabel, falseLabel: falseLabel, used: false })
        const left = this.parseExpr(node.child[0], true) as string
        if (left !== '') {
          this.jumpContextStack[this.jumpContextStack.length - 2].used = true
          this.quadruples.push(new Quadruple('jFalse', left, '', falseLabel))
        }
        if (this.jumpContextStack[this.jumpContextStack.length - 1].used)
          this.quadruples.push(new Quadruple('setLabel', '', '', blockJumpLabel))
        this.jumpContextStack.pop()
        const right = this.parseExpr(node.child[2], true)
        if (right !== '') {
          this.jumpContextStack[this.jumpContextStack.length - 1].used = true
          this.quadruples.push(new Quadruple('jFalse', right, '', falseLabel))
        }
        this.quadruples.push(new Quadruple('j', '', '', trueLabel))
        this.jumpContextStack[this.jumpContextStack.length - 1].used = true
        return ''
      }
    }
    // 一元运算
    if (node.child.length === 2) {
      const result = this.parseExpr(node.child[1])
      const target = this.newVariableId()
      this.quadruples.push(new Quadruple(node.child[0].label, result, '', target))
      return target
    }

    if (node.child.length === 3) {
      const left = this.parseExpr(node.child[0])
      const right = this.parseExpr(node.child[2])
      const target = this.newVariableId()
      this.quadruples.push(new Quadruple(node.child[1].label, left, right, target))
      return target
    }
    // 二元运算
    throw new Error()
  }

  parseIntLiteral(node: ASTNode) {
    return node.child[0].attributes as number
  }

  parseArgList(node: ASTNode): string[] {
    if (node.child[0].label === 'expr') {
      return [this.parseExpr(node.child[0])]
    }
    else {
      return [...this.parseArgList(node.child[0]), this.parseExpr(node.child[2])]
    }
  }

  parseArgs(node: ASTNode) {
    if (node.child.length > 0)
      return this.parseArgList(node.child[0])
    else {
      return []
    }
  }

  parseContinueStmt(_node: ASTNode) {
    if (this.loopContext.length === 0) {
      throw new Error('非法的continue')
    }
    const { loopLabel } = this.loopContext[this.loopContext.length - 1]
    this.quadruples.push(new Quadruple('j', '', '', loopLabel))
  }

  parseBreakStmt(_node: ASTNode) {
    if (this.loopContext.length === 0) {
      throw new Error('非法的break')
    }
    const { breakLabel } = this.loopContext[this.loopContext.length - 1]
    this.quadruples.push(new Quadruple('j', '', '', breakLabel))

  }
}