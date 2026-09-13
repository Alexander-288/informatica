# Pierwiastek kwadratowy — projekt strony i eksperymentu

Data: 2026-09-13
Katalog: `squareRoot/`
Język treści: polski (reszta galerii pozostaje po angielsku)

## Cel

Zrealizować szkolny projekt indywidualny „obliczanie pierwiastka kwadratowego":
strona internetowa prezentująca zagadnienie, programy w Pythonie i C++,
eksperyment porównujący czas miliona obliczeń funkcją biblioteczną i metodą
babilońską, oraz analiza wyników.

Projekt zastępuje obecną zawartość `squareRoot/` (anglojęzyczny wizualizator
Herona na jednej stronie). Strony piszemy od zera.

## Wymagania zadania i gdzie je spełniamy

| Wymaganie | Miejsce |
|---|---|
| Strona główna | `index.html`, sekcja 1–2 |
| Historia | `index.html`, sekcja 3 |
| Podstawy matematyczne | `pracownia.html`, sekcja 1 |
| Metoda babilońska | `pracownia.html`, sekcja 2 |
| Inne metody | `pracownia.html`, sekcja 3 |
| Pseudokod, C++, Python, arkusz | `pracownia.html`, sekcja 4 |
| Eksperyment | `pracownia.html`, sekcja 5 |
| Wyniki | `pracownia.html`, sekcja 6 |
| Wnioski | `pracownia.html`, sekcja 7 |
| Źródła | `index.html`, sekcja 5 |
| HTML + CSS, responsywność | `assets/projekt.css`, wspólne `../assets/site.css` |

## Architektura

Dwie strony statyczne, bez frameworków i bez zależności z CDN — tak jak reszta
repozytorium. Obie ładują wspólną powłokę galerii (`../assets/site.css`,
`../assets/theme.js` z przełącznikiem motywu) i lokalny `assets/projekt.css`.

### `squareRoot/index.html` — opowieść

Scrollytelling: sekcje wjeżdżają przy przewijaniu (`IntersectionObserver`,
klasa `.reveal`), bez przywiązania animacji do pozycji scrolla, żeby strona
działała też przy `prefers-reduced-motion`.

1. **Hero** — pytanie „Jak komputer liczy pierwiastek?" plus tło rysowane na canvasie.
2. **Wprowadzenie** — czym jest pierwiastek kwadratowy, dlaczego jego obliczenie
   nie jest operacją elementarną (w odróżnieniu od dodawania czy mnożenia).
3. **Historia** — tabliczka YBC 7289 (√2 w zapisie sześćdziesiątkowym, ok. 1800 p.n.e.),
   Heron z Aleksandrii i „Metrica", uogólnienie Newtona–Raphsona, epoka krzemu
   (pierwiastek jako pojedyncza instrukcja procesora).
4. **Zwrotnica** — przejście do pracowni.
5. **Źródła** — lista z odnośnikami.

### `squareRoot/pracownia.html` — pracownia

Jedna długa strona z przyklejoną boczną szyną sekcji (na wąskich ekranach szyna
zwija się do poziomego paska). Bez narracji — układ „obejrzyj to, potem tamto".

1. **Podstawy matematyczne** — definicja, warunek zbieżności, dowód zbieżności
   kwadratowej (podwojenie liczby poprawnych cyfr w kroku).
2. **Metoda babilońska** — wzór `x(k+1) = ½(x(k) + n/x(k))`, interpretacja
   geometryczna, **interaktywny wizualizator** pisany od zera: prostokąt o polu `n`
   zbiegający do kwadratu o boku `√n`, krok po kroku, z tabelą kolejnych przybliżeń.
3. **Inne metody** — bisekcja, metoda Newtona, *fast inverse square root*, CORDIC;
   wykres liczby iteracji potrzebnych każdej z nich.
4. **Implementacje** — pseudokod, Python, C++, arkusz kalkulacyjny.
   Kod z podświetlaniem składni (własny, ~40 linii regexów; bez bibliotek)
   i przyciskiem kopiowania. Arkusz `.xlsx` do pobrania plus replika siatki
   z formułami w HTML.
5. **Eksperyment** — metodyka: zakres `1..1 000 000`, 5 prób, dokładność `1e-15`
   (kryterium względne), suma kontrolna jako bariera optymalizatora, rotacja
   kolejności metod między próbami, zegary `time.perf_counter` i
   `std::chrono::steady_clock`.
6. **Wyniki** — wymagana tabela 5 prób + średnia, osobno dla Pythona i C++,
   plus wykresy rysowane z `wyniki.json`: słupki czasów, histogram liczby
   iteracji, krzywa zbieżności, rozkład błędu w ULP.
7. **Wnioski** — analiza.

### Pliki

```
squareRoot/
  index.html
  pracownia.html
  assets/
    projekt.css      styl obu stron
    scrolly.js       ujawnianie sekcji, szyna nawigacji, IntersectionObserver
    heron.js         wizualizator metody babilońskiej (canvas)
    wykresy.js       wykresy SVG z wyniki.json
    kod.js           podświetlanie składni + kopiowanie bloków kodu
  program/
    python/sqrt_metody.py  benchmark.py  analiza.py  testy/
    cpp/sqrt_metody.hpp  benchmark.cpp  build.bat  build.sh
    excel/metoda-babilonska.xlsx  generuj_arkusz.py
  wyniki/*.csv       surowe pomiary
  wyniki.json        dane dla strony, generowane z CSV
  card.svg  project.json  README.md
```

## Programy

Programy przejmujemy z wcześniejszego projektu autora (`Downloads/Random website`)
po przeczytaniu i sprawdzeniu — nie na wiarę. Ich konstrukcja zostaje, bo
rozwiązuje realne pułapki pomiarowe:

- **Trzy warianty zamiast dwóch.** `sqrt()`, Heron z naiwnym startem `x0 = n`
  oraz Heron ze startem z połowienia wykładnika (`frexp`/`ldexp`, przybliżenie
  liniowe `0,5m + 0,5` na `m ∈ [0,5; 2)`). Wymagana tabela porównuje dwie
  pierwsze kolumny; trzecia jest materiałem do wniosków.
- **Powielona pętla** w `heron_naive` i `heron_fast` jest celowa — parametryzacja
  funkcją startową dodałaby narzut wywołania wewnątrz mierzonej pętli.
- **Suma kontrolna** akumulowana w każdej pętli chroni przed usunięciem
  obliczeń jako martwego kodu; w C++ dodatkowo bariera `asm volatile`.
- **Rotacja kolejności metod** między próbami rozkłada efekt „zimnego"
  procesora równomiernie.
- **Błąd w ULP** zamiast różnicy bezwzględnej — miara niezależna od rzędu
  wielkości.

Kryterium stopu: `|x(k+1) − x(k)| ≤ 1e-15 · x(k+1)`, maksymalnie 100 iteracji.

## Pomiary

Oba benchmarki uruchamiamy na nowo w tym repozytorium — żadnych liczb
przeniesionych z poprzedniego projektu.

- Python 3.11.9 (CPython), `python program/python/benchmark.py`
- C++ przez `g++ 16.2.0` z `C:\Users\Olek\scoop\apps\mingw\current\bin\g++.exe`
  (scoop nie utworzył shimów, wywołujemy pełną ścieżką),
  flagi `-O2 -std=c++17 -march=native`

Do wyników zapisujemy środowisko: model procesora, system, wersję kompilatora,
flagi, zegar. Strona nie liczy niczego sama — czyta `wyniki.json`.

Jeśli świeży pomiar rozejdzie się z wcześniejszym, na stronie podajemy świeży.

## Integracja z galerią

- `project.json` — tytuł i opis po polsku, `status: done`, tagi
  (`python`, `c++`, `algorytmy`, `eksperyment`), `demo`/`source` bez zmian.
- `card.svg` — przerysowany pod nowy temat; nadal `currentColor` i `class="accent"`,
  bo galeria wkleja go inline.
- `README.md` — po polsku: co to jest, jak uruchomić oba benchmarki i testy.
- `tree.json` i `projects.json` regeneruje CI; nie edytujemy ręcznie.

## Testy i weryfikacja

- Testy jednostkowe metod w `pytest` (poprawność względem `math.sqrt`,
  przypadki brzegowe: 0, liczby ujemne, bardzo małe i bardzo duże `n`,
  zbieżność w zadanej liczbie iteracji).
- Sprawdzenie zgodności Pythona i C++ przez sumę kontrolną całego zakresu.
- Weryfikacja obu stron w przeglądarce: jasny i ciemny motyw, szerokości
  360 px / 768 px / 1440 px, brak poziomego przewijania, `prefers-reduced-motion`.

## Czego nie robimy

- Bez przełącznika PL/EN — treść jest po polsku.
- Bez bibliotek zewnętrznych i CDN-ów.
- Bez przenoszenia stron z poprzedniego projektu — piszemy je od zera.
