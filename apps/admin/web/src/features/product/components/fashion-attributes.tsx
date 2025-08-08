// no hooks needed here
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ProductAttribute } from '../types/product';

interface FashionAttributesProps {
  categoryType: string; // kept for external API parity
  attributes: ProductAttribute[];
  onAttributesChange: (attributes: ProductAttribute[]) => void;
}

const FashionAttributes = ({
  categoryType,
  attributes,
  onAttributesChange,
}: FashionAttributesProps) => {
  const updateAttribute = (name: string, value: string | string[] | number) => {
    const updated = attributes.map((attr) =>
      attr.name === name ? { ...attr, value } : attr,
    );
    onAttributesChange(updated);
  };

  const getAttributeValue = (name: string) => {
    const attr = attributes.find((a) => a.name === name);
    return attr?.value || (attr?.type === 'multiselect' ? [] : '');
  };

  const handleMultiselectChange = (
    name: string,
    option: string,
    checked: boolean,
  ) => {
    const currentValue = getAttributeValue(name) as string[];
    const newValue = checked
      ? [...currentValue, option]
      : currentValue.filter((v) => v !== option);
    updateAttribute(name, newValue);
  };

  const renderAttributeInput = (attr: ProductAttribute) => {
    const value = getAttributeValue(attr.name);

    switch (attr.type) {
      case 'select':
        return (
          <Select
            value={value as string}
            onValueChange={(val) => updateAttribute(attr.name, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder={`Select ${attr.name}`} />
            </SelectTrigger>
            <SelectContent>
              {attr.options?.map((option: string) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multiselect':
        return (
          <div className="space-y-2">
            {attr.options?.map((option: string) => (
              <div key={option} className="flex items-center space-x-2">
                <Checkbox
                  id={`${attr.name}-${option}`}
                  checked={(value as string[]).includes(option)}
                  onCheckedChange={(checked) =>
                    handleMultiselectChange(
                      attr.name,
                      option,
                      checked as boolean,
                    )
                  }
                />
                <Label htmlFor={`${attr.name}-${option}`} className="text-sm">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'number':
        return (
          <Input
            type="number"
            value={(value as number) || ''}
            onChange={(e) => updateAttribute(attr.name, Number(e.target.value))}
            placeholder={`Enter ${attr.name}`}
          />
        );

      default:
        return (
          <Input
            value={value as string}
            onChange={(e) => updateAttribute(attr.name, e.target.value)}
            placeholder={`Enter ${attr.name}`}
          />
        );
    }
  };

  if (attributes.length === 0) {
    return (
      <div className="p-8 text-center border border-dashed rounded-lg">
        <p className="text-gray-500">Attributes will load when you select a category.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Product Attributes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attributes.map((attr) => (
              <div key={attr.name} className="space-y-2">
                <Label className={attr.required ? 'required' : ''}>
                  {attr.name}
                  {attr.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                {renderAttributeInput(attr)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FashionAttributes;
