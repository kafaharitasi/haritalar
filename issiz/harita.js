/* Kafa Haritası · Her ilin en ıssız noktası (Bölüm 05)
   Veri: veri.js (Kafa Haritası hesabı; OSM/geoBoundaries; Natural Earth). Dış istek yok. */
(function () {
  'use strict';

  var V = window.KH_ISSIZ;
  var NS = 'http://www.w3.org/2000/svg';
  var W = V.W, H = V.H, MINW = W / 28;
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
  var KATLAMA = { 'ç': 'c', 'ğ': 'g', 'ı': 'i', 'ö': 'o', 'ş': 's', 'ü': 'u', 'â': 'a', 'î': 'i', 'û': 'u' };
  function sade(s) {
    return String(s).trim().toLocaleLowerCase('tr').replace(/[çğıöşüâîû]/g, function (c) { return KATLAMA[c]; });
  }
  function slug(s) { return sade(s).replace(/[^a-z0-9]+/g, '-'); }
  function d4(x) { return x.toFixed(4); }
  function koordMetin(n) { return d4(n.lat) + ', ' + d4(n.lon); }
  function derece(n) { return d4(n.lat).replace('.', ',') + '° K · ' + d4(n.lon).replace('.', ',') + '° D'; }
  function ilceMetin(n) { return n.ilce + ' ilçesi'; }

  /* ---------- sabit katmanlar ---------- */
  [0.75, 0.45, 0.22].forEach(function (op, i) { yap('path', { d: V.water[i], opacity: op }, $('k-su')); });
  $('komsular').setAttribute('d', V.neighbors);
  $('komsu-ek').setAttribute('d', V.komsuEk); // OSM il sınırı ile Natural Earth komşu ülke arasındaki boşluk
  $('goller').setAttribute('d', V.lakes);
  $('izgara').setAttribute('d', V.grat);

  var ilYol = {};
  V.iller.forEach(function (il) {
    // kara: kalın kıyı çizgisi altta, dolgu üstte; böylece yalnız dış kenar (kıyı ve kara sınırı) görünür
    yap('path', { d: il.d }, $('kara-kiyi'));
    yap('path', { d: il.d }, $('kara'));
    yap('path', { d: il.d }, $('iller'));
    ilYol[il.ad] = il;
  });

  var yazilar = [];
  function yazi(x, y, metin, px, renk, aralik, ebeveyn, kalin, anchor) {
    var t = yap('text', { x: x, y: y, fill: renk, 'text-anchor': anchor || 'middle', stroke: '#EFE6D2', 'stroke-linejoin': 'round', 'paint-order': 'stroke' }, ebeveyn || $('yazilar'));
    if (kalin) t.setAttribute('font-weight', '800');
    t.textContent = metin;
    var o = { el: t, x: x, y: y, px: px, aralik: aralik || 0, hale: true };
    yazilar.push(o);
    return o;
  }
  V.seas.forEach(function (s) { yazi(s[0], s[1], s[2], 11, '#586062', 3.4).el.removeAttribute('stroke'); });
  V.gratLabels.forEach(function (g) { yazi(g[0], g[1], g[2], 10, '#5A5244', 0.5); });

  /* ---------- noktalar ---------- */
  var noktalar = V.noktalar.slice().sort(function (a, b) { return a.il.localeCompare(b.il, 'tr'); });
  noktalar.forEach(function (n, i) {
    n.i = i;
    n.sade = sade(n.il);
    n.slug = slug(n.il);
    n.el = yap('circle', { cx: n.x, cy: n.y, r: 2 }, $('noktalar'));
    n.ad = yazi(n.x, n.y, n.il, 11.5, '#171717', 0, $('adlar'), true, 'start');
  });
  var noktaKatman = $('noktalar');

  // seçim işareti
  var secimG = yap('g', {}, $('secim'));
  [[18, 0.9], [28, 0.5], [40, 0.22]].forEach(function (r) {
    yap('circle', { r: r[0], fill: 'none', stroke: '#9C3A23', 'stroke-width': 1.6, opacity: r[1] }, secimG);
  });
  yap('circle', { r: 7, fill: '#9C3A23', stroke: '#171717', 'stroke-width': 1.4 }, secimG);
  secimG.style.display = 'none';
  var secimAd = yazi(0, 0, '', 15, '#171717', 0, $('secim'), true, 'start');
  secimAd.el.style.display = 'none';

  /* ---------- görünüm (viewBox) ---------- */
  var vb = { x: 0, y: 0, w: W, h: H };
  function sinirla(v) {
    var w = Math.min(Math.max(v.w, MINW), W), h = w * H / W;
    return { x: Math.min(Math.max(v.x, 0), W - w), y: Math.min(Math.max(v.y, 0), H - h), w: w, h: h };
  }
  function pxBirim() { return vb.w / Math.max(cerceve.clientWidth, 1); }
  var secili = null, uzerinde = null;

  var cizimBekliyor = false;
  function ciz() {
    if (cizimBekliyor) return;
    cizimBekliyor = true;
    requestAnimationFrame(function () { cizimBekliyor = false; cizHemen(); });
  }
  function cizHemen() {
    svg.setAttribute('viewBox', vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h);
    var s = pxBirim(), genis = cerceve.clientWidth;
    var dar = Math.min(Math.max(genis / 820, 0.72), 1);
    var r = (3.6 * dar + Math.min(Math.log(W / vb.w) * 0.9, 2.4)) * s;
    noktalar.forEach(function (n) { n.el.setAttribute('r', r.toFixed(3)); });
    noktaKatman.setAttribute('stroke-width', '1');
    var adli = vb.w < W / 2.6;
    svg.classList.toggle('adli', adli);
    yazilar.forEach(function (o) {
      var px = o.px * dar;
      o.el.setAttribute('font-size', (px * s).toFixed(3));
      o.el.setAttribute('letter-spacing', (o.aralik * s).toFixed(3));
      if (o.hale) o.el.setAttribute('stroke-width', (3 * s).toFixed(3));
    });
    noktalar.forEach(function (n) {
      n.ad.el.setAttribute('x', (n.x + r + 3 * s).toFixed(3));
      n.ad.el.setAttribute('y', (n.y + 4 * s).toFixed(3));
    });
    if (secili) {
      var k = s * Math.min(Math.max(genis / 760, 0.62), 1);
      secimG.setAttribute('transform', 'translate(' + secili.x + ' ' + secili.y + ') scale(' + k.toFixed(4) + ')');
      secimAd.el.setAttribute('font-size', (15 * dar * s).toFixed(3));
      secimAd.el.setAttribute('stroke-width', (3.5 * s).toFixed(3));
      secimAd.el.setAttribute('x', (secili.x + 12 * k).toFixed(3));
      secimAd.el.setAttribute('y', (secili.y - 10 * s).toFixed(3));
    }
    if (uzerinde) balonKonum(uzerinde);
    // ölçek çubuğu
    var kmPx = (V.olcek200 / 200) / s, secenek = [5, 10, 20, 50, 100, 200, 500], km = 200;
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
    var bas = { x: vb.x, y: vb.y, w: vb.w }, t0 = performance.now(), sure = 520;
    // uzaktan yakına geçerken önce ortalayıp sonra yakınlaşan yumuşak geçiş
    function adim(t) {
      var p = Math.min((t - t0) / sure, 1), e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
      var lw = Math.log(bas.w) + (Math.log(hedef.w) - Math.log(bas.w)) * e, w = Math.exp(lw);
      var cx0 = bas.x + bas.w / 2, cy0 = bas.y + bas.w * H / W / 2, cx1 = hedef.x + hedef.w / 2, cy1 = hedef.y + hedef.h / 2;
      var cx = cx0 + (cx1 - cx0) * e, cy = cy0 + (cy1 - cy0) * e;
      vb = sinirla({ x: cx - w / 2, y: cy - w * H / W / 2, w: w });
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
  function ekranNoktasi(x, y) {
    var r = cerceve.getBoundingClientRect(), s = pxBirim();
    return { x: (x - vb.x) / s, y: (y - vb.y) / s, r: r };
  }

  /* ---------- kart ---------- */
  function bosKart() {
    kart.innerHTML =
      '<p class="etiket">81 il</p>' +
      '<h2>Bir il seçin</h2>' +
      '<p>Haritadaki noktalardan birine tıklayın ya da haritanın altındaki kutudan bir il seçin. Harita o ilin en ıssız noktasına gider; koordinatı burada görürsünüz.</p>' +
      '<p class="kucuk">Noktalar yaklaşık yerdir (90 m\'lik hesap hücresinin merkezi).</p>';
  }
  function kartYaz(n) {
    var onceki = noktalar[(n.i + noktalar.length - 1) % noktalar.length];
    var sonraki = noktalar[(n.i + 1) % noktalar.length];
    var osm = 'https://www.openstreetmap.org/?mlat=' + d4(n.lat) + '&mlon=' + d4(n.lon) + '#map=13/' + d4(n.lat) + '/' + d4(n.lon);
    kart.innerHTML =
      '<p class="etiket">' + kacis(n.p) + ' · ilin en ıssız noktası</p>' +
      '<h2>' + kacis(n.il) + '</h2>' +
      '<p>' + kacis(ilceMetin(n)) + '</p>' +
      '<dl class="bilgi"><dt>En yakın insana yürüme</dt><dd>' + kacis(n.sure) + '</dd>' +
        '<dt>81 il içinde sırası</dt><dd>' + n.sira + '.</dd>' +
        '<dt>Arazi</dt><dd>' + kacis(n.arazi) + '</dd>' +
        (n.koruma ? '<dt>Koruma alanı</dt><dd>' + kacis(n.koruma) + '</dd>' : '') + '</dl>' +
      (n.not ? '<p class="kucuk">' + kacis(n.not) + '</p>' : '') +
      '<p class="koord">' + kacis(koordMetin(n)) + '</p>' +
      '<p class="kucuk">' + kacis(derece(n)) + ' · yaklaşık yer</p>' +
      '<div class="eylem">' +
        '<button type="button" class="dugme" id="kopyala">Koordinatı kopyala</button>' +
        '<a href="' + kacis(osm) + '" target="_blank" rel="noopener">OpenStreetMap\'te aç ↗</a>' +
      '</div>' +
      '<div class="gezin">' +
        '<button type="button" data-i="' + onceki.i + '">← ' + kacis(onceki.il) + '</button>' +
        '<button type="button" data-i="' + sonraki.i + '">' + kacis(sonraki.il) + ' →</button>' +
      '</div>';
    $('kopyala').addEventListener('click', function () {
      var b = this, metin = koordMetin(n);
      function tamam() { b.textContent = 'Kopyalandı'; setTimeout(function () { b.textContent = 'Koordinatı kopyala'; }, 1600); }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(metin).then(tamam, function () { ipucu(metin, 3000); });
      } else ipucu(metin, 3000);
    });
    Array.prototype.forEach.call(kart.querySelectorAll('.gezin button'), function (b) {
      b.addEventListener('click', function () { sec(noktalar[+b.getAttribute('data-i')], { odak: false }); });
    });
  }

  /* ---------- seçim ---------- */
  var satirlar = [];
  function sec(n, o) {
    o = o || {};
    secili = n;
    var il = ilYol[n.il];
    $('il-secili').setAttribute('d', il ? il.d : '');
    secimG.style.display = '';
    secimAd.el.textContent = n.il;
    secimAd.el.style.display = '';
    noktaKatman.appendChild(n.el); // üste al
    noktalar.forEach(function (x) { x.ad.el.style.display = x === n ? 'none' : ''; });
    // görünüm: noktayı ortala, ilin tamamı görünsün
    var w = MINW * 2.2;
    if (il) {
      var b = il.b, dx = Math.max(n.x - b[0], b[2] - n.x), dy = Math.max(n.y - b[1], b[3] - n.y);
      w = Math.max(dx * 2 * 1.15, dy * 2 * 1.15 * W / H, MINW * 2.2);
      w = Math.min(w, W / 2.2);
    }
    git({ x: n.x - w / 2, y: n.y - w * H / W / 2, w: w }, o.hemen);
    kartYaz(n);
    satirlar.forEach(function (s) { s.btn.setAttribute('aria-current', s.n === n ? 'true' : 'false'); });
    secKutu.value = n.slug;
    tamSayfa.href = './#' + n.slug;
    if (history.replaceState) history.replaceState(null, '', '#' + n.slug);
    if (o.kaydir) {
      var r = cerceve.getBoundingClientRect();
      if (r.top < 0 || r.bottom > window.innerHeight) {
        $('sekil').scrollIntoView({ behavior: azHareket ? 'auto' : 'smooth', block: 'start' });
      }
    }
    if (o.odak) cerceve.focus({ preventScroll: true });
  }
  function temizle() {
    secili = null;
    $('il-secili').setAttribute('d', '');
    secimG.style.display = 'none';
    secimAd.el.style.display = 'none';
    noktalar.forEach(function (x) { x.ad.el.style.display = ''; });
    satirlar.forEach(function (s) { s.btn.setAttribute('aria-current', 'false'); });
    secKutu.value = '';
    tamSayfa.href = './';
    bosKart();
    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search);
  }

  /* ---------- il seçme kutusu (haritanın altında, kapalı açılır liste) ---------- */
  var secKutu = $('il-sec'), tamSayfa = $('tam-sayfa');
  noktalar.forEach(function (n) {
    var op = document.createElement('option');
    op.value = n.slug;
    op.textContent = n.il;
    secKutu.appendChild(op);
  });
  secKutu.addEventListener('change', function () {
    var v = secKutu.value;
    var n = v && noktalar.filter(function (x) { return x.slug === v; })[0];
    if (n) sec(n);
    else { temizle(); git({ x: 0, y: 0, w: W }); }
  });
  if (document.documentElement.classList.contains('gomulu')) tamSayfa.hidden = false;

  /* ---------- liste (varsayılan kapalı) ---------- */
  var ol = $('il-liste');
  noktalar.forEach(function (n) {
    var li = document.createElement('li');
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'il-satir';
    b.setAttribute('aria-current', 'false');
    b.innerHTML = '<span class="ad">' + kacis(n.il) + '</span>' +
      '<span class="ilce">' + kacis(n.ilce) + ' · ' + kacis(n.sure) + '</span>' +
      '<span class="koord">' + kacis(koordMetin(n)) + '</span>';
    b.addEventListener('click', function () { sec(n, { kaydir: true }); });
    li.appendChild(b);
    ol.appendChild(li);
    satirlar.push({ n: n, li: li, btn: b });
  });
  var ara = $('il-ara');
  ara.addEventListener('input', function () {
    var k = sade(ara.value), gorunen = 0;
    satirlar.forEach(function (s) {
      var g = !k || s.n.sade.indexOf(k) >= 0;
      s.li.hidden = !g;
      if (g) gorunen++;
    });
    $('bos').hidden = gorunen > 0;
  });
  ara.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    var ilk = satirlar.filter(function (s) { return !s.li.hidden; })[0];
    if (ilk) sec(ilk.n, { kaydir: true });
  });

  /* ---------- harita etkileşimi ---------- */
  function enYakin(cx, cy, tolPx) {
    var p = haritaNoktasi(cx, cy), s = pxBirim(), en = null, enD = Infinity;
    noktalar.forEach(function (n) {
      var d = Math.hypot(n.x - p.x, n.y - p.y) / s;
      if (d < enD) { enD = d; en = n; }
    });
    return enD <= tolPx ? en : null;
  }
  function balonKonum(n) {
    var e = ekranNoktasi(n.x, n.y), b = $('balon');
    b.style.left = e.x + 'px';
    b.style.top = e.y + 'px';
  }
  function balonGoster(n) {
    if (uzerinde === n) return;
    if (uzerinde) uzerinde.el.classList.remove('uzerinde');
    uzerinde = n;
    var b = $('balon');
    if (!n) { b.hidden = true; return; }
    n.el.classList.add('uzerinde');
    b.textContent = n.il + ' · ' + n.ilce;
    b.hidden = false;
    balonKonum(n);
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
    if (e.pointerType === 'mouse' || cerceve.classList.contains('yakin') || isaretci.size === 2) {
      try { cerceve.setPointerCapture(e.pointerId); } catch (_) {}
    }
  });
  cerceve.addEventListener('pointermove', function (e) {
    if (!isaretci.has(e.pointerId)) {
      if (e.pointerType === 'mouse') {
        var n = enYakin(e.clientX, e.clientY, 9);
        cerceve.classList.toggle('uzerinde', !!n);
        balonGoster(n);
      }
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
        balonGoster(null);
        vb = sinirla({ x: bas.vb.x - dx * s1, y: bas.vb.y - dy * s1, w: bas.vb.w });
        ciz();
      }
    }
  });
  cerceve.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') balonGoster(null); });
  function tikla(cx, cy, dokunma) {
    var n = enYakin(cx, cy, dokunma ? 18 : 10);
    if (n) sec(n);
  }
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
    else if (k === 'Escape') { temizle(); git({ x: 0, y: 0, w: W }); }
    else return;
    e.preventDefault();
  });

  $('yak').addEventListener('click', function () { yakinlas(1.8); });
  $('uzak').addEventListener('click', function () { yakinlas(1 / 1.8); });
  $('sifirla').addEventListener('click', function () { temizle(); git({ x: 0, y: 0, w: W }); });
  window.addEventListener('resize', ciz);

  /* ---------- başlangıç ---------- */
  function hashtenSec() {
    var h = decodeURIComponent((location.hash || '').slice(1));
    if (!h) return false;
    var n = noktalar.filter(function (x) { return x.slug === slug(h); })[0];
    if (n) { sec(n, { hemen: true }); return true; }
    return false;
  }
  if (!hashtenSec()) { bosKart(); cizHemen(); }
  window.addEventListener('hashchange', hashtenSec);
})();
