import { CreateOptionSetType, OptionSetType, UpdateOptionSetType } from '@celebs/shared-types';

import { OptionSetRepository, optionSetRepository } from './option-set.repository';

import { DEFAULT_OPTION_SETS } from '@/db/seed/seed-option-sets';

let defaultsEnsured: Promise<void> | null = null;

async function ensureDefaultsOnce(repo: OptionSetRepository): Promise<void> {
  if (!defaultsEnsured) {
    defaultsEnsured = (async () => {
      const count = await repo.count();
      if (count >= DEFAULT_OPTION_SETS.length) return;
      for (const set of DEFAULT_OPTION_SETS) {
        await repo.upsert({
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
      defaultsEnsured = null;
      throw err;
    });
  }
  return defaultsEnsured;
}

export interface OptionSetServiceDeps {
  optionSetRepo?: OptionSetRepository;
}

export class OptionSetService {
  private optionSetRepo: OptionSetRepository;

  constructor(deps: OptionSetServiceDeps = {}) {
    this.optionSetRepo = deps.optionSetRepo ?? optionSetRepository;
  }

  async list(_type?: string): Promise<OptionSetType[]> {
    await ensureDefaultsOnce(this.optionSetRepo);
    const sets = await this.optionSetRepo.findAll();
    return sets.map((s) => ({
      id: s.id,
      name: s.name,
      displayName: s.displayName,
      description: s.description || null,
      values: Array.isArray(s.options) ? (s.options as string[]) : [],
    }));
  }

  async getById(id: string): Promise<OptionSetType | null> {
    const set = await this.optionSetRepo.findById(id);
    if (!set) return null;
    return {
      id: set.id,
      name: set.name,
      displayName: set.displayName,
      description: set.description || null,
      values: Array.isArray(set.options) ? (set.options as string[]) : [],
    };
  }

  async create(data: CreateOptionSetType): Promise<OptionSetType> {
    const name = String(data.name || '').trim();
    const displayName = String(data.displayName || data.name || '').trim();
    const values = Array.isArray(data.values)
      ? data.values.map((v) => String(v).trim()).filter(Boolean)
      : [];

    const created = await this.optionSetRepo.create({
      name,
      displayName,
      description: data.description ? String(data.description).trim() : null,
      options: values,
    });

    return {
      id: created.id,
      name: created.name,
      displayName: created.displayName,
      description: created.description || null,
      values: Array.isArray(created.options) ? (created.options as string[]) : [],
    };
  }

  async update(id: string, data: UpdateOptionSetType): Promise<OptionSetType> {
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

    const updated = await this.optionSetRepo.update(id, updateData);

    return {
      id: updated.id,
      name: updated.name,
      displayName: updated.displayName,
      description: updated.description || null,
      values: Array.isArray(updated.options) ? (updated.options as string[]) : [],
    };
  }

  async delete(id: string): Promise<{ id: string }> {
    const deleted = await this.optionSetRepo.delete(id);
    return { id: deleted.id };
  }
}

export const optionSetService = new OptionSetService();
