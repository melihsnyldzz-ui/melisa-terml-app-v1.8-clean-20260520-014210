# Melisa Bebe Mini ERP v1

Melisa Bebe icin sade, hizli ve offline kayip riskini azaltan mini ERP iskeleti. Repo su anda uc parcadan olusur: PostgreSQL destekli backend, React/Vite web admin panel ve Expo tabanli Android el terminali.

## Proje Amacı

Bu uygulama personelin saha, depo ve satış işlemlerini hızlı, sade ve güvenli şekilde yapması için hazırlanır. İlk sürüm gerçek Vega / SQL bağlantısı yapmaz; mock data ve local storage ile çalışır.

## Kurulum

```powershell
npm install
npm --prefix backend install
npm --prefix web-admin install
```

Backend icin `backend/.env.example` dosyasini `backend/.env` olarak kopyalayip PostgreSQL `DATABASE_URL` degerini girin.

```powershell
Copy-Item backend\.env.example backend\.env
```

Sonra `backend/.env` icindeki `DATABASE_URL` satirini gercek PostgreSQL kullanici adi, sifre, IP/host ve veritabani adina gore duzenleyin. `.env.example` sadece ornektir; uygulama calisirken `backend/.env` okunur.

`DATABASE_URL` formati:

```text
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
```

Ornekler:

```text
postgresql://postgres:postgres@localhost:5432/melisa_mini_erp?schema=public
postgresql://postgres:postgres@192.168.1.10:5432/melisa_mini_erp?schema=public
```

PostgreSQL hazir olduktan sonra sema ve demo veriyi olusturun:

```powershell
npm --prefix backend run prisma:generate
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed
```

PostgreSQL servisi calismiyorsa veya veritabani yoksa `prisma:migrate` baglanti hatasi verir. Once PostgreSQL servisinin `5432` portunda calistigini ve `melisa_mini_erp` veritabaninin olusturuldugunu kontrol edin.

Seed sonrasi test barkodlari:

| Barkod | Stok kodu | Marka | Cesit | Demo stok | Satis |
| --- | --- | --- | --- | ---: | ---: |
| `8690000001001` | `MB-1001` | Melisa Bebe | Bebek Takim | 24 | 199 |
| `8690000001002` | `MB-1002` | Melisa Bebe | Hastane Cikisi | 18 | 289 |
| `8690000001003` | `MB-1003` | MiniJoy | Tulum | 32 | 159 |
| `8690000001004` | `MB-1004` | BabySoft | Zibin Seti | 40 | 109 |
| `8690000001005` | `MB-1005` | Melisa Kids | Cocuk Elbise | 15 | 249 |

## Çalıştırma

```powershell
npm start
```

Backend:

```powershell
npm run backend:dev
```

Web admin:

```powershell
npm run web-admin:dev
```

Tum TypeScript/build kontrolleri:

```powershell
npm run check:all
```

Prisma sema kontrolu:

```powershell
cd backend
$env:DATABASE_URL="postgresql://postgres:postgres@localhost:5432/melisa_mini_erp?schema=public"
npx prisma validate
```

Backend smoke test:

```powershell
npm --prefix backend run test:smoke
```

Backend farkli bir makine veya portta calisiyorsa:

```powershell
$env:API_BASE_URL="http://192.168.1.xx:4000/api"
npm --prefix backend run test:smoke
```

## Android Cihazda Test

1. Android cihaz ile bilgisayar aynı ağda olmalı.
2. Expo Go uygulaması cihaza kurulmalı.
3. `npm start` sonrası çıkan QR kod Expo Go ile okutulmalı.
4. Fiziksel el terminalinde ekranlar büyük butonlar ve sade akışla kontrol edilmeli.

## Gerçek Honeywell Terminalde Expo Go ile Test

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm run start:lan
```

Honeywell terminal ve bilgisayar aynı ağdaysa Expo Go ile terminalde görünen QR kod okutulur. Ağ kısıtı varsa tünel bağlantısı denenebilir:

```powershell
npm run start:tunnel
```

## Expo Go ile Test

Expo geliştirme sunucusu açıldıktan sonra terminalde görünen QR kod okutulur. Bu sürümde gerçek API, Vega veya SQL bağlantısı yoktur.

## Bilgisayarda Honeywell Cihaz Gibi Önizleme

Expo web ortamında uygulama otomatik olarak Honeywell benzeri koyu antrasit cihaz çerçevesi içinde gösterilir. Bu görünüm sadece bilgisayar/web geliştirme önizlemesi içindir; Android ve iOS tarafında normal uygulama ekranı çalışır.

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm run preview:honeywell
```

## APK Hazırlık ve Honeywell Kurulum

Expo Go test akışı korunur:

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm run start:lan
```

Ağ kısıtı varsa:

```powershell
npm run start:tunnel
```

APK test akışı ileriki fazda EAS veya kurumun seçtiği Android build hattıyla hazırlanacaktır. Bu sürümde EAS bağımlılığı eklenmez ve gerçek APK build zorunlu değildir. Honeywell terminale APK kurulurken cihaz ayarlarında bilinmeyen kaynaklardan uygulama yükleme izni kurum politikasına uygun şekilde açılmalıdır.

Kurulum sonrası kontrol listesi:

- Sağ üst versiyon etiketi `package.json` sürümüyle aynı mı?
- Giriş ekranı safe area içinde mi?
- Android geri tuşu doğrudan uygulamadan çıkarmıyor mu?
- Yeni Fiş ekranında barkod okutma inputa düşüyor mu?
- Ürün ekleme, çift okutma koruması ve silme onayı çalışıyor mu?
- Titreşim açıkken önemli işlemlerde geri bildirim alınıyor mu?
- QR Albüm ekranında ürünler ve güvenli bağlantı görünüyor mu?
- Mesajlar, Gönderilemeyenler ve Ayarlar ekranları alt tuş alanına taşmıyor mu?

Daha ayrıntılı kurulum notları için `docs/HONEYWELL_INSTALLATION.md`, sürüm öncesi kontrol için `docs/RELEASE_CHECKLIST.md` kullanılmalıdır.

## APK Build Hazırlığı

APK aşamasına geçmeden önce uygulama Expo Go ile Honeywell terminalde kontrol edilmelidir:

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm run start:lan
npm run typecheck
```

Expo Go testi tamamlandıktan sonra APK build için kurumun seçtiği Android build hattı kullanılmalıdır. EAS Build tercih edilirse EAS CLI ve hesap/proje kurulumu ayrıca yapılır; bu repoda EAS bağımlılığı veya build scripti zorunlu tutulmaz.

APK kurulumundan sonra Honeywell cihazda şu kontroller yapılmalıdır:

- Uygulama adı `Melisa Bebe Terminal` olarak görünüyor mu?
- Sağ üst versiyon etiketi `package.json` sürümüyle uyumlu mu?
- Giriş, ana menü ve Yeni Fiş ekranları taşmadan açılıyor mu?
- Barkod okutma, titreşim ve Android geri tuşu davranışı doğru mu?
- QR Albüm, Mesajlar, Gönderilemeyenler ve Ayarlar ekranları çalışıyor mu?

Detaylı APK akışı için `docs/APK_BUILD_GUIDE.md` kullanılmalıdır.

## Klasör Yapısı

- `backend/`: Express API, Prisma semasi, fis ve terminal sync endpointleri
- `web-admin/`: React + Vite admin panel iskeleti
- `app/`: Ekranlar ve tema
- `components/`: Ortak buton, kart ve ekran kabuğu
- `services/`: Mock API fonksiyonları
- `storage/`: AsyncStorage yardımcıları
- `types/`: TypeScript tipleri
- `scripts/`: Local kontrol scriptleri
- `docs/`: Teknik notlar

Mini ERP mimari notlari icin `docs/MINI_ERP_ARCHITECTURE.md` dosyasina bakin.

## v0.2 MVP Kapsami

- Backend stok/musteri/tedarikci CRUD endpointleri calisir.
- Alis fisi stok artirir, tedarikci bakiyesini artirir ve stok hareketi yazar.
- Satis fisi stok yeterliyse stok dusurur, musteri bakiyesini artirir ve stok hareketi yazar.
- Terminal sync endpointi `localUuid` ile idempotent calisir; ayni fis tekrar gelirse ikinci kayit acmaz.
- Web admin stok, musteri, tedarikci kartlarini ekleme/duzenleme ve alis/satis fisi kaydetme ekranlari icerir.
- Terminal uygulamasi satisi local UUID ile cihazda saklar ve Gonderilemeyenler ekranindan tekrar gonderebilir.

## v0.3 Terminal Offline Kullanim Notlari

- Terminal offline satis kuyrugu artik SQLite tabanli `melisa_terminal.db` icinde tutulur.
- Eski AsyncStorage API korunur; SQLite baslatilamazsa veri kaybi olmamasi icin AsyncStorage uyumluluk katmani devrede kalir.
- `Veri Guncelle` ekrani `/api/terminal/bootstrap-data` endpointinden urun ve musteri listesini alir, local cache'e yazar.
- Satis ekraninda barkod veya stok kodu once local cache icinde aranir. Urun bulunamazsa fis satiri eklenmez ve kullanici uyarilir.
- Satis tamamlandiginda fis `localUuid`, `terminalId`, `customerId`, urun satirlari, toplam tutar, durum, hata ve tekrar sayisi alanlariyla SQLite kuyruğuna yazilir.
- `Gonderilemeyenler` ekrani SQLite kuyrugundan beslenir. Tek fis veya tum bekleyenler tekrar gonderilebilir.
- Backend duplicate `localUuid` icin ikinci satis fisi acmaz; terminal bu cevabi basarili kabul edip fisi `SYNCED` yapar.

## v0.4 Gercek Cihaz ve Local Ag Test Notlari

Backend health kontrolu:

```powershell
Invoke-WebRequest http://localhost:4000/api/health -UseBasicParsing
```

Health response su alanlari doner:

- `status`
- `databaseConnected`
- `timestamp`
- `appVersion`
- `environment`

Terminal ayarlarinda API adresi local ag IP'si ile girilmelidir. Ornek:

```text
http://192.168.1.10:4000/api
```

Android terminalden `localhost` PC'yi gostermez; `localhost` terminal cihazinin kendisidir. Bu yuzden API adresinde PC'nin local ag IP adresi kullanilmalidir.

PC IP adresini bulmak icin Windows PowerShell:

```powershell
ipconfig
```

Aktif Wi-Fi veya Ethernet adapterinde `IPv4 Address` degeri kullanilir. Ornek adres:

```text
http://192.168.1.xx:4000/api
```

Backend portu varsayilan olarak `4000` portunda calisir. Windows Firewall bu porta local agdan erisime izin vermelidir. Gerekirse Windows Defender Firewall icinde Node.js veya TCP `4000` icin inbound izin verilmelidir.

Manuel saha testi senaryosu:

1. Terminal Ayarlar ekraninda API adresini gir ve `Baglantiyi Kontrol Et` calistir.
2. `Veri Guncelle` ekraninda bootstrap veriyi indir.
3. Android cihazda interneti veya Wi-Fi baglantisini kapat.
4. Satis ekraninda barkodla satis olustur: `8690000001001`.
5. `Gonderilemeyenler` ekraninda fisin `Pending/Bekliyor` oldugunu kontrol et.
6. Wi-Fi baglantisini ac.
7. Fisi gonder.
8. Fisin `SYNCED/Senkronlandi` oldugunu kontrol et.
9. Ayni fisi tekrar gonder.
10. Backend `duplicate=true` donerse terminalin bunu basarili kabul ettigini ve `SYNCED` durumda tuttugunu kontrol et.

Saha Testi ekrani veri yazmaz; API baglanti gecmisi, bootstrap cache sayilari, SQLite durumu ve kuyruk sayilarini gosterir.

## v0.5 Android Terminal Saha Test Rehberi

1. PC'de PostgreSQL'i calistir.
2. `backend/.env` icinde `DATABASE_URL` degerini kontrol et.
3. Migration ve seed komutlarini calistir:

```powershell
npm --prefix backend run prisma:migrate
npm --prefix backend run prisma:seed
```

4. Backend'i local agdan erisilebilir sekilde baslat:

```powershell
npm run backend:dev
```

5. PC IP adresini `ipconfig` ile bul.
6. Android terminalde Ayarlar > API adresi alanina `http://192.168.1.xx:4000/api` yaz.
7. `Baglantiyi Kontrol Et` butonu ile health test yap.
8. `Veri Guncelle` ekraninda bootstrap indir.
9. Saha Testi ekraninda urun ve musteri cache sayilarini kontrol et.
10. Wi-Fi kapat.
11. Satis ekraninda `8690000001001` barkodunu okut veya yaz.
12. Fisi tamamla.
13. Gonderilemeyenler ekraninda fisin `Pending/Bekliyor` oldugunu kontrol et.
14. Wi-Fi ac.
15. Fisi gonder.
16. Fisin `Synced/Senkronlandi` oldugunu kontrol et.
17. Ayni fisi tekrar gondererek duplicate senaryosunu dene.
18. `Bu fis daha once gonderilmis, sistemde kayitli` mesaji basarili duplicate kabuludur.

Web admin dogrulama:

- Dashboard toplam urun, toplam satis, son satis ve bekleyen terminal fisi alanlarini gosterir.
- Satis Fisleri listesinde `Terminal`, `Local UUID` ve `Sync` kolonlari kontrol edilmelidir.

## Audit Notu

`npm audit --omit=dev --json` sonucunda root Expo uygulamasinda `6 moderate` uyari goruldu. High veya critical production dependency vulnerability raporlanmadi. Uyarilar Expo/Metro zinciri, `postcss`, `ws` ve `brace-expansion` transitif paketleriyle ilgilidir. Otomatik `npm audit fix` calistirilmadi; Expo surum yukseltmesi cihaz testiyle birlikte ayrica planlanmalidir.

## v0.7 Para Birimi ve Manuel Kur Notlari

- Desteklenen para birimleri: `TRY`, `USD`, `EUR`.
- Kur manuel yonetilir; otomatik TCMB entegrasyonu yoktur.
- Aktif kur `Kur Yonetimi` ekranindan guncellenir ve backend `/api/exchange-rates` endpointi uzerinden saklanir.
- Fis olusurken aktif kur fis ve fis satirlarina sabitlenir. Kur sonradan degisse bile eski satis/alis fislerinin toplam ve kur bilgisi degismez.
- Musteri veya tedarikci `defaultCurrency` degeri fis para birimini belirler.
- Cari bakiye sadece ilgili para birimi alaninda artar: `balanceTry`, `balanceUsd` veya `balanceEur`.
- Terminal bootstrap verisi urun fiyatlarini, musteri varsayilan para birimini ve aktif kur snapshot'ini indirir.
- Offline terminal fisi `currency` ve `usedExchangeRate` bilgisiyle SQLite kuyruğunda saklanir.
- Terminal sync sirasinda fiyat hesabi backend tarafinda tekrar yapilir; terminalden gelen local fiş ikinci kez gonderilirse `duplicate=true` basarili kabul edilir.

## v0.9 Fis Iptal Notlari

- Satis ve alis fisleri silinmez; iptal edilen fisler `CANCELLED` durumunda saklanir.
- Satis fisi iptalinde stok geri artar, musteri bakiyesi fis para biriminde duser ve `CANCEL` stok hareketi olusur.
- Alis fisi iptalinde stok geri duser, tedarikci bakiyesi fis para biriminde duser ve `CANCEL` stok hareketi olusur.
- Alis iptalinde stok yetersizse iptal engellenir.
- Ayni fis ikinci kez iptal edilemez.
- Iade modulu ayri fazdir; bu surum yalnizca guvenli fis iptal altyapisini kurar.

## v1.0 Canli Kullanim Hazirlik Notlari

- Kullanici/rol modeli hazirlandi: `ADMIN`, `MANAGER`, `STAFF`.
- Seed `admin` kullanicisini olusturur. Gercek sifre commit edilmez; canli ortamda `ADMIN_PASSWORD_HASH` environment degiskeniyle guvenli hash verilmelidir.
- Web admin tarafinda rol hazirligi gorunur durumdadir. Tam login ve oturum yonetimi sonraki fazda sertlestirilecektir.
- Kritik islemler audit log yazar: stok karti olusturma/duzenleme, musteri/tedarikci olusturma/duzenleme, satis/alis fisi olusturma, satis/alis iptal, kur guncelleme.

Canli kullanim oncesi kontrol listesi:

- PostgreSQL servisi calisiyor mu?
- `backend/.env` icindeki `DATABASE_URL` dogru mu?
- Migration uygulandi mi?
- Seed calisti mi?
- Smoke test PASS mi?
- Yedekleme plani var mi?
- Android terminal/API adresi dogru mu? Ornek: `http://192.168.1.xx:4000/api`
- Varsayilan admin hash'i canli ortama uygun sekilde degistirildi mi?

Basit PostgreSQL yedek komutu:

```powershell
pg_dump -U postgres -h localhost -p 5432 -d melisa_mini_erp -F c -f .\backups\melisa_mini_erp_%DATE%.dump
```

Restore notu:

```powershell
pg_restore -U postgres -h localhost -p 5432 -d melisa_mini_erp --clean --if-exists .\backups\melisa_mini_erp_YYYY-AA-GG.dump
```

Otomatik backup bu fazda kurulmaz; canli kullanimdan once gunluk yedekleme zamanlayicisi ayrica planlanmalidir.

## v1.1 Login ve Yetki Notlari

- Web admin artik `/api/auth/login` uzerinden kullanici adi/sifre ile token alir.
- Token `JWT_SECRET` ile imzalanir. Production ortaminda `JWT_SECRET` zorunludur.
- Gelistirme seed varsayilanlari:
  - `admin` kullanicisi icin `ADMIN_PASSWORD` veya `ADMIN_PASSWORD_HASH`
  - `staff` kullanicisi icin `STAFF_PASSWORD` veya `STAFF_PASSWORD_HASH`
- Gercek sifre veya hash commit edilmemelidir; canli ortamda environment degiskenleriyle verilmelidir.
- ADMIN tum islemleri yapabilir.
- MANAGER stok/cari/fis gorur, fis olusturur, fis iptal eder ve kur gunceller.
- STAFF stok/cari gorur ve fis olusturur; fis iptal edemez, kur guncelleyemez.
- Sistem durumu ve audit goruntuleme ADMIN/MANAGER ile sinirlidir.

Guvenli hash uretme ornegi:

```powershell
node -e "require('bcryptjs').hash('CANLI_SIFREYI_BURAYA_YAZ', 10).then(console.log)"
```

Sonucu `ADMIN_PASSWORD_HASH` olarak ortam degiskenine ekleyin. Komut gecmisinde acik sifre kalmamasi icin canli ortamda guvenli parola yonetimi tercih edilmelidir.

## v1.2 Kullanici Yonetimi Notlari

- Kullanici yonetimi yalnizca `ADMIN` rolune aciktir.
- Kullanici silinmez; pasifleştirme `active=false` ile yapilir.
- Yeni kullanici olustururken gecici sifre bcrypt hash olarak saklanir.
- Sifre reset endpointi yeni sifreyi hash olarak kaydeder.
- API response'lari `passwordHash` donmez.
- Kullanici olusturma, duzenleme, pasiflestirme ve sifre reset islemleri audit log'a yazilir.
- Canli ortamda guclu ve benzersiz sifreler kullanilmalidir; gercek sifre veya hash repo'ya commit edilmemelidir.
- Token suresi `JWT_EXPIRES_IN` ile ayarlanabilir. Varsayilan gelistirme degeri `8h`.

## Sürüm Planı

- `v0.1.0`: Login, dashboard, yeni fiş, açık fiş, QR albüm, mesajlar, gönderilemeyenler, veri güncelle ve ayarlar iskeleti
- `v0.2.0`: Kullanıcı dostu terminal deneyimi; TerminalHeader, durum rozetleri, boş durumlar, banner mesajları, adım yönlendirmeleri ve mock aksiyon geri bildirimleri
- `v0.2.1`: Operasyon akışı güçlendirme; aktif fiş taslağı local storage'a kaydedilir, barkod/QR kod inputu ile mock ürün eklenir, ürün kalemleri adet/sil aksiyonlarıyla yönetilir, QR albüm fiş ürünlerine daha bağlı görünür
- `v0.2.2`: Giriş ekranı görsel iyileştirmesi, ana menü görsel iyileştirmesi, teknik ifadelerin UI'dan kaldırılması ve Honeywell preview görünümünün korunması
- `v0.2.4`: Gerçek Honeywell terminal ekranı için spacing, typography, kart, input, buton ve liste yoğunluğu sıkılaştırması
- `v0.2.5`: Honeywell terminal safe area, alt tuş boşluğu ve Android donanım geri tuşu çift basış çıkış düzeltmesi
- `v0.2.6`: Login ekranı ve dashboard ana menü görsel iyileştirme; Honeywell terminal ekranına göre daha premium UI düzeni; safe area davranışı korunmuştur; görünür uygulama versiyonu eklenmiştir
- `v0.3.0`: Gerçekçi fiş akışı, barkod/QR input, ürün satırları, local aktif fiş taslağı ve QR albüm hazırlama aksiyonu
- `v0.3.1`: Aktif fişe bağlı QR albüm, güvenli link önizlemesi, WhatsApp mesaj önizlemesi ve fiyat gösterilmeme kuralı
- `v0.3.2`: Scanner-wedge barkod input odak optimizasyonu, son okutulan ürün alanı, hızlı ürün kodları ve çift okutma koruması
- `v0.3.3`: Ana menü hızlı işlem barı, kompakt bugünkü durum kartları ve iki kolonlu operasyon modülleri
- `v0.3.4`: Honeywell sıkılaştırılmış satış ekranı, son okutulan ürün alanı, çift okutma koruması ve QR albüm aksiyon grid'i
- `v0.3.5`: Premium hızlı ana menü, güçlendirilmiş son aktif fiş kartı ve kompakt operasyon modülleri
- `v0.3.6`: Operasyonel mesaj merkezi, acil mesaj uyarısı, okunmamış rozetleri ve kompakt mesaj detay akışı
- `v0.3.7`: Terminal ayar paneli, depo segment seçimi, API adresi, bağlantı kontrolü ve oturum kapatma akışı
- `v0.3.8`: Profesyonel offline kuyruk ekranı, işlem kartları, tümünü tekrar deneme ve boş kuyruk durumu
- `v0.3.9`: Açık fişler operasyon ekranı, durum filtreleri, kompakt fiş kartları ve hızlı fiş aksiyonları
- `v0.4.0`: Honeywell cihaz kalite turu; ortak safe area, alt tuş boşluğu, kompakt metin ve tutarlı ekran yoğunluğu
- `v0.4.1`: Honeywell okutma deneyimi, son okutulan ürün paneli, çift okutma koruması ve fiş aksiyon güvenliği iyileştirildi
- `v0.4.2`: Uygulama içi titreşim altyapısı, acil mesaj uyarı hissi, bildirim/titreşim ayarları ve ileriki faz push bildirimi hazırlığı
- `v0.4.3`: QR albüm müşteri vitrini, WhatsApp mesaj önizlemesi, ürün görsel kartları ve feedback aksiyonları güçlendirildi
- `v0.4.4`: APK hazırlık dokümantasyonu, Honeywell kurulum notları ve release checklist eklendi
- `v0.5.0`: APK build hazırlığı, APK build rehberi, versiyon uyumu ve Honeywell APK kontrol maddeleri eklendi
- `v0.5.1`: APK öncesi Honeywell kalite turu; safe area, alt tuş boşluğu, kompakt buton/kart düzeni ve UI metin temizliği kontrol edildi
- `v0.5.2`: APK build hattı hazırlığı, APK ilk test planı ve Honeywell APK kurulum sonrası kontrol akışı netleştirildi
- `v0.5.3`: APK build ortam kontrol dokümanı, build öncesi doğrulama adımları ve EAS hazırlık öncesi kontrol eklendi
- `v0.5.4`: EAS karar dokümanı, `eas.json` preview APK profili ve APK build komutu dokümantasyonu eklendi
- `v0.5.5`: EAS CLI/login readiness doğrulandı; APK build manuel onayla başlatılacak
- `v0.5.6`: Yeni Fiş ekranında müşteri arama/autocomplete, seçili müşteri kartı, müşteri kilitleme ve daha kompakt müşteri seçim akışı eklendi
- Sonraki fazlar: gerçek ERP API bağlantısı, offline kuyruk sertleştirme, bildirim/ses/titreşim, QR albüm servis bağlantısı

Uygulama versiyonu TerminalHeader sağ üstünde gösterilir. Honeywell testlerinde ekranda görünen versiyon, GitHub'daki `package.json` version alanıyla uyumlu olmalıdır.
Uygulama içi titreşim geri bildirimi `services/feedback.ts` üzerinden yönetilir; gerçek push notification ileriki fazdadır.

## EAS CLI Durumu

EAS CLI bilgisayarda kontrol edildi ve global `eas` komutu çalışır durumdadır. Expo hesabı ile `eas login` tamamlandı; APK build komutu ayrıca kullanıcı onayıyla çalıştırılmalıdır.

## v0.2 Kullanım Notları

- Ana ekran: `+ Yeni Fiş Başlat` ana aksiyonudur; açık fiş, okunmamış mesaj, gönderilemeyen işlem ve son senkron özeti gösterilir.
- Mesajlar: `Tümü`, `Acil`, `Fiş Notu` ve `Okunmamış` filtreleriyle iş mesajları ayrıştırılır; seçili mesaj mock olarak okundu işaretlenebilir.
- Açık Fişler: Her fişte `Aç`, `QR Albüm` ve `Gönder` mock aksiyonları vardır; durum rozetleri hata riskini görünür yapar.
- QR Albüm: Fiş, müşteri, ürün sayısı ve QR placeholder alanı gösterilir; fiyat bilgisi kesinlikle yer almaz.
- Ayarlar: Terminal bilgisi, bağlantı, senkron ve güvenlik bölümleri ayrıdır; bağlantı testi ve veri güncelleme mock banner verir.

## v0.2.1 Operasyon Akışı

- Aktif fiş: Yeni fiş başlatıldığında taslak local storage'a yazılır ve uygulama tekrar açıldığında mock taslak yüklenir.
- Mock ürün ekleme: `Barkod / QR kod gir` alanına örnek ürün kodu yazılıp `Ekle` seçildiğinde ürün satırı oluşur; fiyat gösterilmez.
- Ürün satırları: Ürün kodu, ad, renk, beden ve adet görünür; `+`, `-` ve `Sil` aksiyonları mock fiş taslağını günceller.
- QR albüm: Fiş no, müşteri, ürün sayısı, güvenli link ve ürün görsel placeholder kartları gösterilir.
- Gönderilemeyenler: Tek işlem veya tüm kuyruk için `Tekrar Dene` mock geri bildirimi verir.

## Kontrol Komutları

```powershell
npm run typecheck
npm run doctor
npm start -- --help
.\scripts\check-terminal.ps1
```

## GitHub Çalışma Düzeni

- `main` varsayılan branch olarak kullanılır.
- Build/test başarılı olmadan commit ve push yapılmaz.
- Mevcut ERP projesi ayrı repodadır; bu projeden ERP dosyaları değiştirilmez.
