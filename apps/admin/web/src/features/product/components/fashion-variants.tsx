import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Upload, X, Image, Palette } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ColorVariant {
  id: string;
  name: string;
  hexCode: string;
  swatchImage?: string;
  images: {
    front?: string;
    back?: string;
    side?: string;
    detail?: string;
    lifestyle?: string[];
  };
}

export interface SizeVariant {
  size: string;
  sku: string;
  price: number;
  stock: number;
  isAvailable: boolean;
}

export interface FashionVariant {
  id: string;
  color: ColorVariant;
  sizes: SizeVariant[];
}

interface FashionVariantsProps {
  variants: FashionVariant[];
  onVariantsChange: (variants: FashionVariant[]) => void;
}

const FashionVariants = ({
  variants,
  onVariantsChange,
}: FashionVariantsProps) => {
  const { toast } = useToast();
  const [selectedColorTab, setSelectedColorTab] = useState<string>('');

  const predefinedColors = [
    { name: 'Black', hex: '#000000' },
    { name: 'White', hex: '#FFFFFF' },
    { name: 'Navy Blue', hex: '#000080' },
    { name: 'Red', hex: '#FF0000' },
    { name: 'Green', hex: '#008000' },
    { name: 'Pink', hex: '#FFC0CB' },
    { name: 'Gray', hex: '#808080' },
    { name: 'Brown', hex: '#A52A2A' },
    { name: 'Yellow', hex: '#FFFF00' },
    { name: 'Purple', hex: '#800080' },
  ];

  const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
  const imageTypes = ['front', 'back', 'side', 'detail'] as const;

  const addColorVariant = () => {
    const newVariant: FashionVariant = {
      id: Date.now().toString(),
      color: {
        id: Date.now().toString(),
        name: '',
        hexCode: '#000000',
        images: {},
      },
      sizes: standardSizes.map((size) => ({
        size,
        sku: '',
        price: 0,
        stock: 0,
        isAvailable: true,
      })),
    };

    const updated = [...variants, newVariant];
    onVariantsChange(updated);
    setSelectedColorTab(newVariant.id);
  };

  const removeColorVariant = (variantId: string) => {
    onVariantsChange(variants.filter((v) => v.id !== variantId));
    if (selectedColorTab === variantId) {
      setSelectedColorTab(variants[0]?.id || '');
    }
  };

  const updateColorVariant = (
    variantId: string,
    field: keyof ColorVariant,
    value: any,
  ) => {
    onVariantsChange(
      variants.map((variant) =>
        variant.id === variantId
          ? { ...variant, color: { ...variant.color, [field]: value } }
          : variant,
      ),
    );
  };

  const updateSizeVariant = (
    variantId: string,
    sizeIndex: number,
    field: string,
    value: any,
  ) => {
    onVariantsChange(
      variants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              sizes: variant.sizes.map((size, index) =>
                index === sizeIndex ? { ...size, [field]: value } : size,
              ),
            }
          : variant,
      ),
    );
  };

  const handleImageUpload = (
    variantId: string,
    imageType: string,
    files: FileList | null,
  ) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const imageUrl = URL.createObjectURL(file);

    onVariantsChange(
      variants.map((variant) =>
        variant.id === variantId
          ? {
              ...variant,
              color: {
                ...variant.color,
                images: { ...variant.color.images, [imageType]: imageUrl },
              },
            }
          : variant,
      ),
    );

    toast({
      title: 'Image uploaded',
      description: `${imageType} image has been uploaded successfully.`,
    });
  };

  const selectedVariant = variants.find((v) => v.id === selectedColorTab);

  return (
    <div className="space-y-6">
      {/* Color Tabs */}
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <Button
            key={variant.id}
            type="button"
            variant={selectedColorTab === variant.id ? 'default' : 'outline'}
            onClick={() => setSelectedColorTab(variant.id)}
            className="flex items-center gap-2"
          >
            <Button
              className="w-4 h-4 rounded-full border"
              style={{ backgroundColor: variant.color.hexCode }}
            />
            {variant.color.name || 'Unnamed Color'}
          </Button>
        ))}
        <Button type="button" variant="outline" onClick={addColorVariant}>
          <Plus className="h-4 w-4 mr-2" />
          Add Color
        </Button>
      </div>

      {/* Color Variant Details */}
      {selectedVariant && (
        <div className="space-y-6">
          {/* Color Information */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Color Details
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeColorVariant(selectedVariant.id)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Color Name</Label>
                  <Select
                    value={selectedVariant.color.name}
                    onValueChange={(value) => {
                      const selectedColor = predefinedColors.find(
                        (c) => c.name === value,
                      );
                      updateColorVariant(selectedVariant.id, 'name', value);
                      if (selectedColor) {
                        updateColorVariant(
                          selectedVariant.id,
                          'hexCode',
                          selectedColor.hex,
                        );
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select color" />
                    </SelectTrigger>
                    <SelectContent>
                      {predefinedColors.map((color) => (
                        <SelectItem key={color.name} value={color.name}>
                          <Button
                            className="flex items-center gap-2"
                            style={{ backgroundColor: color.hex }}
                          >
                            {color.name}
                          </Button>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Hex Code</Label>
                  <div className="flex gap-2">
                    <Input
                      value={selectedVariant.color.hexCode}
                      onChange={(e) =>
                        updateColorVariant(
                          selectedVariant.id,
                          'hexCode',
                          e.target.value,
                        )
                      }
                      placeholder="#000000"
                    />
                    <Input
                      type="color"
                      value={selectedVariant.color.hexCode}
                      onChange={(e) =>
                        updateColorVariant(
                          selectedVariant.id,
                          'hexCode',
                          e.target.value,
                        )
                      }
                      className="w-12 h-10 border rounded cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Color Swatch</Label>
                  <label className="flex justify-center">
                    <div className="w-20 h-10 border-2 border-dashed border-gray-300 rounded flex items-center justify-center cursor-pointer hover:border-fashion-500">
                      {selectedVariant.color.swatchImage ? (
                        <img
                          src={selectedVariant.color.swatchImage}
                          alt="Swatch"
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <Upload className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files?.[0]) {
                          const url = URL.createObjectURL(e.target.files[0]);
                          updateColorVariant(
                            selectedVariant.id,
                            'swatchImage',
                            url,
                          );
                        }
                      }}
                    />
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Images */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Product Images
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {imageTypes.map((type) => (
                  <div key={type} className="space-y-2">
                    <Label className="capitalize">{type} View</Label>
                    <label className="block">
                      <div className="aspect-square border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-fashion-500 relative overflow-hidden">
                        {selectedVariant.color.images[type] ? (
                          <>
                            <img
                              src={selectedVariant.color.images[type]}
                              alt={`${type} view`}
                              className="w-full h-full object-cover"
                            />
                            <Button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                updateColorVariant(
                                  selectedVariant.id,
                                  'images',
                                  {
                                    ...selectedVariant.color.images,
                                    [type]: undefined,
                                  },
                                );
                              }}
                              className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                              size="icon"
                              variant="destructive"
                              title={`Remove ${type} image`}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <div className="text-center">
                            <Upload className="h-6 w-6 mx-auto text-gray-400 mb-1" />
                            <span className="text-xs text-gray-500">
                              Upload {type}
                            </span>
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleImageUpload(
                            selectedVariant.id,
                            type,
                            e.target.files,
                          )
                        }
                      />
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Size & Inventory */}
          <Card>
            <CardHeader>
              <CardTitle>Size & Inventory</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {selectedVariant.sizes.map((sizeVariant, index) => (
                  <div
                    key={sizeVariant.size}
                    className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center p-3 border rounded-lg"
                  >
                    <div className="font-medium">{sizeVariant.size}</div>
                    <Input
                      placeholder="SKU"
                      value={sizeVariant.sku}
                      onChange={(e) =>
                        updateSizeVariant(
                          selectedVariant.id,
                          index,
                          'sku',
                          e.target.value,
                        )
                      }
                    />
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2">
                        $
                      </span>
                      <Input
                        type="number"
                        placeholder="Price"
                        className="pl-6"
                        value={sizeVariant.price || ''}
                        onChange={(e) =>
                          updateSizeVariant(
                            selectedVariant.id,
                            index,
                            'price',
                            Number(e.target.value),
                          )
                        }
                      />
                    </div>
                    <Input
                      type="number"
                      placeholder="Stock"
                      value={sizeVariant.stock || ''}
                      onChange={(e) =>
                        updateSizeVariant(
                          selectedVariant.id,
                          index,
                          'stock',
                          Number(e.target.value),
                        )
                      }
                    />{' '}
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id={`available-${sizeVariant.size}`}
                        checked={sizeVariant.isAvailable}
                        onCheckedChange={(checked) =>
                          updateSizeVariant(
                            selectedVariant.id,
                            index,
                            'isAvailable',
                            checked,
                          )
                        }
                      />
                      <Label
                        htmlFor={`available-${sizeVariant.size}`}
                        className="text-sm"
                      >
                        Available
                      </Label>
                    </div>
                    <Badge
                      variant={
                        sizeVariant.stock > 0 ? 'default' : 'destructive'
                      }
                    >
                      {sizeVariant.stock > 0 ? 'In Stock' : 'Out of Stock'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {variants.length === 0 && (
        <div className="border border-dashed rounded-lg p-8 text-center">
          <div className="space-y-3">
            <div className="mx-auto w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <Palette className="h-6 w-6 text-gray-400" />
            </div>
            <div>
              <h3 className="font-medium">No color variants</h3>
              <p className="text-gray-500 text-sm">
                Add color variants to manage inventory and pricing
              </p>
            </div>
            <Button type="button" onClick={addColorVariant}>
              Add First Color Variant
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FashionVariants;
