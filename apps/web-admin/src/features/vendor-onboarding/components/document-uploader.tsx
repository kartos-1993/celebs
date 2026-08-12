import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@celebs/shared-ui/components/button';
import { axiosClient } from '@/lib/axios/axios-client';

interface DocumentUploaderProps {
  label: string;
  description?: string;
  value?: string;
  onChange: (url: string) => void;
  accept?: string;
  required?: boolean;
  disabled?: boolean;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({
  label,
  description,
  value,
  onChange,
  accept = 'image/*,.pdf',
  required = false,
  disabled = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds maximum limit of 5MB.');
      return;
    }

    setUploadError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('files', file);

      const response = await axiosClient.post('/media/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const items = response.data?.data || [];
      if (!items.length || !items[0]?.url) {
        throw new Error('Image upload failed to return a valid URL.');
      }

      const uploadedUrl = items[0].url;
      onChange(uploadedUrl);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'File upload failed. Please try again.';
      setUploadError(msg);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    onChange('');
    setUploadError(null);
  };

  const isPdf = value?.toLowerCase().endsWith('.pdf');
  const isImage = Boolean(
    value && (value.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || !isPdf),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
        {value && (
          <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5" /> Uploaded
          </span>
        )}
      </div>

      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
        disabled={disabled || isUploading}
      />

      {value ? (
        <div className="relative group border rounded-lg p-3 bg-muted/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 overflow-hidden">
            {isPdf ? (
              <div className="w-10 h-10 rounded bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6" />
              </div>
            ) : isImage ? (
              <div className="w-12 h-12 rounded border overflow-hidden bg-background shrink-0">
                <img src={value} alt={label} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <a
                href={value}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-primary hover:underline truncate block"
              >
                View Document
              </a>
              <p className="text-[11px] text-muted-foreground truncate">File uploaded successfully</p>
            </div>
          </div>

          {!disabled && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                Replace
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div
          onClick={() => !disabled && !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
            disabled
              ? 'bg-muted/50 cursor-not-allowed border-muted'
              : 'hover:border-primary/50 hover:bg-muted/20 border-muted-foreground/25'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center py-2 space-y-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground font-medium">Uploading file to R2 storage...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center py-2 space-y-1">
              <Upload className="w-6 h-6 text-muted-foreground mb-1" />
              <p className="text-xs font-medium text-foreground">
                Click to upload <span className="text-muted-foreground">(Max 5MB)</span>
              </p>
              <p className="text-[11px] text-muted-foreground">PNG, JPG, WEBP, or PDF</p>
            </div>
          )}
        </div>
      )}

      {uploadError && <p className="text-xs font-medium text-destructive mt-1">{uploadError}</p>}
    </div>
  );
};
