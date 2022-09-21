import fs from 'fs'
import { parseYacc } from './ParseYacc'

let content = fs.readFileSync('./test/yacc-sample/cYacc.y').toString()
parseYacc(content)