import { Permission } from './permissions';

export type PermissionRequirement = Permission | Permission[];
export type PermissionMode = 'ANY' | 'ALL';
