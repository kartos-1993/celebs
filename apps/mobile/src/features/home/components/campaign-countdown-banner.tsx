import React, { useEffect, useState } from 'react';
import { ImageBackground, TouchableOpacity, View } from 'react-native';
import { ArrowRight, Flame } from 'lucide-react-native';

import { useActiveCampaign } from '../hooks/use-home-queries';
import type { CampaignData, TimeRemaining } from '../types';
import { calculateTimeRemaining } from '../utils/countdown-utils';

import { styles } from './campaign-countdown-banner.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { hasRenderableImage, resolveImageUrl } from '@/utils/image';

export function CampaignCountdownBanner({
  initialCampaigns,
}: { initialCampaigns?: CampaignData[] } = {}) {
  const { activeCampaign: queryActiveCampaign } = useActiveCampaign();
  const activeCampaign =
    (initialCampaigns && initialCampaigns.length > 0 ? initialCampaigns[0] : null) ||
    queryActiveCampaign;

  const endDate = activeCampaign?.endDate ?? '';
  const bannerImage = hasRenderableImage(activeCampaign?.bannerImage)
    ? activeCampaign?.bannerImage
    : undefined;

  const [prevEndDate, setPrevEndDate] = useState(endDate);
  const [timeRemaining, setTimeRemaining] = useState<TimeRemaining | null>(() =>
    endDate ? calculateTimeRemaining(endDate) : null,
  );

  if (endDate !== prevEndDate) {
    setPrevEndDate(endDate);
    setTimeRemaining(endDate ? calculateTimeRemaining(endDate) : null);
  }

  useEffect(() => {
    if (!endDate) return;
    const timer = setInterval(() => {
      setTimeRemaining(calculateTimeRemaining(endDate));
    }, 1000);

    return () => clearInterval(timer);
  }, [endDate]);

  // Real empty state, not a stand-in campaign: with nothing scheduled there is
  // nothing truthful to count down to, and the previous FALLBACK_CAMPAIGN
  // invented a title, dates and an Unsplash hero photo, which made a backend
  // outage look like a healthy storefront running a sale that did not exist.
  if (!activeCampaign || !timeRemaining || timeRemaining.isExpired) {
    return null;
  }

  const campaign = activeCampaign;
  const overlay = (
    <View
      style={[styles.colorOverlay, { backgroundColor: campaign.themeColor || Palette.danger }]}
    />
  );
  const content = (
    <View style={styles.contentContainer}>
      <View style={styles.badgeRow}>
        <View style={styles.tagBadge}>
          <Flame size={12} color={Palette.white} />
          <ThemedText style={styles.badgeText}>{campaign.campaignType} SALE</ThemedText>
        </View>
      </View>

      <ThemedText style={styles.titleText}>{campaign.title}</ThemedText>
      {campaign.tagline ? (
        <ThemedText style={styles.taglineText} numberOfLines={2}>
          {campaign.tagline}
        </ThemedText>
      ) : null}

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

      <TouchableOpacity style={styles.shopBtn} activeOpacity={0.85}>
        <ThemedText style={styles.shopBtnText}>{campaign.title}</ThemedText>
        <ArrowRight size={14} color={Palette.danger} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {bannerImage ? (
        <ImageBackground
          source={{ uri: resolveImageUrl(bannerImage, { preset: 'grid-card' }) }}
          style={styles.bannerBackground}
          imageStyle={styles.backgroundImageStyle}
        >
          {overlay}
          {content}
        </ImageBackground>
      ) : (
        // No campaign artwork: paint the themed surface rather than borrowing a
        // stock photo. `ImageBackground` cannot render without a source.
        <View style={styles.bannerBackground}>
          {overlay}
          {content}
        </View>
      )}
    </View>
  );
}
