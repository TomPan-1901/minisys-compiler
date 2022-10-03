%token T_DATA T_ENDL T_NUM T_IDNAME T_COLON T_WORD T_COMMA
%token T_SPACE T_ALIGN T_TEXT T_ERET T_SYSCALL T_BREAK
%token T_REG T_RCOM T_SRCOM T_JBCOM T_JCOM T_HALF T_PCOM
%token T_DRCOM T_BZICOM T_BICOM T_LWICOM T_SICOM T_ICOM T_SLLRCOM T_NOP
%token T_LPARA T_RPARA

%start N_PRO

%%

N_PRO
 : N_DATA N_TEXT
 ;

N_DATA
 : N_DATASEG N_VARS
 |
 ;

N_DATASEG
 : T_DATA N_SEGADDR T_ENDL
 ;

N_SEGADDR
 : T_NUM {$$ = $[0]}
 | '' {$$ = 0}
 ;

N_VARS
 : N_VAR N_VARS
 |
 ;

N_VAR
 : T_IDNAME T_COLON N_VARDATA
 ;

N_VARDATA
 : N_WORDDATA T_ENDL N_VARDATA
 | N_HALFDATA T_ENDL N_VARDATA
 | N_BYTEDATA T_ENDL N_VARDATA
 | N_SORADATA T_ENDL N_VARDATA
 |
 ;

N_WORDDATA
 : T_WORD N_WORDNUM N_WORDSNUM
 ;

N_WORDNUM
 : T_NUM N_REPEAT
 ;

N_REPEAT
 : T_COLON T_NUM
 |
 ;

N_WORDSNUM
 : T_COMMA N_WORDNUM N_WORDSNUM
 |
 ;

N_HALFDATA
 : T_NUM N_HALFNUM N_HALFSNUM
 ;

N_HALFNUM
 : T_NUM N_REPEAT
 ;

N_HALFSNUM
 : T_COMMA N_HALFNUM N_HALFSNUM
 |
 ;

N_BYTEDATA
 : T_NUM N_BYTENUM N_BYTESNUM
 ;

N_BYTENUM
 : T_NUM N_REPEAT
 ;

N_BYTESNUM
 : T_COMMA N_BYTENUM N_BYTESNUM
 |
 ;

N_SORADATA
 : N_SORA T_NUM
 ;

N_SORA
 : T_SPACE
 | T_ALIGN
 ;

N_TEXT
 : N_TEXTSEG N_CODE {$$ = new Text($[0], $[1])}
 ;

N_TEXTSEG
 : T_TEXT N_SEGADDR T_ENDL {$$ = $[1]}
 ;

N_CODE
 : N_STARTSEGID N_ORDERS {
    $$ = [...$[1]];
    $$[0].setSegmentID($[0])
  }
 ;

N_STARTSEGID
 : T_IDNAME T_COLON {$$ = $[0]}
 ;

N_ORDERS
 : N_ORDER N_ORDERS {
    let order = $[0]
    if (order instanceof Array) {
      $$ = [...order, ...$[1]]
    }
    else {
      $$ = [order, ...$[1]]
    }
  }
 | N_SUBSEGID N_ORDER N_ORDERS {
    let order = $[1]
    if (order instanceof Array) {
      $$ = [...order, ...$[2]]
    }
    else {
      $$ = [order, ...$[2]]
    }
    $$[0].setSegmentID($[0]);
  }
 | '' {$$ = []}
 ;

N_ORDER
 : N_COM T_ENDL {$$ = $[0] instanceof Array ? [...$[0]].map(value => new Order(value)) : new Order($[0])}
 ;

N_COM
 : T_RCOM T_REG T_COMMA T_REG T_COMMA T_REG {
  $$ = new InstructionR({
      op: $[0],
      rd: $[1],
      rs: $[3],
      rt: $[5],
      sa: 0
    })
  }
 | T_SRCOM T_REG {
    $$ = solveSRCOM($[0], $[1])
  }
 | T_SLLRCOM T_REG T_COMMA T_REG T_COMMA T_NUM {
    $$ = new InstructionR({
      op: $[0],
      rs: '$0',
      rd: $[3],
      rt: $[5],
      sa: $[7]
    })
  }
 | T_ICOM T_REG T_COMMA T_REG T_COMMA T_NUM {
    if ($[5] >>> 0 !== $[5] >>> 0 & 0xffff) {
      console.log('Warning: overflow')
    }
    $$ = new InstructionI({
      op: $[0],
      rt: $[1],
      rs: $[3],
      immediate: $[5] >>> 0 & 0xffff
    })
  }
 | T_SICOM T_REG T_COMMA T_NUM {
    $$ = new InstructionI({
      op: $[0],
      rs: '$0',
      rt: $[1],
      immediate: $[3] >>> 0 & 0xffff
    })
  }
 | T_LWICOM T_REG T_COMMA N_IMMEDIATE T_LPARA T_REG T_RPARA {
    $$ = new InstructionI({
      op: $[0],
      rt: $[1],
      immediate: $[3],
      rs: $[5]
    })
  }
 | T_JCOM N_ADDR {
    $$ = new InstructionJ({
      op: $[0],
      address: $[1]
    })
  }
 | T_BICOM T_REG T_COMMA T_REG T_COMMA N_IMMEDIATE {
    $$ = new InstructionI({
      op: $[0],
      rs: $[1],
      rt: $[3],
      immediate: $[5] >>> 0 & 0xffff
    })
  }
 | T_BZICOM T_REG T_COMMA N_IMMEDIATE {
    let rt = 0b00000
    if ($[0] === 'bgez') {
      rt = '$1'
    }
    else if ($[0] === 'bgezal') {
      rt = '$17'
    }
    else if ($[0] = 'bltzal') {
      rt = '$16'
    }
    $$ = new InstructionI({
      op: $[0],
      rs: $[1],
      rt: rt
      immediate: $[3] >>> 0 & 0xffff
    })
  }
 | T_DRCOM T_REG T_COMMA T_REG {
    $$ = new InstructionR({
      op: $[0],
      rs: $[1],
      rt: $[3],
      rd: '$0'
    })
  }
 | T_BREAK {
    $$ = new InstructionR({
      op: $[0],
      rs: '$0',
      rt: '$0',
      rd: '$0'
    })
  }
 | T_SYSCALL {
    $$ = new InstructionR({
      op: $[0],
      rs: '$0',
      rt: '$0',
      rd: '$0'
    })
  }
 | T_ERET {
    $$ = new InstructionR({
      op: $[0],
      rs: '$16',
      rt: '$0',
      rd: '$0'
    })
  }
 | T_PCOM T_REG {
    if ($[0] === 'push') {
      $$ = [
        new InstructionI({
          op: 'addi',
          rs: '$sp',
          rt: '$sp',
          immediate: -4 >>> 0 & 0xffff
        }),
        new InstructionI({
          op: 'sw',
          rt: '$7',
          rs: '$sp',
          immediate: 0
        })
      ]
    }
    else if ($[0] === 'pop') {
      $$ = [
        new InstructionI({
          op: 'lw',
          rt: '$7',
          rs: '$sp',
          immediate: 0
        }),
        new InstructionI({
          op: 'addi',
          rs: '$sp',
          rt: '$sp',
          immediate: 4 >>> 0 & 0xffff
        })
      ]
    }
  }
 | T_JBCOM T_REG T_COMMA T_REG T_COMMA N_IMMEDIATE {
    $$ = solveJBCOM($[0], $[1], $[3], $[5])
  }
 | T_NOP {
    $$ = new InstructionR({
      op: 'or',
      rs: '$0',
      rt: '$0',
      rd: '$0',
      sa: 0
    })
  }
 ;

N_IMMEDIATE
 : T_IDNAME {$$ = $[0]}
 | T_NUM {$$ = $[0]}
 ;

N_ADDR
 : T_IDNAME {$$ = $[0]}
 | T_NUM {$$ = $[0]}
 ;

N_SUBSEGID
 : T_IDNAME T_COLON {$$ = $[0]}
 ;

%%

const { yylex, YYLVAL } = require('./asm-lex')
const { InstructionR } = require('../build/minisys-assembly/instruction/InstructionR')
const { InstructionI } = require('../build/minisys-assembly/instruction/InstructionI')
const { InstructionJ } = require('../build/minisys-assembly/instruction/InstructionJ')
const { getRegisterId, getHigh6OpCode, getRLow6OpCode, solveJBCOM, solveSRCOM } = require('../build/minisys-assembly/utils')
const { Order, Text } = require('../build/minisys-assembly/text/TextTypes')

let segmentIdMap = new Map()