-- Idempotent migration helper: when PriceTier still has the old
-- speciesId/breedId/varietyId columns (pre-FlockGroup refactor), drop
-- the three Vitrine tables so `prisma db push` can recreate them
-- with the new shape. Only runs once; later deploys skip the block.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'PriceTier'
      AND column_name = 'speciesId'
  ) THEN
    DROP TABLE IF EXISTS "VitrineListingPhoto" CASCADE;
    DROP TABLE IF EXISTS "VitrineListing" CASCADE;
    DROP TABLE IF EXISTS "PriceTier" CASCADE;
  END IF;
END
$$;
