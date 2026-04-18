# Kunlik Zavod Hisobi

Nuxt 3, TypeScript va Tailwind CSS asosidagi kunlik zavod hisob-kitob tizimi.

## Asosiy sahifalar

- `Dashboard` - bugungi kirim, sotuv, foyda va trendlar
- `Tez Kiritish` - bugungi yozuvlarni 1 joydan tez qo'shish
- `Kunlik Hisob` - zavod bo'yicha kunlik sarf, qop va tannarx yozuvi
- `Tosh Kirimi` - Howo yoki Kamazda kelgan tosh kirimi
- `Sotuvlar` - klientga qoplik yoki rasipnoy sotuvlar
- `Qarzdorlar` - ochiq qarzdor klientlar va to'lov kiritish
- `Chiqimlar` - kunlik qo'shimcha chiqimlar va default sarf sozlamalari
- `Hisobotlar` - sana oralig'i bo'yicha kesim va export
- `Klientlar` - klientlar bo'yicha umumiy aylanish

## Biznes mantiqi

- 2 ta zavod: `Oybek`, `Jamshid`
- Sotuv narxi har safar qo'lda kiritiladi
- Har bir sotuvda `to'langan summa` va `qarz qoldiq` yuritiladi
- Default tannarx komponentlari:
  - `Qum`
  - `Mel`
  - `Ishchi`
  - `Ortib berish`
  - `Ovqat`
  - `Ish boshqaruvchi`
  - `Svet`
  - `Tosh`
  - `Qop`
- Yuk turlari:
  - `qoplik`
  - `rasipnoy`
- Kirim mashinalari:
  - `Howo`
  - `Kamaz`

## Login

- login foydalanuvchilari local auth source ichida saqlanadi
- deploy oldidan credentiallarni alohida tekshirib chiqing

## Tuzilma

- `components/` - reusable UI komponentlar
- `composables/useFactoryAccounting.ts` - barcha hisoblash va CRUD logika
- `data/mock/` - mock JSON ma'lumotlar
- `pages/` - asosiy ishchi sahifalar
- `types/` - TypeScript modellar

## Ishga tushirish

```bash
yarn install
yarn dev
```

## Qo'shimcha buyruqlar

```bash
yarn typecheck
yarn build
yarn preview
```

## Telegram

Telegram orqali yuborish funksiyasi o‘chirildi.

## Deploy

Bu loyiha endi `SQLite` bilan server tomonda saqlaydi. Shuning uchun deploy qilganda `persistent volume` kerak bo'ladi.

Asosiy runtime fayllar:
- [Dockerfile](/Users/ilhomabdiroziqov/Documents/New%20project/Dockerfile)
- [docker-compose.yml](/Users/ilhomabdiroziqov/Documents/New%20project/docker-compose.yml)
- [health.get.ts](/Users/ilhomabdiroziqov/Documents/New%20project/server/api/health.get.ts)

Saqlanish joyi:
- container ichida: `/data/accounting-state.sqlite`
- backup: `/data/accounting-state.json`

### VPS orqali

```bash
docker compose up -d --build
```

Keyin `3000` portni domain yoki reverse proxy bilan internetga ochasiz.

### Auto Deploy

Repo ichida GitHub Actions workflow bor:

- [deploy.yml](/Users/ilhomabdiroziqov/Documents/New%20project/.github/workflows/deploy.yml)
- [deploy.sh](/Users/ilhomabdiroziqov/Documents/New%20project/deploy/vps/deploy.sh)

`main` branchga `push` bo'lganda VPS ga avtomatik deploy qilish uchun GitHub repository secrets qo'ying:

- `HOST`
- `USERNAME`
- `PORT`
- `SSH_KEY`

Serverdagi `/opt/ming-bir-hazina/.env` saqlanib qoladi va workflow uni ustidan yozmaydi.

To'liq VPS yo'riqnoma:
- [DEPLOY.md](/Users/ilhomabdiroziqov/Documents/New%20project/deploy/vps/DEPLOY.md)
- [deploy/vps/docker-compose.yml](/Users/ilhomabdiroziqov/Documents/New%20project/deploy/vps/docker-compose.yml)
- [nginx-ming-bir-hazina.conf](/Users/ilhomabdiroziqov/Documents/New%20project/deploy/vps/nginx-ming-bir-hazina.conf)

### Railway yoki Render

- `Dockerfile` bilan deploy qiling
- `persistent volume / disk` ulang
- mount path sifatida `/data` bering

Muhim:
- bu loyiha `SQLite` yozadi
- shuning uchun `serverless` va `ephemeral filesystem` bo'lgan joyga qo'yish noto'g'ri
- bitta doimiy instance va bitta persistent disk kerak

### Mavjud datani ko'chirish

Agar lokal datani ham olib chiqmoqchi bo'lsangiz:
- [accounting-state.sqlite](/Users/ilhomabdiroziqov/Documents/New%20project/data/storage/accounting-state.sqlite)
ni serverdagi `/data/accounting-state.sqlite` ichiga bir marta ko'chirasiz.

## Backup

VPS uchun tayyor scriptlar:

- [backup-sqlite.sh](/Users/ilhomabdiroziqov/Documents/New%20project/deploy/vps/backup-sqlite.sh)
- [restore-sqlite.sh](/Users/ilhomabdiroziqov/Documents/New%20project/deploy/vps/restore-sqlite.sh)

Misol:

```bash
chmod +x deploy/vps/backup-sqlite.sh deploy/vps/restore-sqlite.sh
./deploy/vps/backup-sqlite.sh /opt/ming-bir-hazina/backups /var/lib/docker/volumes/ming_bir_hazina_data/_data 30
```

Bu:

- SQLite backup oladi
- JSON backupni ham nusxalaydi
- backupni `30 kun` saqlaydi
- undan eskilarini o'chiradi
