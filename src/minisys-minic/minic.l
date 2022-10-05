%{
// console.log('Welcome')
%}

digit ([0-9])|([1-9][0-9]*)
letter [a-zA-Z]
id {letter}({letter}|{digit})*
num {digit}[1-9]*
hex 0(x|X)({letter}|[0-9])*
%%
"void" {return "VOID"}
"continue" {return "CONTINUE"}
"if" {return "IF"}
"while" {return "WHILE"}
"else" {return "ELSE"}
"break" {return "BREAK"}
"int" {return "INT"}
"return" {return "RETURN"}
"||" {return "OR"}
"&&" {return "AND"}
{id} {yylval = yytext; return "IDENT"}
{hex} {yylval = parseInt(yytext, 16); return "HEXNUM"}
{num} {yylval = parseInt(yytext, 10); return "DECNUM"}
"<=" {return "LE"}
">=" {return "GE"}
"==" {return "EQ"}
"!=" {return "NE"}
">" {return '>'}
"<" {return "<"}
"," {return ","}
";" {return ";"}
"{" {return "{"}
"}" {return "}"}
"%" {return "%"}
"*" {return "*"}
"+" {return "+"}
"-" {return "-"}
"/" {return "/"}
"=" {return "="}
"(" {return "("}
")" {return ")"}
"~" {return "~"}
"&" {return "&"}
"^" {return "^"}
"[" {return "["}
"]" {return "]"}
"<<" {return "LSHIFT"}
">>" {return "RSHIFT"}
"|" {return "|"}
"$" {return "$"}
"!" {return "!"}
[ \n\t\r]+ {return "T_WS"}
%%
//