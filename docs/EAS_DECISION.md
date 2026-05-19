# EAS Build Karar Dokumani

## Neden EAS?

EAS Build, Expo projesini Android tarafinda kurulabilir APK veya production icin AAB haline getirmek icin standart ve izlenebilir bir build hattidir. Honeywell terminale kurulacak ilk paket icin hedef, Expo Go disinda calisan kontrollu bir Android APK uretmektir.

## Expo Go ile APK Farki

Expo Go gelistirme ve hizli test icindir. Uygulama Metro sunucusundan calisir ve cihazda Expo Go uygulamasina baglidir.

APK testinde uygulama Android paketi olarak cihaza kurulur. Expo Go gerekmez. Bu nedenle uygulama adi, Android package, versiyon etiketi, geri tusu, scanner-wedge ve titresim davranisi gercek kurulum kosullarinda dogrulanir.

## Ilk Hedef: Android APK Preview Build

Ilk hedef Honeywell terminalde kurulabilir preview APK almaktir. Bu nedenle `eas.json` icinde `preview` profili Android icin `apk` uretecek sekilde hazirlanmistir.

## Production Build Ileride

Production build ileriki fazda ayrica degerlendirilecektir. `production` profili Android icin app bundle mantigina hazir tutulur. Ilk Honeywell saha testinde production build hedeflenmez.

## Build Oncesi Gerekenler

- `package.json` ve `app.json` version ayni olmalidir.
- `npm run prebuild:check` basarili olmalidir.
- Honeywell Expo Go son test tamamlanmalidir.
- `docs/APK_FIRST_TEST_PLAN.md` hazir olmalidir.
- Android package `com.melisabebe.terminal` olarak korunmalidir.

## Expo Hesabi / EAS Login Gerekliligi

EAS Build icin Expo hesabi ve EAS login gerekir. Bu adim bu surumde otomatik yapilmaz. Login ve proje baglantisi ayrica onaylandiktan sonra yapilmalidir.

## Android Package Sabitligi

Android package uygulamanin cihazdaki kimligidir:

```text
com.melisabebe.terminal
```

APK guncelleme ve yeniden kurulum akisi icin bu deger keyfi degistirilmemelidir.

## Versiyon Yonetimi

Her APK hazirlik surumunde su alanlar birlikte guncellenmelidir:

- `package.json` version
- `package-lock.json` version
- `app.json` expo.version

Uygulamadaki sag ust versiyon etiketi `package.json` version alanindan gelir.

## Imzalama / Keystore Notu

Ilk preview APK icin EAS varsayilan Android imzalama akisini yonetebilir. Production veya kurum ici dagitimda keystore sahipligi, yedekleme ve erisim yetkileri ayrica kararlastirilmalidir.

## Riskler

- EAS login veya proje baglantisi eksikse build baslamaz.
- Android package degisirse cihaz uygulamayi farkli bir uygulama gibi gorebilir.
- Version uyumsuzlugu Honeywell testinde yanlis surum izlenmesine yol acar.
- Scanner-wedge davranisi Expo Go ile APK arasinda tekrar test edilmelidir.

## Ilk Build Komutu

EAS hazirligi, login ve proje baglantisi tamamlandiktan sonra manuel onayla calistirilacak komut:

```powershell
npm run prebuild:check
npx eas build -p android --profile preview
```

Bu komut bu surumde otomatik calistirilmaz.

## Build Ciktisi Sonrasi Honeywell Test Akisi

1. APK dosyasini Honeywell terminale aktar.
2. Gerekirse bilinmeyen kaynaklardan yukleme iznini ac.
3. APK'yi kur.
4. Uygulamayi Expo Go olmadan ac.
5. Sag ust versiyon etiketini kontrol et.
6. `docs/APK_FIRST_TEST_PLAN.md` adimlarini uygula.
7. Scanner-wedge, geri tusu ve titresim davranisini not al.
