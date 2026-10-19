/** Horizontal padding on each side of the two-column product grid. */
export const PRODUCT_GRID_PADDING = 12;

/** Gap between the two product-grid columns. */
export const PRODUCT_COLUMN_GAP = 6;

/**
 * The standard product card width. Shared by the product grid and the combo
 * card so an inline combo card lines up with the catalogue around it.
 */
export function getProductCardWidth(windowWidth: number): number {
  return (windowWidth - PRODUCT_GRID_PADDING * 2 - PRODUCT_COLUMN_GAP) / 2;
}
