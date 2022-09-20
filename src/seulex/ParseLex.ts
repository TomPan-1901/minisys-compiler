import { RegToken } from './RegToken'
import { NFA } from './NFA'
import { DFA } from './DFA'
import { DFANodeSchema } from './DFANodeSchema'

const ALLSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!\"#%'()*+,-./:;<=>\?[\\]^{|}_ \n\t\v\f~&"

let handleQuote = (regDef: Map<string, string>): Map<string, string> => {
  const escapeChars = new Set<string>(['.', '|', '*', '(', ')', '+', '?', '{', '}', '[', ']'])
  regDef.forEach((value, key, map) => {
    let inQuote = false
    let inBracket = false
    let result = ''
    for (let i = 0; i < value.length; i++) {
      if (!inBracket && !inQuote) {
        if (value[i] === '[') {
          inBracket = true
          result += value[i]
          continue
        }
      }
      else if (inBracket && !inQuote) {
        if (value[i] === ']') {
          inBracket = false
        }
        result += value[i]
        continue
      }
      if (value[i] === '\\') {
        if (i + 1 >= value.length) {
          throw Error('Unexpected \\')
        }
        result += value[i] + value[i + 1]
        i++
        continue
      }
      if (!inQuote) {
        if (value[i] === '"') {
          inQuote = true
        }
        else {
          result += value[i]
        }
      }
      else {
        if (value[i] === '"') {
          inQuote = false
        }
        else {
          if (escapeChars.has(value[i])) {
            result += '\\' + value[i]
          }
          else {
            result += value[i]
          }
        }
      }
    }
    if (inQuote) {
      throw new Error(`Unmatched "`)
    }
    else {
      map.set(key, result)
    }
  })
  return regDef
}
let expandDefinition = (regDef: Map<string, string>): Map<string, string> => {

  // 建图
  let dag: Map<string, string[]> = new Map()
  let inDegree: Map<string, number> = new Map()
  let expandOrder = []
  for (let [k] of regDef.entries()) {
    inDegree.set(k, 0)
    dag.set(k, [])
  }
  for (let [k, v] of regDef.entries()) {
    let i = 0
    while (i < v.length) {
      if (v[i] === '\\') {
        i += 2
        continue
      }
      if (v[i] === '{') {
        i++
        let start = i
        while (i < v.length && v[i] !== '}') {
          i++
        }
        (dag.get(v.substring(start, i)) as string[]).push(k)
        let count = inDegree.get(k) as number
        inDegree.set(k, count + 1)
      }
      i++
    }
  }
  while (true) {
    let flag = true
    for (let [k, v] of inDegree.entries()) {
      if (v === 0) {
        expandOrder.push(k)
        let l = dag.get(k) as string[]
        for (let i = 0; i < l.length; i++) {
          inDegree.set(l[i], inDegree.get(l[i]) as number - 1)
        }
        inDegree.delete(k)
        dag.delete(k)
        flag = false
      }
    }
    if (flag)
      break
  }
  if (expandOrder.length < regDef.size) {
    throw new Error(`Circular definition detected`)
  }
  else {
    for (let i = 0; i < expandOrder.length; i++) {
      let key = expandOrder[i]
      let value = regDef.get(key) as string
      let idx = 0
      let result = ''
      while (idx < value.length) {
        if (value[idx] === '\\') {
          if (idx + 1 >= value.length) {
            throw new Error(`Unexpected \\`)
          }
          else {
            result += value[idx] + value[idx + 1]
            idx += 2
          }
          continue
        }
        if (value[idx] !== '{') {
          result += value[idx]
        }
        else {
          idx++
          let start = idx
          while (idx < value.length && value[idx] !== '}') {
            idx++
          }
          result += `(${regDef.get(value.substring(start, idx))})`
        }
        idx++
      }
      regDef.set(key, result)
    }
  }
  return regDef
}
let transformToStandardRegExp = (regDef: Map<string, string>): Map<string, RegToken[]> => {
  const escapeChars = new Set<string>(['.', '|', '*', '(', ')', '+', '?', '{', '}', '[', ']'])
  const operators = new Set<string>(['*', '+', '?', '(', ')', '|'])
  const keywordsInBracket = new Set<string>(['^', '-', '[', ']', '\\'])
  let ans: Map<string, RegToken[]> = new Map()
  for (let [key, value] of regDef.entries()) {
    let idx = 0
    let inBracket = false
    let firstInBracket = false
    let curAns: RegToken[] = []
    while (idx < value.length) {
      if (!inBracket) {
        if (value[idx] === '[') {
          inBracket = true
          firstInBracket = true
          curAns.push({ token: '(', tokenType: 'operator' })
        }
        else {
          if (value[idx] === '\\') {
            if (value[idx + 1] === 'n') {
              curAns.push({ token: '\n', tokenType: 'operand' })
            }
            else if (value[idx + 1] === 't') {
              curAns.push({ token: '\t', tokenType: 'operand' })
            }
            else if (value[idx + 1] === 'v') {
              curAns.push({ token: '\v', tokenType: 'operand' })
            }
            else if (value[idx + 1] === 'f') {
              curAns.push({ token: '\f', tokenType: 'operand' })
            }
            else if (value[idx + 1] === 'r') {
              curAns.push({ token: '\r', tokenType: 'operand' })
            }
            else {
              curAns.push({ token: value[idx + 1], tokenType: 'operand' })
            }
            idx += 2
            continue
          }
          else {
            curAns.push({ token: value[idx], tokenType: operators.has(value[idx]) ? 'operator' : "operand" })
          }
        }
      }
      else {
        if (value[idx] === ']') {
          inBracket = false
          curAns.push({ token: ')', tokenType: 'operator' })
        }
        else {
          if (value[idx] === '\\') {
            if (firstInBracket) {
              if (value[idx + 1] === 'n') {
                curAns.push({ token: '\n', tokenType: 'operand' })
              }
              else if (value[idx + 1] === 't') {
                curAns.push({ token: '\t', tokenType: 'operand' })
              }
              else if (value[idx + 1] === 'v') {
                curAns.push({ token: '\v', tokenType: 'operand' })
              }
              else if (value[idx + 1] === 'f') {
                curAns.push({ token: '\f', tokenType: 'operand' })
              }
              else if (value[idx + 1] === 'r') {
                curAns.push({ token: '\r', tokenType: 'operand' })
              }
              else {
                curAns.push({ token: value[idx + 1], tokenType: 'operand' })
              }
              firstInBracket = false
            }
            else {
              curAns.push({ token: '|', tokenType: 'operator' })
              if (value[idx + 1] === 'n') {
                curAns.push({ token: '\n', tokenType: 'operand' })
              }
              else if (value[idx + 1] === 't') {
                curAns.push({ token: '\t', tokenType: 'operand' })
              }
              else if (value[idx + 1] === 'v') {
                curAns.push({ token: '\v', tokenType: 'operand' })
              }
              else if (value[idx + 1] === 'f') {
                curAns.push({ token: '\f', tokenType: 'operand' })
              }
              else if (value[idx + 1] === 'r') {
                curAns.push({ token: '\r', tokenType: 'operand' })
              }
              else {
                curAns.push({ token: value[idx + 1], tokenType: 'operand' })
              }
            }
            idx += 2
            continue
          }
          else if (value[idx] === '^') {
            if (firstInBracket) {
              let excludeSet: Set<string> = new Set()
              idx++
              while (idx < value.length && value[idx] !== ']') {
                if (value[idx] === '\\') {
                  if (value[idx + 1] === 'n') {
                    excludeSet.add('\n')
                  }
                  else if (value[idx + 1] === 't') {
                    excludeSet.add('\t')
                  }
                  else if (value[idx + 1] === 'v') {
                    excludeSet.add('\v')
                  }
                  else if (value[idx + 1] === 'f') {
                    excludeSet.add('\f')
                  }
                  else if (value[idx + 1] === 'r') {
                    excludeSet.add('\r')
                  }
                  else {
                    excludeSet.add(value[idx + 1])
                  }
                  idx += 2
                }
                else {
                  excludeSet.add(value[idx])
                  idx++
                }
              }
              for (let char of ALLSET) {
                if (!excludeSet.has(char)) {
                  curAns.push({ token: char, tokenType: 'operand' })
                  curAns.push({ token: '|', tokenType: 'operator' })
                }
              }
              curAns.pop()
              firstInBracket = false
              continue
            }
            else {
              curAns.push({ token: '|', tokenType: 'operator' })
              curAns.push({ token: value[idx + 1], tokenType: 'operand' })
            }
          }
          else {
            if (firstInBracket) {
              curAns.push({ token: value[idx], tokenType: 'operand' })
              firstInBracket = false
            }
            else {
              if (value[idx] === '-' &&
                idx + 1 < value.length &&
                value[idx + 1] !== ']'
              ) {
                let start = value[idx - 1]
                let stop = value[idx + 1]
                if (start.charCodeAt(0) >= stop.charCodeAt(0)) {
                  throw new Error(`Invalid range: ${start} (${start.charCodeAt(0)} : ${stop} (${stop.charCodeAt(0)}))`)
                }
                for (let i = start.charCodeAt(0) + 1; i <= stop.charCodeAt(0); i++) {
                  curAns.push({ token: '|', tokenType: 'operator' })
                  curAns.push({ token: String.fromCharCode(i), tokenType: 'operand' })
                }
                idx += 2
                continue
              }
              else {
                curAns.push({ token: '|', tokenType: 'operator' })
                curAns.push({ token: value[idx], tokenType: 'operand' })
              }
            }
          }
        }
      }
      idx++
    }
    /**
     * 以下情况时后面不加点：
     * 当前字符为定义的转义字符
     * 当前字符为非转义的(和|
     * 当前字符为正规表达式最后一个字符
     * 当前字符的后一个字符为|、)、*、+、?
     */
    curAns = curAns.flatMap((value, index, array) => {
      if (index === array.length - 1) {
        return value
      }
      else {
        if (
          // 非转义的(和|
          (value.tokenType === 'operator' && (value.token === '(' || value.token === '|')) ||
          array[index + 1].tokenType === 'operator' &&
          (array[index + 1].token === '|' ||
            array[index + 1].token === ')' ||
            array[index + 1].token === '+' ||
            array[index + 1].token === '?' ||
            array[index + 1].token === '*'
          )
        )
          return value
        else {
          return [value, { token: '.', tokenType: 'operator' }]
        }
      }
    })
    ans.set(key, curAns)
  }
  ans.forEach((value, key) => {
    console.log(key, ':')
    console.log(value.map(({ token, tokenType }) => {
      if (tokenType === 'operand' && operators.has(token)) {
        return '\\' + token
      }
      else {
        return token
      }
    }).join(''))
  })
  return ans
}
let transformToSuffixReg = (infixRegDef: Map<string, RegToken[]>): Map<string, RegToken[]> => {
  let ans: Map<string, RegToken[]> = new Map()
  const operatorPriority = {
    '+': 0,
    '*': 0,
    '?': 0,
    '.': 1,
    '|': 2
  }
  for (let [k, v] of infixRegDef.entries()) {
    let curAns: RegToken[] = []
    let operatorStack: RegToken[] = []

    for (let i = 0; i < v.length; i++) {
      if (v[i].tokenType === 'operand') {
        curAns.push(v[i])
      }
      else {
        if (operatorStack.length === 0 ||
          (v[i].tokenType === 'operator' && v[i].token === '(')
        ) {
          operatorStack.push(v[i])
        }
        else if (v[i].tokenType === 'operator' && v[i].token === ')') {
          while (operatorStack[operatorStack.length - 1].token !== '(') {
            curAns.push(operatorStack.pop() as RegToken)
          }
          operatorStack.pop()
        }
        else {
          while (operatorStack.length > 0 &&
            operatorStack[operatorStack.length - 1].token !== '(' &&
            operatorPriority[operatorStack[operatorStack.length - 1].token as '+' | '*' | '?' | '.' | '|'] <= operatorPriority[v[i].token as '+' | '*' | '?' | '.' | '|']) {
            curAns.push(operatorStack.pop() as RegToken)
          }
          operatorStack.push(v[i])
        }
      }
      if (i === v.length - 1) {
        while (operatorStack.length > 0) {
          curAns.push(operatorStack.pop() as RegToken)
        }
      }
    }
    ans.set(k, curAns)
  }
  return ans
}

export let parseLex = (lexContent: string): [string[], DFANodeSchema[], Map<string, string>, string[]] => {
  let preDeclare: string[] = []
  let regDef: Map<string, string> = new Map()
  let postDeclare: string[] = []
  let actions: Map<string, string> = new Map()
  let actionPriority: Map<string, number> = new Map()
  enum LEXPART {
    STARTSTATE,
    PREDECLARE,
    REGDEF,
    ACTIONS,
    POSTDECLARE
  }
  let currentLine = 0
  let lexLines = lexContent.split('\n').map(value => value.trimStart().trimEnd())
  let currentState: LEXPART = LEXPART.STARTSTATE
  let hasError = false
  while (currentLine < lexLines.length && !hasError) {
    if (lexLines[currentLine] === '') {
      currentLine++
      continue
    }
    switch (+currentState) {
      case LEXPART.STARTSTATE:
        if (lexLines[currentLine] === '%{') {
          currentState = LEXPART.PREDECLARE
        }
        else {
          console.log('ERROR: No entry sign %{')
          hasError = true
        }
        break
      case LEXPART.PREDECLARE:
        if (lexLines[currentLine] === '%}') {
          currentState = LEXPART.REGDEF
        }
        else {
          preDeclare.push(lexLines[currentLine])
        }
        break
      case LEXPART.REGDEF:
        if (lexLines[currentLine] === '%%') {
          currentState = LEXPART.ACTIONS
        }
        else {
          let currentChar = 0
          let l = lexLines[currentLine].length
          while (currentChar < l && (
            lexLines[currentLine][currentChar] !== '\t' && lexLines[currentLine][currentChar] !== ' '
          ))
            currentChar++
          regDef.set(lexLines[currentLine].substring(0, currentChar), lexLines[currentLine].substring(currentChar).trimStart())
        }
        break
      case LEXPART.ACTIONS:
        if (lexLines[currentLine] === '%%') {
          currentState = LEXPART.POSTDECLARE
        }
        else {
          let currentChar = 0
          let l = lexLines[currentLine].length
          let stack: string[] = []
          let currentAction: string[] = []
          let inBracket = false
          let inQuote = false

          while (currentChar < l && (
            (lexLines[currentLine][currentChar] !== ' ' || inBracket || inQuote) &&
            lexLines[currentLine][currentChar] !== '\t'
          )) {
            if (lexLines[currentLine][currentChar] === '[' && !inQuote) {
              inBracket = true
            }
            else if (lexLines[currentLine][currentChar] === ']' && !inQuote) {
              inBracket = false
            }
            else if (lexLines[currentLine][currentChar] === '"') {
              inQuote = !inQuote
            }
            currentChar++
          }
          let regKey = `__ACTION_REGDEF_${currentLine + 1}`
          actionPriority.set(regKey, currentLine)
          let regPart = lexLines[currentLine].substring(0, currentChar)
          regDef.set(regKey, regPart)

          while (currentChar < l && lexLines[currentLine][currentChar] !== '{')
            currentChar++
          if (currentChar === l) {
            currentChar = 0
            currentLine++
          }
          stack.push(lexLines[currentLine][currentChar])
          if (currentChar === lexLines[currentLine].length - 1) {
            currentChar = 0
            currentLine++
          }
          else {
            currentChar++
          }
          let tempAction = ''
          while (stack && currentLine < lexLines.length) {
            if (lexLines[currentLine][currentChar] === '{' && !inQuote) {
              stack.push('{')
            }
            else if (lexLines[currentLine][currentChar] === '}' && !inQuote) {
              if (stack.length === 0) {
                console.log('Error: no match {')
              }
              else {
                currentAction.push(tempAction)
                stack.pop()
              }
            }
            else if (lexLines[currentLine][currentChar] === '\'' || lexLines[currentLine][currentChar] === '"') {
              inQuote = !inQuote
            }
            if (stack.length !== 0) {
              tempAction += lexLines[currentLine][currentChar]
              if (currentChar === lexLines[currentLine].length - 1) {
                currentChar = 0
                currentLine++
                currentAction.push(tempAction)
                tempAction = ''
              }
              else {
                currentChar++
              }
            }
            else {
              break
            }
          }
          actions.set(regKey, currentAction.join(';'))
        }
        break
      case LEXPART.POSTDECLARE:
        postDeclare.push(lexLines[currentLine])
        break
    }
    currentLine++
  }
  handleQuote(regDef)
  expandDefinition(regDef)
  let standardRegExp = transformToStandardRegExp(regDef)
  let infixRegDefsWithAction: Map<string, RegToken[]> = new Map()
  actions.forEach((value, key) => {
    infixRegDefsWithAction.set(key, standardRegExp.get(key) as RegToken[])
  })
  let suffixRegDef = transformToSuffixReg(infixRegDefsWithAction)
  let result = NFA.fromSuffixRegDef(suffixRegDef)
  let dfa = DFA.fromNFA(result, actionPriority)
  dfa = DFA.minimizedDFA(dfa)
  return [preDeclare, dfa.serializeToSchema(), actions, postDeclare]
  // console.log(preDeclare)
  // console.log(regDef)
  // console.log(postDeclare)
  // console.log(actions)
}