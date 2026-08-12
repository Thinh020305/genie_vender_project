-- CreateTable
CREATE TABLE "classification_histories" (
    "id" TEXT NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "changedById" INTEGER NOT NULL,
    "previousClassification" "VendorClassification" NOT NULL,
    "newClassification" "VendorClassification" NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "classification_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classification_rules" (
    "id" SERIAL NOT NULL,
    "classificationName" "VendorClassification" NOT NULL,
    "description" VARCHAR(500),
    "judgmentCriteria" VARCHAR(1000),
    "keywords" TEXT[],
    "priority" INTEGER NOT NULL DEFAULT 100,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_sources" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "sourceType" "SourceType" NOT NULL,
    "sourceUrl" VARCHAR(2048),
    "sourceTitle" VARCHAR(500),
    "checkedAt" TIMESTAMP(3),
    "memo" VARCHAR(1000),

    CONSTRAINT "vendor_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_summaries" (
    "id" SERIAL NOT NULL,
    "vendorId" INTEGER NOT NULL,
    "summaryType" "SummaryType" NOT NULL,
    "content" TEXT,
    "createdById" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_summaries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "classification_histories_vendorId_idx" ON "classification_histories"("vendorId");

-- CreateIndex
CREATE INDEX "classification_histories_changedAt_idx" ON "classification_histories"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "classification_rules_classificationName_key" ON "classification_rules"("classificationName");

-- CreateIndex
CREATE INDEX "classification_rules_priority_idx" ON "classification_rules"("priority");

-- CreateIndex
CREATE INDEX "vendor_sources_vendorId_idx" ON "vendor_sources"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_sources_sourceType_idx" ON "vendor_sources"("sourceType");

-- CreateIndex
CREATE INDEX "vendor_summaries_vendorId_idx" ON "vendor_summaries"("vendorId");

-- CreateIndex
CREATE INDEX "vendor_summaries_vendorId_summaryType_idx" ON "vendor_summaries"("vendorId", "summaryType");

-- CreateIndex
CREATE INDEX "vendor_summaries_createdById_idx" ON "vendor_summaries"("createdById");

-- CreateIndex
CREATE INDEX "vendor_summaries_createdAt_idx" ON "vendor_summaries"("createdAt");

-- AddForeignKey
ALTER TABLE "classification_histories" ADD CONSTRAINT "classification_histories_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classification_histories" ADD CONSTRAINT "classification_histories_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_sources" ADD CONSTRAINT "vendor_sources_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_summaries" ADD CONSTRAINT "vendor_summaries_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vendor_summaries" ADD CONSTRAINT "vendor_summaries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
