type RegToken = {
  token: string,
  tokenType: 'operand' /*操作数*/ | 'operator' /*操作符*/
}
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
      else if (inBracket && !inQuote){
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
            curAns.push({ token: value[idx + 1], tokenType: 'operand'})
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
          curAns.push({ token: ')', tokenType: 'operator'})
        }
        else {
          if (value[idx] === '\\') {
            if (firstInBracket) {
              curAns.push({ token: value[idx + 1], tokenType: 'operand' })
              firstInBracket = false
            }
            else {
              curAns.push({ token: '|', tokenType: 'operator' })
              curAns.push({ token: value[idx + 1], tokenType: 'operand' })
            }
            idx += 2
            continue
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
                  curAns.push({ token: String.fromCharCode(i), tokenType: 'operand'})
                }
                idx += 2
                continue
              }
              else {
                curAns.push({ token: '|', tokenType: 'operator' })
                curAns.push({ token: value[idx], tokenType: 'operand'})
              }
            }
          }
        }
      }
      idx++
    }
    // TODO: 加点
    curAns = curAns.flatMap((value, index, array) => {
      if (value.tokenType === 'operand' &&
      index + 1 < array.length && (
      array[index + 1].tokenType === 'operand' ||
      array[index + 1].tokenType === 'operator' && array[index + 1].token === '('
      )) {
        return [value, { token: '.', tokenType: 'operator'} ]
      }
      else {
        return value
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
    '|': 0,
    '.': 0,
    '+': 1,
    '*': 1,
    '?': 1
  }
  for (let [k, v] of infixRegDef.entries()) {
    let operandStack: RegToken[] = []
    let operatorStack: RegToken[] = []
    for (let i = 0; i < v.length; i++) {
      if (v[i].tokenType === 'operand') {
        operandStack.push(v[i])
      }
      else {

      }
    }
  }
  return infixRegDef
}
export let parseLex = (lexContent: string) => {
  let length = lexContent.length
  let preDeclare: string[] = []
  let regDef: Map<string, string> = new Map()
  let postDeclare: string[] = []
  let actions: Map<string, string> = new Map()
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

          while (currentChar < l && (
            (lexLines[currentLine][currentChar] !== ' ' || inBracket) &&
            lexLines[currentLine][currentChar] !== '\t'
          )) {
            if (lexLines[currentLine][currentChar] === '[') {
              inBracket = true
            }
            else if (lexLines[currentLine][currentChar] === ']') {
              inBracket = false
            }
            currentChar++
          }
          let regKey = `__ACTION_REGDEF_${currentLine + 1}`
          let regPart = lexLines[currentLine].substring(0, currentChar)
          regDef.set(regKey, regPart)
          
          while (currentChar < l && lexLines[currentLine][currentChar] !== '{')
            currentChar++
          stack.push(lexLines[currentLine][currentChar])
          if (currentChar === lexLines[currentLine].length - 1) {
            currentChar = 0
            currentLine++
          }
          else {
            currentChar++
          }
          let tempAction = ''
          let inQuote = false
          while (stack && currentLine < lexLines.length) {
            if (lexLines[currentLine][currentChar] === '{' && !inQuote) {
              stack.push('{')
            }
            else if (lexLines[currentLine][currentChar] === '}' && !inQuote) {
              if (stack.length === 0) {
                console.log('Error: no match {')
              }
              else {
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
          actions.set(regKey, currentAction.join('\n'))
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
  transformToSuffixReg(infixRegDefsWithAction)
  return [preDeclare, regDef, postDeclare]
  // console.log(preDeclare)
  // console.log(regDef)
  // console.log(postDeclare)
  // console.log(actions)
}