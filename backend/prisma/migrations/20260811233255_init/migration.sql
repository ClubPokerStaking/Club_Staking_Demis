-- CreateTable
CREATE TABLE "Organizer" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "siteName" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "buyerPasscodeHash" TEXT,
    "sheetUrl" TEXT,
    "etherscanKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organizer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "buyInMicro" DOUBLE PRECISION NOT NULL,
    "totalPercent" DOUBLE PRECISION NOT NULL,
    "markup" DOUBLE PRECISION NOT NULL,
    "maxBullets" INTEGER NOT NULL DEFAULT 1,
    "roiEstimado" DOUBLE PRECISION,
    "pricePerPercentMicro" DOUBLE PRECISION NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "walletAddressEvm" TEXT,
    "deadline" TEXT,
    "status" TEXT NOT NULL DEFAULT 'activo',
    "liveStatus" TEXT NOT NULL DEFAULT 'registro',
    "liveNote" TEXT NOT NULL DEFAULT '',
    "liveUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Purchase" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "buyerName" TEXT NOT NULL,
    "buyerContact" TEXT NOT NULL,
    "originWallet" TEXT,
    "percent" DOUBLE PRECISION NOT NULL,
    "baseAmountMicro" DOUBLE PRECISION NOT NULL,
    "uniqueAmountMicro" DOUBLE PRECISION NOT NULL,
    "network" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pendiente',
    "txHash" TEXT,
    "unreadOrganizer" INTEGER NOT NULL DEFAULT 0,
    "lastVerifyAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Purchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "purchaseId" TEXT NOT NULL,
    "sender" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organizer_slug_key" ON "Organizer"("slug");

-- CreateIndex
CREATE INDEX "Tournament_organizerId_idx" ON "Tournament"("organizerId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_code_key" ON "Purchase"("code");

-- CreateIndex
CREATE INDEX "Purchase_tournamentId_idx" ON "Purchase"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "Purchase_tournamentId_network_uniqueAmountMicro_key" ON "Purchase"("tournamentId", "network", "uniqueAmountMicro");

-- CreateIndex
CREATE INDEX "Message_purchaseId_idx" ON "Message"("purchaseId");

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "Organizer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "Purchase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
