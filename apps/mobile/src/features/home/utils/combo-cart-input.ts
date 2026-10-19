import type { AddComboToCartInput } from '@celebs/shared-types';

import type { ComboBundleData, ComboSelectedVariants } from '../types';

import { getComboDisplayItems } from './combo-bundle-helpers';

/**
 * Turns the modal's per-bundle-item selection into the server's combo payload.
 *
 * The selection map is keyed by the bundle-item id, not the product id — the
 * server matches `productId`, so every row is resolved through
 * `getComboDisplayItems`. Quantity is deliberately omitted: the cart service
 * applies each bundle item's authored `defaultQuantity`.
 *
 * Incomplete selections fail here, before the request. The server resolves a
 * missing size/colour as a zero-stock inventory row and reports it as an
 * "insufficient stock" error, which hides the real cause.
 */
export function buildComboCartInput(
  combo: ComboBundleData,
  selectedVariants: ComboSelectedVariants,
): AddComboToCartInput {
  const declaredItems = combo.itemDetails ?? combo.items ?? [];
  if (declaredItems.length === 0) {
    throw new Error('This combo has no items to add.');
  }

  const displayItems = getComboDisplayItems(combo);
  if (displayItems.length !== declaredItems.length) {
    throw new Error(
      'Some items in this combo are unavailable right now. Please try another bundle.',
    );
  }

  const items = displayItems.map((item) => {
    const selection = selectedVariants[item.id];

    if (!selection?.size) {
      throw new Error(`Choose a size for ${item.name || 'this item'}.`);
    }
    if (!selection.color) {
      throw new Error(`Choose a color for ${item.name || 'this item'}.`);
    }

    return {
      productId: item.productId,
      colorVariantName: selection.color,
      size: selection.size,
    };
  });

  return { comboBundleId: combo.id, items };
}
