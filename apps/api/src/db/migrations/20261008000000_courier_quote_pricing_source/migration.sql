-- Record that the courier priced the delivery, and hold the cash-handling figures
-- that go with it.
--
-- DeliveryPricingSource gains COURIER_QUOTE alongside RATE_CARD and FALLBACK. The
-- two existing values mean "we picked a band ourselves"; this one means the courier
-- told us. Keeping it on the order means a settlement that disagrees can be traced
-- to a source rather than argued about - an order priced from a hand-entered band
-- and one priced from Pathao are not the same kind of claim, and only the order
-- itself can say which it was.
--
-- cod_handling_fee and amount_to_collect are stored as money rather than derived
-- from a rate later. The handling fee is a percentage of what the courier collects,
-- and "what they collect" is not a function of the rate alone: once a
-- free-delivery threshold waived the delivery charge, the fee is a percentage of
-- the goods only. A single rate column cannot distinguish the two cases, so an
-- order priced under the waiver could never be reconstructed from one.

ALTER TYPE "DeliveryPricingSource" ADD VALUE 'COURIER_QUOTE';

-- The courier's percentage charge for collecting cash, passed to the customer at
-- cost. Zero on prepaid orders.
ALTER TABLE "Order" ADD COLUMN "cod_handling_fee" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- What the courier is instructed to collect: goods plus delivery plus handling.
-- The courier reconciles against this figure, so it has to be the number we gave
-- them rather than something recomputed later. Null on prepaid orders, where
-- nothing is collected.
ALTER TABLE "Order" ADD COLUMN "amount_to_collect" DECIMAL(12,2);
