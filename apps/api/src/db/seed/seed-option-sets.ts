import prisma from '../../config/db.prisma';

export const DEFAULT_OPTION_SETS = [
  {
    name: 'Basic Colors',
    type: 'color' as const,
    values: [
      // Whites & Neutrals
      'White', 'Ivory', 'Cream', 'Off-White', 'Pearl', 'Vanilla', 'Alabaster',
      // Browns & Earth Tones (Nepali Market Staples)
      'Brown', 'Dark Brown', 'Light Brown', 'Camel Brown', 'Tan', 'Khaki', 'Mocha', 'Coffee', 'Chocolate', 'Chestnut', 'Caramel', 'Cocoa', 'Terracotta', 'Mahogany', 'Bronze', 'Copper', 'Rust', 'Beige', 'Sand', 'Apricot', 'Oatmeal', 'Taupe',
      // Greys & Blacks
      'Light Grey', 'Dark Grey', 'Charcoal', 'Slate', 'Ash', 'Heather Grey', 'Silver',
      'Black', 'Obsidian', 'Jet Black',
      // Reds & Pinks
      'Red', 'Burgundy', 'Maroon', 'Wine', 'Crimson', 'Cherry', 'Brick Red', 'Tomato Red', 'Ruby', 'Scarlet',
      'Pink', 'Baby Pink', 'Hot Pink', 'Fuchsia', 'Magenta', 'Rose', 'Dusty Rose', 'Blush', 'Bubblegum', 'Coral', 'Peach', 'Salmon',
      // Oranges & Yellows
      'Orange', 'Burnt Orange', 'Neon Orange', 'Tangerine', 'Rust Orange', 'Papaya',
      'Yellow', 'Mustard', 'Lemon', 'Neon Yellow', 'Gold', 'Amber', 'Butter Yellow', 'Sunflower',
      // Greens
      'Mint', 'Seafoam', 'Sage', 'Lime', 'Neon Green', 'Chartreuse', 'Pistachio',
      'Army Green', 'Olive', 'Khaki Green', 'Emerald', 'Forest Green', 'Hunter Green', 'Kelly Green', 'Pine', 'Avocado',
      // Blues & Teals
      'Baby Blue', 'Sky Blue', 'Ice Blue', 'Aqua', 'Cyan', 'Powder Blue',
      'Navy Blue', 'Royal Blue', 'Cobalt', 'Indigo', 'Sapphire', 'Denim Blue', 'Midnight Blue',
      'Turquoise', 'Teal', 'Peacock Blue',
      // Purples
      'Purple', 'Lilac', 'Lavender', 'Violet', 'Plum', 'Eggplant', 'Mauve', 'Amethyst', 'Orchid',
      // Metallic & Special Prints (Flower Patterns, Plaid, Tie-Dye)
      'Rose Gold',
      'Multicolor', 'Multicolor Flower Pattern', 'Floral Pattern', 'Abstract Print', 'Tie-Dye', 'Plaid/Checkered', 'Striped', 'Polka Dot', 'Geometric', 'Camouflage', 'Leopard Print', 'Clear/Transparent', 'Rainbow'
    ],
  },
  {
    name: 'Alpha Sizes (XXS-5XL)',
    type: 'size' as const,
    values: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'Free Size', 'One Size'],
  },
  {
    name: 'Extended Sizes',
    type: 'size' as const,
    values: ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '4XL', '5XL', 'Free Size', 'One Size'],
  },
  {
    name: 'Numeric Sizes (26-46)',
    type: 'size' as const,
    values: ['26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46'],
  },
  {
    name: 'Shoe Sizes (EU / UK / US)',
    type: 'size' as const,
    values: [
      'EU 38 / UK 5 / US 6',
      'EU 39 / UK 6 / US 7',
      'EU 40 / UK 6.5 / US 7.5',
      'EU 41 / UK 7 / US 8',
      'EU 42 / UK 8 / US 9',
      'EU 43 / UK 9 / US 10',
      'EU 44 / UK 9.5 / US 10.5',
      'EU 45 / UK 10 / US 11',
      'EU 46 / UK 11 / US 12',
    ],
  },
];

export async function seedOptionSets(): Promise<void> {
  console.log('\n🎨 Seeding Option Sets into PostgreSQL...');

  for (const set of DEFAULT_OPTION_SETS) {
    await prisma.optionSet.upsert({
      where: { name: set.name },
      update: {
        displayName: set.name,
        options: set.values,
      },
      create: {
        name: set.name,
        displayName: set.name,
        options: set.values,
      },
    });
    console.log(`  └─ Upserted option set: "${set.name}" (${set.values.length} values)`);
  }
  console.log('✅ Option Sets Seeded Successfully!');
}

if (require.main === module) {
  seedOptionSets()
    .catch((err) => {
      console.error('❌ Seeding option sets failed:', err);
      process.exit(1);
    });
}
