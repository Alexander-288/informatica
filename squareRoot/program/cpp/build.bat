@echo off
REM Kompilacja eksperymentu. Flagi sa czescia metodyki pomiaru.
REM g++ zainstalowano przez scoop, ktory nie utworzyl shimow.
set GPP=%USERPROFILE%\scoop\apps\mingw\current\bin\g++.exe
if not exist "%GPP%" set GPP=g++
"%GPP%" -O2 -std=c++17 -march=native -o benchmark.exe benchmark.cpp
if %errorlevel%==0 echo zbudowano benchmark.exe
