import React, { memo, useState } from 'react';
import { Modal, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { Award, CheckCircle2, ChevronRight, ShieldCheck, Sparkles, X } from 'lucide-react-native';

import { styles } from './brand-story-badge.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

interface BrandStoryBadgeProps {
  brandName?: string | null;
  brandRef?: {
    id?: string;
    name?: string;
    slug?: string;
    logoUrl?: string | null;
    tier?: string;
    isGated?: boolean;
    story?: string | null;
    countryOfOrigin?: string;
  } | null;
}

export const BrandStoryBadge = memo(function BrandStoryBadge({
  brandName,
  brandRef,
}: BrandStoryBadgeProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const name = brandRef?.name || brandName || 'Celebs Exclusive';
  const tier = brandRef?.tier || 'FIRST_PARTY';
  const is1P = tier === 'FIRST_PARTY';
  const isGated = Boolean(brandRef?.isGated || tier === 'GATED_GLOBAL');

  return (
    <>
      <TouchableOpacity
        style={styles.container}
        onPress={() => setIsModalOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.badgeLeft}>
          {is1P ? (
            <View style={[styles.iconPill, styles.flagshipPill]}>
              <Sparkles size={12} color={Palette.accent} />
              <ThemedText style={styles.flagshipText}>1P Flagship Label</ThemedText>
            </View>
          ) : isGated ? (
            <View style={[styles.iconPill, styles.verifiedPill]}>
              <CheckCircle2 size={12} color={Palette.success} />
              <ThemedText style={styles.verifiedText}>Authorized Brand</ThemedText>
            </View>
          ) : (
            <View style={[styles.iconPill, styles.genericPill]}>
              <Award size={12} color={Palette.gray500} />
              <ThemedText style={styles.genericText}>Brand</ThemedText>
            </View>
          )}

          <ThemedText style={styles.brandTitle}>{name}</ThemedText>
        </View>

        <View style={styles.badgeRight}>
          <ThemedText style={styles.storyLink}>Brand Story</ThemedText>
          <ChevronRight size={14} color={Palette.accent} />
        </View>
      </TouchableOpacity>

      {/* Brand Authenticity & Story Modal */}
      <Modal
        visible={isModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalOpen(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalHeaderTitleGroup}>
                    <ShieldCheck size={20} color={Palette.accent} />
                    <ThemedText style={styles.modalTitle}>{name}</ThemedText>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsModalOpen(false)}
                    style={styles.closeButton}
                  >
                    <X size={18} color={Palette.gray500} />
                  </TouchableOpacity>
                </View>

                <View style={styles.tierBanner}>
                  <ThemedText style={styles.tierBannerText}>
                    {is1P
                      ? '✨ Designed & Crafted In-House by Celebs Nepal'
                      : isGated
                        ? '🛡️ 100% Genuine & Authorized Dealership Guaranteed'
                        : '🛍️ Curated Fashion Collection'}
                  </ThemedText>
                </View>

                <View style={styles.storyBody}>
                  <ThemedText style={styles.storySubtitle}>About the Brand</ThemedText>
                  <ThemedText style={styles.storyText}>
                    {brandRef?.story ||
                      `${name} represents modern high-street fashion curated for South Asian fit and climate. Every piece undergoes Celebs 5-point quality inspection prior to dispatch.`}
                  </ThemedText>

                  <View style={styles.trustHighlights}>
                    <View style={styles.highlightItem}>
                      <ThemedText style={styles.highlightEmoji}>🇳🇵</ThemedText>
                      <View>
                        <ThemedText style={styles.highlightTitle}>Origin</ThemedText>
                        <ThemedText style={styles.highlightDesc}>
                          {brandRef?.countryOfOrigin || 'Nepal & South Asia'}
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.highlightItem}>
                      <ThemedText style={styles.highlightEmoji}>⚡</ThemedText>
                      <View>
                        <ThemedText style={styles.highlightTitle}>Fast Delivery</ThemedText>
                        <ThemedText style={styles.highlightDesc}>
                          24-48 Hours inside Kathmandu Valley
                        </ThemedText>
                      </View>
                    </View>

                    <View style={styles.highlightItem}>
                      <ThemedText style={styles.highlightEmoji}>🔄</ThemedText>
                      <View>
                        <ThemedText style={styles.highlightTitle}>Hassle-Free Returns</ThemedText>
                        <ThemedText style={styles.highlightDesc}>
                          7-day return policy for sizing &amp; fit
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
});
