# v0.6.4 Mock Terminal Test Plan

## Amaç

Bu test planı, gerçek Honeywell cihaz bağlantısı olmadan terminal uygulamasındaki mock ve prova akışlarını kontrol etmek için hazırlandı.

## Kapsam

- Yeni Fiş müşteri arama ve müşteri seçimi
- Yeni Fiş ürün satırı kompakt görünümü
- Açık Fişler arama ve durum filtresi
- QR Albüm aktif fiş temel uyum kontrolü
- Fiyat bilgisinin gösterilmemesi kuralı

## Test 1: Yeni Fiş müşteri arama

1. Yeni Fiş ekranı açılır.
2. Müşteri alanına `mi` yazılır.
3. Mini Kids gibi eşleşen müşteri önerileri görünmelidir.
4. Müşteri seçilince seçili müşteri kartı görünmelidir.
5. Fiş başlatılınca müşteri alanı kilitlenmelidir.

Beklenen sonuç: Müşteri seçimi net, okunur ve kilitli görünür.

## Test 2: Barkod ve ürün satırları

1. Müşteri seçilip fiş başlatılır.
2. Hızlı kodlardan `MB-1001` seçilir veya barkod alanına yazılır.
3. Ürün fişe eklenir.
4. Ürün listesinde kalem ve adet özeti görünür.
5. Artır, azalt ve sil aksiyonları kompakt kalır.

Beklenen sonuç: Ürün satırları Honeywell ekranında daha az yer kaplar.

## Test 3: Açık Fişler arama ve filtre

1. Açık Fişler ekranı açılır.
2. Arama alanına fiş no veya müşteri adı yazılır.
3. Sonuçlar aramaya göre daralmalıdır.
4. Durum filtreleri ile Açık, Beklemede ve Hatalı kayıtlar ayrışmalıdır.

Beklenen sonuç: Fiş listesi hızlı bulunur ve riskli fişler görünür kalır.

## Test 4: QR Albüm temel kontrol

1. Aktif fişe ürün eklendikten sonra QR Albüm ekranı açılır.
2. Fiş müşteri adı, fiş no, ürün kalemi ve toplam adet görünmelidir.
3. WhatsApp mesaj önizlemesi görünmelidir.
4. Fiyat bilgisi hiçbir yerde görünmemelidir.

Beklenen sonuç: QR Albüm müşteri vitrini mantığı korunur.

## Not

Bu plan mock/prova ekran kontrolü içindir. Gerçek cihaz, Expo preview veya barkod scanner focus testi ayrıca lokal ortam gerektirir.
