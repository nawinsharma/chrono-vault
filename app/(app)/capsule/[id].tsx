import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreenView } from '@/src/components/ui/ScreenContainer';
import * as Clipboard from 'expo-clipboard';

import { useCapsuleStore } from '@/src/stores/capsuleStore';
import { CountdownTimer } from '@/src/components/capsule/CountdownTimer';
import { Button } from '@/src/components/ui/Button';
import { PulseRing } from '@/src/components/animations/PulseRing';
import { CapsuleStatus } from '@/src/types/capsule';
import { formatUnlockDate, formatTimeAgo } from '@/src/utils/time';
import { truncateAddress, formatCID } from '@/src/utils/format';
import { useCountdown } from '@/src/hooks/useCountdown';

function InfoRow({ label, value, copyable }: { label: string; value: string; copyable?: boolean }) {
  const handleCopy = async () => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copied', `${label} copied to clipboard`);
  };

  return (
    <View className="flex-row items-center justify-between py-3 border-b border-vault-border">
      <Text className="text-vault-muted text-sm">{label}</Text>
      <TouchableOpacity
        onPress={copyable ? handleCopy : undefined}
        className="flex-row items-center"
        disabled={!copyable}
      >
        <Text className="text-vault-text text-sm font-mono" numberOfLines={1}>
          {value}
        </Text>
        {copyable && (
          <Ionicons name="copy-outline" size={14} color="#6B7280" style={{ marginLeft: 6 }} />
        )}
      </TouchableOpacity>
    </View>
  );
}

export default function CapsuleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const capsule = useCapsuleStore((s) => s.getCapsuleById(id));
  const countdown = useCountdown(capsule?.unlockTimestamp || 0);

  if (!capsule) {
    return (
      <SafeScreenView className="flex-1 bg-vault-black items-center justify-center">
        <Text className="text-vault-muted">Capsule not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-vault-purple">Go Back</Text>
        </TouchableOpacity>
      </SafeScreenView>
    );
  }

  const isLocked = capsule.status === CapsuleStatus.Locked;
  const canUnlock = isLocked && countdown.isExpired;

  return (
    <SafeScreenView className="flex-1 bg-vault-black">
      {/* Header */}
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
        >
          <Ionicons name="arrow-back" size={20} color="#E5E7EB" />
        </TouchableOpacity>
        <Text className="text-vault-white text-lg font-semibold ml-4 flex-1" numberOfLines={1}>
          {capsule.title}
        </Text>
        {capsule.privacyMode === 'public' && capsule.status === CapsuleStatus.Unlocked && (
          <TouchableOpacity
            onPress={() => router.push(`/(app)/share/${capsule.id}`)}
            className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
          >
            <Ionicons name="share-outline" size={18} color="#8B5CF6" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Status Badge */}
        <Animated.View
          entering={FadeIn.duration(500)}
          className="items-center mt-6 mb-8"
        >
          <PulseRing
            size={80}
            color={isLocked ? '#8B5CF6' : '#10B981'}
          >
            <View
              className={`w-20 h-20 rounded-full items-center justify-center border-2 ${
                isLocked ? 'bg-vault-card border-vault-purple' : 'bg-vault-card border-emerald-500'
              }`}
            >
              <Ionicons
                name={isLocked ? 'lock-closed' : 'lock-open'}
                size={32}
                color={isLocked ? '#8B5CF6' : '#10B981'}
              />
            </View>
          </PulseRing>

          <Animated.Text
            entering={FadeInDown.delay(200).duration(400)}
            className="text-vault-white text-xl font-bold mt-6"
          >
            {capsule.title}
          </Animated.Text>

          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            className={`mt-2 px-3 py-1 rounded-full ${
              isLocked ? 'bg-vault-purple/20' : 'bg-emerald-500/20'
            }`}
          >
            <Text
              className={`text-xs font-medium ${
                isLocked ? 'text-vault-purple' : 'text-emerald-400'
              }`}
            >
              {isLocked ? 'LOCKED' : 'UNLOCKED'}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Countdown (if locked) */}
        {isLocked && (
          <Animated.View
            entering={FadeInDown.delay(400).duration(500)}
            className="mx-5 mb-8"
          >
            <CountdownTimer
              unlockTimestamp={capsule.unlockTimestamp}
              size="lg"
            />
          </Animated.View>
        )}

        {/* Details */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          className="mx-5 bg-vault-card rounded-2xl p-5 border border-vault-border mb-6"
        >
          <Text className="text-vault-white text-base font-semibold mb-3">
            Capsule Details
          </Text>
          <InfoRow label="Unlock Date" value={formatUnlockDate(capsule.unlockTimestamp)} />
          <InfoRow label="Created" value={formatTimeAgo(capsule.createdAt)} />
          <InfoRow
            label="Creator"
            value={truncateAddress(capsule.creatorPubkey, 6)}
            copyable
          />
          <InfoRow label="CID" value={formatCID(capsule.encryptedCid)} copyable />
          {capsule.transactionHash && (
            <InfoRow
              label="Tx Hash"
              value={formatCID(capsule.transactionHash)}
              copyable
            />
          )}
          {capsule.escrowAmount > 0 && (
            <InfoRow label="Escrow" value={`${capsule.escrowAmount} SOL`} />
          )}
          <InfoRow label="Privacy" value={capsule.privacyMode} />
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View
          entering={FadeInUp.delay(600).duration(500)}
          className="mx-5"
        >
          {canUnlock && (
            <Button
              title="Unlock Capsule"
              onPress={() => router.push(`/(app)/unlock/${capsule.id}`)}
              size="lg"
              icon={<Ionicons name="lock-open" size={20} color="#FFFFFF" />}
            />
          )}

          {isLocked && !canUnlock && (
            <View className="bg-vault-dark rounded-2xl p-5 items-center border border-vault-border">
              <Ionicons name="hourglass-outline" size={28} color="#6B7280" />
              <Text className="text-vault-muted text-sm mt-3 text-center">
                This capsule is locked until the countdown ends.{'\n'}
                Come back when the time arrives.
              </Text>
            </View>
          )}

          {!isLocked && (
            <Button
              title="View Capsule Contents"
              onPress={() => router.push(`/(app)/unlock/${capsule.id}`)}
              variant="secondary"
              size="lg"
              icon={<Ionicons name="eye-outline" size={20} color="#E5E7EB" />}
            />
          )}
        </Animated.View>
      </ScrollView>
    </SafeScreenView>
  );
}
