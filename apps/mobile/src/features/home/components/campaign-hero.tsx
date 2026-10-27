import React from 'react';
import { ImageBackground, View } from 'react-native';

import { styles } from '../styles/campaign.styles';
import type { CampaignData, TimeRemaining } from '../types';

import { ThemedText } from '@/components/themed-text';
import { Palette } from '@/constants/theme';
import { hasRenderableImage, resolveImageUrl } from '@/utils/image';

export interface CampaignHeroProps {
  campaign: CampaignData;
  timeRemaining: TimeRemaining | null;
}

export function CampaignHero({ campaign, timeRemaining }: CampaignHeroProps) {
  const content = (
    <View style={styles.heroContent}>
      <ThemedText style={styles.heroEyebrow}>{campaign.campaignType} SALE</ThemedText>
      <ThemedText style={styles.heroTitle}>{campaign.title}</ThemedText>
      {campaign.tagline ? (
        <ThemedText style={styles.heroTagline} numberOfLines={2}>
          {campaign.tagline}
        </ThemedText>
      ) : null}
      {timeRemaining && !timeRemaining.isExpired ? (
        <ThemedText style={styles.heroCountdown}>
          Ends in {timeRemaining.days}d {timeRemaining.hours}h {timeRemaining.minutes}m{' '}
          {timeRemaining.seconds}s
        </ThemedText>
      ) : null}
    </View>
  );

  const themeColor = campaign.themeColor || Palette.danger;

  if (!hasRenderableImage(campaign.bannerImage)) {
    return <View style={[styles.hero, { backgroundColor: themeColor }]}>{content}</View>;
  }

  return (
    <ImageBackground
      source={{ uri: resolveImageUrl(campaign.bannerImage, { preset: 'grid-card' }) }}
      style={styles.hero}
      imageStyle={styles.heroImage}
    >
      <View style={[styles.heroOverlay, { backgroundColor: themeColor }]} />
      {content}
    </ImageBackground>
  );
}
