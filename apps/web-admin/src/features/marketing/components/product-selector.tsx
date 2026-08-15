import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@celebs/shared-ui/components/input';
import { Button } from '@celebs/shared-ui/components/button';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
import { Label } from '@celebs/shared-ui/components/label';
import { Search, X, Loader2, Package } from 'lucide-react';
import { getProducts } from '@/features/product/api';
import { useDebounce } from '@/hooks/use-debounce';
import type { ProductSelectorPropsType, CatalogProductType } from '@celebs/shared-types';

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
        <Label className="text-xs font-semibold text-slate-800">
          {label} {minRequired > 0 && <span className="text-rose-500">*</span>}
        </Label>
        <span className="text-xs text-slate-500 font-mono">
          {selectedProductIds.length} product{selectedProductIds.length !== 1 ? 's' : ''} selected
        </span>
      </div>

      {/* Selected Products Grid View with Images */}
      {selectedProductIds.length > 0 && (
        <div className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl space-y-2">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Selected Bundle Items ({selectedProductIds.length})</span>
            <span className="text-[10px] text-slate-400 font-normal">Click ✕ to remove</span>
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
                  className="flex items-center gap-2.5 bg-white border border-slate-200 p-2 rounded-lg shadow-2xs group relative hover:border-slate-300 transition-all"
                >
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={name}
                      className="w-10 h-10 object-cover rounded-md border border-slate-100 shrink-0 bg-slate-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-900 truncate leading-snug">
                      {name}
                    </div>
                    {price > 0 && (
                      <div className="text-[11px] font-mono text-emerald-600 font-medium">
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
                    className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
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
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
        <Input
          placeholder="Search products by name or SKU to add..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="text-xs h-9 pl-9 pr-8"
        />
        {isLoading && (
          <Loader2 className="w-4 h-4 text-slate-400 animate-spin absolute right-3 top-2.5" />
        )}
      </div>

      {/* Available Products List */}
      <div className="border border-slate-200 rounded-xl max-h-60 overflow-y-auto divide-y divide-slate-100 bg-white">
        {productsList.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
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
                className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors hover:bg-slate-50 ${
                  isSelected ? 'bg-indigo-50/50' : ''
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Checkbox checked={isSelected} className="shrink-0 pointer-events-none" />
                  {imgUrl ? (
                    <img
                      src={imgUrl}
                      alt={product.name}
                      className="w-10 h-10 object-cover rounded-md border border-slate-100 shrink-0 bg-slate-100"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-slate-900 truncate">
                      {product.name}
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      {product.price > 0
                        ? `NPR ${product.price.toLocaleString()}`
                        : 'Price not set'}
                    </div>
                  </div>
                </div>
                {isSelected ? (
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full shrink-0">
                    Added
                  </span>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-slate-600 pointer-events-none"
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
