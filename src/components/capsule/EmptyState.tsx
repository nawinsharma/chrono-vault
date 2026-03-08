import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: keyof typeof Ionicons.glyphMap;
}

export function EmptyState({
  title,
  description,
  icon = 'cube-outline',
}: EmptyStateProps) {
  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      className="items-center justify-center py-16 px-8"
    >
      <View className="w-20 h-20 rounded-full bg-vault-card items-center justify-center mb-5 border border-vault-border">
        <Ionicons name={icon} size={32} color="#6B7280" />
      </View>
      <Text className="text-vault-white text-lg font-semibold text-center mb-2">
        {title}
      </Text>
      <Text className="text-vault-muted text-sm text-center leading-5">
        {description}
      </Text>
    </Animated.View>
  );
}
