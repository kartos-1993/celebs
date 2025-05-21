import { MediaService } from './media.service';
import { MediaController } from './media.controller';

export class MediaModule {
  private static instance: MediaModule;
  private mediaService: MediaService;
  private mediaController: MediaController;

  private constructor() {
    this.mediaService = new MediaService();
    this.mediaController = new MediaController(this.mediaService);
  }

  /**
   * Get singleton instance of MediaModule
   */
  static getInstance(): MediaModule {
    if (!MediaModule.instance) {
      MediaModule.instance = new MediaModule();
    }
    return MediaModule.instance;
  }

  /**
   * Get media service instance
   */
  getMediaService(): MediaService {
    return this.mediaService;
  }

  /**
   * Get media controller instance
   */
  getMediaController(): MediaController {
    return this.mediaController;
  }
}
