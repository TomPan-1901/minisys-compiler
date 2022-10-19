%{
// nothing
%}

id [0-9]+
ENDL [\t\n\r]+

%%

{id} {
  yylval = parseInt(yytext)
  return "id"
}
{ENDL} {
  return "ENDL"
}

"*" {
  return "*"
}

"(" {
  return "("
}

")" {
  return ")"
}

"+" {
  return "+"
}

"-" {
  return "-"
}

"/" {
  return "/"
}

%%

// nothing