# CLAUDE.md

Hướng dẫn làm việc trong repo này. File được Claude Code tự động nạp mỗi phiên.

---

## 1. Tổng quan dự án

**Genie Vendor Project** — đồ án môn học, xây dựng REST API quản lý & phân loại nhà cung cấp (vendor) IT.

| Hạng mục | Giá trị |
|---|---|
| Framework | NestJS 11 |
| Ngôn ngữ | TypeScript 5.7 (`strict: true`) |
| ORM | Prisma 7.9 — generator `prisma-client`, driver adapter `@prisma/adapter-pg` |
| Database | PostgreSQL 16 (Docker, host port **5431** → container 5432) |
| Auth | JWT (`@nestjs/jwt` + `passport-jwt`), phân quyền theo `Role` |
| Repo | https://github.com/Thinh020305/genie_vender_project |

**Nghiệp vụ cốt lõi:** thu thập thông tin vendor từ nhiều nguồn (`vendor-sources`) → tổng hợp nội dung (`vendor-summaries`) → áp dụng bộ luật (`classification-rules`) để phân loại vendor vào 5 nhóm (`VendorClassification`), có lưu lịch sử phân loại và thống kê.

**Enum dùng chung** (đã có trong [prisma/schema/enums.prisma](prisma/schema/enums.prisma), **không tự ý sửa**):
- `Role`: ADMIN, DEVELOPER, REVIEWER
- `ServiceType`: OUTSOURCING, SI, PRODUCT, CONSULTING, SPECIALIZED_TECH
- `SourceType`: PUBLIC_WEBSITE, DIRECTORY, LINKEDIN, ARTICLE, DEMO_DATA
- `SummaryType`: PROFILE_SUMMARY, LLM_SUMMARY, MANUAL_NOTE
- `VendorClassification`: OUTSOURCING_VENDOR, SI_COMPANY, PRODUCT_COMPANY, CONSULTING_IT_SERVICE, SPECIALIZED_TECH_VENDOR

### Lệnh thường dùng

```bash
npm run start:dev          # chạy dev (watch)
npm run lint               # eslint --fix
npm run format             # prettier
npm run test               # unit test (jest)
npm run test:e2e           # e2e test
npx prisma generate        # sinh lại client sau khi đổi schema
npx prisma migrate dev --name <ten_migration>
npx prisma studio
docker compose up -d       # bật PostgreSQL
```

### Trạng thái hiện tại của repo (tính đến 2026-08-07)

Cần biết trước khi code, tránh giả định sai:
- Các module trong [src/](src/) mới chỉ có thư mục rỗng + `.gitkeep`. Chưa có module/controller/service nào ngoài `app.*`.
- Các file `prisma/schema/*.prisma` của từng module **đang rỗng**, chỉ mới có `enums.prisma` và `schema.prisma` (còn model mẫu `User`/`Post`).
- [src/main.ts](src/main.ts) **chưa** đăng ký global `ValidationPipe`, `ResponseInterceptor`, `AllExceptionsFilter`. Đây là việc của người phụ trách setup chung — không tự sửa (xem mục 7), nếu cần thì báo trong nhóm.
- **`class-validator` và `class-transformer` chưa được cài.** Muốn dùng DTO validation phải `npm i class-validator class-transformer` — đây là thay đổi `package.json` ảnh hưởng cả nhóm, phải báo trước.
- `@nestjs/swagger` chưa cài. Nếu cần tài liệu API cho PPT, thống nhất trong nhóm trước khi thêm.

---

## 2. Kiến trúc thư mục

```
prisma/
  prisma.service.ts              # PrismaService (extends PrismaClient, dùng PrismaPg adapter)
  seed.ts
  migrations/
  schema/                        # multi-file schema — MỖI MODULE MỘT FILE
    schema.prisma                # generator + datasource
    enums.prisma                 # enum dùng chung
    vendors.prisma
    vendor-sources.prisma        # ← của tôi
    vendor-summaries.prisma      # ← của tôi
    classification-rules.prisma  # ← của tôi
    classification-history.prisma
    members.prisma
src/
  main.ts
  app.module.ts                  # nơi đăng ký các feature module
  common/                        # dùng chung, KHÔNG sửa tùy tiện
    constants/                   # ROLES_KEY, IS_PUBLIC_KEY
    decorators/                  # @Roles, @Public, @CurrentUser
    filters/                     # AllExceptionsFilter
    guards/                      # JwtAuthGuard, RolesGuard
    interceptors/                # ResponseInterceptor
    interfaces/                  # ApiResponse, JwtPayload, AuthenticatedRequest
  generated/prisma/              # Prisma client sinh tự động — TUYỆT ĐỐI KHÔNG SỬA TAY
  auth/          members/        vendors/
  vendor-sources/                # ← của tôi
  vendor-summaries/              # ← của tôi
  classification/                # ← của tôi (classification-rules)
  llm/           statistics/
docs/                            # ERD, tài liệu, PPT
test/                            # e2e
```

### Cấu trúc chuẩn của một feature module

```
src/<module>/
  <module>.module.ts
  <module>.controller.ts
  <module>.service.ts
  <module>.service.spec.ts
  dto/
    create-<entity>.dto.ts
    update-<entity>.dto.ts
    query-<entity>.dto.ts
  entities/
    <entity>.entity.ts           # shape trả về cho client
```

Luồng dữ liệu bắt buộc: **Controller → Service → PrismaService**. Controller không được gọi `PrismaService` trực tiếp; Service không đụng tới `Request`/`Response` của Express.

---

## 3. Coding conventions

**Đặt tên file:** `kebab-case`, có hậu tố vai trò — `vendor-sources.service.ts`, `create-vendor-source.dto.ts`, `classification-rule.entity.ts`.

**Đặt tên trong code:**
| Loại | Quy tắc | Ví dụ |
|---|---|---|
| Class | PascalCase | `VendorSourcesService` |
| Biến / hàm | camelCase | `findActiveByVendorId` |
| Hằng số | UPPER_SNAKE_CASE | `MAX_SUMMARY_LENGTH` |
| Model Prisma | PascalCase số ít | `VendorSource` |
| Field Prisma | camelCase | `sourceUrl`, `collectedAt` |
| Bảng / cột DB | **KHÔNG dùng `@@map`** — giữ nguyên tên model/field | Bảng `"VendorSource"`, cột `"sourceUrl"` |
| Route | kebab-case, danh từ số nhiều | `/vendor-sources` |

**Quy tắc chung:**
- Prettier: single quote, trailing comma `all`. Chạy `npm run format` trước khi commit.
- ESLint bật `recommendedTypeChecked` — không để lại warning mới.
- `strict: true`: không dùng `any` để né lỗi type; không dùng `!` (non-null assertion) trừ khi thật sự chắc chắn.
- Import Prisma types từ `src/generated/prisma/...`, **không** từ `@prisma/client`.
- Mọi hàm public của service phải có kiểu trả về tường minh.
- Không `console.log` trong code commit — dùng `Logger` của NestJS.
- Không hardcode secret/URL — đọc qua `process.env`, khai báo key mới vào `.env.example`.
- Comment bằng tiếng Việt không dấu hoặc tiếng Anh, chỉ comment khi giải thích **tại sao**, không comment lại điều code đã nói rõ.

---

## 4. Quy tắc sử dụng NestJS

1. **Mỗi module tự đăng ký `PrismaService`** trong `providers` của module mình (hiện chưa có `PrismaModule` global).
2. Dùng **constructor injection** với `private readonly`:
   `constructor(private readonly prisma: PrismaService) {}`
3. **Controller mỏng**: chỉ nhận request, gọi service, trả kết quả. Toàn bộ business logic nằm trong service.
4. **Validation bằng DTO**, không validate thủ công trong controller. Dùng `class-validator` (xem lưu ý ở mục 1 — chưa cài).
5. **Không tự trả về `{ status, message, data }`** — `ResponseInterceptor` sẽ bọc. Service/controller chỉ trả về data thuần.
6. **Không tự bắt lỗi để trả JSON** — ném HttpException chuẩn, `AllExceptionsFilter` xử lý:
   - `NotFoundException` — không tìm thấy resource
   - `BadRequestException` — dữ liệu đầu vào sai nghiệp vụ
   - `ConflictException` — vi phạm ràng buộc unique
   - `ForbiddenException` — không đủ quyền
7. **Phân quyền** dùng decorator có sẵn: `@Roles(Role.ADMIN)`, `@Public()`, `@CurrentUser()`. Không tự viết guard mới trong module của mình.
8. **HTTP status**: `POST` tạo mới → 201 (mặc định của Nest); `PATCH`/`GET` → 200; `DELETE` → 200 kèm object đã xóa (soft delete).
9. **Không dùng nested route xuyên module.** Ví dụ: cần lấy nguồn theo vendor thì làm `GET /vendor-sources?vendorId=...`, **không** thêm `GET /vendors/:id/sources` vào controller của người khác.
10. Đăng ký module vào `imports` của [src/app.module.ts](src/app.module.ts) — đây là file dùng chung, sửa **đúng một dòng** import module của mình, không đụng dòng khác.

---

## 5. Quy tắc sử dụng Prisma

1. **Multi-file schema**: chỉ sửa file `.prisma` của module mình trong `prisma/schema/`. Model mới đặt đúng file tương ứng.
2. **Không sửa** `enums.prisma` và block `generator`/`datasource` trong `schema.prisma`. Cần enum mới → báo nhóm.
3. **Không sửa file trong `src/generated/prisma/`** — thư mục sinh tự động, mọi thay đổi tay sẽ mất khi `prisma generate`.
4. **Không sửa migration đã tồn tại** trong `prisma/migrations/`. Đổi schema → tạo migration mới:
   `npx prisma migrate dev --name add_vendor_source_table`
5. Tên migration: `snake_case`, mô tả hành động — `add_classification_rule_priority`, không đặt `update`, `fix`, `test`.
6. **Chạy migrate trên DB local trước**, xác nhận không lỗi rồi mới commit cả schema + thư mục migration cùng một commit.
7. Convention model bắt buộc:
   - ID phải thống nhất với quyết định chung của nhóm.

Nếu project đã có convention thì tuân theo convention đó.

Không tự đổi kiểu ID.
   - `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`
   - **Xóa mềm dùng `deletedAt DateTime?`** (`null` = còn sống). Không dùng `isActive` cho mục đích xóa.
   - **`isActive Boolean @default(true)` chỉ dùng khi bảng có khái niệm bật/tắt nghiệp vụ riêng** — hiện chỉ `ClassificationRule` có.
   - **Không dùng `@@map`** — tên bảng giữ PascalCase theo `"User"` / `"Post"` đã có sẵn trong DB.
8. **Đặt index** cho mọi cột dùng để filter/join: `@@index([vendorId])`, `@@index([vendorId, deletedAt])`.
9. Quan hệ khóa ngoại đặt `onDelete: Restrict` cho dữ liệu cần giữ lịch sử; chỉ dùng `Cascade` khi đã cân nhắc.
10. **Query**:
    - Luôn `select` hoặc `include` tường minh, không trả về nguyên bản ghi thô nếu có cột nhạy cảm.
    - Nhiều thao tác ghi liên quan nhau → bọc `prisma.$transaction`.
    - List endpoint bắt buộc phân trang (`skip`/`take`), mặc định `take = 20`, tối đa `100`.
    - Không dùng `$queryRaw` trừ khi thật sự cần và có comment giải thích.
11. `prisma/seed.ts` là file dùng chung — thêm seed cho module mình bằng cách **thêm khối mới**, không sửa/xóa khối của người khác.

---

## 6. Quy tắc commit code

**Nhánh:**
- `main` — nhánh ổn định, không push trực tiếp.
- `develop` — nhánh tích hợp, đích của mọi Pull Request.
- `feature/<tên>` — nhánh cá nhân. Nhánh của tôi: **`feature/My`**.

Luồng: làm việc trên `feature/My` → push → mở PR vào `develop` → nhờ 1 thành viên review → merge.

**Format commit message** (Conventional Commits, mô tả tiếng Việt không dấu):

```
<type>(<scope>): <mo ta ngan, thi hien tai>
```

`type`: `feat` | `fix` | `refactor` | `docs` | `test` | `chore` | `style`
`scope`: tên module — `vendor-sources`, `classification-rules`, `vendor-summaries`, `prisma`, `docs`

Ví dụ đúng:
```
feat(vendor-sources): them API tao va danh sach nguon vendor
fix(classification-rules): sua thu tu uu tien khi trung priority
docs(erd): cap nhat quan he vendor-summaries
```

**Quy tắc:**
- Một commit = một thay đổi có ý nghĩa. Không gom nhiều feature vào một commit.
- Commit message không được là `update`, `fix bug`, `abc`, `commit lan 2`.
- **Không commit**: `.env`, `dist/`, `node_modules/`, `src/generated/`, file `.log`, file backup cá nhân.
- **Không `git push --force`** lên `develop` / `main`.
- **Không commit code không chạy được** (build lỗi / lint lỗi).
- Trước khi mở PR: `git pull origin develop` và tự xử lý conflict trên nhánh của mình.
- Xử lý conflict ở file dùng chung (`app.module.ts`, `seed.ts`, `package.json`): **giữ lại cả hai phía**, không xóa phần của người khác.

---

## 7. Quy tắc không sửa code của module người khác

Đây là quy tắc quan trọng nhất của đồ án — mỗi thành viên bị chấm điểm trên module của mình.

**Phạm vi tôi được sửa tự do:**

| Được sửa | Đường dẫn |
|---|---|
| ✅ | [src/vendor-sources/](src/vendor-sources/) |
| ✅ | [src/vendor-summaries/](src/vendor-summaries/) |
| ✅ | [src/classification/](src/classification/) (phần classification-rules) |
| ✅ | [prisma/schema/vendor-sources.prisma](prisma/schema/vendor-sources.prisma) |
| ✅ | [prisma/schema/vendor-summaries.prisma](prisma/schema/vendor-summaries.prisma) |
| ✅ | [prisma/schema/classification-rules.prisma](prisma/schema/classification-rules.prisma) |
| ✅ | [docs/](docs/) — ERD & tài liệu |

**Tuyệt đối không sửa:**

| Không sửa | Lý do |
|---|---|
| ❌ `src/auth/`, `src/members/`, `src/vendors/`, `src/llm/`, `src/statistics/` | module của người khác |
| ❌ `src/common/**` | hạ tầng dùng chung |
| ❌ `src/generated/prisma/**` | sinh tự động |
| ❌ `prisma/schema/enums.prisma`, `schema.prisma` | dùng chung toàn nhóm |
| ❌ `prisma/schema/vendors.prisma`, `members.prisma`, `classification-history.prisma` | của người khác |
| ❌ `prisma/migrations/**` (migration cũ) | phá vỡ lịch sử DB |
| ❌ `src/main.ts`, `prisma/prisma.service.ts`, `prisma.config.ts` | setup chung |
| ❌ `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.prettierrc`, `compose.yaml`, `Dockerfile` | cấu hình chung |

**File dùng chung được sửa có giới hạn:**
- [src/app.module.ts](src/app.module.ts): chỉ thêm import + 1 entry vào `imports` cho module của mình.
- `prisma/seed.ts`: chỉ thêm khối seed mới của mình.
- `.env.example`: chỉ thêm key mới của mình.

**Khi cần dữ liệu từ module người khác** (ví dụ `vendor-sources` cần kiểm tra vendor tồn tại):
1. **Ưu tiên**: query qua `PrismaService` ở chế độ chỉ đọc (`prisma.vendor.findUnique(...)`) — đọc DB không phải sửa code người khác.
2. Nếu bắt buộc gọi service của module khác → `imports` module đó và inject service, **chỉ gọi**, không sửa.
3. **Không bao giờ**: tự thêm method/route vào controller/service của người khác. Nếu thiếu, nhắn cho chủ module.

**Khi Claude phát hiện lỗi trong module người khác:** báo cho tôi bằng lời, ghi rõ file + dòng, **không tự sửa**.

---

## 8. Business rules — module của tôi
Các Business Rules dưới đây là thiết kế mục tiêu của module tôi.

Nếu khác với đặc tả chính thức hoặc quyết định của nhóm thì ưu tiên đặc tả của nhóm và cập nhật lại CLAUDE.md.
> Các model tương ứng chưa được viết vào `prisma/schema/`. Phần dưới là **đặc tả nghiệp vụ tôi chốt cho module của mình**, suy ra từ các enum dùng chung; sẽ được hiện thực hóa thành schema + validation. Nếu nhóm thống nhất khác thì cập nhật lại mục này trước.

### 8.1 `vendor-sources` — Nguồn thông tin vendor

Ghi nhận vendor được thu thập từ đâu.

- Mỗi source thuộc **đúng một** vendor; `vendorId` bắt buộc, là khóa ngoại tới `Vendor`.
- Tạo source với `vendorId` không tồn tại → `404 NotFound`, không tạo bản ghi mồ côi.
- `sourceType` bắt buộc, phải thuộc enum `SourceType`.
- `sourceUrl` **bắt buộc** với mọi `sourceType`, **trừ** `DEMO_DATA` (dữ liệu demo không có URL thật).
- `sourceUrl` phải bắt đầu bằng `http://` hoặc `https://`, tối đa 2048 ký tự.
- **Unique `(vendorId, sourceUrl)`**: không lưu trùng một nguồn cho cùng một vendor → vi phạm trả `409 Conflict`.
- `collectedAt` mặc định `now()`, **không được là thời điểm tương lai**.
- Một vendor có thể có nhiều source thuộc cùng một `sourceType`.
- **Xóa là soft delete** (set `deletedAt`) vì `vendor-summaries` và lịch sử phân loại có thể tham chiếu nguồn. Bảng này **không có cột `isActive`**.
- Source đã xóa (`deletedAt != null`) không xuất hiện trong danh sách mặc định và **không được dùng làm đầu vào tổng hợp**.
- API vẫn trả trường `isActive` cho client — đây là **trường tính toán** (`deletedAt === null`), không phải cột DB.
- Chỉ `ADMIN` và `DEVELOPER` được tạo/sửa/xóa; `REVIEWER` chỉ đọc.

### 8.2 `classification-rules` — Bộ luật phân loại

Bộ luật keyword → nhóm vendor, để phân loại tự động thay cho hardcode.

- Mỗi rule gồm: `keyword` (chuỗi cần khớp), `targetClassification` (`VendorClassification`), `priority` (int), `weight` (int), `isActive` (bật/tắt), `deletedAt` (xóa mềm).
- `keyword` được **chuẩn hóa trước khi lưu**: `trim()` + `toLowerCase()`. Tối thiểu 2 ký tự.
- **Unique `(keyword, targetClassification)`** — không cho hai rule y hệt nhau → `409 Conflict`.
- Một `keyword` **được phép** trỏ tới nhiều `targetClassification` khác nhau; khi đó `priority` quyết định bên nào thắng.
- `targetClassification` bắt buộc thuộc enum `VendorClassification`.
- **Thứ tự ưu tiên khi nhiều rule cùng khớp** — xét lần lượt **4 nấc**, dừng ngay ở nấc đầu tiên phân định được:
  1. `priority` **nhỏ hơn** thắng;
  2. nếu bằng nhau → `weight` **lớn hơn** thắng;
  3. nếu vẫn bằng → rule tạo trước (`createdAt` **sớm hơn**) thắng;
  4. nếu cả ba vẫn bằng → `id` **nhỏ hơn** thắng.
- Nấc 4 tồn tại vì ba nấc đầu **có thể hòa hoàn toàn** (cùng `priority`, cùng `weight`, cùng `createdAt`). Khi đó nếu không có tiêu chí cuối, kết quả sẽ phụ thuộc thứ tự DB trả về — vi phạm chính yêu cầu ngay dưới đây. `id` được chọn vì nó duy nhất và bất biến.
- Quy tắc này phải **deterministic**: cùng một tập rule và cùng một đoạn text luôn cho cùng kết quả, **không phụ thuộc thứ tự trả về của DB**.
- `priority` ∈ [1, 999], mặc định `100` — **dải ưu tiên thô**, chỉ đặt khi cần ép một rule vượt lên trên tất cả.
- `weight` ∈ [1, 100], mặc định `1` — **điểm số tinh**, là núm điều chỉnh dùng hằng ngày. Vì đa số rule để `priority` mặc định nên `weight` mới là thứ phân định trong phần lớn trường hợp.
- Cả `priority` và `weight` **phải NOT NULL** — `ORDER BY` của PostgreSQL đẩy `NULL` xuống cuối, cho phép NULL sẽ phá vỡ tính deterministic.
- **`isActive` và `deletedAt` là hai khái niệm khác nhau, lưu ở hai cột riêng biệt:**
  - `isActive = false` — **tắt tạm thời** (endpoint `PATCH /:id/status`). Không tham gia phân loại, bật lại được.
  - `deletedAt != null` — **đã xóa** (endpoint `DELETE /:id`). Không tham gia phân loại, không xuất hiện trong danh sách.
- Rule đã xóa vẫn giữ trong DB để `classification-history` truy vết.
- Rule đã xóa **vẫn chiếm chỗ trong ràng buộc unique** — khi `POST` gặp cặp `(keyword, targetClassification)` trùng với một rule đã xóa, service phải **khôi phục và cập nhật** rule đó thay vì trả `409`.
- Matching **không phân biệt hoa thường**, khớp trên tên vendor + mô tả + nội dung summary mới nhất của vendor.
- Nếu không rule nào khớp → vendor **không được phân loại**, không gán giá trị mặc định.
- Endpoint preview (`POST /classification-rules/preview`) **chỉ tính toán, không ghi DB**.
- Chỉ `ADMIN` được tạo/sửa/xóa rule (rule ảnh hưởng toàn hệ thống); `DEVELOPER` và `REVIEWER` chỉ đọc + preview.

### 8.3 `vendor-summaries` — Bản tổng hợp thông tin vendor

- Mỗi summary thuộc **đúng một** vendor; `vendorId` không tồn tại → `404 NotFound`.
- `summaryType` bắt buộc, thuộc enum `SummaryType`.
- `content` bắt buộc, độ dài **20 – 5000 ký tự** sau khi `trim()`.
- Một vendor có **nhiều** summary, nhưng với mỗi `summaryType` chỉ có **một bản mới nhất**. Quy tắc này được bảo đảm bằng cột **`version` (int)** + ràng buộc `@@unique([vendorId, summaryType, version])` — **không** dùng cờ `isLatest`.
- Tạo bản mới: service đọc `max(version)` rồi chèn `version + 1`. **Không cần `$transaction`**, không cần hạ cờ bản cũ.
- Nếu hai request song song cùng chọn một `version`, DB từ chối bản thua. Service **tự thử lại tối đa 3 lần**; chỉ khi cả 3 lần thất bại mới trả lỗi — **không bao giờ để client thấy `409` vì lý do này**.
- API vẫn trả trường `isLatest` cho client — đây là **trường tính toán** (`version` lớn nhất của cùng `(vendorId, summaryType)`), không phải cột DB.
- `MANUAL_NOTE` bắt buộc có `createdBy` (id thành viên, lấy từ `@CurrentUser()`).
- `LLM_SUMMARY` **chỉ được tạo, không được sửa nội dung**. Muốn thay đổi → tạo bản mới. Sửa `LLM_SUMMARY` → `400 BadRequest`.
- Module này **không gọi LLM trực tiếp** — việc sinh nội dung thuộc module `llm`. Ở đây chỉ nhận và lưu kết quả.
- `PROFILE_SUMMARY` phải được sinh từ ít nhất **một** `vendor-source` chưa bị xóa (`deletedAt = null`); không có nguồn hợp lệ → `400 BadRequest`.
- **Xóa là soft delete** (set `deletedAt`). Xóa bản mới nhất thì "bản mới nhất" **tự động lùi về `version` liền trước** — không cần transaction, không cần nâng cờ. Bảng này **không có cột `isActive`**.
- `ADMIN`/`DEVELOPER` tạo & sửa; `REVIEWER` chỉ đọc.

---

## 9. Checklist trước khi commit

Chạy đủ, không bỏ bước:

```bash
npm run format
npm run lint
npm run build
npm run test
```

- [ ] `npm run build` không lỗi TypeScript.
- [ ] `npm run lint` không phát sinh error/warning mới.
- [ ] `npm run test` pass (kể cả test của module khác).
- [ ] Nếu đổi schema: đã chạy `npx prisma migrate dev` + `npx prisma generate` trên DB local thành công.
- [ ] Nếu đổi schema: commit **kèm** thư mục migration mới; không sửa migration cũ.
- [ ] Đã test tay các endpoint mới (Postman / REST Client), gồm cả case lỗi: 400 / 404 / 409 / 403.
- [ ] `git diff --stat` chỉ chứa file thuộc phạm vi của tôi (mục 7). Nếu lỡ đụng file người khác → revert file đó.
- [ ] Không có `console.log`, code comment-out, hay file rác (`test.ts`, `abc.ts`, `*.bak`).
- [ ] Không có `.env`, `dist/`, `src/generated/` trong staged files.
- [ ] Không hardcode secret / connection string.
- [ ] Commit message đúng format `<type>(<scope>): <mo ta>`.
- [ ] Đã `git pull origin develop` và xử lý xong conflict.
- [ ] Nếu thêm/đổi API: đã cập nhật bảng ở mục 10 và `docs/erd.md`.

---

## 10. Danh sách API tôi chịu trách nhiệm

Mọi endpoint đều yêu cầu JWT (trừ khi có `@Public()`). Response được `ResponseInterceptor` bọc thành `{ status, message, data }`.

### 10.1 `vendor-sources` — base `/vendor-sources`

| # | Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|---|
| 1 | POST | `/vendor-sources` | Tạo nguồn mới cho một vendor | ADMIN, DEVELOPER |
| 2 | GET | `/vendor-sources` | Danh sách + phân trang. Query: `vendorId`, `sourceType`, `isActive`, `page`, `limit` | Tất cả |
| 3 | GET | `/vendor-sources/:id` | Chi tiết một nguồn | Tất cả |
| 4 | PATCH | `/vendor-sources/:id` | Cập nhật `sourceUrl`, `sourceType`, `note` | ADMIN, DEVELOPER |
| 5 | DELETE | `/vendor-sources/:id` | Soft delete (set `deletedAt`) | ADMIN |
| 6 | PATCH | `/vendor-sources/:id/restore` | Khôi phục nguồn đã soft delete | ADMIN |

### 10.2 `classification-rules` — base `/classification-rules`

| # | Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|---|
| 7 | POST | `/classification-rules` | Tạo rule phân loại mới | ADMIN |
| 8 | GET | `/classification-rules` | Danh sách + phân trang. Query: `targetClassification`, `keyword`, `isActive`, `page`, `limit` | Tất cả |
| 9 | GET | `/classification-rules/:id` | Chi tiết một rule | Tất cả |
| 10 | PATCH | `/classification-rules/:id` | Cập nhật `keyword`, `targetClassification`, `priority`, `weight` | ADMIN |
| 11 | PATCH | `/classification-rules/:id/status` | Bật/tắt rule (`isActive`) | ADMIN |
| 12 | DELETE | `/classification-rules/:id` | Soft delete rule | ADMIN |
| 13 | POST | `/classification-rules/preview` | Chạy thử bộ luật trên một đoạn text hoặc `vendorId`, trả về nhóm dự kiến + rule đã khớp. **Không ghi DB** | ADMIN, DEVELOPER |

#### Contract của `matchedRules` (endpoint #13)

`matchedRules` có **đúng 6 field**, không hơn không kém:

```text
id:                   number
keyword:              string
targetClassification: VendorClassification
priority:             number
weight:               number
createdAt:            Date
```

- Đây chính là shape do **`RuleMatcherService.match()`** trả về (kiểu `MatchableRule` trong [rule-matcher.service.ts](src/classification/rule-matcher.service.ts)). Tầng response **dùng lại nguyên shape này**.
- **Không bao gồm `deletedAt`, `isActive`, `updatedAt`.**
- `deletedAt` và `isActive` **không mang giá trị thông tin trong preview**: preview chỉ xét rule chưa xóa và đang `isActive = true`, nên hai field này luôn là hằng số (`null` và `true`) ở mọi phần tử.
- `updatedAt` **không phải tiêu chí giải thích kết quả match** — nó không xuất hiện trong bất kỳ nấc tie-break nào ở mục 8.2.
- Sáu field giữ lại tương ứng đúng **4 nấc tie-break** của mục 8.2 (`priority`, `weight`, `createdAt`, `id`) cộng **2 field định danh** (`keyword` đã khớp, `targetClassification` là kết quả).

**Ràng buộc khi hiện thực Service:**

- Bản ghi Prisma `ClassificationRule` (9 cột) **phải được projection thành đúng 6 field trên TRƯỚC khi truyền vào `RuleMatcherService.match()`**.
- **Không được truyền object Prisma đầy đủ trực tiếp vào matcher.** `match()` dùng `.filter().sort()` nên giữ nguyên tham chiếu object; truyền nguyên bản ghi sẽ khiến `deletedAt` lọt ra response mà TypeScript không cảnh báo.
- **Không tạo thêm mapper `matchedRules` → response DTO** nếu không có yêu cầu mới. Một phép projection duy nhất ở đầu vào là đủ.

### 10.3 `vendor-summaries` — base `/vendor-summaries`

| # | Method | Endpoint | Mô tả | Quyền |
|---|---|---|---|---|
| 14 | POST | `/vendor-summaries` | Tạo bản tổng hợp mới (cấp `version` kế tiếp) | ADMIN, DEVELOPER |
| 15 | GET | `/vendor-summaries` | Danh sách + phân trang. Query: `vendorId`, `summaryType`, `isLatest`, `page`, `limit` | Tất cả |
| 16 | GET | `/vendor-summaries/:id` | Chi tiết một bản tổng hợp | Tất cả |
| 17 | GET | `/vendor-summaries/latest` | Bản mới nhất theo `vendorId` + `summaryType` | Tất cả |
| 18 | PATCH | `/vendor-summaries/:id` | Sửa nội dung. Chặn với `LLM_SUMMARY` | ADMIN, DEVELOPER |
| 19 | DELETE | `/vendor-summaries/:id` | Soft delete (set `deletedAt`); bản mới nhất tự lùi về `version` trước | ADMIN |

### 10.4 Sản phẩm không phải API

| Hạng mục | Vị trí | Ghi chú |
|---|---|---|
| ERD toàn hệ thống | `docs/erd.md` | Mermaid `erDiagram`; cập nhật mỗi khi bất kỳ ai đổi schema |
| Hỗ trợ slide PPT | `docs/` | Sơ đồ kiến trúc, luồng phân loại, demo 3 module trên |

**Ngoài phạm vi của tôi:** `auth`, `members`, `vendors`, `llm`, `statistics`, `classification-history`.
## 11. Workflow khi Claude thực hiện task

Mỗi task đều phải theo đúng quy trình sau:

1. Đọc lại CLAUDE.md.
2. Đọc toàn bộ file liên quan trước khi sửa.
3. Phân tích yêu cầu.
4. Liệt kê các file sẽ thay đổi.
5. Chỉ sửa đúng phạm vi được phép.
6. Không refactor ngoài yêu cầu.
7. Sau khi hoàn thành:
   - liệt kê các file đã sửa;
   - giải thích ngắn gọn từng thay đổi;
   - nêu các rủi ro hoặc ảnh hưởng nếu có.

Nếu yêu cầu có thể ảnh hưởng module khác thì phải cảnh báo trước khi sửa.
## 12. Khi chưa đủ thông tin

Nếu thiếu thông tin:

- Không tự đoán yêu cầu.
- Không tự thiết kế API mới.
- Không tự sửa schema dùng chung.
- Không tự sửa migration cũ.
- Không tự đổi business rule.

Ưu tiên:

1. dùng code hiện có;
2. dùng CLAUDE.md;
3. nếu vẫn chưa rõ thì hỏi lại hoặc nêu rõ giả định trước khi sinh code.
## 13. Review Mode

Nếu tôi yêu cầu:

- review
- audit
- kiểm tra
- đánh giá

thì:

Không sửa code.

Chỉ:

- tìm bug;
- tìm logic sai;
- tìm thiếu validation;
- tìm code smell;
- tìm lỗi REST API;
- tìm lỗi Prisma;
- tìm lỗi NestJS;
- đánh giá theo mức độ:
  - Critical
  - High
  - Medium
  - Low.

Không sinh code nếu tôi chưa yêu cầu.
## 14. Refactor Rules

Nếu được yêu cầu refactor:

- Không đổi API.
- Không đổi response.
- Không đổi schema.
- Không đổi business rule.
- Không đổi tên endpoint.

Chỉ:

- cải thiện cấu trúc;
- giảm lặp code;
- tăng khả năng đọc;
- áp dụng NestJS best practices.
## 15. Coding Principles

Ưu tiên theo thứ tự:

1. Đúng yêu cầu môn học.
2. Không ảnh hưởng module người khác.
3. Đơn giản.
4. Dễ bảo trì.
5. Dễ review.
6. Theo NestJS best practices.
7. Theo Prisma best practices.

Không tối ưu quá sớm.

Không thêm abstraction khi chưa cần.

Không thêm thư viện nếu có thể giải quyết bằng NestJS hoặc TypeScript.
