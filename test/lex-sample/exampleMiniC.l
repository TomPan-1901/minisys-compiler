%{
let line = 0
%}

ws [ \n\t\r]+
digit [0-9]
letter [A-Za-z]
id {letter}({letter}|{digit})*
number {digit}+(.{digit}+)?(E[+-]?{digit}+)?
%%

{ws} {return "ws"}
int {return "int";}
float {return "float";}
double {return "double";}
void {return "void";}
if  {return "if";}
else  {return "else";}
while {return "while";}
return {return "return";}
static {return "static";}
{id} {return "id";}
{number} {return yytext;}
"+" {return "+";}
"-" {return "-";}
"*" {return "*";}
"/" {return "/";}
"%" {return "%";}
"+=" {return "+=";}
"-=" {return "-=";}
"*=" {return "*=";}
"/=" {return "/=";}
"%=" {return "%=";}
"&&" {return "&&";}
"||" {return "||";}
"!" {return "!";}
"<=" {return "<=";}
">=" {return ">=";}
"=" {return "=";}
"!=" {return "!=";}
"==" {return "==";}
"<" {return "<";}
">" {return ">";}
"(" {return "(";}
")" {return ")";}
"{" {return "{";}
"}" {return "}";}
"[" {return "[";}
"]" {return "]";}
";" {++line;return ";";}
"," {return ",";}
%%

let main = () => {
  while (true) {
    let token = yylex()
    if (token === null) {
      break
    }
    console.log(token)
  }
}
if (require.main === module) {
  main()
}