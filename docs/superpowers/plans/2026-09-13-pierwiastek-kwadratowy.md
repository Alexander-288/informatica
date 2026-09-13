# Pierwiastek kwadratowy — plan wdrożenia

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować w `squareRoot/` kompletny projekt szkolny o obliczaniu pierwiastka kwadratowego: dwie strony po polsku, programy w Pythonie i C++, arkusz kalkulacyjny, zmierzony eksperyment i analiza.

**Architecture:** Statyczne strony bez frameworków, korzystające ze wspólnej powłoki galerii (`assets/site.css`, `assets/theme.js`). Programy w `squareRoot/program/` generują pliki CSV w `squareRoot/wyniki/`, a skrypt eksportu pakuje je w jeden `squareRoot/wyniki.json`, który czytają strony. Strona nie liczy nic sama.

**Tech Stack:** HTML, CSS (zmienne z `site.css`), JavaScript ES modules bez zależności, Python 3.11 + pytest + openpyxl, C++17 kompilowany przez g++ 16.2.0.

**Spec:** `docs/superpowers/specs/2026-09-13-pierwiastek-kwadratowy-design.md`

**Ważne ścieżki:**
- g++ nie jest w `PATH`: `C:\Users\Olek\scoop\apps\mingw\current\bin\g++.exe`
- źródło programów do przejrzenia i adaptacji: `C:\Users\Olek\Downloads\Random website\program\`

---

### Task 1: Szkielet katalogu

**Files:**
- Delete: `squareRoot/index.html` (stary, anglojęzyczny wizualizator), `squareRoot/README.md`
- Create: `squareRoot/assets/`, `squareRoot/program/{python,cpp,excel}/`, `squareRoot/wyniki/`

- [ ] **Step 1:** Usuń `squareRoot/index.html` i `squareRoot/README.md` — piszemy od zera.
- [ ] **Step 2:** Załóż puste katalogi wymienione wyżej.
- [ ] **Step 3:** Commit: `chore(squareRoot): clear the old page, lay out the new directories`

---

### Task 2: Metody w Pythonie (TDD)

**Files:**
- Create: `squareRoot/program/python/sqrt_metody.py`
- Test: `squareRoot/program/python/testy/test_sqrt_metody.py`

Moduł zawiera wyłącznie algorytmy — bez pomiaru czasu i bez we/wy, żeby dało się go testować niezależnie od eksperymentu.

**Publiczne API (nazwy muszą być dokładnie takie, używają ich dalsze zadania):**

```python
EPS = 1e-15
MAX_ITER = 100

def heron_naive(n, eps=EPS, max_iter=MAX_ITER) -> float
def heron_fast(n, eps=EPS, max_iter=MAX_ITER) -> float
def heron_trace(n, seed="fast", eps=EPS, max_iter=MAX_ITER) -> list
def ulp_error(a, b) -> int
def liczba_iteracji(n, seed="fast") -> int
```

- [ ] **Step 1: Napisz testy, które nie przechodzą**

```python
import math
import pytest
from sqrt_metody import heron_naive, heron_fast, heron_trace, ulp_error, liczba_iteracji


@pytest.mark.parametrize("metoda", [heron_naive, heron_fast])
@pytest.mark.parametrize("n", [1, 2, 3, 9, 10, 1e-8, 1e6, 1e12, 2**52])
def test_zgodnosc_z_math_sqrt(metoda, n):
    assert ulp_error(metoda(n), math.sqrt(n)) <= 1


@pytest.mark.parametrize("metoda", [heron_naive, heron_fast])
def test_zero(metoda):
    assert metoda(0) == 0.0


@pytest.mark.parametrize("metoda", [heron_naive, heron_fast])
def test_liczba_ujemna(metoda):
    with pytest.raises(ValueError):
        metoda(-1)


def test_ulp_error_dla_identycznych():
    assert ulp_error(1.5, 1.5) == 0


def test_ulp_error_dla_sasiadow():
    assert ulp_error(1.0, math.nextafter(1.0, 2.0)) == 1


def test_trace_zaczyna_sie_od_punktu_startowego():
    assert heron_trace(2, seed="naive")[0] == 2.0


def test_trace_konczy_sie_na_wyniku():
    assert ulp_error(heron_trace(2)[-1], math.sqrt(2)) <= 1


def test_szybki_start_potrzebuje_mniej_iteracji():
    assert liczba_iteracji(10**6, "fast") < liczba_iteracji(10**6, "naive")


def test_trace_ma_zly_seed():
    with pytest.raises(ValueError):
        heron_trace(2, seed="bzdura")
```

- [ ] **Step 2: Uruchom testy, upewnij się, że padają**

Run: `cd squareRoot/program/python && python -m pytest testy -q`
Expected: FAIL — `ModuleNotFoundError: No module named 'sqrt_metody'`

- [ ] **Step 3: Napisz `sqrt_metody.py`**

Kluczowe decyzje do zakodowania i opisania w komentarzach:
- `heron_naive` startuje z `x = float(n)`; `heron_fast` z połowienia wykładnika:
  `m, e = math.frexp(n)`, sprowadź `e` do parzystej (`m *= 2; e -= 1`), potem
  `x = math.ldexp(0.5 * m + 0.5, e // 2)`. Przybliżenie liniowe `0,5m + 0,5`
  ma na `m ∈ [0,5; 2)` maksymalny błąd względny 6,07%.
- Pętle w `heron_naive` i `heron_fast` są **powielone celowo** — parametryzacja
  funkcją startową dodałaby narzut wywołania wewnątrz mierzonej pętli. Napisz to
  w docstringu modułu, bo inaczej ktoś to „naprawi".
- Kryterium stopu: `abs(nx - x) <= eps * nx`, zwróć `nx`.
- `ulp_error` przez odwzorowanie double na liczbę całkowitą zachowującą porządek
  (`struct.pack("<d")` → `struct.unpack("<Q")`, dla bitu znaku: `0x8000000000000000 - bits`).
- `liczba_iteracji` = `len(heron_trace(n, seed)) - 1`.

- [ ] **Step 4: Uruchom testy, upewnij się, że przechodzą**

Run: `cd squareRoot/program/python && python -m pytest testy -q`
Expected: PASS, wszystkie testy zielone

- [ ] **Step 5: Commit** — `feat(squareRoot): square root methods in Python, with tests`

---

### Task 3: Benchmark w Pythonie i pierwszy pomiar

**Files:**
- Create: `squareRoot/program/python/benchmark.py`
- Generates: `squareRoot/wyniki/python-czasy.csv`, `squareRoot/wyniki/python-srodowisko.csv`

- [ ] **Step 1:** Napisz `benchmark.py`. Wymagania, których nie wolno pominąć:
  - trzy mierzone funkcje: `math.sqrt`, `heron_naive`, `heron_fast`, każda w osobnej
    funkcji `time_*(limit)` z własną pętlą (bez wskaźnika na funkcję w pętli);
  - **suma kontrolna** akumulowana w każdej pętli i wypisana na końcu — bez niej
    interpreter mógłby pominąć obliczenia, których wynik nie jest używany;
    program kończy się błędem, jeśli sumy rozjadą się o więcej niż `1e-3`;
  - **rotacja kolejności metod** między próbami (`offset = (trial - 1) % 3`) —
    przy stałej kolejności pierwsza metoda zawsze trafiałaby na „zimny" procesor;
  - zegar `time.perf_counter`;
  - argumenty `--trials` (domyślnie 5) i `--max` (domyślnie 1 000 000);
  - zapis środowiska: model procesora (na Windowsie z rejestru,
    `HKLM\HARDWARE\DESCRIPTION\System\CentralProcessor\0` → `ProcessorNameString`,
    bo `platform.processor()` zwraca tylko rodzinę), system (Windows 11 rozpoznaj
    po numerze kompilacji ≥ 22000), wersja i implementacja Pythona;
  - CSV z wierszami `1..5` i wierszem `srednia`.

- [ ] **Step 2: Uruchom pełny pomiar**

Run: `cd squareRoot/program/python && python benchmark.py`
Expected: tabela na ekranie, zgodne sumy kontrolne, dwa zapisane pliki CSV. Trwa ~15 s.

- [ ] **Step 3:** Obejrzyj `squareRoot/wyniki/python-czasy.csv` i sprawdź, czy
      `sqrt` jest wyraźnie najszybsze, a `heron_naive` najwolniejsze. Jeśli nie —
      to sygnał, że pomiar jest zepsuty; zatrzymaj się i zdiagnozuj.

- [ ] **Step 4: Commit** — `feat(squareRoot): Python benchmark and its first measurements`

---

### Task 4: Analiza dokładności i zbieżności

**Files:**
- Create: `squareRoot/program/python/analiza.py`
- Generates: `squareRoot/wyniki/python-dokladnosc.csv`, `python-iteracje.csv`, `python-zbieznosc.csv`

- [ ] **Step 1:** Napisz `analiza.py`, który liczy i zapisuje:
  - **dokładność** — przejście po całym zakresie `1..1 000 000`, dla obu wariantów
    Herona `max_ulp` i `mean_ulp` względem `math.sqrt`;
  - **iteracje** — liczba iteracji obu wariantów dla `n ∈ {1, 2, 5, 10, 50, 100,
    500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000}`;
  - **zbieżność** — pełny ślad dla `n = 2`, oba warianty: krok, `x`, błąd
    bezwzględny, liczba poprawnych cyfr znaczących (`-log10(blad / sqrt(2))`).

- [ ] **Step 2: Uruchom**

Run: `cd squareRoot/program/python && python analiza.py`
Expected: trzy pliki CSV; `max_ulp` dla obu wariantów powinno wynosić 1 —
to jest główny wniosek pracy (Heron nie jest mniej dokładny od `sqrt()`).

- [ ] **Step 3: Commit** — `feat(squareRoot): accuracy and convergence analysis`

---

### Task 5: Programy w C++ i pomiar

**Files:**
- Create: `squareRoot/program/cpp/sqrt_metody.hpp`, `benchmark.cpp`, `build.bat`, `build.sh`
- Generates: `squareRoot/wyniki/cpp-czasy.csv`, `squareRoot/wyniki/cpp-srodowisko.txt`

- [ ] **Step 1:** Napisz `sqrt_metody.hpp` — odpowiednik `sqrt_metody.py`:
      `pierwiastek::heron_naive` i `pierwiastek::heron_fast`, `constexpr double EPS = 1e-15`,
      `constexpr int MAX_ITER = 100`, `std::frexp`/`std::ldexp`.

- [ ] **Step 2:** Napisz `benchmark.cpp`. Bez bariery optymalizatora ten pomiar jest
      bezwartościowy — `-O2` usuwa całą pętlę jako martwy kod i wynik to 0 s. Bariera:

```cpp
inline void nie_optymalizuj(double& value) {
#if defined(__GNUC__)
    asm volatile("" : "+g"(value) : : "memory");
#else
    volatile double sink = value;
    (void)sink;
#endif
}
```

Zegar `std::chrono::steady_clock`, 5 prób, zakres z argumentów, zapis CSV
o tym samym układzie kolumn co wersja pythonowa.

- [ ] **Step 3:** Skrypty budowania z pełną ścieżką do kompilatora (scoop nie utworzył shimów):

```sh
"$HOME/scoop/apps/mingw/current/bin/g++.exe" -O2 -std=c++17 -march=native -o benchmark.exe benchmark.cpp
```

- [ ] **Step 4: Skompiluj i uruchom**

Run: `cd squareRoot/program/cpp && sh build.sh && ./benchmark.exe`
Expected: pięć prób, czasy rzędu 0,001 s / 0,05 s / 0,02 s. **Jeśli `sqrt` pokazuje
0,000000 s — bariera nie zadziałała, napraw zanim pójdziesz dalej.**

- [ ] **Step 5:** Porównaj sumę kontrolną z wersji C++ z tą z Pythona — muszą być
      zgodne. To dowód, że oba programy liczą to samo.

- [ ] **Step 6:** Zapisz `cpp-srodowisko.txt`: wersja g++, flagi, zegar, procesor, system.

- [ ] **Step 7:** Dodaj `squareRoot/program/cpp/benchmark.exe` do `.gitignore`.

- [ ] **Step 8: Commit** — `feat(squareRoot): C++ implementation and its measurements`

---

### Task 6: Arkusz kalkulacyjny

**Files:**
- Create: `squareRoot/program/excel/generuj_arkusz.py`
- Generates: `squareRoot/program/excel/metoda-babilonska.xlsx`

- [ ] **Step 1:** Napisz generator w openpyxl. Arkusz ma mieć: komórkę `n`,
      komórkę `x0`, kolumnę 10 iteracji z formułą `=0,5*(B3+$B$1/B3)`, kolumnę
      błędu względem `=PIERWIASTEK($B$1)` i kolumnę liczby poprawnych cyfr.
      Formuły po polsku (`PIERWIASTEK`, `MODUŁ.LICZBY`), bo arkusz ma się otworzyć
      w polskim Excelu.

- [ ] **Step 2: Uruchom i otwórz wynik**

Run: `cd squareRoot/program/excel && python generuj_arkusz.py`
Expected: powstaje `metoda-babilonska.xlsx`; sprawdź, że dla `n = 2` kolumna
zbiega do `1,414213562373095`.

- [ ] **Step 3: Commit** — `feat(squareRoot): Babylonian method in a spreadsheet`

---

### Task 7: Eksport danych dla strony

**Files:**
- Create: `squareRoot/program/python/eksport.py`
- Generates: `squareRoot/wyniki.json`

Strona nie liczy niczego sama — czyta jeden plik. Kształt pliku (używają go `wykresy.js` i tabele w `pracownia.html`):

```json
{
  "wygenerowano": "2026-09-13",
  "sumaKontrolna": "666667166.4588418",
  "metody": ["sqrt", "heron_naive", "heron_fast"],
  "czasy": {
    "python": { "proby": [[0.07, 1.91, 0.94]], "srednia": [0.077, 2.003, 1.003] },
    "cpp":    { "proby": [[0.001, 0.052, 0.022]], "srednia": [0.001, 0.053, 0.022] }
  },
  "srodowisko": {
    "python": { "system": "...", "procesor": "...", "python": "3.11.9" },
    "cpp": { "kompilator": "...", "flagi": "-O2 -std=c++17 -march=native" }
  },
  "dokladnosc": { "zakres": "1..1000000", "maxUlpNaive": 1, "maxUlpFast": 1,
                  "meanUlpNaive": 0.249112, "meanUlpFast": 0.249112 },
  "iteracje": [{ "n": 1, "naiwny": 1, "szybki": 1 }],
  "zbieznosc": [{ "wariant": "naive", "krok": 0, "x": 2.0, "blad": 0.5857,
                  "cyfry": 0.38 }]
}
```

- [ ] **Step 1:** Napisz `eksport.py`, który czyta wszystkie pliki CSV z `wyniki/`
      i zapisuje `squareRoot/wyniki.json` w powyższym kształcie. W README zanotuj,
      że plik jest generowany i nie należy go edytować ręcznie.

- [ ] **Step 2: Uruchom i sprawdź**

Run: `cd squareRoot/program/python && python eksport.py`
Expected: powstaje `squareRoot/wyniki.json`; `czasy.cpp.srednia` to lista trzech liczb

- [ ] **Step 3: Commit** — `feat(squareRoot): export measurements to one JSON for the site`

---

### Task 8: Styl stron

**Files:**
- Create: `squareRoot/assets/projekt.css`

- [ ] **Step 1:** Napisz wspólny arkusz dla obu stron. Zasady:
  - **żadnych własnych kolorów** — wyłącznie zmienne z `assets/site.css`
    (`--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--muted`,
    `--accent`, `--accent-soft`, `--radius`, `--mono`, `--sans`), dzięki czemu
    obie strony chodzą z przełącznikiem motywu bez dodatkowej pracy;
  - klasy do zdefiniowania: `.scena` (sekcja scrollytellingu), `.reveal`
    (stan przed ujawnieniem), `.reveal.widoczny`, `.szyna` (przyklejona szyna
    sekcji pracowni), `.blok-kodu`, `.wzor`, `.tabela-wynikow`, `.karta`;
  - `@media (prefers-reduced-motion: reduce)` wyłącza przejścia i pokazuje
    wszystko od razu;
  - punkty łamania: 640 px i 1024 px; szyna pracowni poniżej 1024 px zwija się
    do poziomego paska u góry.

- [ ] **Step 2: Commit** — `feat(squareRoot): shared stylesheet for both pages`

---

### Task 9: Strona z opowieścią

**Files:**
- Create: `squareRoot/index.html`, `squareRoot/assets/scrolly.js`

- [ ] **Step 1:** Napisz `scrolly.js` — jeden `IntersectionObserver`, który dodaje
      klasę `widoczny` sekcjom `.reveal` i podświetla aktywną pozycję w spisie treści.
      Eksportuj `obserwujSekcje(selektor, przyAktywnej)`, żeby `pracownia.html`
      mogła użyć tego samego kodu do swojej szyny.

- [ ] **Step 2:** Napisz `index.html` — pięć sekcji ze specyfikacji:
      hero, wprowadzenie, historia, zwrotnica, źródła. Treść po polsku, pisana
      od zera. W historii muszą znaleźć się: tabliczka YBC 7289 z Yale
      (√2 ≈ 1;24,51,10 w zapisie sześćdziesiątkowym, ok. 1800–1600 p.n.e., błąd
      poniżej 6·10⁻⁷), Heron z Aleksandrii i „Metrica" (I w. n.e.), uogólnienie
      Newtona–Raphsona, oraz współczesność — pierwiastek jako jedna instrukcja
      procesora. Nagłówek `<html lang="pl">`, przycisk `.theme-toggle`,
      `<link>` do `../assets/site.css` i `assets/projekt.css`,
      `<script src="../assets/theme.js">` **bez `defer`** w `<head>`.

- [ ] **Step 3: Obejrzyj stronę**

Run: `python -m http.server 8080` w katalogu repozytorium, otwórz
`http://localhost:8080/squareRoot/`
Expected: sekcje ujawniają się przy przewijaniu, przełącznik motywu działa,
brak poziomego przewijania przy 360 px szerokości.

- [ ] **Step 4: Commit** — `feat(squareRoot): the story page`

---

### Task 10: Pracownia — teoria i wizualizator

**Files:**
- Create: `squareRoot/pracownia.html` (sekcje 1–3), `squareRoot/assets/heron.js`

- [ ] **Step 1:** Napisz `heron.js` — wizualizator od zera. Rysuje na canvasie
      prostokąt o bokach `x` i `n/x` (pole zawsze równe `n`) zbiegający do kwadratu
      o boku `√n` zaznaczonego linią przerywaną. Sterowanie: `n`, wybór punktu
      startowego (naiwny / szybki), przycisk „krok", „uruchom", „od nowa".
      Pod spodem tabela kolejnych przybliżeń z błędem. Kolory wyłącznie przez
      `getComputedStyle` ze zmiennych CSS, żeby rysunek zmieniał się z motywem;
      przerysuj przy zmianie motywu. Inicjalizacja leniwa — dopiero gdy sekcja
      wejdzie w widok.

- [ ] **Step 2:** Napisz sekcje 1–3 `pracownia.html`:
      podstawy matematyczne (definicja, warunek zbieżności, dlaczego liczba
      poprawnych cyfr się podwaja), metoda babilońska (wzór, interpretacja
      geometryczna, wizualizator), inne metody (bisekcja, Newton, *fast inverse
      square root*, CORDIC) z porównaniem liczby iteracji.

- [ ] **Step 3: Sprawdź w przeglądarce** — wizualizator zbiega dla `n = 2`, `n = 10⁶`
      i `n = 0,0001`; szybki start potrzebuje wyraźnie mniej kroków niż naiwny.

- [ ] **Step 4: Commit** — `feat(squareRoot): workshop — theory and the visualiser`

---

### Task 11: Pracownia — implementacje

**Files:**
- Modify: `squareRoot/pracownia.html` (sekcja 4)
- Create: `squareRoot/assets/kod.js`

- [ ] **Step 1:** Napisz `kod.js` — podświetlanie składni dla Pythona i C++
      (własne, na regexach, bez bibliotek; komentarze, napisy, liczby, słowa
      kluczowe) plus przycisk kopiowania każdego bloku.

- [ ] **Step 2:** Sekcja 4 `pracownia.html`: pseudokod, pełny kod Pythona, pełny
      kod C++, arkusz kalkulacyjny (replika siatki z formułami w HTML + odnośnik
      do pobrania `.xlsx`). Kod musi być **identyczny** z plikami w `program/` —
      nie przepisuj z pamięci, wklej z plików.

- [ ] **Step 3: Commit** — `feat(squareRoot): workshop — pseudocode, Python, C++, spreadsheet`

---

### Task 12: Pracownia — eksperyment, wyniki, wnioski

**Files:**
- Modify: `squareRoot/pracownia.html` (sekcje 5–7)
- Create: `squareRoot/assets/wykresy.js`

- [ ] **Step 1:** Napisz `wykresy.js` — rysuje inline SVG z `wyniki.json`:
      słupki czasów (Python i C++, skala logarytmiczna, bo różnica jest dwurzędowa),
      wykres liczby iteracji w funkcji `n`, krzywa zbieżności dla `n = 2`
      (liczba poprawnych cyfr w kolejnych krokach). `currentColor` i `--accent`,
      żeby wykresy chodziły z motywem. Każdy wykres ma podpis tekstowy z tą samą
      informacją — dla czytników ekranu i na wypadek, gdyby SVG się nie narysowało.

- [ ] **Step 2:** Sekcja 5 — metodyka eksperymentu: zakres, liczba prób, kryterium
      dokładności, suma kontrolna, rotacja kolejności, zegary, środowisko obu
      pomiarów (wypisane z `wyniki.json`, nie wpisane na sztywno).

- [ ] **Step 3:** Sekcja 6 — **wymagana tabela** 5 prób + średnia, osobno dla
      Pythona i C++, budowana z `wyniki.json`. Pod nią wykresy i tabela dokładności.

- [ ] **Step 4:** Sekcja 7 — wnioski. Muszą odnieść się do trzech rzeczy:
      (a) Heron nie jest mniej dokładny od `sqrt()` — błąd nie przekracza 1 ULP;
      (b) różnica jest wyłącznie w koszcie — `sqrt()` to jedna instrukcja procesora
      przeciw kilkunastu obrotom pętli; (c) punkt startowy ma ogromne znaczenie —
      połowienie wykładnika skraca liczbę iteracji kilkukrotnie. Wszystkie liczby
      cytowane we wnioskach muszą pochodzić z `wyniki.json`.

- [ ] **Step 5: Sprawdź w przeglądarce** — tabela zgadza się z CSV, wykresy
      rysują się w obu motywach.

- [ ] **Step 6: Commit** — `feat(squareRoot): workshop — experiment, results, conclusions`

---

### Task 13: Integracja z galerią

**Files:**
- Modify: `squareRoot/project.json`, `squareRoot/card.svg`
- Create: `squareRoot/README.md`

- [ ] **Step 1:** `project.json` — tytuł i opis po polsku, tagi
      `["python", "c++", "algorytmy", "eksperyment"]`, `status: "done"`,
      `updated: "2026-09-13"`.
- [ ] **Step 2:** Przerysuj `card.svg` pod nowy temat. Musi używać `currentColor`
      i `class="accent"` — galeria wkleja go inline, więc `<img>` by nie zadziałało.
      Zachowaj proporcje obecnej karty, żeby nie rozjechały się wysokości wierszy
      (`drawSpine()` mierzy je po renderze).
- [ ] **Step 3:** `README.md` po polsku: co to jest, wyniki w skrócie, jak uruchomić
      oba benchmarki, testy i eksport, uwaga o ścieżce do g++.
- [ ] **Step 4:** Przebuduj metadane: `node scripts/build-gallery.mjs && node scripts/build-tree.mjs`
- [ ] **Step 5: Commit** — `feat(squareRoot): gallery card, metadata and README`

---

### Task 14: Weryfikacja końcowa

- [ ] **Step 1:** `cd squareRoot/program/python && python -m pytest testy -q` — zielono.
- [ ] **Step 2:** Obie strony w przeglądarce przy 360 px, 768 px i 1440 px,
      w jasnym i ciemnym motywie. Sprawdź brak poziomego przewijania.
- [ ] **Step 3:** Przejdź obie strony samą klawiaturą — wszystkie przyciski
      osiągalne, widoczny focus.
- [ ] **Step 4:** Sprawdź `prefers-reduced-motion` — treść widoczna bez animacji.
- [ ] **Step 5:** Potwierdź, że każdy z 9 wymaganych punktów zadania ma swoją
      sekcję (tabela w specyfikacji).
- [ ] **Step 6: Commit** — `chore(squareRoot): final verification pass`
