-- Product parcel weight and dimensions: DOUBLE PRECISION -> DECIMAL(8,3).
--
-- These four columns pick the courier's price band, so they sit on the money
-- path. A double cannot represent 0.3 exactly, nor 0.1 + 0.2, so a value stored
-- as a float can fall on the wrong side of a band edge that the same figure,
-- stored exactly, would not - and that figure is handed to a courier and later
-- reconciled against their statement.
--
-- The USING cast is required: PostgreSQL will not convert double to numeric
-- without it, and it rounds any existing value to three decimal places. A gram
-- is finer than a courier weighs, so nothing of consequence is lost.
ALTER TABLE "Product"
  ALTER COLUMN "package_weight_kg" TYPE DECIMAL(8,3) USING "package_weight_kg"::DECIMAL(8,3),
  ALTER COLUMN "package_weight_kg" SET DEFAULT 0.300;

ALTER TABLE "Product"
  ALTER COLUMN "package_length_cm" TYPE DECIMAL(8,3) USING "package_length_cm"::DECIMAL(8,3),
  ALTER COLUMN "package_width_cm" TYPE DECIMAL(8,3) USING "package_width_cm"::DECIMAL(8,3),
  ALTER COLUMN "package_height_cm" TYPE DECIMAL(8,3) USING "package_height_cm"::DECIMAL(8,3);