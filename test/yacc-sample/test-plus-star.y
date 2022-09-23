%token id
%left '+' '-'
%left '*' '/'
%start E

%%
E
 : E '+' E
 | E '-' E
 | E '*' E
 | E '/' E
 | id
 ;
%%
const {yylex, YYLVAL} = require('./calc-lex.js')