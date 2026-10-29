# Kafa Haritası · haritalar

[kafaharitasi.com](https://www.kafaharitasi.com) bölüm sayfalarına gömülen etkileşimli haritalar ve rıza onaylı video oynatıcı. GitHub Pages ile yayımlanır.

| Yol | İçerik |
|---|---|
| `deprem/` | Bölüm 1 · Faylar ve depremler (diri fay izleri, 2015–2025 M5,5+ depremler, il arama) |
| `video/?v=<YouTube kimliği>` | Rıza onaylı oynatıcı: YouTube yalnızca "Videoyu oynat"a basılınca yüklenir |
| `ortak/` | Ortak stil ve yazı tipi dosyaları |

Haritaya bağlantı verirken `deprem/?il=Malatya` ya da `deprem/?deprem=us6000jllz` biçimi kullanılabilir.

## Gizlilik

- Sayfalar çerez kullanmaz, tarayıcıda veri saklamaz, analitik ya da reklam kodu içermez.
- Yazı tipi dahil bütün dosyalar bu sunucudan gelir; üçüncü taraf sunuculara istek gitmez.
- Video sayfası, ziyaretçi "Videoyu oynat"a basana kadar YouTube'a bağlanmaz. Basınca `youtube-nocookie.com` adresindeki oynatıcı yüklenir. Bundan sonra YouTube'un kendi gizlilik kuralları geçerlidir.

## Veri ve lisanslar

| Veri | Kaynak | Lisans |
|---|---|---|
| Fay izleri | GEM Global Active Faults Database (Styron ve Pagani 2020), [github.com/GEMScienceTools/gem-global-active-faults](https://github.com/GEMScienceTools/gem-global-active-faults) | CC BY-SA 4.0. `deprem/veri.js` içindeki türetilmiş fay geometrisi de CC BY-SA 4.0 ile sunulur. |
| Depremler | USGS ANSS ComCat, [earthquake.usgs.gov](https://earthquake.usgs.gov/earthquakes/search/) | Kamu malı (ABD hükümeti eseri) |
| Kıyı, ülke sınırları, göller | [Natural Earth](https://www.naturalearthdata.com) 1:10m | Kamu malı |
| İl sınırları | geoBoundaries TUR ADM1, kaynak [OpenStreetMap](https://www.openstreetmap.org/copyright) | © OpenStreetMap katkıcıları, ODbL 1.0. `deprem/veri.js` içindeki türetilmiş il geometrisi de ODbL 1.0 ile sunulur. |
| Pazarcık ve Elbistan depremi notları | AFAD; Karabacak vd. 2023, *Journal of the Geological Society* 180(3), doi:10.1144/jgs2023-020; Softa vd. 2024, *Turkish Journal of Earth Sciences* 33(1), doi:10.55730/1300-0985.1895; İçişleri Bakanlığı | Alıntı ve atıf |
| Yazı tipi | Bricolage Grotesque, © 2022 The Bricolage Grotesque Project Authors | SIL Open Font License 1.1 (`ortak/OFL.txt`) |
| Video kapakları | Kafa Haritası | © Kafa Haritası |

Harita, Lambert konik konform izdüşümle (standart enlemler 36° ve 42°, merkez 39°K 35°D) çizilir. Fay ve il çizgileri ölçek gereği sadeleştirilmiştir.

**Bu harita deprem tehlikesini göstermez ve deprem tahmini yapmaz.** Deprem tehlikesi için [AFAD Türkiye Deprem Tehlike Haritası](https://tdth.afad.gov.tr), diri faylar için [MTA diri fay haritaları](https://www.mta.gov.tr/v3.0/hizmetler/yenilenmis-diri-fay-haritalari).

## Düzeltmeler

Bir hata görürseniz bu depoda bir konu (issue) açabilir ya da kafaharitasi.com üzerinden yazabilirsiniz. Düzeltmeler, ilgili bölüm sayfasındaki düzeltme kaydına işlenir.
