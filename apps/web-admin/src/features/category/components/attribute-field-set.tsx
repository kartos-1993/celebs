import React, { useState, useEffect, KeyboardEvent } from 'react';
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
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@celebs/shared-ui/components/dialog';
import { X, Plus } from 'lucide-react';
import { ProductAPI } from '@/lib/axios-client';
import { CategoryFormData } from '../schemas/category-form-schema';

export interface AttributeFieldSetProps {
  index: number;
  form: UseFormReturn<CategoryFormData>;
  onRemove: () => void;
}

interface OptionSetItem {
  id: string;
  name: string;
}

export const AttributeFieldSet: React.FC<AttributeFieldSetProps> = ({
  index,
  form,
  onRemove,
}) => {
  const attributeType = useWatch({
    control: form.control,
    name: `attributes.${index}.type`,
  });
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

  const [deleteOpen, setDeleteOpen] = useState<boolean>(false);
  const [newOptionInput, setNewOptionInput] = useState<string>('');
  const [optionSets, setOptionSets] = useState<OptionSetItem[]>([]);
  const [optionSetValues, setOptionSetValues] = useState<string[]>([]);
  const [loadingSets, setLoadingSets] = useState<boolean>(false);

  // Fetch available option sets
  useEffect(() => {
    if (useStandardOptions && isVariant) {
      let isMounted = true;
      setLoadingSets(true);
      ProductAPI.get<{ data?: Array<{ id?: string; _id?: string; name: string }> }>('/option-sets')
        .then((res) => {
          if (isMounted) {
            const rawData = res.data;
            const sets = Array.isArray(rawData?.data)
              ? rawData.data
              : Array.isArray(rawData)
              ? (rawData as Array<{ id?: string; _id?: string; name: string }>)
              : [];
            setOptionSets(
              sets.map((s) => ({
                id: String(s.id || s._id || ''),
                name: s.name,
              }))
            );
          }
        })
        .catch(() => {
          if (isMounted) setOptionSets([]);
        })
        .finally(() => {
          if (isMounted) setLoadingSets(false);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setOptionSets([]);
    }
  }, [useStandardOptions, isVariant]);

  // Load preview of standard option set values when selectedOptionSetId changes
  useEffect(() => {
    if (useStandardOptions && selectedOptionSetId) {
      let isMounted = true;
      ProductAPI.get<{ data?: { values?: Array<string | { label?: string; name?: string }> }; values?: Array<string | { label?: string; name?: string }> }>(
        `/option-sets/${selectedOptionSetId}`
      )
        .then((res) => {
          if (isMounted) {
            const rawData = res.data;
            const rawVals =
              rawData?.data?.values ?? rawData?.values ?? [];
            const strVals = rawVals
              .map((v) =>
                typeof v === 'string'
                  ? v
                  : v?.label ?? v?.name ?? ''
              )
              .filter(Boolean);
            setOptionSetValues(strVals);
          }
        })
        .catch(() => {
          if (isMounted) setOptionSetValues([]);
        });
      return () => {
        isMounted = false;
      };
    } else {
      setOptionSetValues([]);
    }
  }, [useStandardOptions, selectedOptionSetId]);

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
      { shouldDirty: true, shouldValidate: true }
    );
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
          Attribute #{index + 1}
          {isVariant && (
            <Badge
              variant="outline"
              className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800"
            >
              Variant Option
            </Badge>
          )}
        </h4>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xs">
            <DialogHeader>
              <DialogTitle>Delete Attribute</DialogTitle>
            </DialogHeader>
            <div className="py-2 text-sm text-gray-500">
              Are you sure you want to delete attribute #{index + 1}?
            </div>
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

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={`attributes.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Attribute Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Fit Type, Material, Color" {...field} />
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
              <FormLabel>Display Label (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Select Fit Type" {...field} value={field.value ?? ''} />
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
              <FormLabel>Input Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
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
                  <SelectItem value="customEditor">Custom Editor</SelectItem>
                  <SelectItem value="packageWeight">Package Weight</SelectItem>
                  <SelectItem value="packageVolume">Package Volume</SelectItem>
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
              <FormLabel>Group</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || 'basic'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="basic">Basic Info</SelectItem>
                  <SelectItem value="details">Product Details</SelectItem>
                  <SelectItem value="variant">Variant</SelectItem>
                  <SelectItem value="sale">Price & Stock</SelectItem>
                  <SelectItem value="package">Package & Shipping</SelectItem>
                  <SelectItem value="termcondition">Terms & Conditions</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <FormField
          control={form.control}
          name={`attributes.${index}.placeholder`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Placeholder</FormLabel>
              <FormControl>
                <Input placeholder="Field placeholder text" {...field} value={field.value ?? ''} />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name={`attributes.${index}.info.help`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Help Text</FormLabel>
              <FormControl>
                <Input placeholder="Tooltip help text for admin" {...field} value={field.value ?? ''} />
              </FormControl>
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
              <FormLabel className="cursor-pointer">Use as Product Variation (SKU Axis)</FormLabel>
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
              <FormLabel className="cursor-pointer">Required Field</FormLabel>
            </FormItem>
          )}
        />
      </div>

      {isVariant && (
        <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 rounded-md border border-purple-100 dark:border-purple-900/50 space-y-3">
          <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">
            ✨ Product Variant Option: Sellers will choose values for this attribute (e.g., Strap Material, Dial Color, Ring Size, Storage Capacity) to generate product SKUs.
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
                <FormLabel className="cursor-pointer text-xs">Link to Standard Option Set (e.g. Ring Sizes, Basic Colors)</FormLabel>
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
                  <Select onValueChange={field.onChange} value={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={loadingSets ? 'Loading option sets...' : 'Select standard option set'}
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
          <Label className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Attribute Option Values
          </Label>

          {useStandardOptions && selectedOptionSetId ? (
            <div className="space-y-1">
              <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                Values linked to Option Set ({optionSetValues.length} options):
              </p>
              <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-2 bg-white dark:bg-gray-950 rounded border text-xs">
                {optionSetValues.map((v, i) => (
                  <Badge key={i} variant="outline" className="text-[11px] font-normal">
                    {v}
                  </Badge>
                ))}
                {optionSetValues.length === 0 && (
                  <span className="text-gray-400 italic">No values in selected option set.</span>
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
                />
                <Button type="button" variant="outline" size="sm" onClick={handleAddManualValue}>
                  <Plus className="h-4 w-4 mr-1" /> Add Option
                </Button>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {attributeValues.map((val) => (
                  <Badge key={val} variant="secondary" className="flex items-center gap-1 py-1 px-2.5">
                    <span>{val}</span>
                    <X
                      className="h-3 w-3 cursor-pointer text-gray-500 hover:text-red-500"
                      onClick={() => handleRemoveManualValue(val)}
                    />
                  </Badge>
                ))}
                {attributeValues.length === 0 && (
                  <span className="text-xs text-gray-400 italic">No option values added yet.</span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AttributeFieldSet;
