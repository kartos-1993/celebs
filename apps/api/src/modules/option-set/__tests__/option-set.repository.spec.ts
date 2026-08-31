import { beforeEach, describe, expect, it } from 'vitest';

import { OptionSetRepository, optionSetRepository } from '../option-set.repository';
import { OptionSetService, optionSetService } from '../option-set.service';

import prisma from '@/config/db.prisma';

describe('OptionSetRepository & OptionSetService Clean Architecture Suite', () => {
  let testOptionSetId: string;

  beforeEach(async () => {
    const set = await prisma.optionSet.create({
      data: {
        name: `Test Size Set ${Date.now()}`,
        displayName: 'Test Size Set',
        description: 'Test option set for testing',
        options: ['S', 'M', 'L', 'XL'],
      },
    });
    testOptionSetId = set.id;
  });

  describe('OptionSetRepository', () => {
    it('should find option set by id', async () => {
      const found = await optionSetRepository.findById(testOptionSetId);
      expect(found).not.toBeNull();
      expect(found?.id).toBe(testOptionSetId);
    });

    it('should find all option sets', async () => {
      const all = await optionSetRepository.findAll();
      expect(all.length).toBeGreaterThan(0);
    });

    it('should update option set', async () => {
      const updated = await optionSetRepository.update(testOptionSetId, {
        displayName: 'Updated Display Name',
      });
      expect(updated.displayName).toBe('Updated Display Name');
    });
  });

  describe('OptionSetService DI', () => {
    it('should retrieve option set through injected mock repository', async () => {
      const mockRepo = {
        findById: async (id: string) => ({
          id,
          name: 'Mock Colors',
          displayName: 'Mock Colors',
          description: null,
          options: ['Red', 'Blue'],
        }),
      } as unknown as OptionSetRepository;

      const service = new OptionSetService({ optionSetRepo: mockRepo });
      const result = await service.getById('mock-id-1');
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Mock Colors');
      expect(result?.values).toEqual(['Red', 'Blue']);
    });

    it('should create and delete option set using optionSetService singleton', async () => {
      const created = await optionSetService.create({
        name: `Service Test Set ${Date.now()}`,
        displayName: 'Service Test Set',
        values: ['Value 1', 'Value 2'],
      });
      expect(created.id).toBeDefined();
      expect(created.values).toEqual(['Value 1', 'Value 2']);

      const deleted = await optionSetService.delete(created.id);
      expect(deleted.id).toBe(created.id);
    });
  });
});
