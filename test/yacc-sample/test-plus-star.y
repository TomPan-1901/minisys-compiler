%token id ENDL
%left '+' '-'
%left '*' '/'
%right UMINUS

%start lines

%%
lines
 : lines E ENDL {console.log($[1])}
 | lines ENDL
 |
 | error ENDL {console.log('reenter previous line')}
 ;

E
 : E '+' E {$$ = $[0] + $[2]}
 | E '-' E {$$ = $[0] - $[2]}
 | E '*' E {$$ = $[0] * $[2]}
 | E '/' E {$$ = $[0] / $[2]}
 | '(' E ')' {$$ = $[1]}
 | '-' E %prec UMINUS {$$ = -$[1]}
 | id {$$ = $[0]}
 | error ENDL {console.log('error E')}
 | error {console.log('error E')}
 ;
%%
const {yylex, YYLVAL} = require('./calc-lex.js')