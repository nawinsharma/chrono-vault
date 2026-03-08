import React, { useEffect } from 'react';
import { View, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

interface OrbProps {
  delay: number;
  startX: number;
  startY: number;
  size: number;
  color: string;
}

function Orb({ delay, startX, startY, size, color }: OrbProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0.15);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-30, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(30, { duration: 3000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    translateX.value = withDelay(
      delay + 500,
      withRepeat(
        withSequence(
          withTiming(20, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-20, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.3, { duration: 2000 }),
          withTiming(0.1, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, [delay, opacity, translateX, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}
    />
  );
}

export function FloatingOrbs() {
  const orbs = [
    { delay: 0, startX: width * 0.1, startY: height * 0.15, size: 120, color: '#8B5CF6' },
    { delay: 500, startX: width * 0.65, startY: height * 0.08, size: 80, color: '#3B82F6' },
    { delay: 1000, startX: width * 0.3, startY: height * 0.6, size: 100, color: '#06B6D4' },
    { delay: 1500, startX: width * 0.75, startY: height * 0.5, size: 60, color: '#8B5CF6' },
    { delay: 800, startX: width * 0.05, startY: height * 0.8, size: 90, color: '#3B82F6' },
  ];

  return (
    <View className="absolute inset-0" pointerEvents="none">
      {orbs.map((orb, i) => (
        <Orb key={i} {...orb} />
      ))}
    </View>
  );
}
