// Podswietlanie skladni i kopiowanie blokow kodu.
//
// Wlasne, na wyrazeniach regularnych, zamiast biblioteki. Powod jest
// prozaiczny: caly projekt ma dzialac z pliku, bez internetu i bez zadnych
// zaleznosci. Do podswietlenia dwoch jezykow w kilkunastu blokach to
// wystarcza, a wazy trzydziesci linii zamiast stu kilobajtow.

const SLOWA = {
  python: new Set([
    'def', 'return', 'if', 'elif', 'else', 'for', 'while', 'in', 'not', 'and',
    'or', 'import', 'from', 'raise', 'class', 'with', 'as', 'try', 'except',
    'finally', 'break', 'continue', 'pass', 'lambda', 'None', 'True', 'False',
    'yield', 'global', 'assert', 'del', 'is',
  ]),
  cpp: new Set([
    'int', 'double', 'float', 'long', 'void', 'char', 'bool', 'const',
    'constexpr', 'inline', 'return', 'if', 'else', 'for', 'while', 'struct',
    'class', 'namespace', 'using', 'template', 'typename', 'auto', 'static',
    'volatile', 'true', 'false', 'nullptr', 'include', 'define', 'ifndef',
    'endif', 'switch', 'case', 'break', 'continue', 'sizeof', 'asm',
  ]),
};

function ucieczka(tekst) {
  return tekst
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Dzieli kod na tokeny jednym przebiegiem.
 *
 * Kolejnosc alternatyw w wyrazeniu ma znaczenie: komentarze i napisy ida
 * pierwsze, bo slowo kluczowe w srodku napisu nie jest slowem kluczowym.
 */
function podswietl(kod, jezyk) {
  const slowa = SLOWA[jezyk] ?? new Set();
  const wzorzec = jezyk === 'python'
    ? /("""[\s\S]*?"""|'''[\s\S]*?'''|#[^\n]*|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\b\d[\d_]*(?:\.\d+)?(?:e[+-]?\d+)?\b|\b[A-Za-z_]\w*\b)/g
    : /(\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\b\d[\d']*(?:\.\d+)?(?:e[+-]?\d+)?\b|\b[A-Za-z_]\w*\b)/g;

  let wynik = '';
  let ostatni = 0;

  for (const dopasowanie of kod.matchAll(wzorzec)) {
    const tekst = dopasowanie[0];
    const poczatek = dopasowanie.index;
    wynik += ucieczka(kod.slice(ostatni, poczatek));
    ostatni = poczatek + tekst.length;

    let klasa = null;
    if (tekst.startsWith('#') || tekst.startsWith('//') || tekst.startsWith('/*')
        || tekst.startsWith('"""') || tekst.startsWith("'''")) {
      klasa = 'tok-komentarz';
    } else if (tekst.startsWith('"') || tekst.startsWith("'")) {
      klasa = 'tok-napis';
    } else if (/^\d/.test(tekst)) {
      klasa = 'tok-liczba';
    } else if (slowa.has(tekst)) {
      klasa = 'tok-slowo';
    } else if (kod[ostatni] === '(') {
      klasa = 'tok-funkcja';
    }

    wynik += klasa
      ? `<span class="${klasa}">${ucieczka(tekst)}</span>`
      : ucieczka(tekst);
  }

  return wynik + ucieczka(kod.slice(ostatni));
}

/** Podswietla wszystkie bloki <code data-jezyk="..."> na stronie. */
export function podswietlBloki(zakres = document) {
  for (const blok of zakres.querySelectorAll('code[data-jezyk]')) {
    blok.innerHTML = podswietl(blok.textContent, blok.dataset.jezyk);
  }
}

/**
 * Wciaga tresc plikow zrodlowych prosto z repozytorium.
 *
 * Kod na stronie jest wtedy z definicji ten sam, ktory naprawde sie
 * uruchamia - nie da sie go przypadkiem rozjechac z plikiem. Gdy pobranie
 * sie nie powiedzie, blok pokazuje odnosnik do pliku zamiast pustki.
 */
export async function wczytajKod(zakres = document) {
  const bloki = [...zakres.querySelectorAll('.blok-kodu[data-plik]')];

  await Promise.all(bloki.map(async (figura) => {
    const sciezka = figura.dataset.plik;
    const kod = figura.querySelector('code');
    try {
      const odpowiedz = await fetch(sciezka);
      if (!odpowiedz.ok) throw new Error(String(odpowiedz.status));
      let tekst = (await odpowiedz.text()).replace(/\s+$/, '');

      // Pozwala pokazac tylko wycinek pliku: data-od / data-do to numery
      // linii liczone od jedynki, wlacznie z obiema granicami.
      const od = Number(figura.dataset.od);
      const doLinii = Number(figura.dataset.do);
      if (od || doLinii) {
        const linie = tekst.split('\n');
        tekst = linie.slice((od || 1) - 1, doLinii || linie.length).join('\n');
      }

      kod.textContent = tekst;
      kod.innerHTML = podswietl(tekst, kod.dataset.jezyk);
    } catch {
      kod.textContent = '';
      const odnosnik = document.createElement('a');
      odnosnik.href = sciezka;
      odnosnik.textContent = `Nie udało się wczytać pliku. Otwórz ${sciezka}`;
      kod.append(odnosnik);
    }
  }));
}

/** Dokleja do kazdego bloku przycisk kopiowania. */
export function dodajKopiowanie(zakres = document) {
  for (const figura of zakres.querySelectorAll('.blok-kodu')) {
    const podpis = figura.querySelector('figcaption');
    const kod = figura.querySelector('code');
    if (!podpis || !kod || podpis.querySelector('.kopiuj')) continue;

    const przycisk = document.createElement('button');
    przycisk.type = 'button';
    przycisk.className = 'kopiuj';
    przycisk.textContent = 'kopiuj';

    przycisk.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(kod.textContent);
        przycisk.textContent = 'skopiowano';
      } catch {
        // Schowek bywa niedostepny, gdy strona nie jest podana po https
        // ani z localhost. Wtedy zaznaczamy kod, zeby dalo sie go wziac
        // recznie, zamiast udawac, ze sie udalo.
        const zaznaczenie = window.getSelection();
        const zakresTekstu = document.createRange();
        zakresTekstu.selectNodeContents(kod);
        zaznaczenie.removeAllRanges();
        zaznaczenie.addRange(zakresTekstu);
        przycisk.textContent = 'zaznaczono';
      }
      setTimeout(() => { przycisk.textContent = 'kopiuj'; }, 1600);
    });

    podpis.append(przycisk);
  }
}
