import React, { useState, KeyboardEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { UseFormReturn, useWatch } from 'react-hook-form';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Badge } from '@celebs/shared-ui/components/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@celebs/shared-ui/components/form';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@celebs/shared-ui/components/dialog';
import { X, Plus, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { axiosClient } from '@/lib/axios/axios-client';
import type { CreateCategoryType as CategoryFormData } from '@celebs/shared-types';

export interface AttributeFieldSetProps {
  index: number;
  form: UseFormReturn<CategoryFormData>;
  onRemove: () => void;
  isOpenDefault?: boolean;
}

interface OptionSetItem {
  id: string;
  name: string;
}

export const AttributeFieldSet: React.FC<AttributeFieldSetProps> = ({
  index,
  form,
  onRemove,
  isOpenDefault = false,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(isOpenDefault);
  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [newOptionInput, setNewOptionInput] = useState<string>('');

  const attributeName =
    useWatch({
      control: form.control,
      name: `attributes.${index}.name`,
    }) || `Attribute #${index + 1}`;

  const attributeType =
    useWatch({
      control: form.control,
      name: `attributes.${index}.type`,
    }) || 'text';

  const isVariant = useWatch({
    control: form.control,
    name: `attributes.${index}.isVariant`,
  });

  const useStandardOptions = useWatch({
    control: form.control,
    name: `attributes.${index}.useStandardOptions`,
  });

  const selectedOptionSetId = useWatch({
    control: form.control,
    name: `attributes.${index}.optionSetId`,
  });

  const attributeValues: string[] =
    useWatch({
      control: form.control,
      name: `attributes.${index}.values`,
    }) || [];

  // Fetch available option sets via TanStack Query
  const { data: optionSets = [], isLoading: loadingSets } = useQuery<OptionSetItem[]>({
    queryKey: ['option-sets'],
    queryFn: async () => {
      const res = await axiosClient.get<{ data?: Array<{ id?: string; name: string }> }>(
        '/option-sets',
      );
      const rawData = res.data;
      const sets = Array.isArray(rawData?.data)
        ? rawData.data
        : Array.isArray(rawData)
          ? (rawData as Array<{ id?: string; name: string }>)
          : [];
      return sets.map((s: { id?: string; name: string }) => ({
        id: String(s.id || ''),
        name: s.name,
      }));
    },
    enabled: !!(useStandardOptions || isVariant),
    staleTime: 5 * 60 * 1000,
  });

  // Automatically resolve OptionSet ID by matching attribute name (e.g. Color -> Basic Colors, Size -> Alpha Sizes)
  const effectiveOptionSetId =
    selectedOptionSetId ||
    optionSets.find((s) => {
      const sName = s.name.toLowerCase();
      const aName = (attributeName || '').toLowerCase();
      return (
        sName === aName ||
        (aName === 'color' && sName.includes('color')) ||
        (aName === 'size' && sName.includes('size'))
      );
    })?.id;

  // Load preview of standard option set values when effectiveOptionSetId changes via TanStack Query
  const { data: optionSetValues = [] } = useQuery<string[]>({
    queryKey: ['option-set-values', effectiveOptionSetId],
    queryFn: async () => {
      if (!effectiveOptionSetId) return [];
      const res = await axiosClient.get<{
        data?: { values?: Array<string | { label?: string; name?: string }> };
        values?: Array<string | { label?: string; name?: string }>;
      }>(`/option-sets/${effectiveOptionSetId}`);
      const rawData = res.data;
      const rawVals = rawData?.data?.values ?? rawData?.values ?? [];
      return rawVals
        .map((v: string | { label?: string; name?: string }) =>
          typeof v === 'string' ? v : (v?.label ?? v?.name ?? ''),
        )
        .filter(Boolean);
    },
    enabled: !!(useStandardOptions && effectiveOptionSetId),
    staleTime: 5 * 60 * 1000,
  });

  const handleAddManualValue = () => {
    const trimmed = newOptionInput.trim();
    if (!trimmed) return;
    if (!attributeValues.includes(trimmed)) {
      form.setValue(`attributes.${index}.values`, [...attributeValues, trimmed], {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
    setNewOptionInput('');
  };

  const handleRemoveManualValue = (valToRemove: string) => {
    form.setValue(
      `attributes.${index}.values`,
      attributeValues.filter((v) => v !== valToRemove),
      { shouldDirty: true, shouldValidate: true },
    );
  };

  const matchedSetName = optionSets.find((s) => s.id === effectiveOptionSetId)?.name;

  return (
    <div className="border rounded-lg bg-card text-card-foreground shadow-2xs overflow-hidden transition-all">
      {/* Accordion Compact Header Row */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-3.5 bg-muted/20 hover:bg-muted/40 cursor-pointer select-none transition-colors border-b last:border-b-0"
      >
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs font-mono text-muted-foreground w-6">#{index + 1}</span>
          <span className="font-bold text-sm text-foreground">{attributeName}</span>

          <Badge variant="outline" className="text-[11px] font-normal uppercase tracking-wider">
            {attributeType}
          </Badge>

          {isVariant && (
            <Badge
              variant="secondary"
              className="text-xs bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
            >
              Variant Option
            </Badge>
          )}

          {useStandardOptions && (
            <Badge
              variant="outline"
              className="text-xs bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-200"
            >
              <Layers className="w-3 h-3 mr-1" />
              {matchedSetName || 'Linked Option Set'}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 w-8 text-rose-500 hover:text-rose-600"
            onClick={(e) => {
              e.stopPropagation();
              setDeleteOpen(true);
            }}
          >
            <X className="h-4 w-4" />
          </Button>

          <Button type="button" variant="ghost" size="sm" className="h-8 w-8 text-muted-foreground">
            {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Accordion Expandable Content */}
      {isOpen && (
        <div className="p-4 space-y-4 bg-card border-t">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name={`attributes.${index}.name`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Attribute Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Fit Type, Material, Color"
                      {...field}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`attributes.${index}.label`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Display Label (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Select Fit Type"
                      {...field}
                      value={field.value ?? ''}
                      className="text-sm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`attributes.${index}.type`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Input Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="text">Text Input</SelectItem>
                      <SelectItem value="select">Single Select</SelectItem>
                      <SelectItem value="multiselect">Multi-Select</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="boolean">Boolean (Switch)</SelectItem>
                      <SelectItem value="richText">Rich Text</SelectItem>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`attributes.${index}.group`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Form Group</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'basic'}>
                    <FormControl>
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Select group" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="basic">Basic Info</SelectItem>
                      <SelectItem value="details">Product Details</SelectItem>
                      <SelectItem value="variant">Variant</SelectItem>
                      <SelectItem value="sale">Price & Stock</SelectItem>
                      <SelectItem value="package">Package & Shipping</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center gap-6 border-t border-b py-2 my-2">
            <FormField
              control={form.control}
              name={`attributes.${index}.isVariant`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(val) => {
                        field.onChange(val);
                        if (val) {
                          form.setValue(`attributes.${index}.group`, 'variant');
                        }
                      }}
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer text-xs font-semibold">
                    Use as Product Variation (SKU Axis)
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name={`attributes.${index}.isRequired`}
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer text-xs">Required Field</FormLabel>
                </FormItem>
              )}
            />
          </div>

          {isVariant && (
            <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-md border border-purple-100 dark:border-purple-900/50 space-y-3">
              <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
                ✨ Product Variant Option: Sellers will choose values for this attribute to generate
                product SKUs.
              </p>

              <FormField
                control={form.control}
                name={`attributes.${index}.useStandardOptions`}
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(val) => {
                          field.onChange(val);
                          if (!val) {
                            form.setValue(`attributes.${index}.optionSetId`, null);
                          }
                        }}
                      />
                    </FormControl>
                    <FormLabel className="cursor-pointer text-xs">
                      Link to Standard Option Set (e.g. Basic Colors, Ring Sizes)
                    </FormLabel>
                  </FormItem>
                )}
              />

              {useStandardOptions && (
                <FormField
                  control={form.control}
                  name={`attributes.${index}.optionSetId`}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Linked Option Set</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        value={field.value || effectiveOptionSetId || undefined}
                      >
                        <FormControl>
                          <SelectTrigger className="text-xs">
                            <SelectValue
                              placeholder={
                                loadingSets
                                  ? 'Loading option sets...'
                                  : 'Select standard option set'
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {optionSets.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          {(attributeType === 'select' || attributeType === 'multiselect' || isVariant) && (
            <div className="space-y-2 pt-2 border-t">
              <Label className="text-xs font-semibold text-foreground">
                Attribute Option Values
              </Label>

              {useStandardOptions && effectiveOptionSetId ? (
                <div className="space-y-1">
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    Values linked to Option Set ({optionSetValues.length} options):
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-2 bg-muted/20 rounded border text-xs">
                    {optionSetValues.map((v, i) => (
                      <Badge key={i} variant="outline" className="text-[11px] font-normal">
                        {v}
                      </Badge>
                    ))}
                    {optionSetValues.length === 0 && (
                      <span className="text-muted-foreground italic">
                        No values in selected option set.
                      </span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter option value (e.g. Oversized, Red)"
                      value={newOptionInput}
                      onChange={(e) => setNewOptionInput(e.target.value)}
                      onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddManualValue();
                        }
                      }}
                      className="text-xs h-8"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddManualValue}
                      className="h-8 text-xs"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add Option
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {attributeValues.map((val) => (
                      <Badge
                        key={val}
                        variant="secondary"
                        className="flex items-center gap-1 py-0.5 px-2 text-xs"
                      >
                        <span>{val}</span>
                        <X
                          className="h-3 w-3 cursor-pointer text-muted-foreground hover:text-rose-500"
                          onClick={() => handleRemoveManualValue(val)}
                        />
                      </Badge>
                    ))}
                    {attributeValues.length === 0 && (
                      <span className="text-xs text-muted-foreground italic">
                        No option values added yet.
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>Delete Attribute</DialogTitle>
            <DialogDescription className="py-2 text-sm text-muted-foreground">
              Are you sure you want to delete attribute <strong>{attributeName}</strong>?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                onRemove();
                setDeleteOpen(false);
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AttributeFieldSet;
