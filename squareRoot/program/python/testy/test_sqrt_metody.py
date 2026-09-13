"""Testy metod obliczania pierwiastka kwadratowego."""

import math
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqrt_metody import (  # noqa: E402
    heron_fast,
    heron_naive,
    heron_trace,
    liczba_iteracji,
    ulp_error,
)


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


@pytest.mark.parametrize("metoda", [heron_naive, heron_fast])
def test_kwadraty_sa_dokladne(metoda):
    """Dla kwadratow liczb calkowitych wynik musi byc dokladny, bez zaokraglen."""
    for k in range(1, 200):
        assert metoda(k * k) == float(k)


def test_ulp_error_dla_identycznych():
    assert ulp_error(1.5, 1.5) == 0


def test_ulp_error_dla_sasiadow():
    assert ulp_error(1.0, math.nextafter(1.0, 2.0)) == 1


def test_ulp_error_nie_zalezy_od_kolejnosci():
    a, b = 1.0, math.nextafter(1.0, 2.0)
    assert ulp_error(a, b) == ulp_error(b, a)


def test_ulp_error_odrzuca_nan():
    with pytest.raises(ValueError):
        ulp_error(float("nan"), 1.0)


def test_trace_zaczyna_sie_od_punktu_startowego():
    assert heron_trace(2, seed="naive")[0] == 2.0


def test_trace_konczy_sie_na_wyniku():
    assert ulp_error(heron_trace(2)[-1], math.sqrt(2)) <= 1


def test_trace_maleje_monotonicznie_po_pierwszym_kroku():
    """Od pierwszej iteracji przyblizenia schodza z gory do sqrt(n)."""
    slad = heron_trace(10**6, seed="naive")
    bledy = [abs(x - math.sqrt(10**6)) for x in slad[1:]]
    assert bledy == sorted(bledy, reverse=True)


def test_szybki_start_potrzebuje_mniej_iteracji():
    assert liczba_iteracji(10**6, "fast") < liczba_iteracji(10**6, "naive")


def test_trace_ma_zly_seed():
    with pytest.raises(ValueError):
        heron_trace(2, seed="bzdura")


def test_zbieznosc_jest_kwadratowa():
    """Liczba poprawnych cyfr ma sie mniej wiecej podwajac w kazdym kroku."""
    slad = heron_trace(2, seed="naive")
    cyfry = [
        -math.log10(abs(x - math.sqrt(2)) / math.sqrt(2))
        for x in slad[1:-1]
    ]
    for wczesniej, pozniej in zip(cyfry, cyfry[1:]):
        assert pozniej > 1.8 * wczesniej
