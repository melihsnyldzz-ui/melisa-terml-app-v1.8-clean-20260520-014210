# v0.6.0 Release Notes

## Ana hedef

Terminal uygulamasında Melisa Bebe ERP tarafındaki gibi paketli, hızlı ve GitHub odaklı çalışma modeline geçildi.

## Bu pakette gelenler

- Yeni Fiş ekranı müşteri seçimi ana faz olarak ele alındı.
- Müşteri adı yazıldıkça uygun mock müşteri önerileri listelenir.
- Seçili müşteri ayrı kartta gösterilir.
- Fiş başlatıldıktan sonra müşteri alanı kilitlenir.
- Barkod okutma alanı müşteri seçilip fiş başlatıldıktan sonra aktifleşir.
- Yeni müşteri adıyla fiş başlatma mock akışı korunur.
- Honeywell küçük ekranı için müşteri öneri listesi daha kompakt hale getirildi.

## Sürüm hizalaması

- package.json version: 0.6.0
- app.json expo.version: 0.6.0

## Risk sınırları

- Gerçek ERP, SQL, API, secret veya .env dosyalarına dokunulmadı.
- Bu sürüm mock/prova ekranı seviyesindedir.
- Gerçek cihaz testi yapılmadı.

## Local test ihtiyacı

GitHub üzerinden kod değişikliği yapıldı. Local build/test çalıştırılmadı. Fiziksel Honeywell cihaz, Expo preview veya TypeScript build doğrulaması istenirse Codex/lokal test gerekir.
