
const $ = (id) => document.getElementById(id);
let meldingTimer = null;
let laatsteServerMelding = '';

function kiesTab(naam) {
  const geldig = ['overzicht', 'kamer', 'bouwen', 'meer'];
  if (!geldig.includes(naam)) naam = 'overzicht';
  for (const tabNaam of geldig) {
    const actief = tabNaam === naam;
    $(`tab-${tabNaam}`).setAttribute('aria-selected', String(actief));
    $(`paneel-${tabNaam}`).hidden = !actief;
  }
  document.querySelector('main').scrollTop = 0;
}

for (const knop of document.querySelectorAll('[data-tab]')) {
  knop.addEventListener('click', () => {
    kiesTab(knop.dataset.tab);
    chrome.storage.local.set({ popupTab: knop.dataset.tab });
  });
}

async function tab() {
  const [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  return t;
}

async function stuur(bericht) {
  const t = await tab();
  if (!t) return null;
  try {
    return await chrome.tabs.sendMessage(t.id, bericht);
  } catch (e) {
    melden('Geen hotel-tabblad gevonden. Open leet.city en herlaad de pagina.', 'fout');
    return null;
  }
}

function melden(tekst, klasse) {
  const m = $('melding');
  m.textContent = tekst || '';
  m.className = tekst ? 'zichtbaar ' + (klasse || '') : '';
  clearTimeout(meldingTimer);
  if (tekst) meldingTimer = setTimeout(() => { m.textContent = ''; m.className = ''; }, 6000);
}

async function ververs() {
  const antwoord = await stuur({ soort: 'stand-opvragen' });
  const s = antwoord && antwoord.stand;
  if (!s) {
    $('plek').textContent = 'onbekend';
    $('detail').textContent = 'nog geen verbinding met de client';
    $('verbindingstatus').textContent = 'Niet verbonden';
    $('verbindingstatus').className = 'connection fout';
    return;
  }
  $('verbindingstatus').textContent = s.verbonden ? 'Verbonden' : 'Niet verbonden';
  $('verbindingstatus').className = 'connection ' + (s.verbonden ? 'goed' : 'fout');
  $('plek').textContent = s.hier ? `${s.hier[0]}:${s.hier[1]}` : 'onbekend';

  $('kamerid').textContent = s.kamer ? String(s.kamer) : 'onbekend';
  $('kamerkopie').hidden = !s.kamer;
  $('kamerhint').textContent = s.kamer
    ? (s.wie ? `jij bent nummer ${s.wie} in deze kamer` : 'afgelezen van het kamer-packet')
    : 'loop de kamer (opnieuw) binnen, dan pak ik het nummer op';

  const stukjes = [];
  stukjes.push(`hoogte ${Number(s.hoogte || 0).toFixed(1)}`);
  if (s.loopt) stukjes.push(`loopt (${s.gelopen} stappen)`);
  $('detail').textContent = stukjes.join(' · ');

  $('kaartstand').textContent = s.tegels
    ? `${s.tegels} tegels geladen` + (s.hier ? (s.hierBekend
        ? ' · deze tegel staat erin' : ' · deze tegel staat er NIET in') : '')
    : 'nog geen kaart geladen';
  $('kaartstand').className = 'klein ' + (!s.tegels ? '' : (s.hierBekend ? 'goed' : 'waarschuwing'));

  schrijftNu = !!s.schrijft;
  $('schrijf').textContent = 'Meeschrijven: ' + (s.schrijft ? 'aan' : 'uit');
  $('schrijf').className = s.schrijft ? 'groen' : '';
  $('logstand').textContent = (s.packets || 0) + ' packets, ' + (s.http || 0) + ' http-verzoeken'
    + (s.wsUrl ? ' · ' + s.wsUrl : '');

  pauzeNu = !!s.pauze;
  $('pauze').textContent = 'Verbinding: ' + (s.pauze ? 'tegengehouden' : 'aan');
  $('pauze').className = s.pauze ? 'rood' : '';
  $('ticketstand').textContent = s.ticket
    ? `ticket klaar: ${s.ticket} tekens` : 'nog geen ticket gezien';
  $('ticketstand').className = 'klein ' + (s.ticket ? 'goed' : '');

  if (document.activeElement !== $('koopAan')) $('koopAan').checked = !!s.koopAan;
  if (document.activeElement !== $('koopAantal')) $('koopAantal').value = s.koopAantal || 3;
  if (document.activeElement !== $('koopPauze')) $('koopPauze').value = s.koopPauze || 400;
  $('koopstand').textContent = s.koopBezig
    ? `bezig: nog ${s.koopBezig} te versturen`
    : (s.koopAan
        ? `aan: koop 1 item, ik maak er ${s.koopAantal} van (${s.koopPauze} ms ertussen)`
        : 'uit');
  $('koopstand').className = 'klein ' + (s.koopBezig ? 'waarschuwing' : (s.koopAan ? 'goed' : ''));

  if (document.activeElement !== $('streamerAan')) $('streamerAan').checked = !!s.streamerAan;
  if (document.activeElement !== $('streamerCredits')) $('streamerCredits').value = s.streamerCredits ?? 1000;
  if (document.activeElement !== $('streamerDuckets')) $('streamerDuckets').value = s.streamerDuckets ?? 500;
  if (document.activeElement !== $('streamerDiamanten')) $('streamerDiamanten').value = s.streamerDiamanten ?? 50;
  if (document.activeElement !== $('streamerNamen')) $('streamerNamen').checked = s.streamerNamen !== false;
  $('streamerstand').textContent = s.streamerAan
    ? `aan · toont ${s.streamerCredits} credits, ${s.streamerDuckets} duckets en ${s.streamerDiamanten} diamanten`
    : 'uit · verandert niets op de server';
  $('streamerstand').className = 'klein ' + (s.streamerAan ? 'goed' : '');

  if (document.activeElement !== $('inspecteurAan')) $('inspecteurAan').checked = !!s.inspecteurAan;
  $('inspecteurstand').textContent = s.inspecteurAan
    ? `aan · ${s.meubels || 0} meubels bekend` + (s.inspecteurId ? ` · geselecteerd ${s.inspecteurSoort} ${s.inspecteurId}` : '')
    : 'uit · opent een blijvend paneel in de hotelpagina';
  const meubelFout = s.vloerLeesFout || s.wandLeesFout;
  if (meubelFout) {
    $('inspecteurstand').textContent += ' · niet alle meubels konden worden gelezen';
    $('inspecteurdebugstand').textContent = `Parserfout: ${meubelFout}`;
  } else if (s.vloerVerwacht || s.wandVerwacht) {
    $('inspecteurdebugstand').textContent = `Server meldde ${s.vloerVerwacht || 0} vloermeubels en ${s.wandVerwacht || 0} wandmeubels.`;
  } else {
    $('inspecteurdebugstand').textContent = 'Nog geen diagnose beschikbaar';
  }
  $('inspecteurstand').className = 'klein ' + (meubelFout ? 'fout' : (s.inspecteurAan ? 'goed' : ''));
  $('meubeldebug').hidden = !s.meubelDebugKlaar;

  const planAantal = s.bouwplanAantal || 0;
  if (document.activeElement !== $('bouwPauze')) $('bouwPauze').value = s.bouwPauze ?? 500;
  const meubelBezig = !!(s.bouwBezig || s.aankoopBezig || s.aankoopAnalyseBezig || s.catalogusBezig);
  if (s.catalogusBezig) {
    $('bouwstand').textContent = s.catalogusFase === 'cache'
      ? `Cataloguscache controleren${s.catalogusRouteTotaal
          ? `: ${s.catalogusRouteGedaan || 0}/${s.catalogusRouteTotaal} pagina's` : '…'}`
      : s.catalogusFase === 'controle'
        ? `Cataloguspagina's controleren: ${s.catalogusBekeken || 0}/${s.catalogusPaginas || '?'} pagina's`
        : `Volledige catalogusscan: ${s.catalogusBekeken || 0}/${s.catalogusPaginas || '?'} pagina's`;
  } else if (s.bouwBezig || s.aankoopBezig) {
    $('bouwstand').textContent = `${s.bouwStatus || 'bezig'} · ${s.bouwGedaan || 0}/${s.bouwTotaal || planAantal}`;
  } else if (planAantal) {
    $('bouwstand').textContent = s.bouwStatus || `${planAantal} meubels geladen uit kamer ${s.bouwplanBron || '?'}`;
  } else {
    $('bouwstand').textContent = 'nog geen snapshot geladen';
  }
  $('bouwstand').className = 'klein ' + (meubelBezig ? 'waarschuwing' : (planAantal ? 'goed' : ''));
  $('bouwstart').disabled = !planAantal || meubelBezig || !s.verbonden || !s.kamer;
  $('aankoopanalyse').disabled = !planAantal || meubelBezig || !s.verbonden || !s.kamer;
  $('koopenbouw').disabled = !s.aankoopKlaar || !s.aankoopAantal || meubelBezig || !s.verbonden || !s.kamer;
  $('bouwstop').disabled = !s.bouwBezig && !s.aankoopBezig;
  $('vloerplanexport').disabled = !s.vloerplanKamer || s.vloerplanKamer !== s.kamer;
  $('vloerplantoepassen').disabled = !s.vloerplanBron || !s.vloerplanDoelGekalibreerd ||
    !s.verbonden || meubelBezig ||
    (s.vloerplanBron === s.kamer && !s.vloerplanHerstelBackup);
  $('vloerplanstand').textContent = s.vloerplanBron
    ? `Bronkamer ${s.vloerplanBron}: ${s.vloerplanImportBreedte}×${s.vloerplanImportHoogte}` +
      (s.vloerplanDoelGekalibreerd
        ? ' · doelkamer gereed'
        : ' · sla de editor in je eigen doelkamer eenmaal ongewijzigd op')
    : 'Laad een vloerplanbestand; sla daarna de editor in je eigen doelkamer eenmaal ongewijzigd op.';

  const valutaNamen = { 0: 'duckets', 5: 'diamanten' };
  const kosten = [];
  if (s.aankoopCredits) kosten.push(`${s.aankoopCredits} credits`);
  for (const [type, bedrag] of Object.entries(s.aankoopValuta || {})) {
    if (bedrag) kosten.push(`${bedrag} ${valutaNamen[type] || `valuta ${type}`}`);
  }
  if (s.aankoopAnalyseBezig) {
    $('aankoopstand').textContent = s.catalogusFase === 'volledig' && s.catalogusBezig
      ? 'Ontbrekende meubels zoeken · volledige scan kan enkele minuten duren.'
      : 'Ontbrekende meubels vergelijken · dit kan een minuutje duren.';
  } else if (s.catalogusBezig) {
    const mislukt = Math.max(0, (s.catalogusBekeken || 0) - (s.catalogusGelezen || 0));
    $('aankoopstand').textContent = `${s.catalogusGelezen || 0} pagina's gelezen` +
      (mislukt ? ` · ${mislukt} nog niet gelezen` : '');
  } else if (s.aankoopBezig) {
    $('aankoopstand').textContent = `kopen · ${s.aankoopGedaan || 0} pakketten gelukt · ` +
      `${s.aankoopMislukt || 0} mislukt`;
  } else if (s.aankoopKlaar) {
    $('aankoopstand').textContent = s.aankoopAantal
      ? `${s.aankoopAantal} pakketten in ${s.aankoopVerzoeken || s.aankoopAantal} verzoeken voor ` +
        `${kosten.join(' + ') || '0'} · ${s.aankoopNietTeKoop || 0} niet gevonden`
      : 'Geen aankopen nodig; alles zit al in je inventaris.';
  } else {
    $('aankoopstand').textContent = planAantal ? 'Analyseer eerst welke meubels ontbreken.' : '';
  }
  $('catalogusdiagnose').disabled = !s.catalogusPaginas;
  $('cataloguscontrole').disabled = meubelBezig || !s.verbonden;
  $('aankoopstand').className = 'klein ' + (meubelBezig ? 'waarschuwing' : (s.aankoopKlaar ? 'goed' : ''));
  if (s.catalogusCacheTypes || s.catalogusVolledig) {
    const wanneer = s.catalogusCacheTijd ? new Date(s.catalogusCacheTijd).toLocaleString('nl-NL') : 'onbekend';
    $('cataloguscache').textContent = `${s.catalogusCacheTypes || 0} Type-ID-routes bewaard · ${wanneer}`
      + (s.catalogusVolledig ? ' · volledige scan gedaan, rares worden overgeslagen' : '');
    $('cataloguscache').className = 'klein goed';
  } else {
    $('cataloguscache').textContent = 'cataloguscache is leeg';
    $('cataloguscache').className = 'klein';
  }
  $('cachewissen').disabled = meubelBezig || !(s.catalogusCacheTypes || s.catalogusVolledig);
  $('cacheexport').disabled = !s.catalogusCacheTypes;
  $('cachebestand').disabled = meubelBezig;

  if (s.melding && s.melding !== laatsteServerMelding) {
    laatsteServerMelding = s.melding;
    melden(s.melding);
  }
  $('start').disabled = !!s.loopt;
  $('stop').disabled = !s.loopt;
}

$('naam').addEventListener('change', async () => {
  const naam = $('naam').value.trim();
  await chrome.storage.local.set({ naam });
  await stuur({ bron: 'hotelPopup', soort: 'naam', naam });
});

$('wacht').addEventListener('change', async () => {
  const wacht = Math.max(500, parseInt($('wacht').value, 10) || 2000);
  $('wacht').value = wacht;
  await chrome.storage.local.set({ wacht });
  await stuur({ bron: 'hotelPopup', soort: 'wacht', wacht });
});

$('kaart').addEventListener('change', async (ev) => {
  const bestand = ev.target.files && ev.target.files[0];
  if (!bestand) return;
  try {
    const tekst = await bestand.text();
    const data = JSON.parse(tekst);
    const tegels = (data && typeof data === 'object' && data.tegels) ? data.tegels : data;
    if (!tegels || typeof tegels !== 'object' || !Object.keys(tegels).length) {
      return melden('Geen tegels in dit bestand gevonden.', 'fout');
    }
    await chrome.storage.local.set({ tegels });
    await stuur({ bron: 'hotelPopup', soort: 'kaart', tegels });
    melden(`${Object.keys(tegels).length} tegels ingeladen.`, 'goed');
  } catch (e) {
    melden('Kon het bestand niet lezen: ' + e.message, 'fout');
  }
});

$('start').addEventListener('click', async () => {
  if (!$('naam').value.trim()) return melden('Vul eerst je naam in.', 'fout');
  await stuur({ bron: 'hotelPopup', soort: 'start' });
  setTimeout(ververs, 200);
});

$('stop').addEventListener('click', async () => {
  await stuur({ bron: 'hotelPopup', soort: 'stop' });
  setTimeout(ververs, 200);
});

let schrijftNu = false;
let pauzeNu = false;

$('ticket').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'ticket-ophalen' });
  const t = (antwoord && antwoord.tekst) || '';
  if (!t) return melden('Geen ticket gevonden. Sta je in de client zelf?', 'waarschuwing');
  try {
    await navigator.clipboard.writeText(t);
    melden(`Ticket (${t.length} tekens) staat op je klembord.`, 'goed');
  } catch (e) {
    melden('Kopiëren mislukte; klik eerst in de popup en probeer opnieuw.', 'fout');
  }
});

$('pauze').addEventListener('click', async () => {
  pauzeNu = !pauzeNu;
  await chrome.storage.local.set({ pauze: pauzeNu });
  await stuur({ bron: 'hotelPopup', soort: 'pauze', aan: pauzeNu });
  melden(pauzeNu
    ? 'Herlaad de client: hij verbindt dan niet, je ticket blijft vers.'
    : 'Herlaad de client om weer normaal te verbinden.');
  setTimeout(ververs, 200);
});

$('schrijf').addEventListener('click', async () => {
  schrijftNu = !schrijftNu;
  await chrome.storage.local.set({ schrijft: schrijftNu });
  await stuur({ bron: 'hotelPopup', soort: 'schrijf', aan: schrijftNu });
  setTimeout(ververs, 200);
});

$('kamerkopie').addEventListener('click', async () => {
  const nummer = $('kamerid').textContent.trim();
  if (!nummer || nummer === 'onbekend') return;
  try {
    await navigator.clipboard.writeText(nummer);
    melden(`Kamer ${nummer} staat op je klembord.`, 'goed');
  } catch (e) {
    melden('Kopiëren mislukte; klik eerst in de popup en probeer opnieuw.', 'fout');
  }
});

$('logkopie').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'log-ophalen' });
  const tekst = (antwoord && antwoord.tekst) || '';
  if (!tekst) return melden('Nog niets meegeschreven.', 'waarschuwing');
  const vak = $('loguit');
  vak.hidden = false;
  vak.value = tekst;
  vak.select();
  try {
    await navigator.clipboard.writeText(tekst);
    melden('Log staat op je klembord (' + tekst.split('\n').length + ' regels).', 'goed');
  } catch (e) {
    melden('Selecteer de tekst hieronder en kopieer met Ctrl+C.', 'waarschuwing');
  }
});

$('logwissen').addEventListener('click', async () => {
  const antwoord = await stuur({ bron: 'hotelPopup', soort: 'log-wissen' });
  if (!antwoord || !antwoord.ok) return;
  $('loguit').value = '';
  $('loguit').hidden = true;
  melden('Meeschrijf-log gewist; meeschrijven blijft aan als het aan stond.', 'goed');
  setTimeout(ververs, 100);
});

async function koopStuur() {
  const aan = $('koopAan').checked;
  let aantal = Math.max(1, Math.min(25, parseInt($('koopAantal').value, 10) || 3));
  let pauze = Math.max(250, parseInt($('koopPauze').value, 10) || 400);
  $('koopAantal').value = aantal;
  $('koopPauze').value = pauze;
  await chrome.storage.local.set({ koopAan: aan, koopAantal: aantal, koopPauze: pauze });
  await stuur({ bron: 'hotelPopup', soort: 'koop', aan, aantal, pauze });
  setTimeout(ververs, 100);
}

$('koopAan').addEventListener('change', koopStuur);
$('koopAantal').addEventListener('change', koopStuur);
$('koopPauze').addEventListener('change', koopStuur);

const streamerGetal = (id, standaard) => {
  const n = parseInt($(id).value, 10);
  return Math.max(0, Math.min(2147483647, Number.isFinite(n) ? n : standaard));
};

async function streamerStuur() {
  const aan = $('streamerAan').checked;
  const credits = streamerGetal('streamerCredits', 1000);
  const duckets = streamerGetal('streamerDuckets', 500);
  const diamanten = streamerGetal('streamerDiamanten', 50);
  const namen = $('streamerNamen').checked;
  $('streamerCredits').value = credits;
  $('streamerDuckets').value = duckets;
  $('streamerDiamanten').value = diamanten;
  await chrome.storage.local.set({
    streamerAan: aan, streamerCredits: credits,
    streamerDuckets: duckets, streamerDiamanten: diamanten, streamerNamen: namen,
  });
  await stuur({ bron: 'hotelPopup', soort: 'streamer', aan, credits, duckets, diamanten, namen });
  melden(aan
    ? 'Streamermodus aan. Uiterlijken wijzigen bij het volgende kamerpacket.'
    : 'Streamermodus uit. Echte saldi zijn lokaal teruggezet.', 'goed');
  setTimeout(ververs, 100);
}

$('streamerAan').addEventListener('change', streamerStuur);
$('streamerCredits').addEventListener('change', streamerStuur);
$('streamerDuckets').addEventListener('change', streamerStuur);
$('streamerDiamanten').addEventListener('change', streamerStuur);
$('streamerNamen').addEventListener('change', streamerStuur);

$('inspecteurAan').addEventListener('change', async () => {
  const aan = $('inspecteurAan').checked;
  await chrome.storage.local.set({ inspecteurAan: aan });
  await stuur({ bron: 'hotelPopup', soort: 'inspecteur', aan });
  melden(aan
    ? 'Inspector aan. Dubbelklik of gebruik nu een meubel in de kamer.'
    : 'Furniture Inspector uit.', 'goed');
  setTimeout(ververs, 100);
});

$('meubeldebug').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'meubeldebug-ophalen' });
  const tekst = antwoord && antwoord.tekst;
  if (!tekst) return melden('Geen parserdebug beschikbaar.', 'fout');
  const blob = new Blob([tekst], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'helper-meubeldebug.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  melden('Parserdebug gedownload. Dit bestand kan kamernamen en custom meubeltekst bevatten.', 'waarschuwing');
});

$('snapshot').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'snapshot-ophalen' });
  const tekst = (antwoord && antwoord.tekst) || '';
  if (!tekst) return melden('Kon geen snapshot uit het hoteltabblad ophalen.', 'fout');
  try {
    const data = JSON.parse(tekst);
    if (!data.aantal) return melden('Geen meubels bekend. Loop de kamer opnieuw binnen en probeer opnieuw.', 'waarschuwing');
    const blob = new Blob([tekst], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kamer-${data.bronKamer || 'onbekend'}-snapshot.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    melden(`Snapshot met ${data.aantal} meubels gedownload.`, 'goed');
  } catch (e) {
    melden('Snapshot kon niet worden verwerkt: ' + e.message, 'fout');
  }
});

$('vloerplanexport').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'vloerplan-ophalen' });
  const tekst = (antwoord && antwoord.tekst) || '';
  if (!tekst) return melden('Geen vloerplan ontvangen. Loop de kamer opnieuw binnen.', 'waarschuwing');
  try {
    const plan = JSON.parse(tekst);
    if (plan.formaat !== 'hotel-loper-vloerplan' || !Array.isArray(plan.rijen) ||
        plan.rijen.length !== plan.hoogte ||
        !plan.rijen.every(rij => typeof rij === 'string' && rij.length === plan.breedte)) {
      throw new Error('ongeldig vloerplan');
    }
    const blob = new Blob([tekst], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kamer-${plan.bronKamer}-vloerplan.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    melden(`Vloerplan ${plan.breedte}×${plan.hoogte} gedownload; er is niets gewijzigd.`, 'goed');
  } catch (e) {
    melden('Vloerplan exporteren mislukt: ' + e.message, 'fout');
  }
});

$('vloerplanbestand').addEventListener('change', async (ev) => {
  const bestand = ev.target.files && ev.target.files[0];
  if (!bestand) return;
  try {
    const plan = JSON.parse(await bestand.text());
    if (plan.formaat !== 'hotel-loper-vloerplan' || plan.versie !== 1 ||
        !Array.isArray(plan.rijen) || plan.rijen.length !== plan.hoogte ||
        !plan.rijen.every(rij => typeof rij === 'string' && rij.length === plan.breedte &&
                                /^[0-9a-z]+$/i.test(rij))) {
      throw new Error('geen basisvloerplan; het oude bestand met cellen kan niet worden geïmporteerd');
    }
    await stuur({ bron: 'hotelPopup', soort: 'vloerplan-laden', plan });
    melden(`Vloerplan uit kamer ${plan.bronKamer} geladen (${plan.breedte}×${plan.hoogte}).`, 'goed');
    setTimeout(ververs, 100);
  } catch (e) {
    melden('Vloerplan laden mislukt: ' + e.message, 'fout');
  } finally {
    ev.target.value = '';
  }
});

$('vloerplantoepassen').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'stand-opvragen' });
  const s = antwoord && antwoord.stand;
  if (!s || !s.vloerplanBron || !s.vloerplanDoelGekalibreerd || !s.verbonden ||
      (s.vloerplanBron === s.kamer && !s.vloerplanHerstelBackup)) {
    return melden('Vloerplan of doelkamerinstellingen ontbreken.', 'fout');
  }
  const vraag = `${s.vloerplanHerstelBackup && s.vloerplanBron === s.kamer ? 'Herstel' : 'Vervang'} het HELE vloerplan van jouw kamer ${s.kamer} met het bestand uit kamer ${s.vloerplanBron} (${s.vloerplanImportBreedte}×${s.vloerplanImportHoogte})?\n\n` +
    'Tegels en hoogtes in de doelkamer worden overschreven. ' +
    'Meubels worden niet verplaatst. Dit wordt één keer naar de hotelserver gestuurd.';
  if (!confirm(vraag)) return;
  await stuur({ bron: 'hotelPopup', soort: 'vloerplan-opslaan',
                doelKamer: s.kamer, bronKamer: s.vloerplanBron });
  melden('Vloerplan één keer verzonden; controleer de doelkamer in de client.', 'waarschuwing');
  setTimeout(ververs, 150);
});

$('snapshotbestand').addEventListener('change', async (ev) => {
  const bestand = ev.target.files && ev.target.files[0];
  if (!bestand) return;
  try {
    const plan = JSON.parse(await bestand.text());
    if (!plan || plan.formaat !== 'hotel-loper-kamersnapshot' || !Array.isArray(plan.items)) {
      throw new Error('geen geldige Helper-kamersnapshot');
    }
    await stuur({ bron: 'hotelPopup', soort: 'bouwplan', plan });
    melden(`${plan.items.length} meubels als bouwplan geladen.`, 'goed');
    setTimeout(ververs, 150);
  } catch (e) {
    melden('Snapshot laden mislukt: ' + e.message, 'fout');
  }
});

$('bouwstart').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'stand-opvragen' });
  const s = antwoord && antwoord.stand;
  if (!s || !s.bouwplanAantal) return melden('Laad eerst een snapshotbestand.', 'fout');
  const zelfdeKamer = s.bouwplanBron && s.kamer === s.bouwplanBron;
  const vraag = `Plaats maximaal ${s.bouwplanAantal} meubels uit je bestaande inventaris in kamer ${s.kamer}?\n\n` +
    (zelfdeKamer ? 'Let op: dit is dezelfde kamer als de snapshot; meubels kunnen dubbel worden geplaatst.\n\n' : '') +
    'Er worden geen meubels gekocht. Zorg dat de doelkamer dezelfde indeling heeft.';
  if (!confirm(vraag)) return;
  await bewaarBouwPauze(false);
  await stuur({ bron: 'hotelPopup', soort: 'bouw-start' });
  setTimeout(ververs, 100);
});

async function bewaarBouwPauze(toonMelding = true) {
  const invoer = Number.parseInt($('bouwPauze').value, 10);
  const pauze = Math.max(180, Math.min(10000, Number.isFinite(invoer) ? invoer : 500));
  $('bouwPauze').value = pauze;
  await chrome.storage.local.set({ bouwPauze: pauze });
  await stuur({ bron: 'hotelPopup', soort: 'bouw-pauze', pauze });
  if (toonMelding) melden(`Bouwpauze ingesteld op ${pauze} ms.`, 'goed');
}

$('bouwPauze').addEventListener('change', () => bewaarBouwPauze());

$('aankoopanalyse').addEventListener('click', async () => {
  await stuur({ bron: 'hotelPopup', soort: 'aankoop-analyse' });
  melden('Inventaris en catalogus worden vergeleken…', 'waarschuwing');
  setTimeout(ververs, 100);
});

$('koopenbouw').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'stand-opvragen' });
  const s = antwoord && antwoord.stand;
  if (!s || !s.aankoopKlaar || !s.aankoopAantal) return melden('Voer eerst de catalogusanalyse uit.', 'fout');
  const namen = { 0: 'duckets', 5: 'diamanten' };
  const kosten = [];
  if (s.aankoopCredits) kosten.push(`${s.aankoopCredits} credits`);
  for (const [type, bedrag] of Object.entries(s.aankoopValuta || {})) {
    if (bedrag) kosten.push(`${bedrag} ${namen[type] || `valuta ${type}`}`);
  }
  const vraag = `Echt ${s.aankoopAantal} cataloguspakketten in ` +
    `${s.aankoopVerzoeken || s.aankoopAantal} verzoeken kopen voor ${kosten.join(' + ') || '0'}?\n\n` +
    `${s.aankoopNietTeKoop || 0} meubels zijn niet gevonden en worden overgeslagen. ` +
    'Na het kopen wordt de inventaris opnieuw geladen en begint het bouwen.';
  if (!confirm(vraag)) return;
  await bewaarBouwPauze(false);
  await stuur({ bron: 'hotelPopup', soort: 'koop-en-bouw' });
  setTimeout(ververs, 100);
});

$('cacheexport').addEventListener('click', async () => {
  const opslag = await chrome.storage.local.get(['catalogusRouteCache']);
  const cache = opslag.catalogusRouteCache;
  if (!cache || !cache.routes) return melden('De cataloguscache is leeg.', 'fout');
  const blob = new Blob([JSON.stringify(cache, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'helper-cataloguscache.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  melden(`Cataloguscache met ${Object.keys(cache.routes).length} routes geëxporteerd.`, 'goed');
});

$('cataloguscontrole').addEventListener('click', async () => {
  await stuur({ bron: 'hotelPopup', soort: 'catalogus-controle' });
  melden('Cataloguspagina’s worden gecontroleerd; dit kan even duren.', 'waarschuwing');
  setTimeout(ververs, 100);
});

$('catalogusdiagnose').addEventListener('click', async () => {
  const antwoord = await stuur({ soort: 'catalogus-diagnose-ophalen' });
  if (!antwoord || !antwoord.tekst) return melden('Nog geen catalogusdiagnose beschikbaar.', 'fout');
  const rapport = JSON.parse(antwoord.tekst);
  const blob = new Blob([antwoord.tekst], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'helper-catalogusdiagnose.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  melden(`${rapport.nietGelezenPaginas.length} van ${rapport.indexPaginas} pagina's niet gelezen; diagnose gedownload.`,
         rapport.nietGelezenPaginas.length ? 'waarschuwing' : 'goed');
});

$('cachebestand').addEventListener('change', async (ev) => {
  const bestand = ev.target.files && ev.target.files[0];
  if (!bestand) return;
  try {
    const cache = JSON.parse(await bestand.text());
    if (!cache || cache.formaat !== 'hotel-loper-catalogusroutes' || cache.versie !== 1 ||
        !cache.routes || typeof cache.routes !== 'object' || Array.isArray(cache.routes)) {
      throw new Error('geen geldige Helper-cataloguscache');
    }
    await chrome.storage.local.set({ catalogusRouteCache: cache });
    await stuur({ bron: 'hotelPopup', soort: 'catalogus-cache-laden', cache });
    melden(`Cataloguscache met ${Object.keys(cache.routes).length} routes geïmporteerd.`, 'goed');
    setTimeout(ververs, 100);
  } catch (e) {
    melden('Cache importeren mislukt: ' + e.message, 'fout');
  } finally {
    ev.target.value = '';
  }
});

$('cachewissen').addEventListener('click', async () => {
  if (!confirm('De opgeslagen catalogusroutes wissen? Een onbekend meubel kan daarna weer een volledige scan vereisen.')) return;
  await chrome.storage.local.remove(['catalogusRouteCache']);
  await stuur({ bron: 'hotelPopup', soort: 'catalogus-cache-wissen' });
  melden('Cataloguscache gewist.', 'goed');
  setTimeout(ververs, 100);
});

$('bouwstop').addEventListener('click', async () => {
  await stuur({ bron: 'hotelPopup', soort: 'bouw-stop' });
  melden('Stop gevraagd; de huidige plaatsing wordt nog afgerond.', 'waarschuwing');
  setTimeout(ververs, 100);
});

(async () => {
  const opslag = await chrome.storage.local.get(
    ['naam', 'wacht', 'tegels', 'koopAan', 'koopAantal', 'koopPauze', 'bouwPauze',
     'streamerAan', 'streamerCredits', 'streamerDuckets', 'streamerDiamanten', 'streamerNamen',
     'inspecteurAan', 'popupTab']);
  kiesTab(opslag.popupTab || 'overzicht');
  if (opslag.naam) $('naam').value = opslag.naam;
  if (opslag.wacht) $('wacht').value = opslag.wacht;
  if (opslag.tegels) $('kaartstand').textContent = `${Object.keys(opslag.tegels).length} tegels geladen`;
  if (opslag.koopAan) $('koopAan').checked = true;
  if (opslag.koopAantal) $('koopAantal').value = opslag.koopAantal;
  if (opslag.koopPauze) $('koopPauze').value = opslag.koopPauze;
  if (opslag.bouwPauze !== undefined) $('bouwPauze').value = opslag.bouwPauze;
  if (opslag.streamerAan) $('streamerAan').checked = true;
  if (opslag.streamerCredits !== undefined) $('streamerCredits').value = opslag.streamerCredits;
  if (opslag.streamerDuckets !== undefined) $('streamerDuckets').value = opslag.streamerDuckets;
  if (opslag.streamerDiamanten !== undefined) $('streamerDiamanten').value = opslag.streamerDiamanten;
  if (opslag.streamerNamen !== undefined) $('streamerNamen').checked = !!opslag.streamerNamen;
  if (opslag.inspecteurAan) $('inspecteurAan').checked = true;
  ververs();
  setInterval(ververs, 1000);
})();
