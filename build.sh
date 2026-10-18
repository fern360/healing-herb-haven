#!/bin/sh
# Builds index.html (the GitHub Pages site) from healing-herbs-haven.html (the Claude artifact source).
# Run after every change: sh build.sh
cd "$(dirname "$0")"
{
  printf '%s' '<!doctype html><html lang="en"><head><meta charset="utf-8">'
  printf '%s' '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">'
  printf '%s' '<meta name="description" content="Healing Herb Haven: organic dried herbs, teas and spices. Natural wellness for a brighter you.">'
  printf '%s' '<link rel="icon" href="logo.jpg">'
  printf '%s' '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}</style>'
  printf '%s\n' '</head><body>'
  cat healing-herbs-haven.html
  printf '%s\n' '</body></html>'
} > index.html
echo "Built index.html"
