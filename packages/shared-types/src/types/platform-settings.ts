export type SettingType = 'BOOLEAN' | 'NUMBER' | 'STRING' | 'JSON';

export interface PlatformSetting {
  key: string;
  value: string;
  type: SettingType;
  group: string;
  label: string;
  description?: string | null;
  isPublic: boolean;
  updatedBy?: string | null;
  updatedAt: string | Date;
  createdAt: string | Date;
}

export interface PlatformSettingAudit {
  id: string;
  settingKey: string;
  oldValue?: string | null;
  newValue: string;
  changedBy: string;
  reason?: string | null;
  createdAt: string | Date;
}

export interface UpdatePlatformSettingInput {
  value: string;
  reason?: string;
}

export interface BulkUpdatePlatformSettingsInput {
  settings: {
    key: string;
    value: string;
  }[];
  reason?: string;
}
