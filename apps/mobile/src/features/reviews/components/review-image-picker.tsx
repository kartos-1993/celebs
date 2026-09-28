import React from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { Image } from 'expo-image';
import { Camera, X } from 'lucide-react-native';

import { styles } from '../styles/review-modal.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { hasRenderableImage } from '@/utils/image';

interface ReviewImagePickerProps {
  images: string[];
  onAddImage: () => void;
  onRemoveImage: (index: number) => void;
  maxImages?: number;
}

export function ReviewImagePicker({
  images,
  onAddImage,
  onRemoveImage,
  maxImages = 5,
}: ReviewImagePickerProps) {
  return (
    <View style={{ gap: 6 }}>
      <ThemedText style={styles.sectionLabel}>
        Add Photos ({images.length}/{maxImages})
      </ThemedText>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.imagePickerRow}
      >
        {images.map((uri, idx) => (
          <View key={idx} style={styles.photoThumbnailWrap}>
            {/* Local `file://` picker URI: deliberately NOT routed through
                resolveImageUrl, which only understands remote media. Guarded so a
                blank entry never reaches expo-image as `{ uri: '' }`. */}
            {hasRenderableImage(uri) ? (
              <Image source={{ uri }} style={styles.photoThumbnail} contentFit="cover" />
            ) : (
              <View style={styles.photoThumbnail} />
            )}
            <TouchableOpacity
              style={styles.removePhotoBtn}
              onPress={() => onRemoveImage(idx)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Remove photo"
            >
              <X size={11} color={Palette.white} />
            </TouchableOpacity>
          </View>
        ))}

        {images.length < maxImages && (
          <TouchableOpacity
            style={styles.addPhotoBtn}
            onPress={onAddImage}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Add review photo"
          >
            <Camera size={18} color={Palette.gray600} />
            <ThemedText style={styles.addPhotoText}>Add Photo</ThemedText>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
