import React from 'react';
import { View, Pressable } from 'react-native';
import { Image } from 'expo-image';
import { SCREEN_WIDTH } from '@/constants/platform';

interface PromoBannerProps {
  banners: { id: string; imageUrl: string; link: string }[];
}

export const PromoBanner = ({ banners }: PromoBannerProps) => {
  if (!banners || banners.length === 0) return null;
  
  const mainBanner = banners[0];
  const bannerHeight = (SCREEN_WIDTH * 400) / 800; // Assuming 800x400 aspect ratio

  return (
    <View className="w-full bg-gray-50 py-2">
      <Pressable className="mx-2 rounded-lg overflow-hidden">
        <Image 
          source={mainBanner.imageUrl}
          style={{ width: '100%', height: bannerHeight }}
          contentFit="cover"
        />
      </Pressable>
    </View>
  );
};
