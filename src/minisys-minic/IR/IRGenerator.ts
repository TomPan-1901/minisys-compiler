import { AssertsThisTypePredicate } from "typescript";
import ASTNode from "../../entities/ASTNode";
import { IRArray } from "./IRArray";
import { IRFunction } from "./IRFunction";
import { IRVarialble } from "./IRVariable";
import { Quadruple } from "./Quadruple";

export class IRGenerator {
  private functions: IRFunction[]
  private variables: (IRVarialble | IRArray)[]
  private quadruples: Quadruple[]

  start(node: ASTNode) {
    this.parseProgram(node.child[0])
  }

  parseProgram(node: ASTNode) {
    this.parseDeclList(node.child[0])
  }

  parseDeclList(node: ASTNode) {
    if (node.label === 'decl_list') {
      this.parseDeclList(node.child[0])
      this.parseDecl(node.child[1])
    }
    else {
      this.parseDecl(node.child[0])
    }
  }

  parseDecl(node: ASTNode) {
    if (node.child[0].label === 'var_decl') {
      this.parseVarDecl(node.child[0])
    }
    else {
      this.parseFunDecl(node.child[0])
    }
  }

  parseVarDecl(node: ASTNode) {
    // TODO
    const type = this.parseTypeSpec(node.child[0])
    const id = node.child[1]
  }

  parseTypeSpec(node: ASTNode) {
    return node.child[0].label
  }

  parseFunDecl(node: ASTNode) {
    // TODO
    const type = this.parseTypeSpec(node.child[0])
    const id = this.parseFunctionIdent(node.child[1])
  }
  
  parseFunctionIdent(node: ASTNode) {
    return node.child[0]
  }

  parseParams(node: ASTNode) {
    this.parseParamList(node.child[0])
  }

  parseParamList(node: ASTNode) {
    // TODO
    if (node.child[0].label === 'param_list') {
      this.parseParamList(node.child[0])
      this.parseParam(node.child[1])
    }
    else {
      this.parseParam(node.child[0])
    }
  }

  parseParam(node: ASTNode) {
    // TODO
    const type = this.parseTypeSpec(node.child[0])
    const id = node.child[1].label
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