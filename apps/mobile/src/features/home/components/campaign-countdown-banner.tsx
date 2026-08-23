import React, { useEffect, useState } from 'react';
import { ImageBackground, TouchableOpacity, View } from 'react-native';
import { ArrowRight, Flame } from 'lucide-react-native';

import { styles } from './campaign-countdown-banner.styles';

import { apiClient } from '@/api/client';
import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

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
  themeColor: Palette.danger,
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
      } catch {
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
          style={[styles.colorOverlay, { backgroundColor: campaign.themeColor || Palette.danger }]}
        />

        {/* Content Box */}
        <View style={styles.contentContainer}>
          {/* Badge */}
          <View style={styles.badgeRow}>
            <View style={styles.tagBadge}>
              <Flame size={12} color={Palette.white} />
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
            <ArrowRight size={14} color={Palette.danger} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}
