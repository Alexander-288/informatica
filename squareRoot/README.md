# Pierwiastek kwadratowy

Projekt szkolny o tym, skąd komputer bierze wynik `sqrt()` i czy metoda
babilońska, znana od blisko czterech tysięcy lat, daje coś gorszego.

Składa się z dwóch stron, trzech programów i jednego eksperymentu:

- **`index.html`** — opowieść: czym jest pierwiastek, historia od tabliczki
  YBC 7289 przez Herona i Newtona po instrukcję procesora, źródła.
- **`pracownia.html`** — teoria, interaktywny wizualizator, cztery
  implementacje, metodyka pomiaru, wyniki i wnioski.
- **`program/`** — Python, C++ i arkusz kalkulacyjny.
- **`wyniki/`** — surowe pomiary w plikach CSV.
- **`wyniki.json`** — to samo spakowane dla stron. **Plik generowany, nie
  edytuj go ręcznie** — powstaje z `program/python/eksport.py`.

## Co z tego wyszło

Metoda babilońska **nie jest mniej dokładna** od funkcji bibliotecznej.
Na całym zakresie `1..1 000 000` błąd obu wariantów Herona względem
`math.sqrt` nie przekracza **1 ULP**, a średnio wynosi 0,249112 ULP.
Suma kontrolna zakresu to `666667166.4588418` i jest identyczna
w Pythonie i w C++.

Cała różnica jest w koszcie dojścia do wyniku.

| Język  | `sqrt()`   | Heron naiwny | Heron szybki |
|--------|------------|--------------|--------------|
| Python | 0,083042 s | 2,361784 s   | 1,134124 s   |
| C++    | 0,001687 s | 0,086120 s   | 0,043364 s   |

Lepszy punkt startowy (połowienie wykładnika liczby zmiennoprzecinkowej)
skraca liczbę iteracji dla `n = 10⁶` z 15 do 3 i mniej więcej połowi czas,
ale przepaści między pętlą a instrukcją procesora nie likwiduje.

Pomiary wykonano na Intel Core i7-9750HF, Windows 11, przy zasilaniu
sieciowym. Strona nie liczy niczego sama — czyta `wyniki.json`.

## Jak uruchomić

### Python

```sh
cd program/python
python benchmark.py            # 5 prób po milion pierwiastków, ~15 s
python analiza.py              # dokładność i zbieżność, ~1 min
python eksport.py              # spakowanie wyników do wyniki.json
```

Benchmark przyjmuje `--trials` i `--max`, na przykład
`python benchmark.py --trials 3 --max 200000`.

Testy jednostkowe:

```sh
cd program/python
python -m pytest testy -q
```

### C++

Flagi kompilacji są częścią metodyki i nie należy ich zmieniać bez
odnotowania tego w wynikach.

```sh
cd program/cpp
sh build.sh        # albo build.bat na Windowsie
./benchmark.exe
```

**Uwaga o `g++`.** Kompilator zainstalowano przez **scoop**, a scoop nie
utworzył shimów, więc nie ma go w `PATH`. Skrypty budujące wywołują go
pełną ścieżką `~/scoop/apps/mingw/current/bin/g++.exe`, a gdy tam go nie
ma, wracają do zwykłego `g++`.

### Arkusz

```sh
cd program/excel
python generuj_arkusz.py
```

Generator wymaga `openpyxl`. Formuły zapisuje po angielsku (`SQRT`, `ABS`),
bo tak Excel przechowuje je wewnętrznie — w polskim Excelu widać
`PIERWIASTEK` i `MODUŁ.LICZBY`.

## Po zmianie pomiarów

Kolejność ma znaczenie: `benchmark.py` i `benchmark.exe` zapisują pliki CSV,
`analiza.py` dokłada dokładność i zbieżność, a dopiero `eksport.py` buduje
z nich `wyniki.json`, z którego czyta strona. Bez ostatniego kroku strona
pokaże stare liczby.
