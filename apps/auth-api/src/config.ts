// RBAC roles and permissions
export enum Role {
  ADMIN = 'admin',
  USER = 'user',
  EMPLOYEE = 'employee',
}

export const Permissions = {
  [Role.ADMIN]: ['read', 'write', 'delete'],
  [Role.USER]: ['read', 'write'],
  [Role.EMPLOYEE]: ['read'],
};

export const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
export const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const DATABASE_URL = process.env.DATABASE_URL || '';
