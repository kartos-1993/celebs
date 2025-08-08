import mongoose from 'mongoose';
import { OptionSetModel } from '../models/option-set.model';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/fashion-ecommerce';

async function seed() {
  await mongoose.connect(MONGODB_URI);
  const defaults = [
  { name: 'Basic Colors', type: 'color' as const, values: ['Black','White','Red','Blue','Green','Yellow','Gray','Pink','Purple','Brown'] },
  { name: 'Alpha Sizes (XS-XXL)', type: 'size' as const, values: ['XS','S','M','L','XL','XXL'] },
  { name: 'Numeric Sizes (28-44)', type: 'size' as const, values: ['28','30','32','34','36','38','40','42','44'] },
  ];

  for (const d of defaults) {
    const exists = await OptionSetModel.findOne({ name: d.name });
    if (!exists) {
      await OptionSetModel.create(d);
      console.log(`Created option set: ${d.name}`);
    } else {
      console.log(`Skipped existing option set: ${d.name}`);
    }
  }

  await mongoose.disconnect();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
