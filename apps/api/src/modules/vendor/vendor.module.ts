import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';

export class VendorModule {
  private static instance: VendorModule;
  private vendorService: VendorService;
  private vendorController: VendorController;

  private constructor() {
    this.vendorService = new VendorService();
    this.vendorController = new VendorController(this.vendorService);
  }

  static getInstance(): VendorModule {
    if (!VendorModule.instance) {
      VendorModule.instance = new VendorModule();
    }
    return VendorModule.instance;
  }

  getVendorService(): VendorService {
    return this.vendorService;
  }

  getVendorController(): VendorController {
    return this.vendorController;
  }
}

export const vendorController = VendorModule.getInstance().getVendorController();
