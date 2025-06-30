import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ImageUploadProps {
  onImagesChange: (images: File[]) => void;
}

const ImageUpload = ({ onImagesChange }: ImageUploadProps) => {
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const { toast } = useToast();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      return;
    }

    const newFiles = Array.from(e.target.files);

    // Limit to 5 images total
    if (images.length + newFiles.length > 5) {
      toast({
        title: 'Maximum 5 images allowed',
        description: 'Please delete some images before adding more.',
        variant: 'destructive',
      });
      return;
    }

    // Create previews and add to state
    const newImages = newFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    const updatedImages = [...images, ...newImages];
    setImages(updatedImages);

    // Call the parent callback with just the File objects
    onImagesChange(updatedImages.map((img) => img.file));
  };

  const handleRemoveImage = (indexToRemove: number) => {
    const updatedImages = images.filter((_, index) => index !== indexToRemove);
    setImages(updatedImages);
    onImagesChange(updatedImages.map((img) => img.file));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {images.map((image, index) => (
          <div
            key={index}
            className="relative aspect-square rounded-md border overflow-hidden group"
          >
            <img
              src={image.preview}
              alt={`Preview ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <Button
              type="button"
              onClick={() => handleRemoveImage(index)}
              className="absolute top-2 right-2 bg-black bg-opacity-50 rounded-full p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
              size="icon"
              variant="ghost"
              title="Remove image"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ))}

        {images.length < 5 && (
          <label className="aspect-square rounded-md border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-fashion-500 transition-colors">
            <Upload className="h-8 w-8 text-gray-400" />
            <span className="mt-2 text-sm text-gray-500">Upload Image</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
              multiple
            />
          </label>
        )}
      </div>
      <p className="text-sm text-gray-500">
        Upload up to 5 images. First image will be used as the product
        thumbnail.
      </p>
    </div>
  );
};

export default ImageUpload;
