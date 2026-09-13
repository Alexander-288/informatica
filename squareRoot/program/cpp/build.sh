#!/bin/sh
# Kompilacja eksperymentu. Flagi sa czescia metodyki pomiaru.
#
# g++ zainstalowano przez scoop, ktory nie utworzyl shimow - kompilator
# wywolujemy pelna sciezka. Jesli masz g++ w PATH, uzyj po prostu "g++".
GPP="${GPP:-$HOME/scoop/apps/mingw/current/bin/g++.exe}"
[ -x "$GPP" ] || GPP=g++
"$GPP" -O2 -std=c++17 -march=native -o benchmark.exe benchmark.cpp && echo "zbudowano benchmark.exe"
