import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";
import ASTNode from "../../entities/ASTNode";
import { IRArray } from "./IRArray";
import { IRFunction } from "./IRFunction";
import { IRVarialble, MiniCType } from "./IRVariable";
import { Quadruple } from "./Quadruple";

export const GlobalScope = [0]
export const LabelId  = '__label__'
type JumpContext = {
  trueLabel: string,
  falseLabel: string
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

  constructor() {
    this.functions = []
    this.variables = []
    this.quadruples = []
    this.scopeStack = [0]
    this.scopeId = []
    this.scopeCount = 1
    this.variableCount = 0
    this.jumpContextStack = []
    this.jumpLabelCount = 0
  }

  debugInfo() {
    console.log(this.functions)
    console.log(this.variables)
    console.log(this.quadruples)
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
    return `__MiniC_Variable_${this.variableCount++}`
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
      const len = node.child[3].attributes as number
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
    this.functionContextInfo =  {
      entryLabel: entryLabel,
      exitLabel: exitLabel,
      functionName: id
    }

    this.functions.push(new IRFunction(id, returnType, entryLabel, exitLabel))
    this.parseParams(node.child[3], id)
    if (node.child[5].label === ';') {
      return
    }
    this.scopeStack.push(this.scopeCount++)
    this.quadruples.push(new Quadruple('setLabel', '', '', entryLabel))
    this.parseCompoundStmt(node.child[5])
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
      this.parseParam(node.child[1], functionName)
    }
    else {
      this.parseParam(node.child[0], functionName)
    }
  }

  parseParam(node: ASTNode, functionName: string) {
    const type = this.parseTypeSpec(node.child[0]) as MiniCType
    const id = node.child[1].label
    const variable = new IRVarialble(this.newVariableId(), id, type, this.scopeStack)
    this.functions.find(v => v.name === functionName)?.getParams().push(variable)
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
    switch(node.child[1].label) {
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
    
    const loopLabel = `${this.jumpLabelCount}_loop`
    const breakLabel = `${this.jumpLabelCount}_break`
    this.jumpContextStack.push({trueLabel: loopLabel, falseLabel: breakLabel})
    const expr = this.parseExpr(node.child[2], true)
    this.loopContext.push({ loopLabel, breakLabel })
    if (expr !== '')
      this.quadruples.push(new Quadruple('jFalse', expr, '', breakLabel))
    this.quadruples.push(new Quadruple('setLabel', '', '', loopLabel))
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

  parseCompoundStmt(node: ASTNode) {
    this.parseLocalDecls(node.child[1])
    this.parseStmtList(node.child[2])
  }

  parseLocalDecls(node: ASTNode) {
    if (node.child.length === 0)
      return
    if (node.child[0].label === 'local_decls') {
      this.parseLocalDecls(node.child[0])
      this.parseLocalDecl(node.child[1])
    }
    else {
      this.parseLocalDecl(node.child[0])
    }
  }

  parseLocalDecl(node: ASTNode) {
    const type = this.parseTypeSpec(node.child[0]) as MiniCType
    const id = node.child[1].attributes as string
    if (this.variables.some(v => v.name === id && v.scope.length === this.scopeStack.length && v.scope.every((v, i) => v === this.scopeStack[i])))
      throw new Error('重复定义的变量')
    this.variables.push(new IRVarialble(this.newVariableId(), id, type, [...this.scopeStack]))
  }

  parseIfStmt(node: ASTNode) {
    const trueLabel = `${this.jumpLabelCount}_true`
    const falseLabel = `${this.jumpLabelCount}_false`
    this.jumpLabelCount++
    this.jumpContextStack.push({ trueLabel, falseLabel })
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

  parseReturnStmt(node:  ASTNode) {
    console.log(this.functionContextInfo)
    this.functions.find(v => v.name === this.functionContextInfo?.functionName)
    if (node.child.length === 2) {
      this.quadruples.push(new Quadruple('returnVoid', '', '', this.functionContextInfo!.exitLabel))
    }
    else {
      const expr = this.parseExpr(node.child[2])
      this.quadruples.push(new Quadruple('returnExpr', expr, '', this.functionContextInfo!.exitLabel))
    }
  }

  parseExpr(node: ASTNode, inJumpContext=false) {
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
          this.quadruples.push(new Quadruple('readArray', arrayBase.getId(), index, result))
          return result
        }
        else if (node.child[1].label === '(') {
          // TODO
        }
        else if (node.child[1].label === '[') {
          const result = this.parseExpr(node.child[2])
          const target = this.newVariableId()
          this.quadruples.push(new Quadruple('[]', this.getVariableByName(node.child[0].attributes).id, result, target))
        }
      }
    }

    if (inJumpContext) {
      const { trueLabel, falseLabel } = this.jumpContextStack[this.jumpContextStack.length - 1]
      if (node.child.length === 3 && node.child[1].label === 'OR') {
        const blockJumpLabel = `${this.jumpLabelCount}_false`
        this.jumpLabelCount++
        this.jumpContextStack.push({trueLabel: trueLabel, falseLabel: blockJumpLabel})
        const left = this.parseExpr(node.child[0], true) as string
        if (left !== '')
          this.quadruples.push(new Quadruple('jTrue', left, '', trueLabel))
        this.jumpContextStack.pop()
        this.quadruples.push(new Quadruple('setLabel', '', '', blockJumpLabel))
        const right = this.parseExpr(node.child[2], true) as string
        if (right !== '')
          this.quadruples.push(new Quadruple('jTrue', right, '', trueLabel))
        this.quadruples.push(new Quadruple('j', '', '', falseLabel))
        return ''
      }
      else if (node.child.length === 3 && node.child[1].label === 'AND') {
        const blockJumpLabel = `${this.jumpLabelCount}_false`
        this.jumpLabelCount++
        this.jumpContextStack.push({trueLabel: blockJumpLabel, falseLabel: falseLabel})
        const left = this.parseExpr(node.child[0], true) as string
        if (left !== '')
          this.quadruples.push(new Quadruple('jFalse', left, '', falseLabel))
        this.jumpContextStack.pop()
        this.quadruples.push(new Quadruple('setLabel', '', '', blockJumpLabel))
        const right = this.parseExpr(node.child[2], true)
        if (right !== '')
          this.quadruples.push(new Quadruple('jFalse', right, '', falseLabel))
        this.quadruples.push(new Quadruple('j', '', '', trueLabel))
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