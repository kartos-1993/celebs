// Express declaration merging to add user type to Request
declare namespace Express {
  export interface Request {
    user?: {
      userId: string;
      sessionId: string;
    };
  }
  
  // Make sure Multer namespace is correctly declared
  namespace Multer {
    interface File {
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      destination: string;
      filename: string;
      path: string;
      buffer: Buffer;
    }
  }
}
