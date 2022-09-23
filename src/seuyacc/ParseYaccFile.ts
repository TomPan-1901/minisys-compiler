import fs from 'fs'
import { parseYacc } from './ParseYacc'

let content = fs.readFileSync('./test/yacc-sample/test-plus-star.y').toString()
parseYacc(content)