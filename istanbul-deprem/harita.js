/* Kafa Haritası · İstanbul Deprem Simülasyonu · ilçe ve mahalle sonuçları
   Veri: veri.js (İBB DEZİM–KRDAE 2019 kitapçıkları ve Kafa Haritası simülasyonu; sınırlar © OpenStreetMap
   katkıcıları, ODbL; geoBoundaries). Kart metinleri verideki "kart" dizisinden aynen basılır. Dış istek yok. */
(function () {
  'use strict';

  var V = window.KH_DEPREM_SIM;
  var NS = 'http://www.w3.org/2000/svg';
  var W = V.W, H = V.H, MINW = W / 40;
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
  var KATLAMA = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i̇': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  function sade(s) {
    return String(s).trim().toLocaleLowerCase('tr').replace(/i̇/g, 'i')
      .replace(/[çğıöşüâîû]/g, function (c) { return KATLAMA[c]; })
      .replace(/[^a-z0-9]+/g, ' ').trim();
  }

  /* ---------- renkler ve sınıflar ---------- */
  var HASAR = ['#E6DCC4', '#E9C98F', '#DD9A5B', '#C2622F', '#8E2F1B'];
  var HARDAL = ['#F0E4BF', '#E8CB7E', '#E0A515', '#A9760B', '#6E4D05'];
  var OZET = ['#9DB58A', '#EBCB98', '#E09A6E', '#C8603F', '#9E3423'];
  var BOS = '#E6DCC4', TARAMA = 'url(#tarama)';
  var SN = V.meta.siniflar;
  var KATMAN = {
    hasar: { ad: 'Hasar', baslik: 'Ağır ya da çok ağır hasarlı bina payı', renk: HASAR, etiket: SN.hasar.etiket, alan: 'h' },
    toplanma: { ad: 'Toplanma', baslik: 'Toplanacak yer bulamayanların payı (15 dakika yürüyüş)', renk: HARDAL, etiket: SN.toplanma.etiket, alan: 't', kirsal: true },
    barinma: { ad: 'Barınma', baslik: 'Barınacak yer bulamayanların payı (birinci gün)', renk: HARDAL, etiket: SN.barinma.etiket, alan: 'br', kirsal: true },
    ozet: { ad: 'Üç günün özeti', baslik: 'Dört aşamanın kaçında kırmızı', renk: OZET, etiket: SN.ozet.etiket, ilce: true, kirsal: true }
  };
  var KIRSAL_ETIKET = 'Kırsal ilçe: tarlalar ve açık araziler hesaba girmedi';
  var SABIT = 'Bu bir simülasyondur, deprem tahmini değildir. Kaynaklar ve yöntem bölüm sayfasında.';
  var MAH_NOT = 'Mahalle nüfusu tahmini olduğu için simülasyon sonuçları aralık olarak verilir. Can kaybı ve yaralı sayıları ilçe kartında.';
  var CIP = { 'yeşil': 'yesil', 'sarı': 'sari', 'kırmızı': 'kirmizi', 'gri': 'gri' };

  /* ---------- çizim ---------- */
  $('komsular').setAttribute('d', V.komsular);
  var ilceler = V.ilceler.slice().sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr'); });
  var ilceById = {}, mahById = {};
  ilceler.forEach(function (il) {
    il.tur = 'ilce';
    il.sade = sade(il.ad);
    il.mahalleler = [];
    il.dolgu = yap('path', { d: il.d, 'data-ilce': il.id }, $('ilce-dolgu'));
    yap('path', { d: il.d }, $('ilce-sinir'));
    il.yazi = yap('text', { x: il.lx, y: il.ly }, $('adlar'));
    il.yazi.textContent = il.ad;
    ilceById[il.id] = il;
  });
  var ayniAd = {};
  V.mahalleler.forEach(function (m) { ayniAd[m.ad] = (ayniAd[m.ad] || 0) + 1; });
  V.mahalleler.forEach(function (m) {
    m.tur = 'mahalle';
    m.ilce = ilceById[m.i];
    m.sade = sade(m.ad);
    m.el = yap('path', { d: m.d, 'data-mah': m.id }, $('mahalleler'));
    m.ilce.mahalleler.push(m);
    mahById[m.id] = m;
  });

  var katman = 'hasar';
  function mahRenk(m, k) {
    var K = KATMAN[k], s = m[K.alan];
    if (K.kirsal && m.k) return TARAMA;
    if (s === null || s === undefined) return BOS;
    return K.renk[s];
  }
  function boya() {
    var K = KATMAN[katman];
    document.body.classList.toggle('ozet-katman', !!K.ilce);
    if (K.ilce) {
      ilceler.forEach(function (il) { il.dolgu.style.fill = il.kirsal ? TARAMA : OZET[il.n]; });
    } else {
      ilceler.forEach(function (il) { il.dolgu.style.fill = ''; });
      V.mahalleler.forEach(function (m) { m.el.style.fill = mahRenk(m, katman); });
    }
    lejantYaz();
  }
  function lejantYaz() {
    // CSP satır içi stil izni vermediği için renkler CSSOM ile verilir
    var K = KATMAN[katman], L = $('lejant');
    L.innerHTML = '<p class="l-baslik">' + kacis(K.baslik) + '</p><ul></ul>';
    var ul = L.querySelector('ul');
    function satir(renk, metin, tarali) {
      var li = document.createElement('li'), k = document.createElement('span');
      k.className = 'kutu' + (tarali ? ' tarama' : '');
      if (renk) k.style.background = renk;
      li.appendChild(k); li.appendChild(document.createTextNode(metin)); ul.appendChild(li);
    }
    K.etiket.forEach(function (e, i) { satir(K.renk[i], e); });
    if (K.kirsal) satir(null, KIRSAL_ETIKET, true);
    if (!K.ilce && K.alan !== 'h') satir(BOS, 'İhtiyaç yok');
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
    var adli = vb.w < W / 2.4 && genis > 300;
    svg.classList.toggle('adli', adli);
    if (adli) {
      var fs = (12.5 * s).toFixed(3), sw = (3 * s).toFixed(3);
      ilceler.forEach(function (il) { il.yazi.setAttribute('font-size', fs); il.yazi.setAttribute('stroke-width', sw); });
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
    var bas = { x: vb.x, y: vb.y, w: vb.w }, t0 = performance.now(), sure = 520;
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
  function kutuyaGit(b, pay, hemen) {
    pay = pay || 1.25;
    var cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
    var w = Math.max((b[2] - b[0]) * pay, (b[3] - b[1]) * pay * W / H, MINW * 1.6);
    git({ x: cx - w / 2, y: cy - w * H / W / 2, w: w }, hemen);
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

  /* ---------- kart ---------- */
  var acikSayisi = function () { return (gomulu || window.innerWidth < 900) ? 1 : 99; };
  function bolumHtml(b, i, acik) {
    var h = '<details class="bolum"' + (i < acik ? ' open' : '') + '><summary>' + kacis(b.baslik) +
      '<svg class="ikon ok" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 6l5 5 5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg></summary>';
    if (b.asamalar) {
      h += '<ul class="asamalar">';
      b.asamalar.forEach(function (a) {
        h += '<li><span class="cip ' + (CIP[a.renk] || 'gri') + '">' + kacis(a.renk) + '</span><span>' + kacis(a.ad) + '</span><span class="olcu">' + kacis(a.olcu) + '</span></li>';
      });
      h += '</ul>';
    }
    if (b.satirlar && b.satirlar.length) {
      h += '<dl>';
      b.satirlar.forEach(function (s) {
        var uzun = String(s[1]).length > 26;
        h += '<dt' + (uzun ? ' class="tam"' : '') + '>' + kacis(s[0]) + '</dt><dd' + (uzun ? ' class="uzun"' : '') + '>' + kacis(s[1]) + '</dd>';
      });
      h += '</dl>';
    }
    if (b.not) h += '<p class="not">' + kacis(b.not) + '</p>';
    return h + '</details>';
  }
  function bosKart() {
    kart.innerHTML =
      '<p class="etiket">39 ilçe · 959 mahalle</p>' +
      '<h2>Bir yer seçin</h2>' +
      '<p>Haritada bir mahalleye dokunun ya da arama kutusuna ilçenizin veya mahallenizin adını yazın. "Üç günün özeti" katmanında ilçeler seçilir.</p>' +
      '<p class="sabit">' + kacis(SABIT) + '</p>';
  }
  function ilceKart(il) {
    var acik = acikSayisi(), h = '<p class="etiket">İlçe' + (il.kirsal ? ' · kırsal' : '') + '</p><h2>' + kacis(il.ad) + '</h2>';
    h += '<div class="dugmeler"><button type="button" class="dugme" id="mah-goster">Mahalleleri göster</button></div>';
    il.kart.forEach(function (b, i) { h += bolumHtml(b, i, acik); });
    h += '<p class="sabit">' + kacis(SABIT) + '</p>';
    kart.innerHTML = h;
    $('mah-goster').addEventListener('click', function () {
      if (KATMAN[katman].ilce) katmanSec('hasar');
      kutuyaGit(il.b, 1.5);
      kaydir();
    });
  }
  function mahalleKart(m) {
    var acik = acikSayisi(), h = '<p class="etiket">Mahalle · ' + kacis(m.ilce.ad) + '</p><h2>' + kacis(m.ad) + '</h2>';
    m.kart.forEach(function (b, i) { h += bolumHtml(b, i, Math.max(acik, 3)); });
    h += '<p class="not">' + kacis(MAH_NOT) + '</p>';
    h += '<button type="button" class="bag" id="ilce-ac">' + kacis(m.ilce.ad) + ' ilçesinin bütün sonuçları →</button>';
    h += '<p class="sabit">' + kacis(SABIT) + '</p>';
    kart.innerHTML = h;
    $('ilce-ac').addEventListener('click', function () { sec(m.ilce, { yakin: true }); });
  }

  /* ---------- seçim ---------- */
  var secili = null;
  function vurguCiz() {
    $('vurgu').setAttribute('d', secili ? secili.d : '');
    var il = secili ? (secili.tur === 'ilce' ? secili : secili.ilce) : null;
    $('vurgu-ilce').setAttribute('d', il && secili.tur === 'mahalle' ? il.d : '');
  }
  function sec(o, opt) {
    opt = opt || {};
    secili = o;
    vurguCiz();
    if (o.tur === 'ilce') { ilceKart(o); $('ilce-sec').value = o.id; }
    else { mahalleKart(o); $('ilce-sec').value = o.ilce.id; }
    if (opt.yakin) kutuyaGit(o.b, o.tur === 'ilce' ? 1.5 : 2.6, opt.hemen);
    adresYaz();
    if (opt.kaydir) kaydir();
  }
  function temizle() {
    secili = null; vurguCiz(); bosKart(); $('ilce-sec').value = ''; adresYaz();
  }
  function kaydir() {
    var r = cerceve.getBoundingClientRect();
    if (r.top < 0 || r.bottom > window.innerHeight) $('sekil').scrollIntoView({ behavior: azHareket ? 'auto' : 'smooth', block: 'start' });
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
    if (!history.replaceState) return;
    var q = [];
    if (katman !== 'hasar') q.push('katman=' + katman);
    if (secili) q.push((secili.tur === 'ilce' ? 'ilce=' : 'mahalle=') + secili.id);
    var s = q.length ? '?' + q.join('&') : '';
    if (gomulu && !/gom=1/.test(s) && /[?&]gom=1\b/.test(location.search)) s += (s ? '&' : '?') + 'gom=1';
    history.replaceState(null, '', location.pathname + s);
    $('tam-sayfa').href = './' + (q.length ? '?' + q.join('&') : '');
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

  /* ---------- ilçe listesi ---------- */
  var secKutu = $('ilce-sec');
  ilceler.forEach(function (il) {
    var op = document.createElement('option'); op.value = il.id; op.textContent = il.ad; secKutu.appendChild(op);
  });
  secKutu.addEventListener('change', function () {
    var il = ilceById[secKutu.value];
    if (il) sec(il, { yakin: true }); else { temizle(); git({ x: 0, y: 0, w: W }); }
  });

  /* ---------- arama ---------- */
  var ara = $('ara'), sonucEl = $('ara-sonuc'), sonuclar = [], etkin = -1;
  var hepsi = ilceler.concat(V.mahalleler.slice().sort(function (a, b) { return a.ad.localeCompare(b.ad, 'tr') || a.ilce.ad.localeCompare(b.ilce.ad, 'tr'); }));
  function aramaYap() {
    var k = sade(ara.value);
    sonuclar = [];
    if (k.length >= 2) {
      var bas = [], ic = [];
      hepsi.forEach(function (o) {
        var t = o.sade + (o.tur === 'mahalle' ? ' ' + o.ilce.sade : '');
        if (o.sade.indexOf(k) === 0) bas.push(o);
        else if (o.sade.indexOf(' ' + k) >= 0 || t.indexOf(k) >= 0) ic.push(o);
      });
      sonuclar = bas.concat(ic).slice(0, 30);
    }
    etkin = sonuclar.length ? 0 : -1;
    listeCiz(k.length >= 2);
  }
  function listeCiz(goster) {
    if (!goster) { sonucEl.hidden = true; ara.setAttribute('aria-expanded', 'false'); return; }
    var h = '';
    if (!sonuclar.length) h = '<li class="bos" role="option" aria-disabled="true">Bu adla bir ilçe ya da mahalle bulamadık.</li>';
    sonuclar.forEach(function (o, i) {
      h += '<li role="option" id="ara-s' + i + '" data-i="' + i + '" aria-selected="' + (i === etkin) + '">' + kacis(o.ad) +
        ' <span class="tur">· ' + (o.tur === 'ilce' ? 'ilçe' : kacis(o.ilce.ad)) + '</span></li>';
    });
    sonucEl.innerHTML = h;
    sonucEl.hidden = false;
    ara.setAttribute('aria-expanded', 'true');
    if (etkin >= 0) { ara.setAttribute('aria-activedescendant', 'ara-s' + etkin); var e = $('ara-s' + etkin); if (e && e.scrollIntoView) e.scrollIntoView({ block: 'nearest' }); }
    else ara.removeAttribute('aria-activedescendant');
  }
  function aramaSec(i) {
    var o = sonuclar[i]; if (!o) return;
    ara.value = o.tur === 'ilce' ? o.ad : o.ad + ' · ' + o.ilce.ad;
    sonucEl.hidden = true; ara.setAttribute('aria-expanded', 'false');
    if (o.tur === 'mahalle' && KATMAN[katman].ilce) katmanSec('hasar');
    sec(o, { yakin: true, kaydir: true });
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
    if (KATMAN[katman].ilce) {
      var ii = el.getAttribute('data-ilce');
      if (!ii && el.getAttribute('data-mah')) ii = mahById[el.getAttribute('data-mah')].i;
      return ii ? ilceById[ii] : null;
    }
    var mi = el.getAttribute('data-mah');
    return mi ? mahById[mi] : null;
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
    b.textContent = o.tur === 'ilce' ? o.ad : o.ad + ' · ' + o.ilce.ad;
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
        if (o) sec(o);
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

  $('uyari-kapat').addEventListener('click', function () { $('uyari').hidden = true; });
  if (gomulu) $('tam-sayfa').hidden = false;

  /* ---------- başlangıç ---------- */
  function adrestenSec() {
    var q = {};
    location.search.replace(/^\?/, '').split('&').forEach(function (p) {
      var i = p.indexOf('='); if (i > 0) q[decodeURIComponent(p.slice(0, i))] = decodeURIComponent(p.slice(i + 1));
    });
    if (q.katman && KATMAN[q.katman]) katman = q.katman;
    Array.prototype.forEach.call(document.querySelectorAll('.katmanlar button'), function (b) {
      b.setAttribute('aria-checked', b.getAttribute('data-katman') === katman ? 'true' : 'false');
    });
    boya();
    if (q.mahalle && mahById[q.mahalle]) {
      if (KATMAN[katman].ilce) { katman = 'hasar'; katmanSec('hasar'); }
      sec(mahById[q.mahalle], { yakin: true, hemen: true });
    } else if (q.ilce && ilceById[q.ilce]) sec(ilceById[q.ilce], { yakin: true, hemen: true });
    else bosKart();
  }
  adrestenSec();
  cizHemen();
})();
