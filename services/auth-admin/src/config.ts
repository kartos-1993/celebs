// RBAC roles and permissions
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  GUEST = 'guest',
}

export const Permissions = {
  [Role.ADMIN]: ['read', 'write', 'delete'],
  [Role.USER]: ['read', 'write'],
  [Role.GUEST]: ['read'],
};

export const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_KEY = process.env.SUPABASE_KEY || '';

export const DATABASE_URL = process.env.DATABASE_URL || '';
