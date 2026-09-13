// Wizualizator metody babilonskiej.
//
// Pomysl na obrazek: kazde przyblizenie x wyznacza prostokat o bokach
// x oraz n/x. Pole tego prostokata zawsze wynosi n, niezaleznie od tego,
// jak zly jest nasz x - zmienia sie tylko to, jak bardzo jest wydluzony.
// Krok metody zastepuje oba boki ich srednia, wiec prostokat robi sie
// bardziej kwadratowy. Granica jest kwadrat o boku sqrt(n).
//
// Dzieki temu widac, dlaczego metoda w ogole dziala, a nie tylko, ze dziala.

const EPS = 1e-15;
const MAX_ITER = 100;

/** Punkt startowy z polowienia wykladnika - odpowiednik heron_fast. */
function szybkiStart(n) {
  const bufor = new DataView(new ArrayBuffer(8));
  bufor.setFloat64(0, n);
  // Wykladnik liczby double siedzi na bitach 52..62, z przesunieciem 1023.
  const bity = (bufor.getUint32(0) >>> 20) & 0x7ff;
  let e = bity - 1022;             // tak, zeby mantysa wyszla w [0.5, 1)
  let m = n / Math.pow(2, e);
  if (e % 2 !== 0) { m *= 2; e -= 1; }
  return (0.5 * m + 0.5) * Math.pow(2, e / 2);
}

/** Slad kolejnych przyblizen, lacznie z punktem startowym. */
export function slad(n, start = 'fast') {
  if (!(n > 0)) return [0];
  let x = start === 'naive' ? n : szybkiStart(n);
  const kroki = [x];
  for (let i = 0; i < MAX_ITER; i += 1) {
    const nx = 0.5 * (x + n / x);
    if (!Number.isFinite(nx) || nx === x) break;
    kroki.push(nx);
    if (Math.abs(nx - x) <= EPS * nx) break;
    x = nx;
  }
  return kroki;
}

function sformatuj(v, cyfry = 15) {
  if (!Number.isFinite(v)) return '—';
  return Number(v.toPrecision(cyfry)).toLocaleString('pl-PL', {
    maximumSignificantDigits: cyfry,
    useGrouping: false,
  });
}

export function zbudujWizualizator(korzen) {
  const znajdz = (nazwa) => korzen.querySelector(`[data-rola="${nazwa}"]`);

  const poleN = znajdz('n');
  const poleStart = znajdz('start');
  const plotno = znajdz('plotno');
  const kontekst = plotno.getContext('2d');
  const przyciskKrok = znajdz('krok');
  const przyciskBieg = znajdz('bieg');
  const przyciskReset = znajdz('reset');

  let kroki = [];
  let kursor = 0;
  let zegar = null;

  const zmienna = (nazwa) =>
    getComputedStyle(document.body).getPropertyValue(nazwa).trim();

  function przebuduj() {
    zatrzymaj();
    const n = Math.max(0, Number(poleN.value) || 0);
    kroki = slad(n, poleStart.value);
    kursor = 0;
    odswiez();
  }

  function odswiez() {
    const n = Math.max(0, Number(poleN.value) || 0);
    const wzorzec = Math.sqrt(n);
    const x = kroki[kursor] ?? 0;
    const drugi = x === 0 ? 0 : n / x;

    znajdz('przyblizenie').textContent = sformatuj(x);
    znajdz('wzorzec').textContent = sformatuj(wzorzec);
    znajdz('blad').textContent = sformatuj(Math.abs(x - wzorzec), 4);
    znajdz('ile-krokow').textContent =
      `${kursor} z ${Math.max(kroki.length - 1, 0)}`;

    przyciskKrok.disabled = kursor >= kroki.length - 1;

    znajdz('tabela').innerHTML = kroki.map((v, k) => `
      <tr${k === kursor ? ' class="srednia"' : ''}>
        <td>${k}</td>
        <td>${sformatuj(v, 12)}</td>
        <td>${v === 0 ? '—' : sformatuj(n / v, 12)}</td>
        <td>${sformatuj(Math.abs(v - wzorzec), 3)}</td>
      </tr>`).join('');

    rysuj(x, drugi, wzorzec);
  }

  function rysuj(x, drugi, wzorzec) {
    const w = plotno.width;
    const h = plotno.height;
    kontekst.clearRect(0, 0, w, h);

    const margines = 52;
    const rozpietosc = Math.max(x, drugi, wzorzec, 1e-9) * 1.12;
    const skala = Math.min(w - margines * 2, h - margines * 2) / rozpietosc;
    const x0 = margines;
    const y0 = h - margines;

    // osie
    kontekst.strokeStyle = zmienna('--border');
    kontekst.lineWidth = 1;
    kontekst.beginPath();
    kontekst.moveTo(x0, margines * 0.4);
    kontekst.lineTo(x0, y0);
    kontekst.lineTo(w - margines * 0.4, y0);
    kontekst.stroke();

    // cel: kwadrat o boku sqrt(n)
    const bok = wzorzec * skala;
    kontekst.setLineDash([5, 5]);
    kontekst.strokeStyle = zmienna('--muted');
    kontekst.strokeRect(x0, y0 - bok, bok, bok);
    kontekst.setLineDash([]);

    // biezacy prostokat o polu n
    const szer = Math.min(x * skala, w - margines * 1.2);
    const wys = Math.min(drugi * skala, h - margines * 1.2);
    kontekst.fillStyle = zmienna('--accent-soft');
    kontekst.fillRect(x0, y0 - wys, szer, wys);
    kontekst.strokeStyle = zmienna('--accent');
    kontekst.lineWidth = 2;
    kontekst.strokeRect(x0, y0 - wys, szer, wys);

    // opisy bokow
    kontekst.fillStyle = zmienna('--muted');
    kontekst.font = '12px ui-monospace, monospace';
    kontekst.textAlign = 'center';
    kontekst.fillText(`x = ${sformatuj(x, 6)}`, x0 + szer / 2, y0 + 22);
    kontekst.save();
    kontekst.translate(x0 - 16, y0 - wys / 2);
    kontekst.rotate(-Math.PI / 2);
    kontekst.fillText(`n/x = ${sformatuj(drugi, 6)}`, 0, 0);
    kontekst.restore();
    kontekst.textAlign = 'left';
    kontekst.fillText(`√n = ${sformatuj(wzorzec, 8)}`, x0 + bok + 8, y0 - bok + 4);
  }

  function zatrzymaj() {
    clearInterval(zegar);
    zegar = null;
    przyciskBieg.textContent = 'Uruchom';
  }

  przyciskKrok.addEventListener('click', () => {
    if (kursor < kroki.length - 1) { kursor += 1; odswiez(); }
  });

  przyciskBieg.addEventListener('click', () => {
    if (zegar) { zatrzymaj(); return; }
    kursor = 0;
    odswiez();
    przyciskBieg.textContent = 'Zatrzymaj';
    zegar = setInterval(() => {
      if (kursor >= kroki.length - 1) { zatrzymaj(); return; }
      kursor += 1;
      odswiez();
    }, 700);
  });

  przyciskReset.addEventListener('click', przebuduj);
  poleN.addEventListener('input', przebuduj);
  poleStart.addEventListener('change', przebuduj);

  // Rysunek bierze kolory ze zmiennych CSS, wiec po zmianie motywu
  // trzeba go przerysowac.
  const obserwatorMotywu = new MutationObserver(odswiez);
  obserwatorMotywu.observe(document.documentElement, {
    attributes: true, attributeFilter: ['data-theme'],
  });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', odswiez);

  przebuduj();
}
