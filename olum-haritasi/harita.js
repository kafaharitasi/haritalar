/* Kafa Haritası · Türkiye'nin Ölüm Haritası · 81 il kartı
   Veri: veri.js (TÜİK Ölüm ve Ölüm Nedeni İstatistikleri ve ADNKS; hesap: Kafa Haritası; il sınırları geoBoundaries,
   OpenStreetMap verisi; komşu ülkeler Natural Earth). Kart metinleri verideki "kart" dizisinden aynen basılır;
   sayı hesaplanmaz. Dış istek yok. */
(function () {
  'use strict';

  var V = window.KH_OLUM;
  var NS = 'http://www.w3.org/2000/svg';
  var W = V.W, H = V.H, MINW = W / 9;
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
  var VARSAYILAN = 'kalp';
  var SATIR = { 'kis': 'Kış aylarında artış' };   // diğerleri: uzun_ad
  function satirAdi(k) { return SATIR[k] || KATMAN[k].uzun_ad; }
  function satirKatmani(etiket) {
    for (var i = 0; i < KATMANLAR.length; i++) if (satirAdi(KATMANLAR[i].id) === etiket) return KATMANLAR[i].id;
    return null;
  }
  function kartDegeri(kartDizisi, k) {
    var ad = satirAdi(k);
    for (var i = 0; i < kartDizisi.length; i++) {
      var s = kartDizisi[i].satirlar || [];
      for (var j = 0; j < s.length; j++) if (s[j][0] === ad) return s[j][1];
    }
    return '';
  }
  function sinirYaz(v) {
    return Number(v).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
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
    il.yazi = yap('text', { x: il.m[0], y: il.m[1] }, $('adlar'));
    il.yazi.textContent = il.ad;
    ilById[il.id] = il;
  });
  var TURKIYE = { id: 'turkiye', ad: 'Türkiye', kart: V.meta.turkiye.kart, turkiye: true };

  var katman = VARSAYILAN;
  function boya() {
    var K = KATMAN[katman];
    iller.forEach(function (il) { il.el.style.fill = K.renkler[il.s[katman]]; });
    lejantYaz();
    trKutuYaz();
    if (secili) kartYaz(secili);
  }
  function lejantYaz() {
    // CSP satır içi stil izni vermediği için renkler CSSOM ile verilir
    var K = KATMAN[katman], L = $('lejant');
    L.innerHTML = '<p class="l-baslik">' + kacis(K.uzun_ad) + ' · ' + kacis(K.lejant) + '</p>' +
      '<div class="olcek"><span class="uc">az</span><div><div class="kutular"></div><div class="sayilar"></div></div><span class="uc">çok</span></div>' +
      (K.not ? '<p class="l-not">' + kacis(K.not) + '</p>' : '');
    var ku = L.querySelector('.kutular'), sa = L.querySelector('.sayilar');
    K.renkler.forEach(function (r, i) {
      var k = document.createElement('span'); k.style.background = r; ku.appendChild(k);
      var s = document.createElement('span'); s.textContent = i < K.sinirlar.length ? sinirYaz(K.sinirlar[i]) : ''; sa.appendChild(s);
    });
  }
  function trKutuYaz() {
    var K = KATMAN[katman];
    $('tr-sayi').textContent = K.turkiye;
    $('tr-birim').textContent = katman === 'kis' ? 'kış aylarında artış' : 'her 100 bin kişide, yılda';
    $('tr-kutu').setAttribute('aria-label', 'Türkiye kartını aç: ' + K.uzun_ad + ', ' + K.turkiye);
  }

  /* ---------- görünüm (viewBox) ---------- */
  var vb = { x: 0, y: 0, w: W, h: H };
  function sinirla(v) {
    var w = Math.min(Math.max(v.w, MINW), W), h = w * H / W;
    return { x: Math.min(Math.max(v.x, 0), W - w), y: Math.min(Math.max(v.y, 0), H - h), w: w, h: h };
  }
  function pxBirim() { return vb.w / Math.max(cerceve.clientWidth, 1); }
  var cizimBekliyor = false;
  function ciz() {
    if (cizimBekliyor) return;
    cizimBekliyor = true;
    requestAnimationFrame(function () { cizimBekliyor = false; cizHemen(); });
  }
  function cizHemen() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    var s = pxBirim(), genis = cerceve.clientWidth;
    var adli = vb.w < W / 2.2 && genis > 280;
    svg.classList.toggle('adli', adli);
    if (adli) {
      var fs = (12 * s).toFixed(3), sw = (3 * s).toFixed(3);
      iller.forEach(function (il) { il.yazi.setAttribute('font-size', fs); il.yazi.setAttribute('stroke-width', sw); });
    }
    var yakin = vb.w < W - 0.5;
    cerceve.classList.toggle('yakin', yakin);
    $('uzak').disabled = !yakin;
    $('sifirla').disabled = !yakin;
    $('yak').disabled = vb.w <= MINW + 0.5;
    if (uzerinde) balonKonum();
  }
  var anim = null;
  function git(hedef, hemen) {
    hedef = sinirla(hedef);
    if (anim) cancelAnimationFrame(anim);
    if (hemen || azHareket) { vb = hedef; ciz(); return; }
    var bas = { x: vb.x, y: vb.y, w: vb.w }, t0 = performance.now(), sure = 480;
    function adim(t) {
      var p = Math.min((t - t0) / sure, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var w = Math.exp(Math.log(bas.w) + (Math.log(hedef.w) - Math.log(bas.w)) * e);
      var cx0 = bas.x + bas.w / 2, cy0 = bas.y + bas.w * H / W / 2, cx1 = hedef.x + hedef.w / 2, cy1 = hedef.y + hedef.h / 2;
      vb = sinirla({ x: cx0 + (cx1 - cx0) * e - w / 2, y: cy0 + (cy1 - cy0) * e - w * H / W / 2, w: w });
      cizHemen();
      anim = p < 1 ? requestAnimationFrame(adim) : null;
    }
    anim = requestAnimationFrame(adim);
  }
  function yakinlas(kat, mx, my, hemen) {
    if (mx === undefined) { mx = vb.x + vb.w / 2; my = vb.y + vb.h / 2; }
    var w = Math.min(Math.max(vb.w / kat, MINW), W);
    git({ x: mx - (mx - vb.x) * (w / vb.w), y: my - (my - vb.y) * (w / vb.w), w: w }, hemen);
  }
  function haritaNoktasi(cx, cy) {
    var p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }
  // Seçilen il görünmüyorsa (yakındayken) haritayı ona kaydır; yakınlaştırma yapılmaz
  function goruneGetir(il) {
    var b = il.b;
    if (vb.w >= W - 0.5) return;
    if (b[0] >= vb.x && b[2] <= vb.x + vb.w && b[1] >= vb.y && b[3] <= vb.y + vb.h) return;
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    git({ x: cx - vb.w / 2, y: cy - vb.h / 2, w: vb.w });
  }

  /* ---------- kart ---------- */
  function cip(il, k) {
    if (!il || il.turkiye || !k) return '';
    return '<span class="cip" data-renk="' + kacis(KATMAN[k].renkler[il.s[k]]) + '"></span>';
  }
  function bolumHtml(b, il) {
    var h = '<section class="bolum"><h3>' + kacis(b.baslik) + '</h3>';
    if (b.satirlar && b.satirlar.length) {
      h += '<dl>';
      b.satirlar.forEach(function (s) {
        var k = satirKatmani(s[0]), sec = k === katman;
        h += '<div class="satir' + (sec ? ' secili' : '') + '"><dt>' + (sec ? cip(il, k) : '') + '<span>' + kacis(s[0]) + '</span></dt><dd>' + kacis(s[1]) + '</dd></div>';
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
      '<p>Haritada bir ile dokunun ya da haritanın altındaki listeden ilinizi seçin. Kartta beş hastalıktan ölümler, kış aylarındaki artış ve ilin yaş yapısı var. Türkiye\'nin sayıları köşedeki kutuda.</p>' +
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
  function sec(o, opt) {
    opt = opt || {};
    secili = o;
    $('vurgu').setAttribute('d', o && !o.turkiye ? o.d : '');
    $('tr-kutu').setAttribute('aria-pressed', o && o.turkiye ? 'true' : 'false');
    kartYaz(o);
    $('il-sec').value = o.turkiye ? '' : o.id;
    if (!o.turkiye) goruneGetir(o);
    adresYaz();
    if (opt.kaydir) kaydir();
  }
  function temizle() {
    secili = null; $('vurgu').setAttribute('d', ''); $('tr-kutu').setAttribute('aria-pressed', 'false');
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

  /* ---------- harita etkileşimi ---------- */
  function hedefBul(cx, cy) {
    var el = document.elementFromPoint(cx, cy);
    if (!el || !svg.contains(el)) return null;
    var id = el.getAttribute('data-il');
    return id ? ilById[id] : null;
  }
  var uzerinde = null, sonFare = null;
  function balonKonum() {
    if (!sonFare) return;
    var r = cerceve.getBoundingClientRect(), b = $('balon');
    b.style.left = (sonFare.x - r.left) + 'px';
    b.style.top = (sonFare.y - r.top) + 'px';
  }
  function balonGoster(o) {
    var b = $('balon');
    if (uzerinde === o) { if (o) balonKonum(); return; }
    uzerinde = o;
    if (!o) { b.hidden = true; return; }
    b.innerHTML = kacis(o.ad) + ' · <b>' + kacis(kartDegeri(o.kart, katman)) + '</b>';
    b.hidden = false;
    balonKonum();
  }

  var isaretci = new Map(), bas = null, tasindi = false, cimdik = null, sonDokunma = null;
  function ortaUzak() {
    var a = Array.from(isaretci.values());
    return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) };
  }
  cerceve.addEventListener('pointerdown', function (e) {
    if (e.target.closest('.zoom')) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    isaretci.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (isaretci.size === 1) { bas = { x: e.clientX, y: e.clientY, vb: { x: vb.x, y: vb.y, w: vb.w } }; tasindi = false; }
    if (isaretci.size === 2) {
      var o = ortaUzak(), p = haritaNoktasi(o.x, o.y);
      cimdik = { d: o.d, w: vb.w, px: p.x, py: p.y };
    }
  });
  cerceve.addEventListener('pointermove', function (e) {
    if (!isaretci.has(e.pointerId)) {
      if (e.pointerType === 'mouse') {
        sonFare = { x: e.clientX, y: e.clientY };
        var o = hedefBul(e.clientX, e.clientY);
        cerceve.classList.toggle('uzerinde', !!o);
        balonGoster(o);
      }
      return;
    }
    isaretci.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (isaretci.size === 2 && cimdik) {
      var oo = ortaUzak(), r = cerceve.getBoundingClientRect();
      var w = Math.min(Math.max(cimdik.w * cimdik.d / Math.max(oo.d, 1), MINW), W);
      var s = w / cerceve.clientWidth;
      vb = sinirla({ x: cimdik.px - (oo.x - r.left - cerceve.clientLeft) * s, y: cimdik.py - (oo.y - r.top - cerceve.clientTop) * s, w: w });
      tasindi = true;
      ciz();
    } else if (isaretci.size === 1 && bas) {
      var dx = e.clientX - bas.x, dy = e.clientY - bas.y;
      if (!tasindi && Math.hypot(dx, dy) > 6) tasindi = true;
      if (tasindi && bas.vb.w < W - 0.5) {
        try { cerceve.setPointerCapture(e.pointerId); } catch (_) {}
        var s1 = bas.vb.w / cerceve.clientWidth;
        cerceve.classList.add('suruk');
        balonGoster(null);
        vb = sinirla({ x: bas.vb.x - dx * s1, y: bas.vb.y - dy * s1, w: bas.vb.w });
        ciz();
      }
    }
  });
  cerceve.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { balonGoster(null); cerceve.classList.remove('uzerinde'); } });
  function birak(e) {
    if (!isaretci.has(e.pointerId)) return;
    isaretci.delete(e.pointerId);
    cerceve.classList.remove('suruk');
    if (isaretci.size === 1) {
      var kalan = Array.from(isaretci.values())[0];
      bas = { x: kalan.x, y: kalan.y, vb: { x: vb.x, y: vb.y, w: vb.w } };
      cimdik = null;
      return;
    }
    if (isaretci.size === 0) {
      cimdik = null;
      if (e.type === 'pointerup' && !tasindi && !e.target.closest('.zoom')) {
        var dokunma = e.pointerType !== 'mouse', simdi = performance.now();
        if (dokunma && sonDokunma && simdi - sonDokunma.t < 320 && Math.hypot(e.clientX - sonDokunma.x, e.clientY - sonDokunma.y) < 30) {
          var p = haritaNoktasi(e.clientX, e.clientY);
          yakinlas(2, p.x, p.y);
          sonDokunma = null;
          return;
        }
        sonDokunma = dokunma ? { t: simdi, x: e.clientX, y: e.clientY } : null;
        var o = hedefBul(e.clientX, e.clientY);
        if (o) sec(o, { kaydir: true });
      }
      bas = null;
    }
  }
  cerceve.addEventListener('pointerup', birak);
  cerceve.addEventListener('pointercancel', birak);
  cerceve.addEventListener('dblclick', function (e) {
    if (e.target.closest('.zoom')) return;
    var p = haritaNoktasi(e.clientX, e.clientY);
    yakinlas(e.shiftKey ? 0.5 : 2, p.x, p.y);
  });

  var ipucuZaman = null, ipucuSon = 0;
  function ipucu(metin, ms) {
    var el = $('ipucu');
    el.textContent = metin; el.hidden = false;
    clearTimeout(ipucuZaman);
    ipucuZaman = setTimeout(function () { el.hidden = true; }, ms || 1600);
  }
  var mac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  cerceve.addEventListener('wheel', function (e) {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      var p = haritaNoktasi(e.clientX, e.clientY);
      yakinlas(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0022)), p.x, p.y, true);
    } else if (performance.now() - ipucuSon > 5000) {
      ipucuSon = performance.now();
      ipucu((mac ? '⌘' : 'Ctrl') + ' tuşuna basılı tutup tekerleği çevirerek yakınlaştırın');
    }
  }, { passive: false });
  cerceve.addEventListener('keydown', function (e) {
    var adim = vb.w * 0.12, k = e.key;
    if (k === 'ArrowLeft') git({ x: vb.x - adim, y: vb.y, w: vb.w });
    else if (k === 'ArrowRight') git({ x: vb.x + adim, y: vb.y, w: vb.w });
    else if (k === 'ArrowUp') git({ x: vb.x, y: vb.y - adim, w: vb.w });
    else if (k === 'ArrowDown') git({ x: vb.x, y: vb.y + adim, w: vb.w });
    else if (k === '+' || k === '=') yakinlas(1.6);
    else if (k === '-' || k === '_') yakinlas(1 / 1.6);
    else if (k === '0') git({ x: 0, y: 0, w: W });
    else if (k === 'Escape') { temizle(); git({ x: 0, y: 0, w: W }); }
    else return;
    e.preventDefault();
  });
  $('yak').addEventListener('click', function () { yakinlas(1.8); });
  $('uzak').addEventListener('click', function () { yakinlas(1 / 1.8); });
  $('sifirla').addEventListener('click', function () { git({ x: 0, y: 0, w: W }); });
  window.addEventListener('resize', ciz);
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
  cizHemen();
})();
