import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
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
import { ArrowLeft, Save, Flame } from 'lucide-react';
import {
  createCampaignMutationFn,
  updateCampaignMutationFn,
  getCampaignByIdQueryFn,
} from '@/lib/api';
import { BannerImageUpload } from '../components/banner-image-upload';
import { ProductSelector } from '../components/product-selector';

export function CampaignFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [tagline, setTagline] = useState('');
  const [campaignType, setCampaignType] = useState<string>('FESTIVAL');
  const [themeColor, setThemeColor] = useState('#D92525');
  const [startDate, setStartDate] = useState('2026-09-15T00:00');
  const [endDate, setEndDate] = useState('2026-10-05T23:59');
  const [bannerImage, setBannerImage] = useState('');
  const [productIds, setProductIds] = useState<string[]>([]);

  const { data: campaignDetail } = useQuery({
    queryKey: ['campaign-detail', id],
    queryFn: () => getCampaignByIdQueryFn(id!),
    enabled: Boolean(id),
  });

  useEffect(() => {
    if (campaignDetail?.data) {
      const c = campaignDetail.data;
      setTitle(c.title || '');
      setSlug(c.slug || '');
      setTagline(c.tagline || '');
      setCampaignType(c.campaignType || 'FESTIVAL');
      setThemeColor(c.themeColor || '#D92525');
      setStartDate(
        c.startDate ? new Date(c.startDate).toISOString().slice(0, 16) : '2026-09-15T00:00',
      );
      setEndDate(c.endDate ? new Date(c.endDate).toISOString().slice(0, 16) : '2026-10-05T23:59');
      setBannerImage(c.bannerImage || '');
      if (c.products && Array.isArray(c.products)) {
        setProductIds(c.products.map((p: { productId: string }) => p.productId));
      }
    }
  }, [campaignDetail]);

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

  const handleSaveCampaign = async () => {
    if (!title || !slug || !startDate || !endDate) return;

    setIsSubmitting(true);
    try {
      const payload = {
        title,
        slug,
        tagline,
        campaignType,
        themeColor,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        bannerImage,
        productIds,
      };

      if (id) {
        await updateCampaignMutationFn({ id, data: payload });
      } else {
        await createCampaignMutationFn(payload);
      }

      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      navigate('/marketing/campaigns');
    } catch (err) {
      console.error('Failed to save campaign:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0">
          <Link to="/marketing/campaigns" aria-label="Back to campaigns">
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-600" />
            {id ? 'Edit Festival Campaign' : 'Create Festival Campaign'}
          </h1>
          <p className="text-xs text-slate-500">
            Schedule festival sales (Dashain, Tihar, New Year) with hero banners and countdown
            timers.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
        {/* Title & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Campaign Title *</Label>
            <Input
              placeholder="e.g. Dashain Dhamaka 2026"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">URL Slug *</Label>
            <Input
              placeholder="dashain-dhamaka-2026"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>
        </div>

        {/* Tagline & Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Tagline</Label>
            <Input
              placeholder="e.g. Nepal's Biggest Festival Sale — Flat 40% Off Storewide"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Campaign Type</Label>
            <Select value={campaignType} onValueChange={setCampaignType}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Select Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FESTIVAL">🪔 FESTIVAL (Dashain, Tihar, Chhath)</SelectItem>
                <SelectItem value="FLASH_SALE">⚡ FLASH SALE (Limited Time)</SelectItem>
                <SelectItem value="NEW_YEAR">🎆 NEW YEAR (Nepalese / Gregorian)</SelectItem>
                <SelectItem value="SEASONAL">❄️ SEASONAL (Winter / Summer)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dates & Theme Color */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Start Date & Time *</Label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">End Date & Time *</Label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Theme Color Hex</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-10 h-9 p-1 cursor-pointer border border-slate-300 rounded"
              />
              <Input
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="text-xs h-9 font-mono uppercase"
              />
            </div>
          </div>
        </div>

        {/* Product Selection */}
        <ProductSelector
          selectedProductIds={productIds}
          onChange={setProductIds}
          label="Featured Campaign Products"
          minRequired={0}
        />

        {/* Banner Image Upload */}
        <BannerImageUpload
          value={bannerImage}
          onChange={setBannerImage}
          label="Campaign Hero Banner Image"
          aspectHint="Recommended 16:9 or 21:9 hero banner (e.g. 1920x800px)"
        />

        {/* Save Button */}
        <div className="flex justify-end pt-4 border-t border-slate-200">
          <Button
            onClick={handleSaveCampaign}
            disabled={isSubmitting || !title || !slug}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs h-9 px-6 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving Campaign...' : id ? 'Update Campaign' : 'Publish Campaign'}
          </Button>
        </div>
      </div>
    </div>
  );
}
