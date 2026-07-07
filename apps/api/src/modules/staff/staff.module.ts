import { StaffService } from './staff.service';
import { StaffController } from './staff.controller';

export class StaffModule {
  private static instance: StaffModule;
  private staffService: StaffService;
  private staffController: StaffController;

  private constructor() {
    this.staffService = new StaffService();
    this.staffController = new StaffController(this.staffService);
  }

  static getInstance(): StaffModule {
    if (!StaffModule.instance) {
      StaffModule.instance = new StaffModule();
    }
    return StaffModule.instance;
  }

  getStaffService(): StaffService {
    return this.staffService;
  }

  getStaffController(): StaffController {
    return this.staffController;
  }
}

export const staffController = StaffModule.getInstance().getStaffController();
