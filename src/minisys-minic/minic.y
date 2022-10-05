%token IDENT VOID INT WHILE IF ELSE RETURN EQ NE LE GE AND OR DECNUM CONTINUE BREAK HEXNUM LSHIFT RSHIFT
%left OR
%left AND
%left EQ NE LE GE '<' '>'
%left '+' '-'
%left '|'
%left '&' '^'
%left '*' '/' '%'
%right LSHIFT RSHIFT
%right '!'
%right '~'
%right UMINUS
%right MPR

%start program

%%
program
 : decl_list {/*在这里书写语义动作*/}
 ;

decl_list
 : decl_list decl {/*在这里书写语义动作*/}
 | decl {/*在这里书写语义动作*/}
 ;

decl
 : var_decl {/*在这里书写语义动作*/}
 | fun_decl {/*在这里书写语义动作*/}
 ;

var_decl
 : type_spec IDENT ';' {/*在这里书写语义动作*/}
 | type_spec IDENT '[' int_literal ']' ';' {/*在这里书写语义动作*/}
 ;

type_spec
 : VOID {/*在这里书写语义动作*/}
 | INT {/*在这里书写语义动作*/} 
 ;

fun_decl
 : type_spec FUNCTION_IDENT '(' params ')' compound_stmt {/*在这里书写语义动作*/}
 | type_spec FUNCTION_IDENT '(' params ')' ';' {/*在这里书写语义动作*/}
 ;

FUNCTION_IDENT
 : IDENT {/*在这里书写语义动作*/}
 ;

params
 : param_list {/*在这里书写语义动作*/}
 | VOID {/*在这里书写语义动作*/}
 ;

param_list
 : param_list ',' param {/*在这里书写语义动作*/}
 | param {/*在这里书写语义动作*/}
 ;

param
 : type_spec IDENT {/*在这里书写语义动作*/}
 | type_spec IDENT '[' int_literal ']' {/*在这里书写语义动作*/}
 ;

stmt_list
 : stmt_list stmt {/*在这里书写语义动作*/}
 | '' {/*在这里书写语义动作*/}
 ;

stmt
 : expr_stmt {/*在这里书写语义动作*/}
 | block_stmt {/*在这里书写语义动作*/}
 | if_stmt {/*在这里书写语义动作*/}
 | while_stmt {/*在这里书写语义动作*/}
 | return_stmt {/*在这里书写语义动作*/}
 | continue_stmt {/*在这里书写语义动作*/}
 | break_stmt {/*在这里书写语义动作*/}
 ;

expr_stmt
 : IDENT '=' expr ';' {/*在这里书写语义动作*/}
 | IDENT '[' expr ']' '=' expr ';' {/*在这里书写语义动作*/}
 | '$' expr '=' expr ';' {/*在这里书写语义动作*/}
 | IDENT '(' args ')' ';' {/*在这里书写语义动作*/}
 ;

while_stmt
 : WHILE_IDENT '(' expr ')' stmt {/*在这里书写语义动作*/}
 ;

WHILE_IDENT
 : WHILE {/*在这里书写语义动作*/}
 ;

block_stmt
 : '{' stmt_list '}' {/*在这里书写语义动作*/}
 ;

compound_stmt
 : '{' local_decls stmt_list '}' {/*在这里书写语义动作*/}
 ;

local_decls
 : local_decls local_decl {/*在这里书写语义动作*/}
 | '' {/*在这里书写语义动作*/}
 ;

local_decl
 : type_spec IDENT ';' {/*在这里书写语义动作*/}
 | type_spec IDENT '[' int_literal ']' ';' {/*在这里书写语义动作*/}
 ;

if_stmt
 : IF '(' expr ')' stmt %prec UMINUS {/*在这里书写语义动作*/}
 | IF '(' expr ')' stmt ELSE stmt %prec MPR {/*在这里书写语义动作*/}
 ;

return_stmt
 : RETURN ';' {/*在这里书写语义动作*/}
 | RETURN expr ';' {/*在这里书写语义动作*/}
 ;

expr
 : expr OR expr {/*在这里书写语义动作*/}
 | expr EQ expr {/*在这里书写语义动作*/}
 | expr NE expr {/*在这里书写语义动作*/}
 | expr LE expr {/*在这里书写语义动作*/}
 | expr '<' expr {/*在这里书写语义动作*/}
 | expr GE expr {/*在这里书写语义动作*/}
 | expr '>' expr {/*在这里书写语义动作*/}
 | expr AND expr {/*在这里书写语义动作*/}
 | expr '+' expr {/*在这里书写语义动作*/}
 | expr '-' expr {/*在这里书写语义动作*/}
 | expr '*' expr {/*在这里书写语义动作*/}
 | expr '/' expr {/*在这里书写语义动作*/}
 | expr '%' expr {/*在这里书写语义动作*/}
 | '!' expr %prec UMINUS {/*在这里书写语义动作*/}
 | '-' expr %prec UMINUS {/*在这里书写语义动作*/}
 | '+' expr %prec UMINUS {/*在这里书写语义动作*/}
 | '$' expr %prec UMINUS {/*在这里书写语义动作*/}
 | '(' expr ')' {/*在这里书写语义动作*/}
 | IDENT {/*在这里书写语义动作*/}
 | IDENT '[' expr ']' {/*在这里书写语义动作*/}
 | IDENT '(' args ')' {/*在这里书写语义动作*/}
 | int_literal {/*在这里书写语义动作*/}
 | expr '&' expr {/*在这里书写语义动作*/}
 | expr '^' expr {/*在这里书写语义动作*/}
 | '~' expr {/*在这里书写语义动作*/}
 | expr LSHIFT expr {/*在这里书写语义动作*/}
 | expr RSHIFT expr {/*在这里书写语义动作*/}
 | expr '|' expr {/*在这里书写语义动作*/}
 ;

int_literal
 : DECNUM {/*在这里书写语义动作*/}
 | HEXNUM {/*在这里书写语义动作*/}
 ;

arg_list
 : arg_list ',' expr {/*在这里书写语义动作*/}
 | expr {/*在这里书写语义动作*/}
 ;

args
 : arg_list {/*在这里书写语义动作*/}
 | '' {/*在这里书写语义动作*/}
 ;

continue_stmt
 : CONTINUE ';' {/*在这里书写语义动作*/}
 ;

break_stmt
 : BREAK ';' {/*在这里书写语义动作*/}
 ;
%%

let {yylex, YYLVAL} = require('./minic-lex')

let temp = yylex
/* 这里是为了跳过T_WS重新封装了一下yylex */
yylex = () => {
    let token = temp()
    while (token === 'T_WS') {
        token = temp()
    }
    return token
}