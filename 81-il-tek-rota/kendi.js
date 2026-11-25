/* Kafa Haritası · 81 İl, Tek Rota · Kendi ilinden başla
   Veri: kendi_veri.js (her başlangıç ilinden 81 il merkezine uğrayan en kısa açık rota; yol ağı © OpenStreetMap
   katkıcıları, ODbL; hesap: Kafa Haritası) ve veri.js'teki il sınırları. Sayılar verideki yazılarıyla aynen basılır;
   hiçbir sayı hesaplanmaz. Harita ülke ölçeğinde kalır: yakınlaştırma yok. Dış istek yok. */
(function () {
  'use strict';

  var K = window.KH_KENDI, G = window.KH_ROTA;
  var NS = 'http://www.w3.org/2000/svg';
  var W = G.W;
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('k-svg'), cerceve = $('k-cerceve'), panel = $('k-panel');
  var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gomulu = document.documentElement.classList.contains('gomulu');
  var SURE = azHareket ? 0 : 2600;          // rotanın çizilme süresi (ms)
  var VARSAYILAN = (K.ozet.en_kisa && K.ozet.en_kisa.il) || 'edirne';

  function yap(tag, attrs, ebeveyn) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (ebeveyn) ebeveyn.appendChild(e);
    return e;
  }
  function kacis(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  var KATLAMA = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  function sade(s) {
    return String(s).trim().toLocaleLowerCase('tr').replace(/i̇/g, 'i')
      .replace(/[çğıöşüâîû]/g, function (c) { return KATLAMA[c]; })
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }
  var KISA = {
    kahramanmaras: ['k maras', 'kmaras', 'maras'],
    sanliurfa: ['urfa', 's urfa'],
    gaziantep: ['antep'],
    afyonkarahisar: ['afyon'],
    mersin: ['icel']
  };
  // Ayrılma eki: Edirne'den, Kars'tan, Iğdır'dan, Muş'tan
  function den(ad) {
    var k = ad.toLocaleLowerCase('tr'), unlu = '';
    for (var i = k.length - 1; i >= 0; i--) if ('aeıioöuüâîû'.indexOf(k[i]) >= 0) { unlu = k[i]; break; }
    var ince = 'eiöüî'.indexOf(unlu) >= 0;
    var sert = 'fstkçşhp'.indexOf(k[k.length - 1]) >= 0;
    return ad + "'" + (sert ? 't' : 'd') + (ince ? 'en' : 'an');
  }
  function iki(n) { return (n < 10 ? '0' : '') + n; }

  // Geçiş sırasına göre hafif renk: başta açık hardal, sonda açık kiremit
  function karis(a, b, t) {
    var x = parseInt(a.slice(1), 16), y = parseInt(b.slice(1), 16);
    var r = Math.round((x >> 16) + (((y >> 16) - (x >> 16)) * t));
    var g = Math.round(((x >> 8) & 255) + ((((y >> 8) & 255) - ((x >> 8) & 255)) * t));
    var bl = Math.round((x & 255) + (((y & 255) - (x & 255)) * t));
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + bl).toString(16).slice(1);
  }
  var RENK_BAS = '#F4DC9A', RENK_SON = '#EBB49C', RENK_ILK = '#E0A515', RENK_BIT = '#B5442A', KAGIT = '#EFE6D2';

  /* ---------- çizim ---------- */
  $('k-komsular').setAttribute('d', G.komsular);
  G.goller.forEach(function (d) { yap('path', { d: d }, $('k-goller')); });
  var iller = G.iller.filter(function (il) { return K.iller[il.id]; }).map(function (il) {
    var v = K.iller[il.id];
    return { id: il.id, ad: v.ad, plaka: v.plaka, d: il.d, v: v };
  }).sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); });
  var ilById = {};
  var grup = $('k-iller');
  iller.forEach(function (il) {
    il.sade = sade(il.ad);
    il.kisa = KISA[il.sade.replace(/ /g, '')] || [];
    il.el = yap('path', { d: il.d, 'data-il': il.id }, grup);
    ilById[il.id] = il;
  });
  // Bacak uzunlukları (animasyonda ile varış anı için); ilk kullanımda ölçülür
  var olcer = $('k-olcer'), uzunluk = {};
  function bacakUzunlugu(anahtar) {
    if (!(anahtar in uzunluk)) { olcer.setAttribute('d', K.bacaklar[anahtar]); uzunluk[anahtar] = olcer.getTotalLength(); }
    return uzunluk[anahtar];
  }
  function noktaBoyu() {
    var s = W / Math.max(cerceve.clientWidth, 1);
    $('k-bas').setAttribute('r', (5.2 * s).toFixed(2));
    $('k-bit').setAttribute('r', (5.2 * s).toFixed(2));
  }

  /* ---------- panel ---------- */
  function panelYaz(il) {
    var v = il.v, h = '';
    h += '<p class="etiket">Kendi ilinden başla</p>';
    h += '<h2>' + kacis(den(v.ad)) + ' başlayan en kısa rota</h2>';
    h += '<p class="k-km">' + kacis(v.km_yazi) + '</p>';
    h += '<p class="k-sure">' + kacis(v.sure_yazi) + '</p>';
    h += '<p class="k-satir"><span class="nokta nokta-ilk" aria-hidden="true"></span><span>Başlangıç: <b>' + kacis(v.ad) + '</b></span></p>';
    h += '<p class="k-satir"><span class="nokta nokta-son" aria-hidden="true"></span><span>Bitiş: <b>' + kacis(v.bitis_ad) + '</b></span></p>';
    h += '<p class="k-satir"><span>81 il içinde <b>' + kacis(v.sira) + '. sırada</b></span></p>';
    h += '<details' + (gomulu ? '' : ' open') + '><summary>Sıralı il listesi (81 il)</summary><ol>';
    v.rota.forEach(function (id, i) {
      var o = K.iller[id];
      h += '<li><span class="s">' + (i + 1) + '.</span><span class="p">' + iki(o.plaka) + '</span><span>' + kacis(o.ad) + '</span></li>';
    });
    h += '</ol></details>';
    h += '<p class="k-yontem">' + kacis(K.ozet.yontem) + '</p>';
    panel.innerHTML = h;
  }
  function panelSigdir() {
    if (!gomulu || $('kendi').hidden) return;
    panel.style.maxHeight = '';
    var disi = document.documentElement.scrollHeight - panel.offsetHeight;
    var kalan = window.innerHeight - disi - 6;
    panel.style.maxHeight = Math.max(200, kalan) + 'px';
  }

  /* ---------- rota animasyonu ---------- */
  var anim = null, secili = null, kalkiklar = [];
  function temizleIller() {
    kalkiklar.forEach(function (t) { clearTimeout(t); });
    kalkiklar = [];
    iller.forEach(function (il) { il.el.classList.remove('yan', 'ilk-il', 'son-il'); il.el.style.fill = KAGIT; });
  }
  function ileVar(id, i, son) {
    var il = ilById[id]; if (!il) return;
    var t = i / 80;
    var renk = i === 0 ? RENK_ILK : son ? RENK_BIT : karis(RENK_BAS, RENK_SON, t);
    il.el.style.fill = renk;
    if (i === 0) il.el.classList.add('ilk-il');
    if (son) il.el.classList.add('son-il');
    if (SURE) {
      grup.appendChild(il.el);           // kalkan il komşularının üstünde dursun
      il.el.classList.add('yan');
      kalkiklar.push(setTimeout(function () { il.el.classList.remove('yan'); }, son ? 900 : 380));
    }
  }
  function rotaCiz(il) {
    if (anim) { cancelAnimationFrame(anim); anim = null; }
    temizleIller();
    var r = il.v.rota, parca = [], birikim = [], toplam = 0;
    for (var i = 0; i < r.length - 1; i++) {
      var anahtar = r[i] + '-' + r[i + 1];
      var d = K.bacaklar[anahtar];
      // Bacaklar uç uca: tek alt yol olsun diye sonrakilerin baştaki M'si L'ye çevrilir (kesik çizgi deseni bölünmesin)
      parca.push(i === 0 ? d : d.replace(/^M/, 'L'));
      toplam += bacakUzunlugu(anahtar);
      birikim.push(toplam);
    }
    var dd = parca.join('');
    var kasa = $('k-rota-kasa'), cizgi = $('k-rota');
    kasa.setAttribute('d', dd); cizgi.setAttribute('d', dd);
    var bas = K.merkezler[r[0]], bit = K.merkezler[r[r.length - 1]];
    $('k-bas').setAttribute('cx', bas[0]); $('k-bas').setAttribute('cy', bas[1]);
    $('k-bit').setAttribute('cx', -10); $('k-bit').setAttribute('cy', -10);
    ileVar(r[0], 0, false);
    function bitir() {
      kasa.style.strokeDasharray = ''; kasa.style.strokeDashoffset = '';
      cizgi.style.strokeDasharray = ''; cizgi.style.strokeDashoffset = '';
      $('k-bit').setAttribute('cx', bit[0]); $('k-bit').setAttribute('cy', bit[1]);
    }
    if (!SURE) {
      for (var j = 1; j < r.length; j++) ileVar(r[j], j, j === r.length - 1);
      bitir();
      return;
    }
    [kasa, cizgi].forEach(function (p) { p.style.strokeDasharray = toplam + ' ' + toplam; p.style.strokeDashoffset = toplam; });
    var t0 = performance.now(), sonraki = 0;
    function adim(t) {
      var p = Math.min((t - t0) / SURE, 1);
      var e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var cizilen = toplam * e;
      kasa.style.strokeDashoffset = toplam - cizilen;
      cizgi.style.strokeDashoffset = toplam - cizilen;
      while (sonraki < birikim.length && birikim[sonraki] <= cizilen + 0.5) {
        sonraki++;
        ileVar(r[sonraki], sonraki, sonraki === r.length - 1);
      }
      if (p < 1) anim = requestAnimationFrame(adim);
      else { anim = null; bitir(); }
    }
    anim = requestAnimationFrame(adim);
  }

  /* ---------- seçim ---------- */
  function sec(il, opt) {
    opt = opt || {};
    if (!il) return;
    secili = il;
    $('k-il-sec').value = il.id;
    Array.prototype.forEach.call(document.querySelectorAll('.k-rozet'), function (b) {
      b.setAttribute('aria-pressed', b.getAttribute('data-il') === il.id ? 'true' : 'false');
    });
    panelYaz(il);
    rotaCiz(il);
    panelSigdir();
    $('k-tam-sayfa').href = './#il=' + il.id;
    if (opt.adres !== false && !window.KH_MAKET && history.replaceState) {
      try { history.replaceState(null, '', location.pathname + location.search + '#il=' + il.id); } catch (_) {}
    }
    if (opt.kaydir && (window.innerWidth < 900 || gomulu)) {
      var rr = panel.getBoundingClientRect();
      if (rr.top > window.innerHeight - 80) panel.scrollIntoView({ behavior: azHareket ? 'auto' : 'smooth', block: 'nearest' });
    }
  }
  function adrestenIl() {
    var m = /(?:^|[#&])il=([^&]+)/.exec(location.hash.replace(/^#/, '#'));
    if (!m) return null;
    var k = '';
    try { k = decodeURIComponent(m[1]); } catch (_) { k = m[1]; }
    return ilById[k] || ilById[sade(k).replace(/ /g, '')] || null;
  }

  /* ---------- liste ve arama ---------- */
  var secKutu = $('k-il-sec');
  iller.forEach(function (il) {
    var op = document.createElement('option'); op.value = il.id; op.textContent = il.ad; secKutu.appendChild(op);
  });
  secKutu.addEventListener('change', function () { sec(ilById[secKutu.value], { kaydir: true }); });

  var ara = $('k-ara'), sonucEl = $('k-ara-sonuc'), sonuclar = [], etkin = -1;
  function aramaYap() {
    var k = sade(ara.value), kb = k.replace(/ /g, '');
    sonuclar = [];
    if (k.length >= 2) {
      var bas = [], ic = [];
      iller.forEach(function (il) {
        var ad = il.sade, adb = ad.replace(/ /g, '');
        var kisaBas = il.kisa.some(function (x) { return x.indexOf(k) === 0 || x.replace(/ /g, '').indexOf(kb) === 0; });
        if (ad.indexOf(k) === 0 || adb.indexOf(kb) === 0 || kisaBas) bas.push(il);
        else if (adb.indexOf(kb) >= 0) ic.push(il);
      });
      sonuclar = bas.concat(ic).slice(0, 12);
    }
    etkin = sonuclar.length ? 0 : -1;
    listeCiz(k.length >= 2);
  }
  function listeCiz(goster) {
    if (!goster) { sonucEl.hidden = true; ara.setAttribute('aria-expanded', 'false'); return; }
    var h = '';
    if (!sonuclar.length) h = '<li class="bos" role="option" aria-disabled="true">Bu adla bir il bulamadık.</li>';
    sonuclar.forEach(function (o, i) {
      h += '<li role="option" id="k-ara-s' + i + '" data-i="' + i + '" aria-selected="' + (i === etkin) + '">' + kacis(o.ad) + '</li>';
    });
    sonucEl.innerHTML = h;
    sonucEl.hidden = false;
    ara.setAttribute('aria-expanded', 'true');
    if (etkin >= 0) ara.setAttribute('aria-activedescendant', 'k-ara-s' + etkin);
    else ara.removeAttribute('aria-activedescendant');
  }
  function aramaSec(i) {
    var o = sonuclar[i]; if (!o) return;
    ara.value = o.ad;
    sonucEl.hidden = true; ara.setAttribute('aria-expanded', 'false');
    sec(o, { kaydir: true });
  }
  ara.addEventListener('input', aramaYap);
  ara.addEventListener('focus', function () { if (ara.value) aramaYap(); });
  ara.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!sonuclar.length) return;
      e.preventDefault();
      etkin = (etkin + (e.key === 'ArrowDown' ? 1 : -1) + sonuclar.length) % sonuclar.length;
      listeCiz(true);
    } else if (e.key === 'Enter') {
      e.preventDefault(); if (etkin >= 0) aramaSec(etkin);
    } else if (e.key === 'Escape') { sonucEl.hidden = true; ara.setAttribute('aria-expanded', 'false'); }
  });
  sonucEl.addEventListener('mousedown', function (e) {
    var li = e.target.closest('li[data-i]'); if (!li) return;
    e.preventDefault(); aramaSec(+li.getAttribute('data-i'));
  });
  ara.addEventListener('blur', function () { setTimeout(function () { sonucEl.hidden = true; ara.setAttribute('aria-expanded', 'false'); }, 120); });

  /* ---------- rozetler ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('.k-rozet'), function (b) {
    b.addEventListener('click', function () { sec(ilById[b.getAttribute('data-il')], { kaydir: true }); });
  });

  /* ---------- harita: dokunma ve üzerine gelme ---------- */
  function hedefBul(cx, cy) {
    var el = document.elementFromPoint(cx, cy);
    if (!el || !svg.contains(el)) return null;
    var id = el.getAttribute('data-il');
    return id ? ilById[id] : null;
  }
  var balon = $('k-balon'), uzerinde = null;
  cerceve.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var o = hedefBul(e.clientX, e.clientY);
    cerceve.classList.toggle('uzerinde', !!o);
    if (!o) { uzerinde = null; balon.hidden = true; return; }
    if (uzerinde !== o) {
      uzerinde = o;
      balon.innerHTML = kacis(o.ad) + ' · <b>' + kacis(o.v.sira) + '. sırada</b>';
    }
    var r = cerceve.getBoundingClientRect();
    balon.style.left = (e.clientX - r.left) + 'px';
    balon.style.top = (e.clientY - r.top) + 'px';
    balon.hidden = false;
  });
  cerceve.addEventListener('pointerleave', function () { uzerinde = null; balon.hidden = true; cerceve.classList.remove('uzerinde'); });
  cerceve.addEventListener('click', function (e) {
    var o = hedefBul(e.clientX, e.clientY);
    if (o) sec(o, { kaydir: true });
  });

  window.addEventListener('resize', function () { noktaBoyu(); panelSigdir(); });
  window.addEventListener('hashchange', function () { var il = adrestenIl(); if (il && il !== secili) sec(il, { adres: false }); });
  if (gomulu) $('k-tam-sayfa').hidden = false;

  /* ---------- başlangıç ---------- */
  noktaBoyu();
  var ilk = adrestenIl();
  sec(ilk || ilById[VARSAYILAN], { adres: !!ilk });
  panelSigdir();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(panelSigdir);
})();
