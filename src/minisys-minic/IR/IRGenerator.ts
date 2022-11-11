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

  constructor() {
    this.functions = []
    this.variables = []
    this.quadruples = []
    this.scopeStack = []
    this.scopeId = []
  }

  debugInfo() {
    console.log(this.functions)
    console.log(this.variables)
    console.log(this.quadruples)
  }

  newVariableId(): string {
    return `__MiniC_Variable_${this.variables.length}`
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
    this.quadruples.push(new Quadruple('setLabel', '', '', entryLabel))
    this.parseParams(node.child[3], id)
    this.quadruples.push(new Quadruple('setLabel', '', '', exitLabel))
    this.scopeStack.push(this.scopeStack.length)

    this.scopeStack.pop()
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

  }

  parseWhileStmt(node: ASTNode) {

  }

  parseWhileIdent(node: ASTNode) {

  }

  parseBlockStmt(node: ASTNode) {

  }

  parseCompoundStmt(node: ASTNode) {

  }

  parseLocalDecls(node: ASTNode) {

  }

  parseLocalDecl(node: ASTNode) {

  }

  parseIfStmt(node: ASTNode) {

  }

  parseReturnStmt(node:  ASTNode) {

  }

  parseExpr(node: ASTNode) {

  }

  parseIntLiteral(node: ASTNode) {

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