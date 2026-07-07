import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

export class AdminModule {
  private static instance: AdminModule;
  private adminService: AdminService;
  private adminController: AdminController;

  private constructor() {
    this.adminService = new AdminService();
    this.adminController = new AdminController(this.adminService);
  }

  static getInstance(): AdminModule {
    if (!AdminModule.instance) {
      AdminModule.instance = new AdminModule();
    }
    return AdminModule.instance;
  }

  getAdminService(): AdminService {
    return this.adminService;
  }

  getAdminController(): AdminController {
    return this.adminController;
  }
}

export const adminController = AdminModule.getInstance().getAdminController();
