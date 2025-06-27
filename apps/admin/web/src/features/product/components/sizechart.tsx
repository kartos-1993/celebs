import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';

export interface SizeMeasurement {
  size: string;
  bust?: number;
  waist?: number;
  hip?: number;
  length?: number;
  shoulder?: number;
  sleeveLength?: number;
}

interface SizeChartProps {
  measurements: SizeMeasurement[];
  onMeasurementsChange: (measurements: SizeMeasurement[]) => void;
  categoryType: string;
}

const SizeChart = ({
  measurements,
  onMeasurementsChange,
  categoryType,
}: SizeChartProps) => {
  const [fitRecommendation, setFitRecommendation] =
    useState<string>('true-to-size');

  const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  const measurementFields = {
    tops: ['bust', 'waist', 'length', 'shoulder', 'sleeveLength'],
    dresses: ['bust', 'waist', 'hip', 'length', 'shoulder'],
    bottoms: ['waist', 'hip', 'length', 'inseam'],
  };

  const getFieldsForCategory = () => {
    return (
      measurementFields[categoryType as keyof typeof measurementFields] ||
      measurementFields.tops
    );
  };

  const addSize = () => {
    const newSize: SizeMeasurement = {
      size: '',
      bust: undefined,
      waist: undefined,
      hip: undefined,
      length: undefined,
      shoulder: undefined,
      sleeveLength: undefined,
    };
    onMeasurementsChange([...measurements, newSize]);
  };

  const removeSize = (index: number) => {
    onMeasurementsChange(measurements.filter((_, i) => i !== index));
  };

  const updateMeasurement = (
    index: number,
    field: keyof SizeMeasurement,
    value: string | number,
  ) => {
    const updated = measurements.map((measurement, i) => {
      if (i === index) {
        return { ...measurement, [field]: value };
      }
      return measurement;
    });
    onMeasurementsChange(updated);
  };

  const fields = getFieldsForCategory();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Label>Fit Recommendation</Label>
          <Select
            value={fitRecommendation}
            onValueChange={setFitRecommendation}
          >
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true-to-size">True to Size</SelectItem>
              <SelectItem value="size-up">Runs Small (Size Up)</SelectItem>
              <SelectItem value="size-down">Runs Large (Size Down)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button type="button" onClick={addSize} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add Size
        </Button>
      </div>

      {measurements.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 border-b">
            <div
              className="grid gap-4 p-3"
              style={{
                gridTemplateColumns: `120px repeat(${fields.length}, 1fr) 40px`,
              }}
            >
              <div className="font-medium">Size</div>
              {fields.map((field) => (
                <div key={field} className="font-medium capitalize">
                  {field === 'sleeveLength' ? 'Sleeve' : field} (cm)
                </div>
              ))}
              <div></div>
            </div>
          </div>

          <div className="divide-y">
            {measurements.map((measurement, index) => (
              <div
                key={index}
                className="grid gap-4 p-3"
                style={{
                  gridTemplateColumns: `120px repeat(${fields.length}, 1fr) 40px`,
                }}
              >
                <Select
                  value={measurement.size}
                  onValueChange={(value) =>
                    updateMeasurement(index, 'size', value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    {standardSizes.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {fields.map((field) => (
                  <Input
                    key={field}
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={measurement[field as keyof SizeMeasurement] || ''}
                    onChange={(e) =>
                      updateMeasurement(
                        index,
                        field as keyof SizeMeasurement,
                        Number(e.target.value),
                      )
                    }
                  />
                ))}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSize(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {measurements.length === 0 && (
        <div className="border border-dashed rounded-lg p-6 text-center text-gray-500">
          <p>No size measurements added yet</p>
          <Button type="button" variant="link" onClick={addSize}>
            Add your first size measurement
          </Button>
        </div>
      )}
    </div>
  );
};

export default SizeChart;
