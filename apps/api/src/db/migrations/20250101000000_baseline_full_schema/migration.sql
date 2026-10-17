-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CUSTOMER', 'VENDOR', 'STAFF', 'ADMIN', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'PACKED', 'HANDED_OVER', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED', 'RETURNED');

-- CreateEnum
CREATE TYPE "OrderItemStatus" AS ENUM ('PENDING', 'PACKED', 'HANDED_OVER', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('COD', 'KHALTI', 'ESEWA');

-- CreateEnum
CREATE TYPE "DeliveryPricingSource" AS ENUM ('RATE_CARD', 'FALLBACK');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "DispatchMode" AS ENUM ('MANUAL', 'AUTOMATED_3PL');

-- CreateEnum
CREATE TYPE "CodStatus" AS ENUM ('NOT_APPLICABLE', 'PENDING_COLLECTION', 'COLLECTED_BY_COURIER', 'COD_SETTLED');

-- CreateEnum
CREATE TYPE "LogisticsSource" AS ENUM ('BOOTSTRAP', 'COURIER');

-- CreateEnum
CREATE TYPE "ComboDiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CampaignType" AS ENUM ('FESTIVAL', 'SEASONAL', 'FLASH_SALE', 'HOLIDAY', 'NEW_YEAR');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "BrandTier" AS ENUM ('FIRST_PARTY', 'GATED_GLOBAL', 'REGISTERED_VENDOR', 'OPEN_GENERIC');

-- CreateEnum
CREATE TYPE "BrandAuthStatus" AS ENUM ('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "MediaScope" AS ENUM ('PRODUCT', 'BRANDING', 'KYC', 'MARKETING');

-- CreateEnum
CREATE TYPE "ReviewFitRating" AS ENUM ('RUNS_SMALL', 'TRUE_TO_SIZE', 'RUNS_LARGE');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('APPROVED', 'PENDING_MODERATION', 'REJECTED');

-- CreateEnum
CREATE TYPE "SettingType" AS ENUM ('BOOLEAN', 'NUMBER', 'STRING', 'JSON');

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "userAgent" TEXT,
    "rotated_refresh_id" TEXT,
    "previous_refresh_id" TEXT,
    "previous_issued_at" TIMESTAMP(3),
    "old_token_use_count" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiredAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + interval '30 days',

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CUSTOMER',
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isEmailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "vendorId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "shopName" TEXT NOT NULL,
    "shopDescription" TEXT,
    "panNumber" TEXT NOT NULL,
    "citizenshipNumber" TEXT NOT NULL,
    "panDocumentUrl" TEXT,
    "citizenshipDocumentUrl" TEXT,
    "ownerPhotoUrl" TEXT,
    "payoutDetails" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "availableBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "withholdingEscrow" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "currencyCode" TEXT NOT NULL DEFAULT 'NPR',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storeLogo" TEXT,
    "businessName" TEXT,
    "businessRegNumber" TEXT,
    "businessPhoneNumber" TEXT,
    "vatDocumentUrl" TEXT,
    "businessRegDocumentUrl" TEXT,
    "holidayMode" BOOLEAN NOT NULL DEFAULT false,
    "onboardingStep" INTEGER NOT NULL DEFAULT 1,
    "rejectionReason" TEXT,
    "store_code" TEXT,
    "recentCategories" JSONB DEFAULT '[]',

    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL,
    "responseBody" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL DEFAULT NOW() + interval '24 hours',

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreference" (
    "id" TEXT NOT NULL,
    "enable2FA" BOOLEAN NOT NULL DEFAULT false,
    "emailNotification" BOOLEAN NOT NULL DEFAULT true,
    "pushOrderUpdates" BOOLEAN NOT NULL DEFAULT true,
    "pushPromotions" BOOLEAN NOT NULL DEFAULT true,
    "pushPriceDrops" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorSecret" TEXT,
    "recentCategories" JSONB DEFAULT '[]',
    "userId" TEXT NOT NULL,

    CONSTRAINT "UserPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCode" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerificationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WishlistItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "priceAtWishlist" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WishlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "vendorProfileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "postalCode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Nepal',
    "isBusinessAddress" BOOLEAN NOT NULL DEFAULT false,
    "isReturnAddress" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInventory" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "color_variant_name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "reserved_quantity" INTEGER NOT NULL DEFAULT 0,
    "warehouse_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cart" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartItem" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "combo_bundle_id" TEXT,
    "applied_discount" DECIMAL(10,2),
    "discount_source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "label" TEXT NOT NULL DEFAULT 'Home',
    "full_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "alt_phone" TEXT,
    "province" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "city_area" TEXT NOT NULL,
    "street_address" TEXT NOT NULL,
    "landmark" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "logistics_zone_id" TEXT,
    "delivery_zone_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsCity" (
    "id" TEXT NOT NULL,
    "externalId" INTEGER,
    "name" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "is_valley" BOOLEAN NOT NULL DEFAULT false,
    "free_delivery_threshold" DECIMAL(12,2) NOT NULL DEFAULT 5000,
    "source" "LogisticsSource" NOT NULL DEFAULT 'BOOTSTRAP',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsCity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsZone" (
    "id" TEXT NOT NULL,
    "city_id" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsZone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LogisticsArea" (
    "id" TEXT NOT NULL,
    "zone_id" TEXT NOT NULL,
    "externalId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LogisticsArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShippingRate" (
    "id" TEXT NOT NULL,
    "city_id" TEXT,
    "min_weight_kg" DECIMAL(8,3) NOT NULL,
    "max_weight_kg" DECIMAL(8,3) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "cod_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "order_number" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "address_id" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shipping_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL,
    "courier_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "absorbed_shipping_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "delivery_pricing_source" "DeliveryPricingSource" NOT NULL DEFAULT 'FALLBACK',
    "matched_shipping_rate_id" TEXT,
    "logistics_zone_id" TEXT,
    "total_billable_weight_kg" DECIMAL(8,3),
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "payment_id" TEXT,
    "courierProvider" TEXT,
    "courierName" TEXT,
    "trackingNumber" TEXT,
    "trackingUrl" TEXT,
    "dispatchMode" "DispatchMode" NOT NULL DEFAULT 'MANUAL',
    "codAmount" DECIMAL(10,2),
    "codStatus" "CodStatus" NOT NULL DEFAULT 'NOT_APPLICABLE',
    "codSettledAt" TIMESTAMP(3),
    "codReference" TEXT,
    "estimatedDelivery" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderTrackingEvent" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "source" TEXT NOT NULL DEFAULT 'SYSTEM',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderTrackingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboBundle" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "bannerImage" TEXT,
    "discountType" "ComboDiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(10,2) NOT NULL,
    "isFirstParty" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "tag" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ComboBundle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComboBundleItem" (
    "id" TEXT NOT NULL,
    "bundleId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "defaultQuantity" INTEGER NOT NULL DEFAULT 1,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ComboBundleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "campaignType" "CampaignType" NOT NULL DEFAULT 'FESTIVAL',
    "tagline" TEXT,
    "bannerImage" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#D92525',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignProduct" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "discountType" "ComboDiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "discountValue" DECIMAL(10,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "inventory_id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "color_variant_name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "quantity" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "unit_weight_kg" DECIMAL(8,3) NOT NULL DEFAULT 0.5,
    "billable_weight_kg" DECIMAL(8,3) NOT NULL DEFAULT 0.5,
    "item_status" "OrderItemStatus" NOT NULL DEFAULT 'PENDING',
    "tracking_number" TEXT,
    "courier_partner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'NPR',
    "gateway" "PaymentMethod" NOT NULL,
    "transaction_id" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "raw_response" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "aggregate" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservationLedger" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "user_id" TEXT,
    "sku" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockReservationLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "description" TEXT,
    "story" TEXT,
    "country_of_origin" TEXT NOT NULL DEFAULT 'Nepal',
    "tier" "BrandTier" NOT NULL DEFAULT 'OPEN_GENERIC',
    "is_gated" BOOLEAN NOT NULL DEFAULT false,
    "owner_vendor_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorBrandAuthorization" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "status" "BrandAuthStatus" NOT NULL DEFAULT 'PENDING',
    "document_type" TEXT NOT NULL,
    "document_url" TEXT NOT NULL,
    "document_expiry_date" TIMESTAMP(3),
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "review_notes" TEXT,
    "rejection_reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorBrandAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BrandProtectionRule" (
    "id" TEXT NOT NULL,
    "brand_id" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "match_field" TEXT NOT NULL DEFAULT 'TITLE_AND_DESCRIPTION',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandProtectionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaFolder" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" TEXT NOT NULL,
    "vendor_id" TEXT,
    "folder_id" TEXT,
    "original_name" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size_bytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "aspect_ratio" DOUBLE PRECISION,
    "hash_sha256" TEXT,
    "scope" "MediaScope" NOT NULL DEFAULT 'PRODUCT',
    "is_private" BOOLEAN NOT NULL DEFAULT false,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "product_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "brandId" TEXT,
    "slug" TEXT NOT NULL,
    "description" TEXT DEFAULT '',
    "price" DECIMAL(12,2) NOT NULL,
    "discountedPrice" DECIMAL(12,2),
    "status" TEXT NOT NULL DEFAULT 'draft',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "mainImages" TEXT[],
    "tags" TEXT[],
    "sizes" JSONB,
    "colorVariants" JSONB,
    "skus" JSONB,
    "variantOptions" JSONB,
    "dynamicData" JSONB,
    "package_weight_kg" DOUBLE PRECISION DEFAULT 0.3,
    "package_length_cm" DOUBLE PRECISION,
    "package_width_cm" DOUBLE PRECISION,
    "package_height_cm" DOUBLE PRECISION,
    "packaging_type" TEXT DEFAULT 'FLYER_SMALL',
    "is_fragile" BOOLEAN NOT NULL DEFAULT false,
    "has_battery_or_liquid" BOOLEAN NOT NULL DEFAULT false,
    "warranty_type" TEXT NOT NULL DEFAULT 'NO_WARRANTY',
    "warranty_period" TEXT,
    "warranty_policy" TEXT,
    "is_non_returnable" BOOLEAN NOT NULL DEFAULT false,
    "qualityScore" DOUBLE PRECISION,
    "reviewNote" TEXT,
    "rejectionReasonCategory" TEXT,
    "rejectionSubcategories" TEXT[],
    "rejectionFields" TEXT[],
    "reviewHistory" JSONB,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "vendorId" TEXT,
    "vendorName" TEXT,
    "categoryId" TEXT NOT NULL,
    "subcategoryId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "path" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "parentCategory" TEXT,
    "attributes" JSONB,
    "sizeChartColumns" TEXT[],
    "bodyChartColumns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "imageUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "order_id" TEXT,
    "order_item_id" TEXT,
    "inventory_id" TEXT,
    "user_name" TEXT NOT NULL,
    "user_avatar" TEXT,
    "rating" INTEGER NOT NULL,
    "fit_rating" "ReviewFitRating" NOT NULL DEFAULT 'TRUE_TO_SIZE',
    "comment" TEXT NOT NULL,
    "images" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "color_variant_name" TEXT,
    "size" TEXT,
    "variant_snapshot" JSONB,
    "helpful_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ReviewStatus" NOT NULL DEFAULT 'APPROVED',
    "is_verified_purchase" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewLike" (
    "id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductReviewSummary" (
    "product_id" TEXT NOT NULL,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0.0,
    "total_reviews" INTEGER NOT NULL DEFAULT 0,
    "ratings_count" INTEGER NOT NULL DEFAULT 0,
    "with_images_count" INTEGER NOT NULL DEFAULT 0,
    "rating_distribution" JSONB NOT NULL DEFAULT '{"1":0,"2":0,"3":0,"4":0,"5":0}',
    "fit_distribution" JSONB NOT NULL DEFAULT '{"trueToSize":0,"runsSmall":0,"runsLarge":0}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductReviewSummary_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "OptionSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "description" TEXT,
    "options" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OptionSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuickFilter" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT,
    "filterConfig" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickFilter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "targetUrl" TEXT,
    "position" TEXT NOT NULL DEFAULT 'home_hero',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" "SettingType" NOT NULL DEFAULT 'BOOLEAN',
    "group" TEXT NOT NULL DEFAULT 'GENERAL',
    "label" TEXT NOT NULL,
    "description" TEXT,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "PlatformSettingAudit" (
    "id" TEXT NOT NULL,
    "setting_key" TEXT NOT NULL,
    "old_value" TEXT,
    "new_value" TEXT NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformSettingAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PushToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'android',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vendorId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "pushStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "channel" TEXT NOT NULL DEFAULT 'PUSH',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiredAt_idx" ON "Session"("expiredAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_vendorId_idx" ON "User"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_userId_key" ON "VendorProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_phoneNumber_key" ON "VendorProfile"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_shopName_key" ON "VendorProfile"("shopName");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_panNumber_key" ON "VendorProfile"("panNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_citizenshipNumber_key" ON "VendorProfile"("citizenshipNumber");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_store_code_key" ON "VendorProfile"("store_code");

-- CreateIndex
CREATE INDEX "VendorProfile_status_idx" ON "VendorProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_key_key" ON "IdempotencyKey"("key");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreference_userId_key" ON "UserPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationCode_code_key" ON "VerificationCode"("code");

-- CreateIndex
CREATE INDEX "VerificationCode_userId_idx" ON "VerificationCode"("userId");

-- CreateIndex
CREATE INDEX "WishlistItem_userId_createdAt_idx" ON "WishlistItem"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WishlistItem_productId_idx" ON "WishlistItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "WishlistItem_userId_productId_key" ON "WishlistItem"("userId", "productId");

-- CreateIndex
CREATE INDEX "Warehouse_vendorProfileId_idx" ON "Warehouse"("vendorProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_sku_key" ON "ProductInventory"("sku");

-- CreateIndex
CREATE INDEX "ProductInventory_product_id_quantity_idx" ON "ProductInventory"("product_id", "quantity");

-- CreateIndex
CREATE INDEX "ProductInventory_warehouse_id_idx" ON "ProductInventory"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductInventory_product_id_color_variant_name_size_key" ON "ProductInventory"("product_id", "color_variant_name", "size");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_user_id_key" ON "Cart"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_session_id_key" ON "Cart"("session_id");

-- CreateIndex
CREATE INDEX "Cart_updatedAt_idx" ON "Cart"("updatedAt");

-- CreateIndex
CREATE INDEX "CartItem_inventory_id_idx" ON "CartItem"("inventory_id");

-- CreateIndex
CREATE INDEX "CartItem_combo_bundle_id_idx" ON "CartItem"("combo_bundle_id");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cart_id_inventory_id_key" ON "CartItem"("cart_id", "inventory_id");

-- CreateIndex
CREATE INDEX "Address_user_id_idx" ON "Address"("user_id");

-- CreateIndex
CREATE INDEX "Address_logistics_zone_id_idx" ON "Address"("logistics_zone_id");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsCity_externalId_key" ON "LogisticsCity"("externalId");

-- CreateIndex
CREATE INDEX "LogisticsCity_is_active_is_valley_idx" ON "LogisticsCity"("is_active", "is_valley");

-- CreateIndex
CREATE INDEX "LogisticsCity_province_idx" ON "LogisticsCity"("province");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsZone_externalId_key" ON "LogisticsZone"("externalId");

-- CreateIndex
CREATE INDEX "LogisticsZone_city_id_is_active_idx" ON "LogisticsZone"("city_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "LogisticsArea_externalId_key" ON "LogisticsArea"("externalId");

-- CreateIndex
CREATE INDEX "LogisticsArea_zone_id_is_active_idx" ON "LogisticsArea"("zone_id", "is_active");

-- CreateIndex
CREATE INDEX "ShippingRate_city_id_is_active_min_weight_kg_idx" ON "ShippingRate"("city_id", "is_active", "min_weight_kg");

-- CreateIndex
CREATE INDEX "ShippingRate_is_active_min_weight_kg_idx" ON "ShippingRate"("is_active", "min_weight_kg");

-- CreateIndex
CREATE UNIQUE INDEX "Order_order_number_key" ON "Order"("order_number");

-- CreateIndex
CREATE INDEX "Order_address_id_idx" ON "Order"("address_id");

-- CreateIndex
CREATE INDEX "Order_user_id_status_idx" ON "Order"("user_id", "status");

-- CreateIndex
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");

-- CreateIndex
CREATE INDEX "OrderTrackingEvent_orderId_idx" ON "OrderTrackingEvent"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "ComboBundle_slug_key" ON "ComboBundle"("slug");

-- CreateIndex
CREATE INDEX "ComboBundle_isActive_slug_idx" ON "ComboBundle"("isActive", "slug");

-- CreateIndex
CREATE INDEX "ComboBundleItem_productId_idx" ON "ComboBundleItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ComboBundleItem_bundleId_productId_key" ON "ComboBundleItem"("bundleId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_slug_key" ON "Campaign"("slug");

-- CreateIndex
CREATE INDEX "Campaign_isActive_startDate_endDate_idx" ON "Campaign"("isActive", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "CampaignProduct_productId_idx" ON "CampaignProduct"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignProduct_campaignId_productId_key" ON "CampaignProduct"("campaignId", "productId");

-- CreateIndex
CREATE INDEX "OrderItem_order_id_idx" ON "OrderItem"("order_id");

-- CreateIndex
CREATE INDEX "OrderItem_vendor_id_idx" ON "OrderItem"("vendor_id");

-- CreateIndex
CREATE INDEX "OrderItem_inventory_id_idx" ON "OrderItem"("inventory_id");

-- CreateIndex
CREATE INDEX "OrderItem_vendor_id_item_status_idx" ON "OrderItem"("vendor_id", "item_status");

-- CreateIndex
CREATE INDEX "OrderItem_vendor_id_createdAt_idx" ON "OrderItem"("vendor_id", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transaction_id_key" ON "Payment"("transaction_id");

-- CreateIndex
CREATE INDEX "Payment_order_id_idx" ON "Payment"("order_id");

-- CreateIndex
CREATE INDEX "Payment_user_id_idx" ON "Payment"("user_id");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_createdAt_idx" ON "OutboxEvent"("status", "createdAt");

-- CreateIndex
CREATE INDEX "StockReservationLedger_sku_status_idx" ON "StockReservationLedger"("sku", "status");

-- CreateIndex
CREATE INDEX "StockReservationLedger_expires_at_idx" ON "StockReservationLedger"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE INDEX "Brand_tier_is_gated_idx" ON "Brand"("tier", "is_gated");

-- CreateIndex
CREATE INDEX "Brand_owner_vendor_id_idx" ON "Brand"("owner_vendor_id");

-- CreateIndex
CREATE INDEX "VendorBrandAuthorization_vendor_id_status_idx" ON "VendorBrandAuthorization"("vendor_id", "status");

-- CreateIndex
CREATE INDEX "VendorBrandAuthorization_brand_id_status_idx" ON "VendorBrandAuthorization"("brand_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VendorBrandAuthorization_vendor_id_brand_id_key" ON "VendorBrandAuthorization"("vendor_id", "brand_id");

-- CreateIndex
CREATE INDEX "BrandProtectionRule_brand_id_is_active_idx" ON "BrandProtectionRule"("brand_id", "is_active");

-- CreateIndex
CREATE INDEX "MediaFolder_vendor_id_idx" ON "MediaFolder"("vendor_id");

-- CreateIndex
CREATE INDEX "MediaFolder_parent_id_idx" ON "MediaFolder"("parent_id");

-- CreateIndex
CREATE UNIQUE INDEX "MediaFolder_vendor_id_parent_id_name_key" ON "MediaFolder"("vendor_id", "parent_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MediaAsset_key_key" ON "MediaAsset"("key");

-- CreateIndex
CREATE INDEX "MediaAsset_vendor_id_scope_idx" ON "MediaAsset"("vendor_id", "scope");

-- CreateIndex
CREATE INDEX "MediaAsset_vendor_id_folder_id_idx" ON "MediaAsset"("vendor_id", "folder_id");

-- CreateIndex
CREATE INDEX "MediaAsset_vendor_id_hash_sha256_idx" ON "MediaAsset"("vendor_id", "hash_sha256");

-- CreateIndex
CREATE INDEX "MediaAsset_vendor_id_createdAt_idx" ON "MediaAsset"("vendor_id", "createdAt");

-- CreateIndex
CREATE INDEX "MediaAsset_product_id_idx" ON "MediaAsset"("product_id");

-- CreateIndex
CREATE INDEX "MediaAsset_folder_id_idx" ON "MediaAsset"("folder_id");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_subcategoryId_idx" ON "Product"("subcategoryId");

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_categoryId_status_idx" ON "Product"("categoryId", "status");

-- CreateIndex
CREATE INDEX "Product_status_createdAt_idx" ON "Product"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentCategory_idx" ON "Category"("parentCategory");

-- CreateIndex
CREATE UNIQUE INDEX "Review_order_item_id_key" ON "Review"("order_item_id");

-- CreateIndex
CREATE INDEX "Review_product_id_status_rating_idx" ON "Review"("product_id", "status", "rating");

-- CreateIndex
CREATE INDEX "Review_product_id_status_createdAt_idx" ON "Review"("product_id", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Review_user_id_idx" ON "Review"("user_id");

-- CreateIndex
CREATE INDEX "Review_order_id_idx" ON "Review"("order_id");

-- CreateIndex
CREATE INDEX "ReviewLike_user_id_idx" ON "ReviewLike"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewLike_review_id_user_id_key" ON "ReviewLike"("review_id", "user_id");

-- CreateIndex
CREATE INDEX "ProductReviewSummary_average_rating_idx" ON "ProductReviewSummary"("average_rating");

-- CreateIndex
CREATE UNIQUE INDEX "OptionSet_name_key" ON "OptionSet"("name");

-- CreateIndex
CREATE UNIQUE INDEX "QuickFilter_slug_key" ON "QuickFilter"("slug");

-- CreateIndex
CREATE INDEX "QuickFilter_categoryId_idx" ON "QuickFilter"("categoryId");

-- CreateIndex
CREATE INDEX "PlatformSetting_group_idx" ON "PlatformSetting"("group");

-- CreateIndex
CREATE INDEX "PlatformSetting_is_public_idx" ON "PlatformSetting"("is_public");

-- CreateIndex
CREATE INDEX "PlatformSettingAudit_setting_key_createdAt_idx" ON "PlatformSettingAudit"("setting_key", "createdAt");

-- CreateIndex
CREATE INDEX "PushToken_token_idx" ON "PushToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "PushToken_userId_token_key" ON "PushToken"("userId", "token");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_userId_read_idx" ON "Notification"("userId", "read");

-- CreateIndex
CREATE INDEX "Notification_vendorId_createdAt_idx" ON "Notification"("vendorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "Notification_pushStatus_idx" ON "Notification"("pushStatus");

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreference" ADD CONSTRAINT "UserPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCode" ADD CONSTRAINT "VerificationCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WishlistItem" ADD CONSTRAINT "WishlistItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_vendorProfileId_fkey" FOREIGN KEY ("vendorProfileId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductInventory" ADD CONSTRAINT "ProductInventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "ProductInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_combo_bundle_id_fkey" FOREIGN KEY ("combo_bundle_id") REFERENCES "ComboBundle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_logistics_zone_id_fkey" FOREIGN KEY ("logistics_zone_id") REFERENCES "LogisticsZone"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsZone" ADD CONSTRAINT "LogisticsZone_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "LogisticsCity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LogisticsArea" ADD CONSTRAINT "LogisticsArea_zone_id_fkey" FOREIGN KEY ("zone_id") REFERENCES "LogisticsZone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShippingRate" ADD CONSTRAINT "ShippingRate_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "LogisticsCity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "Address"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderTrackingEvent" ADD CONSTRAINT "OrderTrackingEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComboBundleItem" ADD CONSTRAINT "ComboBundleItem_bundleId_fkey" FOREIGN KEY ("bundleId") REFERENCES "ComboBundle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignProduct" ADD CONSTRAINT "CampaignProduct_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "ProductInventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "VendorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_owner_vendor_id_fkey" FOREIGN KEY ("owner_vendor_id") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBrandAuthorization" ADD CONSTRAINT "VendorBrandAuthorization_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorBrandAuthorization" ADD CONSTRAINT "VendorBrandAuthorization_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BrandProtectionRule" ADD CONSTRAINT "BrandProtectionRule_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaFolder" ADD CONSTRAINT "MediaFolder_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "MediaFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_folder_id_fkey" FOREIGN KEY ("folder_id") REFERENCES "MediaFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentCategory_fkey" FOREIGN KEY ("parentCategory") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "OrderItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewLike" ADD CONSTRAINT "ReviewLike_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductReviewSummary" ADD CONSTRAINT "ProductReviewSummary_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlatformSettingAudit" ADD CONSTRAINT "PlatformSettingAudit_setting_key_fkey" FOREIGN KEY ("setting_key") REFERENCES "PlatformSetting"("key") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PushToken" ADD CONSTRAINT "PushToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

