import prisma from '@/config/db.prisma';
import { DEFAULT_OPTION_SETS } from '@/db/seed/seed-option-sets';

// Write-on-read guard: seeding runs at most once per process. Without it,
// every list() pays a count query and can cascade into N upserts under race.
let defaultsEnsured: Promise<void> | null = null;

function ensureDefaultsOnce(): Promise<void> {
  if (!defaultsEnsured) {
    defaultsEnsured = (async () => {
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
    })().catch((err) => {
      // Allow a later request to retry seeding.
      defaultsEnsured = null;
      throw err;
    });
  }
  return defaultsEnsured;
}

export class OptionSetService {
  async list(_type?: string) {
    await ensureDefaultsOnce();
    const sets = await prisma.optionSet.findMany({ orderBy: { name: 'asc' } });
    return sets.map((s) => ({
      id: s.id,
      name: s.name,
      displayName: s.displayName,
      description: s.description || null,
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
      description: set.description || null,
      values: Array.isArray(set.options) ? set.options : [],
    };
  }

  async create(data: {
    name: string;
    displayName?: string;
    description?: string;
    values: string[];
  }) {
    const name = String(data.name || '').trim();
    const displayName = String(data.displayName || data.name || '').trim();
    const values = Array.isArray(data.values)
      ? data.values.map((v) => String(v).trim()).filter(Boolean)
      : [];

    const created = await prisma.optionSet.create({
      data: {
        name,
        displayName,
        description: data.description ? String(data.description).trim() : null,
        options: values,
      },
    });

    return {
      id: created.id,
      name: created.name,
      displayName: created.displayName,
      description: created.description || null,
      values: Array.isArray(created.options) ? created.options : [],
    };
  }

  async update(
    id: string,
    data: { name?: string; displayName?: string; description?: string; values?: string[] },
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.displayName !== undefined) updateData.displayName = String(data.displayName).trim();
    if (data.description !== undefined)
      updateData.description = data.description ? String(data.description).trim() : null;
    if (data.values !== undefined) {
      updateData.options = Array.isArray(data.values)
        ? data.values.map((v) => String(v).trim()).filter(Boolean)
        : [];
    }

    const updated = await prisma.optionSet.update({
      where: { id },
      data: updateData,
    });

    return {
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      description: updated.description || null,
      values: Array.isArray(updated.options) ? updated.options : [],
    };
  }

  async delete(id: string) {
    const deleted = await prisma.optionSet.delete({
      where: { id },
    });
    return { id: deleted.id };
  }
}
