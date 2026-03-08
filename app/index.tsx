import React, { useEffect, useRef } from 'react';
import { View, Text, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore } from '@/src/stores/appStore';
import { useWalletStore } from '@/src/stores/walletStore';
import { Button } from '@/src/components/ui/Button';
import { FloatingOrbs } from '@/src/components/animations/FloatingOrbs';
import { PulseRing } from '@/src/components/animations/PulseRing';

const { height } = Dimensions.get('window');

const STEPS = [
  { icon: 'create-outline' as const, text: 'Create a capsule' },
  { icon: 'time-outline' as const, text: 'Lock it in time' },
  { icon: 'sparkles' as const, text: 'Open it later' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const hasOnboarded = useAppStore((s) => s.hasOnboarded);
  const setOnboarded = useAppStore((s) => s.setOnboarded);
  const connected = useWalletStore((s) => s.connected);

  const iconPulse = useSharedValue(1);

  useEffect(() => {
    if (hasOnboarded && connected) {
      router.replace('/(app)/home');
      return;
    }
    if (hasOnboarded && !connected) {
      router.replace('/connect');
      return;
    }
  }, [hasOnboarded, connected, router]);

  useEffect(() => {
    iconPulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, [iconPulse]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconPulse.value }],
  }));

  const handleStart = () => {
    setOnboarded(true);
    router.push('/connect');
  };

  const handleDemo = () => {
    setOnboarded(true);
    router.push('/(app)/home');
  };

  if (hasOnboarded) return null;

  return (
    <View className="flex-1 bg-vault-black">
      <FloatingOrbs />

      <View className="flex-1 justify-between px-6 pt-20 pb-12">
        {/* Hero Section */}
        <Animated.View
          entering={FadeIn.duration(800)}
          className="items-center mt-8"
        >
          <PulseRing size={100} color="#8B5CF6">
            <Animated.View
              style={iconStyle}
              className="w-24 h-24 rounded-full bg-vault-card items-center justify-center border border-vault-border"
            >
              <Ionicons name="time" size={44} color="#8B5CF6" />
            </Animated.View>
          </PulseRing>

          <Animated.Text
            entering={FadeInDown.delay(300).duration(600)}
            className="text-vault-white text-4xl font-bold mt-10 text-center"
          >
            ChronoVault
          </Animated.Text>

          <Animated.Text
            entering={FadeInDown.delay(500).duration(600)}
            className="text-vault-muted text-lg mt-3 text-center leading-6 px-4"
          >
            Send a message to your future wallet.
          </Animated.Text>
        </Animated.View>

        {/* Steps */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(600)}
          className="my-12"
        >
          {STEPS.map((step, i) => (
            <Animated.View
              key={i}
              entering={FadeInDown.delay(800 + i * 150).duration(500)}
              className="flex-row items-center mb-5 px-6"
            >
              <View className="w-12 h-12 rounded-full bg-vault-card items-center justify-center border border-vault-border mr-4">
                <Ionicons name={step.icon} size={22} color="#8B5CF6" />
              </View>
              <Text className="text-vault-text text-base flex-1">
                {step.text}
              </Text>
              {i < STEPS.length - 1 && (
                <View className="absolute left-[29px] top-12 w-[1px] h-5 bg-vault-border" />
              )}
            </Animated.View>
          ))}
        </Animated.View>

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(1300).duration(600)}>
          <Button
            title="Connect Wallet"
            onPress={handleStart}
            variant="primary"
            size="lg"
            icon={<Ionicons name="wallet-outline" size={20} color="#FFFFFF" />}
          />
          <View className="h-3" />
          <Button
            title="Explore Demo Capsules"
            onPress={handleDemo}
            variant="secondary"
            size="lg"
            icon={<Ionicons name="eye-outline" size={20} color="#E5E7EB" />}
          />
        </Animated.View>
      </View>
    </View>
  );
}
