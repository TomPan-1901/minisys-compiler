import { LR1Collection, LR1Item, Production } from "./YaccTypes"

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
      if (production.getRight().length === 1 && production.getRight()[0] === '') {
        (ans.get(production.getLeft()) as Set<string>).add('')
        return
      }
      let i = 0
      do {
        (ans.get(production.getRight()[i]) as Set<string>)
          .forEach(value => {
            if (!(ans.get(production.getLeft()) as Set<string>).has(value)) {
              flag = false
            }
            (ans.get(production.getLeft()) as Set<string>).add(value)
          })
      } while ((ans.get(production.getRight()[i++]) as Set<string>).has('') && i < production.getRight().length)
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
      let [left, right] = [productionList[i].getLeft(), productionList[i].getRight()]
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

let CLOSURE = (collection: LR1Collection, productionList: Production[], firstMap: Map<string, Set<string>>): LR1Collection => {
  let ans = collection.deepCopy()
  let idx = 0
  let visitedNonTerminator: Set<string> = new Set()
  while (idx < ans.getItem().length) {
    let header = ans.getItem()[idx].getHeader()
    let next = ans.getItem()[idx].getNext()?.getHeader()
    let firstBetaAlpha: Set<string> = new Set()
    if (!next) {
      firstBetaAlpha.add(ans.getItem()[idx].getExpect())
    }
    else {
      firstMap.get(next)?.forEach(value => firstBetaAlpha.add(value))
      firstBetaAlpha.delete('')
    }
    if (header === null) {
      idx++
      continue
    }
    productionList
      .filter(value => value.getLeft() === header)
      .forEach(value => {
        for (let [v, _v] of firstBetaAlpha.entries()) {
          let temp = new LR1Item(value, 0, v)
          if (!ans.getItem().find(item => item.equals(temp)))
            ans.addItem(temp)
        }
      })
    idx++
  }
  return ans
}

let GOTO = (collection: LR1Collection, X: string, productionList: Production[], firstMap: Map<string, Set<string>>): LR1Collection | null => {
  let lr1ItemCore = new LR1Collection([])
  collection
    .getItem()
    .filter(value => value.getHeader() === X)
    .forEach(value => lr1ItemCore.addItem(value.getNext() as LR1Item))
  if (lr1ItemCore.getItem().length === 0)
    return null
  return CLOSURE(lr1ItemCore, productionList, firstMap)
}

let getAllLR1Collections = (productionList: Production[],
  firstMap: Map<string, Set<string>>,
  terminatorSet: Set<string>,
  nonTerminatorSet: Set<string>): LR1Collection[] => {
  let allSet: Set<string> = new Set()
  terminatorSet.forEach(v => allSet.add(v))
  nonTerminatorSet.forEach(v => allSet.add(v))
  let ans: LR1Collection[] = []
  ans.push(CLOSURE(new LR1Collection([new LR1Item(productionList[0], 0, '')]), productionList, firstMap))
  let idx = 0
  while (idx < ans.length) {
    let currentCollection = ans[idx]
    for (let [X, _X] of allSet.entries()) {
      let result = GOTO(currentCollection, X, productionList, firstMap)
      if (result === null) {
        continue
      }
      if (!ans.find(value => value.equals(result as LR1Collection))) {
        ans.push(result)
      }
    }
    console.log(`index: ${idx}, length: ${ans.length}`)
    idx++
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
          productionList.push(new Production('__SEU_YACC_START', [startUnitName]))
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
          productionList.push(new Production(leftItemName, currentProduction))
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
            productionList.push(new Production(leftItemName, ['']))
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
  let result = getAllLR1Collections(productionList, first, terminatorSet, nonTerminatorSet)
  // let c = CLOSURE(new LR1Collection([new LR1Item(productionList[0], 0, '')]), productionList, first)
  // let follow = FOLLOW(productionList, nonTerminatorSet, terminatorSet, first, '__SEU_YACC_START')
}