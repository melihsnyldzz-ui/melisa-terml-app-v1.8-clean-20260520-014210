# Melisa Bebe Mini ERP v1 Iskeleti

Bu repo artik uc parcali MVP iskeleti tasir:

- `backend/`: Node.js, Express, Prisma ve PostgreSQL API.
- `web-admin/`: React + Vite sade admin paneli.
- kok Expo uygulamasi: Android el terminali, offline satis kuyrugu ve barkod input akisi.

## Backend modulleri

- `products`: stok karti CRUD ve aktif/pasif yaklasimi.
- `customers`: musteri karti CRUD ve bakiye alani.
- `suppliers`: tedarikci karti CRUD ve bakiye alani.
- `purchase-receipts`: urun giris fisi; stok artisi, tedarikci bakiye artisi ve stock movement kaydi.
- `sales-receipts`: satis fisi; stok dususu, musteri bakiye artisi ve stock movement kaydi.
- `terminal`: terminal bootstrap verisi ve local UUID ile idempotent satis senkron endpointi.

## Stok kurali

`products.quantity` dogrudan ekran operasyonuyla degistirilmez. Stok degisimi purchase/sales receipt transactionlari icinde yapilir ve her satir icin `stock_movements` kaydi olusur.

## Offline terminal kurali

Terminal satisi once local kuyruga `localUuid` ile kaydeder. Merkez endpointi ayni `localUuid` ikinci kez gelirse yeni fis acmaz. Bu fazda kuyruk katmani AsyncStorage uzerindedir; SQLite adaptoru sonraki fazda ayni storage API altina takilacak sekilde ayrilmistir.
