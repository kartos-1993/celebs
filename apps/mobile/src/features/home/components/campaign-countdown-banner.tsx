import React, { useEffect, useState } from 'react';
import { ImageBackground, TouchableOpacity, View } from 'react-native';
import { ArrowRight, Flame } from 'lucide-react-native';

import { useActiveCampaign } from '../hooks/use-home-queries';
import { calculateTimeRemaining, FALLBACK_CAMPAIGN } from '../utils/countdown-utils';

import { styles } from './campaign-countdown-banner.styles';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';

export function CampaignCountdownBanner() {
  const { activeCampaign } = useActiveCampaign();
  const campaign = activeCampaign || FALLBACK_CAMPAIGN;

  const [prevEndDate, setPrevEndDate] = useState(campaign.endDate);
  const [timeRemaining, setTimeRemaining] = useState(() =>
    calculateTimeRemaining(campaign.endDate),
  );

  if (campaign.endDate !== prevEndDate) {
    setPrevEndDate(campaign.endDate);
    setTimeRemaining(calculateTimeRemaining(campaign.endDate));
  }

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
        <View
          style={[styles.colorOverlay, { backgroundColor: campaign.themeColor || Palette.danger }]}
        />

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
            <ThemedText style={styles.shopBtnText}>Shop Festival Dhamaka</ThemedText>
            <ArrowRight size={14} color={Palette.danger} />
          </TouchableOpacity>
        </View>
      </ImageBackground>
    </View>
  );
}
