-- AlterTable
ALTER TABLE "Purchase" ADD COLUMN     "packageId" TEXT,
ALTER COLUMN "tournamentId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalPercent" DOUBLE PRECISION NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletAddressEvm" TEXT,
    "deadline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "liveStatus" TEXT NOT NULL DEFAULT 'registro',
    "liveNote" TEXT NOT NULL DEFAULT '',
    "liveUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageLeg" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buyInMicro" DOUBLE PRECISION NOT NULL,
    "markup" DOUBLE PRECISION NOT NULL,
    "roiEstimado" DOUBLE PRECISION,
    "maxBullets" INTEGER NOT NULL DEFAULT 1,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PackageLeg_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Package_organizerId_idx" ON "Package"("organizerId");

-- CreateIndex
CREATE INDEX "PackageLeg_packageId_idx" ON "PackageLeg"("packageId");

-- CreateIndex
CREATE INDEX "Purchase_packageId_idx" ON "Purchase"("packageId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_packageId_network_uniqueAmountMicro_key" ON "Purchase"("packageId", "network", "uniqueAmountMicro");

-- AddForeignKey
ALTER TABLE "Package" ADD CONSTRAINT "Package_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageLeg" ADD CONSTRAINT "PackageLeg_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;
