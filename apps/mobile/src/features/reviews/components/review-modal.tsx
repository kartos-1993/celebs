import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { X } from 'lucide-react-native';

import { useSubmitReviewMutation } from '../hooks/use-reviews';
import { styles } from '../styles/review-modal.styles';
import type { ReviewFitRating, ToReviewItem } from '../types';

import { StarRating } from './star-rating';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface ReviewModalProps {
  visible: boolean;
  item: ToReviewItem | null;
  onClose: () => void;
}

const FIT_OPTIONS: { key: ReviewFitRating; label: string }[] = [
  { key: 'RUNS_SMALL', label: 'Runs Small' },
  { key: 'TRUE_TO_SIZE', label: 'True to Size' },
  { key: 'RUNS_LARGE', label: 'Runs Large' },
];

export function ReviewModal({ visible, item, onClose }: ReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [fitRating, setFitRating] = useState<ReviewFitRating>('TRUE_TO_SIZE');
  const [comment, setComment] = useState('');
  const { mutate: submitReview, isPending } = useSubmitReviewMutation();

  if (!item) return null;

  const handleSubmit = () => {
    if (!comment.trim()) return;
    submitReview(
      {
        orderItemId: item.orderItemId,
        rating,
        fitRating,
        comment: comment.trim(),
        images: [],
      },
      {
        onSuccess: () => {
          setComment('');
          onClose();
        },
      },
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <ThemedText style={styles.sheetTitle}>Review Purchase</ThemedText>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <X size={20} color={Palette.gray700} />
            </TouchableOpacity>
          </View>

          <View style={styles.policyBanner}>
            <ThemedText style={styles.policyText}>
              Honest reviews help our community! Share your fit and experience.
            </ThemedText>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
            <View style={styles.ratingSection}>
              <ThemedText style={styles.ratingPrompt}>Overall Quality & Satisfaction</ThemedText>
              <StarRating rating={rating} size={28} onSelectRating={setRating} />
            </View>

            <View style={styles.fitSection}>
              <ThemedText style={styles.sectionLabel}>How does it fit?</ThemedText>
              <View style={styles.fitOptionsRow}>
                {FIT_OPTIONS.map((opt) => {
                  const isSelected = fitRating === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[styles.fitOptionBtn, isSelected && styles.fitOptionBtnActive]}
                      onPress={() => setFitRating(opt.key)}
                      activeOpacity={0.8}
                    >
                      <ThemedText
                        style={[styles.fitOptionText, isSelected && styles.fitOptionTextActive]}
                      >
                        {opt.label}
                      </ThemedText>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={{ gap: 6 }}>
              <ThemedText style={styles.sectionLabel}>Your Review</ThemedText>
              <TextInput
                style={styles.textInput}
                placeholder="How was the fit, material quality, and delivery? Write your honest thoughts..."
                placeholderTextColor={Palette.gray400}
                multiline
                numberOfLines={4}
                value={comment}
                onChangeText={setComment}
              />
            </View>

            <TouchableOpacity
              style={[styles.submitBtn, (!comment.trim() || isPending) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!comment.trim() || isPending}
              activeOpacity={0.8}
            >
              {isPending ? (
                <ActivityIndicator size="small" color={Palette.white} />
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
