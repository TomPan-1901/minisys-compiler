%token T_DATA T_ENDL T_NUM T_IDNAME T_COLON T_WORD T_COMMA T_BYTE
%token T_SPACE T_ALIGN T_TEXT T_ERET T_SYSCALL T_BREAK
%token T_REG T_RCOM T_SRCOM T_JBCOM T_JCOM T_HALF T_PCOM
%token T_DRCOM T_BZICOM T_BICOM T_LWICOM T_SICOM T_ICOM T_SLLRCOM T_NOP
%token T_LPARA T_RPARA

%start N_PRO

%%

N_PRO
 : N_DATA N_TEXT {$$attr = solveVariableName({data: $attr[0], text: $attr[1]})}
 ;

N_DATA
 : N_DATASEG N_VARS {$$attr = new Data($attr[0], $attr[1])}
 | '' {$$attr = new Data(0, [])}
 ;

N_DATASEG
 : T_DATA N_SEGADDR T_ENDL {$$attr = $attr[1]}
 ;

N_SEGADDR
 : T_NUM {$$attr = $attr[0]}
 | '' {$$attr = 0}
 ;

N_VARS
 : N_VAR N_VARS {$$attr = [$attr[0], ...$attr[1]]}
 | '' {$$attr = []}
 ;

N_VAR
 : T_IDNAME T_COLON N_VARDATA {$$attr = new Variable($attr[0], $attr[2])}
 ;

N_VARDATA
 : N_WORDDATA T_ENDL N_VARDATA {$$attr = [$attr[0], ...$attr[2]]}
 | N_HALFDATA T_ENDL N_VARDATA {$$attr = [$attr[0], ...$attr[2]]}
 | N_BYTEDATA T_ENDL N_VARDATA {$$attr = [$attr[0], ...$attr[2]]}
 | N_SORADATA T_ENDL N_VARDATA {$$attr = [$attr[0], ...$attr[2]]}
 | '' {$$attr = []}
 ;

N_WORDDATA
 : T_WORD N_WORDNUM N_WORDSNUM {$$attr = new DataSegment('word', [...$attr[1], ...$attr[2]])}
 ;

N_WORDNUM
 : T_NUM N_REPEAT {$$attr = new Array($attr[1]).fill($attr[0])}
 ;

N_REPEAT
 : T_COLON T_NUM {$$attr = $attr[1]}
 | '' {$$attr = 1}
 ;

N_WORDSNUM
 : T_COMMA N_WORDNUM N_WORDSNUM {$$attr = [...$attr[1], ...$attr[2]]}
 | '' {$$attr = []}
 ;

N_HALFDATA
 : T_HALF N_HALFNUM N_HALFSNUM {$$attr = new DataSegment('half', [...$attr[1], ...$attr[2]])}
 ;

N_HALFNUM
 : T_NUM N_REPEAT {$$attr = new Array($attr[1]).fill($attr[0])}
 ;

N_HALFSNUM
 : T_COMMA N_HALFNUM N_HALFSNUM {$$attr = [...$attr[1], ...$attr[2]]}
 | '' {$$attr = []}
 ;

N_BYTEDATA
 : T_BYTE N_BYTENUM N_BYTESNUM {$$attr = new DataSegment('byte', [...$attr[1], ...$attr[2]])}
 ;

N_BYTENUM
 : T_NUM N_REPEAT {$$attr = new Array($attr[1]).fill($attr[0])}
 ;

N_BYTESNUM
 : T_COMMA N_BYTENUM N_BYTESNUM {$$attr = [...$attr[1], ...$attr[2]]}
 | '' {$$attr = []}
 ;

N_SORADATA
 : N_SORA T_NUM {$$attr = new DataSegment($attr[0], $attr[1])}
 ;

N_SORA
 : T_SPACE {$$attr = $attr[0]}
 | T_ALIGN {$$attr = $attr[0]}
 ;

N_TEXT
 : N_TEXTSEG N_CODE {$$attr = new Text($attr[0], $attr[1])}
 ;

N_TEXTSEG
 : T_TEXT N_SEGADDR T_ENDL {$$attr = $attr[1]}
 ;

N_CODE
 : N_STARTSEGID N_ORDERS {
    $$attr = [...$attr[1]];
    $$attr[0].setSegmentID($attr[0])
  }
 ;

N_STARTSEGID
 : T_IDNAME T_COLON {$$attr = $attr[0]}
 ;

N_ORDERS
 : N_ORDER N_ORDERS {
    let order = $attr[0]
    if (order instanceof Array) {
      $$attr = [...order, ...$attr[1]]
    }
    else {
      $$attr = [order, ...$attr[1]]
    }
  }
 | N_SUBSEGID N_ORDER N_ORDERS {
    let order = $attr[1]
    if (order instanceof Array) {
      $$attr = [...order, ...$attr[2]]
    }
    else {
      $$attr = [order, ...$attr[2]]
    }
    $$attr[0].setSegmentID($attr[0]);
  }
 | '' {$$attr = []}
 ;

N_ORDER
 : N_COM T_ENDL {$$attr = $attr[0] instanceof Array ? [...$attr[0]].map(value => new Order(value)) : new Order($attr[0])}
 ;

N_COM
 : T_RCOM T_REG T_COMMA T_REG T_COMMA T_REG {
    if ($attr[0] === 'sllv' || $attr[0] === 'srlv' || $attr[0] === 'srav') {
      $$attr = new InstructionR({
          op: $attr[0],
          rd: $attr[1],
          rt: $attr[3],
          rs: $attr[5],
          sa: 0
        })
    }
    else {
      $$attr = new InstructionR({
          op: $attr[0],
          rd: $attr[1],
          rs: $attr[3],
          rt: $attr[5],
          sa: 0
        })
    }
  }
 | T_SRCOM T_REG {
    $$attr = solveSRCOM($attr[0], $attr[1])
  }
 | T_SLLRCOM T_REG T_COMMA T_REG T_COMMA T_NUM {
    $$attr = new InstructionR({
      op: $attr[0],
      rs: '$0',
      rd: $attr[1],
      rt: $attr[3],
      sa: $attr[5]
    })
  }
 | T_ICOM T_REG T_COMMA T_REG T_COMMA T_NUM {
    if ($attr[5] >>> 0 !== $attr[5] >>> 0 & 0xffff) {
      console.log('Warning: overflow')
    }
    $$attr = new InstructionI({
      op: $attr[0],
      rt: $attr[1],
      rs: $attr[3],
      immediate: typeof $attr[5] === 'number' ? ($attr[5] >>> 0 & 0xffff) : $attr[5]
    })
  }
 | T_SICOM T_REG T_COMMA T_NUM {
    $$attr = new InstructionI({
      op: $attr[0],
      rs: '$0',
      rt: $attr[1],
      immediate: typeof $attr[3] === 'number' ? ($attr[3] >>> 0 & 0xffff) : $attr[3]
    })
  }
 | T_LWICOM T_REG T_COMMA N_IMMEDIATE T_LPARA T_REG T_RPARA {
    $$attr = new InstructionI({
      op: $attr[0],
      rt: $attr[1],
      immediate: typeof $attr[3] === 'number' ? ($attr[3] >>> 0 & 0xffff) : $attr[3],
      rs: $attr[5]
    })
  }
 | T_JCOM N_ADDR {
    $$attr = new InstructionJ({
      op: $attr[0],
      address: $attr[1]
    })
  }
 | T_BICOM T_REG T_COMMA T_REG T_COMMA N_IMMEDIATE {
    $$attr = new InstructionI({
      op: $attr[0],
      rs: $attr[1],
      rt: $attr[3],
      immediate: typeof $attr[5] === 'number' ? ($attr[5] >>> 0 & 0xffff) : $attr[5]
    })
  }
 | T_BZICOM T_REG T_COMMA N_IMMEDIATE {
    let rt = 0b00000
    if ($attr[0] === 'bgez') {
      rt = '$1'
    }
    else if ($attr[0] === 'bgezal') {
      rt = '$17'
    }
    else if ($attr[0] = 'bltzal') {
      rt = '$16'
    }
    $$attr = new InstructionI({
      op: $attr[0],
      rs: $attr[1],
      rt: rt
      immediate: typeof $attr[3] === 'number' ? ($attr[3] >>> 0 & 0xffff) : $attr[3]
    })
  }
 | T_DRCOM T_REG T_COMMA T_REG {
    if ($[0] === 'mult' || $[0] === 'multu' || $[0] === 'div' || $[0] === 'divu') {
      $$attr = new InstructionR({
        op: $attr[0],
        rs: $attr[1],
        rt: $attr[3],
        rd: '$0'
      })
    }
    else if ($[0] === 'mfc0' || $[0] === 'mtc0') {
      $$attr = new InstructionR({
        op: $attr[0],
        rs: '$0',
        rt: $attr[1],
        rd: $attr[3]
      })
    }
    else if ($[0] === 'jalr') {
      $$attr = new InstructionR({
        op: $attr[0],
        rs: $attr[3],
        rt: '$0',
        rd: '$attr[1]'
      })
    }
  }
 | T_BREAK {
    $$attr = new InstructionR({
      op: $attr[0],
      rs: '$0',
      rt: '$0',
      rd: '$0'
    })
  }
 | T_SYSCALL {
    $$attr = new InstructionR({
      op: $attr[0],
      rs: '$0',
      rt: '$0',
      rd: '$0'
    })
  }
 | T_ERET {
    $$attr = new InstructionR({
      op: $attr[0],
      rs: '$16',
      rt: '$0',
      rd: '$0'
    })
  }
 | T_PCOM T_REG {
    if ($attr[0] === 'push') {
      $$attr = [
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
    else if ($attr[0] === 'pop') {
      $$attr = [
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
    $$attr = solveJBCOM($attr[0], $attr[1], $attr[3], $attr[5])
  }
 | T_NOP {
    $$attr = new InstructionR({
      op: 'nop',
      rs: '$0',
      rt: '$0',
      rd: '$0',
      sa: 0
    })
  }
 ;

N_IMMEDIATE
 : T_IDNAME {$$attr = $attr[0]}
 | T_NUM {$$attr = $attr[0]}
 ;

N_ADDR
 : T_IDNAME {$$attr = $attr[0]}
 | T_NUM {$$attr = $attr[0]}
 ;

N_SUBSEGID
 : T_IDNAME T_COLON {$$attr = $attr[0]}
 ;

%%

const { yylex, YYLVAL } = require('./asm-lex')
const { InstructionR } = require('../build/minisys-assembly/instruction/InstructionR')
const { InstructionI } = require('../build/minisys-assembly/instruction/InstructionI')
const { InstructionJ } = require('../build/minisys-assembly/instruction/InstructionJ')
const { getRegisterId, getHigh6OpCode, getRLow6OpCode, solveJBCOM, solveSRCOM, solveVariableName } = require('../build/minisys-assembly/utils')
const { Order, Text } = require('../build/minisys-assembly/text/TextTypes')
const { DataSegment, Variable, Data } = require('../build/minisys-assembly/Data/DataTypes')

let segmentIdMap = new Map()