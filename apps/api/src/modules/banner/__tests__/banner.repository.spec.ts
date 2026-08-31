import { beforeEach, describe, expect, it } from 'vitest';

import { BannerRepository, bannerRepository } from '../banner.repository';
import { BannerService } from '../banner.service';

import prisma from '@/config/db.prisma';

describe('BannerRepository & BannerService Clean Architecture Suite', () => {
  beforeEach(async () => {
    await prisma.banner.deleteMany({});
    await prisma.banner.create({
      data: {
        title: 'Summer Sale 2026',
        imageUrl: 'https://cdn.example.com/banner-summer.jpg',
        targetUrl: '/category/summer',
        position: 'home_hero',
        isActive: true,
      },
    });
  });

  describe('BannerRepository', () => {
    it('should find active banners', async () => {
      const active = await bannerRepository.findActiveBanners();
      expect(active.length).toBe(1);
      expect((active[0] as { title: string }).title).toBe('Summer Sale 2026');
    });

    it('should replace banners in transaction', async () => {
      const newBanners = [
        {
          title: 'Monsoon Flash Sale',
          imageUrl: 'https://cdn.example.com/monsoon.jpg',
          targetUrl: '/campaign/monsoon',
          position: 'home_hero',
          isActive: true,
        },
      ];

      const replaced = await bannerRepository.replaceBanners(newBanners);
      expect(replaced.length).toBe(1);
      expect(replaced[0].title).toBe('Monsoon Flash Sale');

      const all = await bannerRepository.findAllBanners();
      expect(all.length).toBe(1);
      expect(all[0].title).toBe('Monsoon Flash Sale');
    });
  });

  describe('BannerService DI', () => {
    it('should retrieve active banners through injected mock repository', async () => {
      const mockRepo = {
        findActiveBanners: async () => [
          {
            id: 'mock-1',
            title: 'Mock Banner',
            imageUrl: 'https://cdn.example.com/mock.jpg',
            position: 'home_hero',
            isActive: true,
          },
        ],
        findAllBanners: async () => [],
        replaceBanners: async () => [],
      } as unknown as BannerRepository;

      const service = new BannerService({ bannerRepo: mockRepo });
      const result = await service.getActiveBanners();

      expect(result.length).toBe(1);
      expect(result[0]?.id).toBe('mock-1');
      expect(result[0]?.title).toBe('Mock Banner');
    });

    it('should reject banner array with more than 3 items', async () => {
      const service = new BannerService();
      const fourBanners = [
        { imageUrl: 'https://cdn.example.com/1.jpg', linkType: 'NONE' as const, order: 0 },
        { imageUrl: 'https://cdn.example.com/2.jpg', linkType: 'NONE' as const, order: 1 },
        { imageUrl: 'https://cdn.example.com/3.jpg', linkType: 'NONE' as const, order: 2 },
        { imageUrl: 'https://cdn.example.com/4.jpg', linkType: 'NONE' as const, order: 3 },
      ];

      await expect(service.updateBanners(fourBanners)).rejects.toThrow(
        'Banner list can have at most 3 banners',
      );
    });
  });
});
