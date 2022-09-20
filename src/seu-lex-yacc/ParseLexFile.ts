import * as fs from 'fs'
import { parseLex } from './ParseLex'

if (process.argv.length < 4) {
  console.log('Usage: node ParseLexFile.js <input lex file> <output js file>')
  process.exit(0)
}
let lexFilePath = process.argv[2]
let outFilePath = process.argv[3]
let file = fs.readFileSync(lexFilePath).toString()
let [preDeclare, schema, actions, postDeclare] = parseLex(file)
let content: string[] = []
content.push(
`
/*
* This file is generated by SEULex,
* ANY DIRECT MODIFY TO THE FILE WILL BE LOST AFTER RECOMPILE!
*/
class DFAState {
  constructor(acceptable = false, action = null, edge = null) {
    this.acceptable = acceptable;
    this.action = action;

    if (edge !== null) {
      this.edge = edge;
    } else {
      this.edge = new Map();
    }
  }

  setEdge(edge) {
    this.edge = edge;
  }

  getEdge() {
    return this.edge;
  }

  setAcceptable(acceptable) {
    this.acceptable = acceptable;
  }

  getAcceptable() {
    return this.acceptable;
  }

  getAction() {
    return this.action;
  }

  setAction(action) {
    this.action = action;
  }

  addEdge(char, state) {
    // This shouldn't happen
    if (this.edge.has(char)) {
      throw new Error();
    }

    this.edge.set(char, state);
  }
}

class DFA {
  // Only use static method to construct DFA
  constructor(start) {
    this.start = start;
    this.current = start;
  }

  transfer(char) {
    if (this.current.getEdge().has(char)) {
      this.current = this.current.getEdge().get(char);
      return true;
    }

    return false;
  }

  reset() {
    this.current = this.start;
  }

  getCurrentAction() {
    return this.current.getAction();
  }

  static deserializeFromSchema(schema) {
    let idMap = new Map();
    schema.forEach(({
      id,
      action,
      acceptable,
      edge
    }) => {
      if (!idMap.has(id)) {
        idMap.set(id, new DFAState());
      }

      let state = idMap.get(id);
      state.setAcceptable(acceptable);
      state.setAction(action);
      edge.forEach(({
        char,
        to
      }) => {
        if (!idMap.has(to)) {
          idMap.set(to, new DFAState());
        }

        state.addEdge(char, idMap.get(to));
      });
    });
    return new DFA(idMap.get(0));
  }

}
const fs = require('fs')
let yytext = ''
let yylval = undefined
let buffer = Buffer.alloc(4096)
let bufferPtr = 0
let yyin = process.argv[2] ? fs.openSync(process.argv[2], 'r') : process.stdin.fd
let yyout = process.argv[3] ? fs.openSync(process.argv[3], 'w') : process.stdout.fd
let print = content => fs.writeSync(yyout, content, err => console.log(err))
let bufferLength = fs.readSync(yyin, buffer)

`
)
let actionFunctions: any = {}
content.push(...preDeclare)
actions.forEach((value, key) => {
  console.log(value, key)
  actionFunctions[key] = 
`() => { ${value} }`
})
content.push(
`
let __dfaTransferTable = ${JSON.stringify(schema)}
let __dfa = DFA.deserializeFromSchema(__dfaTransferTable)
let __actionFunctions = ${JSON.stringify(actionFunctions)}
Object.keys(__actionFunctions).forEach(key => __actionFunctions[key] = eval(__actionFunctions[key]))

let yylex = () => {
  yytext = ''
  if (bufferPtr === bufferLength) {
    bufferPtr = 0
    bufferLength = fs.readSync(yyin, buffer)
  }
  while (bufferPtr < bufferLength) {
    while(bufferPtr < bufferLength && __dfa.transfer(String.fromCharCode(buffer.at(bufferPtr)))) {
      yytext += String.fromCharCode(buffer.at(bufferPtr))
      bufferPtr++
      if (bufferPtr === bufferLength) {
        bufferPtr = 0
        bufferLength = fs.readSync(yyin, buffer)
      }
    }
    if (__dfa.getCurrentAction() !== null) {
      let action = __dfa.getCurrentAction()
      __dfa.reset()
      return __actionFunctions[action]()
    }
    print(String.fromCharCode(buffer.at(bufferPtr)))
    yytext = ''
    __dfa.reset()
    bufferPtr++
    if (bufferPtr === bufferLength) {
      bufferPtr = 0
      bufferLength = fs.readSync(yyin, buffer)
    }
  }
  return null
}
let YYLVAL = () => yylval
let YYTEXT = () => yytext
exports.yylex = yylex
exports.YYLVAL = YYLVAL
exports.YYTEXT = YYTEXT
`
)
content.push(...postDeclare)
fs.writeFile(outFilePath, content.join('\n'), err=>console.log(err))