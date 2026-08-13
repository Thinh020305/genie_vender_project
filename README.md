# Genie Vina — Vendor Intelligence API

REST API cấu trúc hoá thông tin nhà cung cấp IT/phần mềm Việt Nam, phục vụ doanh nghiệp Hàn Quốc cần so sánh đối tác phát triển. Cho phép đăng ký, tra cứu, tìm kiếm, lọc, phân loại và tóm tắt dữ liệu vendor.

Xây dựng bằng **NestJS 11 · TypeScript 5 · Prisma 7 · PostgreSQL 16**.

> **Phạm vi:** đây là Demo MVP mang tính giáo dục. Kết quả phân loại và đầu ra LLM chỉ là tham khảo — **không** phải khuyến nghị đối tác, xếp hạng, thẩm định hay đánh giá tín nhiệm.

---

## Mục lục

- [Kiến trúc](#kiến-trúc)
- [Yêu cầu hệ thống](#yêu-cầu-hệ-thống)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Biến môi trường](#biến-môi-trường)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Xác thực và phân quyền](#xác-thực-và-phân-quyền)
- [Danh sách API](#danh-sách-api)
- [Định dạng response](#định-dạng-response)
- [Nghiệp vụ đã hiện thực](#nghiệp-vụ-đã-hiện-thực)
- [Tính năng LLM](#tính-năng-llm)
- [Kiểm thử](#kiểm-thử)
- [Quy trình Git](#quy-trình-git)
- [Vấn đề đã biết](#vấn-đề-đã-biết)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)

---

## Kiến trúc

| Module | Trách nhiệm |
| --- | --- |
| `auth` | Đăng nhập/đăng xuất JWT, thu hồi token qua bảng `RevokedToken` |
| `members` | Truy vấn thành viên phục vụ xác thực |
| `vendors` | CRUD vendor, tìm kiếm, lọc tổ hợp, phân trang |
| `vendor-sources` | Nguồn công khai của vendor + quy tắc kiểm soát nguồn |
| `vendor-summaries` | Bản tóm tắt hồ sơ vendor (ghi thêm, không sửa) |
| `classification` | Danh mục tiêu chí phân loại, lịch sử thay đổi, khớp tiêu chí tự động |
| `statistics` | Thống kê tổng hợp theo phân loại / địa điểm / loại dịch vụ |
| `llm` | Gợi ý phân loại bằng LLM (Groq) |
| `common` | Guard, decorator, filter, interceptor dùng chung |

Ba thành phần đăng ký toàn cục trong `AppModule`:

- `AllExceptionsFilter` — chuẩn hoá mọi lỗi về cùng một hình dạng
- `ResponseInterceptor` — bọc mọi response thành `{ status, message, data }`
- `JwtAuthGuard` + `RolesGuard` — bảo vệ mặc định toàn bộ route, trừ route gắn `@Public()`

---

## Yêu cầu hệ thống

- Node.js 24.x
- Docker Desktop / Docker Engine kèm Docker Compose
- Git

---

## Bắt đầu nhanh

### 1. Cài dependency

```bash
git clone <repository-url>
cd genie_vender_project
npm ci
```

### 2. Tạo file `.env`

Sao chép từ `.env.example` rồi điền giá trị thật:

```bash
cp .env.example .env
```

### 3. Khởi động PostgreSQL

```bash
docker compose up -d
```

Container `genie_vendor_postgres` publish ở `localhost:5431` (bên trong container là `5432`). Kiểm tra:

```bash
docker compose ps
```

### 4. Sinh Prisma Client và chạy migration

```bash
npx prisma generate
npx prisma migrate deploy
```

Khi thay đổi schema trong quá trình phát triển thì dùng `migrate dev` thay cho `migrate deploy`:

```bash
npx prisma migrate dev --name <ten_migration>
```

### 5. Tạo tài khoản đầu tiên

Dự án **chưa có seed script**. Cần chèn thủ công ít nhất một thành viên `ADMIN` để đăng nhập được. Mật khẩu lưu dạng băm bcrypt trong cột `password`:

```bash
node -e "console.log(require('bcrypt').hashSync('your-password', 10))"
```

Rồi chèn vào bảng `members` với `role = 'ADMIN'`.

### 6. Chạy server

```bash
npm run start:dev
```

Mặc định `http://localhost:3000`. Kiểm tra sống: `GET /api` trả `Hello World!`.

> Trên Windows PowerShell, nếu execution policy chặn `npm.ps1`, dùng `npm.cmd` thay cho `npm`.

---

## Biến môi trường

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL cho Prisma |
| `JWT_SECRET` | Có | Khoá ký JWT. `JwtStrategy` dùng `getOrThrow` nên thiếu là app không khởi động |
| `PORT` | Không | Cổng HTTP, mặc định `3000` |
| `LLM_API_KEY` | Chỉ khi dùng LLM | API key Groq cho `POST /vendors/classify` |
| `LLM_MODEL` | Không | Mặc định `openai/gpt-oss-20b` |
| `POSTGRES_HOST_PORT` | Không | Cổng PostgreSQL phía host, mặc định `5431` |
| `POSTGRES_USER` · `POSTGRES_PASSWORD` · `POSTGRES_DB` | Không | Thông tin container PostgreSQL |

Nếu chạy API trong container cùng network với PostgreSQL, hostname phải là tên service và cổng là `5432`:

```dotenv
DATABASE_URL="postgresql://user:pass@postgres:5432/genie_vendor_project?schema=public"
```

Không commit `.env` lên Git.

---

## Cơ sở dữ liệu

Schema chia nhiều file trong `prisma/schema/`. Sơ đồ ERD đầy đủ ở [`docs/erd.md`](docs/erd.md) (dán vào dbdiagram.io để xem).

```
members ──┬─< classification_histories >─┬── vendors ──< vendor_sources
          └─< vendor_summaries >─────────┘

classification_rules   (bảng tra cứu, không nối khoá ngoại)
```

| Bảng | Vai trò |
| --- | --- |
| `vendors` | Thực thể trung tâm. `classification` là trạng thái phân loại hiện tại |
| `vendor_sources` | Nguồn công khai chứng minh thông tin vendor. Xoá vendor thì cascade |
| `vendor_summaries` | Bản tóm tắt, chỉ ghi thêm. Xoá member bị chặn để giữ dấu vết tác giả |
| `classification_histories` | Dấu vết mọi lần đổi phân loại: trước, sau, ai, khi nào, vì sao |
| `classification_rules` | Danh mục tiêu chí phân loại, mỗi phân loại một dòng |
| `members` | Tài khoản và vai trò |
| `RevokedToken` | Danh sách `jti` đã thu hồi, phục vụ logout |

**Vì sao `classification_rules` không nối khoá ngoại:** đây là bảng tra cứu, không thuộc về vendor nào. Phân loại được mô hình hoá ở ba nơi với ba vai trò khác nhau — trạng thái hiện tại (`vendors.classification`), dấu vết (`classification_histories`), tiêu chí (`classification_rules`) — và cả ba dùng chung enum `VendorClassification` nên nhất quán ở tầng kiểu dữ liệu mà không cần khoá ngoại. Cố ý không nối để sửa hoặc xoá một tiêu chí không bao giờ làm hỏng lịch sử đã ghi.

### Enum

| Enum | Giá trị |
| --- | --- |
| `Role` | `ADMIN` · `DEVELOPER` · `REVIEWER` |
| `ServiceType` | `OUTSOURCING` · `SI` · `PRODUCT` · `CONSULTING` · `SPECIALIZED_TECH` |
| `SourceType` | `PUBLIC_WEBSITE` · `DIRECTORY` · `LINKEDIN` · `ARTICLE` · `DEMO_DATA` |
| `SummaryType` | `PROFILE_SUMMARY` · `LLM_SUMMARY` · `MANUAL_NOTE` |
| `VendorClassification` | `OUTSOURCING_VENDOR` · `SI_COMPANY` · `PRODUCT_COMPANY` · `CONSULTING_IT_SERVICE` · `SPECIALIZED_TECH_VENDOR` |

---

## Xác thực và phân quyền

Đăng nhập trả về access token. Mọi request tới route được bảo vệ cần header:

```
Authorization: Bearer <token>
```

`JwtAuthGuard` và `RolesGuard` đăng ký toàn cục nên **mặc định mọi route đều yêu cầu đăng nhập**; route công khai phải gắn `@Public()`.

| Vai trò | Quyền |
| --- | --- |
| `ADMIN` | Toàn quyền quản trị, bao gồm quản lý tiêu chí phân loại và xoá dữ liệu |
| `DEVELOPER` | Đăng ký, cập nhật, tìm kiếm, phân loại và tóm tắt vendor |
| `REVIEWER` | Chỉ đọc dữ liệu vendor và kết quả phân loại |

Cơ chế: route không khai `@Roles()` thì `RolesGuard` cho qua mọi vai trò đã xác thực — đó là cách `REVIEWER` có quyền đọc mà không cần khai báo thêm.

---

## Danh sách API

Tài liệu tương tác tại **`http://localhost:3000/api/docs`** khi app đang chạy. Bản đặc tả OpenAPI thô ở `/api/docs-json`.

Tài liệu được sinh tự động từ decorator trong controller và DTO, nên luôn khớp với code đang chạy — không có file đặc tả viết tay nào cần đồng bộ.

Cách dùng: gọi `POST /api/auth/login` để lấy `accessToken`, bấm **Authorize** rồi dán token vào. Token được giữ lại khi tải lại trang.

### Auth

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/auth/login` | công khai | Đăng nhập, phát JWT |
| POST | `/api/auth/logout` | đã đăng nhập | Đăng xuất, thu hồi token |

### Vendor

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/vendors` | đã đăng nhập | Đăng ký vendor |
| GET | `/api/vendors` | đã đăng nhập | Danh sách, phân trang, sắp xếp, tìm kiếm, lọc tổ hợp |
| GET | `/api/vendors/{id}` | đã đăng nhập | Chi tiết vendor |
| PATCH | `/api/vendors/{id}` | đã đăng nhập | Cập nhật vendor |
| DELETE | `/api/vendors/{id}` | đã đăng nhập | Xoá vendor |

### Source

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/vendors/{id}/sources` | ADMIN, DEVELOPER | Thêm nguồn công khai hoặc ghi chú dữ liệu demo |
| GET | `/api/vendors/{id}/sources` | đã đăng nhập | Danh sách nguồn của vendor, có phân trang |
| GET | `/api/vendors/{id}/sources/{sourceId}` | đã đăng nhập | Chi tiết một nguồn |
| PATCH | `/api/vendors/{id}/sources/{sourceId}` | ADMIN, DEVELOPER | Cập nhật nguồn |
| DELETE | `/api/vendors/{id}/sources/{sourceId}` | ADMIN | Xoá nguồn |

### Summary

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/vendors/{id}/summaries` | ADMIN, DEVELOPER | Tạo bản tóm tắt |
| GET | `/api/vendors/{id}/summaries` | đã đăng nhập | Danh sách tóm tắt, lọc theo loại và tác giả |
| GET | `/api/vendors/{id}/summaries/{summaryId}` | đã đăng nhập | Chi tiết một bản tóm tắt |
| DELETE | `/api/vendors/{id}/summaries/{summaryId}` | ADMIN, hoặc DEVELOPER là tác giả | Xoá bản tóm tắt |

Không có route `PATCH` — bảng chỉ ghi thêm. Sửa nghĩa là xoá rồi tạo bản mới, để nội dung một `LLM_SUMMARY` không bị viết lại khác với thứ mô hình thực sự trả về.

### Classification

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/classification-rules` | đã đăng nhập | Đọc danh mục tiêu chí phân loại |
| GET | `/api/classification-rules/{id}` | đã đăng nhập | Chi tiết một tiêu chí |
| POST | `/api/classification-rules` | ADMIN | Tạo tiêu chí |
| PATCH | `/api/classification-rules/{id}` | ADMIN | Sửa tiêu chí |
| DELETE | `/api/classification-rules/{id}` | ADMIN | Xoá tiêu chí |
| POST | `/api/classification-rules/match` | ADMIN, DEVELOPER | Khớp văn bản với tiêu chí, **chỉ xem trước** |
| PATCH | `/api/vendors/{id}/classification` | ADMIN, DEVELOPER | Đổi phân loại, tự ghi lịch sử |
| GET | `/api/vendors/{id}/classification-history` | đã đăng nhập | Lịch sử thay đổi phân loại |

### Statistics

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| GET | `/api/vendors/stats` | đã đăng nhập | Tổng số và thống kê theo phân loại, địa điểm, loại dịch vụ |

### LLM

| Method | Endpoint | Quyền | Mô tả |
| --- | --- | --- | --- |
| POST | `/api/vendors/classify` | ADMIN, DEVELOPER | Gợi ý phân loại, kèm lập luận và bằng chứng |

---

## Định dạng response

Mọi response thành công đi qua `ResponseInterceptor`:

```json
{
  "status": 200,
  "message": "success",
  "data": { }
}
```

Lỗi đi qua `AllExceptionsFilter`, có thêm `timestamp` và `path`:

```json
{
  "status": 400,
  "message": "sourceUrl must be an absolute URL including http:// or https://",
  "data": null,
  "timestamp": "2026-08-12T10:00:00.000Z",
  "path": "/api/vendors/1/sources"
}
```

Danh sách có phân trang trả về trong `data`:

```json
{
  "items": [],
  "total": 42,
  "page": 1,
  "limit": 20,
  "totalPages": 3
}
```

---

## Nghiệp vụ đã hiện thực

### Kiểm soát nguồn

Mỗi dòng `vendor_sources` phải thoả một trong hai:

- có `sourceUrl` là URL tuyệt đối, hoặc
- có `memo` chứa một trong các cụm `demo data`, `demo-data`, `source unverified` (không phân biệt hoa thường)

Ngoài ra chỉ `sourceType = DEMO_DATA` mới được phép thiếu `sourceUrl`. Một nguồn khai là `PUBLIC_WEBSITE` mà không có URL sẽ bị từ chối.

Quy tắc được kiểm cả khi tạo lẫn khi cập nhật — với `PATCH`, phép kiểm chạy trên dòng **sau khi gộp**, không phải trên body, để một thao tác chỉ xoá `sourceUrl` không thể để lại dòng thiếu bằng chứng.

### Cách ly dữ liệu giữa các vendor

Route lồng dưới vendor luôn truy vấn theo **cả hai** id. `GET /api/vendors/2/sources/1` trả 404 nếu nguồn số 1 thuộc vendor khác — đoạn `{id}` trong đường dẫn có tác dụng thật, không phải trang trí.

### Ghi lịch sử phân loại

Mỗi lần đổi `vendors.classification` sinh một dòng `classification_histories` ghi `previousClassification`, `newClassification`, `changedBy`, `changedAt`, `reason`. Hai thao tác nằm trong cùng một transaction.

### Khớp tiêu chí tự động

`POST /api/classification-rules/match` nhận một đoạn văn bản, đối chiếu với `keywords` của từng tiêu chí và trả về tiêu chí khớp kèm lý do. Khi nhiều tiêu chí cùng khớp, thứ tự quyết định là `priority` tăng dần → `weight` giảm dần → `createdAt` → `id`.

Endpoint này **chỉ xem trước**, không bao giờ ghi vào `vendors.classification` hay `classification_histories`. Áp dụng kết quả phải qua `PATCH /api/vendors/{id}/classification` — đó là nơi lịch sử được ghi.

### Bảo vệ dữ liệu cá nhân

`Member.password` không bao giờ rời khỏi tầng dữ liệu. Truy vấn tác giả bản tóm tắt ghim sẵn phép chiếu `{ id, name, email }`.

---

## Tính năng LLM

`POST /api/vendors/classify` gửi hồ sơ vendor tới Groq và nhận về gợi ý phân loại:

```json
{
  "suggestedClassification": "OUTSOURCING_VENDOR",
  "confidence": "high",
  "reasoning": "...",
  "evidenceUsed": ["..."],
  "disclaimer": "This is an AI-generated suggestion for reference only..."
}
```

Thiết kế prompt và phương pháp kiểm chứng ghi ở [`docs/llm-prompt-spec.md`](docs/llm-prompt-spec.md).

Ba điểm về cách dùng LLM:

1. Endpoint **không ghi gì vào cơ sở dữ liệu**. Muốn áp dụng gợi ý phải gọi `PATCH /api/vendors/{id}/classification` — bắt buộc có người xem lại.
2. Đầu ra được kiểm tra lại theo enum `VendorClassification`; giá trị lạ bị từ chối bằng `400` thay vì gán bừa một phân loại mặc định.
3. Prompt gắn cứng năm tiêu chí chuẩn trong `src/llm/prompts/classify-vendor.prompt.ts`. Nó **chưa** đọc từ bảng `classification_rules` — đó là bước phát triển tiếp theo.

---

## Kiểm thử

```bash
npm test           # unit test
npm run test:cov   # kèm báo cáo coverage
npm run test:e2e   # end-to-end
npm run lint       # ESLint, tự sửa được thì sửa
npm run format     # Prettier
```

---

## Quy trình Git

```
main              : bản phát hành
develop           : nhánh tích hợp
feature/{name}    : nhánh cá nhân
```

Mỗi người làm trên nhánh riêng, mở PR vào `develop`, cần ít nhất một người review. Quy ước commit: `feat:` `fix:` `docs:` `refactor:` `test:`. Chi tiết ở [`docs/gitflow.md`](docs/gitflow.md).

---

## Vấn đề đã biết

### 1. Thứ tự import module quyết định `/api/vendors/stats` có chạy hay không

`StatisticsController` khai `@Get('stats')` còn `VendorsController` khai `@Get(':id')` — cùng độ sâu. Express khớp theo thứ tự đăng ký, nên `/api/vendors/stats` chỉ tới được thống kê vì `StatisticsModule` đứng **trước** `VendorsModule` trong mảng `imports` của `AppModule`.

Đảo thứ tự đó là `"stats"` rơi vào `:id`, `ParseIntPipe` ném 400, thống kê chết. Điều này áp dụng cho cả `/api/vendors/classify` với `LlmModule`. Đừng sắp xếp lại `imports` cho "gọn".

### 2. Vendor CRUD chưa gắn phân quyền

`VendorsController` không khai `@Roles()` ở route nào, kể cả `DELETE`. Nghĩa là `REVIEWER` hiện xoá được vendor, trái với yêu cầu chỉ-đọc và với ghi chú "admin only or soft delete".

### 3. Lỗi 500 khi id vượt phạm vi `int4`

`GET /api/vendors/2147483648/sources` trả `500` thay vì `400`. `ParseIntPipe` chấp nhận giá trị, PostgreSQL từ chối, Prisma ném lỗi không phải `HttpException` nên filter trả `500`. Nên xử lý tập trung ở `AllExceptionsFilter` bằng cách ánh xạ lỗi Prisma đã biết sang `400`.

### 4. Quy tắc kiểm soát nguồn bị lách bằng JSON `null`

`PATCH {"sourceUrl": null}` hiện trả `200` và lưu `null` xuống DB, để lại dòng không còn URL lẫn ghi chú demo. Nguyên nhân: `dto.sourceUrl ?? existing.sourceUrl` coi `null` là "không gửi" nên phép kiểm chạy trên giá trị cũ, còn Prisma lại ghi `null`. Cần đổi sang kiểm tra `'sourceUrl' in dto`.

### 5. Tạo tiêu chí phân loại đồng thời trả 500

`ClassificationRulesService.create()` kiểm tra rồi mới ghi, không bắt lỗi `P2002`. Nhiều request song song cùng `classificationName` sẽ có request nhận `500` thay vì `409`. Ràng buộc duy nhất vẫn giữ đúng, dữ liệu không hỏng.

### 6. Khớp từ khoá phân biệt dấu tiếng Việt

Từ khoá `gia công phần mềm` khớp văn bản có dấu, nhưng không khớp `gia cong phan mem`. Nếu dữ liệu demo có mô tả tiếng Việt, nên lưu cả hai dạng trong `keywords` hoặc chuẩn hoá bỏ dấu ở cả hai vế.

### 7. Chưa có seed script

`prisma/seed.ts` đã bị gỡ. Tài khoản đầu tiên và năm tiêu chí phân loại phải tạo thủ công.

---

## Cấu trúc thư mục

```
prisma/
  migrations/          # lịch sử migration
  schema/              # schema chia theo bảng
  prisma.module.ts     # PrismaModule dùng chung
  prisma.service.ts
docs/
  erd.md               # ERD dạng dbdiagram.io
  llm-prompt-spec.md   # thiết kế prompt và cách kiểm chứng
  gitflow.md
src/
  auth/                # đăng nhập, JWT strategy, thu hồi token
  members/
  vendors/             # CRUD, tìm kiếm, lọc
  vendor-sources/      # nguồn + quy tắc kiểm soát nguồn
  vendor-summaries/    # tóm tắt, chỉ ghi thêm
  classification/      # tiêu chí, lịch sử, bộ khớp tiêu chí
  statistics/
  llm/                 # gợi ý phân loại qua Groq
  common/              # guard, decorator, filter, interceptor
  generated/prisma/    # Prisma Client sinh tự động, không sửa tay
test/                  # end-to-end
```

---

## Giấy phép

UNLICENSED — dự án nội bộ phục vụ chương trình OJT.
