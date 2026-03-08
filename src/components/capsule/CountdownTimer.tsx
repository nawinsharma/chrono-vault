import React, { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { useCountdown } from '@/src/hooks/useCountdown';
import { padNumber } from '@/src/utils/time';

interface CountdownTimerProps {
  unlockTimestamp: number;
  size?: 'sm' | 'md' | 'lg';
  onExpired?: () => void;
}

function TimeUnit({ value, label, size }: { value: string; label: string; size: string }) {
  const textSize = size === 'lg' ? 'text-4xl' : size === 'md' ? 'text-2xl' : 'text-lg';
  const labelSize = size === 'lg' ? 'text-xs' : 'text-[10px]';

  return (
    <Animated.View entering={FadeIn.duration(400)} className="items-center">
      <View className="bg-vault-card rounded-xl px-3 py-2 min-w-[52px] items-center border border-vault-border">
        <Text className={`${textSize} font-bold text-vault-white font-mono`}>
          {value}
        </Text>
      </View>
      <Text className={`${labelSize} text-vault-muted mt-1 uppercase tracking-widest`}>
        {label}
      </Text>
    </Animated.View>
  );
}

function Separator({ size }: { size: string }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.2, { duration: 500, easing: Easing.ease }),
        withTiming(1, { duration: 500, easing: Easing.ease })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const textSize = size === 'lg' ? 'text-3xl' : size === 'md' ? 'text-xl' : 'text-lg';

  return (
    <Animated.Text
      style={animatedStyle}
      className={`${textSize} text-vault-purple font-bold mx-1`}
    >
      :
    </Animated.Text>
  );
}

export function CountdownTimer({
  unlockTimestamp,
  size = 'md',
  onExpired,
}: CountdownTimerProps) {
  const countdown = useCountdown(unlockTimestamp);

  useEffect(() => {
    if (countdown.isExpired && onExpired) {
      onExpired();
    }
  }, [countdown.isExpired, onExpired]);

  if (countdown.isExpired) {
    return (
      <Animated.View entering={FadeIn.duration(600)} className="items-center">
        <Text className="text-vault-purple text-xl font-bold">
          Ready to Unlock
        </Text>
      </Animated.View>
    );
  }

  return (
    <View className="flex-row items-start justify-center">
      <TimeUnit value={padNumber(countdown.days)} label="Days" size={size} />
      <Separator size={size} />
      <TimeUnit value={padNumber(countdown.hours)} label="Hrs" size={size} />
      <Separator size={size} />
      <TimeUnit value={padNumber(countdown.minutes)} label="Min" size={size} />
      <Separator size={size} />
      <TimeUnit value={padNumber(countdown.seconds)} label="Sec" size={size} />
    </View>
  );
}
