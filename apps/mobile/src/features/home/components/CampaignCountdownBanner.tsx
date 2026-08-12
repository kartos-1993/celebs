import React, { useEffect, useState } from 'react';
import { ImageBackground, StyleSheet, TouchableOpacity,View } from 'react-native';
import { ArrowRight, Flame } from 'lucide-react-native';

import { apiClient } from '@/api/client';
import { ThemedText } from '@/components/themed-text';

export interface CampaignData {
  id: string;
  title: string;
  slug: string;
  campaignType: 'FESTIVAL' | 'SEASONAL' | 'FLASH_SALE' | 'HOLIDAY' | 'NEW_YEAR';
  tagline?: string;
  bannerImage?: string;
  themeColor: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
}

function calculateTimeRemaining(targetDateIso: string): TimeRemaining {
  const diff = new Date(targetDateIso).getTime() - new Date().getTime();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / 1000 / 60) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return { days, hours, minutes, seconds, isExpired: false };
}

const FALLBACK_CAMPAIGN: CampaignData = {
  id: 'camp_dashain',
  title: 'Dashain Dhamaka 2026',
  slug: 'dashain-dhamaka-2026',
  campaignType: 'FESTIVAL',
  tagline: "Nepal's Biggest Festive Shopping Season — Flat 40% Off",
  themeColor: '#D92525',
  startDate: '2026-08-01T00:00:00Z',
  endDate: '2026-10-15T23:59:59Z',
  isActive: true,
  bannerImage:
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&auto=format&fit=crop',
};

export function CampaignCountdownBanner() {
  const [campaign, setCampaign] = useState<CampaignData>(FALLBACK_CAMPAIGN);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining>(() =>
    calculateTimeRemaining(FALLBACK_CAMPAIGN.endDate),
  );

  useEffect(() => {
    let isMounted = true;

    async function fetchCampaigns() {
      try {
        const response = await apiClient.get<{ success: boolean; data: CampaignData[] }>(
          '/campaigns/active',
          { skipAuth: true },
        );
        if (isMounted && response.data?.data && response.data.data.length > 0) {
          const active = response.data.data[0];
          setCampaign(active);
          setTimeRemaining(calculateTimeRemaining(active.endDate));
        }
      } catch (err) {
        console.log('[CampaignCountdownBanner] Using fallback campaign');
      }
    }

    fetchCampaigns();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(campaign.endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [campaign.endDate]);

  if (timeRemaining.isExpired) {
    return null;
  }

  return (
    <View style={styles.container}>
      <ImageBackground
        source={{ uri: campaign.bannerImage || FALLBACK_CAMPAIGN.bannerImage }}
        style={styles.bannerBackground}
        imageStyle={styles.backgroundImageStyle}
      >
        {/* Color Overlay */}
        <View
          style={[styles.colorOverlay, { backgroundColor: campaign.themeColor || '#D92525' }]}
        />

        {/* Content Box */}
        <View style={styles.contentContainer}>
          {/* Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.tagBadge}>
              <Flame size={12} color="#ffffff" />
              <ThemedText style={styles.badgeText}>{campaign.campaignType} SALE</ThemedText>
            </View>
          </View>

          {/* Title & Tagline */}
          <ThemedText style={styles.titleText}>{campaign.title}</ThemedText>
          {campaign.tagline ? (
            <ThemedText style={styles.taglineText} numberOfLines={2}>
              {campaign.tagline}
            </ThemedText>
          ) : null}

          {/* Live Countdown Timer */}
          <View style={styles.countdownRow}>
            <View style={styles.countdownBox}>
              <ThemedText style={styles.countdownNum}>
                {String(timeRemaining.days).padStart(2, '0')}
              </ThemedText>
              <ThemedText style={styles.countdownLabel}>DAYS</ThemedText>
            </View>

            <ThemedText style={styles.colonText}>:</ThemedText>

            <View style={styles.countdownBox}>
              <ThemedText style={styles.countdownNum}>
                {String(timeRemaining.hours).padStart(2, '0')}
              </ThemedText>
              <ThemedText style={styles.countdownLabel}>HRS</ThemedText>
            </View>

            <ThemedText style={styles.colonText}>:</ThemedText>

            <View style={styles.countdownBox}>
              <ThemedText style={styles.countdownNum}>
                {String(timeRemaining.minutes).padStart(2, '0')}
              </ThemedText>
              <ThemedText style={styles.countdownLabel}>MINS</ThemedText>
            </View>

            <ThemedText style={styles.colonText}>:</ThemedText>

            <View style={styles.countdownBox}>
              <ThemedText style={styles.countdownNum}>
                {String(timeRemaining.seconds).padStart(2, '0')}
              </ThemedText>
              <ThemedText style={styles.countdownLabel}>SECS</ThemedText>
            </View>
          </View>

          {/* Action Button */}
          <TouchableOpacity style={styles.shopBtn} activeOpacity={0.85}>
            <ThemedText style={styles.shopBtnText}>Shop Festival Dhamaka</ThemedText>
            <ArrowRight size={14} color="#D92525" />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  bannerBackground: {
    width: '100%',
    minHeight: 180,
    justifyContent: 'center',
  },
  backgroundImageStyle: {
    borderRadius: 16,
  },
  colorOverlay: {
    ...StyleSheet.absoluteFill,
    opacity: 0.88,
  },
  contentContainer: {
    padding: 16,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  titleText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 0.2,
  },
  taglineText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
    marginBottom: 12,
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  countdownBox: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    minWidth: 42,
  },
  countdownNum: {
    color: '#18181b',
    fontSize: 14,
    fontWeight: '800',
  },
  countdownLabel: {
    color: '#71717a',
    fontSize: 8,
    fontWeight: '700',
  },
  colonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '900',
    marginHorizontal: 4,
  },
  shopBtn: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  shopBtnText: {
    color: '#D92525',
    fontSize: 12,
    fontWeight: '800',
  },
});
