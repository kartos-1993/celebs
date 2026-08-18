import React, { memo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Award, CheckCircle2, ChevronRight, ShieldCheck, Sparkles, X } from 'lucide-react-native';
import { ThemedText } from '@/components/themed-text';

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
              <Sparkles size={12} color="#4f46e5" />
              <ThemedText style={styles.flagshipText}>1P Flagship Label</ThemedText>
            </View>
          ) : isGated ? (
            <View style={[styles.iconPill, styles.verifiedPill]}>
              <CheckCircle2 size={12} color="#059669" />
              <ThemedText style={styles.verifiedText}>Authorized Brand</ThemedText>
            </View>
          ) : (
            <View style={[styles.iconPill, styles.genericPill]}>
              <Award size={12} color="#6b7280" />
              <ThemedText style={styles.genericText}>Brand</ThemedText>
            </View>
          )}

          <ThemedText style={styles.brandTitle}>{name}</ThemedText>
        </View>

        <View style={styles.badgeRight}>
          <ThemedText style={styles.storyLink}>Brand Story</ThemedText>
          <ChevronRight size={14} color="#6366f1" />
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
                    <ShieldCheck size={20} color="#4f46e5" />
                    <ThemedText style={styles.modalTitle}>{name}</ThemedText>
                  </View>
                  <TouchableOpacity
                    onPress={() => setIsModalOpen(false)}
                    style={styles.closeButton}
                  >
                    <X size={18} color="#6b7280" />
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

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginVertical: 6,
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  badgeRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  iconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flagshipPill: {
    backgroundColor: '#e0e7ff',
  },
  flagshipText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#4338ca',
  },
  verifiedPill: {
    backgroundColor: '#d1fae5',
  },
  verifiedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  genericPill: {
    backgroundColor: '#f3f4f6',
  },
  genericText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#4b5563',
  },
  brandTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    flexShrink: 1,
  },
  storyLink: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4f46e5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  tierBanner: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  tierBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    textAlign: 'center',
  },
  storyBody: {
    gap: 10,
  },
  storySubtitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
  },
  storyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#64748b',
  },
  trustHighlights: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    gap: 10,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  highlightEmoji: {
    fontSize: 18,
  },
  highlightTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1e293b',
  },
  highlightDesc: {
    fontSize: 11,
    color: '#64748b',
  },
});
