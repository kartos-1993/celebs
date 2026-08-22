import { useEffect,useState } from 'react';
import { Link,useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Flame,Save } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import { PageHeader } from '@celebs/shared-ui/components/page-header';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { logger } from '@celebs/shared-utils';

import { createCampaign, getCampaignById,updateCampaign } from '../api';
import { MARKETING_QUERY_KEYS } from '../api';
import { BannerImageUpload } from '../components/banner-image-upload';
import { ProductSelector } from '../components/product-selector';

export default function CampaignFormPage() {
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
    queryKey: MARKETING_QUERY_KEYS.campaignDetail(id),
    queryFn: () => getCampaignById(id!),
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
        await updateCampaign({ id, data: payload });
      } else {
        await createCampaign(payload);
      }

      queryClient.invalidateQueries({ queryKey: MARKETING_QUERY_KEYS.all });
      navigate('/marketing/campaigns');
    } catch (err) {
      logger.error({ error: err }, 'Failed to save campaign');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title={
          <>
            <Flame className="mr-2 inline h-5 w-5 text-destructive" />
            {id ? 'Edit Festival Campaign' : 'Create Festival Campaign'}
          </>
        }
        description="Schedule festival sales (Dashain, Tihar, New Year) with hero banners and countdown timers."
        actions={
          <Button asChild variant="outline" size="sm" className="h-8 w-8 p-0">
            <Link to="/marketing/campaigns" aria-label="Back to campaigns">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        }
      />

      <div className="bg-card rounded-xl border border-border p-6 shadow-sm space-y-6">
        {/* Title & Slug */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>
              Campaign Title <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="e.g. Dashain Dhamaka 2026"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              URL Slug <span className="text-destructive">*</span>
            </Label>
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
            <Label>Tagline</Label>
            <Input
              placeholder="e.g. Nepal's Biggest Festival Sale — Flat 40% Off Storewide"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Campaign Type</Label>
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
            <Label>
              Start Date & Time <span className="text-destructive">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>
              End Date & Time <span className="text-destructive">*</span>
            </Label>
            <Input
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs h-9 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Theme Color Hex</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="w-10 h-9 p-1 cursor-pointer border border-border rounded"
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
        <div className="flex justify-end pt-4 border-t border-border">
          <Button
            onClick={handleSaveCampaign}
            disabled={isSubmitting || !title || !slug}
            className="h-9 px-6 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Saving Campaign...' : id ? 'Update Campaign' : 'Publish Campaign'}
          </Button>
        </div>
      </div>
    </div>
  );
}
