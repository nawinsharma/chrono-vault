import React, { useEffect } from 'react';
import { View, Text, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  Easing,
  runOnJS,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VaultUnlockProps {
  onComplete: () => void;
}

export function VaultUnlock({ onComplete }: VaultUnlockProps) {
  const vaultScale = useSharedValue(0.3);
  const vaultOpacity = useSharedValue(0);
  const ringScale1 = useSharedValue(0);
  const ringScale2 = useSharedValue(0);
  const ringScale3 = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const lockRotation = useSharedValue(0);
  const lockScale = useSharedValue(1);
  const flashOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);

  useEffect(() => {
    // Phase 1: Vault appears
    vaultScale.value = withSpring(1, { damping: 12, stiffness: 200 });
    vaultOpacity.value = withTiming(1, { duration: 600 });

    // Phase 2: Rings pulse outward
    ringOpacity.value = withDelay(400, withTiming(0.6, { duration: 400 }));
    ringScale1.value = withDelay(
      500,
      withSequence(
        withTiming(1.5, { duration: 800, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 200 })
      )
    );
    ringScale2.value = withDelay(
      700,
      withSequence(
        withTiming(2, { duration: 800, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 200 })
      )
    );
    ringScale3.value = withDelay(
      900,
      withSequence(
        withTiming(2.5, { duration: 800, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 200 })
      )
    );

    // Phase 3: Lock unlocks
    lockRotation.value = withDelay(
      1400,
      withSequence(
        withTiming(-15, { duration: 200 }),
        withTiming(15, { duration: 200 }),
        withTiming(0, { duration: 150 })
      )
    );

    // Phase 4: Flash
    flashOpacity.value = withDelay(
      2000,
      withSequence(
        withTiming(0.8, { duration: 150 }),
        withTiming(0, { duration: 400 })
      )
    );

    // Phase 5: Lock shrinks and content appears
    lockScale.value = withDelay(
      2200,
      withTiming(0, { duration: 300, easing: Easing.in(Easing.cubic) })
    );

    contentOpacity.value = withDelay(
      2600,
      withTiming(1, { duration: 600 }, (finished) => {
        if (finished) {
          runOnJS(onComplete)();
        }
      })
    );
  }, []);

  const vaultStyle = useAnimatedStyle(() => ({
    transform: [{ scale: vaultScale.value }],
    opacity: vaultOpacity.value,
  }));

  const ring1Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale1.value }],
    opacity: ringOpacity.value * (1 - ringScale1.value / 2),
  }));

  const ring2Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale2.value }],
    opacity: ringOpacity.value * (1 - ringScale2.value / 3),
  }));

  const ring3Style = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale3.value }],
    opacity: ringOpacity.value * (1 - ringScale3.value / 4),
  }));

  const lockStyle = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${lockRotation.value}deg` },
      { scale: lockScale.value },
    ],
  }));

  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <View className="flex-1 items-center justify-center bg-vault-black">
      {/* Pulse rings */}
      <Animated.View
        style={[ring1Style, { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 2, borderColor: '#8B5CF6' }]}
      />
      <Animated.View
        style={[ring2Style, { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1.5, borderColor: '#8B5CF6' }]}
      />
      <Animated.View
        style={[ring3Style, { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 1, borderColor: '#8B5CF6' }]}
      />

      {/* Vault icon */}
      <Animated.View style={vaultStyle}>
        <Animated.View
          style={lockStyle}
          className="w-28 h-28 rounded-full bg-vault-card items-center justify-center border-2 border-vault-purple"
        >
          <Ionicons name="lock-open" size={44} color="#8B5CF6" />
        </Animated.View>
      </Animated.View>

      {/* Flash overlay */}
      <Animated.View
        style={[flashStyle, { position: 'absolute', width: SCREEN_WIDTH, height: '100%', backgroundColor: '#8B5CF6' }]}
        pointerEvents="none"
      />

      {/* Content reveal text */}
      <Animated.View style={contentStyle} className="absolute bottom-40 items-center">
        <Text className="text-vault-purple text-lg font-bold tracking-widest uppercase">
          Vault Opened
        </Text>
        <Text className="text-vault-muted text-sm mt-2">
          Your message from the past
        </Text>
      </Animated.View>
    </View>
  );
}
