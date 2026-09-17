
(() => {
  if (window.__hotelLoper) return;

  const Native = window.WebSocket;

  const stand = {
    naam: '',
    kamer: 0,
    wie: null,
    x: null, y: null, hoogte: 0,
    onderweg: null,
    onderwegTijd: 0,
    gevraagd: null,
    gevraagdTijd: 0,
    kaart: {},
    wacht: 2000,
    loopt: false,
    gelopen: 0,
    melding: '',
    verbonden: false,
    schrijft: false,
    pauze: false,
    ticket: 0,
    koopAan: false,
    koopAantal: 3,
    koopPauze: 400,
    koopBezig: 0,
    koopGedaan: 0,
    streamerAan: false,
    streamerCredits: 1000,
    streamerDuckets: 500,
    streamerDiamanten: 50,
    streamerNamen: true,
    inspecteurAan: false,
    inspecteurId: null,
    inspecteurSoort: '',
    vloerVerwacht: 0,
    wandVerwacht: 0,
    vloerLeesFout: '',
    wandLeesFout: '',
    meubelDebugKlaar: false,
    bouwplan: null,
    bouwBezig: false,
    bouwStop: false,
    bouwGedaan: 0,
    bouwTotaal: 0,
    bouwOntbrekend: 0,
    bouwMislukt: 0,
    bouwPlaatsMislukt: 0,
    bouwStateMislukt: 0,
    bouwPauze: 500,
    bouwStatus: '',
    catalogusBezig: false,
    catalogusPaginas: 0,
    catalogusGelezen: 0,
    catalogusBekeken: 0,
    catalogusFase: '',
    catalogusRouteTotaal: 0,
    catalogusRouteGedaan: 0,
    catalogusCacheTypes: 0,
    catalogusCacheTijd: 0,
    catalogusVolledig: false,
    aankoopKlaar: false,
    aankoopAnalyseBezig: false,
    aankoopAantal: 0,
    aankoopVerzoeken: 0,
    aankoopTypes: 0,
    aankoopNietTeKoop: 0,
    aankoopCredits: 0,
    aankoopValuta: {},
    aankoopBezig: false,
    aankoopGedaan: 0,
    aankoopMislukt: 0,
    aankoopStop: false,
  };

  const LOG_MAX = 400;
  const logboek = [];
  const httpLog = [];
  const HTTP_MAX = 120;
  let wsUrl = '';

  let socket = null;
  let looptimer = null;

  const H_LOOP = 3320;
  const H_KAMER = 2312;
  const H_KOOP = 3492;
  const H_GEBRUIKERS = 374;
  const H_UITERLIJK = 3920;
  const H_NAAM = 2182;
  const H_VALUTA = 2018;
  const H_CREDITS = 3475;
  const H_VLOERMEUBELS = 1778;
  const H_VLOERTOEVOEGEN = 1534;
  const H_VLOERBIJWERKEN = 3776;
  const H_VLOERVERWIJDEREN = 2703;
  const H_KAMER_HOOGTEKAART = 2753;
  const H_VLOERPLAN_OPSLAAN = 875;
  const H_WANDMEUBELS = 1369;
  const H_WANDTOEVOEGEN = 2187;
  const H_WANDBIJWERKEN = 2009;
  const H_WANDVERWIJDEREN = 3208;
  const H_VLOERGEBRUIK = 99;
  const H_VLOERVERPLAATS = 248;
  const H_WANDGEBRUIK = 210;
  const H_WANDVERPLAATS = 168;
  const H_OPPAKKEN = 3456;
  const H_INVENTARIS_VRAGEN = 3150;
  const H_INVENTARIS = 994;
  const H_INVENTARIS_VERWIJDER = 159;
  const H_PRATEN = 1314;
  const H_CATALOGUS_MODE = 1195;
  const H_CATALOGUS_INDEX = 1032;
  const H_CATALOGUS_PAGINA_VRAGEN = 412;
  const H_CATALOGUS_PAGINA = 804;
  const H_KOOP_GELUKT = 869;
  const H_KOOP_MISLUKT = 1404;
  const H_KOOP_NIET_BESCHIKBAAR = 3770;
  const H_MEUBELACTIES = new Set([H_VLOERGEBRUIK, H_VLOERVERPLAATS, 1533, 1990, 2144, 2765, 3617]);
  const ONDERWEG_VERVALT = 10000;
  const BEVESTIGING_WACHT = 1500;
  const BOUWHOOGTE_CHAT_PAUZE = 3000;

  const KOOP_PAUZE_MIN = 250;
  const KOOP_AANTAL_MAX = 25;
  const BULK_KOOP_MAX = 100;
  const STREAMER_MAX = 2147483647;
  const STREAMER_LOOK = 'hd-180-1.ch-210-66.lg-270-82.sh-290-80';
  const echteSaldi = new Map();
  const kamerGebruikers = new Map();
  const kamerMeubels = new Map();
  let kamerHoogtekaart = null;
  let kamerBasisVloerplan = null;
  let ingeladenVloerplan = null;
  let doelVloerplanTemplate = null;
  const meubelEigenaren = new Map();
  const inventaris = new Map();
  const inventarisFragmenten = new Map();
  let inventarisFragmentTotaal = 0;
  let inventarisCompleet = false;
  let inventarisWachter = null;
  let bouwWachter = null;
  const catalogusAanbod = new Map();
  let catalogusPaginaIds = [];
  const catalogusIndexInfo = new Map();
  let catalogusIndexWachter = null;
  const catalogusPaginaWachters = new Map();
  const catalogusPaginaFouten = new Map();
  const catalogusPaginaPogingen = new Map();
  const catalogusOngekoppeldeAntwoorden = [];
  let catalogusRouteCache = {};
  const catalogusNietGevonden = new Map();
  let catalogusLaatsteBewaarAantal = 0;
  let catalogusVolledigTot = 0;
  let aankoopVoorstel = null;
  let aankoopWachter = null;
  let laatsteChatTijd = 0;
  let laatsteMeubelDebug = '';
  let aliasTeller = 0;
  let inspecteurHost = null;
  let inspecteurSchaduw = null;
  const lokaleBerichten = new WeakSet();
  let inkomendeRij = Promise.resolve();


  class Lezer {
    constructor(bytes) { this.b = bytes; this.pos = 0; this.dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }
    int() {
      if (this.pos + 4 > this.b.length) throw new Error('op');
      const v = this.dv.getInt32(this.pos); this.pos += 4; return v;
    }
    string() {
      if (this.pos + 2 > this.b.length) throw new Error('op');
      const n = this.dv.getUint16(this.pos);
      if (this.pos + 2 + n > this.b.length) throw new Error('op');
      const stuk = this.b.slice(this.pos + 2, this.pos + 2 + n);
      this.pos += 2 + n;
      return new TextDecoder('utf-8', { fatal: false }).decode(stuk);
    }
    bool() {
      if (this.pos + 1 > this.b.length) throw new Error('op');
      return this.b[this.pos++] !== 0;
    }
  }

  function bytesNaarBase64(bytes) {
    let binair = '';
    for (let i = 0; i < bytes.length; i += 32768) {
      binair += String.fromCharCode(...bytes.subarray(i, i + 32768));
    }
    return btoa(binair);
  }

  const splits = (buf) => {
    const dv = new DataView(buf);
    const uit = [];
    let off = 0;
    while (off + 6 <= dv.byteLength) {
      const len = dv.getInt32(off);
      if (len < 2 || off + 4 + len > dv.byteLength) break;
      uit.push({ header: dv.getUint16(off + 4),
                 body: new Uint8Array(buf.slice(off + 6, off + 4 + len)) });
      off += 4 + len;
    }
    return uit;
  };

  const inpakken = (header, ints) => {
    const out = new Uint8Array(6 + ints.length * 4);
    const dv = new DataView(out.buffer);
    dv.setInt32(0, 2 + ints.length * 4);
    dv.setUint16(4, header);
    ints.forEach((n, i) => dv.setInt32(6 + i * 4, n));
    return out.buffer;
  };

  const begrensBedrag = (waarde, standaard) => {
    const n = parseInt(waarde, 10);
    return Math.max(0, Math.min(STREAMER_MAX, Number.isFinite(n) ? n : standaard));
  };

  const tekstBytes = (tekst) => {
    const inhoud = new TextEncoder().encode(String(tekst));
    const uit = new Uint8Array(2 + inhoud.length);
    new DataView(uit.buffer).setUint16(0, inhoud.length);
    uit.set(inhoud, 2);
    return uit;
  };

  const intBytes = (getal) => {
    const uit = new Uint8Array(4);
    new DataView(uit.buffer).setInt32(0, getal | 0);
    return uit;
  };

  const voegBytes = (...delen) => {
    const lengte = delen.reduce((n, d) => n + d.length, 0);
    const uit = new Uint8Array(lengte);
    let pos = 0;
    for (const deel of delen) { uit.set(deel, pos); pos += deel.length; }
    return uit;
  };

  function aliasVoor(gebruiker) {
    if (!gebruiker.alias) gebruiker.alias = 'Gast ' + String(++aliasTeller).padStart(2, '0');
    return gebruiker.alias;
  }

  function leesKamerGebruikers(body) {
    const r = new Lezer(body);
    const uit = [];
    try {
      const aantal = r.int();
      if (aantal < 0 || aantal > 400) return [];
      for (let i = 0; i < aantal; i++) {
        const gebruiker = {
          webId: r.int(), naam: r.string(), motto: r.string(), look: r.string(),
          unitId: r.int(), x: r.int(), y: r.int(), z: r.string(),
          richting: r.int(), type: r.int(),
        };
        if (gebruiker.type !== 1) return [];
        gebruiker.geslacht = r.string();
        gebruiker.groep = r.int();
        gebruiker.groepStatus = r.int();
        gebruiker.groepNaam = r.string();
        gebruiker.zwemLook = r.string();
        gebruiker.score = r.int();
        gebruiker.moderator = r.bool();
        uit.push(gebruiker);
      }
      return r.pos === body.length ? uit : [];
    } catch (e) { return []; }
  }

  function leesUiterlijk(body) {
    const r = new Lezer(body);
    try {
      const gebruiker = {
        unitId: r.int(), look: r.string(), geslacht: r.string(),
        motto: r.string(), score: r.int(),
      };
      return r.pos === body.length ? gebruiker : null;
    } catch (e) { return null; }
  }

  function leesNaam(body) {
    const r = new Lezer(body);
    try {
      const gebruiker = { webId: r.int(), unitId: r.int(), naam: r.string() };
      return r.pos === body.length ? gebruiker : null;
    } catch (e) { return null; }
  }

  const uiterlijkBody = (gebruiker, look) => voegBytes(
    intBytes(gebruiker.unitId), tekstBytes(look),
    tekstBytes(gebruiker.geslacht || 'M'), tekstBytes(gebruiker.motto || ''),
    intBytes(gebruiker.score || 0));

  const naamBody = (gebruiker, naam) => voegBytes(
    intBytes(gebruiker.webId || 0), intBytes(gebruiker.unitId), tekstBytes(naam));

  function onthoudIdentiteiten(header, body) {
    if (header === H_GEBRUIKERS) {
      for (const nieuw of leesKamerGebruikers(body)) {
        const oud = kamerGebruikers.get(nieuw.unitId);
        if (oud && oud.alias) nieuw.alias = oud.alias;
        kamerGebruikers.set(nieuw.unitId, nieuw);
      }
    } else if (header === H_UITERLIJK) {
      const nieuw = leesUiterlijk(body);
      if (nieuw) {
        const oud = kamerGebruikers.get(nieuw.unitId);
        if (oud) Object.assign(oud, nieuw);
      }
    } else if (header === H_NAAM) {
      const nieuw = leesNaam(body);
      if (nieuw) {
        const oud = kamerGebruikers.get(nieuw.unitId);
        if (oud) { oud.naam = nieuw.naam; oud.webId = nieuw.webId; }
      }
    }
  }

  function verbergUiterlijken(body) {
    const treffers = [];
    const decoder = new TextDecoder('utf-8', { fatal: true });
    for (let i = 0; i + 4 <= body.length;) {
      const n = (body[i] << 8) | body[i + 1];
      if (n >= 6 && n <= 500 && i + 2 + n <= body.length) {
        try {
          const tekst = decoder.decode(body.slice(i + 2, i + 2 + n));
          if (/(^|\.)(hd|hr|ch|cc|ca|lg|sh|ha|he|ea|fa|wa)-\d+/i.test(tekst) &&
              /(^|\.)hd-\d+/i.test(tekst)) {
            treffers.push({ begin: i, einde: i + 2 + n });
            i += 2 + n;
            continue;
          }
        } catch (e) {  }
      }
      i++;
    }
    if (!treffers.length) return body;

    const nep = tekstBytes(STREAMER_LOOK);
    const lengte = body.length + treffers.reduce(
      (t, r) => t + nep.length - (r.einde - r.begin), 0);
    const uit = new Uint8Array(lengte);
    let bron = 0, doel = 0;
    for (const r of treffers) {
      uit.set(body.slice(bron, r.begin), doel); doel += r.begin - bron;
      uit.set(nep, doel); doel += nep.length;
      bron = r.einde;
    }
    uit.set(body.slice(bron), doel);
    return uit;
  }

  function verbergValuta(body) {
    const uit = body.slice();
    try {
      const dv = new DataView(uit.buffer, uit.byteOffset, uit.byteLength);
      if (uit.length < 4) return body;
      const aantal = dv.getInt32(0);
      if (aantal < 0 || aantal > 100 || 4 + aantal * 8 > uit.length) return body;
      for (let i = 0; i < aantal; i++) {
        const pos = 4 + i * 8;
        const soort = dv.getInt32(pos);
        if (soort === 0) dv.setInt32(pos + 4, stand.streamerDuckets);
        if (soort === 5) dv.setInt32(pos + 4, stand.streamerDiamanten);
      }
      return uit;
    } catch (e) { return body; }
  }

  function streamerBody(header, body) {
    if (!stand.streamerAan) return body;
    if (header === H_CREDITS) return tekstBytes(stand.streamerCredits + '.0');
    if (header === H_VALUTA) return verbergValuta(body);
    if (header === H_GEBRUIKERS || header === H_UITERLIJK) return verbergUiterlijken(body);
    if (header === H_NAAM && stand.streamerNamen) {
      const naam = leesNaam(body);
      const gebruiker = naam && kamerGebruikers.get(naam.unitId);
      if (naam && gebruiker) return naamBody(gebruiker, aliasVoor(gebruiker));
    }
    return body;
  }

  function streamerBuffer(buf) {
    const packets = splits(buf);
    if (!packets.length) return buf;
    const gelezen = packets.reduce((n, p) => n + 6 + p.body.length, 0);
    if (gelezen !== buf.byteLength) return buf;

    const delen = [];
    let totaal = 0;
    for (const p of packets) {
      if (p.header === H_CREDITS || p.header === H_VALUTA) echteSaldi.set(p.header, p.body.slice());
      onthoudIdentiteiten(p.header, p.body);
      const deel = new Uint8Array(inpakBytes(p.header, streamerBody(p.header, p.body)));
      delen.push(deel); totaal += deel.length;
    }
    const uit = new Uint8Array(totaal);
    let pos = 0;
    for (const deel of delen) { uit.set(deel, pos); pos += deel.length; }
    return uit.buffer;
  }


  function leesMeubelData(r) {
    const vlaggen = r.int();
    const soort = vlaggen & 0xff;
    let state = '';
    let samenvatting = '';
    if (soort === 0) {
      state = r.string();
    } else if (soort === 1) {
      const aantal = r.int();
      if (aantal < 0 || aantal > 1000) throw new Error('ongeldige map-data');
      const waarden = {};
      for (let i = 0; i < aantal; i++) waarden[r.string()] = r.string();
      state = waarden.state ?? '';
      samenvatting = Object.entries(waarden).slice(0, 4).map(([k, v]) => `${k}=${v}`).join(', ');
    } else if (soort === 2) {
      const aantal = r.int();
      if (aantal < 0 || aantal > 1000) throw new Error('ongeldige string-data');
      const waarden = [];
      for (let i = 0; i < aantal; i++) waarden.push(r.string());
      state = waarden[0] ?? '';
      samenvatting = waarden.slice(0, 4).join(', ');
    } else if (soort === 3) {
      state = r.string();
      samenvatting = `stemmen=${r.int()}`;
    } else if (soort === 4) {
      state = '';
    } else if (soort === 5) {
      const aantal = r.int();
      if (aantal < 0 || aantal > 1000) throw new Error('ongeldige nummer-data');
      const waarden = [];
      for (let i = 0; i < aantal; i++) waarden.push(r.int());
      state = waarden.length ? String(waarden[0]) : '';
      samenvatting = waarden.slice(0, 6).join(', ');
    } else if (soort === 6) {
      state = r.string();
      const scoreSoort = r.int(), wisSoort = r.int(), aantal = r.int();
      if (aantal < 0 || aantal > 1000) throw new Error('ongeldige score-data');
      for (let i = 0; i < aantal; i++) {
        r.int();
        const namen = r.int();
        if (namen < 0 || namen > 1000) throw new Error('ongeldige score-namen');
        for (let j = 0; j < namen; j++) r.string();
      }
      samenvatting = `scoretype=${scoreSoort}, wissen=${wisSoort}`;
    } else if (soort === 7) {
      state = r.string();
      samenvatting = `hits=${r.int()}, doel=${r.int()}`;
    } else {
      throw new Error(`onbekende meubeldata type ${soort} (vlaggen ${vlaggen})`);
    }

    let editie = null;
    if (vlaggen & 0x100) editie = { nummer: r.int(), totaal: r.int() };
    return { soort, state, samenvatting, editie };
  }

  function leesVloerMeubel(r) {
    const start = r.pos;
    const item = { soort: 'vloer' };
    let fase = 'Item-ID';
    try {
      item.id = r.int();
      fase = 'Type-ID'; item.spriteId = r.int();
      fase = 'x'; item.x = r.int();
      fase = 'y'; item.y = r.int();
      fase = 'rotatie'; item.rotatie = r.int();
      fase = 'z'; item.z = r.string();
      fase = 'stapelhoogte'; item.stapelhoogte = r.string();
      fase = 'extra'; item.extra = r.int();
      fase = 'basisvalidatie';
      const zGetal = Number(item.z);
      const stapelGetal = item.stapelhoogte === '' ? 0 : Number(item.stapelhoogte);
      if (!Number.isInteger(item.id) || item.id <= 0 ||
          !Number.isInteger(item.spriteId) || item.spriteId === 0 ||
          !Number.isInteger(item.x) || item.x < -1 || item.x > 1024 ||
          !Number.isInteger(item.y) || item.y < -1 || item.y > 1024 ||
          !Number.isInteger(item.rotatie) || item.rotatie < 0 || item.rotatie > 7 ||
          !Number.isFinite(zGetal) || !Number.isFinite(stapelGetal)) {
        throw new Error(`ongeldige basiswaarden x=${item.x}, y=${item.y}, rot=${item.rotatie}, ` +
                        `z=${JSON.stringify(item.z)}, stapel=${JSON.stringify(item.stapelhoogte)}`);
      }
      fase = 'meubeldata'; item.data = leesMeubelData(r);
      fase = 'verloopt'; item.verloopt = r.int();
      fase = 'gebruik'; item.gebruik = r.int();
      fase = 'eigenaar'; item.eigenaarId = r.int();
      if (item.spriteId < 0) { fase = 'spriteNaam'; item.spriteNaam = r.string(); }
      return item;
    } catch (e) {
      throw new Error(`${e.message}; fase ${fase}; startbyte ${start}; ` +
        `Item-ID ${item.id ?? '?'}, Type-ID ${item.spriteId ?? '?'}`);
    }
  }

  function leesWandMeubel(r) {
    const item = {
      soort: 'wand', id: parseInt(r.string(), 10), spriteId: r.int(),
      wandpositie: r.string(), state: r.string(),
      verloopt: r.int(), gebruik: r.int(), eigenaarId: r.int(),
    };
    if (!Number.isInteger(item.id)) throw new Error('ongeldig wandmeubel');
    return item;
  }

  function bewaarMeubel(item, eigenaar) {
    const sleutel = `${item.soort}:${item.id}`;
    const oud = kamerMeubels.get(sleutel);
    item.eigenaar = eigenaar || meubelEigenaren.get(item.eigenaarId) || (oud && oud.eigenaar) || '';
    item.bijgewerkt = new Date().toLocaleTimeString('nl-NL');
    kamerMeubels.set(sleutel, item);
    bevestigBouwMeubel(item);
    if (stand.inspecteurId === item.id && stand.inspecteurSoort === item.soort) tekenInspecteur();
  }

  function leesMeubelPacket(header, body) {
    const r = new Lezer(body);
    let leesSoort = '';
    let itemIndex = -1;
    let verwacht = 0;
    let laatsteGoed = null;
    try {
      if (header === H_VLOERMEUBELS || header === H_WANDMEUBELS) {
        const eigenaren = r.int();
        if (eigenaren < 0 || eigenaren > 10000) return;
        const nieuweEigenaren = new Map();
        for (let i = 0; i < eigenaren; i++) nieuweEigenaren.set(r.int(), r.string());
        const aantal = r.int();
        if (aantal < 0 || aantal > 20000) return;
        const soort = header === H_VLOERMEUBELS ? 'vloer' : 'wand';
        leesSoort = soort;
        verwacht = aantal;
        if (soort === 'vloer') stand.vloerVerwacht = aantal;
        else stand.wandVerwacht = aantal;
        const items = [];
        for (let i = 0; i < aantal; i++) {
          itemIndex = i;
          const gelezen = soort === 'vloer' ? leesVloerMeubel(r) : leesWandMeubel(r);
          items.push(gelezen);
          laatsteGoed = gelezen;
        }
        meubelEigenaren.clear();
        for (const [id, naam] of nieuweEigenaren) meubelEigenaren.set(id, naam);
        for (const sleutel of [...kamerMeubels.keys()]) {
          if (sleutel.startsWith(soort + ':')) kamerMeubels.delete(sleutel);
        }
        for (const item of items) bewaarMeubel(item);
        if (soort === 'vloer') stand.vloerLeesFout = '';
        else stand.wandLeesFout = '';
      } else if (header === H_VLOERTOEVOEGEN || header === H_VLOERBIJWERKEN) {
        leesSoort = 'vloer';
        const item = leesVloerMeubel(r);
        bewaarMeubel(item, header === H_VLOERTOEVOEGEN ? r.string() : '');
      } else if (header === H_WANDTOEVOEGEN || header === H_WANDBIJWERKEN) {
        leesSoort = 'wand';
        const item = leesWandMeubel(r);
        bewaarMeubel(item, header === H_WANDTOEVOEGEN ? r.string() : '');
      } else if (header === H_VLOERVERWIJDEREN) {
        const id = parseInt(r.string(), 10);
        kamerMeubels.delete(`vloer:${id}`);
        if (stand.inspecteurId === id && stand.inspecteurSoort === 'vloer') {
          stand.inspecteurId = null; tekenInspecteur('Het geselecteerde meubel is verwijderd.');
        }
      } else if (header === H_WANDVERWIJDEREN) {
        const id = parseInt(r.string(), 10);
        kamerMeubels.delete(`wand:${id}`);
        if (stand.inspecteurId === id && stand.inspecteurSoort === 'wand') {
          stand.inspecteurId = null; tekenInspecteur('Het geselecteerde meubel is verwijderd.');
        }
      }
    } catch (e) {
      const waar = itemIndex >= 0 ? `item ${itemIndex + 1}/${verwacht}` : `header ${header}`;
      const vorige = laatsteGoed
        ? `; vorige Item-ID ${laatsteGoed.id}, Type-ID ${laatsteGoed.spriteId}, data ${laatsteGoed.data && laatsteGoed.data.soort}`
        : '';
      const fout = `${waar}, byte ${r.pos}/${body.length}: ${e.message}${vorige}`;
      if (leesSoort === 'vloer') stand.vloerLeesFout = fout;
      if (leesSoort === 'wand') stand.wandLeesFout = fout;
      if (header === H_VLOERMEUBELS || header === H_WANDMEUBELS) {
        laatsteMeubelDebug = JSON.stringify({
          formaat: 'hotel-loper-meubeldebug', versie: 1,
          gemaaktOp: new Date().toISOString(), header, fout,
          opmerking: 'Kan kamereigenaren en custom meubeltekst bevatten.',
          bodyBase64: bytesNaarBase64(body),
        });
        stand.meubelDebugKlaar = true;
      }
      melden(`meubellijst niet volledig gelezen: ${fout}`);
    }
  }

  function leesInventarisItem(r) {
    const geschenkId = r.int();
    const type = r.string().toUpperCase();
    const id = r.int();
    const typeId = r.int();
    const extra = r.int();
    const data = leesMeubelData(r);
    const recyclebaar = r.bool(), verhandelbaar = r.bool();
    const stapelbaar = r.bool(), marktplaats = r.bool();
    const verloopt = r.int();
    const huurGestart = r.bool();
    const kamerId = r.int();
    if (type === 'S') { r.string(); r.int(); }
    return { geschenkId, type, id, typeId, extra, data, recyclebaar,
             verhandelbaar, stapelbaar, marktplaats, verloopt, huurGestart, kamerId };
  }

  function leesInventarisPacket(body) {
    const r = new Lezer(body);
    try {
      const totaal = r.int(), nummer = r.int(), aantal = r.int();
      if (totaal < 1 || totaal > 1000 || nummer < 0 || nummer >= totaal ||
          aantal < 0 || aantal > 100000) return;
      const items = [];
      for (let i = 0; i < aantal; i++) items.push(leesInventarisItem(r));
      if (inventarisFragmentTotaal && inventarisFragmentTotaal !== totaal) inventarisFragmenten.clear();
      inventarisFragmentTotaal = totaal;
      inventarisFragmenten.set(nummer, items);
      if (inventarisFragmenten.size !== totaal) { stuurStand(); return; }

      inventaris.clear();
      for (let i = 0; i < totaal; i++) {
        const fragment = inventarisFragmenten.get(i);
        if (!fragment) return;
        for (const item of fragment) {
          if (item.type === 'S' || item.type === 'I') inventaris.set(item.id, item);
        }
      }
      inventarisCompleet = true;
      if (inventarisWachter) {
        clearTimeout(inventarisWachter.timer);
        inventarisWachter.resolve(true);
        inventarisWachter = null;
      }
      stuurStand();
    } catch (e) {
    }
  }

  function vraagVerseInventaris() {
    if (!socket || socket.readyState !== 1) return Promise.resolve(false);
    inventarisFragmenten.clear();
    inventarisFragmentTotaal = 0;
    inventarisCompleet = false;
    if (inventarisWachter) {
      clearTimeout(inventarisWachter.timer);
      inventarisWachter.resolve(false);
    }
    const antwoord = new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (inventarisWachter && inventarisWachter.timer === timer) inventarisWachter = null;
        resolve(false);
      }, 20000);
      inventarisWachter = { resolve, timer };
    });
    socket.send(inpakBytes(H_INVENTARIS_VRAGEN, new Uint8Array()));
    return antwoord;
  }

  function leesCatalogusIndex(body) {
    const r = new Lezer(body);
    const paginas = [];
    const info = new Map();
    const leesPagina = () => {
      const zichtbaar = r.bool();
      r.int();
      const id = r.int();
      r.string();
      r.string();
      const aanbiedingen = r.int();
      if (aanbiedingen < 0 || aanbiedingen > 10000) throw new Error('ongeldige aanbiedingenlijst');
      for (let i = 0; i < aanbiedingen; i++) r.int();
      const kinderen = r.int();
      if (kinderen < 0 || kinderen > 10000) throw new Error('ongeldige catalogusboom');
      if (id > 0) {
        paginas.push(id);
        info.set(id, { zichtbaar, aanbiedingenIndex: aanbiedingen, kinderenIndex: kinderen });
      }
      for (let i = 0; i < kinderen; i++) leesPagina();
    };
    try {
      leesPagina();
      catalogusPaginaIds = [...new Set(paginas)];
      catalogusIndexInfo.clear();
      for (const [id, data] of info) catalogusIndexInfo.set(id, data);
      stand.catalogusPaginas = catalogusPaginaIds.length;
      if (catalogusIndexWachter) {
        clearTimeout(catalogusIndexWachter.timer);
        catalogusIndexWachter.resolve(catalogusPaginaIds.length > 0);
        catalogusIndexWachter = null;
      }
      stuurStand();
    } catch (e) {  }
  }

  function leesCatalogusItem(r, paginaId) {
    const item = {
      paginaId, itemId: r.int(), naam: r.string(),
    };
    r.bool();
    item.credits = r.int();
    item.punten = r.int();
    item.puntenType = r.int();
    item.kanGeven = r.bool();
    const aantalProducten = r.int();
    if (aantalProducten < 0 || aantalProducten > 1000) throw new Error('ongeldig catalogusitem');
    item.producten = [];
    for (let i = 0; i < aantalProducten; i++) {
      const type = r.string().toUpperCase();
      if (type === 'B') {
        item.producten.push({ type, code: r.string(), aantal: 1, limited: false });
        continue;
      }
      const product = { type, typeId: r.int(), extra: r.string(), aantal: r.int(), limited: r.bool() };
      if (product.limited) { product.editieTotaal = r.int(); product.editieOver = r.int(); }
      item.producten.push(product);
    }
    item.club = r.int() !== 0;
    item.heeftOffer = r.bool();
    r.bool();
    item.afbeelding = r.string();
    return item;
  }

  const catalogusPaginasGelezen = new Set();

  function wisAanbodVanPagina(paginaId) {
    for (const [sleutel, lijst] of catalogusAanbod) {
      const over = lijst.filter(a => a.paginaId !== paginaId);
      if (over.length) catalogusAanbod.set(sleutel, over);
      else catalogusAanbod.delete(sleutel);
    }
    catalogusPaginasGelezen.delete(paginaId);
  }

  function bewaarCatalogusRoutes() {
    const routes = { ...catalogusRouteCache };
    for (const [sleutel, lijst] of catalogusAanbod) {
      const paginas = [...new Set(lijst.map(a => a.paginaId).filter(Number.isInteger))];
      if (paginas.length) routes[sleutel] = paginas;
    }
    catalogusRouteCache = routes;
    stand.catalogusCacheTypes = Object.keys(routes).length;
    stand.catalogusCacheTijd = Date.now();
    window.postMessage({
      bron: 'hotelLoper', soort: 'catalogus-cache-bewaren',
      cache: { formaat: 'hotel-loper-catalogusroutes', versie: 1,
               gemaaktOp: new Date().toISOString(), routes,
               volledigTot: catalogusVolledigTot, scanGecontroleerd: true,
               nietGevonden: Object.fromEntries(catalogusNietGevonden) },
    }, '*');
  }

  function leesCatalogusPagina(body) {
    const r = new Lezer(body);
    let paginaId = 0;
    let fase = 'pagina-ID';
    let itemIndex = -1;
    try {
      paginaId = r.int();
      fase = 'paginakop';
      r.string();
      r.string();
      const afbeeldingen = r.int();
      if (afbeeldingen < 0 || afbeeldingen > 1000) throw new Error('ongeldige pagina-afbeeldingen');
      fase = 'afbeeldingen';
      for (let i = 0; i < afbeeldingen; i++) r.string();
      fase = 'paginateksten';
      const teksten = r.int();
      if (teksten < 0 || teksten > 1000) throw new Error('ongeldige paginateksten');
      for (let i = 0; i < teksten; i++) r.string();
      fase = 'itemaantal';
      const aantal = r.int();
      if (aantal < 0 || aantal > 10000) throw new Error('ongeldige pagina-items');
      const items = [];
      fase = 'items';
      for (let i = 0; i < aantal; i++) {
        itemIndex = i;
        items.push(leesCatalogusItem(r, paginaId));
      }
      for (const item of items) {
        if (item.producten.length !== 1) continue;
        const product = item.producten[0];
        if (product.type !== 'S' && product.type !== 'I') continue;
        const soort = product.type === 'I' ? 'wand' : 'vloer';
        const sleutel = `${soort}:${product.typeId}`;
        if (!catalogusAanbod.has(sleutel)) catalogusAanbod.set(sleutel, []);
        const lijst = catalogusAanbod.get(sleutel);
        if (!lijst.some(a => a.paginaId === paginaId && a.itemId === item.itemId)) {
          lijst.push({ ...item, product, soort });
        }
      }
      catalogusPaginasGelezen.add(paginaId);
      catalogusPaginaFouten.delete(paginaId);
      stand.catalogusGelezen = catalogusPaginasGelezen.size;
      if (catalogusPaginasGelezen.size - catalogusLaatsteBewaarAantal >= 50) {
        catalogusLaatsteBewaarAantal = catalogusPaginasGelezen.size;
        bewaarCatalogusRoutes();
      }
      const wachter = catalogusPaginaWachters.get(paginaId);
      if (wachter) {
        catalogusPaginaWachters.delete(paginaId);
        clearTimeout(wachter.timer);
        wachter.resolve(true);
      }
      stuurStand();
    } catch (e) {
      if (paginaId > 0) {
        catalogusPaginaFouten.set(paginaId, {
          reden: 'parserfout', fout: String(e && e.message || e), bytes: body.length,
          positie: r.pos, fase, itemIndex,
          pogingen: catalogusPaginaPogingen.get(paginaId) || 0,
          tijd: new Date().toISOString(),
        });
      } else {
        catalogusOngekoppeldeAntwoorden.push({
          reden: 'pagina-ID niet leesbaar', fout: String(e && e.message || e),
          bytes: body.length, positie: r.pos, fase, itemIndex,
          tijd: new Date().toISOString(),
        });
      }
      const wachter = catalogusPaginaWachters.get(paginaId);
      if (wachter) {
        catalogusPaginaWachters.delete(paginaId);
        clearTimeout(wachter.timer);
        wachter.resolve(false);
      }
    }
  }

  function vraagCatalogusIndex() {
    if (catalogusPaginaIds.length) return Promise.resolve(true);
    if (!socket || socket.readyState !== 1) return Promise.resolve(false);
    if (catalogusIndexWachter) return catalogusIndexWachter.promise;
    let afronden;
    const promise = new Promise(resolve => { afronden = resolve; });
    const timer = setTimeout(() => {
      if (catalogusIndexWachter && catalogusIndexWachter.timer === timer) catalogusIndexWachter = null;
      afronden(false);
    }, 7000);
    catalogusIndexWachter = { resolve: afronden, timer, promise };
    socket.send(inpakBytes(H_CATALOGUS_MODE, tekstBytes('NORMAL')));
    return promise;
  }

  function vraagCatalogusPagina(id, ververs = false, wachttijdMs = 4000) {
    if (ververs && !catalogusPaginaWachters.has(id)) wisAanbodVanPagina(id);
    if (catalogusPaginasGelezen.has(id)) return Promise.resolve(true);
    if (catalogusPaginaWachters.has(id)) return catalogusPaginaWachters.get(id).promise;
    let afronden;
    const promise = new Promise(resolve => { afronden = resolve; });
    const begonnen = performance.now();
    const pogingen = (catalogusPaginaPogingen.get(id) || 0) + 1;
    catalogusPaginaPogingen.set(id, pogingen);
    const timer = setTimeout(() => {
      catalogusPaginaWachters.delete(id);
      if (catalogusPaginaFouten.get(id)?.reden !== 'parserfout') {
        catalogusPaginaFouten.set(id, {
          reden: `geen leesbaar antwoord binnen ${wachttijdMs / 1000} seconden`,
          wachtMs: Math.round(performance.now() - begonnen), pogingen,
          tijd: new Date().toISOString(),
        });
      }
      afronden(false);
    }, wachttijdMs);
    catalogusPaginaWachters.set(id, { resolve: afronden, timer, promise });
    socket.send(inpakBytes(H_CATALOGUS_PAGINA_VRAGEN,
      voegBytes(intBytes(id), intBytes(0), tekstBytes('NORMAL'))));
    return promise;
  }

  async function herprobeerCatalogusPaginas(ids) {
    const opnieuw = [...new Set(ids)].filter(id =>
      !catalogusPaginasGelezen.has(id) &&
      catalogusPaginaFouten.get(id)?.reden?.startsWith('geen leesbaar antwoord'));
    for (let i = 0; i < opnieuw.length; i++) {
      stand.bouwStatus = `catalogus: mislukte pagina's opnieuw proberen ${i + 1}/${opnieuw.length}`;
      stuurStand();
      await vraagCatalogusPagina(opnieuw[i], false, 7000);
      await bouwPauze(300);
    }
  }

  async function scanCatalogus(ontbrekendeSleutels) {
    const indexGoed = await vraagCatalogusIndex();
    if (!indexGoed) return false;
    stand.catalogusBezig = true;
    stand.catalogusFase = 'cache';
    stand.catalogusRouteTotaal = 0;
    stand.catalogusRouteGedaan = 0;
    try {
      for (const [sleutel, tijd] of catalogusNietGevonden) {
        if (!Number.isFinite(tijd)) catalogusNietGevonden.delete(sleutel);
      }
      const teZoeken = new Set([...ontbrekendeSleutels].filter(s => !catalogusNietGevonden.has(s)));
      const mistNog = () => [...teZoeken].some(s => !catalogusAanbod.has(s));
      if (!teZoeken.size) return true;
      const routeIds = [...new Set([...teZoeken]
        .flatMap(s => Array.isArray(catalogusRouteCache[s]) ? catalogusRouteCache[s] : []))]
        .filter(id => catalogusPaginaIds.includes(id));
      stand.catalogusRouteTotaal = routeIds.length;
      stuurStand();
      for (let i = 0; i < routeIds.length; i += 2) {
        await Promise.all(routeIds.slice(i, i + 2).map(id => vraagCatalogusPagina(id, true)));
        stand.catalogusRouteGedaan = Math.min(i + 2, routeIds.length);
        stuurStand();
        await bouwPauze(100);
      }
      await herprobeerCatalogusPaginas(routeIds);
      if (routeIds.some(id => !catalogusPaginasGelezen.has(id))) {
        bewaarCatalogusRoutes();
        return false;
      }
      if (!mistNog()) { bewaarCatalogusRoutes(); return true; }
      if (catalogusVolledigTot) {
        const tijd = Date.now();
        for (const sleutel of teZoeken) {
          if (!catalogusAanbod.has(sleutel)) catalogusNietGevonden.set(sleutel, tijd);
        }
        bewaarCatalogusRoutes();
        return true;
      }
      const ids = catalogusPaginaIds.filter(id => !catalogusPaginasGelezen.has(id));
      const alBekeken = catalogusPaginasGelezen.size;
      stand.catalogusBekeken = alBekeken;
      stand.catalogusFase = 'volledig';
      stuurStand();
      let geprobeerd = 0;
      for (let i = 0; i < ids.length && mistNog(); i += 2) {
        const groep = ids.slice(i, i + 2);
        geprobeerd = i + groep.length;
        stand.catalogusBekeken = Math.min(catalogusPaginaIds.length,
          alBekeken + i + groep.length);
        stand.bouwStatus = 'catalogus wordt doorzocht…';
        stuurStand();
        await Promise.all(groep.map(id => vraagCatalogusPagina(id)));
        await bouwPauze(150);
      }
      await herprobeerCatalogusPaginas(ids.slice(0, geprobeerd));
      if (geprobeerd >= ids.length &&
          catalogusPaginaIds.every(id => catalogusPaginasGelezen.has(id))) {
        catalogusVolledigTot = Date.now();
        stand.catalogusVolledig = true;
        if (mistNog()) {
          const tijd = Date.now();
          for (const sleutel of teZoeken) {
            if (!catalogusAanbod.has(sleutel)) catalogusNietGevonden.set(sleutel, tijd);
          }
        }
      }
      bewaarCatalogusRoutes();
      return !mistNog() || !!catalogusVolledigTot;
    } finally {
      stand.catalogusBezig = false;
      stuurStand();
    }
  }

  function catalogusDiagnose() {
    return {
      formaat: 'hotel-loper-catalogusdiagnose', versie: 1,
      gemaaktOp: new Date().toISOString(),
      indexPaginas: catalogusPaginaIds.length,
      gelezenPaginas: catalogusPaginaIds.filter(id => catalogusPaginasGelezen.has(id)).length,
      nietGelezenPaginas: catalogusPaginaIds
        .filter(id => !catalogusPaginasGelezen.has(id))
        .map(id => ({ paginaId: id, ...(catalogusIndexInfo.get(id) || {}),
                      ...(catalogusPaginaFouten.get(id) || { reden: 'niet aangevraagd' }) })),
      ongekoppeldeAntwoorden: catalogusOngekoppeldeAntwoorden,
    };
  }

  async function controleerCatalogusPaginas() {
    if (stand.catalogusBezig || stand.aankoopBezig || stand.aankoopAnalyseBezig || stand.bouwBezig) return;
    if (!socket || socket.readyState !== 1) return melden('geen hotelverbinding');
    if (!await vraagCatalogusIndex()) return melden('catalogusindex niet ontvangen');
    stand.catalogusBezig = true;
    stand.catalogusFase = 'controle';
    catalogusVolledigTot = 0;
    stand.catalogusVolledig = false;
    catalogusNietGevonden.clear();
    try {
      const ids = catalogusPaginaIds.filter(id => !catalogusPaginasGelezen.has(id));
      const begin = catalogusPaginaIds.length - ids.length;
      stand.catalogusBekeken = begin;
      for (let i = 0; i < ids.length; i += 2) {
        const groep = ids.slice(i, i + 2);
        stand.catalogusBekeken = begin + i + groep.length;
        stand.bouwStatus = 'cataloguspagina’s controleren…';
        stuurStand();
        await Promise.all(groep.map(id => vraagCatalogusPagina(id)));
        await bouwPauze(150);
      }
      await herprobeerCatalogusPaginas(ids);
      const nietGelezen = catalogusPaginaIds.filter(id => !catalogusPaginasGelezen.has(id)).length;
      if (!nietGelezen) {
        catalogusVolledigTot = Date.now();
        stand.catalogusVolledig = true;
      }
      bewaarCatalogusRoutes();
      melden(nietGelezen
        ? `${nietGelezen} cataloguspagina's niet gelezen; download de diagnose`
        : 'alle cataloguspagina’s gelezen');
    } finally {
      stand.catalogusBezig = false;
      stuurStand();
    }
  }

  function kiesCatalogusAanbod(sleutel) {
    const opties = (catalogusAanbod.get(sleutel) || []).filter(a =>
      !a.product.limited && a.product.aantal > 0);
    opties.sort((a, b) =>
      Number(b.heeftOffer) - Number(a.heeftOffer) ||
      Number(a.product.aantal !== 1) - Number(b.product.aantal !== 1) ||
      (a.credits + a.punten) - (b.credits + b.punten));
    return opties[0] || null;
  }

  async function bereidAankopenVoor() {
    if (stand.catalogusBezig || stand.aankoopBezig || stand.aankoopAnalyseBezig || stand.bouwBezig) return;
    if (!stand.bouwplan) return melden('laad eerst een kamersnapshot');
    if (!socket || socket.readyState !== 1) return melden('geen hotelverbinding');
    stand.aankoopAnalyseBezig = true;
    try {
      stand.aankoopKlaar = false;
      aankoopVoorstel = null;
      stand.bouwStatus = 'verse inventaris opvragen…';
      stuurStand();
      const compleet = await vraagVerseInventaris();
      if (!compleet) return melden('inventaris niet volledig ontvangen');
      const verdeling = verdeelBouwplan();
      const aantallen = new Map();
      for (const item of verdeling.ontbrekend) {
        const sleutel = `${item.soort}:${item.typeId}`;
        aantallen.set(sleutel, (aantallen.get(sleutel) || 0) + 1);
      }
      if (!aantallen.size) {
        stand.aankoopKlaar = true;
        stand.aankoopAantal = 0;
        stand.aankoopVerzoeken = 0;
        stand.aankoopTypes = 0;
        stand.aankoopNietTeKoop = 0;
        stand.aankoopCredits = 0;
        stand.aankoopValuta = {};
        stand.bouwStatus = 'alles is al aanwezig in je inventaris';
        return stuurStand();
      }
      if (!await scanCatalogus(new Set(aantallen.keys()))) {
        stand.bouwStatus = 'catalogusscan onvolledig; download de diagnose en probeer opnieuw';
        stuurStand();
        return melden(stand.bouwStatus);
      }
      const aankopen = [], nietTeKoop = [];
      let credits = 0, pakketAantal = 0, verzoekAantal = 0;
      const valuta = {};
      for (const [sleutel, nodig] of aantallen) {
        const aanbod = kiesCatalogusAanbod(sleutel);
        if (!aanbod) { nietTeKoop.push({ sleutel, nodig }); continue; }
        const pakketten = Math.ceil(nodig / aanbod.product.aantal);
        aankopen.push({ sleutel, nodig, pakketten, aanbod });
        pakketAantal += pakketten;
        verzoekAantal += Math.ceil(pakketten / BULK_KOOP_MAX);
        credits += pakketten * aanbod.credits;
        if (aanbod.punten) valuta[aanbod.puntenType] = (valuta[aanbod.puntenType] || 0) + pakketten * aanbod.punten;
      }
      aankoopVoorstel = { aankopen, nietTeKoop, credits, valuta, pakketAantal, verzoekAantal,
                           bouwplan: stand.bouwplan };
      stand.aankoopKlaar = true;
      stand.aankoopAantal = pakketAantal;
      stand.aankoopVerzoeken = verzoekAantal;
      stand.aankoopTypes = aankopen.length;
      stand.aankoopNietTeKoop = [...nietTeKoop].reduce((n, x) => n + x.nodig, 0);
      stand.aankoopCredits = credits;
      stand.aankoopValuta = valuta;
      stand.bouwStatus = `${pakketAantal} pakketten in ${verzoekAantal} verzoeken voorbereid; ` +
        `${stand.aankoopNietTeKoop} meubels niet gevonden`;
      stuurStand();
    } finally {
      stand.aankoopAnalyseBezig = false;
      stuurStand();
    }
  }

  function wachtOpAankoop(timeout) {
    if (aankoopWachter) {
      clearTimeout(aankoopWachter.timer);
      aankoopWachter.resolve(false);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (aankoopWachter && aankoopWachter.timer === timer) aankoopWachter = null;
        resolve(false);
      }, timeout);
      aankoopWachter = { resolve, timer };
    });
  }

  function bevestigAankoop(goed) {
    if (!aankoopWachter) return;
    const wachter = aankoopWachter;
    aankoopWachter = null;
    clearTimeout(wachter.timer);
    wachter.resolve(goed);
  }

  async function koopOntbrekendEnBouw() {
    if (!aankoopVoorstel || !stand.aankoopKlaar || stand.aankoopBezig || stand.bouwBezig) return;
    if (aankoopVoorstel.bouwplan !== stand.bouwplan) return melden('bouwplan is veranderd; analyseer opnieuw');
    stand.aankoopBezig = true;
    stand.aankoopStop = false;
    stand.aankoopGedaan = 0;
    stand.aankoopMislukt = 0;
    const totaal = aankoopVoorstel.verzoekAantal;
    let verzoekIndex = 0;
    try {
      for (const regel of aankoopVoorstel.aankopen) {
        for (let resterend = regel.pakketten; resterend > 0;) {
          if (stand.aankoopStop) throw new Error('aankopen gestopt');
          const aanbod = regel.aanbod;
          const hoeveelheid = Math.min(BULK_KOOP_MAX, resterend);
          verzoekIndex++;
          stand.bouwStatus = `aankoop ${verzoekIndex}/${totaal}: ${aanbod.naam} ×${hoeveelheid}`;
          stuurStand();
          const antwoord = wachtOpAankoop(5000);
          echteSend.call(socket, inpakBytes(H_KOOP, voegBytes(
            intBytes(aanbod.paginaId), intBytes(aanbod.itemId), tekstBytes(''), intBytes(hoeveelheid))));
          const gelukt = await antwoord;
          if (gelukt) stand.aankoopGedaan += hoeveelheid;
          else stand.aankoopMislukt += hoeveelheid;
          resterend -= hoeveelheid;
          stuurStand();
          await bouwPauze(500);
        }
      }
      stand.bouwStatus = `aankopen klaar: ${stand.aankoopGedaan} pakketten gelukt, ` +
        `${stand.aankoopMislukt} mislukt`;
    } catch (e) {
      stand.bouwStatus = e.message;
    } finally {
      stand.aankoopBezig = false;
      stand.aankoopKlaar = false;
      aankoopVoorstel = null;
      stuurStand();
    }
    if (!stand.aankoopStop) {
      await bouwPauze(700);
      bouwUitInventaris();
    }
  }

  function snapshotObject() {
    const items = [...kamerMeubels.values()].map((item) => item.soort === 'vloer' ? {
      soort: 'vloer', oorspronkelijkItemId: item.id, typeId: item.spriteId,
      x: item.x, y: item.y, z: Number.parseFloat(item.z) || 0,
      rotatie: item.rotatie, state: item.data ? item.data.state : '',
    } : {
      soort: 'wand', oorspronkelijkItemId: item.id, typeId: item.spriteId,
      wandpositie: item.wandpositie, state: item.state || '',
    });
    items.sort((a, b) => {
      if (a.soort !== b.soort) return a.soort === 'vloer' ? -1 : 1;
      if (a.soort === 'vloer') return a.z - b.z || a.y - b.y || a.x - b.x;
      return a.typeId - b.typeId;
    });
    return {
      formaat: 'hotel-loper-kamersnapshot', versie: 1,
      gemaaktOp: new Date().toISOString(), bronKamer: stand.kamer || null,
      aantal: items.length, items,
    };
  }

  function leesKamerHoogtekaart(body) {
    if (!stand.kamer || body.length < 12) return;
    const r = new Lezer(body);
    const breedte = r.int();
    const totaal = r.int();
    if (breedte < 2 || breedte > 256 || totaal < breedte * 2 ||
        totaal > 65536 || totaal % breedte !== 0 || body.length !== 8 + totaal * 2) return;
    const hoogte = totaal / breedte;
    if (hoogte > 256) return;
    const cellen = [];
    for (let i = 0; i < totaal; i++) {
      cellen.push(r.dv.getInt16(r.pos));
      r.pos += 2;
    }
    kamerHoogtekaart = { kamer: stand.kamer, breedte, hoogte, cellen };
    if (kamerBasisVloerplan &&
        (kamerBasisVloerplan.breedte !== breedte || kamerBasisVloerplan.hoogte !== hoogte)) {
      kamerBasisVloerplan = null;
    }
    stuurStand();
  }

  function zoekBasisVloerplan(header, body) {
    if (!stand.kamer || kamerBasisVloerplan || body.length < 20 || body.length > 40000) return;
    const dv = new DataView(body.buffer, body.byteOffset, body.byteLength);
    for (let begin = 0; begin + 10 <= body.length; begin++) {
      const lengte = dv.getUint16(begin);
      if (lengte < 8 || begin + 2 + lengte > body.length) continue;
      const tekst = new TextDecoder('utf-8').decode(body.subarray(begin + 2, begin + 2 + lengte));
      if (!/^[0-9a-z\r\n]+$/i.test(tekst)) continue;
      const rijen = tekst.split(/\r\n|\r|\n/);
      while (rijen.length && !rijen[rijen.length - 1]) rijen.pop();
      const breedte = rijen[0]?.length || 0;
      if (breedte < 2 || breedte > 256 || rijen.length < 2 || rijen.length > 256 ||
          !rijen.every(rij => rij.length === breedte && /^[0-9a-z]+$/i.test(rij)) ||
          !rijen.some(rij => /[^x]/i.test(rij))) continue;
      if (kamerHoogtekaart &&
          (kamerHoogtekaart.breedte !== breedte || kamerHoogtekaart.hoogte !== rijen.length)) continue;
      kamerBasisVloerplan = { kamer: stand.kamer, breedte, hoogte: rijen.length,
                              rijen, pakketHeader: header };
      stuurStand();
      return;
    }
  }

  function vloerplanObject() {
    if (!kamerBasisVloerplan || kamerBasisVloerplan.kamer !== stand.kamer) return null;
    return {
      formaat: 'hotel-loper-vloerplan', versie: 1,
      gemaaktOp: new Date().toISOString(), bronKamer: stand.kamer,
      breedte: kamerBasisVloerplan.breedte, hoogte: kamerBasisVloerplan.hoogte,
      bronHeader: kamerBasisVloerplan.pakketHeader,
      rijen: kamerBasisVloerplan.rijen,
    };
  }

  function controleerVloerplanRijen(rijen, breedte, hoogte) {
    return Number.isInteger(breedte) && Number.isInteger(hoogte) &&
      breedte >= 2 && breedte <= 256 && hoogte >= 2 && hoogte <= 256 &&
      Array.isArray(rijen) && rijen.length === hoogte &&
      rijen.every(rij => typeof rij === 'string' && rij.length === breedte &&
                        /^[0-9a-z]+$/i.test(rij)) &&
      rijen.some(rij => /[^x]/i.test(rij));
  }

  function leesOpgeslagenDoelvloerplan(body) {
    if (!stand.kamer) return;
    try {
      const r = new Lezer(body);
      const tekst = r.string();
      const instellingen = Array.from({ length: 6 }, () => r.int());
      if (r.pos !== body.length) return;
      const scheiding = tekst.match(/\r\n|\r|\n/)?.[0] || '\r';
      const rijen = tekst.split(/\r\n|\r|\n/);
      while (rijen.length && !rijen[rijen.length - 1]) rijen.pop();
      if (!controleerVloerplanRijen(rijen, rijen[0]?.length, rijen.length)) return;
      doelVloerplanTemplate = { kamer: stand.kamer, rijen, scheiding, instellingen,
                                tijd: Date.now() };
      stuurStand();
    } catch (e) {  }
  }

  function laadVloerplan(invoer) {
    if (!invoer || invoer.formaat !== 'hotel-loper-vloerplan' || invoer.versie !== 1 ||
        !controleerVloerplanRijen(invoer.rijen, invoer.breedte, invoer.hoogte) ||
        !Number.isInteger(invoer.bronKamer) || invoer.bronKamer <= 0) {
      throw new Error('Geen geldig basisvloerplan. Een oud bestand met cellen is een live hoogtekaart.');
    }
    ingeladenVloerplan = { bronKamer: invoer.bronKamer, breedte: invoer.breedte,
                           hoogte: invoer.hoogte, rijen: [...invoer.rijen],
                           herstelBackup: invoer.herstelBackup === true &&
                             Array.isArray(invoer.bewaarInstellingen) &&
                             invoer.bewaarInstellingen.length === 6 &&
                             invoer.bewaarInstellingen.every(Number.isInteger),
                           bewaarInstellingen: invoer.bewaarInstellingen };
    stuurStand();
  }

  function slaIngeladenVloerplanOp(doelKamer, bronKamer) {
    if (!ingeladenVloerplan || !doelVloerplanTemplate ||
        !socket || socket.readyState !== 1 || stand.kamer !== doelKamer ||
        doelVloerplanTemplate.kamer !== doelKamer ||
        ingeladenVloerplan.bronKamer !== bronKamer ||
        (doelKamer === bronKamer && !ingeladenVloerplan.herstelBackup) ||
        Date.now() - doelVloerplanTemplate.tijd > 10 * 60 * 1000) {
      return melden('Vloerplan niet opgeslagen: laad het bestand en sla de editor in je doelkamer eerst ongewijzigd op.');
    }
    const tekst = ingeladenVloerplan.rijen.join(doelVloerplanTemplate.scheiding);
    if (new TextEncoder().encode(tekst).length > 40000) return melden('Vloerplan is te groot');
    const instellingen = doelKamer === bronKamer && ingeladenVloerplan.herstelBackup
      ? ingeladenVloerplan.bewaarInstellingen : doelVloerplanTemplate.instellingen;
    try {
      echteSend.call(socket, inpakBytes(H_VLOERPLAN_OPSLAAN,
        voegBytes(tekstBytes(tekst), ...instellingen.map(intBytes))));
    } catch (e) {
      return melden('Vloerplan niet verzonden: ' + e.message);
    }
    melden(`Vloerplan ${ingeladenVloerplan.breedte}×${ingeladenVloerplan.hoogte} verzonden voor kamer ${doelKamer}; controleer het resultaat in de client.`);
    stuurStand();
  }

  function laadBouwplan(invoer) {
    if (!invoer || invoer.formaat !== 'hotel-loper-kamersnapshot' || !Array.isArray(invoer.items)) {
      throw new Error('Dit is geen geldige Helper-kamersnapshot.');
    }
    if (!invoer.items.length) throw new Error('De snapshot bevat geen meubels.');
    if (invoer.items.length > 5000) throw new Error('De snapshot bevat meer dan 5000 meubels.');
    const items = invoer.items.map((ruw, index) => {
      const soort = ruw.soort === 'wand' ? 'wand' : (ruw.soort === 'vloer' ? 'vloer' : '');
      const typeId = Number.parseInt(ruw.typeId, 10);
      if (!soort || !Number.isInteger(typeId) || typeId <= 0) throw new Error(`Ongeldig meubel op regel ${index + 1}.`);
      if (soort === 'wand') {
        const wandpositie = String(ruw.wandpositie || '').trim();
        if (!wandpositie) throw new Error(`Wandpositie ontbreekt op regel ${index + 1}.`);
        return { soort, typeId, wandpositie, state: String(ruw.state ?? '') };
      }
      const x = Number.parseInt(ruw.x, 10), y = Number.parseInt(ruw.y, 10);
      const z = Number.parseFloat(ruw.z), rotatie = Number.parseInt(ruw.rotatie, 10);
      if (!Number.isInteger(x) || !Number.isInteger(y) || !Number.isFinite(z) || !Number.isInteger(rotatie)) {
        throw new Error(`Positie ontbreekt op regel ${index + 1}.`);
      }
      return { soort, typeId, x, y, z: Math.max(0, z), rotatie, state: String(ruw.state ?? '') };
    });
    stand.bouwplan = { bronKamer: invoer.bronKamer || null, items };
    stand.aankoopKlaar = false;
    stand.aankoopAantal = 0;
    stand.aankoopVerzoeken = 0;
    stand.aankoopTypes = 0;
    stand.aankoopNietTeKoop = 0;
    stand.aankoopCredits = 0;
    stand.aankoopValuta = {};
    aankoopVoorstel = null;
    stand.bouwTotaal = items.length;
    stand.bouwGedaan = 0;
    stand.bouwOntbrekend = 0;
    stand.bouwMislukt = 0;
    stand.bouwPlaatsMislukt = 0;
    stand.bouwStateMislukt = 0;
    stand.bouwStatus = `${items.length} meubels geladen; nog niet gebouwd`;
    stuurStand();
  }

  function normaleMeubelState(waarde) {
    const tekst = String(waarde ?? '').trim();
    if (tekst === '' || tekst === '0.0') return '0';
    return /^\d+$/.test(tekst) ? String(parseInt(tekst, 10)) : tekst;
  }

  function verdeelBouwplan() {
    const perType = new Map();
    for (const item of inventaris.values()) {
      const soort = item.type === 'I' ? 'wand' : 'vloer';
      const sleutel = `${soort}:${item.typeId}`;
      if (!perType.has(sleutel)) perType.set(sleutel, []);
      perType.get(sleutel).push(item);
    }
    const doelenPerType = new Map();
    for (const doel of stand.bouwplan.items) {
      const sleutel = `${doel.soort}:${doel.typeId}`;
      if (!doelenPerType.has(sleutel)) doelenPerType.set(sleutel, []);
      doelenPerType.get(sleutel).push(doel);
    }
    const taken = [], ontbrekend = [];
    for (const [sleutel, doelen] of doelenPerType) {
      const voorraad = [...(perType.get(sleutel) || [])];
      const toegewezen = new Map();

      for (const doel of doelen) {
        const index = voorraad.findIndex(item =>
          normaleMeubelState(item.data && item.data.state) === normaleMeubelState(doel.state));
        if (index >= 0) toegewezen.set(doel, voorraad.splice(index, 1)[0]);
      }
      for (const doel of doelen) {
        const item = toegewezen.get(doel) || voorraad.shift();
        if (item) taken.push({ doel, item });
        else ontbrekend.push(doel);
      }
    }
    taken.sort((a, b) => {
      if (a.doel.soort !== b.doel.soort) return a.doel.soort === 'vloer' ? -1 : 1;
      if (a.doel.soort === 'vloer') return a.doel.z - b.doel.z || a.doel.y - b.doel.y || a.doel.x - b.doel.x;
      return 0;
    });
    return { taken, ontbrekend };
  }

  const bouwPauze = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function wachtOpBouwMeubel(soort, id, timeout) {
    if (bouwWachter) {
      clearTimeout(bouwWachter.timer);
      bouwWachter.resolve(null);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (bouwWachter && bouwWachter.timer === timer) bouwWachter = null;
        resolve(null);
      }, timeout);
      bouwWachter = { soort, id, resolve, timer };
    });
  }

  function bevestigBouwMeubel(item) {
    if (!bouwWachter || bouwWachter.id !== item.id || bouwWachter.soort !== item.soort) return;
    const wachter = bouwWachter;
    bouwWachter = null;
    clearTimeout(wachter.timer);
    wachter.resolve(item);
  }

  async function zetBouwhoogte(z) {
    const waarde = Math.round(Math.max(0, Number(z) || 0) * 100) / 100;
    const opdracht = waarde === 0 ? ':bh' : `:bh ${waarde}`;
    while (Date.now() - laatsteChatTijd < BOUWHOOGTE_CHAT_PAUZE) {
      const over = BOUWHOOGTE_CHAT_PAUZE - (Date.now() - laatsteChatTijd);
      stand.bouwStatus = `wacht ${Math.max(1, Math.ceil(over / 1000))} sec. om spraakverbod te voorkomen`;
      stuurStand();
      await bouwPauze(Math.min(over + 25, 1000));
    }
    socket.send(inpakBytes(H_PRATEN, voegBytes(tekstBytes(opdracht), intBytes(0))));
    await bouwPauze(Math.max(500, stand.bouwPauze));
  }

  async function herstelState(item, gewenst) {
    if (!/^\d+$/.test(String(gewenst))) return true;
    const doelState = normaleMeubelState(gewenst);
    let huidig = item.soort === 'vloer' ? item.data && item.data.state : item.state;
    if (normaleMeubelState(huidig) === doelState) return true;
    await bouwPauze(Math.max(300, stand.bouwPauze));
    const live = kamerMeubels.get(`${item.soort}:${item.id}`);
    if (live) {
      item = live;
      huidig = item.soort === 'vloer' ? item.data && item.data.state : item.state;
      if (normaleMeubelState(huidig) === doelState) return true;
    }
    const header = item.soort === 'vloer' ? H_VLOERGEBRUIK : H_WANDGEBRUIK;
    const gezien = new Set([normaleMeubelState(huidig)]);
    for (let poging = 0; poging < 128 && !stand.bouwStop; poging++) {
      const antwoord = wachtOpBouwMeubel(item.soort, item.id, 1800);
      socket.send(inpakken(header, [item.id, 0]));
      const bijgewerkt = await antwoord;
      if (!bijgewerkt) return false;
      huidig = bijgewerkt.soort === 'vloer' ? bijgewerkt.data && bijgewerkt.data.state : bijgewerkt.state;
      const nieuweState = normaleMeubelState(huidig);
      if (nieuweState === doelState) return true;
      if (gezien.has(nieuweState)) return false;
      gezien.add(nieuweState);
      await bouwPauze(Math.max(250, stand.bouwPauze));
    }
    return false;
  }

  async function bouwUitInventaris() {
    if (stand.bouwBezig) return;
    if (!stand.bouwplan) return melden('laad eerst een kamersnapshot');
    if (!socket || socket.readyState !== 1 || !stand.kamer) return melden('ga eerst naar de doelkamer');
    stand.loopt = false;
    clearTimeout(looptimer);
    stand.bouwBezig = true;
    stand.bouwStop = false;
    stand.bouwGedaan = 0;
    stand.bouwMislukt = 0;
    stand.bouwPlaatsMislukt = 0;
    stand.bouwStateMislukt = 0;
    stand.bouwStatus = 'verse inventaris opvragen…';
    stuurStand();
    try {
      const compleet = await vraagVerseInventaris();
      if (!compleet) throw new Error('Inventaris niet volledig ontvangen binnen 20 seconden.');
      const { taken, ontbrekend } = verdeelBouwplan();
      stand.bouwOntbrekend = ontbrekend.length;
      stand.bouwTotaal = taken.length;
      if (!taken.length) throw new Error('Geen passende meubels in de inventaris gevonden.');

      let huidigeHoogte = null;
      for (let i = 0; i < taken.length; i++) {
        if (stand.bouwStop) break;
        const taak = taken[i], doel = taak.doel, inv = taak.item;
        if (doel.soort === 'vloer' && doel.z !== huidigeHoogte) {
          stand.bouwStatus = `bouwhoogte ${doel.z} instellen`;
          stuurStand();
          await zetBouwhoogte(doel.z);
          huidigeHoogte = doel.z;
        }
        const plaatsing = doel.soort === 'vloer'
          ? `${inv.id} ${doel.x} ${doel.y} ${doel.rotatie}`
          : `${inv.id} ${doel.wandpositie}`;
        stand.bouwStatus = `${i + 1}/${taken.length}: type ${doel.typeId} plaatsen`;
        stuurStand();
        const antwoord = wachtOpBouwMeubel(doel.soort, inv.id, 5000);
        socket.send(inpakBytes(1258, tekstBytes(plaatsing)));
        const geplaatst = await antwoord;
        if (!geplaatst) {
          stand.bouwMislukt++;
          stand.bouwPlaatsMislukt++;
          stand.bouwStatus = `plaatsing van type ${doel.typeId} niet bevestigd; overgeslagen`;
          stuurStand();
          await bouwPauze(Math.max(300, stand.bouwPauze));
          continue;
        }
        const stateGoed = await herstelState(geplaatst, doel.state);
        if (!stateGoed) {
          stand.bouwMislukt++;
          stand.bouwStateMislukt++;
        }
        stand.bouwGedaan++;
        stuurStand();
        await bouwPauze(stand.bouwPauze);
      }
      await zetBouwhoogte(0);
      stand.bouwStatus = stand.bouwStop
        ? `gestopt na ${stand.bouwGedaan} plaatsingen`
        : `klaar: ${stand.bouwGedaan} geplaatst, ${stand.bouwOntbrekend} ontbrekend, ` +
          `${stand.bouwPlaatsMislukt} plaatsingen mislukt, ${stand.bouwStateMislukt} states mislukt`;
    } catch (e) {
      stand.bouwStatus = 'gestopt: ' + e.message;
      try { await zetBouwhoogte(0); } catch (_) {  }
    } finally {
      stand.bouwBezig = false;
      stand.bouwStop = false;
      if (bouwWachter) {
        clearTimeout(bouwWachter.timer);
        bouwWachter.resolve(null);
        bouwWachter = null;
      }
      melden(stand.bouwStatus);
    }
  }

  function maakInspecteur() {
    if (inspecteurHost && inspecteurHost.isConnected) return inspecteurSchaduw;
    if (!document.documentElement) return null;
    inspecteurHost = document.createElement('div');
    inspecteurHost.id = 'hotel-loper-furniture-inspector';
    inspecteurHost.style.cssText = 'all:initial;position:fixed;right:18px;top:90px;z-index:2147483647;pointer-events:none';
    inspecteurSchaduw = inspecteurHost.attachShadow({ mode: 'open' });
    inspecteurSchaduw.innerHTML = `
      <style>
        #paneel{width:280px;background:rgba(16,19,27,.97);color:#e7eaf0;border:1px solid #3a4355;
          border-radius:12px;box-shadow:0 12px 35px rgba(0,0,0,.45);font:12px/1.45 system-ui,sans-serif;
          overflow:hidden;pointer-events:auto} #kop{display:flex;align-items:center;gap:8px;padding:9px 11px;
          background:#222837;cursor:move;user-select:none;font-weight:700} #kop span{flex:1} button{border:1px solid #475168;
          border-radius:6px;background:#2c3445;color:#eef2f8;padding:3px 7px;cursor:pointer;font:inherit}
        #inhoud{padding:10px 11px}.hint{color:#aab2c2}.rij{display:grid;grid-template-columns:92px 1fr;gap:5px;
          padding:3px 0;border-bottom:1px solid rgba(255,255,255,.055)}.label{color:#8e99ad}.waarde{font-family:ui-monospace,
          SFMono-Regular,Consolas,monospace;overflow-wrap:anywhere}.voet{display:flex;gap:6px;margin-top:10px;flex-wrap:wrap}
      </style>
      <section id="paneel"><header id="kop"><span>Furniture Inspector</span><button id="dicht" title="Paneel sluiten">×</button></header>
      <div id="inhoud"></div></section>`;
    document.documentElement.appendChild(inspecteurHost);

    inspecteurSchaduw.getElementById('dicht').addEventListener('click', () => {
      stand.inspecteurId = null;
      inspecteurHost.style.display = 'none';
      stuurStand();
    });
    const kop = inspecteurSchaduw.getElementById('kop');
    kop.addEventListener('pointerdown', (ev) => {
      if (ev.target.tagName === 'BUTTON') return;
      const beginX = ev.clientX, beginY = ev.clientY;
      const vak = inspecteurHost.getBoundingClientRect();
      inspecteurHost.style.right = 'auto';
      const beweeg = (e) => {
        inspecteurHost.style.left = Math.max(0, vak.left + e.clientX - beginX) + 'px';
        inspecteurHost.style.top = Math.max(0, vak.top + e.clientY - beginY) + 'px';
      };
      const klaar = () => {
        window.removeEventListener('pointermove', beweeg, true);
        window.removeEventListener('pointerup', klaar, true);
      };
      window.addEventListener('pointermove', beweeg, true);
      window.addEventListener('pointerup', klaar, true);
    });
    return inspecteurSchaduw;
  }

  function inspecteurRij(inhoud, label, waarde) {
    if (waarde === undefined || waarde === null || waarde === '') return;
    const rij = document.createElement('div'); rij.className = 'rij';
    const l = document.createElement('div'); l.className = 'label'; l.textContent = label;
    const w = document.createElement('div'); w.className = 'waarde'; w.textContent = String(waarde);
    rij.append(l, w); inhoud.appendChild(rij);
  }

  function tekenInspecteur(bericht) {
    const schaduw = maakInspecteur();
    if (!schaduw) return;
    inspecteurHost.style.display = stand.inspecteurAan ? 'block' : 'none';
    if (!stand.inspecteurAan) return;
    const inhoud = schaduw.getElementById('inhoud');
    inhoud.replaceChildren();
    const item = stand.inspecteurId === null ? null
      : kamerMeubels.get(`${stand.inspecteurSoort}:${stand.inspecteurId}`);
    if (!item) {
      const hint = document.createElement('div'); hint.className = 'hint';
      hint.textContent = bericht || 'Dubbelklik of gebruik een meubel om het te inspecteren. Verplaatsen of oppakken selecteert het ook.';
      inhoud.appendChild(hint);
      inspecteurRij(inhoud, 'Kameritems', kamerMeubels.size);
      return;
    }
    inspecteurRij(inhoud, 'Protocolgroep', item.soort === 'vloer' ? 'Vloerobject' : 'Wandobject');
    inspecteurRij(inhoud, 'Item-ID', item.id);
    inspecteurRij(inhoud, 'Type-ID (sprite)', item.spriteId);
    inspecteurRij(inhoud, 'Type-naam', item.spriteNaam);
    if (item.soort === 'vloer') {
      inspecteurRij(inhoud, 'Positie', `${item.x}, ${item.y}, ${item.z}`);
      inspecteurRij(inhoud, 'Rotatie', `${item.rotatie} (${(item.rotatie % 8) * 45}°)`);
      inspecteurRij(inhoud, 'Stapelhoogte', item.stapelhoogte);
      inspecteurRij(inhoud, 'State', item.data && item.data.state);
      inspecteurRij(inhoud, 'Extra data', item.data && item.data.samenvatting);
      if (item.data && item.data.editie) {
        inspecteurRij(inhoud, 'Limited', `${item.data.editie.nummer} / ${item.data.editie.totaal}`);
      }
    } else {
      inspecteurRij(inhoud, 'Wandpositie', item.wandpositie);
      inspecteurRij(inhoud, 'State', item.state);
    }
    inspecteurRij(inhoud, 'Eigenaar-ID', item.eigenaarId);
    inspecteurRij(inhoud, 'Eigenaar', stand.streamerAan && stand.streamerNamen ? 'verborgen' : item.eigenaar);
    inspecteurRij(inhoud, 'Gebruik', item.gebruik);
    inspecteurRij(inhoud, 'Bijgewerkt', item.bijgewerkt);

    const voet = document.createElement('div'); voet.className = 'voet';
    for (const [tekst, waarde] of [['Kopieer item-ID', item.id], ['Kopieer type-ID', item.spriteId]]) {
      const knop = document.createElement('button'); knop.textContent = tekst;
      knop.addEventListener('click', () => navigator.clipboard.writeText(String(waarde)).catch(() => {}));
      voet.appendChild(knop);
    }
    inhoud.appendChild(voet);
  }

  function selecteerMeubel(soort, id) {
    if (!stand.inspecteurAan || !Number.isInteger(id) || id <= 0) return;
    const andereSoort = soort === 'vloer' ? 'wand' : 'vloer';
    if (!kamerMeubels.has(`${soort}:${id}`) && kamerMeubels.has(`${andereSoort}:${id}`)) {
      soort = andereSoort;
    }
    stand.inspecteurSoort = soort;
    stand.inspecteurId = id;
    tekenInspecteur(kamerMeubels.has(`${soort}:${id}`)
      ? '' : `Meubel ${id} geselecteerd; de kamergegevens zijn nog niet ontvangen.`);
    stuurStand();
  }

  window.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Escape' || !stand.inspecteurAan) return;
    stand.inspecteurAan = false;
    stand.inspecteurId = null;
    tekenInspecteur();
    window.postMessage({ bron: 'hotelLoper', soort: 'inspecteur-instelling', aan: false }, '*');
    stuurStand();
  }, true);


  const isHoogte = (t) => /^-?\d+([.,]\d+)?$/.test(t || '');
  const hoogteGetal = (t) => {
    const n = parseFloat(String(t).replace(',', '.'));
    return Number.isFinite(n) ? n : 0;
  };
  const plausibel = (x, y) => x >= 0 && x < 256 && y >= 0 && y < 256;

  function* naPlekken(body, naam) {
    if (!naam) return;
    const doel = new TextEncoder().encode(naam);
    const merk = new Uint8Array(2 + doel.length);
    new DataView(merk.buffer).setUint16(0, doel.length);
    merk.set(doel, 2);
    const klein = (b) => (b >= 65 && b <= 90) ? b + 32 : b;
    for (let i = 0; i + merk.length <= body.length; i++) {
      let gelijk = true;
      for (let j = 0; j < merk.length; j++) {
        if (klein(body[i + j]) !== klein(merk[j])) { gelijk = false; break; }
      }
      if (gelijk) yield i + merk.length;
    }
  }

  function zoekMij(body, naam) {
    for (const na of naPlekken(body, naam)) {
      for (let over = 0; over <= 4; over++) {
        const r = new Lezer(body);
        r.pos = na;
        try {
          for (let k = 0; k < over; k++) r.string();
          const wie = r.int(), x = r.int(), y = r.int(), h = r.string();
          if (wie < 0 || !plausibel(x, y) || !isHoogte(h)) continue;
          return { wie, x, y, hoogte: hoogteGetal(h) };
        } catch (e) {  }
      }
    }
    return null;
  }

  function leesStatus(body) {
    const r = new Lezer(body);
    try {
      const aantal = r.int();
      if (aantal < 1 || aantal > 400) return null;
      const uit = [];
      for (let i = 0; i < aantal; i++) {
        const wie = r.int(), x = r.int(), y = r.int(), h = r.string();
        const kop = r.int(), lijf = r.int(), acties = r.string();
        if (wie < 0 || !plausibel(x, y) || !isHoogte(h)) return null;
        if (kop < 0 || kop > 7 || lijf < 0 || lijf > 7) return null;
        uit.push({ wie, x, y, hoogte: hoogteGetal(h), acties });
      }
      return r.pos === body.length ? uit : null;
    } catch (e) { return null; }
  }

  function leesMv(acties) {
    for (const stuk of String(acties || '').split('/')) {
      const s = stuk.trim();
      if (s.startsWith('mv ')) {
        const d = s.slice(3).split(',');
        const x = parseInt(d[0], 10), y = parseInt(d[1], 10);
        if (Number.isInteger(x) && Number.isInteger(y)) return [x, y];
        return null;
      }
    }
    return null;
  }

  function velden(body) {
    const uit = [];
    let i = 0;
    while (i < body.length) {
      const rest = body.length - i;
      if (rest >= 2) {
        const n = (body[i] << 8) | body[i + 1];
        if (n > 0 && n <= rest - 2) {
          const blok = body.slice(i + 2, i + 2 + n);
          let leesbaar = true;
          for (const b of blok) if (b < 9 || (b > 13 && b < 32)) { leesbaar = false; break; }
          if (leesbaar) { uit.push('tekst(' + n + ')'); i += 2 + n; continue; }
        }
      }
      if (rest >= 4) {
        const g = (body[i] << 24) | (body[i + 1] << 16) | (body[i + 2] << 8) | body[i + 3];
        uit.push(Math.abs(g) < 100000000 ? String(g) : 'getal(groot)');
        i += 4;
        continue;
      }
      uit.push('rest(' + rest + ')');
      break;
    }
    return uit;
  }

  function vorm(d, diep) {
    diep = diep || 0;
    if (Array.isArray(d)) return d.length ? [vorm(d[0], diep + 1)] : [];
    if (d && typeof d === 'object') {
      if (diep > 2) return '{...}';
      const uit = {};
      for (const k of Object.keys(d)) uit[k] = vorm(d[k], diep + 1);
      return uit;
    }
    if (typeof d === 'string') return 'tekst(' + d.length + ')';
    if (typeof d === 'number') return Math.abs(d) < 100000000 ? String(d) : 'getal(groot)';
    if (typeof d === 'boolean') return 'bool(' + d + ')';
    return String(d);
  }

  function zonderWaardes(url) {
    try {
      const u = new URL(url, location.href);
      const namen = [...u.searchParams.keys()];
      return u.origin + u.pathname + (namen.length ? '?' + namen.join('=..&') + '=..' : '');
    } catch (e) { return String(url).split('?')[0]; }
  }

  function schrijfHttp(methode, url, status, tekst) {
    if (!stand.schrijft || httpLog.length >= HTTP_MAX) return;
    if (!/leet\.city/.test(String(url)) && !String(url).startsWith('/')) return;
    let terug = null;
    if (tekst && tekst.length < 400000) {
      try { terug = vorm(JSON.parse(tekst)); }
      catch (e) { terug = tekst.slice(0, 15).indexOf('<') >= 0 ? 'html(' + tekst.length + ')'
                                                              : 'tekst(' + tekst.length + ')'; }
    }
    httpLog.push({
      tijd: new Date().toISOString().slice(11, 23),
      methode, url: zonderWaardes(url), status,
      terug: terug === null ? '' : JSON.stringify(terug),
    });
  }

  function schrijf(richting, p) {
    if (!stand.schrijft) return;
    if (logboek.length >= LOG_MAX) return;
    logboek.push({
      tijd: new Date().toISOString().slice(11, 23),
      richting, header: p.header, bytes: p.body.length,
      velden: velden(p.body).slice(0, 14),
    });
    if (logboek.length === LOG_MAX) melden('logboek vol (' + LOG_MAX + ' packets)');
  }

  function logTekst() {
    const regels = [
      '# Helper meeschrijf-logboek',
      '# websocket: ' + (wsUrl || '(nog geen verbinding gezien)'),
      '# ' + logboek.length + ' packets. Tekstvelden staan als tekst(lengte),',
      '# grote getallen als getal(groot) - dus geen tickets of namen.',
      '',
    ];
    for (const r of logboek) {
      regels.push(`${r.tijd} ${r.richting} ${String(r.header).padEnd(5)} ` +
                  `len=${String(r.bytes).padEnd(5)} ${r.velden.join('  ')}`);
    }
    if (httpLog.length) {
      regels.push('', '# HTTP-verzoeken (' + httpLog.length + '), waardes weggelaten', '');
      for (const r of httpLog) {
        regels.push(`${r.tijd} ${r.methode} ${r.url} -> ${r.status}` +
                    (r.terug ? '\n            terug: ' + r.terug : ''));
      }
    }
    return regels.join('\n');
  }


  function binnen(buf) {
    for (const p of splits(buf)) {
      schrijf('IN ', p);
      leesMeubelPacket(p.header, p.body);
      if (p.header === H_KAMER_HOOGTEKAART) leesKamerHoogtekaart(p.body);
      zoekBasisVloerplan(p.header, p.body);
      if (p.header === H_INVENTARIS) leesInventarisPacket(p.body);
      if (p.header === H_CATALOGUS_INDEX) leesCatalogusIndex(p.body);
      if (p.header === H_CATALOGUS_PAGINA) leesCatalogusPagina(p.body);
      if (p.header === H_KOOP_GELUKT) bevestigAankoop(true);
      if (p.header === H_KOOP_MISLUKT || p.header === H_KOOP_NIET_BESCHIKBAAR) bevestigAankoop(false);
      if (p.header === H_INVENTARIS_VERWIJDER) {
        try { inventaris.delete(new Lezer(p.body).int()); } catch (e) {  }
      }
      if (stand.naam) {
        const ik = zoekMij(p.body, stand.naam);
        if (ik) {
          const nieuw = stand.wie !== ik.wie;
          stand.wie = ik.wie;
          stand.onderweg = null;
          zetPlek(ik.x, ik.y, ik.hoogte);
          if (nieuw) stuurStand();
        }
      }
      if (stand.wie === null) continue;
      const lijst = leesStatus(p.body);
      if (!lijst) continue;
      for (const r of lijst) {
        if (r.wie !== stand.wie) continue;
        zetPlek(r.x, r.y, r.hoogte);
        const mv = leesMv(r.acties);
        const oud = stand.onderweg ? stand.onderweg.join(',') : '';
        if (mv) { stand.onderweg = mv; stand.onderwegTijd = Date.now(); }
        else { stand.onderweg = null; }
        stand.gevraagd = null;
        if ((stand.onderweg ? stand.onderweg.join(',') : '') !== oud) stuurStand();
      }
    }
  }

  function buiten(buf, sock) {
    for (const p of splits(buf)) {
      schrijf('UIT', p);
      if (p.header === H_KAMER) {
        try {
          const kamer = new Lezer(p.body).int();
          if (kamer > 0 && kamer !== stand.kamer) {
            kamerGebruikers.clear();
            kamerMeubels.clear();
            kamerHoogtekaart = null;
            kamerBasisVloerplan = null;
            doelVloerplanTemplate = null;
            meubelEigenaren.clear();
            stand.inspecteurId = null;
            stand.vloerVerwacht = 0;
            stand.wandVerwacht = 0;
            stand.vloerLeesFout = '';
            stand.wandLeesFout = '';
            stand.meubelDebugKlaar = false;
            laatsteMeubelDebug = '';
            aliasTeller = 0;
            stand.kamer = kamer;
            tekenInspecteur();
            melden('Kamer ' + kamer);
          }
        } catch (e) {  }
      } else if (p.header === H_VLOERPLAN_OPSLAAN) {
        leesOpgeslagenDoelvloerplan(p.body);
      } else if (p.header === H_PRATEN) {
        laatsteChatTijd = Date.now();
      } else if (p.header === H_KOOP && stand.koopAan) {
        try { herhaalKoop(sock, p.body); } catch (e) {  }
      } else if (stand.inspecteurAan) {
        try {
          const r = new Lezer(p.body);
          if (H_MEUBELACTIES.has(p.header)) selecteerMeubel('vloer', r.int());
          else if (p.header === H_WANDGEBRUIK || p.header === H_WANDVERPLAATS) selecteerMeubel('wand', r.int());
          else if (p.header === H_OPPAKKEN) {
            const categorie = r.int(), id = r.int();
            if (categorie === 10) selecteerMeubel('vloer', id);
            if (categorie === 20) selecteerMeubel('wand', id);
          }
        } catch (e) {  }
      }
    }
  }

  const inpakBytes = (header, payload) => {
    const out = new Uint8Array(6 + payload.length);
    const dv = new DataView(out.buffer);
    dv.setInt32(0, payload.length + 2);
    dv.setUint16(4, header);
    out.set(payload, 6);
    return out.buffer;
  };

  function stuurAlleenLokaal(sock, buf, alsBlob) {
    if (!sock) return;
    const data = alsBlob ? new Blob([buf]) : buf;
    const ev = new MessageEvent('message', { data });
    lokaleBerichten.add(ev);
    sock.dispatchEvent(ev);
  }

  function toonStreamerSaldi() {
    if (!socket || socket.readyState !== 1) return;
    for (const header of [H_CREDITS, H_VALUTA]) {
      const echt = echteSaldi.get(header);
      if (!echt) continue;
      const body = stand.streamerAan ? streamerBody(header, echt) : echt;
      stuurAlleenLokaal(socket, inpakBytes(header, body), socket.binaryType !== 'arraybuffer');
    }
  }

  function toonStreamerIdentiteiten() {
    if (!socket || socket.readyState !== 1) return;
    const alsBlob = socket.binaryType !== 'arraybuffer';
    for (const gebruiker of kamerGebruikers.values()) {
      const look = stand.streamerAan ? STREAMER_LOOK : gebruiker.look;
      stuurAlleenLokaal(socket, inpakBytes(H_UITERLIJK, uiterlijkBody(gebruiker, look)), alsBlob);
      const naam = stand.streamerAan && stand.streamerNamen
        ? aliasVoor(gebruiker) : gebruiker.naam;
      stuurAlleenLokaal(socket, inpakBytes(H_NAAM, naamBody(gebruiker, naam)), alsBlob);
    }
  }

  function herhaalKoop(sock, payload) {
    const totaal = Math.max(1, Math.min(KOOP_AANTAL_MAX, stand.koopAantal | 0));
    const extra = totaal - 1;
    if (extra <= 0) return;
    const pauze = Math.max(KOOP_PAUZE_MIN, stand.koopPauze | 0);
    stand.koopBezig = extra;
    melden(`aankoop gezien; nog ${extra} keer, ${pauze} ms uit elkaar`);
    for (let i = 1; i <= extra; i++) {
      setTimeout(() => {
        if (!sock || sock.readyState !== 1) {
          stand.koopBezig = 0;
          melden('verbinding dicht, herhalen gestopt');
          return;
        }
        echteSend.call(sock, inpakBytes(H_KOOP, payload));
        stand.koopGedaan++;
        stand.koopBezig = extra - i;
        if (i === extra) melden(`klaar: ${totaal} in totaal gekocht`);
        else stuurStand();
      }, i * pauze);
    }
  }

  function zetPlek(x, y, hoogte) {
    const anders = stand.x !== x || stand.y !== y || stand.hoogte !== hoogte;
    stand.x = x; stand.y = y; stand.hoogte = hoogte;
    if (anders) stuurStand();
  }

  function waarNu() {
    if (stand.onderweg && Date.now() - stand.onderwegTijd < ONDERWEG_VERVALT) {
      return stand.onderweg;
    }
    return (stand.x === null) ? null : [stand.x, stand.y];
  }

  const sleutel = (kamer, x, y, hoogte) =>
    `${kamer}:${x}:${y}:${Number(hoogte || 0).toFixed(1)}`;


  function mijnSleutel() {
    if (stand.x === null || !stand.kamer) return '';
    return sleutel(stand.kamer, stand.x, stand.y, stand.hoogte);
  }

  function stap() {
    if (!stand.loopt) return;
    if (!socket || socket.readyState !== 1) { melden('geen verbinding'); return plan(); }
    if (stand.x === null) { melden('ik weet nog niet waar je staat'); return plan(); }
    if (!stand.kamer) { melden('kamernummer nog onbekend - loop de kamer opnieuw binnen'); return plan(); }

    if (stand.onderweg && Date.now() - stand.onderwegTijd < ONDERWEG_VERVALT) {
      melden(`nog onderweg naar ${stand.onderweg[0]}:${stand.onderweg[1]}`);
      return plan();
    }
    if (stand.gevraagd && Date.now() - stand.gevraagdTijd < BEVESTIGING_WACHT) {
      return plan();
    }
    if (stand.gevraagd) {
      melden(`de server deed niets met de stap naar ${stand.gevraagd[0]}:${stand.gevraagd[1]}`);
      stand.gevraagd = null;
    }

    const s = mijnSleutel();
    const opties = stand.kaart[s];
    if (!opties || !opties.length) {
      melden(`geen stappen ingevuld voor ${s}`);
      return plan();
    }
    const keuze = opties[Math.floor(Math.random() * opties.length)];
    const [dx, dy] = keuze.split(',').map(n => parseInt(n, 10));
    if (!Number.isInteger(dx) || !Number.isInteger(dy)) { melden('rare stap: ' + keuze); return plan(); }

    const doel = [stand.x + dx, stand.y + dy];
    try {
      socket.send(inpakken(H_LOOP, doel));
    } catch (e) {
      melden('lopen mislukt: ' + e.message);
      stand.loopt = false;
      return stuurStand();
    }
    stand.gevraagd = doel;
    stand.gevraagdTijd = Date.now();
    stand.gelopen++;
    melden(`stap naar ${doel[0]}:${doel[1]}`);
    plan();
  }

  function plan() {
    clearTimeout(looptimer);
    if (stand.loopt) looptimer = setTimeout(stap, Math.max(500, stand.wacht));
  }

  function melden(tekst) {
    stand.melding = tekst;
    stuurStand();
  }

  function ticketNu() {
    try {
      const c = window.NitroConfig || {};
      const t = c['sso.ticket'] || c.sso || '';
      return typeof t === 'string' ? t : '';
    } catch (e) { return ''; }
  }


  function stuurStand() {
    const hier = waarNu();
    window.postMessage({
      bron: 'hotelLoper',
      soort: 'stand',
      stand: {
        naam: stand.naam, kamer: stand.kamer, wie: stand.wie,
        x: stand.x, y: stand.y, hoogte: stand.hoogte,
        hier: hier, onderweg: stand.onderweg,
        loopt: stand.loopt, gelopen: stand.gelopen,
        wacht: stand.wacht, melding: stand.melding,
        verbonden: !!(socket && socket.readyState === 1),
        tegels: Object.keys(stand.kaart).length,
        hierBekend: !!stand.kaart[mijnSleutel()],
        sleutel: mijnSleutel(),
        schrijft: stand.schrijft, packets: logboek.length, http: httpLog.length,
        wsUrl: wsUrl, pauze: stand.pauze, ticket: ticketNu().length,
        koopAan: stand.koopAan, koopAantal: stand.koopAantal,
        koopPauze: stand.koopPauze, koopBezig: stand.koopBezig,
        koopGedaan: stand.koopGedaan, koopMin: KOOP_PAUZE_MIN, koopMax: KOOP_AANTAL_MAX,
        streamerAan: stand.streamerAan,
        streamerCredits: stand.streamerCredits,
        streamerDuckets: stand.streamerDuckets,
        streamerDiamanten: stand.streamerDiamanten,
        streamerNamen: stand.streamerNamen,
        inspecteurAan: stand.inspecteurAan,
        inspecteurId: stand.inspecteurId,
        inspecteurSoort: stand.inspecteurSoort,
        meubels: kamerMeubels.size,
        vloerVerwacht: stand.vloerVerwacht,
        wandVerwacht: stand.wandVerwacht,
        vloerLeesFout: stand.vloerLeesFout,
        wandLeesFout: stand.wandLeesFout,
        meubelDebugKlaar: stand.meubelDebugKlaar,
        inventarisAantal: inventaris.size,
        inventarisCompleet,
        inventarisFragmenten: inventarisFragmenten.size,
        inventarisFragmentTotaal,
        bouwplanAantal: stand.bouwplan ? stand.bouwplan.items.length : 0,
        bouwplanBron: stand.bouwplan ? stand.bouwplan.bronKamer : null,
        vloerplanKamer: kamerBasisVloerplan?.kamer || null,
        vloerplanBreedte: kamerBasisVloerplan?.breedte || 0,
        vloerplanHoogte: kamerBasisVloerplan?.hoogte || 0,
        vloerplanBron: ingeladenVloerplan?.bronKamer || null,
        vloerplanImportBreedte: ingeladenVloerplan?.breedte || 0,
        vloerplanImportHoogte: ingeladenVloerplan?.hoogte || 0,
        vloerplanHerstelBackup: !!ingeladenVloerplan?.herstelBackup,
        vloerplanDoelGekalibreerd: doelVloerplanTemplate?.kamer === stand.kamer &&
          Date.now() - doelVloerplanTemplate.tijd <= 10 * 60 * 1000,
        bouwBezig: stand.bouwBezig,
        bouwGedaan: stand.bouwGedaan,
        bouwTotaal: stand.bouwTotaal,
        bouwOntbrekend: stand.bouwOntbrekend,
        bouwMislukt: stand.bouwMislukt,
        bouwPlaatsMislukt: stand.bouwPlaatsMislukt,
        bouwStateMislukt: stand.bouwStateMislukt,
        bouwPauze: stand.bouwPauze,
        bouwStatus: stand.bouwStatus,
        catalogusBezig: stand.catalogusBezig,
        catalogusPaginas: stand.catalogusPaginas,
        catalogusGelezen: stand.catalogusGelezen,
        catalogusBekeken: stand.catalogusBekeken,
        catalogusFase: stand.catalogusFase,
        catalogusRouteTotaal: stand.catalogusRouteTotaal,
        catalogusRouteGedaan: stand.catalogusRouteGedaan,
        catalogusCacheTypes: stand.catalogusCacheTypes,
        catalogusCacheTijd: stand.catalogusCacheTijd,
        catalogusVolledig: stand.catalogusVolledig,
        catalogusNietGelezen: catalogusPaginaIds.filter(id => !catalogusPaginasGelezen.has(id)).length,
        aankoopKlaar: stand.aankoopKlaar,
        aankoopAnalyseBezig: stand.aankoopAnalyseBezig,
        aankoopAantal: stand.aankoopAantal,
        aankoopVerzoeken: stand.aankoopVerzoeken,
        aankoopTypes: stand.aankoopTypes,
        aankoopNietTeKoop: stand.aankoopNietTeKoop,
        aankoopCredits: stand.aankoopCredits,
        aankoopValuta: stand.aankoopValuta,
        aankoopBezig: stand.aankoopBezig,
        aankoopGedaan: stand.aankoopGedaan,
        aankoopMislukt: stand.aankoopMislukt,
      },
    }, '*');
  }

  window.addEventListener('message', (ev) => {
    const d = ev.data;
    if (!d || d.bron !== 'hotelPopup') return;
    if (d.soort === 'kaart') { stand.kaart = d.tegels || {}; melden(`kaart geladen: ${Object.keys(stand.kaart).length} tegels`); }
    if (d.soort === 'naam') { stand.naam = String(d.naam || '').trim(); stand.wie = null; melden('naam: ' + stand.naam); }
    if (d.soort === 'wacht') { stand.wacht = Math.max(500, parseInt(d.wacht, 10) || 2000); melden(`${stand.wacht} ms tussen de stappen`); }
    if (d.soort === 'kamer') { stand.kamer = parseInt(d.kamer, 10) || 0; melden('kamer handmatig: ' + stand.kamer); }
    if (d.soort === 'start') { stand.loopt = true; melden('rondlopen aan'); stap(); }
    if (d.soort === 'stop') { stand.loopt = false; clearTimeout(looptimer); melden('gestopt'); }
    if (d.soort === 'schrijf') {
      stand.schrijft = !!d.aan;
      melden(stand.schrijft ? 'schrijft mee met de packets' : 'meeschrijven uit');
    }
    if (d.soort === 'log-wissen') { logboek.length = 0; httpLog.length = 0; melden('logboek leeg'); }
    if (d.soort === 'log-opvragen') {
      window.postMessage({ bron: 'hotelLoper', soort: 'log', tekst: logTekst() }, '*');
    }
    if (d.soort === 'catalogus-diagnose-opvragen') {
      window.postMessage({ bron: 'hotelLoper', soort: 'catalogus-diagnose',
                           tekst: JSON.stringify(catalogusDiagnose(), null, 2) }, '*');
    }
    if (d.soort === 'catalogus-controle') controleerCatalogusPaginas();
    if (d.soort === 'pauze') {
      stand.pauze = !!d.aan;
      melden(stand.pauze
        ? 'de client verbindt niet; je ticket blijft ongebruikt'
        : 'de client mag weer verbinden (herlaad de pagina)');
    }
    if (d.soort === 'ticket') {
      const t = ticketNu();
      window.postMessage({ bron: 'hotelLoper', soort: 'ticket',
                           tekst: t, lengte: t.length }, '*');
    }
    if (d.soort === 'koop') {
      if ('aan' in d) stand.koopAan = !!d.aan;
      if ('aantal' in d) {
        stand.koopAantal = Math.max(1, Math.min(KOOP_AANTAL_MAX, parseInt(d.aantal, 10) || 3));
      }
      if ('pauze' in d) {
        stand.koopPauze = Math.max(KOOP_PAUZE_MIN, parseInt(d.pauze, 10) || 400);
      }
      melden(stand.koopAan
        ? `aankopen herhalen aan: ${stand.koopAantal} stuks, ${stand.koopPauze} ms`
        : 'aankopen herhalen uit');
    }
    if (d.soort === 'streamer') {
      if ('aan' in d) stand.streamerAan = !!d.aan;
      if ('credits' in d) stand.streamerCredits = begrensBedrag(d.credits, 1000);
      if ('duckets' in d) stand.streamerDuckets = begrensBedrag(d.duckets, 500);
      if ('diamanten' in d) stand.streamerDiamanten = begrensBedrag(d.diamanten, 50);
      if ('namen' in d) stand.streamerNamen = !!d.namen;
      toonStreamerSaldi();
      toonStreamerIdentiteiten();
      tekenInspecteur();
      melden(stand.streamerAan
        ? 'streamermodus aan (alleen lokale weergave)'
        : 'streamermodus uit; echte saldi teruggezet');
    }
    if (d.soort === 'inspecteur') {
      stand.inspecteurAan = !!d.aan;
      if (!stand.inspecteurAan) stand.inspecteurId = null;
      tekenInspecteur();
      melden(stand.inspecteurAan
        ? 'Furniture Inspector aan; dubbelklik of gebruik een meubel'
        : 'Furniture Inspector uit');
    }
    if (d.soort === 'catalogus-cache-laden') {
      const cache = d.cache;
      const routes = {};
      if (cache && cache.formaat === 'hotel-loper-catalogusroutes' && cache.versie === 1 &&
          cache.routes && typeof cache.routes === 'object') {
        for (const [sleutel, paginas] of Object.entries(cache.routes)) {
          if (!/^(vloer|wand):\d+$/.test(sleutel) || !Array.isArray(paginas)) continue;
          const schoon = [...new Set(paginas.map(Number).filter(Number.isInteger).filter(n => n > 0))];
          if (schoon.length) routes[sleutel] = schoon;
        }
      }
      catalogusRouteCache = routes;
      catalogusNietGevonden.clear();
      if (cache && cache.scanGecontroleerd === true &&
          cache.nietGevonden && typeof cache.nietGevonden === 'object') {
        for (const [sleutel, tijdRuw] of Object.entries(cache.nietGevonden)) {
          const tijd = Number(tijdRuw);
          if (/^(vloer|wand):\d+$/.test(sleutel) && Number.isFinite(tijd)) {
            catalogusNietGevonden.set(sleutel, tijd);
          }
        }
      }
      catalogusVolledigTot = cache && cache.scanGecontroleerd === true
        ? (Number(cache.volledigTot) || 0) : 0;
      stand.catalogusCacheTypes = Object.keys(routes).length;
      stand.catalogusCacheTijd = Date.parse(cache && cache.gemaaktOp) || 0;
      stand.catalogusVolledig = !!catalogusVolledigTot;
      stuurStand();
    }
    if (d.soort === 'catalogus-cache-wissen') {
      catalogusRouteCache = {};
      catalogusNietGevonden.clear();
      catalogusAanbod.clear();
      catalogusPaginasGelezen.clear();
      catalogusPaginaFouten.clear();
      catalogusPaginaPogingen.clear();
      catalogusOngekoppeldeAntwoorden.length = 0;
      catalogusLaatsteBewaarAantal = 0;
      catalogusVolledigTot = 0;
      stand.catalogusVolledig = false;
      stand.catalogusCacheTypes = 0;
      stand.catalogusCacheTijd = 0;
      stand.catalogusGelezen = 0;
      stand.catalogusBekeken = 0;
      stand.aankoopKlaar = false;
      aankoopVoorstel = null;
      melden('cataloguscache gewist');
    }
    if (d.soort === 'snapshot-opvragen') {
      const snapshot = snapshotObject();
      window.postMessage({ bron: 'hotelLoper', soort: 'snapshot',
                           tekst: JSON.stringify(snapshot, null, 2), aantal: snapshot.aantal }, '*');
    }
    if (d.soort === 'vloerplan-opvragen') {
      const vloerplan = vloerplanObject();
      window.postMessage({ bron: 'hotelLoper', soort: 'vloerplan',
                           tekst: vloerplan ? JSON.stringify(vloerplan, null, 2) : '' }, '*');
    }
    if (d.soort === 'vloerplan-laden') {
      try { laadVloerplan(d.plan); melden('Vloerplanbestand geladen'); }
      catch (e) { melden(e.message); }
    }
    if (d.soort === 'vloerplan-opslaan') {
      slaIngeladenVloerplanOp(Number(d.doelKamer), Number(d.bronKamer));
    }
    if (d.soort === 'meubeldebug-opvragen') {
      window.postMessage({ bron: 'hotelLoper', soort: 'meubeldebug', tekst: laatsteMeubelDebug }, '*');
    }
    if (d.soort === 'bouwplan') {
      try { laadBouwplan(d.plan); }
      catch (e) {
        stand.bouwplan = null;
        stand.bouwStatus = e.message;
        melden('snapshot afgewezen: ' + e.message);
      }
    }
    if (d.soort === 'bouw-pauze') {
      const waarde = Number.parseInt(d.pauze, 10);
      if (Number.isFinite(waarde)) stand.bouwPauze = Math.max(180, Math.min(10000, waarde));
    }
    if (d.soort === 'bouw-start') bouwUitInventaris();
    if (d.soort === 'aankoop-analyse') bereidAankopenVoor();
    if (d.soort === 'koop-en-bouw') koopOntbrekendEnBouw();
    if (d.soort === 'bouw-stop') {
      stand.bouwStop = true;
      stand.aankoopStop = true;
      stand.bouwStatus = 'stop gevraagd; huidige handeling afronden…';
      stuurStand();
    }
    if (d.soort === 'stand') stuurStand();
  });


  const echteSend = Native.prototype.send;
  Native.prototype.send = function (data) {
    if (data && typeof data !== 'string') {
      socket = this;
      try {
        const buf = data instanceof ArrayBuffer ? data
          : data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        buiten(buf, this);
      } catch (e) {  }
    }
    return echteSend.call(this, data);
  };

  const echteFetch = window.fetch;
  if (typeof echteFetch === 'function') {
    window.fetch = function (invoer, opties) {
      const url = (invoer && invoer.url) ? invoer.url : String(invoer);
      const methode = (opties && opties.method) || (invoer && invoer.method) || 'GET';
      return echteFetch.apply(this, arguments).then((antwoord) => {
        if (stand.schrijft) {
          try {
            antwoord.clone().text().then(
              (t) => schrijfHttp(methode, url, antwoord.status, t),
              () => schrijfHttp(methode, url, antwoord.status, ''));
          } catch (e) { schrijfHttp(methode, url, antwoord.status, ''); }
        }
        return antwoord;
      });
    };
  }

  const echteOpen = XMLHttpRequest.prototype.open;
  const echteVerstuur = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (methode, url) {
    this.__methode = methode; this.__url = url;
    return echteOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', () => {
      if (!stand.schrijft) return;
      let tekst = '';
      try { tekst = (this.responseType === '' || this.responseType === 'text')
                    ? this.responseText : ''; } catch (e) {  }
      schrijfHttp(this.__methode || 'GET', this.__url || '?', this.status, tekst);
    });
    return echteVerstuur.apply(this, arguments);
  };

  class Loper extends Native {
    constructor(url, protocols) {
      if (stand.pauze && !/^wss?:\/\/(localhost|127\.)/.test(url)) {
        super('ws://127.0.0.1:1');
        wsUrl = url;
        melden('verbinding tegengehouden (pauze staat aan)');
        return;
      }
      protocols ? super(url, protocols) : super(url);
      socket = this;
      wsUrl = url;
      this.addEventListener('open', () => stuurStand());
      this.addEventListener('close', () => { stand.loopt = false; stuurStand(); });
      this.addEventListener('message', (ev) => {
        if (lokaleBerichten.has(ev)) return;
        if (!(ev.data instanceof Blob) && !(ev.data instanceof ArrayBuffer)) return;
        ev.stopImmediatePropagation();
        const wasBlob = ev.data instanceof Blob;
        const lees = wasBlob ? ev.data.arrayBuffer() : Promise.resolve(ev.data);
        inkomendeRij = inkomendeRij.then(async () => {
          const echt = await lees;
          binnen(echt);
          const heeftGebruikers = splits(echt).some(p => p.header === H_GEBRUIKERS);
          const zichtbaar = streamerBuffer(echt);
          stuurAlleenLokaal(this, zichtbaar, wasBlob);
          if (heeftGebruikers && stand.streamerAan) toonStreamerIdentiteiten();
        }).catch(() => {
          stuurAlleenLokaal(this, ev.data, ev.data instanceof Blob);
        });
      });
    }
  }
  window.WebSocket = Loper;

  setInterval(stuurStand, 1000);

  window.__hotelLoper = { stand, logboek, httpLog, logTekst, ticketNu, zoekMij, leesStatus, leesMv,
                          splits, inpakken, streamerBuffer, sleutel, waarNu, kamerMeubels,
                          leesMeubelPacket, tekenInspecteur, inventaris, leesInventarisPacket,
                          snapshotObject, laadBouwplan, verdeelBouwplan, leesCatalogusIndex,
                           leesCatalogusPagina, catalogusAanbod, catalogusDiagnose,
                           bereidAankopenVoor };
})();
