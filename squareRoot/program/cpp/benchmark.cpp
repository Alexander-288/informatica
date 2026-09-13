// Eksperyment w C++: pomiar czasu miliona obliczen pierwiastka kwadratowego.
//
// Odpowiednik benchmark.py. Mierzy te same trzy metody, na tym samym
// zakresie, tym samym kryterium stopu - roznica jest wylacznie w jezyku.
//
// Kompilacja (flagi sa czescia metodyki, nie zmieniaj ich bez odnotowania):
//
//     g++ -O2 -std=c++17 -march=native -o benchmark.exe benchmark.cpp
//
// BARIERA OPTYMALIZATORA. Bez akumulacji sumy i bez bariery kompilator
// z flaga -O2 usuwa cala mierzona petle jako martwy kod, bo jej wynik nie
// jest nigdzie uzywany. Pomiar pokazalby wtedy 0 s - wynik bezwartosciowy.
// To jest ta sama pulapka, ktora w Pythonie omijamy suma kontrolna, tyle ze
// w jezyku kompilowanym jest znacznie grozniejsza.

#include <chrono>
#include <cstdio>
#include <cstdlib>
#include <vector>

#include "sqrt_metody.hpp"

namespace {

// Uniemozliwia optymalizatorowi usuniecie obliczen: mowi kompilatorowi,
// ze wartosc zostala odczytana i zmodyfikowana przez kod, ktorego nie widzi.
inline void nie_optymalizuj(double& wartosc) {
#if defined(__GNUC__)
    asm volatile("" : "+g"(wartosc) : : "memory");
#else
    volatile double sink = wartosc;
    (void)sink;
#endif
}

// steady_clock, a nie system_clock - ten drugi moze skoczyc w trakcie
// pomiaru, jesli system zsynchronizuje zegar z serwerem czasu.
using Zegar = std::chrono::steady_clock;

struct Wynik {
    double sekundy;
    double suma;
};

template <typename Fn>
Wynik zmierz(Fn fn, long limit) {
    double suma = 0.0;
    const auto start = Zegar::now();
    for (long n = 1; n <= limit; ++n) {
        suma += fn(static_cast<double>(n));
    }
    nie_optymalizuj(suma);
    const auto stop = Zegar::now();
    const std::chrono::duration<double> czas = stop - start;
    return {czas.count(), suma};
}

double srednia(const std::vector<double>& v) {
    double s = 0.0;
    for (double x : v) s += x;
    return s / static_cast<double>(v.size());
}

}  // namespace

int main(int argc, char** argv) {
    int proby = 5;
    long limit = 1000000;
    if (argc > 1) proby = std::atoi(argv[1]);
    if (argc > 2) limit = std::atol(argv[2]);

    std::printf("Zakres 1..%ld, liczba prob: %d\n\n", limit, proby);

    std::vector<double> t_sqrt, t_naive, t_fast;
    double s_sqrt = 0.0, s_naive = 0.0, s_fast = 0.0;

    for (int p = 1; p <= proby; ++p) {
        // Rotacja kolejnosci metod miedzy probami - tak samo jak w wersji
        // pythonowej, zeby zadna metoda nie byla systematycznie karana
        // za trafienie na procesor przed podniesieniem taktowania.
        const int przesuniecie = (p - 1) % 3;
        Wynik a{}, b{}, c{};
        for (int krok = 0; krok < 3; ++krok) {
            switch ((przesuniecie + krok) % 3) {
                case 0: a = zmierz([](double x) { return std::sqrt(x); }, limit); break;
                case 1: b = zmierz(pierwiastek::heron_naive, limit); break;
                case 2: c = zmierz(pierwiastek::heron_fast, limit); break;
            }
        }
        t_sqrt.push_back(a.sekundy);
        t_naive.push_back(b.sekundy);
        t_fast.push_back(c.sekundy);
        s_sqrt = a.suma; s_naive = b.suma; s_fast = c.suma;
        std::printf("  proba %d  sqrt %8.4f s  naiwny %8.4f s  szybki %8.4f s\n",
                    p, a.sekundy, b.sekundy, c.sekundy);
    }

    std::printf("\nSumy kontrolne (musza byc zgodne):\n");
    std::printf("  sqrt         %.7f\n", s_sqrt);
    std::printf("  heron_naive  %.7f\n", s_naive);
    std::printf("  heron_fast   %.7f\n", s_fast);

    FILE* f = std::fopen("../../wyniki/cpp-czasy.csv", "w");
    if (!f) {
        std::fprintf(stderr, "BLAD: nie mozna otworzyc pliku wynikowego\n");
        return 1;
    }
    std::fprintf(f, "proba,sqrt,heron_naive,heron_fast\n");
    for (int i = 0; i < proby; ++i) {
        std::fprintf(f, "%d,%.6f,%.6f,%.6f\n",
                     i + 1, t_sqrt[i], t_naive[i], t_fast[i]);
    }
    std::fprintf(f, "srednia,%.6f,%.6f,%.6f\n",
                 srednia(t_sqrt), srednia(t_naive), srednia(t_fast));
    std::fclose(f);

    std::printf("\n| Proba | sqrt() | Heron (naiwny) | Heron (szybki) |\n");
    std::printf("|---|---|---|---|\n");
    for (int i = 0; i < proby; ++i) {
        std::printf("| %d | %.4f s | %.4f s | %.4f s |\n",
                    i + 1, t_sqrt[i], t_naive[i], t_fast[i]);
    }
    std::printf("| Srednia | %.4f s | %.4f s | %.4f s |\n",
                srednia(t_sqrt), srednia(t_naive), srednia(t_fast));
    std::printf("\nZapisano: ../../wyniki/cpp-czasy.csv\n");
    return 0;
}
