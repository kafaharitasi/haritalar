/* Kafa Haritası · Faylar ve depremler (Bölüm 1)
   Veri: veri.js (GEM, USGS, Natural Earth, OSM/geoBoundaries). Dış istek yok. */
(function () {
  'use strict';

  var V = window.KH_DEPREM;
  var NS = 'http://www.w3.org/2000/svg';
  var W = V.W, H = V.H, MINW = W / 12;
  var $ = function (id) { return document.getElementById(id); };
  var svg = $('svg'), cerceve = $('cerceve'), kart = $('kart');
  var azHareket = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function yap(tag, attrs, ebeveyn) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    if (ebeveyn) ebeveyn.appendChild(e);
    return e;
  }
  function kacis(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function virgul(x, d) { return x.toFixed(d).replace('.', ','); }
  var KATLAMA = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  function sade(s) {
    return String(s).trim().toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, function (c) { return KATLAMA[c]; });
  }
  function dis(url, metin, dil) {
    return '<a href="' + kacis(url) + '" target="_blank" rel="noopener"' + (dil ? ' lang="' + dil + '"' : '') + '>' + kacis(metin) + '</a>';
  }
  function bt(t) { return t ? 'M' + t.slice(1) : ''; } // mww → Mww

  /* ---------- sabit katmanlar ---------- */
  var SU_RENK = '#818F92', DENIZ_YAZI = '#586062';
  [0.75, 0.45, 0.22].forEach(function (op, i) {
    yap('path', { d: V.water[i], opacity: op }, $('k-su'));
  });
  $('komsular').setAttribute('d', V.neighbors);
  $('turkiye').setAttribute('d', V.turkey);
  $('turkiye-kiyi').setAttribute('d', V.turkey);
  $('goller').setAttribute('d', V.lakes);
  $('izgara').setAttribute('d', V.grat);

  var iller = V.iller.slice().sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); });
  iller.forEach(function (il, i) {
    il.sade = sade(il.ad);
    yap('path', { d: il.d, 'data-i': i }, $('iller'));
  });

  var fayYol = {};
  Object.keys(V.faults).forEach(function (t) {
    fayYol[t] = yap('path', { d: V.faults[t], 'data-t': t }, $('faylar'));
    yap('path', { d: V.faults[t], 'data-t': t }, $('fay-isabet'));
  });

  // yazılar: [x, y, metin, px, renk, harf aralığı(px), sınıf, dönüş]
  var yazilar = [];
  function yazi(x, y, metin, px, renk, aralik, sinif, donus, kalin) {
    var t = yap('text', { x: x, y: y, fill: renk, 'text-anchor': 'middle', stroke: '#EFE6D2', 'stroke-linejoin': 'round', 'paint-order': 'stroke' }, $('yazilar'));
    if (sinif) t.setAttribute('class', sinif);
    if (kalin) t.setAttribute('font-weight', '800');
    t.textContent = metin;
    var o = { el: t, x: x, y: y, px: px, aralik: aralik || 0, donus: donus || 0, hale: !!sinif };
    yazilar.push(o);
    return o;
  }
  V.seas.forEach(function (s) { yazi(s[0], s[1], s[2], 11, DENIZ_YAZI, 3.4).el.removeAttribute('stroke'); });
  V.gratLabels.forEach(function (g) {
    var o = yazi(g[0], g[1], g[2], 9.5, '#5A5244', 0.3);
    o.el.setAttribute('text-anchor', g[0] < 20 ? 'start' : 'middle');
    o.el.removeAttribute('stroke');
  });
  V.fayEtiket.forEach(function (f) { yazi(f[0], f[1], f[2], 10.5, '#9C3A23', 1.6, 'fay-yazi', f[3], true); });
  var ilYazi = yazi(0, 0, '', 14, '#171717', 0, 'il-yazi', 0, true);
  ilYazi.el.setAttribute('visibility', 'hidden');

  // depremler: büyükler alta, küçükler üste (hepsi görünür kalsın)
  var depremler = V.quakes.slice().sort(function (a, b) { return b.m - a.m; });
  var depremGore = {};
  depremler.forEach(function (q) {
    q.el = yap('circle', { cx: q.x, cy: q.y, r: 1 }, $('depremler'));
    if (q.m >= 7) q.el.setAttribute('class', 'ust');
    depremGore[q.id] = q;
  });
  function yaricapPx(q) { return 3 + (q.m - 5.5) * 3.2; }

  // seçim işareti (piksel biriminde çizilir, ölçeklenir)
  var secimG = yap('g', { 'class': 'deprem-secim', visibility: 'hidden' }, $('secim'));
  [[16, 0.9], [26, 0.5], [38, 0.25]].forEach(function (r) {
    yap('circle', { r: r[0], fill: 'none', stroke: '#E0A515', 'stroke-width': 1.6, opacity: r[1], 'vector-effect': 'non-scaling-stroke' }, secimG);
  });
  yap('path', { d: 'M0,-1 C-3,-9 -10,-14 -10,-22 A10,10 0 1 1 10,-22 C10,-14 3,-9 0,-1Z', fill: '#E0A515', stroke: '#171717', 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke' }, secimG);
  yap('circle', { cy: -22, r: 3.6, fill: '#EFE6D2' }, secimG);

  /* ---------- görünüm (viewBox) ---------- */
  var vb = { x: 0, y: 0, w: W, h: H };
  function sinirla(v) {
    var w = Math.min(Math.max(v.w, MINW), W), h = w * H / W;
    return { x: Math.min(Math.max(v.x, 0), W - w), y: Math.min(Math.max(v.y, 0), H - h), w: w, h: h };
  }
  function pxBirim() { return vb.w / Math.max(cerceve.clientWidth, 1); } // 1 ekran pikseli = ? harita birimi
  var secili = { deprem: null, il: null, fay: null };

  var cizimBekliyor = false;
  function ciz() {
    if (cizimBekliyor) return;
    cizimBekliyor = true;
    requestAnimationFrame(function () { cizimBekliyor = false; cizHemen(); });
  }
  function cizHemen() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    var s = pxBirim();
    var genis = cerceve.clientWidth;
    var buyut = Math.pow(W / vb.w, 0.22);           // yakınlaştıkça noktalar biraz büyür
    var dar = Math.min(Math.max(genis / 820, 0.72), 1);
    var nk = Math.max(dar, 0.8);
    depremler.forEach(function (q) { q.el.setAttribute('r', (yaricapPx(q) * buyut * nk * s).toFixed(3)); });
    yazilar.forEach(function (o) {
      var px = o.px * (o === ilYazi ? 1 : dar);
      o.el.setAttribute('font-size', (px * s).toFixed(3));
      o.el.setAttribute('letter-spacing', (o.aralik * s).toFixed(3));
      if (o.hale) o.el.setAttribute('stroke-width', (3 * s).toFixed(3));
      if (o.donus) o.el.setAttribute('transform', 'rotate(' + o.donus + ' ' + o.x + ' ' + o.y + ')');
    });
    if (secili.deprem) {
      var q = secili.deprem, k = s * Math.min(Math.max(genis / 760, 0.62), 1);
      secimG.setAttribute('transform', 'translate(' + q.x + ' ' + q.y + ') scale(' + k.toFixed(4) + ')');
    }
    // ölçek çubuğu
    var kmPx = (V.olcek200 / 200) / s, secenek = [10, 20, 50, 100, 200, 500], km = 200;
    var esik = Math.min(55, genis * 0.11);
    for (var i = 0; i < secenek.length; i++) { if (secenek[i] * kmPx >= esik) { km = secenek[i]; break; } }
    $('olcek-cubuk').style.width = Math.round(km * kmPx) + 'px';
    $('olcek-yazi').textContent = km + ' km';
    var yakin = vb.w < W - 0.5;
    cerceve.classList.toggle('yakin', yakin);
    $('uzak').disabled = !yakin;
    $('sifirla').disabled = !yakin;
    $('yak').disabled = vb.w <= MINW + 0.5;
  }

  var anim = null;
  function git(hedef, hemen) {
    hedef = sinirla(hedef);
    if (anim) cancelAnimationFrame(anim);
    if (hemen || azHareket) { vb = hedef; ciz(); return; }
    var bas = { x: vb.x, y: vb.y, w: vb.w }, t0 = performance.now(), sure = 380;
    function adim(t) {
      var p = Math.min((t - t0) / sure, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      vb = sinirla({ x: bas.x + (hedef.x - bas.x) * e, y: bas.y + (hedef.y - bas.y) * e, w: bas.w + (hedef.w - bas.w) * e });
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
  function sigdir(b, pay) {
    pay = pay || 1.6;
    var bw = (b[2] - b[0]) * pay, bh = (b[3] - b[1]) * pay;
    var w = Math.max(bw, bh * W / H, MINW * 1.4);
    git({ x: (b[0] + b[2]) / 2 - w / 2, y: (b[1] + b[3]) / 2 - w * H / W / 2, w: w });
  }
  function haritaNoktasi(cx, cy) {
    var p = svg.createSVGPoint(); p.x = cx; p.y = cy;
    return p.matrixTransform(svg.getScreenCTM().inverse());
  }

  /* ---------- kartlar ---------- */
  var TUR = {
    'Dextral': ['Sağ yanal doğrultu atımlı fay', 'Fayın iki yakası yatay olarak birbirinin yanından kayar. Bir yakada durup karşıya bakarsanız karşı yaka sağa doğru gider. Kuzey Anadolu Fayı bu türdendir.'],
    'Sinistral': ['Sol yanal doğrultu atımlı fay', 'Fayın iki yakası yatay olarak birbirinin yanından kayar. Bir yakada durup karşıya bakarsanız karşı yaka sola doğru gider. Doğu Anadolu Fayı bu türdendir.'],
    'Normal': ['Normal fay', 'Kabuk gerilirken bir blok, eğimli fay düzlemi boyunca aşağı kayar. Batı Anadolu\'daki çöküntü ovaları (graben) bu tür faylarla sınırlanır.'],
    'Reverse': ['Ters fay (bindirme)', 'Kabuk sıkışırken bir blok, eğimli fay düzlemi boyunca ötekinin üzerine çıkar.'],
    'Dextral-Normal': ['Sağ yanal, normal bileşenli fay', 'Hareketin çoğu sağ yanal kaymadır; buna bir miktar düşey (normal fay yönünde) hareket eşlik eder.'],
    'Sinistral-Normal': ['Sol yanal, normal bileşenli fay', 'Hareketin çoğu sol yanal kaymadır; buna bir miktar düşey (normal fay yönünde) hareket eşlik eder.'],
    'Dextral-Reverse': ['Sağ yanal, ters bileşenli fay', 'Hareketin çoğu sağ yanal kaymadır; buna bir miktar sıkışma (ters fay yönünde) eşlik eder.'],
    'Sinistral-Reverse': ['Sol yanal, ters bileşenli fay', 'Hareketin çoğu sol yanal kaymadır; buna bir miktar sıkışma (ters fay yönünde) eşlik eder.']
  };
  var MTA = 'https://www.mta.gov.tr/v3.0/hizmetler/yenilenmis-diri-fay-haritalari';
  var AFAD_TDTH = 'https://tdth.afad.gov.tr';

  function depremKarti(q) {
    var baslik = q.baslik ? q.baslik.split(' · ')[1] : 'M' + virgul(q.m, 1) + ' · ' + q.yer;
    var h = '<p class="meta">Deprem · ' + kacis(q.tarih) + '</p>';
    h += '<h2>' + kacis(baslik) + '</h2><dl>';
    h += '<dt>Saat</dt><dd>' + kacis(q.saat) + ' (Türkiye saati)</dd>';
    h += '<dt>Büyüklük</dt><dd>' + virgul(q.m, 1) + ' (USGS, ' + kacis(bt(q.mt)) + ')</dd>';
    if (q.afad) h += '<dt>AFAD</dt><dd>' + kacis(q.afad) + '</dd>';
    h += '<dt>Derinlik</dt><dd>' + q.z + ' km</dd>';
    h += '<dt>Yer</dt><dd>' + kacis(q.yer) + '</dd></dl>';
    if (q.metin) h += '<p>' + kacis(q.metin) + '</p>';
    var k = ['<span lang="en">USGS ComCat</span> · ' + dis('https://earthquake.usgs.gov/earthquakes/eventpage/' + q.id, q.id, 'en')];
    (q.kaynak || []).forEach(function (c) { k.push(c[1] ? dis(c[1], c[0]) : kacis(c[0])); });
    h += '<p class="kaynak">Kaynak · ' + k.join(' · ') + '</p>';
    return h;
  }
  function ilKarti(il) {
    var h = '<p class="meta">İl</p><h2>' + kacis(il.ad) + '</h2>';
    h += '<p>Haritayı ilinize yakınlaştırdık. Burada yalnızca GEM\'in diri fay izleri ve 2015–2025 arasındaki M5,5 ve üzeri depremler var. <strong class="uyari">Bu harita deprem tehlikesini göstermez.</strong> Bir yerde nokta ya da çizgi olmaması, orada deprem olmayacağı anlamına gelmez.</p>';
    h += '<ul><li>' + dis(AFAD_TDTH, 'AFAD Türkiye Deprem Tehlike Haritası') + ' (e-Devlet ile giriş)</li>';
    h += '<li>' + dis(MTA, 'MTA il il diri fay haritaları') + '</li></ul>';
    h += '<p class="kaynak">İl sınırı · ' + dis('https://www.openstreetmap.org/copyright', '© OpenStreetMap katkıcıları') + ' (<span lang="en">geoBoundaries</span>), <span lang="en">ODbL</span></p>';
    return h;
  }
  function fayKarti(t) {
    var d = TUR[t] || ['Diri fay izi', 'GEM bu fay için hareket türü vermiyor.'];
    var h = '<p class="meta">Diri fay izi</p><h2>' + kacis(d[0]) + '</h2><p>' + kacis(d[1]) + '</p>';
    h += '<p>Haritada bu türdeki bütün fay izlerini kalınlaştırdık. Çizgiler ölçek gereği sadeleştirildi; bir fayın tam yeri için ' + dis(MTA, 'MTA\'nın diri fay haritalarına') + ' bakın.</p>';
    h += '<p class="kaynak">Kaynak · ' + dis('https://github.com/GEMScienceTools/gem-global-active-faults', 'GEM Global Active Faults', 'en') + ' · CC BY-SA 4.0</p>';
    return h;
  }

  function temizle() {
    secili.deprem = null; secili.il = null;
    $('il-ara').value = '';
    secimG.setAttribute('visibility', 'hidden');
    $('il-secili').removeAttribute('d');
    ilYazi.el.setAttribute('visibility', 'hidden');
    if (secili.fay) { fayYol[secili.fay].classList.remove('vurgu'); secili.fay = null; }
  }

  function depremSec(q, odak) {
    temizle();
    secili.deprem = q;
    secimG.setAttribute('visibility', 'visible');
    kart.innerHTML = depremKarti(q);
    $('deprem-sec').value = q.id;
    if (odak) {
      var p = 40 * pxBirim();
      var gorunur = q.x > vb.x + p && q.x < vb.x + vb.w - p && q.y > vb.y + p && q.y < vb.y + vb.h - p;
      if (!gorunur) git({ x: q.x - vb.w / 2, y: q.y - vb.h / 2, w: vb.w });
    }
    ciz();
  }
  function ilSec(il, yakinlastir) {
    temizle();
    secili.il = il;
    $('il-secili').setAttribute('d', il.d);
    ilYazi.x = il.c[0]; ilYazi.y = il.c[1];
    ilYazi.el.setAttribute('x', il.c[0]); ilYazi.el.setAttribute('y', il.c[1]);
    ilYazi.el.textContent = il.ad;
    ilYazi.el.setAttribute('visibility', 'visible');
    kart.innerHTML = ilKarti(il);
    $('il-ara').value = il.ad;
    $('deprem-sec').value = '';
    if (yakinlastir !== false) sigdir(il.b); else ciz();
  }
  function faySec(t) {
    temizle();
    secili.fay = t;
    fayYol[t].classList.add('vurgu');
    kart.innerHTML = fayKarti(t);
    $('deprem-sec').value = '';
    ciz();
  }

  /* ---------- tıklama / dokunma ---------- */
  var KATMAN = { fay: true, deprem: true };
  function enYakinDeprem(cx, cy, tolPx) {
    if (!KATMAN.deprem) return null;
    var p = haritaNoktasi(cx, cy), s = pxBirim(), olc = Math.pow(W / vb.w, 0.22) * Math.max(Math.min(Math.max(cerceve.clientWidth / 820, 0.72), 1), 0.8);
    var icinde = null, en = null, enD = Infinity;
    depremler.forEach(function (q) {
      var r = yaricapPx(q) * olc, d = Math.hypot(q.x - p.x, q.y - p.y) / s;
      if (d <= r + 1.5 && (!icinde || r < icinde.r)) icinde = { q: q, r: r };   // en üstteki (en küçük) daire
      if (d - r <= tolPx && d - r < enD) { en = q; enD = d - r; }
    });
    return icinde ? icinde.q : en;
  }
  function tikla(cx, cy, dokunma) {
    var q = enYakinDeprem(cx, cy, dokunma ? 12 : 5);
    if (q) { depremSec(q); return; }
    var hedef = document.elementFromPoint(cx, cy);
    if (!hedef) return;
    if (KATMAN.fay && hedef.parentNode && hedef.parentNode.id === 'fay-isabet') { faySec(hedef.getAttribute('data-t')); return; }
    if (hedef.parentNode && hedef.parentNode.id === 'iller') { ilSec(iller[+hedef.getAttribute('data-i')], false); }
  }

  var isaretci = new Map(), bas = null, cimdik = null, tasindi = false, sonDokunma = null;
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
    if (e.pointerType === 'mouse' || cerceve.classList.contains('yakin') || isaretci.size === 2) {
      try { cerceve.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });
  cerceve.addEventListener('pointermove', function (e) {
    if (!isaretci.has(e.pointerId)) {
      if (e.pointerType === 'mouse') cerceve.classList.toggle('uzerinde', !!enYakinDeprem(e.clientX, e.clientY, 5));
      return;
    }
    isaretci.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (isaretci.size === 2 && cimdik) {
      var o = ortaUzak(), r = cerceve.getBoundingClientRect();
      var w = Math.min(Math.max(cimdik.w * cimdik.d / Math.max(o.d, 1), MINW), W);
      var s = w / cerceve.clientWidth;
      vb = sinirla({ x: cimdik.px - (o.x - r.left - cerceve.clientLeft) * s, y: cimdik.py - (o.y - r.top - cerceve.clientTop) * s, w: w });
      tasindi = true;
      ciz();
    } else if (isaretci.size === 1 && bas) {
      var dx = e.clientX - bas.x, dy = e.clientY - bas.y;
      if (!tasindi && Math.hypot(dx, dy) > 6) tasindi = true;
      if (tasindi && bas.vb.w < W - 0.5) {
        var s1 = bas.vb.w / cerceve.clientWidth;
        cerceve.classList.add('suruk');
        vb = sinirla({ x: bas.vb.x - dx * s1, y: bas.vb.y - dy * s1, w: bas.vb.w });
        ciz();
      }
    }
  });
  function birak(e) {
    if (!isaretci.has(e.pointerId)) return;
    isaretci.delete(e.pointerId);
    cerceve.classList.remove('suruk');
    if (isaretci.size === 1) {               // çimdikten tek parmağa geçiş: zıplamasın
      var kalan = Array.from(isaretci.values())[0];
      bas = { x: kalan.x, y: kalan.y, vb: { x: vb.x, y: vb.y, w: vb.w } };
      cimdik = null;
      return;
    }
    if (isaretci.size === 0) {
      cimdik = null;
      if (e.type === 'pointerup' && !tasindi) {
        var dokunma = e.pointerType !== 'mouse', simdi = performance.now();
        if (dokunma && sonDokunma && simdi - sonDokunma.t < 320 && Math.hypot(e.clientX - sonDokunma.x, e.clientY - sonDokunma.y) < 30) {
          var p = haritaNoktasi(e.clientX, e.clientY);
          yakinlas(2, p.x, p.y);
          sonDokunma = null;
          return;
        }
        sonDokunma = dokunma ? { t: simdi, x: e.clientX, y: e.clientY } : null;
        tikla(e.clientX, e.clientY, dokunma);
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
    else return;
    e.preventDefault();
  });

  $('yak').addEventListener('click', function () { yakinlas(1.8); });
  $('uzak').addEventListener('click', function () { yakinlas(1 / 1.8); });
  $('sifirla').addEventListener('click', function () { git({ x: 0, y: 0, w: W }); });

  /* ---------- araç çubuğu ---------- */
  var liste = $('il-liste');
  iller.forEach(function (il) { var o = document.createElement('option'); o.value = il.ad; liste.appendChild(o); });
  function ilBul(v, gevsek) {
    var k = sade(v);
    if (!k) return null;
    var tam = iller.filter(function (il) { return il.sade === k; })[0];
    if (tam || !gevsek) return tam || null;
    var bas = iller.filter(function (il) { return il.sade.indexOf(k) === 0; });
    if (bas.length) return bas[0];
    return iller.filter(function (il) { return il.sade.indexOf(k) >= 0; })[0] || null;
  }
  var ilKutu = $('il-ara');
  ilKutu.addEventListener('input', function () {
    var il = ilBul(ilKutu.value, false);
    if (il && il !== secili.il) ilSec(il);
  });
  ilKutu.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var il = ilBul(ilKutu.value, true);
    if (il) ilSec(il); else if (sade(ilKutu.value)) ipucu('Bu adla bir il bulamadık', 1800);
  });

  var sec = $('deprem-sec');
  var bos = document.createElement('option');
  bos.value = ''; bos.textContent = 'Büyükten küçüğe ' + depremler.length + ' deprem';
  sec.appendChild(bos);
  depremler.slice().sort(function (a, b) { return b.m - a.m || (a.iso < b.iso ? 1 : -1); }).forEach(function (q) {
    var o = document.createElement('option');
    o.value = q.id;
    o.textContent = 'M' + virgul(q.m, 1) + ' · ' + q.tarih + ' · ' + q.yer;
    sec.appendChild(o);
  });
  sec.addEventListener('change', function () { if (depremGore[sec.value]) depremSec(depremGore[sec.value], true); });

  [['k-fay', 'gizle-fay', 'fay'], ['k-deprem', 'gizle-deprem', 'deprem'], ['k-il', 'gizle-il', null]].forEach(function (k) {
    $(k[0]).addEventListener('change', function (e) {
      cerceve.classList.toggle(k[1], !e.target.checked);
      if (k[2]) KATMAN[k[2]] = e.target.checked;
    });
  });

  // gömülü mü? (Wix içinde) → "Tam sayfada aç" bağlantısını göster
  try { if (window.self !== window.top) $('tam-sayfa').hidden = false; } catch (_) { $('tam-sayfa').hidden = false; }

  if ('ResizeObserver' in window) new ResizeObserver(ciz).observe(cerceve);
  else window.addEventListener('resize', ciz);

  /* ---------- başlangıç: ?il=Malatya · ?deprem=us6000jllz ---------- */
  var ps = new URLSearchParams(location.search);
  var ilP = ps.get('il'), depP = ps.get('deprem');
  var baslangicIl = ilP && (ilBul(ilP, true) || iller.filter(function (il) { return il.iso === ilP.toUpperCase(); })[0]);
  vb = { x: 0, y: 0, w: W, h: H };
  if (baslangicIl) ilSec(baslangicIl);
  else depremSec(depremGore[depP] || depremGore['us6000jllz'] || depremler[depremler.length - 1], !!depremGore[depP]);
  cizHemen();
})();
