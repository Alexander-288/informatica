"""Metody obliczania pierwiastka kwadratowego.

Modul zawiera wylacznie algorytmy - bez pomiaru czasu i bez operacji
wejscia/wyjscia. Dzieki temu mozna go testowac niezaleznie od eksperymentu,
a eksperyment mierzy czas samych obliczen, a nie czas wypisywania na ekran.

UWAGA O POWIELONEJ PETLI. Funkcje heron_naive i heron_fast maja osobne,
samodzielne petle zamiast jednej wspolnej funkcji z parametrem "punkt
startowy". Jest to celowe i nie nalezy tego "naprawiac": przekazanie funkcji
startowej jako parametru dodaloby narzut wywolania wewnatrz mierzonej petli
i znieksztalcilo wynik eksperymentu. Wiarygodnosc pomiaru jest tu wazniejsza
niz unikniecie czterech powtorzonych linii.
"""

import math
import struct

# Kryterium zatrzymania. Iterujemy, dopoki kolejne przyblizenia roznia sie
# wzglednie o wiecej niz EPS - to odpowiada zadanej dokladnosci 15 miejsc
# po przecinku. Kryterium jest wzgledne, a nie bezwzgledne, bo dla n rzedu
# 10^6 roznica bezwzgledna 1e-15 jest ponizej rozdzielczosci typu double
# i petla nigdy by sie nie zatrzymala.
EPS = 1e-15

# Bezpiecznik. Przy poprawnych danych nigdy nie zostaje wykorzystany -
# najgorszy przypadek w zakresie 1..10^6 to 16 iteracji.
MAX_ITER = 100


def heron_naive(n, eps=EPS, max_iter=MAX_ITER):
    """Metoda babilonska z naiwnym punktem startowym x0 = n.

    Najprostszy mozliwy wybor startu: bierzemy sama liczbe. Dla n = 10^6
    kosztuje to 16 iteracji, bo start jest odlegly od szukanej wartosci
    o trzy rzedy wielkosci i pierwsze kroki ida na samo zbicie rzedu.
    """
    if n < 0:
        raise ValueError("pierwiastek z liczby ujemnej nie jest liczba rzeczywista")
    if n == 0:
        return 0.0
    x = float(n)
    for _ in range(max_iter):
        nx = 0.5 * (x + n / x)
        if abs(nx - x) <= eps * nx:
            return nx
        x = nx
    return x


def heron_fast(n, eps=EPS, max_iter=MAX_ITER):
    """Metoda babilonska z punktem startowym z polowienia wykladnika.

    Kazda liczba zmiennoprzecinkowa jest zapisana jako n = m * 2**e, wiec
    sqrt(n) = sqrt(m) * 2**(e/2). Po sprowadzeniu e do parzystej mantysa m
    lezy w przedziale [0.5, 2), a na tym przedziale sqrt(m) przyblizamy
    linia prosta 0.5*m + 0.5. Maksymalny blad wzgledny tego przyblizenia
    to 6.07% (osiagany dla m = 0.5).

    Metoda Herona podwaja liczbe poprawnych cyfr w kazdym kroku, wiec start
    z bledem rzedu 6% wystarcza: dla n = 10^6 potrzebne sa 3 iteracje
    zamiast 16. Samo wyznaczenie startu to dwie operacje na wykladniku,
    kilkadziesiat razy tansze niz jeden obrot petli.
    """
    if n < 0:
        raise ValueError("pierwiastek z liczby ujemnej nie jest liczba rzeczywista")
    if n == 0:
        return 0.0
    m, e = math.frexp(n)
    if e % 2:
        m *= 2.0
        e -= 1
    x = math.ldexp(0.5 * m + 0.5, e // 2)
    for _ in range(max_iter):
        nx = 0.5 * (x + n / x)
        if abs(nx - x) <= eps * nx:
            return nx
        x = nx
    return x


def _szybki_start(n):
    """Punkt startowy z polowienia wykladnika - patrz heron_fast.

    Wydzielone do osobnej funkcji, bo korzystaja z tego heron_trace
    i liczba_iteracji, ktore nie sa mierzone czasowo. W heron_fast ten sam
    kod jest wpisany w cialo funkcji wlasnie dlatego, ze tam kazde dodatkowe
    wywolanie liczy sie do wyniku eksperymentu.
    """
    m, e = math.frexp(n)
    if e % 2:
        m *= 2.0
        e -= 1
    return math.ldexp(0.5 * m + 0.5, e // 2)


def heron_trace(n, seed="fast", eps=EPS, max_iter=MAX_ITER):
    """Zwraca liste kolejnych przyblizen, lacznie z punktem startowym.

    Uzywane przez analize i przez wizualizacje na stronie. Nie jest uzywane
    w pomiarze czasu, wiec moze byc napisane wygodnie zamiast szybko.
    """
    if n < 0:
        raise ValueError("pierwiastek z liczby ujemnej nie jest liczba rzeczywista")
    if n == 0:
        return [0.0]
    if seed == "naive":
        x = float(n)
    elif seed == "fast":
        x = _szybki_start(n)
    else:
        raise ValueError("seed musi byc 'naive' albo 'fast'")

    slad = [x]
    for _ in range(max_iter):
        nx = 0.5 * (x + n / x)
        if nx == x:
            break          # punkt staly - kolejny krok nie wniesie juz nic
        slad.append(nx)
        if abs(nx - x) <= eps * nx:
            break
        x = nx
    return slad


def liczba_iteracji(n, seed="fast"):
    """Ile obrotow petli potrzebuje metoda, zeby dojsc do wyniku."""
    return len(heron_trace(n, seed)) - 1


def _na_liczbe_z_porzadkiem(wartosc):
    """Odwzorowuje double na liczbe calkowita zachowujaca porzadek.

    Bity liczby zmiennoprzecinkowej ulozone sa tak, ze dla liczb dodatnich
    porownanie bitow daje ten sam wynik co porownanie wartosci. Dla liczb
    ujemnych porzadek jest odwrocony, wiec trzeba je odbic.
    """
    bity = struct.unpack("<Q", struct.pack("<d", wartosc))[0]
    if bity & 0x8000000000000000:
        return 0x8000000000000000 - bity
    return bity


def ulp_error(a, b):
    """Odleglosc dwoch liczb double wyrazona w jednostkach ostatniego bitu.

    Zwraca 0 dla wartosci identycznych, 1 dla dwoch sasiednich liczb
    reprezentowalnych w typie double. Jest to uczciwsza miara bledu niz
    roznica bezwzgledna, bo nie zalezy od rzedu wielkosci porownywanych
    liczb: blad 1e-10 przy n = 10^12 jest znakomity, a przy n = 1e-8
    kompromitujacy - w ULP oba przypadki sa porownywalne wprost.
    """
    if math.isnan(a) or math.isnan(b):
        raise ValueError("nie mozna porownac NaN")
    if a == b:
        return 0
    return abs(_na_liczbe_z_porzadkiem(a) - _na_liczbe_z_porzadkiem(b))
