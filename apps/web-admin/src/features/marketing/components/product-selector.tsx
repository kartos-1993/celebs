import React, { useEffect, useMemo,useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Package,Search, X } from 'lucide-react';

import type { CatalogProductType,ProductSelectorPropsType } from '@celebs/shared-types';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { Spinner } from '@celebs/shared-ui/components/spinner';

import { getProducts } from '@/features/product/api';
import { useDebounce } from '@/hooks/use-debounce';

const getProductImage = (p: CatalogProductType): string | null => {
  if (p.mainImages && p.mainImages.length > 0) return p.mainImages[0];
  if (p.colorVariants && p.colorVariants.length > 0 && p.colorVariants[0]?.images?.length) {
    return p.colorVariants[0].images[0];
  }
  if (p.skus && p.skus.length > 0 && p.skus[0]?.image) return p.skus[0].image;
  return null;
};

export function ProductSelector({
  selectedProductIds,
  onChange,
  label = 'Select Products for Bundle',
  minRequired = 1,
}: ProductSelectorPropsType) {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearchTerm = useDebounce(searchTerm, 350);
  const [selectedItemsDetails, setSelectedItemsDetails] = useState<
    Record<string, CatalogProductType>
  >({});

  const { data, isLoading } = useQuery({
    queryKey: ['products', 'selector', debouncedSearchTerm],
    queryFn: () => getProducts({ search: debouncedSearchTerm || undefined, limit: 20 }),
  });

  const rawProducts = data?.data?.products;
  const productsList = useMemo(
    () => (rawProducts as CatalogProductType[]) ?? [],
    [rawProducts],
  );

  useEffect(() => {
    if (productsList.length > 0) {
      setSelectedItemsDetails((prev) => {
        const next = { ...prev };
        productsList.forEach((p: CatalogProductType) => {
          if (p.id) next[p.id] = p;
        });
        return next;
      });
    }
  }, [productsList]);

  const toggleSelect = (id: string) => {
    if (!id) return;
    if (selectedProductIds.includes(id)) {
      onChange(selectedProductIds.filter((item) => item !== id));
    } else {
      onChange([...selectedProductIds, id]);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>
          {label} {minRequired > 0 && <span className="text-destructive">*</span>}
        </Label>
        <span className="text-xs text-muted-foreground font-mono">
          {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Selected Products Grid View with Images */}
      {selectedProductIds.length > 0 && (
        <div className="p-3 bg-muted/50 border border-border rounded-xl space-y-2">
          <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
            <span>Selected Bundle Items ({selectedProductIds.length})</span>
            <span className="text-xs text-muted-foreground font-normal">Click ✕ to remove</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {selectedProductIds.map((id) => {
              const item = selectedItemsDetails[id];
              const imgUrl = item ? getProductImage(item) : null;
              const name = item?.name || `Product ${id.slice(0, 8)}…`;
              const price = item?.price ?? 0;

              return (
                <div
                  key={id}
                  className="flex items-center gap-2.5 bg-card border border-border p-2 rounded-lg shadow-2xs group relative hover:border-border transition-all"
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={name}
                      className="w-10 h-10 object-cover rounded-md border border-border shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-foreground truncate leading-snug">
                      {name}
                    </div>
                    {price > 0 && (
                      <div className="text-xs font-mono text-success font-medium">
                        NPR {price.toLocaleString()}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(id);
                    }}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    title="Remove from bundle"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
        <Input
          placeholder="Search products by name or SKU to add..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs h-9 pl-9 pr-8"
        />
        {isLoading && (
          <Spinner size="sm" className="text-muted-foreground absolute right-3 top-2.5" />
        )}
      </div>

      {/* Available Products List */}
      <div className="border border-border rounded-xl max-h-60 overflow-y-auto divide-y divide-border bg-card">
        {productsList.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {isLoading ? 'Loading catalog products...' : 'No products found matching search.'}
          </div>
        ) : (
          productsList.map((product: CatalogProductType) => {
            const isSelected = selectedProductIds.includes(product.id);
            const imgUrl = getProductImage(product);

            return (
              <div
                key={product.id}
                onClick={() => toggleSelect(product.id)}
                className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors hover:bg-muted/50 ${
                  isSelected ? 'bg-info/10' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox checked={isSelected} className="shrink-0 pointer-events-none" />
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded-md border border-border shrink-0 bg-muted"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-muted border border-border flex items-center justify-center text-muted-foreground shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-foreground truncate">
                      {product.name}
                    </div>
                    <div className="text-xs text-muted-foreground font-mono">
                      {product.price > 0
                        ? `NPR ${product.price.toLocaleString()}`
                        : 'Price not set'}
                    </div>
                  </div>
                </div>
                {isSelected ? (
                  <Badge variant="info" className="shrink-0">
                    Added
                  </Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-muted-foreground pointer-events-none"
                  >
                    Select
                  </Button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
