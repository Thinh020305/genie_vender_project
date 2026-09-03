# Docker trong môi trường phát triển

`compose.yaml` của dự án chỉ dùng để chạy PostgreSQL. API NestJS được chạy trên máy host để hỗ trợ hot reload và debug thuận tiện.

```bash
docker compose up -d postgres
docker compose ps
```

Sau khi PostgreSQL ở trạng thái `healthy`, chạy migration, seed và API:

```bash
npx prisma generate
npx prisma migrate deploy
node prisma/seed.mjs
npm run start:dev
```

API mặc định ở `http://localhost:3000/api`, Swagger UI ở `http://localhost:3000/api/docs`.

Xem đầy đủ yêu cầu hệ thống, cấu hình `.env`, tài khoản demo và các bước cài đặt trong [README.md](README.md#bắt-đầu-nhanh).

Để dừng PostgreSQL nhưng vẫn giữ dữ liệu:

```bash
docker compose down
```

Không dùng `docker compose down -v` trừ khi muốn xoá toàn bộ database local.
