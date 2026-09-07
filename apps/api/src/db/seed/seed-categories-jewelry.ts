import slugify from 'slugify';

import type { AttributeGroup as AllowedGroup } from '@celebs/shared-types';

import prisma from '../../config/db.prisma';

interface SeedAttr {
  name: string;
  label?: string;
  type: 'text' | 'select' | 'multiselect' | 'number' | 'boolean';
  values?: string[];
  isRequired?: boolean;
  isVariant?: boolean;
  group?: AllowedGroup;
  placeholder?: string;
}

interface SeedCategory {
  name: string;
  imageUrl?: string;
  attributes?: SeedAttr[];
  children?: SeedCategory[];
}

function mkAttr(a: SeedAttr) {
  const group: AllowedGroup = a.group ? a.group : a.isVariant ? 'variant' : 'details';
  return {
    name: a.name,
    label: a.label || a.name,
    type: a.type,
    values: a.values ?? [],
    isRequired: a.isRequired ?? false,
    isVariant: !!a.isVariant,
    placeholder: a.placeholder || '',
    group,
  };
}

const JEWELRY_ACCESSORIES_TREE: SeedCategory = {
  name: 'Jewelry & Accessories',
  imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800&q=80',
  children: [
    // ----------------------------------------------------
    // 1. Watches & Timepieces
    // ----------------------------------------------------
    {
      name: 'Watches & Timepieces',
      imageUrl: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&q=80',
      children: [
        {
          name: "Men's Mechanical Watches",
          imageUrl: 'https://images.unsplash.com/photo-1524805444758-089113d48a6d?w=800&q=80',
          attributes: [
            {
              name: 'Movement Type',
              type: 'select',
              values: [
                'Automatic Self-Winding',
                'Manual Hand-Wind',
                'Skeleton Mechanical',
                'Tourbillon',
                'Co-Axial Chronometer',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Case Diameter',
              type: 'select',
              values: ['38mm', '40mm', '41mm', '42mm', '44mm', '46mm'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Case Material',
              type: 'select',
              values: [
                '316L Stainless Steel',
                'Titanium',
                'Rose Gold PVD Steel',
                'Black PVD Stainless Steel',
                'Ceramic',
              ],
              group: 'details',
            },
            {
              name: 'Strap Material',
              type: 'multiselect',
              values: [
                '316L Steel Bracelet',
                'Genuine Leather',
                'Silicone / Rubber Strap',
                'NATO Nylon Strap',
                'Milanese Mesh',
              ],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Dial Color',
              type: 'multiselect',
              values: [
                'Midnight Blue',
                'Obsidian Black',
                'Sunburst Silver',
                'Emerald Green',
                'Champagne Gold',
                'Panda / Chronograph Two-Tone',
              ],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Water Resistance',
              type: 'select',
              values: [
                '3 ATM (30m Splash Resistant)',
                '5 ATM (50m Swim)',
                '10 ATM (100m Water Sports)',
                '20 ATM (200m Diver)',
              ],
              group: 'details',
            },
            {
              name: 'Glass Type',
              type: 'select',
              values: [
                'Sapphire Crystal (Scratch-Proof)',
                'Hardlex Mineral Crystal',
                'Anti-Reflective Coated Sapphire',
              ],
              group: 'details',
            },
          ],
        },
        {
          name: "Men's Quartz & Digital Watches",
          imageUrl: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800&q=80',
          attributes: [
            {
              name: 'Movement Type',
              type: 'select',
              values: ['Japanese Quartz', 'Swiss Quartz', 'Solar Powered Quartz', 'Digital Quartz'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Display Type',
              type: 'select',
              values: ['Analog', 'Digital', 'Ana-Digi (Dual Display)'],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Case Diameter',
              type: 'select',
              values: ['38mm', '40mm', '42mm', '44mm', '48mm (Sport)'],
              group: 'details',
            },
            {
              name: 'Strap Material',
              type: 'multiselect',
              values: ['Stainless Steel', 'Resin / Silicone', 'Genuine Leather', 'Nylon Webbing'],
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Features',
              type: 'multiselect',
              values: [
                'Chronograph / Stopwatch',
                'Date Display',
                'Luminous Hands',
                'Backlight / LED',
                'Alarm',
                'World Time',
              ],
              group: 'details',
            },
            {
              name: 'Water Resistance',
              type: 'select',
              values: ['3 ATM (Splash Proof)', '5 ATM', '10 ATM', '20 ATM'],
              group: 'details',
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 2. Fine & Fashion Jewelry
    // ----------------------------------------------------
    {
      name: 'Fine & Fashion Jewelry',
      imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
      children: [
        {
          name: "Men's Rings",
          imageUrl: 'https://images.unsplash.com/photo-1603561591411-07134e71a2a9?w=800&q=80',
          attributes: [
            {
              name: 'Base Metal',
              type: 'select',
              values: [
                '316L Stainless Steel',
                'Tungsten Carbide',
                'Titanium',
                '925 Sterling Silver',
                '14K Gold Plated',
                'Brass / Alloy',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Ring Style',
              type: 'select',
              values: [
                'Band / Plain',
                'Signet Ring',
                'Spinning Fidget Ring',
                'Gemstone / Solitaire',
                'Skull / Gothic',
                'Carved Celtic',
              ],
              group: 'details',
            },
            {
              name: 'Ring Size (US)',
              type: 'multiselect',
              values: [
                'US 6',
                'US 7',
                'US 8',
                'US 9',
                'US 10',
                'US 11',
                'US 12',
                'US 13',
                'Adjustable / Free Size',
              ],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Stone Type',
              type: 'select',
              values: [
                'No Stone',
                'Cubic Zirconia',
                'Onyx',
                'Tiger Eye',
                'Turquoise',
                'Moissanite',
              ],
              group: 'details',
            },
            {
              name: 'Plating Finish',
              type: 'select',
              values: [
                'Silver / Polished Steel',
                '18K Yellow Gold Plated',
                'Black Gunmetal',
                'Vintage Brushed / Matte',
              ],
              group: 'details',
            },
          ],
        },
        {
          name: "Men's Necklaces & Chains",
          imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=800&q=80',
          attributes: [
            {
              name: 'Chain Type',
              type: 'select',
              values: [
                'Cuban Link',
                'Figaro Chain',
                'Rope Chain',
                'Box Chain',
                'Snake Chain',
                'Tennis Chain (Iced Out)',
                'Wheat / Franco Chain',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Chain Length',
              type: 'multiselect',
              values: [
                '18 inches (45cm)',
                '20 inches (50cm)',
                '22 inches (55cm)',
                '24 inches (60cm)',
                '26 inches (65cm)',
              ],
              isRequired: true,
              isVariant: true,
              group: 'variant',
            },
            {
              name: 'Chain Width',
              type: 'select',
              values: [
                '2mm - 3mm (Subtle)',
                '4mm - 6mm (Classic)',
                '8mm - 10mm (Statement)',
                '12mm+ (Heavy Cuban)',
              ],
              group: 'details',
            },
            {
              name: 'Base Metal',
              type: 'select',
              values: [
                '316L Stainless Steel',
                '925 Sterling Silver',
                'Titanium Steel',
                'Brass / Copper',
              ],
              group: 'details',
            },
            {
              name: 'Plating',
              type: 'select',
              values: ['High Polish Silver', '18K Gold Plated', 'Black PVD Plated', 'Two-Tone'],
              group: 'details',
            },
            {
              name: 'Pendant Style',
              type: 'select',
              values: [
                'Chain Only (No Pendant)',
                'Cross / Crucifix',
                'Dog Tag',
                'Medallion / Coin',
                'Sword / Dagger',
                'Custom Letter / Initial',
              ],
              group: 'details',
            },
          ],
        },
        {
          name: "Men's Bracelets",
          imageUrl: 'https://images.unsplash.com/photo-1611591475837-7757917e7611?w=800&q=80',
          attributes: [
            {
              name: 'Bracelet Type',
              type: 'select',
              values: [
                'Cuban Curb Chain',
                'Braided Genuine Leather',
                'Natural Stone Beads',
                'Open Cuff / Bangle',
                'Tennis Bracelet (CZ)',
                'Magnetic Therapy',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Base Metal',
              type: 'select',
              values: [
                '316L Stainless Steel',
                'Titanium',
                'Genuine Leather',
                'Natural Lava / Onyx Stone',
              ],
              group: 'details',
            },
            {
              name: 'Clasp Type',
              type: 'select',
              values: [
                'Lobster Claw',
                'Magnetic Stainless Steel',
                'Box Clasp with Double Lock',
                'Elastic Stretch',
                'Buckle',
              ],
              group: 'details',
            },
            {
              name: 'Length / Size',
              type: 'multiselect',
              values: [
                '19cm (Small / 7.5")',
                '21cm (Standard / 8.2")',
                '23cm (Large / 9.0")',
                'Adjustable',
              ],
              isVariant: true,
              group: 'variant',
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 3. Eyewear
    // ----------------------------------------------------
    {
      name: 'Eyewear',
      imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
      children: [
        {
          name: "Men's Sunglasses",
          imageUrl: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=800&q=80',
          attributes: [
            {
              name: 'Frame Shape',
              type: 'select',
              values: [
                'Aviator',
                'Wayfarer / Square',
                'Rectangle',
                'Round / Retro',
                'Clubmaster / Browline',
                'Shield / Wrap-Around',
                'Hexagonal',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Frame Material',
              type: 'select',
              values: [
                'Acetate',
                'TR90 (Lightweight & Flexible)',
                'Metal / Alloy',
                'Titanium',
                'PC Plastic',
              ],
              group: 'details',
            },
            {
              name: 'Lens Material',
              type: 'select',
              values: ['TAC Polarized', 'Polycarbonate (Impact-Resistant)', 'Nylon Lens', 'Glass'],
              group: 'details',
            },
            {
              name: 'UV Protection',
              type: 'select',
              values: ['UV400 (100% UVA/UVB Protection)'],
              group: 'details',
            },
            {
              name: 'Polarized',
              type: 'select',
              values: ['Yes (Polarized Anti-Glare)', 'Non-Polarized'],
              group: 'details',
            },
            {
              name: 'Lens Color',
              type: 'multiselect',
              values: [
                'Dark Grey / Black',
                'G-15 Green',
                'Brown / Amber',
                'Mirrored Silver',
                'Blue Mirror',
                'Gradient Smoke',
              ],
              isVariant: true,
              group: 'variant',
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 4. Bags & Small Leather Goods
    // ----------------------------------------------------
    {
      name: 'Bags & Small Leather Goods',
      imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
      children: [
        {
          name: "Men's Bags & Backpacks",
          imageUrl: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800&q=80',
          attributes: [
            {
              name: 'Bag Type',
              type: 'select',
              values: [
                'Crossbody / Sling Bag',
                'Everyday Backpack',
                'Business Laptop Backpack',
                'Messenger / Shoulder Bag',
                'Duffel / Weekender Bag',
                'Chest Rig / Tactical Bag',
                'Tote Bag',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Outer Material',
              type: 'select',
              values: [
                'Water-Repellent Oxford Cloth',
                'PU Leather',
                'Heavy-Duty Canvas',
                'Cordura Nylon',
                'Genuine Top-Grain Leather',
              ],
              group: 'details',
            },
            {
              name: 'Closure Type',
              type: 'select',
              values: ['YKK Zipper', 'Roll-Top with Buckle', 'Magnetic Snap', 'Drawstring'],
              group: 'details',
            },
            {
              name: 'Features',
              type: 'multiselect',
              values: [
                'Water-Resistant Coating',
                'Padded Laptop Compartment (Up to 15.6")',
                'USB Charging Port',
                'Anti-Theft Hidden Pocket',
                'Luggage Strap',
                'Breathable Back Cushioning',
              ],
              group: 'details',
            },
          ],
        },
        {
          name: "Men's Wallets & Cardholders",
          imageUrl: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80',
          attributes: [
            {
              name: 'Wallet Type',
              type: 'select',
              values: [
                'Classic Bifold Wallet',
                'Slim Cardholder with Pull Tab',
                'Pop-Up RFID Metal Cardholder',
                'Trifold Wallet',
                'Money Clip Wallet',
                'Long Zip-Around Wallet',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                'Genuine Cowhide Leather',
                'PU Leather',
                'Carbon Fiber & Aluminum',
                'Crazy Horse Leather',
              ],
              group: 'details',
            },
            {
              name: 'Card Capacity',
              type: 'select',
              values: ['4 - 6 Cards', '7 - 10 Cards', '10+ Cards'],
              group: 'details',
            },
            {
              name: 'Features',
              type: 'multiselect',
              values: [
                'RFID Blocking Security',
                'Coin Zipper Pocket',
                'Clear ID Window',
                'Cash / Bill Compartment',
                'AirTag Slot',
              ],
              group: 'details',
            },
          ],
        },
      ],
    },

    // ----------------------------------------------------
    // 5. Belts & Hats
    // ----------------------------------------------------
    {
      name: 'Belts & Hats',
      imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80',
      children: [
        {
          name: "Men's Belts",
          imageUrl: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=800&q=80',
          attributes: [
            {
              name: 'Belt Material',
              type: 'select',
              values: [
                'Genuine Full-Grain Leather',
                'Split Leather',
                'PU Leather',
                'Tactical Nylon Webbing',
                'Braided Elastic Canvas',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Buckle Type',
              type: 'select',
              values: [
                'Automatic Ratchet Buckle (No Holes)',
                'Classic Single Prong Pin Buckle',
                'Double Prong Heavy Duty',
                'Tactical Quick-Release Cobra Buckle',
                'Plaque / Plate Buckle',
              ],
              group: 'details',
            },
            {
              name: 'Belt Width',
              type: 'select',
              values: [
                '3.0cm (Dress / Formal)',
                '3.5cm (Everyday Standard)',
                '3.8cm (Casual / Jeans)',
                '4.0cm (Heavy Duty)',
              ],
              group: 'details',
            },
            {
              name: 'Reversible',
              type: 'select',
              values: ['Reversible (Black / Brown Dual Sided)', 'Single Sided'],
              group: 'details',
            },
            {
              name: 'Length / Waist Fit',
              type: 'multiselect',
              values: [
                '105cm (Waist 28-32")',
                '115cm (Waist 32-36")',
                '125cm (Waist 36-40")',
                '135cm (Waist 40-44")',
                'Trim to Fit',
              ],
              isVariant: true,
              group: 'variant',
            },
          ],
        },
        {
          name: "Men's Caps & Hats",
          imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=800&q=80',
          attributes: [
            {
              name: 'Hat Style',
              type: 'select',
              values: [
                'Baseball Cap (Structured 6-Panel)',
                'Dad Hat (Unstructured Low Profile)',
                'Beanie / Skull Cap',
                'Bucket Hat',
                'Trucker Hat (Mesh Back)',
                'Flat Cap / Newsboy Ivy',
                'Fedora / Panama',
              ],
              isRequired: true,
              group: 'details',
            },
            {
              name: 'Material',
              type: 'select',
              values: [
                '100% Washed Cotton Twill',
                'Wool Blend',
                'Acrylic Knit',
                'Polyester Breathable Mesh',
                'Corduroy',
              ],
              group: 'details',
            },
            {
              name: 'Closure / Adjustment',
              type: 'select',
              values: [
                'Metal Buckle Strapback',
                'Snapback (Plastic Notch)',
                'Fitted',
                'Elastic Stretch Fit',
                'Drawstring Chin Cord',
              ],
              group: 'details',
            },
            {
              name: 'Details',
              type: 'multiselect',
              values: [
                '3D Embroidery Logo',
                'Vintage Washed / Distressed',
                'Ventilation Eyelets',
                'Sweatband Lining',
                'Curved Brim',
                'Flat Brim',
              ],
              group: 'details',
            },
          ],
        },
      ],
    },
  ],
};

async function seedCategoryRecursively(
  cat: SeedCategory,
  parentId: string | null = null,
  level = 1,
  parentPath: string[] = [],
): Promise<void> {
  const slug = slugify(cat.name, { lower: true, strict: true });
  const currentPathArray = [...parentPath, slug];
  const path = currentPathArray.join('/');

  const formattedAttributes = cat.attributes ? cat.attributes.map((a) => mkAttr(a)) : [];

  const existing = await prisma.category.findFirst({
    where: {
      OR: [{ slug }, { name: cat.name, parentCategory: parentId }],
    },
  });

  let doc;
  if (existing) {
    doc = await prisma.category.update({
      where: { id: existing.id },
      data: {
        name: cat.name,
        slug,
        level,
        parentCategory: parentId,
        path,
        imageUrl: cat.imageUrl || null,
        attributes: formattedAttributes,
        isActive: true,
      },
    });
  } else {
    doc = await prisma.category.create({
      data: {
        name: cat.name,
        slug,
        level,
        parentCategory: parentId,
        path,
        imageUrl: cat.imageUrl || null,
        attributes: formattedAttributes,
        isActive: true,
      },
    });
  }

  console.log(`  └─ Category: "${cat.name}" (Level ${level})`);

  if (cat.children && cat.children.length > 0) {
    for (const child of cat.children) {
      await seedCategoryRecursively(child, doc.id, level + 1, currentPathArray);
    }
  }
}

export async function seedCategoriesJewelry(): Promise<void> {
  console.log('\n💎 Seeding Jewelry & Accessories Categories & Detailed Shein Attributes...');
  await seedCategoryRecursively(JEWELRY_ACCESSORIES_TREE);
  console.log('✅ Jewelry & Accessories Categories Seeded Successfully!');
}

if (require.main === module) {
  seedCategoriesJewelry().catch((err) => {
    console.error('❌ Seeding jewelry categories failed:', err);
    process.exit(1);
  });
}
