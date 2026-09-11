import React, { useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { useSubmitReviewWithImages } from '../hooks/use-reviews';
import { styles } from '../styles/review-modal.styles';
import type { ReviewFitRating, ToReviewItem } from '../types';

import { ReviewCommentInput } from './review-comment-input';
import { ReviewFitSelector } from './review-fit-selector';
import { ReviewImagePicker } from './review-image-picker';
import { ReviewModalHeader } from './review-modal-header';
import { StarRating } from './star-rating';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ReviewModalProps {
  visible: boolean;
  item: ToReviewItem | null;
  onClose: () => void;
}

export function ReviewModal({ visible, item, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [fitRating, setFitRating] = useState<ReviewFitRating>('TRUE_TO_SIZE');
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const { mutate: submitReview, isSubmitting, isUploading } = useSubmitReviewWithImages();

  if (!item) return null;

  const handleAddImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Denied',
        'Please grant photo library access to upload review photos.',
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: Math.max(1, 5 - images.length),
    });
    if (!result.canceled && result.assets?.length > 0) {
      setImages((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, 5));
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!comment.trim()) return;
    submitReview(
      {
        orderItemId: item.orderItemId,
        rating,
        fitRating,
        comment: comment.trim(),
        localImageUris: images,
      },
      {
        onSuccess: () => {
          setComment('');
          setImages([]);
          onClose();
        },
      },
    );
  };

  const isSubmitDisabled = !comment.trim() || isSubmitting;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <ReviewModalHeader onClose={onClose} />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            <View style={styles.ratingSection}>
              <ThemedText style={styles.ratingPrompt}>Overall Quality & Satisfaction</ThemedText>
              <StarRating rating={rating} size={28} onSelectRating={setRating} />
            </View>

            <ReviewFitSelector fitRating={fitRating} onSelectFit={setFitRating} />

            <ReviewCommentInput value={comment} onChangeText={setComment} />

            <ReviewImagePicker
              images={images}
              onAddImage={handleAddImage}
              onRemoveImage={handleRemoveImage}
            />

            <TouchableOpacity
              style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              activeOpacity={0.8}
            >
              {isSubmitting ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator size="small" color={Palette.white} />
                  <ThemedText style={styles.submitBtnText}>
                    {isUploading ? 'Uploading Photos...' : 'Submitting...'}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.submitBtnText}>Submit Review</ThemedText>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
