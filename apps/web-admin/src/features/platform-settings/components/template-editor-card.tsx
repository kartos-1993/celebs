import React from 'react';

import { Badge } from '@celebs/shared-ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@celebs/shared-ui/components/card';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { Textarea } from '@celebs/shared-ui/components/textarea';

import { validateTemplateVariables } from '../lib/notification-settings-defaults';
import type { NotificationTemplateItem } from '../types';

export interface TemplateEditorCardProps {
  eventKey: string;
  label: string;
  template: NotificationTemplateItem;
  onChange: (updated: NotificationTemplateItem) => void;
}

export function TemplateEditorCard({
  eventKey,
  label,
  template,
  onChange,
}: TemplateEditorCardProps) {
  const { isValid, missingVariables } = validateTemplateVariables(template);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...template, title: e.target.value });
  };

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange({ ...template, body: e.target.value });
  };

  const handleInsertVariable = (variable: string) => {
    onChange({
      ...template,
      body: `${template.body} {{${variable}}}`,
    });
  };

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <CardTitle className="text-base font-semibold">{label}</CardTitle>
            <p className="text-xs font-mono text-muted-foreground">{eventKey}</p>
          </div>
          <Badge variant={template.severity === 'CRITICAL' ? 'destructive' : 'secondary'}>
            {template.severity}
          </Badge>
        </div>

        {!isValid && (
          <p className="text-xs text-destructive font-medium mt-1">
            Missing required variable(s): {missingVariables.map((v) => `{{${v}}}`).join(', ')}
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Notification Title</Label>
          <Input
            value={template.title}
            maxLength={100}
            onChange={handleTitleChange}
            placeholder="e.g. Order Shipped ✈️"
            className="h-8 text-sm"
          />
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">Notification Body</Label>
          <Textarea
            value={template.body}
            maxLength={250}
            onChange={handleBodyChange}
            rows={2}
            placeholder="Notification message..."
            className="text-sm resize-none"
          />
        </div>

        {template.allowedVariables && template.allowedVariables.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[11px] font-medium text-muted-foreground">
              Available Variables:
            </span>
            <div className="flex flex-wrap gap-1.5 mt-0.5">
              {template.allowedVariables.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => handleInsertVariable(variable)}
                  className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                >
                  {`{{${variable}}}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
