-- CreateTable
CREATE TABLE "business_profile_payments" (
    "id" TEXT NOT NULL,
    "mobileUserId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "amount" INTEGER NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "type" TEXT NOT NULL DEFAULT 'BUSINESS_PROFILE',
    "receipt" TEXT,
    "razorpaySignature" TEXT,
    "metadata" JSONB,
    "expiresAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_profile_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "business_profile_payments_orderId_key" ON "business_profile_payments"("orderId");

-- CreateIndex
CREATE INDEX "idx_business_profile_payments_user_status_type" ON "business_profile_payments"("mobileUserId", "status", "type");

-- AddForeignKey
ALTER TABLE "business_profile_payments" ADD CONSTRAINT "business_profile_payments_mobileUserId_fkey" FOREIGN KEY ("mobileUserId") REFERENCES "mobile_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

