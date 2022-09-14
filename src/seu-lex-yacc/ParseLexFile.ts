import * as fs from 'fs'
import { parseLex } from './ParseLex'

let file = fs.readFileSync('./cLex.l').toString()
parseLex(file)
