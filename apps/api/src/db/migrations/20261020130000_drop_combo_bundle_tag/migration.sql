-- Drop the unused ComboBundle category tag. Every current value is NULL and no
-- storefront behavior reads it.
ALTER TABLE "ComboBundle" DROP COLUMN "tag";
