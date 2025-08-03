import { useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormControl, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import type { Control } from "react-hook-form";
import type { CategoryFormData } from "./schemas";

interface SizeVariantsProps {
  control: Control<CategoryFormData>;
}

export function SizeVariants({ control }: SizeVariantsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variantConfig.sizes",
  });

  return (
    <div className="space-y-2">
      <Label>Size Configuration</Label>
      <div className="grid gap-4">
        {fields.map((size, idx) => (
          <div key={size.id} className="flex items-center space-x-4">
            <FormItem className="flex-1">
              <FormControl>
                <Controller
                  control={control}
                  name={`variantConfig.sizes.${idx}.name`}
                  render={({ field }) => (
                    <Input placeholder="Size name" {...field} />
                  )}
                />
              </FormControl>
            </FormItem>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => remove(idx)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ name: '' })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Size
        </Button>
      </div>
    </div>
  );
}
