/* Kafa Haritası · Türkiye'nin En Karanlık Yeri · harita (27 Kasım 2026)
   Konum yalnız bu sayfada kullanılır; hiçbir yere gönderilmez (connect-src yalnız bu site). */
(function () {
  'use strict';
  var V = window.KH_KARANLIK;
  var VIDEO_ID = 'ncYDa2vlsfw';
  var SINIR = { guney: 35.75, kuzey: 42.2, bati: 25.6, dogu: 45.0 };
  var IZ = { kuzey: 42.2, bati: 25.6, adim: 0.01, gen: 1940, yuk: 645 };
  var gomulu = document.documentElement.classList.contains('gomulu');
  var $ = function (id) { return document.getElementById(id); };
  var kart = $('kart');

  /* ---------- yardımcılar ---------- */
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function slug(s) {
    return s.toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/i̇/g, 'i').replace(/ö/g, 'o')
      .replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function virgul(x, n) { return x.toFixed(n).replace('.', ','); }
  function koordYazi(lat, lon) { return virgul(lat, 4) + ' K · ' + virgul(lon, 4) + ' D'; }
  function koordKopya(lat, lon) { return lat.toFixed(4) + ', ' + lon.toFixed(4); }
  function km(x) { return x < 0.5 ? '1 km’den yakın' : '~' + Math.max(1, Math.round(x)) + ' km'; }
  function hav(a, b, c, d) {
    var r = Math.PI / 180, dl = (c - a) * r, dn = (d - b) * r;
    var h = Math.sin(dl / 2) * Math.sin(dl / 2) + Math.cos(a * r) * Math.cos(c * r) * Math.sin(dn / 2) * Math.sin(dn / 2);
    return 2 * 6371 * Math.asin(Math.sqrt(h));
  }
  function yon(a, b, c, d) {
    var r = Math.PI / 180, y = Math.sin((d - b) * r) * Math.cos(c * r);
    var x = Math.cos(a * r) * Math.sin(c * r) - Math.sin(a * r) * Math.cos(c * r) * Math.cos((d - b) * r);
    var t = (Math.atan2(y, x) / r + 360) % 360;
    return ['kuzey', 'kuzeydoğu', 'doğu', 'güneydoğu', 'güney', 'güneybatı', 'batı', 'kuzeybatı'][Math.round(t / 45) % 8];
  }
  function kopyaDugme(lat, lon) {
    return '<span class="koord"><code>' + koordYazi(lat, lon) + '</code><button type="button" class="kopyala" data-k="' + koordKopya(lat, lon) + '">Kopyala</button></span>';
  }

  /* ---------- harita ---------- */
  var tr = L.latLngBounds([SINIR.guney, SINIR.bati], [SINIR.kuzey, SINIR.dogu]);
  var harita = L.map('harita', {
    attributionControl: false, zoomSnap: 0.25, zoomDelta: 0.5, maxZoom: 12,
    maxBounds: tr.pad(0.35), maxBoundsViscosity: 0.8, worldCopyJump: false, tap: true
  });
  function sigdir() { harita.fitBounds(tr, { padding: [4, 4] }); harita.setMinZoom(Math.max(4, harita.getZoom() - 0.5)); }
  sigdir();
  L.imageOverlay('gokyuzu_2026-11-27.webp', tr, { interactive: false, className: 'k-gok' }).addTo(harita);
  L.imageOverlay('kubbe_2026-11-27.png', tr, { interactive: false, className: 'k-kubbe' }).addTo(harita);

  var sinirKatman = L.layerGroup().addTo(harita);
  V.sinir.forEach(function (halkalar) {
    L.polygon(halkalar, { interactive: false, fill: false, color: '#171717', weight: 0.7, opacity: 0.55, smoothFactor: 1 }).addTo(sinirKatman);
  });
  var secimKatman = L.layerGroup().addTo(harita);
  var aramaKatman = L.layerGroup().addTo(harita);

  // 81 ilin en karanlık noktası
  var noktaKatman = L.layerGroup().addTo(harita);
  var noktalar = {};
  var kucuk = window.matchMedia('(max-width: 600px)').matches;
  var R0 = kucuk ? 3 : 4, R1 = kucuk ? 6 : 7;
  V.iller.forEach(function (x) {
    var m = L.circleMarker(x.n, { radius: R0, weight: 1.4, color: '#171717', fillColor: '#E0A515', fillOpacity: 1, bubblingMouseEvents: false });
    m.bindTooltip(x.il, { className: 'il-ad', direction: 'right', offset: [6, 0] });
    m.on('click', function () { ilSec(x.il, true); });
    m.addTo(noktaKatman);
    noktalar[x.il] = m;
  });

  /* ---------- veri ızgarası (Samanyolu sınıfı, kısıt, il) ---------- */
  var izR = null, izG = null, aday = null, izHazir = null;
  function izgaraYukle() {
    if (izHazir) return izHazir;
    izHazir = fetch('izgara_2026-11-27.png').then(function (r) { return r.blob(); })
      .then(function (b) { return createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }); })
      .then(function (bmp) {
        var c = document.createElement('canvas'); c.width = IZ.gen; c.height = IZ.yuk;
        var x = c.getContext('2d', { willReadFrequently: true, colorSpace: 'srgb' });
        x.drawImage(bmp, 0, 0);
        var d = x.getImageData(0, 0, IZ.gen, IZ.yuk).data, n = IZ.gen * IZ.yuk;
        izR = new Uint8Array(n); izG = new Uint8Array(n);
        var liste = [];
        for (var i = 0, j = 0; i < n; i++, j += 4) {
          izR[i] = d[j]; izG[i] = d[j + 1];
          // Samanyolu görünür (3) ya da belirgin (4); askerî alan (1) ve askerî tampon (4) hiçbir zaman hedef değil
          if (d[j] >= 3 && (d[j + 1] & 5) === 0) liste.push(i);
        }
        aday = new Int32Array(liste);
      });
    return izHazir;
  }
  function hucre(lat, lon) {
    var i = Math.floor((IZ.kuzey - lat) / IZ.adim), j = Math.floor((lon - IZ.bati) / IZ.adim);
    if (i < 0 || j < 0 || i >= IZ.yuk || j >= IZ.gen) return -1;
    return i * IZ.gen + j;
  }
  function enYakin(lat, lon) {
    var cs = Math.cos(lat * Math.PI / 180), en = Infinity, ei = -1;
    for (var k = 0; k < aday.length; k++) {
      var idx = aday[k], i = (idx / IZ.gen) | 0, j = idx - i * IZ.gen;
      var la = IZ.kuzey - (i + 0.5) * IZ.adim, lo = IZ.bati + (j + 0.5) * IZ.adim;
      var dy = la - lat, dx = (lo - lon) * cs, d2 = dx * dx + dy * dy;
      if (d2 < en) { en = d2; ei = idx; }
    }
    var ii = (ei / IZ.gen) | 0, jj = ei - ii * IZ.gen;
    var hl = IZ.kuzey - (ii + 0.5) * IZ.adim, hn = IZ.bati + (jj + 0.5) * IZ.adim;
    return { lat: hl, lon: hn, km: hav(lat, lon, hl, hn) };
  }

  /* ---------- size en yakın yer ---------- */
  function ara(lat, lon, kaynak) {
    secimTemizle();
    aramaKatman.clearLayers();
    var ici = tr.contains([lat, lon]);
    if (!ici) {
      kart.innerHTML = '<p class="ust">Size en yakın yer</p><h3>' + (kaynak === 'konum' ? 'Konumunuz bu haritanın dışında' : 'Haritanın dışında') + '</h3>' +
        '<p class="soluk">Bu harita yalnız Türkiye’yi kapsıyor. Türkiye’de bir yere dokunun.</p>';
      return;
    }
    kart.innerHTML = '<p class="ust">Size en yakın yer</p><p class="soluk">Hesaplanıyor…</p>';
    izgaraYukle().then(function () {
      var h = hucre(lat, lon);
      var burada = h >= 0 && izR[h] >= 3 && (izG[h] & 5) === 0;
      var basNokta = L.circleMarker([lat, lon], { radius: 6, weight: 2, color: '#171717', fillColor: '#EFE6D2', fillOpacity: 1, interactive: false }).addTo(aramaKatman);
      var ne = kaynak === 'konum' ? 'Konumunuz' : 'Dokunduğunuz yer';
      if (burada) {
        kart.innerHTML = '<p class="ust">' + ne + '</p><h3>Hesabımıza göre burada Samanyolu görünür</h3>' +
          '<p>Burası eşiğin karanlık tarafında. Samanyolu burada sönük olabilir; ışıktan uzaklaştıkça belirginleşir.</p>' +
          '<p class="uyari">Açık ve aysız bir gece seçin. Gece yollarında dikkatli olun; dağ yollarına yalnız ve hazırlıksız çıkmayın.</p>';
        return;
      }
      var s = enYakin(lat, lon);
      var cizgi = L.polyline([[lat, lon], [s.lat, s.lon]], { color: '#E0A515', weight: 2.4, dashArray: '6 6', interactive: false }).addTo(aramaKatman);
      L.circleMarker([s.lat, s.lon], { radius: 8, weight: 3, color: '#E0A515', fill: true, fillColor: '#171717', fillOpacity: 1, interactive: false })
        .bindTooltip(km(s.km), { permanent: true, className: 'mesafe', direction: 'top', offset: [0, -8] }).addTo(aramaKatman);
      kart.innerHTML = '<p class="ust">' + (kaynak === 'konum' ? 'Konumunuzdan' : 'Dokunduğunuz yerden') + ' Samanyolu’nun göründüğü en yakın yer</p>' +
        '<p class="buyuk">' + km(s.km) + '<small>kuş uçuşu, ' + yon(lat, lon, s.lat, s.lon) + ' yönünde</small></p>' +
        '<p>' + kopyaDugme(s.lat, s.lon) + '</p>' +
        '<p class="soluk">Hesabımıza göre. Yaklaşık 1 km’lik kareler üzerinden; askerî alanlar hedef olarak gösterilmez.</p>' +
        '<p class="uyari">Gece yollarında dikkatli olun. Dağ yollarına yalnız ve hazırlıksız çıkmayın. Askerî alanlara ve özel mülke girmeyin.</p>';
      var b = L.latLngBounds([[lat, lon], [s.lat, s.lon]]);
      harita.fitBounds(b.pad(0.8), { maxZoom: 9 });
    }).catch(function () {
      kart.innerHTML = '<p class="ust">Size en yakın yer</p><p>Harita verisi yüklenemedi. Sayfayı yenileyip tekrar deneyin.</p>';
    });
  }
  harita.on('click', function (e) { ara(e.latlng.lat, e.latlng.lng, 'dokunma'); });

  var konumDug = $('konum');
  konumDug.addEventListener('click', function () {
    if (!navigator.geolocation) { konumHata(); return; }
    konumDug.setAttribute('aria-busy', 'true');
    navigator.geolocation.getCurrentPosition(function (p) {
      konumDug.removeAttribute('aria-busy');
      ara(p.coords.latitude, p.coords.longitude, 'konum');
    }, function () { konumDug.removeAttribute('aria-busy'); konumHata(); }, { enableHighAccuracy: false, timeout: 15000, maximumAge: 600000 });
  });
  function konumHata() {
    kart.innerHTML = '<p class="ust">Konumunuz</p><h3>Konumunuz alınamadı</h3>' +
      '<p>Haritada bulunduğunuz yere dokunabilirsiniz; sonuç aynı.</p>' +
      (gomulu ? '<p class="soluk">Bu sayfa başka bir sayfanın içinde açıkken konum izni çalışmayabilir. <a href="./" target="_blank" rel="noopener">Tam sayfada açın</a>.</p>' : '<p class="soluk">Tarayıcınızın konum iznini kontrol edin.</p>');
  }

  /* ---------- il kartı ---------- */
  var ilBul = {}; V.iller.forEach(function (x) { ilBul[x.il] = x; ilBul[slug(x.il)] = x; });
  var secili = null;
  function secimTemizle() {
    secimKatman.clearLayers();
    if (secili && noktalar[secili]) noktalar[secili].setStyle({ radius: R0 });
    secili = null;
    $('il-sec').value = '';
    Array.prototype.forEach.call(document.querySelectorAll('.liste tr.secili'), function (t) { t.classList.remove('secili'); });
  }
  function ilSec(ad, odak) {
    var x = ilBul[ad]; if (!x) return;
    aramaKatman.clearLayers();
    secimTemizle();
    secili = x.il;
    $('il-sec').value = x.il;
    var tr0 = document.querySelector('.liste tr[data-il="' + x.il + '"]'); if (tr0) tr0.classList.add('secili');
    var y = x.y;
    L.polyline(x.yol, { color: '#171717', weight: 5.5, opacity: 0.9, interactive: false }).addTo(secimKatman);
    L.polyline(x.yol, { color: '#E0A515', weight: 2.8, interactive: false }).addTo(secimKatman);
    L.circleMarker(x.m, { radius: 5.5, weight: 2, color: '#171717', fillColor: '#EFE6D2', fillOpacity: 1, interactive: false })
      .bindTooltip(x.il + ' merkezi', { className: 'il-ad', direction: 'left', offset: [-7, 0] }).addTo(secimKatman);
    L.circleMarker(x.kh, { radius: 6, weight: 2.6, color: '#E0A515', fill: true, fillColor: '#171717', fillOpacity: 1, interactive: false })
      .bindTooltip(y.kus_ucusu, { permanent: true, className: 'mesafe', direction: 'top', offset: [0, -7] }).addTo(secimKatman);
    noktalar[x.il].setStyle({ radius: R1 }).bringToFront();
    var oran = y.oran === '1,0' ? 'Munzur kadar karanlık' : 'Munzur’dan ' + y.oran + ' kat parlak';
    var notlar = (x.notlar || []).map(function (n) { return '<p class="not">' + esc(n) + '</p>'; }).join('');
    kart.innerHTML = '<p class="ust">' + x.s + '. sırada · 81 il</p><h3>' + esc(x.il) + '</h3><ul>' +
      '<li><b>En karanlık noktası:</b> ' + oran + ' · Bortle ' + y.bortle + '<br>' + kopyaDugme(x.n[0], x.n[1]) + '</li>' +
      '<li><b>Samanyolu için:</b> il merkezinden kuş uçuşu ' + y.kus_ucusu + ' (' + y.kus_ucusu_aralik + '), yolla ' + y.yol + ' (' + y.yol_aralik + ')</li>' +
      '<li><b>Açık gece:</b> ' + y.acik_gece + '</li>' +
      '<li><b>Samanyolu’nu evinden göremeyen nüfus:</b> ' + y.nufus + '</li></ul>' + notlar +
      '<p class="soluk aciklama">Haritada hardal çizgi: il merkezinden Samanyolu’nun göründüğü en yakın yere giden yol.</p>' +
      '<p class="uyari">Gece yollarında dikkatli olun. Dağ yollarına yalnız ve hazırlıksız çıkmayın.</p>' +
      '<div class="kart-dug"><button type="button" data-git="nokta">En karanlık noktaya git</button><button type="button" data-git="merkez">Merkeze ve yola git</button></div>';
    kart.dataset.il = x.il;
    if (odak) {
      var b = L.latLngBounds([x.m, x.kh, x.n]); x.yol.forEach(function (p) { b.extend(p); });
      harita.fitBounds(b.pad(0.35), { maxZoom: 10 });
    }
    try { history.replaceState(null, '', '#il=' + slug(x.il)); } catch (e) { /* yok */ }
  }

  kart.addEventListener('click', function (e) {
    var k = e.target.closest('.kopyala');
    if (k) {
      var t = k.getAttribute('data-k');
      var ok = function () { k.textContent = 'Kopyalandı'; setTimeout(function () { k.textContent = 'Kopyala'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, function () { secYazi(k); });
      else secYazi(k);
      return;
    }
    var g = e.target.closest('[data-git]');
    if (g && kart.dataset.il) {
      var x = ilBul[kart.dataset.il];
      if (g.getAttribute('data-git') === 'nokta') harita.setView(x.n, 10);
      else { var b = L.latLngBounds([x.m, x.kh]); x.yol.forEach(function (p) { b.extend(p); }); harita.fitBounds(b.pad(0.25), { maxZoom: 11 }); }
    }
  });
  function secYazi(k) {
    var c = k.previousElementSibling; var r = document.createRange(); r.selectNodeContents(c);
    var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
  }

  /* ---------- il seçme kutusu ve liste ---------- */
  var sec = $('il-sec');
  V.iller.slice().sort(function (a, b) { return a.il.localeCompare(b.il, 'tr'); }).forEach(function (x) {
    var o = document.createElement('option'); o.value = x.il; o.textContent = x.il; sec.appendChild(o);
  });
  sec.addEventListener('change', function () { if (sec.value) ilSec(sec.value, true); else { secimTemizle(); bosKart(); } });

  var tb = $('liste');
  V.iller.forEach(function (x) {
    var t = document.createElement('tr'); t.dataset.il = x.il; t.tabIndex = 0;
    t.innerHTML = '<td class="s">' + x.s + '</td><td>' + esc(x.il) + '</td><td class="n">' + x.y.oran + '</td><td class="n">' + x.y.bortle + '</td><td class="n">' + x.y.kus_ucusu + '</td>';
    t.addEventListener('click', function () { ilSec(x.il, true); $('harita').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    t.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); t.click(); } });
    tb.appendChild(t);
  });

  /* ---------- en karanlık 10 bölge ---------- */
  var bl = $('bolgeler');
  V.bolgeler.forEach(function (b) {
    var li = document.createElement('li');
    var yer = b.yer ? 'En yakın yerleşim ' + esc(b.yer) + ', ~' + b.yerkm + ' km · en yakın insana yürüyerek ~' + b.saat + ' saat ' + b.dk + ' dakika' : '';
    li.innerHTML = '<button type="button" class="bolge"><span class="no">' + b.g + '</span><span class="ad">' + esc(b.ad) + '</span>' +
      '<span class="il">' + esc(b.iller.join(', ')) + '</span>' +
      '<span class="say">' + (b.oran === '1,0' ? 'Munzur kadar karanlık' : 'Munzur’dan ' + b.oran + ' kat parlak') + ' · Bortle ' + b.bortle + ' · yılda ~' + b.gece + ' açık gece</span>' +
      (yer ? '<span class="say">' + yer + '</span>' : '') + (b.notlar ? '<span class="il">' + esc(b.notlar) + '</span>' : '') + '</button>';
    li.firstChild.addEventListener('click', function () {
      secimTemizle(); aramaKatman.clearLayers();
      L.circleMarker(b.n, { radius: 9, weight: 3, color: '#E0A515', fill: true, fillColor: '#171717', fillOpacity: 1, interactive: false })
        .bindTooltip(b.g + '. ' + b.ad.split(' (')[0], { permanent: true, className: 'mesafe', direction: 'top', offset: [0, -9] }).addTo(aramaKatman);
      harita.setView(b.n, 9);
      kart.innerHTML = '<p class="ust">En karanlık 10 bölge · ' + b.g + '. sırada</p><h3>' + esc(b.ad) + '</h3><ul>' +
        '<li>' + esc(b.iller.join(', ')) + '</li>' +
        '<li>' + (b.oran === '1,0' ? 'Munzur kadar karanlık' : 'Munzur’dan ' + b.oran + ' kat parlak') + ' · Bortle ' + b.bortle + '</li>' +
        '<li>Yılda ~' + b.gece + ' açık gece</li>' + (yer ? '<li>' + yer + '</li>' : '') +
        '<li>En karanlık noktası: ' + kopyaDugme(b.n[0], b.n[1]) + '</li></ul>' + (b.notlar ? '<p class="not">' + esc(b.notlar) + '</p>' : '') +
        '<p class="uyari">Bu bir gezi önerisi değil. Dağ yollarına yalnız ve hazırlıksız çıkmayın.</p>';
      delete kart.dataset.il;
      $('harita').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    bl.appendChild(li);
  });

  /* ---------- başlangıç ---------- */
  function bosKart() {
    kart.innerHTML = '<p class="ust">Size en yakın yer</p><h3>Haritada bir yere dokunun ya da konumunuzu kullanın</h3>' +
      '<p>Samanyolu’nun göründüğü en yakın yeri ve kuş uçuşu uzaklığını göstereceğiz. Açık renkli alanlar ışık kubbeleri: orada Samanyolu görünmüyor.</p>' +
      '<p class="soluk">Konumunuz yalnız telefonunuzda ya da bilgisayarınızda kullanılır; hiçbir yere gönderilmez.</p>';
  }
  if (VIDEO_ID) { $('video-link').href = 'https://www.youtube.com/watch?v=' + VIDEO_ID; $('video-bag').hidden = false; }
  function hashOku() {
    var m = /[#&]il=([a-z0-9-]+)/.exec(location.hash) || /[?&]il=([a-z0-9-]+)/.exec(location.search);
    if (m && ilBul[m[1]]) ilSec(ilBul[m[1]].il, true); else if (!secili) bosKart();
  }
  hashOku();
  window.addEventListener('hashchange', hashOku);
  window.addEventListener('resize', function () { harita.invalidateSize(); });
  // ızgarayı boşta önceden yükle
  setTimeout(function () { izgaraYukle(); }, 1200);
})();
