/* Sayfa başka bir sitenin içine gömülüyse (ör. kafaharitasi.com bölüm sayfası) sade görünüm */
(function () {
  var g = /[?&]gom=1\b/.test(location.search);
  try { if (window.self !== window.top) g = true; } catch (e) { g = true; }
  if (g) document.documentElement.classList.add('gomulu');
})();
