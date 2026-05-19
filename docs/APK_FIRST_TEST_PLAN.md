# APK Ilk Test Plani

## Amac

Melisa Bebe Terminal APK dosyasinin Honeywell terminalde Expo Go olmadan acildigini, temel operasyon ekranlarinin calistigini ve donanim davranislarinin uygun oldugunu dogrulamak.

## Test Oncesi Hazirlik

- [ ] `package.json` version kontrol edildi.
- [ ] `app.json` expo.version kontrol edildi.
- [ ] `npm run check` basarili.
- [ ] APK dosyasi Honeywell terminale aktarildi.
- [ ] Bilinmeyen kaynaklardan yukleme izni kurum politikasina uygun acildi.
- [ ] Eski kurulum varsa guncelleme veya kaldir/yukle karari verildi.

## Cihaz Bilgileri

- Cihaz modeli:
- Android surumu:
- Honeywell scanner profili:
- Test eden:
- Test tarihi:
- APK surumu:

## Kurulum Adimlari

1. APK dosyasini cihazda ac.
2. Kurulum izinlerini onayla.
3. Uygulamayi `Melisa Bebe Terminal` adiyla baslat.
4. Ilk acilis ve versiyon etiketini kontrol et.

## Ilk Acilis Kontrolu

- [ ] Uygulama Expo Go olmadan acildi.
- [ ] Sag ust versiyon etiketi dogru.
- [ ] Login ekrani status bar ile cakismiyor.
- [ ] Alt tus alanina tasma yok.
- [ ] Uygulama beklenmeyen sekilde kapanmiyor.

## Ekran Testleri

### Login

- [ ] Marka alani okunakli.
- [ ] PIN alani kolay kullaniliyor.
- [ ] Terminale Giris karti tepki veriyor.
- [ ] Cevrimdisi devam akisi calisiyor.

### Dashboard

- [ ] Hizli islem barindaki butonlar gorunuyor.
- [ ] Yeni Fis ana aksiyonu belirgin.
- [ ] Son aktif fis karti dogru gorunuyor.
- [ ] Moduller alt tus alanina tasmiyor.

### Yeni Fis

- [ ] Musteri secilmeden fis baslamiyor.
- [ ] Fis baslatildiktan sonra barkod input odaklaniyor.
- [ ] Urun eklendikten sonra input temizleniyor.
- [ ] Urun adet artirma/azaltma calisiyor.
- [ ] Silme onayi calisiyor.
- [ ] Fiyat bilgisi gorunmuyor.

### QR Album

- [ ] Aktif fise bagli bilgiler gorunuyor.
- [ ] QR karti ve guvenli link gorunuyor.
- [ ] Urun kartlari kompakt gorunuyor.
- [ ] Fiyat bilgisi gorunmuyor.

### Mesajlar

- [ ] Filtreler calisiyor.
- [ ] Acil mesaj vurgusu gorunuyor.
- [ ] Okundu isaretleme calisiyor.

### Acik Fisler

- [ ] Filtreler gorunuyor.
- [ ] Fis kartlari okunakli.
- [ ] Ac, QR Album ve Gonder aksiyonlari tepki veriyor.

### Gonderilemeyenler

- [ ] Bekleyen islem kartlari gorunuyor.
- [ ] Tekrar Dene aksiyonu geri bildirim veriyor.
- [ ] Tumunu Tekrar Dene aksiyonu calisiyor.

### Ayarlar

- [ ] Terminal ID ve depo bilgisi gorunuyor.
- [ ] Baglanti kontrolu geri bildirim veriyor.
- [ ] Titresim tercihleri kaydediliyor.
- [ ] Oturumu kapat akisi calisiyor.

## Donanim Testleri

### Geri Tusu

- [ ] Alt ekranda geri tusu ana menuye donuyor.
- [ ] Ana ekranda ilk geri tusu uyari gosteriyor.
- [ ] Ikinci geri tusu uygulamadan cikiyor.

### Barkod Scanner

- [ ] Scanner-wedge kodu inputa yaziyor.
- [ ] Enter/Submit urun ekliyor.
- [ ] Cift okutma korumasi calisiyor.

### Titresim

- [ ] Basarili islemde kisa titresim var.
- [ ] Uyarida belirgin titresim var.
- [ ] Acil mesajda acil uyarisi hissediliyor.
- [ ] Ayar kapaliyken titresim duruyor.

### Klavye

- [ ] Ekran klavyesi acilinca input gorunur kaliyor.
- [ ] Barkod input odagi korunuyor.
- [ ] PIN alani rahat giriliyor.

## Hata Kayit Sablonu

- Ekran:
- Adim:
- Beklenen:
- Gerceklesen:
- Sik tekrar ediyor mu:
- Not / ekran goruntusu:

## Test Sonucu

- [ ] Basarili
- [ ] Kosullu basarili
- [ ] Basarisiz

Genel not:
