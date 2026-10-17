import React, { useEffect, useState } from 'react';
import { RefreshCw, Save } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@celebs/shared-ui/components/tabs';

import { SettingsThresholdsForm } from '../components/settings-thresholds-form';
import { TemplateListGrid } from '../components/template-list-grid';
import {
  useBulkUpdateNotificationSettingsMutation,
  useNotificationSettingsQuery,
} from '../hooks/use-notification-settings';
import {
  DEFAULT_NOTIFICATION_TEMPLATES_ADMIN,
  DEFAULT_NOTIFICATION_THRESHOLDS,
} from '../lib/notification-settings-defaults';
import type {
  NotificationTemplateItem,
  NotificationTemplatesMap,
  NotificationThresholds,
} from '../types';

export default function NotificationSettingsPage() {
  const { data, isLoading } = useNotificationSettingsQuery();
  const bulkUpdateMutation = useBulkUpdateNotificationSettingsMutation();

  const [thresholds, setThresholds] = useState<NotificationThresholds>(
    DEFAULT_NOTIFICATION_THRESHOLDS,
  );
  const [templates, setTemplates] = useState<NotificationTemplatesMap>(
    DEFAULT_NOTIFICATION_TEMPLATES_ADMIN,
  );

  useEffect(() => {
    if (data) {
      setThresholds(data.thresholds);
      setTemplates(data.templates);
    }
  }, [data]);

  const handleTemplateChange = (key: string, updated: NotificationTemplateItem) => {
    setTemplates((prev) => ({ ...prev, [key]: updated }));
  };

  const handleResetDefaults = () => {
    setThresholds(DEFAULT_NOTIFICATION_THRESHOLDS);
    setTemplates(DEFAULT_NOTIFICATION_TEMPLATES_ADMIN);
  };

  const handleSave = () => {
    bulkUpdateMutation.mutate({
      thresholds,
      templates,
      reason: 'Admin updated notification settings and message templates',
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notification Platform Settings"
        description="Configure operational quiet hours, delivery risk thresholds, and omnichannel templates."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetDefaults}
              disabled={bulkUpdateMutation.isPending}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Reset Defaults
            </Button>
            <Button size="sm" onClick={handleSave} disabled={bulkUpdateMutation.isPending}>
              {bulkUpdateMutation.isPending ? (
                <Spinner className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </div>
        }
      />

      <Tabs defaultValue="thresholds" className="space-y-4">
        <TabsList>
          <TabsTrigger value="thresholds">Operational Thresholds</TabsTrigger>
          <TabsTrigger value="templates">Lifecycle Message Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="thresholds">
          <SettingsThresholdsForm thresholds={thresholds} onChange={setThresholds} />
        </TabsContent>

        <TabsContent value="templates">
          <TemplateListGrid templates={templates} onChange={handleTemplateChange} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
