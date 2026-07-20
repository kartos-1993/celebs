import { BannerService } from './banner.service';
import { BannerController } from './banner.controller';

export class BannerModule {
  private static instance: BannerModule;
  private bannerService: BannerService;
  private bannerController: BannerController;

  private constructor() {
    this.bannerService = new BannerService();
    this.bannerController = new BannerController(this.bannerService);
  }

  static getInstance(): BannerModule {
    if (!BannerModule.instance) {
      BannerModule.instance = new BannerModule();
    }
    return BannerModule.instance;
  }

  getBannerService(): BannerService {
    return this.bannerService;
  }

  getBannerController(): BannerController {
    return this.bannerController;
  }
}
