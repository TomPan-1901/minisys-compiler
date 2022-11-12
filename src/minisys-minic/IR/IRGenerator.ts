import { collapseTextChangeRangesAcrossMultipleVersions } from "typescript";
import ASTNode from "../../entities/ASTNode";
import { IRArray } from "./IRArray";
import { IRFunction } from "./IRFunction";
import { IRVarialble, MiniCType } from "./IRVariable";
import { Quadruple } from "./Quadruple";

export const GlobalScope = [0]
export const LabelId  = '__label__'

export class IRGenerator {
  private functions: IRFunction[]
  private variables: (IRVarialble | IRArray)[]
  private quadruples: Quadruple[]
  private scopeStack: number[]
  private scopeId: number[]
  private scopeCount: number
  private variableCount: number

  constructor() {
    this.functions = []
    this.variables = []
    this.quadruples = []
    this.scopeStack = [0]
    this.scopeId = []
    this.scopeCount = 1
    this.variableCount = 0
  }

  debugInfo() {
    console.log(this.functions)
    console.log(this.variables)
    console.log(this.quadruples)
  }

  getVariableByName(vName: string): IRVarialble {
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
        break
      case 'expr':
        break
      case '(':
        break
    }
  }

  parseWhileStmt(node: ASTNode) {

  }

  parseWhileIdent(node: ASTNode) {

  }

  parseBlockStmt(node: ASTNode) {

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

  }

  parseReturnStmt(node:  ASTNode) {

  }

  parseExpr(node: ASTNode) {
    // 整数字面量
    if (node.child[0].label === 'int_literal') {
      const resultVariable = this.newVariableId()
      this.quadruples.push(new Quadruple('assignConst', this.parseIntLiteral(node.child[0]).toString(), '', resultVariable))
      return resultVariable
    }

    // 括号表达式
    if (node.child[0].label === '(') {
      const result = this.parseExpr(node.child[1])
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
    }
    // 二元运算
    throw new Error()
  }

  parseIntLiteral(node: ASTNode) {
    return node.child[0].attributes as number
  }

  parseArgList(node: ASTNode) {

  }

  parseArgs(node: ASTNode) {

  }

  parseContinueStmt(node: ASTNode) {

  }

  parseBreakStmt(node: ASTNode) {

  }
}