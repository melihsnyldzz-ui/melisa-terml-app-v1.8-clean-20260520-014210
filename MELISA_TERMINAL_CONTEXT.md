# Melisa Terminal Context

Firma:
Melisa Bebe Tekstil San. ve Tic. Ltd. Şti.

Ana hedef:
Android el terminallerinde çalışacak, personelin saha/depo/satış işlemlerini hızlı, sade ve güvenli şekilde yapacağı özel bir terminal uygulaması geliştirmek.

Mevcut ERP projesi:
C:\Users\User\Documents\GitHub\melisa-bebe-erp

Terminal uygulaması projesi:
C:\Users\User\Documents\GitHub\melisa-terminal-app

Çalışma modeli:
- ERP ve terminal uygulaması ayrı repolarda duracak.
- Android terminal uygulaması doğrudan SQL Server'a bağlanmayacak.
- İleride ERP API / local server üzerinden Vega / ERP verisiyle konuşacak.
- İlk sürümde gerçek API bağlantısı yapılmayacak.
- İlk sürüm mock data ve local storage ile çalışacak.

Ana modüller:
- Login
- Dashboard
- Yeni Fiş / Satış
- Açık Fişler
- QR Albüm
- Mesajlar
- Gönderilemeyenler
- Veri Güncelle
- Ayarlar

Canlı fiş sistemi:
- Personel müşteri seçer.
- Yeni fiş / satış başlatır.
- Ürünleri ekler veya okutur.
- Fiş açık kalabilir.
- Fiş beklemeye alınabilir.
- Fiş tamamlanabilir.
- Cihaz kapanırsa, internet giderse veya senkron hatası olursa fiş kaybolmaz.
- Gönderilemeyen işlemler ayrı ekranda tutulur.
- Daha sonra tekrar gönderilebilir.

QR ürün albümü sistemi:
- Müşteriye verilen fişe özel QR kod basılır.
- Müşteri QR kodu okutur.
- Sadece kendi aldığı ürünlerin fotoğraflarını görür.
- Fiyat gösterilmez.
- QR albüm canlı olur.
- Fiş açıkken ürün eklendikçe aynı QR linkinin arkasındaki albüm güncellenir.
- Müşteri isterse ürün görsellerini tek tek veya toplu indirebilir.
- WhatsApp ile iletişim butonu olabilir.

Mesajlaşma sistemi:
- Terminal uygulamasında WhatsApp benzeri ama iş odaklı mesaj kutusu olacak.
- Merkez, muhasebe, depo ve personeller birbirine mesaj gönderebilecek.
- Mesajlar kişiye, depoya veya fişe bağlı olabilir.
- Mesaj gelince bildirim, ses ve titreşim olacak.
- Acil mesajlarda farklı ses/titreşim olacak.
- Ana menüde okunmamış mesaj rozeti olacak.

Offline / senkron mantığı:
- Belge kaybolmayacak.
- Açık fişler local saklanacak.
- Gönderilemeyen işlemler saklanacak.
- İnternet gelince tekrar gönderilecek.
- Veri güncelleme sadece ürün/stok verisini yenileyecek, bekleyen belgeleri silmeyecek.
