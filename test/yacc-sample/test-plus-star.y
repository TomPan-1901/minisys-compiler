%token id
%left '+'
%left '*'
%start E

%%
E
 : E '+' E
 | E '*' E
 | id
 ;
%%
// nothing