%{
console.log('Welcome')
%}

example1 (a|b)*a(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)(a|b)

%%

{example1} { console.log('this is pattern 1');console.log(yytext)
}

%%
/**/