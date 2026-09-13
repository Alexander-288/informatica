// Wykresy i tabele budowane z wyniki.json.
//
// Strona nie liczy niczego sama. Kazda liczba, ktora tu widac, przyszla
// z pliku wygenerowanego przez program/python/eksport.py na podstawie
// rzeczywistych pomiarow. Gdyby plik zniknal, strona ma o tym powiedziec,
// a nie pokazac wymyslone liczby.
//
// Wykresy sa rysowane jako SVG inline, zeby braly kolor ze zmiennych CSS
// i zmienialy sie razem z motywem. Kazdy ma tez podpis slowny z ta sama
// informacja - dla czytnikow ekranu i na wypadek, gdyby SVG sie nie wyswietlil.

const NAZWY = {
  sqrt: 'sqrt()',
  heron_naive: 'Heron naiwny',
  heron_fast: 'Heron szybki',
};

export async function wczytajWyniki() {
  const odpowiedz = await fetch('wyniki.json');
  if (!odpowiedz.ok) throw new Error(`wyniki.json: ${odpowiedz.status}`);
  return odpowiedz.json();
}

const sek = (v, cyfry = 4) =>
  `${v.toFixed(cyfry).replace('.', ',')} s`;

const liczba = (v, cyfry = 2) =>
  v.toFixed(cyfry).replace('.', ',');

function element(nazwa, atrybuty = {}, tresc = '') {
  const el = document.createElementNS('http://www.w3.org/2000/svg', nazwa);
  for (const [klucz, wartosc] of Object.entries(atrybuty)) {
    el.setAttribute(klucz, wartosc);
  }
  if (tresc) el.textContent = tresc;
  return el;
}

function plotno(szerokosc, wysokosc) {
  const svg = element('svg', {
    viewBox: `0 0 ${szerokosc} ${wysokosc}`,
    preserveAspectRatio: 'xMidYMid meet',
    role: 'img',
  });
  return svg;
}

/* ---------- wymagana tabela prob ---------- */

export function tabelaCzasow(cel, dane, jezyk) {
  const zestaw = dane.czasy[jezyk];
  const naglowki = dane.metody.map((m) => `<th>${NAZWY[m]}</th>`).join('');
  const wiersze = zestaw.proby.map((czasy, i) => `
    <tr>
      <td>${i + 1}</td>
      ${czasy.map((c) => `<td>${sek(c, 6)}</td>`).join('')}
    </tr>`).join('');
  const srednia = `
    <tr class="srednia">
      <td>Średnia</td>
      ${zestaw.srednia.map((c) => `<td>${sek(c, 6)}</td>`).join('')}
    </tr>`;

  cel.innerHTML = `
    <table class="tabela">
      <caption>${jezyk === 'python' ? 'Python 3.11' : 'C++ (g++ -O2)'},
        milion pierwiastków w każdej próbie</caption>
      <thead><tr><th>Próba</th>${naglowki}</tr></thead>
      <tbody>${wiersze}${srednia}</tbody>
    </table>`;
}

/* ---------- slupki czasow ---------- */

/**
 * Skala logarytmiczna, bo miedzy sqrt() w C++ a Heronem w Pythonie jest
 * ponad tysiackrotna roznica. Na skali liniowej cztery z szesciu slupkow
 * bylyby nieodroznialne od zera i wykres nie niosl by zadnej informacji.
 */
export function slupkiCzasow(cel, dane) {
  const wpisy = [];
  for (const jezyk of ['python', 'cpp']) {
    dane.metody.forEach((metoda, i) => {
      wpisy.push({
        etykieta: `${jezyk === 'python' ? 'Py' : 'C++'} ${NAZWY[metoda]}`,
        wartosc: dane.czasy[jezyk].srednia[i],
        jasny: jezyk === 'python',
      });
    });
  }

  const W = 640;
  const H = 300;
  const lewo = 118;
  const prawo = 74;
  const gora = 10;
  const dol = 26;

  const svg = plotno(W, H);
  const maks = Math.max(...wpisy.map((w) => w.wartosc));
  const min = Math.min(...wpisy.map((w) => w.wartosc));
  const logMin = Math.log10(min) - 0.35;
  const logMaks = Math.log10(maks) + 0.05;
  const szerokoscPasa = (H - gora - dol) / wpisy.length;

  wpisy.forEach((wpis, i) => {
    const y = gora + i * szerokoscPasa;
    const wysokosc = szerokoscPasa * 0.62;
    const ulamek = (Math.log10(wpis.wartosc) - logMin) / (logMaks - logMin);
    const dlugosc = Math.max(2, ulamek * (W - lewo - prawo));

    svg.append(element('text', {
      x: lewo - 8, y: y + wysokosc * 0.78, 'text-anchor': 'end',
      class: 'etykieta',
    }, wpis.etykieta));

    svg.append(element('rect', {
      x: lewo, y, width: dlugosc, height: wysokosc,
      class: wpis.jasny ? 'slupek' : 'slupek-cichy',
    }));

    svg.append(element('text', {
      x: lewo + dlugosc + 6, y: y + wysokosc * 0.78, class: 'wartosc',
    }, sek(wpis.wartosc, wpis.wartosc < 0.01 ? 4 : 3)));
  });

  svg.append(element('line', {
    x1: lewo, y1: gora, x2: lewo, y2: H - dol, class: 'os-linia',
  }));
  svg.append(element('text', {
    x: lewo, y: H - 8, class: 'etykieta',
  }, 'skala logarytmiczna — każdy odcinek to dziesięciokrotność'));

  cel.replaceChildren(svg);
}

/* ---------- liczba iteracji ---------- */

export function wykresIteracji(cel, dane) {
  const W = 640;
  const H = 260;
  const lewo = 44;
  const prawo = 90;
  const gora = 14;
  const dol = 34;

  const svg = plotno(W, H);
  const punkty = dane.iteracje.filter((p) => p.n > 1);
  const maksIter = Math.max(...punkty.map((p) => Math.max(p.naiwny, p.szybki)));
  const logN = punkty.map((p) => Math.log10(p.n));
  const minX = Math.min(...logN);
  const maksX = Math.max(...logN);

  const doX = (n) =>
    lewo + ((Math.log10(n) - minX) / (maksX - minX)) * (W - lewo - prawo);
  const doY = (iter) =>
    H - dol - (iter / maksIter) * (H - gora - dol);

  svg.append(element('line', {
    x1: lewo, y1: H - dol, x2: W - prawo, y2: H - dol, class: 'os-linia',
  }));
  svg.append(element('line', {
    x1: lewo, y1: gora, x2: lewo, y2: H - dol, class: 'os-linia',
  }));

  for (const [klucz, klasa, opis] of [
    ['naiwny', 'linia-cicha', 'naiwny start'],
    ['szybki', 'linia-danych', 'szybki start'],
  ]) {
    const sciezka = punkty
      .map((p, i) => `${i ? 'L' : 'M'}${doX(p.n).toFixed(1)},${doY(p[klucz]).toFixed(1)}`)
      .join(' ');
    svg.append(element('path', { d: sciezka, class: klasa }));
    const ostatni = punkty.at(-1);
    svg.append(element('text', {
      x: W - prawo + 6, y: doY(ostatni[klucz]) + 3, class: 'etykieta',
    }, opis));
  }

  for (const p of punkty) {
    svg.append(element('circle', {
      cx: doX(p.n), cy: doY(p.szybki), r: 2.5, class: 'punkt',
    }));
  }

  for (const wykladnik of [1, 2, 3, 4, 5, 6]) {
    const n = 10 ** wykladnik;
    if (n < 10 ** minX || n > 10 ** maksX) continue;
    svg.append(element('text', {
      x: doX(n), y: H - dol + 16, 'text-anchor': 'middle', class: 'etykieta',
    }, `10${'⁰¹²³⁴⁵⁶⁷⁸⁹'[wykladnik]}`));
  }

  for (const iter of [0, Math.round(maksIter / 2), maksIter]) {
    svg.append(element('text', {
      x: lewo - 6, y: doY(iter) + 3, 'text-anchor': 'end', class: 'etykieta',
    }, String(iter)));
  }

  svg.append(element('text', {
    x: (lewo + W - prawo) / 2, y: H - 4, 'text-anchor': 'middle',
    class: 'etykieta',
  }, 'n'));

  cel.replaceChildren(svg);
}

/* ---------- zbieznosc ---------- */

export function wykresZbieznosci(cel, dane) {
  const W = 640;
  const H = 260;
  const lewo = 48;
  const prawo = 84;
  const gora = 14;
  const dol = 34;

  const svg = plotno(W, H);
  const warianty = ['naive', 'fast'];
  const maksKrok = Math.max(...dane.zbieznosc.map((p) => p.krok));
  const maksCyfry = 16;

  const doX = (krok) => lewo + (krok / maksKrok) * (W - lewo - prawo);
  const doY = (cyfry) => H - dol - (cyfry / maksCyfry) * (H - gora - dol);

  svg.append(element('line', {
    x1: lewo, y1: H - dol, x2: W - prawo, y2: H - dol, class: 'os-linia',
  }));
  svg.append(element('line', {
    x1: lewo, y1: gora, x2: lewo, y2: H - dol, class: 'os-linia',
  }));

  // Granica precyzji typu double: okolo 15,95 cyfry dziesietnej.
  svg.append(element('line', {
    x1: lewo, y1: doY(15.95), x2: W - prawo, y2: doY(15.95), class: 'os-linia',
  }));
  svg.append(element('text', {
    x: W - prawo + 6, y: doY(15.95) + 3, class: 'etykieta',
  }, 'granica double'));

  for (const wariant of warianty) {
    const punkty = dane.zbieznosc
      .filter((p) => p.wariant === wariant && p.cyfry !== null);
    if (!punkty.length) continue;
    const sciezka = punkty
      .map((p, i) => `${i ? 'L' : 'M'}${doX(p.krok).toFixed(1)},${doY(Math.min(p.cyfry, maksCyfry)).toFixed(1)}`)
      .join(' ');
    svg.append(element('path', {
      d: sciezka,
      class: wariant === 'fast' ? 'linia-danych' : 'linia-cicha',
    }));
    for (const p of punkty) {
      svg.append(element('circle', {
        cx: doX(p.krok), cy: doY(Math.min(p.cyfry, maksCyfry)), r: 2.5,
        class: 'punkt',
      }));
    }
    const ostatni = punkty.at(-1);
    svg.append(element('text', {
      x: doX(ostatni.krok) + 6, y: doY(Math.min(ostatni.cyfry, maksCyfry)) - 6,
      class: 'etykieta',
    }, wariant === 'fast' ? 'szybki start' : 'naiwny start'));
  }

  for (let krok = 0; krok <= maksKrok; krok += 1) {
    svg.append(element('text', {
      x: doX(krok), y: H - dol + 16, 'text-anchor': 'middle', class: 'etykieta',
    }, String(krok)));
  }
  for (const cyfry of [0, 4, 8, 12, 16]) {
    svg.append(element('text', {
      x: lewo - 6, y: doY(cyfry) + 3, 'text-anchor': 'end', class: 'etykieta',
    }, String(cyfry)));
  }
  svg.append(element('text', {
    x: (lewo + W - prawo) / 2, y: H - 4, 'text-anchor': 'middle',
    class: 'etykieta',
  }, 'numer iteracji'));

  cel.replaceChildren(svg);
}

/* ---------- liczby wstawiane w tekst ---------- */

/**
 * Wypelnia elementy z atrybutem data-liczba wartosciami z pomiarow.
 * Dzieki temu we wnioskach nie ma zadnej liczby wpisanej recznie.
 */
export function wstawLiczby(dane, zakres = document) {
  const py = dane.czasy.python.srednia;
  const cpp = dane.czasy.cpp.srednia;

  const wartosci = {
    'py-sqrt': sek(py[0], 4),
    'py-naiwny': sek(py[1], 4),
    'py-szybki': sek(py[2], 4),
    'cpp-sqrt': sek(cpp[0], 4),
    'cpp-naiwny': sek(cpp[1], 4),
    'cpp-szybki': sek(cpp[2], 4),
    'py-ile-razy': liczba(py[1] / py[0], 0),
    'cpp-ile-razy': liczba(cpp[1] / cpp[0], 0),
    'py-vs-cpp': liczba(py[1] / cpp[1], 0),
    'zysk-startu-py': liczba(py[1] / py[2], 1),
    'zysk-startu-cpp': liczba(cpp[1] / cpp[2], 1),
    'max-ulp': String(Math.max(dane.dokladnosc.maxUlpNaive, dane.dokladnosc.maxUlpFast)),
    'sredni-ulp': liczba(dane.dokladnosc.meanUlpNaive, 6),
    'suma-kontrolna': dane.sumaKontrolna.replace('.', ','),
    'policzone': dane.dokladnosc.policzone.toLocaleString('pl-PL'),
    'procesor': dane.srodowisko.python.procesor,
    'system': dane.srodowisko.python.system,
    'wersja-python': dane.srodowisko.python.python,
    'kompilator': dane.srodowisko.cpp.kompilator,
    'flagi': dane.srodowisko.cpp.flagi,
    'zegar-python': dane.srodowisko.python.zegar,
    'zegar-cpp': dane.srodowisko.cpp.zegar,
    'zakres': dane.srodowisko.python.zakres.replace('..', ' … '),
    'proby': String(dane.srodowisko.python.proby),
    'wygenerowano': dane.wygenerowano,
  };

  for (const el of zakres.querySelectorAll('[data-liczba]')) {
    const klucz = el.dataset.liczba;
    if (klucz in wartosci) el.textContent = wartosci[klucz];
    else el.textContent = '?';
  }
}
