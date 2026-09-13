"""Pakuje wyniki eksperymentu w jeden plik JSON dla strony.

Strona nie liczy niczego sama. Wszystkie liczby, ktore na niej widac -
tabele, wykresy, zdania we wnioskach - pochodza z ../../wyniki.json,
a ten plik powstaje tutaj, z surowych plikow CSV zapisanych przez
benchmark.py, analiza.py i benchmark.cpp.

Dzieki temu nie da sie na stronie napisac liczby, ktorej nie zmierzono.

Uruchomienie (po benchmark.py, analiza.py i benchmark.exe):

    python eksport.py
"""

import csv
import json
from datetime import date
from pathlib import Path

KORZEN = Path(__file__).resolve().parents[2]
WYNIKI = KORZEN / "wyniki"
WYJSCIE = KORZEN / "wyniki.json"

METODY = ["sqrt", "heron_naive", "heron_fast"]


def czytaj_csv(nazwa):
    sciezka = WYNIKI / nazwa
    if not sciezka.exists():
        raise SystemExit(
            f"Brak pliku {sciezka}.\n"
            "Uruchom najpierw benchmark.py, analiza.py i program/cpp/benchmark.exe."
        )
    with sciezka.open(encoding="utf-8", newline="") as plik:
        return list(csv.DictReader(plik))


def czasy(nazwa_pliku):
    """Zamienia tabele czasow na proby + srednia."""
    wiersze = czytaj_csv(nazwa_pliku)
    proby = []
    srednia = None
    for wiersz in wiersze:
        wartosci = [float(wiersz[m]) for m in METODY]
        if wiersz["proba"] == "srednia":
            srednia = wartosci
        else:
            proby.append(wartosci)
    if srednia is None:
        raise SystemExit(f"{nazwa_pliku}: brak wiersza ze srednia")
    return {"proby": proby, "srednia": srednia}


def slownik_z_csv(nazwa_pliku):
    """Pliki o ukladzie klucz,wartosc."""
    return {w["klucz"]: w["wartosc"] for w in czytaj_csv(nazwa_pliku)}


def srodowisko_cpp():
    sciezka = WYNIKI / "cpp-srodowisko.txt"
    if not sciezka.exists():
        raise SystemExit(f"Brak pliku {sciezka}. Uruchom program/cpp/benchmark.exe.")
    dane = {}
    for linia in sciezka.read_text(encoding="utf-8").splitlines():
        if ":" in linia:
            klucz, wartosc = linia.split(":", 1)
            dane[klucz.strip()] = wartosc.strip()
    return dane


def liczba(tekst):
    """CSV trzyma wszystko jako tekst; do JSON-a chcemy liczby."""
    try:
        return int(tekst)
    except ValueError:
        return float(tekst)


def main():
    dokladnosc = slownik_z_csv("python-dokladnosc.csv")
    srodowisko_py = slownik_z_csv("python-srodowisko.csv")
    cpp = srodowisko_cpp()

    dane = {
        "wygenerowano": date.today().isoformat(),
        "uwaga": "Plik generowany przez program/python/eksport.py - nie edytuj recznie.",
        "sumaKontrolna": srodowisko_py["suma_kontrolna"],
        "metody": METODY,
        "czasy": {
            "python": czasy("python-czasy.csv"),
            "cpp": czasy("cpp-czasy.csv"),
        },
        "srodowisko": {
            "python": {
                "system": srodowisko_py["system"],
                "procesor": srodowisko_py["procesor"],
                "python": srodowisko_py["python"],
                "implementacja": srodowisko_py["implementacja"],
                "zegar": srodowisko_py["zegar"],
                "zakres": srodowisko_py["zakres"],
                "proby": int(srodowisko_py["proby"]),
                "kolejnosc": srodowisko_py["kolejnosc"],
            },
            "cpp": {
                "kompilator": cpp["kompilator"],
                "flagi": cpp["flagi"],
                "zegar": cpp["zegar"],
                "procesor": cpp["procesor"],
                "system": cpp["system"],
                "zakres": cpp["zakres"],
                "proby": int(cpp["proby"]),
            },
        },
        "dokladnosc": {
            "zakres": dokladnosc["zakres"],
            "policzone": int(dokladnosc["policzone"]),
            "maxUlpNaive": int(dokladnosc["max_ulp_naive"]),
            "maxUlpFast": int(dokladnosc["max_ulp_fast"]),
            "meanUlpNaive": float(dokladnosc["mean_ulp_naive"]),
            "meanUlpFast": float(dokladnosc["mean_ulp_fast"]),
        },
        "iteracje": [
            {
                "n": int(w["n"]),
                "naiwny": int(w["iteracje_naiwny"]),
                "szybki": int(w["iteracje_szybki"]),
            }
            for w in czytaj_csv("python-iteracje.csv")
        ],
        "zbieznosc": [
            {
                "wariant": w["wariant"],
                "krok": int(w["krok"]),
                "x": float(w["x"]),
                "blad": float(w["blad"]),
                "cyfry": None if w["cyfry_znaczace"] == "dokladny"
                         else float(w["cyfry_znaczace"]),
            }
            for w in czytaj_csv("python-zbieznosc.csv")
        ],
    }

    WYJSCIE.write_text(
        json.dumps(dane, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    py = dane["czasy"]["python"]["srednia"]
    cp = dane["czasy"]["cpp"]["srednia"]
    print(f"Zapisano: {WYJSCIE}")
    print(f"  Python  sqrt {py[0]:.4f} s   naiwny {py[1]:.4f} s   szybki {py[2]:.4f} s")
    print(f"  C++     sqrt {cp[0]:.4f} s   naiwny {cp[1]:.4f} s   szybki {cp[2]:.4f} s")
    print(f"  Blad Herona: najwyzej {dane['dokladnosc']['maxUlpNaive']} ULP")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
