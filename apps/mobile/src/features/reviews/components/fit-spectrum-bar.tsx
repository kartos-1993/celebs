import React from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { FontSize, FontWeight, Palette, Radius, Spacing } from '@/constants/theme';

interface FitSpectrumBarProps {
  fitDistribution: {
    trueToSize: number;
    runsSmall: number;
    runsLarge: number;
  };
}

export function FitSpectrumBar({ fitDistribution }: FitSpectrumBarProps) {
  const total = fitDistribution.trueToSize + fitDistribution.runsSmall + fitDistribution.runsLarge;

  if (total === 0) {
    return null;
  }

  const smallPct = Math.round((fitDistribution.runsSmall / total) * 100);
  const truePct = Math.round((fitDistribution.trueToSize / total) * 100);
  const largePct = Math.round((fitDistribution.runsLarge / total) * 100);

  return (
    <View style={styles.container}>
      <View style={styles.labelsRow}>
        <ThemedText style={[styles.label, smallPct >= 50 && styles.activeLabel]}>
          Runs Small ({smallPct}%)
        </ThemedText>
        <ThemedText style={[styles.label, truePct >= 50 && styles.activeLabel]}>
          True to Size ({truePct}%)
        </ThemedText>
        <ThemedText style={[styles.label, largePct >= 50 && styles.activeLabel]}>
          Runs Large ({largePct}%)
        </ThemedText>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[styles.barSegment, { flex: Math.max(1, smallPct), backgroundColor: '#CBD5E1' }]}
        />
        <View
          style={[
            styles.barSegment,
            { flex: Math.max(1, truePct), backgroundColor: Palette.gray900 },
          ]}
        />
        <View
          style={[styles.barSegment, { flex: Math.max(1, largePct), backgroundColor: '#CBD5E1' }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    fontSize: FontSize.footnote,
    color: Palette.gray500,
  },
  activeLabel: {
    fontWeight: FontWeight.bold,
    color: Palette.gray900,
  },
  barTrack: {
    height: 4,
    borderRadius: Radius.pill,
    flexDirection: 'row',
    gap: 2,
    overflow: 'hidden',
    backgroundColor: Palette.gray100,
  },
  barSegment: {
    height: '100%',
    borderRadius: Radius.pill,
  },
});
