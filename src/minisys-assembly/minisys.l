%{
// console.log('Welcome')
%}

T_DATA .data
T_COMMA ,
T_LPARA \(
T_RPARA \)
T_TEXT .text
T_COLON :
T_ENDL [\n\t\r]+
T_REG $v[01]|$k[01]|$at|$gp|$sp|$a[0-3]|$t[0-9]|$s[0-9]|$i[01]|$sp|$ra|$zero|$[0-9][0-9]|$[0-9]
T_RCOM add|addu|sub|subu|and|or|xor|nor|slt|sltu|sllv|srlv|srav
T_ICOM addi|addiu|andi|ori|xori|slti|sltiu
T_SLLRCOM sll|srl|sra
T_LWICOM lb|lbu|lh|lhu|sb|sh|lw|sw
T_BICOM beq|bne
T_DRCOM mult|multu|div|divu|mfc0|mtc0|jalr
T_SICOM lui
T_BZICOM bgez|bgtz|blez|bltz|bgezal|bltzal
T_SRCOM mfhi|mflo|mthi|mtlo|jr
T_JCOM j|jal
T_BREAK break
T_SYSCALL syscall
T_ERET eret
T_JBCOM jl|jle|jg|jge
T_NOP nop
T_PCOM push|pop
T_BYTE .byte
T_HALF .half
T_WORD .word
T_FLOAT .float
T_DOUBLE .double
T_ASCII .ascii
T_ASCIIZ .asciiz
T_ALIGN .align
T_SPACE .space
T_NUM (0x[0-9a-fA-F]+)|([0-9]+)|(0b[01]+)
T_IDNAME (_|[a-zA-Z])(_|[0-9a-zA-Z])*
T_ASCIINUM [^ \n\r\t]

%%

{T_DATA} {return "T_DATA"}
{T_COMMA} {return "T_COMMA"}
{T_LPARA} {return "T_LPARA"}
{T_RPARA} {return "T_RPARA"}
{T_TEXT} {return "T_TEXT"}
{T_COLON} {return "T_COLON"}
{T_ENDL} {return "T_ENDL"}
{T_REG} {yylval = yytext;return "T_REG"}
{T_RCOM} {yylval = yytext;return "T_RCOM"}
{T_ICOM} {yylval = yytext;return "T_ICOM"}
{T_SLLRCOM} {yylval = yytext;return "T_SLLRCOM"}
{T_LWICOM} {yylval = yytext;return "T_LWICOM"}
{T_BICOM} {yylval = yytext;return "T_BICOM"}
{T_DRCOM} {yylval = yytext;return "T_DRCOM"}
{T_SICOM} {yylval = yytext;return "T_SICOM"}
{T_BZICOM} {yylval = yytext;return "T_BZICOM"}
{T_SRCOM} {yylval = yytext;return "T_SRCOM"}
{T_JCOM} {yylval = yytext;return "T_JCOM"}
{T_BREAK} {yylval = yytext;return "T_BREAK"}
{T_SYSCALL} {yylval = yytext;return "T_SYSCALL"}
{T_ERET} {yylval = yytext;return "T_ERET"}
{T_JBCOM} {yylval = yytext;return "T_JBCOM"}
{T_NOP} {yylval = yytext;return "T_NOP"}
{T_PCOM} {yylval = yytext;return "T_PCOM"}
{T_BYTE} {return "T_BYTE"}
{T_HALF} {return "T_HALF"}
{T_WORD} {return "T_WORD"}
{T_FLOAT} {return "T_FLOAT"}
{T_DOUBLE} {return "T_DOUBLE"}
{T_ASCII} {return "T_ASCII"}
{T_ASCIIZ} {return "T_ASCIIZ"}
{T_ALIGN} {return "T_ALIGN"}
{T_SPACE} {return "T_SPACE"}
{T_NUM} { 
    if (yytext.substring(0, 2) === '0b') {
      yylval = parseInt(yytext.substring(2), 2)
    }
    else {
      yylval = parseInt(yytext)
    } 
    return "T_NUM"
  }
{T_IDNAME} {yylval = yytext;return "T_IDNAME"}
{T_ASCIINUM} {return "T_ASCIINUM"}

%%
print = () => {}
//