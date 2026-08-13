import 'dotenv/config';
import bcrypt from 'bcrypt';
import pg from 'pg';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// ---------------------------------------------------------------- members
const members = [
  ['admin@genievina.com', 'Admin@123', 'Nguyen Van Admin', 'ADMIN'],
  ['dev@genievina.com', 'Dev@123', 'Tran Thi Dev', 'DEVELOPER'],
  ['reviewer@genievina.com', 'Reviewer@123', 'Le Van Reviewer', 'REVIEWER'],
];

for (const [email, password, name, role] of members) {
  const hash = await bcrypt.hash(password, 10);
  await client.query(
    `INSERT INTO members (email, password, name, role)
     VALUES ($1, $2, $3, $4::"Role")
     ON CONFLICT (email) DO UPDATE
       SET password = EXCLUDED.password, name = EXCLUDED.name, role = EXCLUDED.role`,
    [email, hash, name, role],
  );
}

// ------------------------------------------------- classification_rules
// Năm tiêu chí chuẩn của đề bài.
const rules = [
  ['OUTSOURCING_VENDOR', 'software outsourcing or project-based development vendor',
    'Công ty nhận gia công phần mềm hoặc phát triển theo dự án cho khách hàng.',
    ['outsourcing', 'offshore development', 'staff augmentation', 'gia công phần mềm'], 10],
  ['SI_COMPANY', 'enterprise system implementation, integration, and maintenance',
    'Công ty triển khai, tích hợp và bảo trì hệ thống cho doanh nghiệp.',
    ['system integration', 'erp', 'implementation', 'tich hop he thong'], 20],
  ['PRODUCT_COMPANY', 'owns SaaS, platform, solution, or software product',
    'Công ty sở hữu sản phẩm phần mềm, nền tảng hoặc giải pháp của riêng mình.',
    ['saas', 'platform', 'product', 'san pham phan mem'], 30],
  ['CONSULTING_IT_SERVICE', 'IT consulting, operation, project management, or advisory',
    'Công ty tư vấn CNTT, vận hành, quản trị dự án hoặc cố vấn.',
    ['consulting', 'advisory', 'project management', 'tu van'], 40],
  ['SPECIALIZED_TECH_VENDOR', 'AI, Cloud, Data, Cybersecurity, Blockchain, etc.',
    'Công ty chuyên sâu một mảng công nghệ như AI, Cloud, Data, An ninh mạng, Blockchain.',
    ['ai', 'cloud', 'data', 'cybersecurity', 'blockchain'], 50],
];

for (const [name, description, criteria, keywords, priority] of rules) {
  await client.query(
    `INSERT INTO classification_rules
       ("classificationName", description, "judgmentCriteria", keywords, priority, weight, "updatedAt")
     VALUES ($1::"VendorClassification", $2, $3, $4, $5, 1, now())
     ON CONFLICT ("classificationName") DO UPDATE
       SET description = EXCLUDED.description,
           "judgmentCriteria" = EXCLUDED."judgmentCriteria",
           keywords = EXCLUDED.keywords,
           priority = EXCLUDED.priority,
           "updatedAt" = now()`,
    [name, description, criteria, keywords, priority],
  );
}

// ---------------------------------------------------------------- vendors
const vendors = [
  ['V001', 'FPT Software', 'https://fptsoftware.com', 'Hanoi', 'OUTSOURCING',
    'Java, .NET, React, AWS', 'Finance, Automotive, Healthcare', 'EN, JP, KO',
    '1000+', 'OUTSOURCING_VENDOR', null],
  ['V002', 'Base.vn', 'https://base.vn', 'Hanoi', 'PRODUCT',
    'Go, Vue, PostgreSQL', 'SaaS quản trị doanh nghiệp', 'VI, EN',
    '100-500', 'PRODUCT_COMPANY', null],
  ['V003', 'Rikkeisoft', 'https://rikkeisoft.com', 'Hanoi', 'OUTSOURCING',
    'Java, PHP, AI/ML', 'Game, Fintech', 'EN, JP',
    '1000+', 'OUTSOURCING_VENDOR', null],
  ['V004', 'CMC Global', null, 'Hanoi', 'SI',
    'SAP, Oracle, Cloud', 'Banking, Telecom', 'EN, JP',
    '500-1000', 'SI_COMPANY', 'demo data - chua doi chieu nguon cong khai'],
];

for (const v of vendors) {
  await client.query(
    `INSERT INTO vendors
       ("vendorCode","companyName",website,location,"serviceType","techStack",
        "industryExperience","languageCapability","companySize",classification,note,"updatedAt")
     VALUES ($1,$2,$3,$4,$5::"ServiceType",$6,$7,$8,$9,$10::"VendorClassification",$11, now())
     ON CONFLICT ("vendorCode") DO UPDATE
       SET "companyName" = EXCLUDED."companyName", "updatedAt" = now()`,
    v,
  );
}

// --------------------------------------------------------- vendor_sources
const { rows: vendorRows } = await client.query(
  'SELECT id, "vendorCode" FROM vendors ORDER BY id',
);
const byCode = Object.fromEntries(vendorRows.map((r) => [r.vendorCode, r.id]));

await client.query('DELETE FROM vendor_sources');
const sources = [
  [byCode.V001, 'PUBLIC_WEBSITE', 'https://fptsoftware.com/about-us', 'About FPT Software', null],
  [byCode.V001, 'LINKEDIN', 'https://www.linkedin.com/company/fpt-software', 'FPT Software on LinkedIn', null],
  [byCode.V002, 'PUBLIC_WEBSITE', 'https://base.vn/about', 'Gioi thieu Base.vn', null],
  [byCode.V003, 'ARTICLE', 'https://vnexpress.net/rikkeisoft-example', 'Bai bao ve Rikkeisoft', null],
  // Không có URL công khai nên bắt buộc phải khai rõ là dữ liệu demo.
  [byCode.V004, 'DEMO_DATA', null, null, 'demo data - khong co nguon cong khai cho ban ghi giao duc nay'],
];

for (const [vendorId, type, url, title, memo] of sources) {
  await client.query(
    `INSERT INTO vendor_sources ("vendorId","sourceType","sourceUrl","sourceTitle","checkedAt",memo)
     VALUES ($1,$2::"SourceType",$3,$4,now(),$5)`,
    [vendorId, type, url, title, memo],
  );
}

// ------------------------------------------------------- vendor_summaries
const { rows: memberRows } = await client.query(
  "SELECT id, role FROM members WHERE role = 'DEVELOPER' ORDER BY id LIMIT 1",
);
const devId = memberRows[0].id;

await client.query('DELETE FROM vendor_summaries');
const summaries = [
  [byCode.V001, 'PROFILE_SUMMARY',
    'Nha cung cap gia cong phan mem quy mo lon tai Ha Noi, manh ve Java va AWS, co nang luc tieng Nhat.'],
  [byCode.V002, 'MANUAL_NOTE',
    'So huu san pham SaaS quan tri doanh nghiep, khong nhan gia cong theo du an.'],
];

for (const [vendorId, type, content] of summaries) {
  await client.query(
    `INSERT INTO vendor_summaries ("vendorId","summaryType",content,"createdById")
     VALUES ($1,$2::"SummaryType",$3,$4)`,
    [vendorId, type, content, devId],
  );
}

// ----------------------------------------------------------------- report
const count = async (t) =>
  (await client.query(`SELECT count(*)::int AS n FROM ${t}`)).rows[0].n;

console.log('\nSeed xong:');
console.log(`  members             ${await count('members')}`);
console.log(`  classification_rules ${await count('classification_rules')}`);
console.log(`  vendors             ${await count('vendors')}`);
console.log(`  vendor_sources      ${await count('vendor_sources')}`);
console.log(`  vendor_summaries    ${await count('vendor_summaries')}`);
console.log('\nTai khoan demo:');
for (const [email, password, , role] of members) {
  console.log(`  ${role.padEnd(10)} ${email.padEnd(26)} ${password}`);
}

await client.end();
