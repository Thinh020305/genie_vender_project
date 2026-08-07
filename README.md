# Genie Vendor Project

Backend API cho hệ thống quản lý và phân loại nhà cung cấp (vendor), được xây dựng bằng NestJS, TypeScript, Prisma ORM và PostgreSQL.

> **Trạng thái hiện tại:** dự án đang ở giai đoạn khởi tạo nền tảng. API hiện có endpoint kiểm tra hoạt động, mô hình `User`/`Post`, các enum nghiệp vụ vendor và các thành phần dùng chung cho JWT, phân quyền, chuẩn hóa response. Các module nghiệp vụ vendor chưa được triển khai.

---

## Mục lục

- [Tính năng hiện có](#tính-năng-hiện-có)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Biến môi trường](#biến-môi-trường)
- [Cơ sở dữ liệu và Prisma](#cơ-sở-dữ-liệu-và-prisma)
- [Chạy ứng dụng](#chạy-ứng-dụng)
- [API hiện có](#api-hiện-có)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Kiểm thử và chất lượng mã nguồn](#kiểm-thử-và-chất-lượng-mã-nguồn)
- [Docker](#docker)
- [Quy ước phát triển](#quy-ước-phát-triển)
- [Xử lý sự cố](#xử-lý-sự-cố)
- [Giới hạn hiện tại](#giới-hạn-hiện-tại)
- [Giấy phép](#giấy-phép)

---

## Tính năng hiện có

- Khung ứng dụng NestJS 11 với TypeScript.
- Kết nối PostgreSQL qua Prisma 7 và `@prisma/adapter-pg`.
- Prisma schema dạng nhiều file trong `prisma/schema/`.
- Migration cho `User`, `Post` và các enum nghiệp vụ.
- Seed hai tài khoản mẫu.
- Thành phần nền tảng cho xác thực và phân quyền:
  - `JwtAuthGuard`.
  - `RolesGuard`.
  - decorator `@Roles()`, `@Public()` và `@CurrentUser()`.
- Interceptor chuẩn hóa response thành `{ status, message, data }`.
- Exception filter chuẩn hóa lỗi HTTP.
- Unit test và end-to-end test mẫu cho endpoint gốc.

---

## Công nghệ sử dụng

| Thành phần          | Công nghệ                             |
| ------------------- | ------------------------------------- |
| Runtime             | Node.js 24                            |
| Framework           | NestJS 11                             |
| Ngôn ngữ            | TypeScript 5                          |
| Cơ sở dữ liệu       | PostgreSQL 16                         |
| ORM                 | Prisma 7                              |
| PostgreSQL driver   | `pg`, `@prisma/adapter-pg`            |
| Xác thực nền tảng   | Passport, Passport JWT, `@nestjs/jwt` |
| Kiểm thử            | Jest, Supertest                       |
| Chất lượng mã nguồn | ESLint, Prettier                      |
| Đóng gói            | Docker, Docker Compose                |

---

## Yêu cầu hệ thống

Cài đặt các công cụ sau trước khi bắt đầu:

- Node.js 24.x (Dockerfile sử dụng `24.18.0`).
- npm 11.x hoặc phiên bản tương thích với Node.js 24.
- Docker Desktop/Docker Engine có Docker Compose
- Git.

---

## Bắt đầu nhanh

### 1. Lấy mã nguồn và cài dependency

```bash
git clone <repository-url>
cd genie_vendor_project
npm ci
```

### 2. Tạo file môi trường

Tạo `.env` tại thư mục gốc:

```dotenv
PORT=3000

POSTGRES_HOST_PORT=5431
POSTGRES_USER=postgres
POSTGRES_PASSWORD=mysecretpassword
POSTGRES_DB=genie_vendor_project

DATABASE_URL="postgresql://postgres:mysecretpassword@localhost:5431/genie_vendor_project?schema=public"
```

Không commit file `.env` hoặc thông tin bí mật lên Git.

### 3. Khởi động PostgreSQL

```bash
docker compose up -d genie_vendor_postgres
```

Container genie_vendor_postgres được công bố tại `localhost:5431`; cổng bên trong container là `5432`.

Kiểm tra trạng thái:

```bash
docker compose ps
```

### 4. Sinh Prisma Client và chạy migration

```bash
npx prisma generate
npx prisma migrate deploy
```

Trong quá trình phát triển schema, dùng `migrate dev` thay cho `migrate deploy`:

```bash
npx prisma migrate dev --name <ten_migration>
```

### 5. Nạp dữ liệu mẫu (không bắt buộc)

```bash
npx ts-node prisma/seed.ts
```

Seed hiện tạo hai user nếu email chưa tồn tại:

- `admin@example.com`
- `member@example.com`

Do trường `role` có giá trị mặc định, cả hai user hiện được tạo với role `DEVELOPER`.

### 6. Chạy server phát triển

```bash
npm run start:dev
```

Mở `http://localhost:3000`. Kết quả mong đợi:

```text
Hello World!
```

> Trên Windows PowerShell, nếu execution policy chặn `npm.ps1`, hãy dùng `npm.cmd` thay cho `npm`, ví dụ `npm.cmd run start:dev`.

---

## Biến môi trường

| Biến                 | Bắt buộc | Giá trị mẫu                                                                                | Mô tả                                         |
| -------------------- | -------- | ------------------------------------------------------------------------------------------ | --------------------------------------------- |
| `PORT`               | Không    | `3000`                                                                                     | Cổng HTTP của ứng dụng; mặc định là `3000`.   |
| `DATABASE_URL`       | Có       | `postgresql://postgres:mysecretpassword@localhost:5431/genie_vendor_project?schema=public` | Chuỗi kết nối PostgreSQL được Prisma sử dụng. |
| `POSTGRES_HOST_PORT` | Không\*  | `5431`                                                                                     | Cổng PostgreSQL phía máy host.                |
| `POSTGRES_USER`      | Không\*  | `postgres`                                                                                 | Tên người dùng PostgreSQL.                    |
| `POSTGRES_PASSWORD`  | Không\*  | `mysecretpassword`                                                                         | Mật khẩu PostgreSQL.                          |
| `POSTGRES_DB`        | Không\*  | `genie_vendor_project`                                                                     | Tên database.                                 |

\* File `compose.yaml` hiện đang khai báo trực tiếp thông tin PostgreSQL và mapping cổng. Các biến `POSTGRES_\*` trong `.env` chỉ mang tính quy ước cho tới khi Compose được chuyển sang cú pháp `${...}`.

Nếu chạy API trong một container cùng Docker network với PostgreSQL, hostname trong `DATABASE_URL` phải là tên service `postgres` và cổng phải là `5432`, không phải `localhost:5431`:

```dotenv
DATABASE_URL="postgresql://postgres:mysecretpassword@postgres:5432/genie_vendor_project?schema=public"
```

---

## Cơ sở dữ liệu và Prisma

### Mô hình hiện tại

```text
User (1) ──────── (n) Post
```

`User` gồm:

- `id`: khóa chính tự tăng.
- `email`: duy nhất.
- `name`: có thể rỗng.
- `role`: `ADMIN`, `DEVELOPER` hoặc `REVIEWER`; mặc định `DEVELOPER`.
- `posts`: danh sách bài viết liên quan.

`Post` gồm:

- `id`: khóa chính tự tăng.
- `title`: tiêu đề bắt buộc.
- `content`: nội dung có thể rỗng.
- `published`: trạng thái xuất bản, mặc định `false`.
- `authorId`: khóa ngoại tùy chọn đến `User`.

Các enum đã được chuẩn bị cho miền nghiệp vụ vendor:

- `ServiceType`: `OUTSOURCING`, `SI`, `PRODUCT`, `CONSULTING`, `SPECIALIZED_TECH`.
- `SourceType`: `PUBLIC_WEBSITE`, `DIRECTORY`, `LINKEDIN`, `ARTICLE`, `DEMO_DATA`.
- `SummaryType`: `PROFILE_SUMMARY`, `LLM_SUMMARY`, `MANUAL_NOTE`.
- `VendorClassification`: `OUTSOURCING_VENDOR`, `SI_COMPANY`, `PRODUCT_COMPANY`, `CONSULTING_IT_SERVICE`, `SPECIALIZED_TECH_VENDOR`.

### Các lệnh Prisma thường dùng

```bash
# Sinh lại Prisma Client sau khi sửa schema
npx prisma generate

# Tạo và áp dụng migration khi phát triển
npx prisma migrate dev --name <ten_migration>

# Áp dụng migration có sẵn tại môi trường triển khai
npx prisma migrate deploy

# Kiểm tra trạng thái migration
npx prisma migrate status

# Mở giao diện quản lý dữ liệu
npx prisma studio

# Kiểm tra và định dạng schema
npx prisma validate
npx prisma format
```

Prisma Client được sinh vào `src/generated/prisma/`. Không sửa trực tiếp các file trong thư mục này.

---

## Chạy ứng dụng

| Lệnh                  | Mục đích                                                         |
| --------------------- | ---------------------------------------------------------------- |
| `npm run start`       | Chạy ứng dụng bằng Nest CLI.                                     |
| `npm run start:dev`   | Chạy development mode và tự khởi động lại khi mã nguồn thay đổi. |
| `npm run start:debug` | Chạy watch mode kèm Node debugger.                               |
| `npm run build`       | Biên dịch TypeScript vào `dist/`.                                |
| `npm run start:prod`  | Chạy bản đã build bằng `node dist/main`.                         |

Chạy production tại máy local:

```bash
npm run build
npm run start:prod
```

---

## API hiện có

Base URL mặc định: `http://localhost:3000`

### Kiểm tra ứng dụng

```http
GET /
```

Response:

```text
Hello World!
```

Ví dụ với cURL:

```bash
curl http://localhost:3000/
```

Hiện dự án chưa cấu hình global prefix (ví dụ `/api`) và chưa tích hợp Swagger/OpenAPI.

### Định dạng response dùng chung

`ResponseInterceptor` hỗ trợ cấu trúc thành công:

```json
{
  "status": 200,
  "message": "success",
  "data": {}
}
```

`AllExceptionsFilter` hỗ trợ cấu trúc lỗi:

```json
{
  "status": 400,
  "message": "Nội dung lỗi",
  "data": null,
  "timestamp": "2026-08-05T00:00:00.000Z",
  "path": "/example"
}
```

Hai thành phần này đã có mã nguồn nhưng chưa được đăng ký global trong `main.ts`, vì vậy endpoint hiện tại vẫn trả về chuỗi thuần.

---

## Cấu trúc dự án

```text
genie_vendor_project/
├── docs/                         # Tài liệu bổ sung
├── prisma/
│   ├── migrations/               # Lịch sử migration PostgreSQL
│   ├── schema/                   # Prisma schema dạng nhiều file
│   ├── prisma.service.ts         # Prisma service cho NestJS
│   └── seed.ts                   # Dữ liệu mẫu
├── src/
│   ├── common/
│   │   ├── constants/            # Metadata keys
│   │   ├── decorators/           # Roles, Public, CurrentUser
│   │   ├── filters/              # Xử lý exception dùng chung
│   │   ├── guards/               # JWT và role guards
│   │   ├── interceptors/         # Chuẩn hóa response
│   │   └── interfaces/           # Kiểu dữ liệu dùng chung
│   ├── generated/prisma/         # Prisma Client được sinh tự động
│   ├── app.controller.ts         # Controller gốc
│   ├── app.module.ts             # Root module
│   ├── app.service.ts            # Service gốc
│   └── main.ts                   # Entry point
├── test/                         # End-to-end tests
├── compose.yaml                  # PostgreSQL cho môi trường local
├── Dockerfile                    # Multi-stage image cho API
├── prisma.config.ts              # Cấu hình Prisma CLI
├── package.json                  # Scripts và dependencies
└── README.md
```

---

## Kiểm thử và chất lượng mã nguồn

```bash
# Unit test
npm test

# Unit test ở watch mode
npm run test:watch

# End-to-end test
npm run test:e2e

# Báo cáo coverage
npm run test:cov

# ESLint và tự động sửa lỗi có thể sửa
npm run lint

# Định dạng source và test
npm run format

# Kiểm tra project có biên dịch được không
npm run build
```

Lưu ý: script `lint` có tùy chọn `--fix` và script `format` ghi lại file. Hãy xem `git diff` sau khi chạy.

---

## Docker

### PostgreSQL cho phát triển local

File `compose.yaml` hiện chỉ định nghĩa service PostgreSQL:

```bash
docker compose up -d postgres
docker compose logs -f postgres
docker compose stop postgres
```

Dữ liệu được lưu trong named volume `postgres_data`, nên vẫn tồn tại sau khi container dừng hoặc được tạo lại.

Để dừng và xóa container/network nhưng giữ dữ liệu:

```bash
docker compose down
```

Lệnh `docker compose down -v` sẽ xóa cả volume và toàn bộ dữ liệu database; chỉ sử dụng khi chắc chắn muốn reset dữ liệu local.

### Build image API

```bash
docker build -t genie-vendor-api .
```

Dockerfile sử dụng multi-stage build và chạy bằng user không phải `root`. Tuy nhiên cấu hình hiện tại cần được hoàn thiện trước khi dùng production: image chỉ cài production dependencies nhưng lệnh mặc định `npm start` phụ thuộc Nest CLI trong `devDependencies`. Nên đổi lệnh chạy image thành `npm run start:prod` (và bảo đảm đường dẫn output đúng) trước khi triển khai.

---

## Quy ước phát triển

Khi thêm một tính năng mới, nên tổ chức theo module NestJS riêng trong `src/`, ví dụ:

```text
src/vendors/
├── dto/
├── vendors.controller.ts
├── vendors.module.ts
└── vendors.service.ts
```

Quy trình đề xuất:

1. Tạo nhánh tính năng từ nhánh phát triển của nhóm.
2. Cập nhật Prisma schema nếu có thay đổi dữ liệu.
3. Tạo migration với tên rõ nghĩa.
4. Sinh lại Prisma Client.
5. Viết unit test/e2e test tương ứng.
6. Chạy `npm run lint`, `npm test`, `npm run test:e2e` và `npm run build`.
7. Kiểm tra migration và không commit `.env`, log, coverage hoặc `node_modules`.

Quy ước commit gợi ý theo Conventional Commits:

```text
feat(vendors): add vendor creation endpoint
fix(auth): reject expired access token
docs(readme): update local setup guide
test(vendors): cover vendor classification
```

---

## Xử lý sự cố

### Không kết nối được PostgreSQL

- Kiểm tra container: `docker compose ps`.
- Kiểm tra log: `docker compose logs postgres`.
- Đảm bảo `DATABASE_URL` dùng cổng host `5431` khi API chạy trực tiếp trên máy.
- Kiểm tra cổng `5431` chưa bị ứng dụng khác sử dụng.

### Prisma Client chưa tồn tại hoặc sai phiên bản schema

```bash
npx prisma generate
```

Sau đó khởi động lại TypeScript server/IDE và ứng dụng.

Nếu E2E test báo `Cannot find module './internal/class.js'` từ Prisma Client, nguyên nhân là Jest/ts-jest chưa ánh xạ các import `.js` do Prisma sinh sang source `.ts`. Cần bổ sung cấu hình `moduleNameMapper` phù hợp trong `test/jest-e2e.json` hoặc điều chỉnh chiến lược module của Prisma/Jest trước khi chạy lại.

### Database chưa có bảng

```bash
npx prisma migrate deploy
```

Trong môi trường phát triển, có thể dùng `npx prisma migrate dev` để áp dụng và tạo migration mới.

### `npm.ps1 cannot be loaded` trên PowerShell

Sử dụng executable Windows trực tiếp:

```powershell
npm.cmd ci
npm.cmd run start:dev
npx.cmd prisma generate
```

### Cổng 3000 đã được sử dụng

Đặt cổng khác trong `.env`:

```dotenv
PORT=3001
```

---

## Giới hạn hiện tại

- Chưa có controller/service CRUD cho vendor.
- Các file schema `vendors.prisma`, `vendor-sources.prisma`, `vendor-summaries.prisma`, `classification-rules.prisma`, `classification-history.prisma` và `members.prisma` hiện là placeholder.
- Chưa có Passport JWT strategy hoặc auth module hoàn chỉnh; `JwtAuthGuard` chưa thể hoạt động độc lập.
- Guard, interceptor và exception filter chưa được đăng ký trong application bootstrap.
- Chưa có validation pipe, CORS, API prefix, rate limiting, logging có cấu trúc hoặc Swagger.
- `compose.yaml` chưa chạy API service và chưa nhận cấu hình PostgreSQL từ biến môi trường.
- Dockerfile cần điều chỉnh lệnh khởi động production như mô tả ở phần Docker.
- Test hiện chỉ bao phủ endpoint `GET /`.
- E2E test hiện chưa resolve được import `.js` nội bộ của Prisma Client khi chạy qua ts-jest.

---

## Giấy phép

Dự án được đánh dấu `UNLICENSED` và là mã nguồn riêng tư (`private: true`) trong `package.json`. Không phân phối hoặc sử dụng ngoài phạm vi được chủ sở hữu cho phép.
