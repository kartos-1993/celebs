import { MobileController } from './mobile.controller';
import { MobileService } from './mobile.service';

export class MobileModule {
  private static instance: MobileModule;
  private readonly mobileService: MobileService;
  private readonly mobileController: MobileController;

  private constructor() {
    this.mobileService = new MobileService();
    this.mobileController = new MobileController(this.mobileService);
  }

  static getInstance(): MobileModule {
    if (!MobileModule.instance) {
      MobileModule.instance = new MobileModule();
    }

    return MobileModule.instance;
  }

  getMobileController(): MobileController {
    return this.mobileController;
  }

  getMobileService(): MobileService {
    return this.mobileService;
  }
}
