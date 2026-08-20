import React, { memo, useCallback, useMemo, useState } from 'react';
import { Badge } from '@celebs/shared-ui/components/badge';
import { Button } from '@celebs/shared-ui/components/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@celebs/shared-ui/components/dialog';
import { Input } from '@celebs/shared-ui/components/input';
import { Label } from '@celebs/shared-ui/components/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@celebs/shared-ui/components/select';
import { toast } from '@/hooks/use-toast';
import { directUploadFile } from '@/lib/media-upload';
import { CheckCircle2, Loader2, ShieldAlert, UploadCloud } from 'lucide-react';
import { useBrands, useSubmitBrandAuthorization } from '../hooks/use-brands';

interface BrandAuthorizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedBrandId?: string;
}

export const BrandAuthorizationDialog = memo(function BrandAuthorizationDialog({
  open,
  onOpenChange,
  preselectedBrandId,
}: BrandAuthorizationDialogProps) {
  const [brandId, setBrandId] = useState(preselectedBrandId || '');
  const [documentType, setDocumentType] = useState<'LOA' | 'TRADEMARK_CERT' | 'INVOICE' | 'DEALERSHIP_CONTRACT'>('LOA');
  const [documentUrl, setDocumentUrl] = useState('');
  const [documentExpiryDate, setDocumentExpiryDate] = useState('');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const { data: brandsData, isLoading: isLoadingBrands } = useBrands({ limit: 100 });
  const submitAuthMutation = useSubmitBrandAuthorization();

  const gatedBrands = useMemo(() => {
    return (brandsData?.items || []).filter(
      (b) => b.isGated && b.tier !== 'FIRST_PARTY',
    );
  }, [brandsData]);

  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploadingDoc(true);
    try {
      const url = await directUploadFile(file, 'celebs/kyc/brand-auth');
      setDocumentUrl(url);
      toast({
        title: 'Document Uploaded',
        description: 'Letter of Authorization uploaded successfully.',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed';
      toast({
        title: 'Upload Failed',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setIsUploadingDoc(false);
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!brandId) {
      toast({ title: 'Validation Error', description: 'Please select a brand', variant: 'destructive' });
      return;
    }
    if (!documentUrl) {
      toast({ title: 'Validation Error', description: 'Please upload the authorization document', variant: 'destructive' });
      return;
    }

    try {
      await submitAuthMutation.mutateAsync({
        brandId,
        documentType,
        documentUrl,
        documentExpiryDate: documentExpiryDate ? new Date(documentExpiryDate).toISOString() : undefined,
      });

      toast({
        title: 'Application Submitted',
        description: 'Your brand authorization request has been sent for admin compliance review.',
      });
      onOpenChange(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      toast({
        title: 'Error',
        description: msg,
        variant: 'destructive',
      });
    }
  }, [brandId, documentType, documentUrl, documentExpiryDate, submitAuthMutation, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold">Brand Authorization (LOA) Application</DialogTitle>
              <DialogDescription className="text-xs">
                Submit brand distribution rights to list products under gated trademarks.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Brand Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Select Gated Brand *</Label>
            <Select value={brandId} onValueChange={setBrandId} disabled={isLoadingBrands}>
              <SelectTrigger>
                <SelectValue placeholder={isLoadingBrands ? 'Loading...' : 'Select Brand'} />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                {gatedBrands.map((b) => (
                  <SelectItem key={b.id} value={b.id}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{b.name}</span>
                      <Badge variant="outline" className="text-[9px]">Gated</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Type */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Document Type *</Label>
            <Select
              value={documentType}
              onValueChange={(v) => setDocumentType(v as typeof documentType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="LOA">Letter of Authorization (LOA)</SelectItem>
                <SelectItem value="TRADEMARK_CERT">Trademark Registration Certificate</SelectItem>
                <SelectItem value="DEALERSHIP_CONTRACT">Official Dealership / Distribution Contract</SelectItem>
                <SelectItem value="INVOICE">Authorized Distributor Purchase Invoice</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Expiry Date */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Document Expiry Date (Optional)</Label>
            <Input
              type="date"
              value={documentExpiryDate}
              onChange={(e) => setDocumentExpiryDate(e.target.value)}
              className="text-xs"
            />
          </div>

          {/* Document Uploader */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Upload Certificate / PDF / Image *</Label>
            {documentUrl ? (
              <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2 truncate">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span className="text-xs font-medium truncate">Document Attached</span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDocumentUrl('')}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Replace
                </Button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-xl border-border/80 hover:border-primary cursor-pointer transition-colors bg-card/40">
                {isUploadingDoc ? (
                  <div className="flex items-center gap-2 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-xs font-medium">Uploading Document to R2...</span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs font-bold text-foreground">Click to upload document</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">PDF, PNG, JPG up to 10MB</span>
                  </>
                )}
                <input
                  type="file"
                  accept="application/pdf,image/jpeg,image/png,image/webp"
                  disabled={isUploadingDoc}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={!brandId || !documentUrl || submitAuthMutation.isPending}
          >
            {submitAuthMutation.isPending ? 'Submitting...' : 'Submit Application'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});
