/* Kafa Haritası · 81 İl, Tek Rota · 81 il kartı ve rota
   Veri: veri.js (yol ağı, il sınırları ve il merkezleri © OpenStreetMap katkıcıları, ODbL; hesap: Kafa Haritası;
   komşu ülkeler Natural Earth). Kart metinleri verideki "kart" dizisinden aynen basılır; sayı hesaplanmaz.
   Harita ülke ölçeğinde kalır: yakınlaştırma ve kaydırma yok. Dış istek yok. */
(function () {
  'use strict';

  var V = window.KH_ROTA;
  var NS = 'http://www.w3.org/2000/svg';
  var W = V.W;
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('svg'), cerceve = $('cerceve'), kart = $('kart');
  var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var gomulu = document.documentElement.classList.contains('gomulu');

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
  // Halk arasındaki kısa adlar (arama için)
  var KISA = {
    kahramanmaras: ['k maras', 'kmaras', 'maras'],
    sanliurfa: ['urfa', 's urfa'],
    gaziantep: ['antep'],
    afyonkarahisar: ['afyon'],
    mersin: ['icel']
  };

  /* ---------- katmanlar ---------- */
  var KATMANLAR = V.meta.katmanlar, KATMAN = {};
  KATMANLAR.forEach(function (k) { KATMAN[k.id] = k; });
  var VARSAYILAN = V.meta.varsayilan || 'rota';
  // Karttaki satır adı → katman (seçili katmanın satırı vurgulanır, balonda değeri gösterilir)
  var SATIR = {
    baslangic: 'Rotanın uzunluğu',
    ekledigi: 'Bu il listeden çıkarılırsa tur kısalır'
  };
  // Ölçeğin iki ucu
  var UC = { baslangic: ['kısa', 'uzun'], ekledigi: ['az', 'çok'] };
  // Türkiye kutusundaki kısa açıklama (kutu haritanın Türkiye dışı köşesine sığsın diye)
  var BIRIM = { rota: 'dönüşlü en kısa tur', baslangic: 'eve dönmeyen en kısa rota', ekledigi: 'turdan çıkarılınca kısalma' };
  function satirKatmani(etiket) {
    for (var k in SATIR) if (SATIR[k] === etiket) return k;
    return null;
  }
  function kartDegeri(kartDizisi, k) {
    var ad = SATIR[k];
    if (!ad) return '';
    for (var i = 0; i < kartDizisi.length; i++) {
      var s = kartDizisi[i].satirlar || [];
      for (var j = 0; j < s.length; j++) if (s[j][0] === ad) return s[j][1];
    }
    return '';
  }
  function sinirYaz(v, ondalik) {
    return Number(v).toLocaleString('tr-TR', { minimumFractionDigits: ondalik || 0, maximumFractionDigits: ondalik || 0 });
  }
  function renk(K, il) {
    if (!K.sinirlar.length) return K.renkler[0];
    return K.renkler[il.s[K.id]];
  }

  /* ---------- çizim ---------- */
  $('komsular').setAttribute('d', V.komsular);
  V.goller.forEach(function (d) { yap('path', { d: d }, $('goller')); });
  var iller = V.iller.slice().sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); });
  var ilById = {};
  iller.forEach(function (il) {
    il.sade = sade(il.ad);
    il.kisa = KISA[il.sade.replace(/ /g, '')] || [];
    il.el = yap('path', { d: il.d, 'data-il': il.id }, $('iller'));
    il.bacaklar = [];
    ilById[il.id] = il;
  });
  // Rota: Adana'dan başlayan 81 bacak; her il iki bacağa (gelen ve giden) bağlı
  V.rota.bacaklar.forEach(function (b) {
    yap('path', { d: b.d }, $('rota-kasa'));
    yap('path', { d: b.d }, $('rota'));
    if (ilById[b.a]) ilById[b.a].bacaklar.push(b.d);
    if (ilById[b.b]) ilById[b.b].bacaklar.push(b.d);
  });
  var TURKIYE = { id: 'turkiye', ad: 'Türkiye', kart: V.meta.turkiye.kart, turkiye: true };

  var katman = VARSAYILAN;
  function boya() {
    var K = KATMAN[katman];
    iller.forEach(function (il) { il.el.style.fill = renk(K, il); });
    svg.classList.toggle('duz', !K.sinirlar.length);
    lejantYaz();
    trKutuYaz();
    if (secili) kartYaz(secili);
    kartSigdir();
  }
  // Gömülüyken (Wix iFrame 1060 px sabit) kart kalan yüksekliğe sığdırılır; lejant notu katmana göre uzayıp kısalır
  function kartSigdir() {
    if (!gomulu) return;
    kart.style.maxHeight = '';
    var disi = document.documentElement.scrollHeight - kart.offsetHeight;
    var kalan = window.innerHeight - disi - 6;
    kart.style.maxHeight = Math.max(220, kalan) + 'px';
  }
  function lejantYaz() {
    // CSP satır içi stil izni vermediği için renkler CSSOM ile verilir
    var K = KATMAN[katman], L = $('lejant');
    if (!K.sinirlar.length) {
      L.innerHTML = '<p class="l-baslik"><span class="l-cizgi" aria-hidden="true"></span>' + kacis(K.lejant) + '</p>' +
        (K.not ? '<p class="l-not">' + kacis(K.not) + '</p>' : '');
      return;
    }
    var uc = UC[katman] || ['az', 'çok'];
    L.innerHTML = '<p class="l-baslik">' + kacis(K.lejant) + '</p>' +
      '<div class="olcek"><span class="uc">' + uc[0] + '</span><div><div class="kutular"></div><div class="sayilar"></div></div><span class="uc">' + uc[1] + '</span></div>' +
      (K.not ? '<p class="l-not">' + kacis(K.not) + '</p>' : '');
    var ku = L.querySelector('.kutular'), sa = L.querySelector('.sayilar');
    K.renkler.forEach(function (r, i) {
      var k = document.createElement('span'); k.style.background = r; ku.appendChild(k);
      var s = document.createElement('span'); s.textContent = i < K.sinirlar.length ? sinirYaz(K.sinirlar[i], K.ondalik) : ''; sa.appendChild(s);
    });
  }
  function trKutuYaz() {
    var K = KATMAN[katman];
    $('tr-sayi').textContent = K.turkiye;
    $('tr-birim').textContent = BIRIM[katman] || K.uzun_ad;
    $('tr-kutu').classList.toggle('uzun', String(K.turkiye).length > 10);
    $('tr-kutu').setAttribute('aria-label', 'Türkiye kartını aç: ' + K.uzun_ad + ', ' + K.turkiye);
  }
  // Seçili il merkezinin noktası ekranda hep aynı boyda kalsın (harita ölçeklenir, yakınlaşmaz)
  function noktaBoyu() {
    var s = W / Math.max(cerceve.clientWidth, 1);
    $('merkez').setAttribute('r', (4.2 * s).toFixed(2));
  }

  /* ---------- kart ---------- */
  function cip(il, k) {
    if (!il || il.turkiye || !k) return '';
    return '<span class="cip" data-renk="' + kacis(renk(KATMAN[k], il)) + '"></span>';
  }
  function bolumHtml(b, il) {
    var h = '<section class="bolum"><h3>' + kacis(b.baslik) + '</h3>';
    if (b.satirlar && b.satirlar.length) {
      h += '<dl>';
      b.satirlar.forEach(function (s) {
        var k = satirKatmani(s[0]), sec = !il.turkiye && k === katman;
        h += '<div class="satir' + (sec ? ' secili' : '') + '"><dt>' + (sec ? cip(il, k) : '') + '<span>' + kacis(s[0]) + '</span></dt><dd>' + kacis(s[1]).replace(/ · /g, '&nbsp;· ') + '</dd></div>';
      });
      h += '</dl>';
    }
    if (b.not) h += '<p class="not">' + kacis(b.not) + '</p>';
    return h + '</section>';
  }
  function cipleriBoya() {
    Array.prototype.forEach.call(kart.querySelectorAll('.cip[data-renk]'), function (c) { c.style.background = c.getAttribute('data-renk'); });
  }
  function bosKart() {
    kart.innerHTML =
      '<p class="etiket">81 il kartı</p>' +
      '<h2>İlinize dokunun</h2>' +
      '<p>Haritada bir ile dokunun ya da haritanın altındaki listeden ilinizi seçin. Kartta o ilden başlayan rota, ilin rotaya eklediği kilometre ve rotada önceki ve sonraki il var. Türkiye\'nin sayıları ayrı kutuda.</p>' +
      '<p class="sabit">' + kacis(V.meta.sabit) + '</p>';
  }
  function kartYaz(o) {
    var h = '<p class="etiket">' + (o.turkiye ? 'Bütün Türkiye' : '81 il kartı') + '</p><h2>' + kacis(o.ad) + '</h2>';
    o.kart.forEach(function (b) { h += bolumHtml(b, o); });
    if (o.not) h += '<p class="il-not">' + kacis(o.not) + '</p>';
    h += '<p class="sabit">' + kacis(V.meta.sabit) + '</p>';
    kart.innerHTML = h;
    cipleriBoya();
  }

  /* ---------- seçim ---------- */
  var secili = null;
  function rotaVurgula(il) {
    var g1 = $('rota-sec-kasa'), g2 = $('rota-sec');
    g1.textContent = ''; g2.textContent = '';
    var m = $('merkez');
    if (!il || il.turkiye) { m.setAttribute('cx', -10); m.setAttribute('cy', -10); return; }
    il.bacaklar.forEach(function (d) { yap('path', { d: d }, g1); yap('path', { d: d }, g2); });
    var p = V.rota.merkezler[il.id];
    if (p) { m.setAttribute('cx', p[0]); m.setAttribute('cy', p[1]); }
    else { m.setAttribute('cx', -10); m.setAttribute('cy', -10); }
  }
  function sec(o, opt) {
    opt = opt || {};
    secili = o;
    $('vurgu').setAttribute('d', o && !o.turkiye ? o.d : '');
    rotaVurgula(o);
    $('tr-kutu').setAttribute('aria-pressed', o && o.turkiye ? 'true' : 'false');
    kartYaz(o);
    $('il-sec').value = o.turkiye ? '' : o.id;
    adresYaz();
    if (opt.kaydir) kaydir();
  }
  function temizle() {
    secili = null; $('vurgu').setAttribute('d', ''); rotaVurgula(null); $('tr-kutu').setAttribute('aria-pressed', 'false');
    bosKart(); $('il-sec').value = ''; adresYaz();
  }
  function kaydir() {
    if (window.innerWidth >= 900 && !gomulu) return;
    var r = kart.getBoundingClientRect();
    if (r.top > window.innerHeight - 80) kart.scrollIntoView({ behavior: azHareket ? 'auto' : 'smooth', block: 'nearest' });
  }
  function katmanSec(k) {
    katman = k;
    Array.prototype.forEach.call(document.querySelectorAll('.katmanlar button'), function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-katman') === k ? 'true' : 'false');
    });
    boya();
    adresYaz();
  }
  function adresYaz() {
    var q = [];
    if (katman !== VARSAYILAN) q.push('katman=' + katman);
    if (secili) q.push('il=' + secili.id);
    $('tam-sayfa').href = './' + (q.length ? '?' + q.join('&') : '');
    if (window.KH_MAKET || !history.replaceState) return;
    var s = q.length ? '?' + q.join('&') : '';
    if (/[?&]gom=1\b/.test(location.search)) s += (s ? '&' : '?') + 'gom=1';
    try { history.replaceState(null, '', location.pathname + s); } catch (_) {}
  }
  Array.prototype.forEach.call(document.querySelectorAll('.katmanlar button'), function (b, i, hepsi) {
    b.addEventListener('click', function () { katmanSec(b.getAttribute('data-katman')); });
    b.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = hepsi[(i + d + hepsi.length) % hepsi.length];
      n.focus(); katmanSec(n.getAttribute('data-katman'));
    });
  });
  $('tr-kutu').addEventListener('click', function () { sec(TURKIYE, { kaydir: true }); });

  /* ---------- il listesi ---------- */
  var secKutu = $('il-sec');
  iller.forEach(function (il) {
    var op = document.createElement('option'); op.value = il.id; op.textContent = il.ad; secKutu.appendChild(op);
  });
  secKutu.addEventListener('change', function () {
    var il = ilById[secKutu.value];
    if (il) sec(il, { kaydir: true }); else temizle();
  });

  /* ---------- arama ---------- */
  var ara = $('ara'), sonucEl = $('ara-sonuc'), sonuclar = [], etkin = -1;
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
      h += '<li role="option" id="ara-s' + i + '" data-i="' + i + '" aria-selected="' + (i === etkin) + '">' + kacis(o.ad) + '</li>';
    });
    sonucEl.innerHTML = h;
    sonucEl.hidden = false;
    ara.setAttribute('aria-expanded', 'true');
    if (etkin >= 0) { ara.setAttribute('aria-activedescendant', 'ara-s' + etkin); var e = $('ara-s' + etkin); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest' }); }
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

  /* ---------- harita etkileşimi (yalnız dokunma ve üzerine gelme) ---------- */
  function hedefBul(cx, cy) {
    var el = document.elementFromPoint(cx, cy);
    if (!el || !svg.contains(el)) return null;
    var id = el.getAttribute('data-il');
    return id ? ilById[id] : null;
  }
  var uzerinde = null;
  function balonGoster(o, x, y) {
    var b = $('balon');
    if (!o) { uzerinde = null; b.hidden = true; return; }
    if (uzerinde !== o) {
      uzerinde = o;
      var deger = kartDegeri(o.kart, katman);
      b.innerHTML = kacis(o.ad) + (deger ? ' · <b>' + kacis(deger) + '</b>' : '');
    }
    var r = cerceve.getBoundingClientRect();
    b.style.left = (x - r.left) + 'px';
    b.style.top = (y - r.top) + 'px';
    b.hidden = false;
  }
  cerceve.addEventListener('pointermove', function (e) {
    if (e.pointerType !== 'mouse') return;
    var o = hedefBul(e.clientX, e.clientY);
    cerceve.classList.toggle('uzerinde', !!o);
    balonGoster(o, e.clientX, e.clientY);
  });
  cerceve.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { balonGoster(null); cerceve.classList.remove('uzerinde'); } });
  cerceve.addEventListener('click', function (e) {
    var o = hedefBul(e.clientX, e.clientY);
    if (o) sec(o, { kaydir: true });
  });
  window.addEventListener('resize', function () { noktaBoyu(); kartSigdir(); });
  if (gomulu) $('tam-sayfa').hidden = false;

  /* ---------- başlangıç ---------- */
  function adrestenSec() {
    var q = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (p) {
      var i = p.indexOf('='); if (i > 0) { try { q[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1)); } catch (_) {} }
    });
    if (q.katman && KATMAN[q.katman]) katman = q.katman;
    Array.prototype.forEach.call(document.querySelectorAll('.katmanlar button'), function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-katman') === katman ? 'true' : 'false');
    });
    boya();
    var il = q.il ? (ilById[q.il] || ilById[sade(q.il).replace(/ /g, '')]) : null;
    if (il) sec(il);
    else if (q.il === 'turkiye') sec(TURKIYE);
    else bosKart();
  }
  adrestenSec();
  noktaBoyu();
  kartSigdir();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(kartSigdir);
})();
