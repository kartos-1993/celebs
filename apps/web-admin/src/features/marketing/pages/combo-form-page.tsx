import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { logger } from '@celebs/shared-utils';
import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { createCombo, updateCombo, getComboById } from '../api';
import { MARKETING_QUERY_KEYS } from '../api';
import type { ComboDiscountType } from '@celebs/shared-types';
import { BannerImageUpload } from '../components/banner-image-upload';
import { ProductSelector } from '../components/product-selector';

export default function ComboFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [tag, setTag] = useState('abroad-travel');
  const [discountType, setDiscountType] = useState<ComboDiscountType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number>(15);
  const [bannerImage, setBannerImage] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);

  const { data: comboDetail } = useQuery({
    queryKey: MARKETING_QUERY_KEYS.comboDetail(id),
    queryFn: () => getComboById(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (comboDetail?.data) {
      const c = comboDetail.data;
      setTitle(c.title || '');
      setSlug(c.slug || '');
      setSubtitle(c.subtitle || '');
      setTag(c.tag || 'abroad-travel');
      setDiscountType(c.discountType || 'PERCENTAGE');
      setDiscountValue(Number(c.discountValue) || 15);
      setBannerImage(c.bannerImage || '');
      if (c.items && Array.isArray(c.items)) {
        setProductIds(c.items.map((i: { productId: string }) => i.productId));
      }
    }
  }, [comboDetail]);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!id) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      );
    }
  };

  const handleSaveCombo = async () => {
    if (!title || !slug || productIds.length < 2) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        slug,
        subtitle,
        tag,
        discountType,
        discountValue: Number(discountValue),
        bannerImage,
        productIds,
        isFirstParty: true,
      };

      if (id) {
        await updateCombo({ id, data: payload });
      } else {
        await createCombo(payload);
      }

      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.all });
      navigate('/marketing/combos');
    } catch (err) {
      logger.error({ error: err }, 'Failed to save combo bundle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0">
          <Link to="/marketing/combos" aria-label="Back to combos">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            {id ? 'Edit Combo Bundle' : 'Create Generic Combo Bundle'}
          </h1>
          <p className="text-xs text-slate-500">
            Configure multi-product kits, festive bundles, and travel packs with customer savings
            rules.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
        {/* Title & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Bundle Title *</Label>
            <Input
              placeholder="e.g. Australia Winter Survival Kit"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">URL Slug *</Label>
            <Input
              placeholder="australia-winter-survival-kit"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>
        </div>

        {/* Subtitle & Tag */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Subtitle / Catchphrase</Label>
            <Input
              placeholder="e.g. Complete thermal & heavy coat pack for Aussie winters"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Category Tag</Label>
            <Select value={tag} onValueChange={setTag}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Select Tag" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="abroad-travel">✈️ Abroad Travel Pack</SelectItem>
                <SelectItem value="festive">🪔 Festive & Festival Pack</SelectItem>
                <SelectItem value="style-pack">👗 Style & Outfit Pack</SelectItem>
                <SelectItem value="general">✨ General Bundle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Discount Type & Value */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Discount Calculation Type</Label>
            <Select
              value={discountType}
              onValueChange={(val: ComboDiscountType) => setDiscountType(val)}
            >
              <SelectTrigger className="text-xs h-9 bg-card">
                <SelectValue placeholder="Discount Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PERCENTAGE">% Percentage Off Bundle Total</SelectItem>
                <SelectItem value="FIXED_AMOUNT">NPR Flat Rupee Savings</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Discount Amount {discountType === 'PERCENTAGE' ? '(%)' : '(NPR)'} *
            </Label>
            <Input
              type="number"
              placeholder={discountType === 'PERCENTAGE' ? '15' : '2000'}
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
              className="text-xs h-9 bg-card font-mono"
            />
          </div>
        </div>

        {/* Product Selection */}
        <ProductSelector
          selectedProductIds={productIds}
          onChange={setProductIds}
          label="Bundle Products"
          minRequired={1}
        />

        {/* Banner Image Upload */}
        <BannerImageUpload
          value={bannerImage}
          onChange={setBannerImage}
          label="Combo Bundle Banner Image"
          aspectHint="Recommended 16:9 widescreen image (e.g. 1200x675px)"
        />

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button
            onClick={handleSaveCombo}
            disabled={isSubmitting || !title || !slug}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 px-6 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting
              ? 'Saving Bundle...'
              : id
                ? 'Update Combo Bundle'
                : 'Publish Combo Bundle'}
          </Button>
        </div>
      </div>
    </div>
  );
}
