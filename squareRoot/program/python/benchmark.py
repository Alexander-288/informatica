"""Eksperyment: pomiar czasu miliona obliczen pierwiastka kwadratowego.

Porownuje trzy sposoby policzenia pierwiastkow z liczb 1..1 000 000:

  sqrt         - funkcja biblioteczna math.sqrt
  heron_naive  - metoda babilonska, punkt startowy x0 = n
  heron_fast   - metoda babilonska, punkt startowy z polowienia wykladnika

Uruchomienie:

    python benchmark.py                      # 5 prob po milion
    python benchmark.py --trials 3 --max 200000

Wyniki ladują w ../../wyniki/python-czasy.csv i python-srodowisko.csv.

DWIE PULAPKI POMIAROWE, ktore ten program omija:

1. Martwy kod. Kazda petla akumuluje sume wynikow i program ja wypisuje.
   Bez tego interpreter (a w wersji C++ optymalizator) moglby pominac
   obliczenia, ktorych wynik nie jest nigdzie uzywany, i pomiar stalby sie
   bezwartosciowy. Sumy z trzech metod musza byc zgodne - jesli nie sa,
   to znaczy, ze metody licza rozne rzeczy i porownanie nie ma sensu.

2. Zimny procesor. Kolejnosc metod jest rotowana miedzy probami. Gdyby byla
   stala, pierwsza mierzona metoda zawsze trafialaby na procesor przed
   podniesieniem taktowania i bylaby systematycznie karana.
"""

import argparse
import csv
import math
import platform
import sys
import time
from pathlib import Path

from sqrt_metody import heron_fast, heron_naive

WYNIKI = Path(__file__).resolve().parents[2] / "wyniki"


# Trzy osobne funkcje mierzace zamiast jednej z parametrem - z tego samego
# powodu, dla ktorego sqrt_metody ma dwie osobne petle Herona. Wywolanie
# przez zmienna kosztuje w kazdym z miliona obrotow.

def zmierz_sqrt(limit):
    sqrt = math.sqrt
    suma = 0.0
    start = time.perf_counter()
    for n in range(1, limit + 1):
        suma += sqrt(n)
    return time.perf_counter() - start, suma


def zmierz_naiwny(limit):
    fn = heron_naive
    suma = 0.0
    start = time.perf_counter()
    for n in range(1, limit + 1):
        suma += fn(n)
    return time.perf_counter() - start, suma


def zmierz_szybki(limit):
    fn = heron_fast
    suma = 0.0
    start = time.perf_counter()
    for n in range(1, limit + 1):
        suma += fn(n)
    return time.perf_counter() - start, suma


METODY = [
    ("sqrt", zmierz_sqrt),
    ("heron_naive", zmierz_naiwny),
    ("heron_fast", zmierz_szybki),
]


def nazwa_procesora():
    """Rzeczywisty model procesora.

    platform.processor() na Windowsie zwraca tylko ogolny opis rodziny
    ("Intel64 Family 6 Model 158..."), ktory nie identyfikuje maszyny.
    Konkretny model jest w rejestrze.
    """
    if platform.system() == "Windows":
        try:
            import winreg

            klucz = winreg.OpenKey(
                winreg.HKEY_LOCAL_MACHINE,
                r"HARDWARE\DESCRIPTION\System\CentralProcessor\0",
            )
            with klucz:
                return winreg.QueryValueEx(klucz, "ProcessorNameString")[0].strip()
        except OSError:
            pass
    return platform.processor() or "nieznany"


def nazwa_systemu():
    """Nazwa systemu z uwzglednieniem Windows 11.

    platform.release() zwraca "10" takze na Windows 11 - rozroznia je
    dopiero numer kompilacji (11 zaczyna sie od 22000).
    """
    system = platform.system()
    wydanie = platform.release()
    if system == "Windows" and wydanie == "10":
        try:
            build = int(platform.version().split(".")[-1])
            if build >= 22000:
                wydanie = "11"
        except (ValueError, IndexError):
            pass
    return f"{system} {wydanie} (build {platform.version()})"


def srodowisko():
    return {
        "system": nazwa_systemu(),
        "procesor": nazwa_procesora(),
        "python": platform.python_version(),
        "implementacja": platform.python_implementation(),
        "maszyna": platform.machine(),
    }


def przeprowadz(proby, limit):
    czasy = {nazwa: [] for nazwa, _ in METODY}
    sumy = {}
    for proba in range(1, proby + 1):
        przesuniecie = (proba - 1) % len(METODY)
        kolejnosc = METODY[przesuniecie:] + METODY[:przesuniecie]
        for nazwa, funkcja in kolejnosc:
            czas, suma = funkcja(limit)
            czasy[nazwa].append(czas)
            sumy[nazwa] = suma
            print(f"  proba {proba}  {nazwa:<12} {czas:10.4f} s")
    return czasy, sumy


def zapisz_czasy(czasy, proby):
    WYNIKI.mkdir(parents=True, exist_ok=True)
    sciezka = WYNIKI / "python-czasy.csv"
    with sciezka.open("w", newline="", encoding="utf-8") as plik:
        zapis = csv.writer(plik)
        zapis.writerow(["proba", "sqrt", "heron_naive", "heron_fast"])
        for i in range(proby):
            zapis.writerow(
                [i + 1] + [f"{czasy[nazwa][i]:.6f}" for nazwa, _ in METODY]
            )
        zapis.writerow(
            ["srednia"]
            + [f"{sum(czasy[nazwa]) / proby:.6f}" for nazwa, _ in METODY]
        )
    return sciezka


def zapisz_srodowisko(limit, proby, suma_kontrolna):
    WYNIKI.mkdir(parents=True, exist_ok=True)
    sciezka = WYNIKI / "python-srodowisko.csv"
    dane = srodowisko()
    dane["zakres"] = f"1..{limit}"
    dane["proby"] = proby
    dane["zegar"] = "time.perf_counter"
    dane["kolejnosc"] = "rotowana miedzy probami"
    dane["suma_kontrolna"] = f"{suma_kontrolna:.7f}"
    with sciezka.open("w", newline="", encoding="utf-8") as plik:
        zapis = csv.writer(plik)
        zapis.writerow(["klucz", "wartosc"])
        for klucz, wartosc in dane.items():
            zapis.writerow([klucz, wartosc])
    return sciezka


def main():
    parser = argparse.ArgumentParser(description="Pomiar czasu obliczania pierwiastkow.")
    parser.add_argument("--trials", type=int, default=5, help="liczba prob")
    parser.add_argument("--max", type=int, default=1_000_000, dest="limit",
                        help="gorna granica zakresu")
    args = parser.parse_args()

    print(f"Zakres 1..{args.limit}, liczba prob: {args.trials}")
    for klucz, wartosc in srodowisko().items():
        print(f"  {klucz}: {wartosc}")
    print()

    czasy, sumy = przeprowadz(args.trials, args.limit)

    print("\nSumy kontrolne (musza byc zgodne):")
    for nazwa, wartosc in sumy.items():
        print(f"  {nazwa:<12} {wartosc:.7f}")
    rozrzut = max(sumy.values()) - min(sumy.values())
    if rozrzut > 1e-3:
        print(f"\nBLAD: sumy kontrolne rozjezdzaja sie o {rozrzut}", file=sys.stderr)
        return 1

    print("\n| Proba | sqrt() | Heron (naiwny) | Heron (szybki) |")
    print("|---|---|---|---|")
    for i in range(args.trials):
        wiersz = " | ".join(f"{czasy[nazwa][i]:.4f} s" for nazwa, _ in METODY)
        print(f"| {i + 1} | {wiersz} |")
    srednie = " | ".join(
        f"{sum(czasy[nazwa]) / args.trials:.4f} s" for nazwa, _ in METODY
    )
    print(f"| Srednia | {srednie} |")

    plik_czasy = zapisz_czasy(czasy, args.trials)
    plik_srodowisko = zapisz_srodowisko(args.limit, args.trials, sumy["sqrt"])
    print(f"\nZapisano: {plik_czasy}")
    print(f"Zapisano: {plik_srodowisko}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
