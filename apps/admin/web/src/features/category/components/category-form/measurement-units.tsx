import { useFieldArray, Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { FormControl, FormItem } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X } from "lucide-react";
import type { Control } from "react-hook-form";
import type { CategoryFormData } from "./schemas";

interface MeasurementUnitsProps {
  control: Control<CategoryFormData>;
}

export function MeasurementUnits({ control }: MeasurementUnitsProps) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variantConfig.measurementUnits",
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-lg font-semibold">Measurement Units</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({
            name: '',
            label: '',
            unit: 'inches',
            order: fields.length + 1
          })}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Measurement
        </Button>
      </div>
      <div className="space-y-2">
        {fields.map((field, index) => (
          <div key={field.id} className="flex items-center gap-4">
            <FormItem className="flex-1">
              <FormControl>
                <Controller
                  control={control}
                  name={`variantConfig.measurementUnits.${index}.label`}
                  render={({ field }) => (
                    <Input 
                      placeholder="Display Label (e.g., Chest, Waist)" 
                      {...field} 
                    />
                  )}
                />
              </FormControl>
            </FormItem>
            <FormItem className="flex-1">
              <FormControl>
                <Controller
                  control={control}
                  name={`variantConfig.measurementUnits.${index}.name`}
                  render={({ field }) => (
                    <Input 
                      placeholder="Technical name (no spaces)" 
                      {...field} 
                    />
                  )}
                />
              </FormControl>
            </FormItem>
            <FormItem>
              <Controller
                control={control}
                name={`variantConfig.measurementUnits.${index}.unit`}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value || 'inches'}>
                    <FormControl>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="inches">Inches</SelectItem>
                      <SelectItem value="cm">Centimeters</SelectItem>
                      <SelectItem value="mm">Millimeters</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormItem>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => remove(index)}
              className="text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
