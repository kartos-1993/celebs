import React from 'react';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';

import type { NotificationThresholds } from '../types';

export interface SettingsThresholdsFormProps {
  thresholds: NotificationThresholds;
  onChange: (updated: NotificationThresholds) => void;
}

export function SettingsThresholdsForm({ thresholds, onChange }: SettingsThresholdsFormProps) {
  const updateField = <K extends keyof NotificationThresholds>(
    key: K,
    value: NotificationThresholds[K],
  ) => {
    onChange({ ...thresholds, [key]: value });
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Delivery & Quiet Hours</CardTitle>
          <CardDescription className="text-xs">
            Configure delivery rules, polling, and customer do-not-disturb window.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quiet Hours Start</Label>
              <Input
                type="time"
                value={thresholds.quietHoursStart}
                onChange={(e) => updateField('quietHoursStart', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Quiet Hours End</Label>
              <Input
                type="time"
                value={thresholds.quietHoursEnd}
                onChange={(e) => updateField('quietHoursEnd', e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Admin Polling Interval (seconds)</Label>
            <Input
              type="number"
              min={30}
              max={300}
              value={thresholds.adminPollingIntervalSeconds}
              onChange={(e) =>
                updateField(
                  'adminPollingIntervalSeconds',
                  Math.max(30, Number(e.target.value) || 30),
                )
              }
              className="h-8 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Frequency for top-bar bell polling (30s – 300s). Default 90s.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Max Daily Marketing Pushes</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={thresholds.maxMarketingPushesPerDay}
              onChange={(e) =>
                updateField('maxMarketingPushesPerDay', Math.max(1, Number(e.target.value) || 1))
              }
              className="h-8 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Operational Triggers & Risk</CardTitle>
          <CardDescription className="text-xs">
            Thresholds for high-risk flags and behavioral automated pushes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Critical COD Threshold (NPR)</Label>
            <Input
              type="number"
              min={1000}
              step={500}
              value={thresholds.criticalCodThreshold}
              onChange={(e) =>
                updateField('criticalCodThreshold', Math.max(0, Number(e.target.value) || 0))
              }
              className="h-8 text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              Cash-on-Delivery orders at or above this amount will trigger high-priority critical
              alerts.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Low Stock Warning Threshold</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={thresholds.cartLowStockThreshold}
              onChange={(e) =>
                updateField('cartLowStockThreshold', Math.max(1, Number(e.target.value) || 1))
              }
              className="h-8 text-sm"
            />
          </div>

          <div className="space-y-2 pt-1 border-t border-border/40">
            <div className="flex items-center space-x-2 pt-2">
              <Checkbox
                id="abandoned-cart-toggle"
                checked={thresholds.abandonedCartEnabled}
                onCheckedChange={(checked) => updateField('abandonedCartEnabled', Boolean(checked))}
              />
              <Label htmlFor="abandoned-cart-toggle" className="text-xs font-medium cursor-pointer">
                Enable Automated Cart Abandonment Pushes
              </Label>
            </div>

            {thresholds.abandonedCartEnabled && (
              <div className="space-y-1.5 pl-6 pt-1">
                <Label className="text-xs font-medium">Abandoned Cart Delay (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  max={1440}
                  value={thresholds.abandonedCartDelayMinutes}
                  onChange={(e) =>
                    updateField(
                      'abandonedCartDelayMinutes',
                      Math.max(15, Number(e.target.value) || 15),
                    )
                  }
                  className="h-8 text-sm"
                />
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
