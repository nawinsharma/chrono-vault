import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CapsuleMetadata, CapsuleStatus } from '@/src/types/capsule';
import { formatUnlockDate } from '@/src/utils/time';
import { CountdownTimer } from './CountdownTimer';
import { GlowDot } from '@/src/components/ui/GlowDot';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CapsuleCardProps {
  capsule: CapsuleMetadata;
  onPress: () => void;
  index?: number;
}

export function CapsuleCard({ capsule, onPress, index = 0 }: CapsuleCardProps) {
  const scale = useSharedValue(1);
  const isLocked = capsule.status === CapsuleStatus.Locked;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        activeOpacity={0.9}
        style={animatedStyle}
        className="bg-vault-card rounded-2xl p-5 mb-4 border border-vault-border"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View className="w-10 h-10 rounded-full bg-vault-dark items-center justify-center mr-3">
              <Ionicons
                name={isLocked ? 'lock-closed' : 'lock-open'}
                size={18}
                color={isLocked ? '#8B5CF6' : '#10B981'}
              />
            </View>
            <View className="flex-1">
              <Text className="text-vault-white text-base font-semibold" numberOfLines={1}>
                {capsule.title}
              </Text>
              <Text className="text-vault-muted text-xs mt-0.5">
                {formatUnlockDate(capsule.unlockTimestamp)}
              </Text>
            </View>
          </View>
          <GlowDot color={isLocked ? '#8B5CF6' : '#10B981'} size={6} />
        </View>

        {isLocked && (
          <View className="mt-2">
            <CountdownTimer unlockTimestamp={capsule.unlockTimestamp} size="sm" />
          </View>
        )}

        {!isLocked && (
          <View className="mt-2 flex-row items-center justify-center py-2">
            <Ionicons name="sparkles" size={16} color="#10B981" />
            <Text className="text-emerald-400 text-sm font-medium ml-1.5">
              Capsule Unlocked
            </Text>
          </View>
        )}

        {capsule.escrowAmount > 0 && (
          <View className="mt-3 pt-3 border-t border-vault-border flex-row items-center">
            <Ionicons name="diamond-outline" size={14} color="#6B7280" />
            <Text className="text-vault-muted text-xs ml-1.5">
              {capsule.escrowAmount} SOL locked
            </Text>
          </View>
        )}
      </AnimatedTouchable>
    </Animated.View>
  );
}
