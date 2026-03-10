import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreenView } from '@/src/components/ui/ScreenContainer';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import { useCapsuleStore } from '@/src/stores/capsuleStore';
import { Button } from '@/src/components/ui/Button';
import { formatUnlockDate } from '@/src/utils/time';
import { truncateAddress } from '@/src/utils/format';
import { WalletNavPill } from '@/src/components/ui/WalletNavPill';

export default function ShareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const capsule = useCapsuleStore((s) => s.getCapsuleById(id));
  const viewShotRef = useRef<ViewShot>(null);

  const handleShare = useCallback(async () => {
    try {
      if (viewShotRef.current?.capture) {
        const uri = await viewShotRef.current.capture();
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your ChronoVault capsule',
          });
        }
      }
    } catch {
      Alert.alert('Share Failed', 'Unable to share at this time.');
    }
  }, []);

  if (!capsule) {
    return (
      <SafeScreenView className="flex-1 bg-vault-black items-center justify-center">
        <Text className="text-vault-muted">Capsule not found</Text>
      </SafeScreenView>
    );
  }

  return (
    <SafeScreenView className="flex-1 bg-vault-black">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-4 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
          >
            <Ionicons name="arrow-back" size={20} color="#E5E7EB" />
          </TouchableOpacity>
          <Text className="text-vault-white text-lg font-semibold ml-4">
            Share Capsule
          </Text>
        </View>
        <WalletNavPill />
      </View>

      <View className="flex-1 px-5 items-center justify-center">
        {/* Share Card Preview */}
        <Animated.View entering={FadeIn.duration(600)}>
          <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }}
          >
            <View className="bg-vault-dark rounded-3xl p-8 w-[320px] border border-vault-border">
              {/* Header */}
              <View className="flex-row items-center mb-6">
                <View className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-purple mr-3">
                  <Ionicons name="time" size={20} color="#8B5CF6" />
                </View>
                <Text className="text-vault-purple text-base font-bold">
                  ChronoVault
                </Text>
              </View>

              {/* Capsule Content */}
              <Text className="text-vault-white text-xl font-bold mb-4">
                {capsule.title}
              </Text>

              <View className="bg-vault-black/50 rounded-xl p-4 mb-6">
                <Text className="text-vault-text text-sm leading-5">
                  A time capsule was unlocked.
                </Text>
              </View>

              {/* Meta Info */}
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-vault-muted text-xs">Unlock Date</Text>
                <Text className="text-vault-text text-xs">
                  {formatUnlockDate(capsule.unlockTimestamp)}
                </Text>
              </View>
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-vault-muted text-xs">Creator</Text>
                <Text className="text-vault-text text-xs font-mono">
                  {truncateAddress(capsule.creatorPubkey, 6)}
                </Text>
              </View>

              {/* Footer */}
              <View className="border-t border-vault-border pt-4 flex-row items-center justify-between">
                <Text className="text-vault-muted text-[10px] uppercase tracking-widest">
                  Powered by Solana
                </Text>
                <View className="flex-row items-center">
                  <Ionicons name="lock-open" size={12} color="#10B981" />
                  <Text className="text-emerald-400 text-xs ml-1 font-medium">
                    Unlocked
                  </Text>
                </View>
              </View>
            </View>
          </ViewShot>
        </Animated.View>

        {/* Share Actions */}
        <Animated.View
          entering={FadeInDown.delay(400).duration(500)}
          className="mt-8 w-full"
        >
          <Button
            title="Share Screenshot"
            onPress={handleShare}
            size="lg"
            icon={<Ionicons name="share-outline" size={20} color="#FFFFFF" />}
          />
        </Animated.View>
      </View>
    </SafeScreenView>
  );
}
