// Metody obliczania pierwiastka kwadratowego - odpowiednik sqrt_metody.py.
//
// Obie wersje jezykowe licza dokladnie to samo i tym samym kryterium stopu,
// zeby porownanie czasow mialo sens. Dowodem zgodnosci jest suma kontrolna
// calego zakresu, ktora oba programy wypisuja na koncu.

#ifndef SQRT_METODY_HPP
#define SQRT_METODY_HPP

#include <cmath>

namespace pierwiastek {

// Kryterium wzgledne, nie bezwzgledne - patrz komentarz w sqrt_metody.py.
constexpr double EPS = 1e-15;
constexpr int MAX_ITER = 100;

// Metoda babilonska, naiwny punkt startowy x0 = n.
inline double heron_naive(double n) {
    if (n <= 0.0) return 0.0;
    double x = n;
    for (int i = 0; i < MAX_ITER; ++i) {
        const double nx = 0.5 * (x + n / x);
        if (std::fabs(nx - x) <= EPS * nx) return nx;
        x = nx;
    }
    return x;
}

// Metoda babilonska, punkt startowy z polowienia wykladnika.
//
// n = m * 2^e, wiec sqrt(n) = sqrt(m) * 2^(e/2). Po sprowadzeniu e do
// parzystej mantysa m lezy w [0.5, 2), gdzie sqrt(m) przyblizamy linia
// prosta 0.5*m + 0.5 z bledem najwyzej 6.07%.
inline double heron_fast(double n) {
    if (n <= 0.0) return 0.0;
    int e = 0;
    double m = std::frexp(n, &e);
    if (e % 2 != 0) { m *= 2.0; e -= 1; }
    double x = std::ldexp(0.5 * m + 0.5, e / 2);
    for (int i = 0; i < MAX_ITER; ++i) {
        const double nx = 0.5 * (x + n / x);
        if (std::fabs(nx - x) <= EPS * nx) return nx;
        x = nx;
    }
    return x;
}

}  // namespace pierwiastek

#endif  // SQRT_METODY_HPP
