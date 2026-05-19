# Build Environment Check

## Amac

APK build veya EAS hazirligina gecmeden once lokal gelistirme ortaminin, proje surumlerinin ve Expo/Android yapilandirmasinin hazir olup olmadigini kontrol etmek.

## Lokal Proje Yolu

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
```

## Node.js Kontrolu

```powershell
node -v
```

Beklenti: Proje dependency'leriyle uyumlu guncel bir Node.js surumu kullanilmalidir. Surum degisikligi gerekirse once ekip standardi netlestirilmelidir.

## npm Kontrolu

```powershell
npm -v
npm install
```

Beklenti: `package-lock.json` korunur ve paket kurulumu hatasiz tamamlanir.

## Git Kontrolu

```powershell
git status
git log --oneline -5
```

Beklenti: Build denemesi oncesinde calisma agaci temiz olmalidir. Commit edilmemis degisiklik varsa once kapsam netlestirilmelidir.

## Expo SDK Kontrolu

```powershell
npx expo --version
```

Beklenti: Proje Expo SDK 54 hattinda calisir. Expo Go testiyle ayni proje yapisi korunmalidir.

## Expo Doctor Kontrolu

```powershell
npm run doctor
```

Beklenti: Kritik hata olmamalidir. Warning cikarsa otomatik duzeltme yapmadan once not alinmali ve etkisi degerlendirilmelidir.

## TypeScript Kontrolu

```powershell
npm run check
```

Beklenti: `tsc --noEmit` hatasiz tamamlanmalidir.

## app.json Kontrolu

Kontrol edilecek alanlar:

- `expo.name`: `Melisa Bebe Terminal`
- `expo.slug`: `melisa-terminal-app`
- `expo.version`: `package.json` version ile ayni
- `expo.orientation`: `portrait`
- `expo.android.package`: `com.melisabebe.terminal`

## Android Package Kontrolu

Android package kalici uygulama kimligidir:

```text
com.melisabebe.terminal
```

APK guncelleme ve yeniden kurulum akisi icin bu deger keyfi degistirilmemelidir.

## EAS Hazir mi?

Bu repo su anda EAS dependency, EAS build scripti veya EAS login durumu varsaymaz. EAS kullanilacaksa ayrica onaylanacak adimlar:

- `npx eas --version` ile CLI erisimi kontrolu
- EAS login durumunun dogrulanmasi
- `eas.json` dosyasinin varligi
- `preview` profilinin Android APK uretmesi
- `production` profilinin preview'dan ayri tutulmasi
- EAS CLI kullanimi
- Expo hesap/proje baglantisi
- Build profilleri
- Android imzalama stratejisi
- Ilk APK build komutunun ne zaman calistirilacagi

EAS hazirlanmadan APK build komutu calistirilmaz.

## Build Oncesi Karar Listesi

- [ ] Expo Go son Honeywell testi tamamlandi mi?
- [ ] `npm run check` basarili mi?
- [ ] `npm run doctor` sonucu incelendi mi?
- [ ] `package.json` ve `app.json` version esit mi?
- [ ] Android package dogru mu?
- [ ] APK ilk test plani hazir mi?
- [ ] `eas.json` kontrol edildi mi?
- [ ] Preview profili Android APK icin hazir mi?
- [ ] EAS kurulumu gerekiyorsa ayrica onaylandi mi?
- [ ] APK build baslatma zamani net mi?

## Eksik Varsa Yapilacaklar

- Version uyumsuzsa `package.json`, `package-lock.json` ve `app.json` ayni surume alinmalidir.
- TypeScript hatasi varsa APK hazirligina gecilmeden duzeltilmelidir.
- Expo Doctor warning verirse rapora yazilmali, gereksiz otomatik fix yapilmamalidir.
- App config yanlissa build komutuna gecilmemelidir.
- Honeywell Expo Go son test yapilmadiysa once `npm run start:lan` ile cihaz kontrolu tamamlanmalidir.

## v0.5.5 EAS CLI Kontrol Notu

- EAS CLI kontrol edildi: `eas-cli/18.11.0 win32-x64 node-v24.15.0`.
- Global `eas` komutu bilgisayarda calisir hale getirildi.
- `eas whoami` sonucu: login tamamlandi.
- Expo hesabi ile EAS oturumu acildi.
- `eas.json` preview profili Android APK icin hazir.
- APK build baslatilmadi.
- Ilk build komutu manuel onayla calistirilmelidir:

```powershell
npx eas build -p android --profile preview
```
