%{
  let a = 1
%}

vowel [aeiouAEIOU]{id}
nonvowel [^aeiouAEIOU\n\r\t ]{id}
id [a-zA-Z]*

%%

{vowel} {
  yylval = yytext + 'ay'
  print(yylval)
  return yytext
}

{nonvowel} {
  yylval = yytext + 'by'
  print(yylval)
  return yytext
}

%%
