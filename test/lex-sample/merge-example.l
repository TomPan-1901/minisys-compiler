%{
  console.log('Example')
%}

%%

a {console.log('action a')}

a+ {console.log('action a+')}

%%

while (true) {
  let token = yylex()
  if (token === null) {
    break
  }
}