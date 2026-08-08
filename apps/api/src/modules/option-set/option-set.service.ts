import prisma from '@/config/db.prisma';
import { DEFAULT_OPTION_SETS } from '@/db/seed/seed-option-sets';

async function ensureDefaults() {
  const count = await prisma.optionSet.count();
  if (count >= DEFAULT_OPTION_SETS.length) return;
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
  }
}

export class OptionSetService {
  async list(type?: string) {
    await ensureDefaults();
    const sets = await prisma.optionSet.findMany({ orderBy: { name: 'asc' } });
    return sets.map((s) => ({
      id: s.id,
      name: s.name,
      displayName: s.displayName,
      values: Array.isArray(s.options) ? s.options : [],
    }));
  }

  async getById(id: string) {
    const set = await prisma.optionSet.findUnique({ where: { id } });
    if (!set) return null;
    return {
      id: set.id,
      name: set.name,
      displayName: set.displayName,
      values: Array.isArray(set.options) ? set.options : [],
    };
  }
}
