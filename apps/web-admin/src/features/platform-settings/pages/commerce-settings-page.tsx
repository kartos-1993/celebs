import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Save } from 'lucide-react';

import { parseCommercePolicy } from '@celebs/shared-types';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { PlatformSettingsApiService } from '../api';
import {
  COMMERCE_FIELDS as FIELDS,
  type CommercePolicyKey,
  POLICY_FIELD_BY_KEY,
  validateCommerceField as validate,
} from '../lib/commerce-settings';

import { useToast } from '@/hooks/use-toast';

const QUERY_KEY = ['platform-settings', 'commerce'] as const;

interface FieldState {
  value: string;
  error: string | null;
}

export default function CommerceSettingsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const settings = await PlatformSettingsApiService.getSettingsByGroup('COMMERCE');
      const raw = new Map(settings.map((setting) => [setting.key, setting.value]));
      return { ...parseCommercePolicy(settings), raw };
    },
  });

  const [fields, setFields] = useState<Record<string, FieldState>>({});

  useEffect(() => {
    if (!data) return;
    setFields((prev) => {
      const next = { ...prev };
      for (const field of FIELDS) {
        // Show the stored value verbatim so an admin can see and correct an
        // unusable one, rather than being shown a default that hides the problem.
        const stored = data.raw.get(field.key);
        next[field.key] = {
          value: stored ?? String(data.policy[POLICY_FIELD_BY_KEY[field.key]]),
          error: null,
        };
      }
      return next;
    });
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: async (reason: string) => {
      await PlatformSettingsApiService.bulkUpdateSettings(
        FIELDS.map((field) => ({ key: field.key, value: fields[field.key]!.value.trim() })),
        reason,
      );
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Commerce settings updated',
        description: 'New orders use these values immediately.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Could not save',
        description: error.message || 'Failed to update commerce settings',
      });
    },
  });

  const setValue = (key: CommercePolicyKey, value: string) => {
    const allowZero = FIELDS.find((field) => field.key === key)?.allowZero ?? false;
    setFields((prev) => ({ ...prev, [key]: { value, error: validate(value, allowZero) } }));
  };

  const hasErrors = FIELDS.some((field) => {
    const state = fields[field.key];
    return !state || state.value.trim() === '' || state.error !== null;
  });

  const handleSave = () => {
    const invalid = FIELDS.find((field) => {
      const state = fields[field.key];
      return !state || state.value.trim() === '' || state.error !== null;
    });
    if (invalid) {
      toast({
        variant: 'destructive',
        title: 'Check the values',
        description: `Fix "${invalid.label}" before saving.`,
      });
      return;
    }
    saveMutation.mutate('Admin updated commerce policy from the settings centre');
  };

  if (isLoading) {
    return <Spinner />;
  }

  const unreadable = data?.invalidKeys ?? [];

  return (
    <>
      <PageHeader
        title="Commerce Settings"
        description="Cash on delivery ceiling, delivery fee and free-delivery threshold."
      />

      {unreadable.length > 0 && (
        <Card className="mb-4 border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              {unreadable.length} setting(s) could not be read
            </CardTitle>
            <CardDescription>
              The values below could not be parsed, so the shipped default is in force. Correct and
              save to fix: {unreadable.join(', ')}
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {FIELDS.map((field) => {
          const state = fields[field.key] ?? { value: '', error: null };
          return (
            <Card key={field.key}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{field.label}</CardTitle>
                <CardDescription className="text-xs">{field.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="space-y-1.5">
                  <Label htmlFor={field.key} className="text-xs font-medium">
                    Amount in NPR
                  </Label>
                  <Input
                    id={field.key}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1}
                    value={state.value}
                    onChange={(event) => setValue(field.key, event.target.value)}
                    aria-invalid={state.error !== null}
                  />
                  {state.error && (
                    <p role="alert" className="text-xs text-destructive">
                      {state.error}
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Default {field.defaultValue}
                  {field.allowZero ? ' (0 is valid)' : ''}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={hasErrors || saveMutation.isPending}>
          <Save className="mr-2 h-4 w-4" aria-hidden />
          {saveMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </>
  );
}
