import fs from 'fs'
import { LR1DFA } from './LR1/LR1DFA'
import { parseYacc } from './ParseYacc'

if (process.argv.length < 4) {
  console.log('Usage: node ParseLexFile.js <input lex file> <output js file>')
  process.exit(0)
}
let yaccFilePath = process.argv[2]
let outFilePath = process.argv[3]
let yaccContent = fs.readFileSync(yaccFilePath).toString()
let content: string[] = []
let [dfa, postDeclare] = parseYacc(yaccContent)
let test = LR1DFA.deserializeFromSchema(dfa.serializeToSchema())
content.push(...postDeclare)
content.push(
  `
class ASTNode {
    constructor(label, attributes, child) {
        this.label = label;
        this.child = child ? child : [];
        this.attributes = attributes;
    }
    static fromTerminator(terminator, attributes) {
        return new ASTNode(terminator, attributes);
    }
    static fromNonTerminator(nonTerminator, child, attributes) {
        return new ASTNode(nonTerminator, attributes, child);
    }
}
class LR1DFA {
    constructor(action, goto, reduceActionList, restoreList) {
        this.stateStack = [0];
        this.astNodeStack = [];
        this.action = action;
        this.goto = goto;
        this.reduceActionList = reduceActionList;
        this.restoreList = restoreList
    }
    restore() {
      let topState = this.stateStack.pop()
      while (!this.restoreList.has(topState)) {
        topState = this.stateStack.pop()
        if (topState === undefined) {
          throw new Error()
        }
      }
      this.stateStack.push(topState)
      this.transfer('error', '')
      topState = this.stateStack[this.stateStack.length - 1]
      console.log(this.reduceActionList[topState].action)
    }
    transfer(token, yylval) {
        let topState = this.stateStack[this.stateStack.length - 1];
        let currentAction = this.action[topState].get(token);
        if (!currentAction) {
            throw new Error();
        }
        if (currentAction.action === 'accept') {
            this.stateStack.pop();
            return this.astNodeStack.pop();
        }
        while (currentAction.action === 'reduce') {
            let { leftToken, rightItemCount, action } = this.reduceActionList[currentAction.target];
            let children = [];
            for (let i = 0; i < rightItemCount; i++) {
                children.push(this.astNodeStack.pop());
                this.stateStack.pop();
            }
            let currentTopState = this.stateStack[this.stateStack.length - 1];
            this.astNodeStack.push(ASTNode.fromNonTerminator(leftToken, children.reverse()));
            this.stateStack.push(this.goto[currentTopState].get(leftToken));
            let $attr = children.map(({attributes}) => attributes)
            let $$attr = this.astNodeStack[this.astNodeStack.length - 1].attributes
            eval(action)
            this.astNodeStack[this.astNodeStack.length - 1].attributes = $$attr
            topState = this.stateStack[this.stateStack.length - 1];
            currentAction = this.action[topState].get(token);
            if (!currentAction) {
                throw new Error();
            }
        }
        if (currentAction.action === 'accept') {
            this.stateStack.pop();
            return this.astNodeStack.pop();
        }
        this.stateStack.push(currentAction.target);
        this.astNodeStack.push(ASTNode.fromTerminator(token, yylval));
    }
    static deserializeFromSchema(schema) {
        let { action, goto, reduceAction, restoreList } = schema;
        let actionMapList = [];
        let gotoMapList = [];
        action.forEach(value => {
            let actionMap = new Map();
            value.forEach(({ token, action }) => actionMap.set(token, action));
            actionMapList.push(actionMap);
        });
        goto.forEach(value => {
            let gotoMap = new Map();
            value.forEach(({ token, to }) => gotoMap.set(token, to));
            gotoMapList.push(gotoMap);
        });
        return new LR1DFA(actionMapList, gotoMapList, reduceAction, new Set(restoreList));
    }
}
let __lr1DFA = LR1DFA.deserializeFromSchema(${JSON.stringify(dfa.serializeToSchema())})
let result
while (true) {
  let token = yylex()
  if (token !== null) {
    try {
       __lr1DFA.transfer(token, YYLVAL())
    }
    catch (e){
      console.log(e)
       __lr1DFA.restore()
    }
  }
  else {
    result = __lr1DFA.transfer('', '')
    break
  }
}
console.log(JSON.stringify(result))
`
)
fs.writeFile(outFilePath, content.join('\n'), err => console.log(err))
// dfa.serializeToSchema()
// 
// dfa.transfer('id', '')
// dfa.transfer('+', '')
// dfa.transfer('id', '')
// dfa.transfer('-', '')
// dfa.transfer('id', '')
// dfa.transfer('*', '')
// dfa.transfer('id', '')
// let result = dfa.transfer('', '')
// console.log(1)