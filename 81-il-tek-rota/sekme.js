/* Kafa Haritası · 81 İl, Tek Rota · sekmeler
   Tam sayfada iki bölüm alt alta durur. Bölüm sayfasına gömülüyken (Wix iFrame, 1060 px sabit) ikisi sığmaz;
   o zaman üstte iki sekme çıkar, "Kendi ilinden başla" açık gelir. Eski bağlantılar (?il=, ?katman=) kurallı turu açar. */
(function () {
  'use strict';
  var gomulu = document.documentElement.classList.contains('gomulu');
  var sekmeler = document.querySelectorAll('.sekmeler [role="tab"]');
  function ac(id, olay) {
    Array.prototype.forEach.call(sekmeler, function (s) {
      var bu = s.getAttribute('aria-controls') === id;
      s.setAttribute('aria-selected', bu ? 'true' : 'false');
      s.tabIndex = bu ? 0 : -1;
      var p = document.getElementById(s.getAttribute('aria-controls'));
      if (gomulu) p.hidden = !bu;
    });
    // Gizliyken çizilen harita ölçülerini yeniden hesaplasın
    if (olay) window.dispatchEvent(new Event('resize'));
  }
  if (!gomulu) return;
  var eski = /[?&](il|katman)=/.test(location.search);
  ac(eski ? 'tur' : 'kendi', false);
  Array.prototype.forEach.call(sekmeler, function (s, i) {
    s.addEventListener('click', function () { ac(s.getAttribute('aria-controls'), true); });
    s.addEventListener('keydown', function (e) {
      var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      var n = sekmeler[(i + d + sekmeler.length) % sekmeler.length];
      n.focus(); ac(n.getAttribute('aria-controls'), true);
    });
  });
})();
