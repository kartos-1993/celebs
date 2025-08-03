import React from 'react';
import { Plus, X } from 'lucide-react';
import { useFieldArray } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useState } from 'react';

import { UseFormReturn } from 'react-hook-form';
import type { CategoryFormData } from './schemas';

interface AttributeFieldSetProps {
  index: number;
  form: UseFormReturn<CategoryFormData>;
  onRemove: () => void;
}

export const AttributeFieldSet: React.FC<AttributeFieldSetProps> = ({
  index,
  form,
  onRemove,
}) => {
  const attributeType = form.watch(`attributes.${index}.type`);
  const {
    fields: valueFields,
    append: appendValue,
    remove: removeValue,
  } = useFieldArray({
    control: form.control,
    name: `attributes.${index}.values`,
  });

  const handleAddValue = () => {
    appendValue({ id: crypto.randomUUID(), name: '', value: '' });
  };

  const showRules = ['image', 'video', 'mainImage', 'marketImages'].includes(attributeType);
  const showMultiLanguage = ['text', 'richText', 'translateInput', 'listEditor'].includes(attributeType);
  const showMaxItems = ['image', 'video', 'marketImages', 'mainImage', 'listEditor'].includes(attributeType);

  // Dialog state for confirming delete
  const [open, setOpen] = useState(false);

  return (
    <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900 dark:text-gray-100">
          Attribute {index + 1}
        </h4>
        <Dialog open={open} onOpenChange={setOpen}>
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
              <DialogTitle>Delete Attribute?</DialogTitle>
            </DialogHeader>
            <div className="py-2">
              Are you sure you want to delete this attribute?
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setOpen(false);
                  onRemove();
                }}
              >
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <FormField
          control={form.control}
          name={`attributes.${index}.name`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input placeholder="Attribute name" {...field} />
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
              <FormLabel>Label</FormLabel>
              <FormControl>
                <Input placeholder="Display label" {...field} />
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
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="select">Select</SelectItem>
                  <SelectItem value="multiselect">Multi-Select</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="richText">Rich Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                  <SelectItem value="marketImages">Market Images</SelectItem>
                  <SelectItem value="mainImage">Main Image</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {(attributeType === 'select' || attributeType === 'multiselect') && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Options</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddValue}
            >
              <Plus className="h-4 w-4" />
              Add Option
            </Button>
          </div>

          {valueFields.map((field, valueIndex) => (
            <div key={field.id} className="flex gap-2">
              <FormField
                control={form.control}
                name={`attributes.${index}.values.${valueIndex}.name`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Option name" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name={`attributes.${index}.values.${valueIndex}.value`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormControl>
                      <Input placeholder="Option value" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => removeValue(valueIndex)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showRules && (
        <div className="space-y-2">
          <Label>Validation Rules</Label>
          <div className="grid grid-cols-2 gap-2">
            <FormField
              control={form.control}
              name={`attributes.${index}.rule.minWidth`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Min Width</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`attributes.${index}.rule.maxWidth`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Max Width</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} onChange={(e) => field.onChange(Number(e.target.value))} />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>
      )}

      {showMultiLanguage && (
        <FormField
          control={form.control}
          name={`attributes.${index}.multiLanguage.enabled`}
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel>Enable Multi-language Support</FormLabel>
            </FormItem>
          )}
        />
      )}

      {showMaxItems && (
        <FormField
          control={form.control}
          name={`attributes.${index}.maxItems`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Maximum Items</FormLabel>
              <FormControl>
                <Input 
                  type="number" 
                  {...field} 
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
            </FormItem>
          )}
        />
      )}
    </div>
  );
};
