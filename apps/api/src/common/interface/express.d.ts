import type { Actor, StoreContext } from '@/common/context/actor-context';

// Express declaration merging to add user type to Request
declare global {
  namespace Express {
    export interface User {
      id: string;
      userId?: string;
      sessionId: string;
      email?: string;
      role?: string;
      permissions?: string[];
      vendorId?: string | null;
      isEmailVerified?: boolean;
      vendorProfile?: {
        id: string;
        shopName: string;
        status?: string;
      } | null;
      vendor?: {
        id: string;
        shopName: string;
        status?: string;
      } | null;
    }

    export interface Request {
      user?: User;
      sessionId?: string;
      /** Normalized principal, built by actorContext middleware (Layer 1). */
      actor?: Actor;
      /**
       * Store this request acts for. Null = PLATFORM scope or non-seller actor.
       * Controllers must never derive store context from req.user themselves.
       */
      store?: StoreContext | null;
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
}

export {};
