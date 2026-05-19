# Honeywell Kurulum Notları

Bu doküman Melisa Bebe terminal uygulamasının Honeywell Android el terminalinde Expo Go ile test edilmesi ve ileriki APK kurulumuna hazırlanması için kullanılır.

## Gerekenler

- Windows geliştirme bilgisayarı
- Honeywell Android el terminali
- Expo Go uygulaması
- Bilgisayar ve terminal için aynı Wi-Fi ağı veya uygun tünel erişimi
- Node.js ve proje bağımlılıkları

## Expo Go ile Test

```powershell
cd C:\Users\User\Documents\GitHub\melisa-terminal-app
npm install
npm run start:lan
```

Expo QR kodu Honeywell terminalde Expo Go ile okutulur. Aynı ağda bağlantı kurulamazsa tünel denenir:

```powershell
npm run start:tunnel
```

## APK Hazırlık Mantığı

Bu sürümde gerçek APK build zorunlu değildir ve EAS bağımlılığı eklenmemiştir. APK aşamasına geçildiğinde Android paket adı `com.melisabebe.terminal` olarak kullanılmak üzere app config içinde hazırlanmıştır. Uygulama adı `Melisa Bebe Terminal` olarak görünmelidir.

APK hazırlığında beklenen sıra:

1. Sürümü `package.json` ve app config ile uyumlu artır.
2. `npm run typecheck` çalıştır.
3. Honeywell Expo Go testini tamamla.
4. Kurumun seçtiği Android build hattıyla APK üret.
5. APK dosyasını terminale aktar.
6. Cihaz politikasına uygun şekilde bilinmeyen kaynaklardan yüklemeye izin ver.
7. Kurulum sonrası kontrol listesini uygula.

## Honeywell Cihazda Kurulum Kontrol Listesi

- Uygulama adı doğru görünüyor mu?
- Sağ üst versiyon etiketi beklenen sürümü gösteriyor mu?
- Giriş ekranı status bar altında düzgün duruyor mu?
- Ana menü alt sistem tuşlarına taşmıyor mu?
- Android geri tuşu ana ekranda çift basışla çıkış davranışını koruyor mu?
- Yeni Fiş ekranında barkod okutma inputa düşüyor mu?
- Ürün eklendikten sonra input yeniden odaklanıyor mu?
- QR Albüm ekranında güvenli bağlantı ve ürün kartları görünüyor mu?
- Mesajlar ekranında acil mesaj uyarısı okunuyor mu?
- Ayarlar ekranında titreşim tercihi kaydediliyor mu?

## Sık Hata Durumları

- QR kod okunuyor ama uygulama açılmıyorsa bilgisayar ve terminal aynı ağda olmayabilir.
- LAN çalışmıyorsa `npm run start:tunnel` ile tünel bağlantısı denenmelidir.
- Metro cache eski görünüyorsa `npx expo start -c` çalıştırılmalıdır.
- APK kurulumu engelleniyorsa Honeywell cihaz güvenlik politikası ve bilinmeyen kaynak izni kontrol edilmelidir.
- Barkod okutma inputa düşmüyorsa scanner-wedge klavye modu ve aktif input odağı kontrol edilmelidir.

## Wi-Fi ve Ağ Notları

LAN testinde bilgisayar IP adresi terminal tarafından erişilebilir olmalıdır. Kurumsal Wi-Fi istemcileri birbirinden izole ediyorsa Expo tünel modu daha güvenilir olabilir.

## Versiyon Etiketi Kontrolü

Uygulamanın sağ üstünde `vX.Y.Z` formatında versiyon görünür. Bu değer GitHub'daki `package.json` version alanıyla uyumlu olmalıdır.

## Barkod Scanner-Wedge Test Notları

- Yeni Fiş ekranında önce müşteri seçilir.
- Fiş başlatılır.
- Barkod/QR alanı aktif kalmalıdır.
- Okutulan kod inputa düşmeli ve Enter/Submit ile ürün eklenmelidir.
- Aynı kod çok hızlı iki kez okutulursa ikinci okutma engellenmelidir.
- Ürün eklendikten sonra input temizlenip yeni okutmaya hazır kalmalıdır.
