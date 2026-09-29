import { COMMERCE_POLICY_DEFAULTS, COMMERCE_SETTING_KEYS } from '@celebs/shared-types';

import prisma from '../../config/db.prisma';

/**
 * Platform-wide commerce policy — the business numbers that are not tied to a
 * delivery zone.
 *
 * The free-delivery threshold is deliberately absent: it is higher outside the
 * Kathmandu Valley, so it lives on the delivery city rather than here, and a
 * single platform-wide number would either over-promise in the valley or
 * overcharge everywhere else.
 */
const COMMERCE_SETTINGS = [
  {
    key: COMMERCE_SETTING_KEYS.codMaxLimit,
    value: String(COMMERCE_POLICY_DEFAULTS.codMaxLimit),
    label: 'Cash on Delivery maximum',
    description:
      'Highest order total that may be paid cash on delivery. A total above this is refused at checkout.',
  },
  {
    key: COMMERCE_SETTING_KEYS.flatShippingFee,
    value: String(COMMERCE_POLICY_DEFAULTS.flatShippingFee),
    label: 'Flat delivery fee (fallback)',
    description:
      'Delivery fee in NPR used when no rate matches a parcel, so checkout never fails for want of a price. Set 0 for free delivery.',
  },
] as const;

/**
 * Upsert on `key`, and only ever write the descriptive fields. An existing value
 * is left alone on purpose: re-seeding must never silently reset a limit a
 * platform admin deliberately raised.
 */
export async function seedCommerceSettings(): Promise<void> {
  console.log('\n--- 💳 Seeding Commerce Policy Settings ---');

  for (const setting of COMMERCE_SETTINGS) {
    const existing = await prisma.platformSetting.findUnique({ where: { key: setting.key } });

    if (existing) {
      // Descriptions are documentation; a value already in force is not ours
      // to overwrite.
      await prisma.platformSetting.update({
        where: { key: setting.key },
        data: { label: setting.label, description: setting.description, isPublic: true },
      });
      continue;
    }

    await prisma.platformSetting.create({
      data: {
        key: setting.key,
        value: setting.value,
        type: 'NUMBER',
        group: 'COMMERCE',
        label: setting.label,
        description: setting.description,
        // The mobile app reads these to display a total before the server
        // answers, so they must be reachable without authentication.
        isPublic: true,
      },
    });
  }

  console.log(`    ✓ ${COMMERCE_SETTINGS.length} commerce settings ensured`);
}
