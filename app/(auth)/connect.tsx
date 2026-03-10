import { PulseRing } from '@/src/components/animations/PulseRing';
import { Button } from '@/src/components/ui/Button';
import { ScreenContainer } from '@/src/components/ui/ScreenContainer';
import { useWalletConnection } from '@/src/hooks/useWalletConnection';
import type { SupportedWallet } from '@/src/types/wallet';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
    FadeIn,
    FadeInDown,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

const WALLETS: { name: SupportedWallet; icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { name: 'Phantom', icon: 'flash-outline', color: '#AB9FF2' },
  { name: 'Solflare', icon: 'sunny-outline', color: '#FC8F4A' },
  { name: 'Backpack', icon: 'briefcase-outline', color: '#E33E3F' },
];

function WalletOption({
  name,
  icon,
  color,
  selected,
  onSelect,
  index,
}: {
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  selected: boolean;
  onSelect: () => void;
  index: number;
}) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(400 + index * 100).duration(500)}>
      <AnimatedTouchable
        onPress={onSelect}
        onPressIn={() => {
          scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        activeOpacity={0.8}
        style={animatedStyle}
        className={`
          flex-row items-center p-4 rounded-2xl mb-3 border
          ${selected ? 'bg-vault-card border-vault-purple' : 'bg-vault-dark border-vault-border'}
        `}
      >
        <View
          className="w-12 h-12 rounded-full items-center justify-center mr-4"
          style={{ backgroundColor: `${color}20` }}
        >
          <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text className="text-vault-white text-base font-semibold flex-1">
          {name}
        </Text>
        {selected && <Ionicons name="checkmark-circle" size={24} color="#8B5CF6" />}
      </AnimatedTouchable>
    </Animated.View>
  );
}

export default function ConnectWalletScreen() {
  const router = useRouter();
  const { connect, connectDemoWallet, connecting } = useWalletConnection();
  const [selectedWallet, setSelectedWallet] = useState<SupportedWallet | null>(null);

  const handleDemoWallet = () => {
    connectDemoWallet();
    router.replace('/(app)/home');
  };

  const handleConnect = async () => {
    if (!selectedWallet) return;

    try {
      await connect(selectedWallet);
      router.replace('/(app)/home');
    } catch (err) {
      Alert.alert('Connection Failed', err instanceof Error ? err.message : 'Unable to connect wallet. Please try again.');
    }
  };

  return (
    <ScreenContainer>
      <View className="flex-1 pt-8">
        {/* Header */}
        <Animated.View entering={FadeIn.duration(600)} className="items-center mb-10">
          <PulseRing size={70} color="#8B5CF6">
            <View className="w-16 h-16 rounded-full bg-vault-card items-center justify-center border border-vault-border">
              <Ionicons name="wallet" size={28} color="#8B5CF6" />
            </View>
          </PulseRing>

          <Text className="text-vault-white text-2xl font-bold mt-8 text-center">
            Connect Your Wallet
          </Text>
          <Text className="text-vault-muted text-sm mt-2 text-center px-8">
            Choose a Solana wallet to start creating time capsules
          </Text>
        </Animated.View>

        {/* Wallet Options */}
        <View className="mb-8">
          {WALLETS.map((wallet, i) => (
            <WalletOption
              key={wallet.name}
              {...wallet}
              selected={selectedWallet === wallet.name}
              onSelect={() => setSelectedWallet(wallet.name)}
              index={i}
            />
          ))}
        </View>

        {/* Info */}
        <Animated.View
          entering={FadeInDown.delay(800).duration(500)}
          className="flex-row items-start bg-vault-dark rounded-xl p-4 mb-8 border border-vault-border"
        >
          <Ionicons name="shield-checkmark-outline" size={20} color="#8B5CF6" className="mt-0.5" />
          <Text className="text-vault-muted text-xs ml-3 flex-1 leading-4">
            Your wallet keys never leave your device. ChronoVault only requests
            signing permissions for capsule transactions.
          </Text>
        </Animated.View>

        <View className="flex-1" />

        {/* Connect Button */}
        <Animated.View entering={FadeInDown.delay(1000).duration(500)} className="pb-4">
          <Button
            title={connecting ? 'Connecting...' : 'Connect Wallet'}
            onPress={handleConnect}
            loading={connecting}
            disabled={!selectedWallet}
            size="lg"
          />
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              onPress={handleDemoWallet}
              className="mt-4 py-3 px-4 rounded-xl border border-vault-border bg-vault-dark"
            >
              <Text className="text-vault-muted text-sm text-center">
                Use demo wallet (run app without real wallet)
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            onPress={() => router.replace('/(app)/home')}
            className="mt-3 py-2"
          >
            <Text className="text-vault-muted text-xs text-center">
              Skip for now
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScreenContainer>
  );
}
