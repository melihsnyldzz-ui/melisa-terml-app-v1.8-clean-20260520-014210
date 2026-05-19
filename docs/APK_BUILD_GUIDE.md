# APK Build Rehberi

Bu dokuman Melisa Bebe Terminal uygulamasini Expo Go testinden Honeywell terminale kurulabilir APK testine tasimak icin hazirlanmistir. Bu asamada EAS bagimliligi eklenmez, EAS kurulumu yapilmaz ve build komutu zorunlu calistirilmaz.

## Expo Go Test Akisi

Expo Go, hizli gelistirme ve Honeywell ekran uyumu kontrolu icin kullanilir. Uygulama Metro sunucusundan calisir ve kod degisiklikleri hizli gorulur.

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm run start:lan
```

Ag kisiti varsa tunel denenebilir:

```powershell
npm run start:tunnel
```

Expo Go testinde kontrol edilecekler:

- Sag ust versiyon etiketi `package.json` ile uyumlu mu?
- Login, Dashboard ve Yeni Fis ekranlari Honeywell ekrana sigiyor mu?
- Barkod scanner-wedge inputa kod dusuruyor mu?
- Android geri tusu cift basista cikis davranisini koruyor mu?
- Titresim tercihleri acikken onemli islemlerde geri bildirim var mi?

## APK Build'e Gecmeden Once

APK build hazirligi icin su kontroller tamamlanmalidir:

1. `package.json` version ve `app.json` expo.version ayni olmalidir.
2. `app.json` icinde `name`, `slug`, `orientation` ve `android.package` dogrulanmalidir.
3. `npm run typecheck` ve `npm run check` basarili olmalidir.
4. Honeywell Expo Go testi tamamlanmalidir.
5. `docs/RELEASE_CHECKLIST.md` gozden gecirilmelidir.
6. `docs/APK_FIRST_TEST_PLAN.md` ilk APK testi icin hazir tutulmalidir.

Mevcut app config:

- Uygulama adi: `Melisa Bebe Terminal`
- Slug: `melisa-terminal-app`
- Android package: `com.melisabebe.terminal`
- Orientation: `portrait`

## Build Oncesi Ortam Kontrolu

APK build veya EAS hazirligina gecmeden once lokal ortam kontrolu yapilmalidir:

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm install
npm run check
npm run doctor
```

Kontrol edilecekler:

- `package.json` version ve `app.json` expo.version ayni mi?
- `app.json` icinde Android package `com.melisabebe.terminal` olarak duruyor mu?
- Uygulama adi `Melisa Bebe Terminal` olarak korunuyor mu?
- Expo Go ile son Honeywell testi yapildi mi?
- `docs/BUILD_ENVIRONMENT_CHECK.md` uzerindeki karar listesi tamamlandi mi?

EAS kurulumu gerekiyorsa bu is ayri bir adimda ve ayrica onaylanarak yapilmalidir. Bu rehber EAS hazirlanmadan build komutu calistirilmasini onermez.

## EAS Preview APK Profili

`eas.json` eklendi ve ilk Honeywell test APK'si icin `preview` profili Android APK uretecek sekilde hazirlandi. Production profili ileride AAB/app-bundle stratejisi icin ayrica tutulur.

EAS login, proje baglantisi ve gerekli hesap hazirliklari tamamlandiktan sonra manuel onayla calistirilacak ilk build komutu:

```powershell
npm run prebuild:check
npx eas build -p android --profile preview
```

Bu komutlar dokumantasyon amaclidir; bu hazirlik surumunde otomatik calistirilmaz. EAS hazirligi icin karar notlari `docs/EAS_DECISION.md` dosyasindadir.

## EAS Build Kullanilirsa On Hazirlik

EAS Build tercih edilirse once EAS CLI, Expo hesabi, proje baglantisi ve build profilleri ayrica hazirlanmalidir. Bu repo su an EAS dependency veya EAS build scripti icermez.

EAS hazirlandiktan sonra tipik komut akisi su sekildedir:

```powershell
npm run check
npx eas build:configure
npx eas build -p android --profile preview
```

Bu komutlar yalnizca EAS kurulumu tamamlandiktan sonra kullanilmalidir. EAS kurulumu yapilmadan build komutunu zorlamak dogru degildir.

## Honeywell Terminalde APK Kurulum Adimlari

1. APK dosyasini Honeywell terminale aktar.
2. Cihaz politikasina gore bilinmeyen kaynaklardan yukleme iznini ac.
3. APK dosyasini kur.
4. Uygulamayi `Melisa Bebe Terminal` adiyla ac.
5. Ilk acilista sag ust versiyon etiketini kontrol et.
6. Login, Dashboard, Yeni Fis, QR Album, Mesajlar, Acik Fisler, Gonderilemeyenler ve Ayarlar ekranlarini sirayla kontrol et.

## Bilinmeyen Kaynak Izni

APK manuel kurulacaksa Honeywell cihazda dosya yoneticisi, tarayici veya aktarim uygulamasi icin bilinmeyen uygulama yukleme izni gerekebilir. Bu izin kurum guvenlik politikasina gore acilmalidir ve test bittikten sonra gerekirse tekrar kapatilmalidir.

## APK Kurulum Sonrasi Ilk Acilis Kontrolu

- Uygulama Expo Go olmadan aciliyor mu?
- Uygulama adi `Melisa Bebe Terminal` olarak gorunuyor mu?
- Sag ust versiyon etiketi beklenen surumu gosteriyor mu?
- Login ekrani status bar ile cakismiyor mu?
- Ana menu alt tus alanina tasmiyor mu?
- Veriler cihazda korunur mesaji profesyonel gorunuyor mu?

## APK Kaldirma / Yeniden Kurma Notlari

- Yeni APK ayni Android package ile kurulursa cihaz mevcut uygulamayi guncelleyebilir.
- Kurulum hatasi alinirsa once eski uygulama kaldirilip tekrar kurulum denenebilir.
- Uygulama kaldirildiginda cihazdaki uygulama verileri de silinebilir; test sonucu buna gore not alinmalidir.
- Yeniden kurulumdan sonra versiyon etiketi ve ilk acilis tekrar kontrol edilmelidir.

## Surum Etiketi Kontrolu

Uygulama versiyonu TerminalHeader sag ustunde `vX.Y.Z` biciminde gorunur. APK testinde bu etiket GitHub'daki `package.json` version ve `app.json` expo.version ile uyumlu olmalidir.

## Barkod Scanner-Wedge Kontrolu

- Yeni Fis ekraninda once musteri secilip fis baslatilir.
- Scanner ile okutulan kod Barkod / QR input alanina dusmelidir.
- Enter/Submit davranisi urunu fise eklemelidir.
- Urun eklendikten sonra input temizlenip yeniden odaklanmalidir.
- Ayni kod 500 ms icinde tekrar okutulursa tekrarli okutma engellenmelidir.

## Geri Tusu Kontrolu

- Alt ekranlarda Honeywell fiziksel geri tusu ana menuye donmelidir.
- Ana ekranda ilk geri tusu uygulamayi kapatmamalidir.
- Ana ekranda 2 saniye icinde ikinci geri tusu uygulamadan cikis yapmalidir.

## Titresim Kontrolu

- Ayarlar ekraninda titresim acik olmalidir.
- Urun ekleme, uyari ve acil mesaj gibi onemli islemlerde titresim geri bildirimi alinmalidir.
- Titresim kapatildiginda geri bildirim sessiz kalmalidir.

## Wi-Fi / Ag Gerekmeyen Durumlar

APK kurulduktan sonra uygulama Expo Go veya Metro sunucusuna bagli olmadan acilir. Mevcut surumde gercek API baglantisi olmadigi icin temel ekran gezintisi, fis taslagi, QR album onizlemesi, mesaj merkezi, ayarlar ve cihaz ici geri bildirimler Wi-Fi olmadan da kontrol edilebilir.

Wi-Fi sadece su durumlarda gerekir:

- APK dosyasini ag uzerinden cihaza aktarmak
- Ileriki fazda gercek API veya senkron baglantilarini test etmek
- Expo Go ile gelistirme testine geri donmek

## Sorun Giderme

- APK kurulmazsa Android package, imza uyumu ve cihaz guvenlik politikasi kontrol edilmelidir.
- Uygulama acilirken kapanirsa build loglari, Expo SDK uyumu ve app config kontrol edilmelidir.
- Scanner inputa dusmuyorsa Honeywell scanner-wedge klavye modu kontrol edilmelidir.
- Versiyon etiketi beklenen surumu gostermiyorsa `package.json` ve `app.json` version degerleri kontrol edilmelidir.
- Geri tusu dogrudan cikis yapiyorsa Android BackHandler davranisi yeniden test edilmelidir.
- Titresim calismiyorsa Ayarlar ekranindaki bildirim/titresim tercihleri kontrol edilmelidir.
