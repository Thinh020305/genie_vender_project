-- CreateTable
CREATE TABLE "vendors" (
    "id" SERIAL NOT NULL,
    "vendorCode" VARCHAR(50) NOT NULL,
    "companyName" VARCHAR(255) NOT NULL,
    "website" VARCHAR(255),
    "location" VARCHAR(255) NOT NULL,
    "serviceType" "ServiceType" NOT NULL,
    "techStack" TEXT NOT NULL,
    "industryExperience" TEXT NOT NULL,
    "languageCapability" VARCHAR(255) NOT NULL,
    "companySize" VARCHAR(100) NOT NULL,
    "classification" "VendorClassification" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendors_vendorCode_key" ON "vendors"("vendorCode");
