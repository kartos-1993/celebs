import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PLATFORM_SETTINGS_QUERY_KEYS, PlatformSettingsApiService } from '../api';
import {
  formatSettingsForBulkUpdate,
  parseNotificationSettings,
} from '../lib/notification-settings-parser';
import type {
  NotificationTemplatesMap,
  NotificationThresholds,
  PlatformSettingItem,
} from '../types';

import { useToast } from '@/hooks/use-toast';

export interface NotificationSettingsData {
  settings: PlatformSettingItem[];
  templates: NotificationTemplatesMap;
  thresholds: NotificationThresholds;
}

export function useNotificationSettingsQuery() {
  return useQuery<NotificationSettingsData>({
    queryKey: PLATFORM_SETTINGS_QUERY_KEYS.group('NOTIFICATIONS'),
    queryFn: async () => {
      const settings = await PlatformSettingsApiService.getSettingsByGroup('NOTIFICATIONS');
      const parsed = parseNotificationSettings(settings);
      return {
        settings,
        templates: parsed.templates,
        thresholds: parsed.thresholds,
      };
    },
    staleTime: 60_000,
  });
}

export interface SaveNotificationSettingsVariables {
  templates: NotificationTemplatesMap;
  thresholds: NotificationThresholds;
  reason?: string;
}

export function useBulkUpdateNotificationSettingsMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ templates, thresholds, reason }: SaveNotificationSettingsVariables) => {
      const payload = formatSettingsForBulkUpdate(templates, thresholds);
      return PlatformSettingsApiService.bulkUpdateSettings(payload, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: PLATFORM_SETTINGS_QUERY_KEYS.group('NOTIFICATIONS'),
      });
      toast({
        title: 'Settings Saved',
        description: 'Notification templates and operational thresholds updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Failed to Save Settings',
        description: error.message || 'An unexpected error occurred while saving settings.',
      });
    },
  });
}
