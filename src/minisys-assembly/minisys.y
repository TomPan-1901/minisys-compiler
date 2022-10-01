%token T_DATA T_ENDL T_NUM T_IDNAME T_COLON T_WORD T_COMMA
%token T_SPACE T_ALIGN T_TEXT T_ERET T_SYSCALL T_BREAK
%token T_REG T_RCOM T_SRCOM T_JBCOM T_JCOM T_HALF T_PCOM
%token T_DRCOM T_BZICOM T_BICOM T_LWICOM T_SICOM T_ICOM T_SLLRCOM T_NOP

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
 : T_NUM
 |
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
 : N_TEXTSEG N_CODE
 ;

N_TEXTSEG
 : T_TEXT N_SEGADDR T_ENDL
 ;

N_CODE
 : N_STARTSEGID N_ORDERS
 ;

N_STARTSEGID
 : T_IDNAME T_COLON
 ;

N_ORDERS
 : N_ORDER N_ORDERS
 | N_SUBSEGID N_ORDER N_ORDERS
 |
 ;

N_ORDER
 : N_COM T_ENDL
 ;

N_COM
 : T_RCOM T_REG T_COMMA T_REG T_COMMA T_REG
 | T_SRCOM T_REG
 | T_SLLRCOM T_REG T_COMMA T_REG T_COMMA T_NUM
 | T_ICOM T_REG T_COMMA T_REG T_COMMA T_NUM
 | T_SICOM T_REG T_COMMA T_NUM
 | T_LWICOM T_REG T_COMMA N_IMMEDIATE T_REG
 | T_JCOM N_ADDR
 | T_BICOM T_REG T_COMMA T_REG T_COMMA N_IMMEDIATE
 | T_BZICOM T_REG T_COMMA N_IMMEDIATE
 | T_DRCOM T_REG T_COMMA T_REG
 | T_BREAK
 | T_SYSCALL
 | T_ERET
 | T_PCOM T_REG
 | T_JBCOM T_REG T_COMMA T_REG T_COMMA N_IMMEDIATE
 | T_NOP
 ;

N_IMMEDIATE
 : T_IDNAME
 | T_NUM
 ;

N_ADDR
 : T_IDNAME
 | T_NUM
 ;

N_SUBSEGID
 : T_IDNAME T_COLON
 ;

%%

//