import { useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormControl, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, X } from "lucide-react";
import type { Control } from "react-hook-form";
import type { CategoryFormData } from "./schemas";

interface ColorVariantsProps {
  control: Control<CategoryFormData>;
}

export function ColorVariants({ control }: ColorVariantsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variantConfig.colors",
  });

  return (
    <div className="space-y-2">
      <Label>Color Variants</Label>
      <div className="grid gap-4">
        {fields.map((color, idx) => (
          <div key={color.id} className="flex items-center space-x-4">
            <FormItem className="flex-1">
              <FormControl>
                <Controller
                  control={control}
                  name={`variantConfig.colors.${idx}.name`}
                  render={({ field }) => (
                    <Input placeholder="Color name" {...field} />
                  )}
                />
              </FormControl>
            </FormItem>
            <FormItem className="w-32">
              <FormControl>
                <Controller
                  control={control}
                  name={`variantConfig.colors.${idx}.colorCode`}
                  render={({ field }) => (
                    <Input type="color" {...field} />
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
          onClick={() => append({ name: '', colorCode: '#000000' })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Color
        </Button>
      </div>
    </div>
  );
}
