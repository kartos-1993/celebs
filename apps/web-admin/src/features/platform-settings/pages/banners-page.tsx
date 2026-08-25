import React, { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Eye, Link2, Smartphone, Upload } from 'lucide-react';

import { Button } from '@celebs/shared-ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@celebs/shared-ui/components/card';
import { Checkbox } from '@celebs/shared-ui/components/checkbox';
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
import { Spinner } from '@celebs/shared-ui/components/spinner';

import type { Category } from '../../category/types';
import { ProductApiService } from '../../product/api';
import { Banner, PlatformSettingsApiService } from '../api';

import { PageLoader } from '@/components/page-loader';
import { CategoryApiService } from '@/features/category/api';
import { useToast } from '@/hooks/use-toast';

const Banners: React.FC = () => {
  const { toast } = useToast();
  const [banners, setBanners] = useState<Banner[]>([
    { imageUrl: '', linkType: 'NONE', linkValue: '', title: 'Slide 1', order: 1, isActive: true },
    { imageUrl: '', linkType: 'NONE', linkValue: '', title: 'Slide 2', order: 2, isActive: true },
    { imageUrl: '', linkType: 'NONE', linkValue: '', title: 'Slide 3', order: 3, isActive: true },
  ]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Array<Record<string, unknown>>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const [activePreviewIndex, setActivePreviewIndex] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedBanners, fetchedCategories, fetchedProductsData] = await Promise.all([
        PlatformSettingsApiService.getBanners(),
        CategoryApiService.getCategories(),
        ProductApiService.getProducts({ limit: 100 }),
      ]);

      if (Array.isArray(fetchedBanners) && fetchedBanners.length > 0) {
        setBanners(fetchedBanners);
      }

      const categoriesList = fetchedCategories?.data?.categories || [];
      setCategories(categoriesList);

      const productsList =
        fetchedProductsData?.data?.products ||
        (Array.isArray(fetchedProductsData?.data) ? fetchedProductsData.data : []) ||
        (Array.isArray(fetchedProductsData) ? fetchedProductsData : []);
      setProducts(productsList as Array<Record<string, unknown>>);
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Error fetching data',
        description: err.message || 'Failed to load banner settings.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFieldChange = (index: number, field: keyof Banner, value: Banner[keyof Banner]) => {
    const updated = [...banners];
    updated[index] = {
      ...updated[index],
      [field]: value,
      // Reset link value if link type is set to NONE
      ...(field === 'linkType' && value === 'NONE' ? { linkValue: '' } : {}),
    };
    setBanners(updated);
  };

  const handleImageUpload = async (index: number, file: File) => {
    try {
      setUploadingIndex(index);
      const imageUrl = await PlatformSettingsApiService.uploadBannerImage(file);
      handleFieldChange(index, 'imageUrl', imageUrl);
      toast({
        title: 'Image uploaded',
        description: `Banner ${index + 1} image uploaded successfully.`,
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: err.message || 'Failed to upload image.',
      });
    } finally {
      setUploadingIndex(null);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Validate that at least one banner image is present if isActive is true
      const hasInvalidActiveBanner = banners.some((b) => b.isActive && !b.imageUrl);
      if (hasInvalidActiveBanner) {
        throw new Error('Please upload an image for all active banners.');
      }

      await PlatformSettingsApiService.updateBanners(banners);
      toast({
        title: 'Settings saved',
        description: 'Mobile banner slider updated successfully.',
      });
    } catch (error: unknown) {
      const err = error as { message?: string };
      toast({
        variant: 'destructive',
        title: 'Save failed',
        description: err.message || 'Failed to save settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <PageLoader />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Mobile Banner Slider"
        description={
          'Manage the hero banner carousel displayed at the top of the mobile home screen.'
        }
        actions={
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Spinner size="sm" />}
            Save Configuration
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Banner Configuration Editor */}
        <div className="lg:col-span-2 space-y-6">
          {banners.map((banner, index) => (
            <Card key={index} className="shadow-sm">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Banner Slide {index + 1}</CardTitle>
                  <CardDescription>Configure image and action link</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium">Active:</span>
                  <Checkbox
                    checked={banner.isActive}
                    onCheckedChange={(checked) =>
                      handleFieldChange(index, 'isActive', checked === true)
                    }
                    className="w-4 h-4"
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Image upload row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-1">
                    <div
                      className="relative border-2 border-dashed border-border rounded-lg h-32 flex flex-col items-center justify-center overflow-hidden bg-muted/50 group cursor-pointer hover:border-primary transition-colors"
                      onClick={() => document.getElementById(`file-input-${index}`)?.click()}
                    >
                      {banner.imageUrl ? (
                        <>
                          <img
                            src={banner.imageUrl}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Upload className="text-white w-6 h-6" />
                          </div>
                        </>
                      ) : (
                        <div className="text-center p-3">
                          {uploadingIndex === index ? (
                            <div className="flex items-center justify-center py-4">
                              <Spinner size="xl" className="text-primary" />
                            </div>
                          ) : (
                            <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
                          )}
                          <span className="text-xs text-muted-foreground font-medium">
                            16:9 Banner Image
                          </span>
                        </div>
                      )}
                      <input
                        id={`file-input-${index}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadingIndex !== null}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            handleImageUpload(index, e.target.files[0]);
                          }
                        }}
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor={`title-${index}`} className="text-xs font-semibold">
                        Accessibility Title
                      </Label>
                      <Input
                        id={`title-${index}`}
                        placeholder="e.g. Summer Collection 20% Off"
                        value={banner.title || ''}
                        onChange={(e) => handleFieldChange(index, 'title', e.target.value)}
                        className="h-9"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold">Link Action</Label>
                        <Select
                          value={banner.linkType}
                          onValueChange={(val) => handleFieldChange(index, 'linkType', val)}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Action Type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE">No Action</SelectItem>
                            <SelectItem value="CATEGORY">Link Category</SelectItem>
                            <SelectItem value="PRODUCT">Link Product</SelectItem>
                            <SelectItem value="EXTERNAL">External URL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {banner.linkType !== 'NONE' && (
                        <div className="space-y-1">
                          <Label className="text-xs font-semibold">Link Value</Label>
                          {banner.linkType === 'CATEGORY' ? (
                            <Select
                              value={banner.linkValue || ''}
                              onValueChange={(val) => handleFieldChange(index, 'linkValue', val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select Category" />
                              </SelectTrigger>
                              <SelectContent>
                                {(Array.isArray(categories) ? categories : []).map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : banner.linkType === 'PRODUCT' ? (
                            <Select
                              value={banner.linkValue || ''}
                              onValueChange={(val) => handleFieldChange(index, 'linkValue', val)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="Select Product" />
                              </SelectTrigger>
                              <SelectContent>
                                {(Array.isArray(products) ? products : []).map(
                                  (p: Record<string, unknown>) => (
                                    <SelectItem key={String(p.id)} value={String(p.id)}>
                                      {String(p.name ?? '')}
                                    </SelectItem>
                                  ),
                                )}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              placeholder="https://example.com"
                              value={banner.linkValue || ''}
                              onChange={(e) =>
                                handleFieldChange(index, 'linkValue', e.target.value)
                              }
                              className="h-9"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Live Mockup Mobile Preview (Apple UX Designer style) */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold flex items-center gap-1.5 text-foreground">
                <Smartphone className="w-4 h-4" /> Live Mobile Simulator
              </span>
              <div className="flex gap-1">
                {banners.map((_, i) => (
                  <Button
                    key={i}
                    type="button"
                    size="icon"
                    onClick={() => setActivePreviewIndex(i)}
                    aria-label={`Show slide ${i + 1}`}
                    className={`w-5 h-5 rounded-full p-0 text-xs font-bold ${
                      activePreviewIndex === i ? '' : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {i + 1}
                  </Button>
                ))}
              </div>
            </div>

            {/* Smart Phone Frame */}
            <div className="relative mx-auto w-[290px] h-[580px] bg-zinc-950 rounded-[40px] border-[8px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
              {/* Phone Speaker & Notch */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-28 h-5 bg-zinc-900 rounded-b-2xl z-30 flex items-center justify-center">
                <div className="w-12 h-1 bg-black rounded-full mb-1"></div>
              </div>

              {/* Mobile Content Screen */}
              <div className="flex-1 bg-zinc-900 flex flex-col relative">
                {/* Apple Immersive Slider Screen Area */}
                <div className="relative h-[220px] w-full bg-zinc-800 overflow-hidden">
                  {banners[activePreviewIndex]?.imageUrl ? (
                    <img
                      src={banners[activePreviewIndex].imageUrl}
                      alt="Banner Preview"
                      className="w-full h-full object-cover animate-fade-in"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-zinc-500 p-4 text-center">
                      <Eye className="w-8 h-8 opacity-40 mb-2" />
                      <span className="text-xs font-semibold">No Image Uploaded</span>
                      <span className="text-xs opacity-75">
                        Upload a banner in Slot {activePreviewIndex + 1} to preview
                      </span>
                    </div>
                  )}

                  {/* Transparent Overlay Status Bar Mockup */}
                  <div className="absolute top-0 inset-x-0 h-11 bg-gradient-to-b from-black/50 to-transparent z-20 px-5 flex items-center justify-between">
                    <span className="text-xs text-white/95 font-semibold">9:41</span>
                    <div className="flex items-center gap-1">
                      <div className="w-3.5 h-2 border border-white/90 rounded-[3px] p-[1px] flex items-center">
                        <div className="w-full h-full bg-white/90 rounded-[1px]"></div>
                      </div>
                    </div>
                  </div>

                  {/* Immersive Apple Navigation Bar Mockup (Transparent Overlay) */}
                  <div className="absolute top-9 inset-x-0 h-12 flex items-center justify-between px-4 z-20">
                    <div className="w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-white text-xs font-bold">C</span>
                    </div>
                    <div className="flex-1 text-center">
                      <span className="text-xs font-bold text-white tracking-wide uppercase drop-shadow-md">
                        Celebs
                      </span>
                    </div>
                    <div className="w-7 h-7 rounded-full bg-black/35 backdrop-blur-sm flex items-center justify-center">
                      <Link2 className="w-3.5 h-3.5 text-white" />
                    </div>
                  </div>

                  {/* Pagination Indicator Dots */}
                  <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                    {banners.map((b, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          activePreviewIndex === i ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                        } ${!b.isActive ? 'opacity-30' : ''}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Simulated Homepage Body Grid */}
                <div className="flex-1 p-3 space-y-3 bg-zinc-900 z-10 -mt-2.5 rounded-t-xl">
                  <div className="h-4 w-24 bg-zinc-800 rounded"></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-28 bg-zinc-800/80 rounded-lg p-2 flex flex-col justify-end">
                      <div className="h-3 w-16 bg-zinc-700 rounded mb-1"></div>
                      <div className="h-2.5 w-10 bg-zinc-700/60 rounded"></div>
                    </div>
                    <div className="h-28 bg-zinc-800/80 rounded-lg p-2 flex flex-col justify-end">
                      <div className="h-3 w-16 bg-zinc-700 rounded mb-1"></div>
                      <div className="h-2.5 w-10 bg-zinc-700/60 rounded"></div>
                    </div>
                  </div>
                  {banners[activePreviewIndex]?.linkType !== 'NONE' && (
                    <div className="bg-zinc-800/40 border border-zinc-800 rounded-lg p-2 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                        <Link2 className="w-3 h-3 text-primary" />
                        Target: {banners[activePreviewIndex].linkType}
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banners;
