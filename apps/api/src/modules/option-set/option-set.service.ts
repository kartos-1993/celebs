import { OptionSetModel } from '../../db/models/option-set.model';

const DEFAULT_SETS = [
  { name: 'Basic Colors', type: 'color' as const, values: ['Black','White','Red','Blue','Green','Yellow','Gray','Pink','Purple','Brown'] },
  { name: 'Alpha Sizes (XS-XXL)', type: 'size' as const, values: ['XS','S','M','L','XL','XXL'] },
  { name: 'Numeric Sizes (28-44)', type: 'size' as const, values: ['28','30','32','34','36','38','40','42','44'] },
];

async function ensureDefaults() {
  const count = await OptionSetModel.estimatedDocumentCount();
  if (count > 0) return;
  await OptionSetModel.insertMany(DEFAULT_SETS);
}

export class OptionSetService {
  async list(type?: 'color' | 'size') {
    await ensureDefaults();
    const query: any = {};
    if (type) query.type = type;
    const sets = await OptionSetModel.find(query).sort({ name: 1 });
    return sets.map((s) => ({ id: String(s._id), name: s.name, type: s.type }));
  }

  async getById(id: string) {
    const set = await OptionSetModel.findById(id);
    if (!set) return null;
    return { id: String(set._id), name: set.name, type: set.type, values: set.values };
  }
}
