// Paste toàn bộ nội dung này vào https://dbdiagram.io

Table vendors {
  id bigint [pk, increment]
  vendorCode varchar [unique, not null]
  companyName varchar [not null]
  website varchar
  location varchar [not null]
  serviceType varchar [not null, note: 'OUTSOURCING / SI / PRODUCT / CONSULTING / SPECIALIZED_TECH']
  techStack varchar [not null]
  industryExperience varchar
  languageCapability varchar
  companySize varchar
  classification varchar
  note varchar
  createdAt timestamp [not null, default: `now()`]
  updatedAt timestamp
}

Table vendor_sources {
  id bigint [pk, increment]
  vendorId bigint [not null]
  sourceType varchar [not null, note: 'PUBLIC_WEBSITE / DIRECTORY / LINKEDIN / ARTICLE / DEMO_DATA']
  sourceUrl varchar
  sourceTitle varchar
  checkedAt timestamp
  memo varchar
}

Table classification_rules {
  id bigint [pk, increment]
  classificationName varchar [not null]
  description varchar
  judgmentCriteria varchar
  createdAt timestamp [not null, default: `now()`]
}

Table classification_histories {
  id bigint [pk, increment]
  vendorId bigint [not null]
  changedBy bigint [not null]
  previousClassification varchar
  newClassification varchar [not null]
  changedAt timestamp [not null, default: `now()`]
  reason varchar
}

Table vendor_summaries {
  id bigint [pk, increment]
  vendorId bigint [not null]
  summaryType varchar [not null, note: 'PROFILE_SUMMARY / LLM_SUMMARY / MANUAL_NOTE']
  content text
  createdBy bigint [not null]
  createdAt timestamp [not null, default: `now()`]
}

Table members {
  id bigint [pk, increment]
  email varchar [unique, not null]
  password varchar [not null]
  name varchar [not null]
  role varchar [not null, note: 'ADMIN / DEVELOPER / REVIEWER']
  createdAt timestamp [not null, default: `now()`]
}

// Quan hệ
Ref: vendor_sources.vendorId > vendors.id
Ref: classification_histories.vendorId > vendors.id
Ref: classification_histories.changedBy > members.id
Ref: vendor_summaries.vendorId > vendors.id
Ref: vendor_summaries.createdBy > members.id

