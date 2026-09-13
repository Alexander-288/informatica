// Ujawnianie sekcji przy przewijaniu, wspolne dla obu stron projektu.
//
// Jeden IntersectionObserver zamiast nasluchu na zdarzeniu scroll - nie
// wykonuje sie przy kazdym pikselu przewijania, tylko wtedy, gdy element
// faktycznie wchodzi w widok.
//
// Zasada: strona ma byc czytelna takze wtedy, gdy JavaScript nie zadziala.
// Dlatego stan poczatkowy .reveal (przezroczystosc 0) wlaczamy dopiero
// stad - patrz oznaczKlasa ponizej.

/** Wlacza animacje ujawniania. Bez tego wszystko jest widoczne od razu. */
export function wlaczUjawnianie(selektor = '.reveal') {
  // Dopiero ta klasa wlacza w arkuszu stan poczatkowy (przezroczystosc 0).
  // Bez niej - czyli gdy skrypt nie wstal - tresc jest po prostu widoczna.
  document.documentElement.classList.add('ruch');

  const elementy = document.querySelectorAll(selektor);
  if (!elementy.length) return;

  // Czytelnik, ktory prosil o mniej ruchu, dostaje wszystko od razu.
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    elementy.forEach((el) => el.classList.add('widoczny'));
    return;
  }

  const obserwator = new IntersectionObserver((wpisy) => {
    for (const wpis of wpisy) {
      if (wpis.isIntersecting) {
        wpis.target.classList.add('widoczny');
        obserwator.unobserve(wpis.target);   // ujawniamy raz, nie tam i z powrotem
      }
    }
    // Prog zerowy, a nie ulamek powierzchni. Sekcja historii na waskim
    // ekranie jest kilka razy wyzsza od okna, wiec zaden sensowny ulamek
    // jej powierzchni nigdy nie bylby widoczny naraz i sekcja zostalaby
    // przezroczysta. Wejscie w widok wystarczy, ujemny margines u dolu
    // opoznia to o kawalek ekranu.
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0 });

  elementy.forEach((el) => obserwator.observe(el));

  // Bezpiecznik. IntersectionObserver zalezy od tego, ze przegladarka
  // faktycznie rysuje strone - w karcie w tle albo w oknie, ktore nigdy sie
  // nie wyswietlilo, potrafi nie odpalic ani razu. Gdyby po dwoch sekundach
  // nic sie nie ujawnilo, wylaczamy animacje i pokazujemy tresc. Lepiej
  // stracic efekt niz pokazac czytelnikowi pusta strone.
  setTimeout(() => {
    const cokolwiek = [...elementy].some((el) => el.classList.contains('widoczny'));
    if (!cokolwiek) document.documentElement.classList.remove('ruch');
  }, 2000);
}

/**
 * Podswietla w szynie odnosnik do sekcji, ktora jest teraz na ekranie.
 *
 * @param {string} selektorSekcji  sekcje z atrybutem id
 * @param {string} selektorSzyny   odnosniki z href="#id"
 */
export function sledzSekcje(selektorSekcji, selektorSzyny) {
  const sekcje = [...document.querySelectorAll(selektorSekcji)];
  const odnosniki = new Map(
    [...document.querySelectorAll(selektorSzyny)]
      .map((a) => [a.getAttribute('href').slice(1), a]),
  );
  if (!sekcje.length || !odnosniki.size) return;

  const widoczne = new Set();

  const oznacz = () => {
    // Gdy w widoku jest kilka sekcji, wygrywa ta najwyzej na stronie.
    const aktywna = sekcje.find((s) => widoczne.has(s.id));
    for (const [id, a] of odnosniki) {
      if (id === aktywna?.id) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
  };

  const obserwator = new IntersectionObserver((wpisy) => {
    for (const wpis of wpisy) {
      if (wpis.isIntersecting) widoczne.add(wpis.target.id);
      else widoczne.delete(wpis.target.id);
    }
    oznacz();
  }, { rootMargin: '-20% 0px -55% 0px' });

  sekcje.forEach((s) => obserwator.observe(s));
}

/**
 * Uruchamia kosztowna inicjalizacje dopiero wtedy, gdy element wejdzie
 * w widok. Wizualizator i wykresy nie musza sie budowac, zanim ktokolwiek
 * do nich dojdzie.
 */
export function gdyWidoczny(element, zrob) {
  if (!element) return;
  const obserwator = new IntersectionObserver((wpisy) => {
    if (wpisy.some((w) => w.isIntersecting)) {
      obserwator.disconnect();
      zrob();
    }
  }, { rootMargin: '200px' });
  obserwator.observe(element);
}
