"""Analiza dokladnosci i zbieznosci metody babilonskiej.

Eksperyment z benchmark.py odpowiada na pytanie "jak dlugo to trwa".
Ten program odpowiada na pytanie "czy wynik jest dobry" - i to jest
wazniejsza polowa pracy, bo szybkosc bez poprawnosci nic nie znaczy.

Liczy trzy rzeczy i zapisuje je do ../../wyniki/:

  python-dokladnosc.csv  - blad obu wariantow Herona wzgledem math.sqrt
                           na calym zakresie 1..1 000 000, mierzony w ULP
  python-iteracje.csv    - ile obrotow petli potrzebuje kazdy wariant
                           dla n rosnacego przez rzedy wielkosci
  python-zbieznosc.csv   - pelny slad obu wariantow dla n = 2, z liczba
                           poprawnych cyfr w kazdym kroku

Uruchomienie (przejscie po milionie liczb trwa okolo minuty):

    python analiza.py
    python analiza.py --max 100000
"""

import argparse
import csv
import math
from pathlib import Path

from sqrt_metody import heron_fast, heron_naive, heron_trace, liczba_iteracji, ulp_error

WYNIKI = Path(__file__).resolve().parents[2] / "wyniki"

# Punkty rozlozone po rzedach wielkosci - chodzi o pokazanie, jak liczba
# iteracji rosnie z rzedem n, a nie o gesta siatke.
PUNKTY_ITERACJI = [1, 2, 5, 10, 50, 100, 500, 1000, 5000, 10000,
                   50000, 100000, 500000, 1000000]


def dokladnosc(limit):
    """Blad obu wariantow wzgledem math.sqrt na calym zakresie.

    Zwraca maksimum i srednia w ULP. Maksimum mowi, jak zle bywa
    w najgorszym przypadku; srednia - jak jest zwykle.
    """
    max_naive = max_fast = 0
    suma_naive = suma_fast = 0
    for n in range(1, limit + 1):
        wzorzec = math.sqrt(n)
        blad_naive = ulp_error(heron_naive(n), wzorzec)
        blad_fast = ulp_error(heron_fast(n), wzorzec)
        max_naive = max(max_naive, blad_naive)
        max_fast = max(max_fast, blad_fast)
        suma_naive += blad_naive
        suma_fast += blad_fast
    return {
        "zakres": f"1..{limit}",
        "policzone": limit,
        "max_ulp_naive": max_naive,
        "max_ulp_fast": max_fast,
        "mean_ulp_naive": round(suma_naive / limit, 6),
        "mean_ulp_fast": round(suma_fast / limit, 6),
    }


def iteracje():
    """Liczba obrotow petli obu wariantow dla rosnacego n."""
    return [
        {
            "n": n,
            "iteracje_naiwny": liczba_iteracji(n, "naive"),
            "iteracje_szybki": liczba_iteracji(n, "fast"),
        }
        for n in PUNKTY_ITERACJI
    ]


def zbieznosc(n=2):
    """Pelny slad obu wariantow z liczba poprawnych cyfr w kazdym kroku.

    Liczba poprawnych cyfr znaczacych to -log10(blad wzgledny). Ta kolumna
    jest sednem calej metody: jej wartosci maja sie podwajac z kroku na krok,
    i to widac golym okiem w wynikowym pliku.
    """
    wzorzec = math.sqrt(n)
    wiersze = []
    for wariant in ("naive", "fast"):
        for krok, x in enumerate(heron_trace(n, seed=wariant)):
            blad = abs(x - wzorzec)
            cyfry = round(-math.log10(blad / wzorzec), 2) if blad else None
            wiersze.append({
                "wariant": wariant,
                "krok": krok,
                "x": repr(x),
                "blad": repr(blad),
                "cyfry_znaczace": "dokladny" if cyfry is None else cyfry,
            })
    return wiersze


def zapisz(nazwa, wiersze, naglowki):
    WYNIKI.mkdir(parents=True, exist_ok=True)
    sciezka = WYNIKI / nazwa
    with sciezka.open("w", newline="", encoding="utf-8") as plik:
        zapis = csv.DictWriter(plik, fieldnames=naglowki)
        zapis.writeheader()
        zapis.writerows(wiersze)
    return sciezka


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--max", type=int, default=1_000_000, dest="limit")
    args = parser.parse_args()

    print(f"Dokladnosc na zakresie 1..{args.limit} - to chwile potrwa...")
    dane = dokladnosc(args.limit)
    for klucz, wartosc in dane.items():
        print(f"  {klucz}: {wartosc}")
    zapisz(
        "python-dokladnosc.csv",
        [{"klucz": k, "wartosc": v} for k, v in dane.items()],
        ["klucz", "wartosc"],
    )

    print("\nLiczba iteracji:")
    tabela = iteracje()
    for wiersz in tabela:
        print(f"  n = {wiersz['n']:>8}   naiwny {wiersz['iteracje_naiwny']:>3}"
              f"   szybki {wiersz['iteracje_szybki']:>3}")
    zapisz("python-iteracje.csv", tabela,
           ["n", "iteracje_naiwny", "iteracje_szybki"])

    print("\nZbieznosc dla n = 2:")
    slad = zbieznosc(2)
    for wiersz in slad:
        print(f"  {wiersz['wariant']:<6} krok {wiersz['krok']}   "
              f"cyfry {wiersz['cyfry_znaczace']}")
    zapisz("python-zbieznosc.csv", slad,
           ["wariant", "krok", "x", "blad", "cyfry_znaczace"])

    print(f"\nZapisano trzy pliki w {WYNIKI}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
