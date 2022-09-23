import fs from 'fs'
import { parseYacc } from './ParseYacc'

let content = fs.readFileSync('./test/yacc-sample/test-plus-star.y').toString()
let dfa = parseYacc(content)
dfa.transfer('id', '')
dfa.transfer('+', '')
dfa.transfer('id', '')
dfa.transfer('*', '')
dfa.transfer('id', '')
let result = dfa.transfer('', '')
console.log(1)