%{
// nothing
%}

id [0-9]+

%%

{id} {
  yylval = parseInt(yytext)
  return "id"
}

"*" {
  return "*"
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