import mongoose from 'mongoose';
import path from 'path';
import dotenv from 'dotenv';
import { OptionSetModel } from '@/db/models/option-set.model';

// Load env from project env file (development by default for local runs)
dotenv.config({
  path: process.env.DOTENV_CONFIG_PATH || path.resolve(__dirname, '../../../.env.development'),
});

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  // Single source of truth for shared option sets used by categories
  const defaults = [
    {
      name: 'Basic Colors',
      type: 'color' as const,
      values: [
        'White', 'Ivory', 'Cream', 'Off-White', 'Pearl', 'Vanilla', 'Alabaster',
        'Beige', 'Khaki', 'Camel', 'Taupe', 'Sand', 'Apricot', 'Oatmeal', 'Mocha', 'Coffee', 'Chocolate', 'Chestnut', 'Caramel', 'Cocoa',
        'Light Grey', 'Dark Grey', 'Charcoal', 'Slate', 'Ash', 'Heather Grey', 'Silver',
        'Black', 'Obsidian', 'Jet Black',
        'Red', 'Burgundy', 'Maroon', 'Wine', 'Crimson', 'Cherry', 'Brick Red', 'Tomato Red', 'Ruby', 'Scarlet',
        'Pink', 'Baby Pink', 'Hot Pink', 'Fuchsia', 'Magenta', 'Rose', 'Dusty Rose', 'Blush', 'Bubblegum', 'Coral', 'Peach', 'Salmon',
        'Orange', 'Burnt Orange', 'Neon Orange', 'Tangerine', 'Rust Orange', 'Papaya',
        'Yellow', 'Mustard', 'Lemon', 'Neon Yellow', 'Gold', 'Amber', 'Butter Yellow', 'Sunflower',
        'Mint', 'Seafoam', 'Sage', 'Lime', 'Neon Green', 'Chartreuse', 'Pistachio',
        'Army Green', 'Olive', 'Khaki Green', 'Emerald', 'Forest Green', 'Hunter Green', 'Kelly Green', 'Pine', 'Avocado',
        'Baby Blue', 'Sky Blue', 'Ice Blue', 'Aqua', 'Cyan', 'Powder Blue',
        'Navy Blue', 'Royal Blue', 'Cobalt', 'Indigo', 'Sapphire', 'Denim Blue', 'Midnight Blue',
        'Turquoise', 'Teal', 'Peacock Blue',
        'Purple', 'Lilac', 'Lavender', 'Violet', 'Plum', 'Eggplant', 'Mauve', 'Amethyst', 'Orchid',
        'Rose Gold', 'Bronze', 'Copper',
        'Multicolor', 'Rainbow', 'Tie-Dye', 'Leopard Print', 'Floral', 'Geometric', 'Clear/Transparent'
      ],
    },
    {
      name: 'Alpha Sizes (XS-XXL)',
      type: 'size' as const,
      values: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    },
    {
      name: 'Numeric Sizes (28-44)',
      type: 'size' as const,
      values: ['28', '30', '32', '34', '36', '38', '40', '42', '44'],
    },
    {
      // Referenced by Shoes categories in the seed tree
      name: 'US Shoe Sizes (Men)',
      type: 'size' as const,
      values: ['6', '7', '8', '9', '10', '11', '12', '13'],
    },
  ];

  for (const set of defaults) {
    // Upsert to keep values authoritative with this seed
    await OptionSetModel.updateOne({ name: set.name }, set as any, {
      upsert: true,
      setDefaultsOnInsert: true,
    });
    // eslint-disable-next-line no-console
    console.log(`Upserted option set: ${set.name}`);
  }

  await mongoose.disconnect();
}

seed().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
