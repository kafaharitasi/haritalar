/* Kafa Haritası · rıza onaylı YouTube oynatıcı
   Kullanım: video/?v=<11 karakterlik YouTube kimliği>[&t=<saniye>]
   "Videoyu oynat"a basılana kadar YouTube'a hiçbir istek gitmez. Basınca youtube-nocookie.com yüklenir. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var ps = new URLSearchParams(location.search);
  var v = ps.get('v') || '';
  var t = parseInt(ps.get('t') || '0', 10);
  var gecerli = /^[A-Za-z0-9_-]{11}$/.test(v);
  var oynat = $('oynat');

  if (!gecerli) {
    oynat.hidden = true;
    var p = document.createElement('p');
    p.className = 'hata';
    p.textContent = 'Bu bağlantıda geçerli bir video kimliği yok.';
    document.querySelector('.ortu').insertBefore(p, $('bilgi'));
    return;
  }

  var izle = 'https://www.youtube.com/watch?v=' + v + (t > 0 ? '&t=' + t + 's' : '');
  $('yt-link').href = izle;

  // kapak: depodaki video/kapak/<kimlik>.jpg varsa o, yoksa marka zemini
  var kapak = $('kapak');
  kapak.addEventListener('load', function () { kapak.hidden = false; $('yedek').hidden = true; });
  kapak.addEventListener('error', function () { kapak.remove(); });
  kapak.src = 'kapak/' + v + '.jpg';

  oynat.addEventListener('click', function () {
    var q = 'autoplay=1&rel=0&playsinline=1' + (t > 0 ? '&start=' + t : '');
    var f = document.createElement('iframe');
    f.src = 'https://www.youtube-nocookie.com/embed/' + v + '?' + q;
    f.title = 'YouTube video oynatıcısı';
    f.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; fullscreen');
    f.setAttribute('allowfullscreen', '');
    f.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    f.style.border = '0';
    var kutu = $('oynatici');
    kutu.textContent = '';
    kutu.appendChild(f);
    f.focus();
  });
})();
