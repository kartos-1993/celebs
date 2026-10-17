
import prisma from '../../config/db.prisma';
import { PathaoLocationClient } from '../../modules/logistics/adapters/pathao-location.client';
import { PathaoTokenProvider } from '../../modules/logistics/adapters/pathao-token.provider';
import { LogisticsLocationSyncService } from '../../modules/logistics/logistics-location-sync.service';

/**
 * Writes the courier's live city / zone / area lists into the local mirror.
 *
 * Unlike dump-pathao-locations (read-only), this WRITES to the database:
 * upserts served districts, retires ones the courier dropped, and records
 * per-area serviceability. Checkout and dispatch refuse addresses outside
 * active mirrored zones, so a fresh database cannot sell delivery until this
 * has run at least once.
 *
 * Safe to re-run: cities keep admin corrections (isValley), districts with
 * live addresses are retained, never closed.
 */

/* c8 ignore start -- entry point */
async function main(): Promise<void> {
  const client = new PathaoLocationClient(new PathaoTokenProvider());
  const summary = await new LogisticsLocationSyncService(client).sync();

  console.log('\n--- 📍 Pathao location sync ---');
  console.log(`    Cities synced              ${summary.cities}`);
  console.log(`    Zones synced               ${summary.zones}`);
  console.log(`    Areas synced               ${summary.areas}`);
  console.log(`    Districts deactivated      ${summary.deactivatedCities}`);
  if (summary.retainedForLiveAddresses.length > 0) {
    console.log('    Retained (live addresses, migrate manually):');
    for (const name of summary.retainedForLiveAddresses) {
      console.log(`      - ${name}`);
    }
  }
  console.log(`    Synced at                  ${summary.syncedAt.toISOString()}\n`);

  await prisma.$disconnect();
}

if (require.main === module) {
  main().catch((error: unknown) => {
    console.error('\n❌ Pathao location sync failed:', (error as Error).message);
    process.exitCode = 1;
  });
}
/* c8 ignore stop */
