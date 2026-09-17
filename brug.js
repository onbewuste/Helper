
let laatsteStand = null;
let laatsteLog = '';
let laatsteTicket = '';
let laatsteSnapshot = '';
let laatsteVloerplan = '';
let laatsteMeubelDebug = '';
let laatsteCatalogusDiagnose = '';

window.addEventListener('message', (ev) => {
  const d = ev.data;
  if (!d || d.bron !== 'hotelLoper') return;
  if (d.soort === 'stand') laatsteStand = d.stand;
  if (d.soort === 'log') laatsteLog = d.tekst || '';
  if (d.soort === 'ticket') laatsteTicket = d.tekst || '';
  if (d.soort === 'snapshot') laatsteSnapshot = d.tekst || '';
  if (d.soort === 'vloerplan') laatsteVloerplan = d.tekst || '';
  if (d.soort === 'meubeldebug') laatsteMeubelDebug = d.tekst || '';
  if (d.soort === 'catalogus-diagnose') laatsteCatalogusDiagnose = d.tekst || '';
  if (d.soort === 'catalogus-cache-bewaren' && d.cache) {
    chrome.storage.local.set({ catalogusRouteCache: d.cache });
  }
  if (d.soort === 'inspecteur-instelling') {
    chrome.storage.local.set({ inspecteurAan: !!d.aan });
  }
});

chrome.runtime.onMessage.addListener((bericht, afzender, antwoord) => {
  if (bericht && bericht.soort === 'stand-opvragen') {
    window.postMessage({ bron: 'hotelPopup', soort: 'stand' }, '*');
    antwoord({ stand: laatsteStand });
    return true;
  }
  if (bericht && bericht.soort === 'log-ophalen') {
    window.postMessage({ bron: 'hotelPopup', soort: 'log-opvragen' }, '*');
    setTimeout(() => antwoord({ tekst: laatsteLog }), 120);
    return true;
  }
  if (bericht && bericht.soort === 'ticket-ophalen') {
    window.postMessage({ bron: 'hotelPopup', soort: 'ticket' }, '*');
    setTimeout(() => antwoord({ tekst: laatsteTicket }), 120);
    return true;
  }
  if (bericht && bericht.soort === 'snapshot-ophalen') {
    laatsteSnapshot = '';
    window.postMessage({ bron: 'hotelPopup', soort: 'snapshot-opvragen' }, '*');
    setTimeout(() => antwoord({ tekst: laatsteSnapshot }), 150);
    return true;
  }
  if (bericht && bericht.soort === 'vloerplan-ophalen') {
    laatsteVloerplan = '';
    window.postMessage({ bron: 'hotelPopup', soort: 'vloerplan-opvragen' }, '*');
    setTimeout(() => antwoord({ tekst: laatsteVloerplan }), 180);
    return true;
  }
  if (bericht && bericht.soort === 'meubeldebug-ophalen') {
    laatsteMeubelDebug = '';
    window.postMessage({ bron: 'hotelPopup', soort: 'meubeldebug-opvragen' }, '*');
    setTimeout(() => antwoord({ tekst: laatsteMeubelDebug }), 180);
    return true;
  }
  if (bericht && bericht.soort === 'catalogus-diagnose-ophalen') {
    laatsteCatalogusDiagnose = '';
    window.postMessage({ bron: 'hotelPopup', soort: 'catalogus-diagnose-opvragen' }, '*');
    setTimeout(() => antwoord({ tekst: laatsteCatalogusDiagnose }), 180);
    return true;
  }
  if (bericht && bericht.bron === 'hotelPopup') {
    if (bericht.soort === 'log-wissen') laatsteLog = '';
    window.postMessage(bericht, '*');
    antwoord({ ok: true });
    return true;
  }
  return false;
});

async function opstarten() {
  const opslag = await chrome.storage.local.get(['tegels', 'naam', 'wacht', 'schrijft', 'pauze',
                                                 'koopAan', 'koopAantal', 'koopPauze', 'bouwPauze',
                                                 'streamerAan', 'streamerCredits',
                                                 'streamerDuckets', 'streamerDiamanten', 'streamerNamen',
                                                 'inspecteurAan', 'catalogusRouteCache']);
  if (opslag.tegels) window.postMessage({ bron: 'hotelPopup', soort: 'kaart', tegels: opslag.tegels }, '*');
  if (opslag.naam) window.postMessage({ bron: 'hotelPopup', soort: 'naam', naam: opslag.naam }, '*');
  if (opslag.wacht) window.postMessage({ bron: 'hotelPopup', soort: 'wacht', wacht: opslag.wacht }, '*');
  if (opslag.bouwPauze !== undefined) {
    window.postMessage({ bron: 'hotelPopup', soort: 'bouw-pauze', pauze: opslag.bouwPauze }, '*');
  }
  if (opslag.schrijft) window.postMessage({ bron: 'hotelPopup', soort: 'schrijf', aan: true }, '*');
  if (opslag.pauze) window.postMessage({ bron: 'hotelPopup', soort: 'pauze', aan: true }, '*');
  if (opslag.koopAan || opslag.koopAantal || opslag.koopPauze) {
    window.postMessage({ bron: 'hotelPopup', soort: 'koop', aan: !!opslag.koopAan,
                         aantal: opslag.koopAantal || 3, pauze: opslag.koopPauze || 400 }, '*');
  }
  if (opslag.streamerAan || opslag.streamerCredits !== undefined ||
      opslag.streamerDuckets !== undefined || opslag.streamerDiamanten !== undefined) {
    window.postMessage({
      bron: 'hotelPopup', soort: 'streamer', aan: !!opslag.streamerAan,
      credits: opslag.streamerCredits ?? 1000,
      duckets: opslag.streamerDuckets ?? 500,
      diamanten: opslag.streamerDiamanten ?? 50,
      namen: opslag.streamerNamen !== false,
    }, '*');
  }
  if (opslag.inspecteurAan) {
    window.postMessage({ bron: 'hotelPopup', soort: 'inspecteur', aan: true }, '*');
  }
  if (opslag.catalogusRouteCache) {
    window.postMessage({ bron: 'hotelPopup', soort: 'catalogus-cache-laden',
                         cache: opslag.catalogusRouteCache }, '*');
  }
}

setTimeout(opstarten, 300);
setTimeout(opstarten, 2000);
