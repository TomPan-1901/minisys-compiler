import { Production } from "./YaccTypes"

let FIRST = (
  productionList: Production[],
  nonTerminatorSet: Set<string>,
  terminatorSet: Set<string>
): Map<string, Set<string>> => {
  let ans: Map<string, Set<string>> = new Map()
  terminatorSet.forEach(value => ans.set(value, new Set([value])))
  nonTerminatorSet.forEach(value => ans.set(value, new Set()))
  while (true) {
    let flag = true
    productionList.forEach(production => {
      if (production.right.length === 1 && production.right[0] === '') {
        (ans.get(production.left) as Set<string>).add('')
        return
      }
      let i = 0
      do {
        (ans.get(production.right[i]) as Set<string>)
          .forEach(value => {
            if (!(ans.get(production.left) as Set<string>).has(value)) {
              flag = false
            }
            (ans.get(production.left) as Set<string>).add(value)
          })
      } while ((ans.get(production.right[i++]) as Set<string>).has('') && i < production.right.length)
    })
    if (flag)
      break
  }
  return ans
}

let FOLLOW = (
  productionList: Production[],
  nonTerminatorSet: Set<string>,
  terminatorSet: Set<string>,
  firstMap: Map<string, Set<string>>,
  startSymbol: string
): Map<string, Set<string>> => {
  let ans: Map<string, Set<string>> = new Map()
  nonTerminatorSet.forEach(value => ans.set(value, new Set()))
  terminatorSet.forEach(value => ans.set(value, new Set()));
  (ans.get(startSymbol) as Set<string>).add('')
  while (true) {
    let flag = true
    for (let i = 0; i < productionList.length; i++) {
      let { left, right } = productionList[i]
      for (let j = 0; j < right.length; j++) {
        if (j === right.length - 1 ||
          j === right.length - 2 &&
          (firstMap.get(right[right.length - 1]) as Set<string>).has('')
        ) {
          (ans.get(left) as Set<string>).forEach(value => {
            if (!(ans.get(right[j]) as Set<string>).has(value)) {
              flag = false;
              (ans.get(right[j]) as Set<string>).add(value)
            }
          })
          continue
        }
        (firstMap.get(right[j + 1]) as Set<string>).forEach(value => {
          if (value !== '' && !(ans.get(right[j]) as Set<string>).has(value)) {
            flag = false
            ans.get(right[j])?.add(value)
          }
        })
      }
    }
    if (flag)
      break
  }
  return ans
}
export let parseYacc = (yaccContent: string) => {
  let yaccLines = yaccContent.split('\n').map(value => value.trimStart().trimEnd())
  enum YACCPART {
    PREDECLARE,
    PRODUCTIONDEF,
    POSTDECLARE
  }
  let currentLine = 0
  let currentState = YACCPART.PREDECLARE
  let terminatorSet: Set<string> = new Set()
  let nonTerminatorSet: Set<string> = new Set()
  let leftSet: Set<string> = new Set()
  let rightSet: Set<string> = new Set()
  let productionList: Production[] = []
  let postDeclare: string[] = []
  let startUnitName = ''

  while (currentLine < yaccLines.length) {
    if (yaccLines[currentLine] === '') {
      currentLine++
      continue
    }
    switch (+currentState) {
      case YACCPART.PREDECLARE:
        if (yaccLines[currentLine] === '%%') {
          currentState = YACCPART.PRODUCTIONDEF
          break
        }
        let wordsList: string[] = yaccLines[currentLine].split(/[ ]+/)
        if (wordsList[0] === '%token') {
          for (let i = 1; i < wordsList.length; i++) {
            terminatorSet.add(wordsList[i])
          }
        }
        else if (wordsList[0] === '%start') {
          if (startUnitName !== '' || wordsList[1] === undefined) {
            throw new Error('Multiple or no start unit')
          }
          startUnitName = wordsList[1]
          productionList.push({ left: '__SEU_YACC_START', right: [startUnitName] })
          nonTerminatorSet.add('__SEU_YACC_START')
        }
        else if (wordsList[1] === '%left') {
          for (let i = 1; i < wordsList.length; i++) {
            leftSet.add(wordsList[i])
          }
        }
        else if (wordsList[1] === '%right') {
          for (let i = 1; i < wordsList.length; i++) {
            rightSet.add(wordsList[i])
          }
        }
        break
      case YACCPART.PRODUCTIONDEF:
        if (yaccLines[currentLine] === '%%') {
          currentState = YACCPART.POSTDECLARE
          break
        }
        let inQuote = false
        let currentChar = 0
        let leftItemName = ''
        while (currentLine < yaccLines.length) {
          if (
            currentChar == yaccLines[currentLine].length ||
            yaccLines[currentLine][currentChar] === ' ' ||
            yaccLines[currentLine][currentChar] === '\t'
          )
            break
          leftItemName += yaccLines[currentLine][currentChar]
          currentChar++
        }
        do {
          if (currentChar === yaccLines[currentLine].length) {
            currentChar = 0
            currentLine++
          }
          else {
            currentChar++
          }
        } while (yaccLines[currentLine][currentChar] !== ':')
        currentChar++
        while (currentChar < yaccLines[currentLine].length &&
          (yaccLines[currentLine][currentChar] === ' ' ||
            yaccLines[currentLine][currentChar] === '\t')) {
          currentChar++
        }
        while (!inQuote && yaccLines[currentLine][currentChar] !== ';') {
          let currentProduction: string[] = []
          while (inQuote ||
            (yaccLines[currentLine][currentChar] !== '|' &&
              yaccLines[currentLine][currentChar] !== ';')
          ) {
            while (yaccLines[currentLine][currentChar] === ' ' || yaccLines[currentLine][currentChar] === '\t') {
              if (currentChar === yaccLines[currentLine].length) {
                currentChar = 0
                currentLine++
              }
              else {
                currentChar++
              }
            }
            if (yaccLines[currentLine][currentChar] === '\'') {
              inQuote = !inQuote
              currentChar++
              if (currentChar === yaccLines[currentLine].length) {
                currentChar = 0
                currentLine++
              }
              continue
            }
            if (inQuote) {
              terminatorSet.add(yaccLines[currentLine][currentChar])
              currentProduction.push(yaccLines[currentLine][currentChar])
            }
            else {
              let currentProductionName = ''
              while (currentChar < yaccLines[currentLine].length &&
                yaccLines[currentLine][currentChar] !== ' ' &&
                yaccLines[currentLine][currentChar] !== '\t' &&
                yaccLines[currentLine][currentChar] !== '|'
              )
                currentProductionName += yaccLines[currentLine][currentChar++]
              if (currentProductionName.length > 0)
                currentProduction.push(currentProductionName)
            }
            do {
              if (currentChar === yaccLines[currentLine].length) {
                currentChar = 0
                currentLine++
              }
              else {
                currentChar++
                if (currentChar === yaccLines[currentLine].length) {
                  currentChar = 0
                  currentLine++
                }
              }
            } while (yaccLines[currentLine][currentChar] === ' ' || yaccLines[currentLine][currentChar] === '\t')
          }
          nonTerminatorSet.add(leftItemName)
          productionList.push({
            left: leftItemName,
            right: currentProduction
          })
          if (yaccLines[currentLine][currentChar] === ';') {
            break
          }
          do {
            if (currentChar === yaccLines[currentLine].length) {
              currentChar = 0
              currentLine++
            }
            else {
              currentChar++
              if (currentChar === yaccLines[currentLine].length) {
                currentChar = 0
                currentLine++
              }
            }
          } while (yaccLines[currentLine][currentChar] === ' ' || yaccLines[currentLine][currentChar] === '\t')
          if (yaccLines[currentLine][currentChar] === ';') {
            productionList.push({
              left: leftItemName,
              right: ['']
            })
          }
        }
        break
      case YACCPART.POSTDECLARE:
        postDeclare.push(yaccLines[currentLine])
        break
    }
    currentLine++
  }
  let first = FIRST(productionList, nonTerminatorSet, terminatorSet)
  let follow = FOLLOW(productionList, nonTerminatorSet, terminatorSet, first, '__SEU_YACC_START')
}