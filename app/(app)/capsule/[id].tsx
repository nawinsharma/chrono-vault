import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreenView } from '@/src/components/ui/ScreenContainer';
import * as Clipboard from 'expo-clipboard';

import { useCapsuleStore } from '@/src/stores/capsuleStore';
import { CountdownTimer } from '@/src/components/capsule/CountdownTimer';
import { ConditionResultCard } from '@/src/components/capsule/ConditionResultCard';
import { Button } from '@/src/components/ui/Button';
import { PulseRing } from '@/src/components/animations/PulseRing';
import { CapsuleStatus, CapsuleType } from '@/src/types/capsule';
import type { DecryptedCapsule } from '@/src/types/capsule';
import { formatUnlockDate, formatTimeAgo } from '@/src/utils/time';
import { truncateAddress, formatCID } from '@/src/utils/format';
import { useCountdown } from '@/src/hooks/useCountdown';
import { decryptData } from '@/src/utils/encryption';
import { verifyCommitment } from '@/src/utils/hash';
import { fetchFromIPFS } from '@/src/services/ipfs';
import { evaluateCondition, isConditionEvaluationReady } from '@/src/services/conditionEvaluator';
import { WalletNavPill } from '@/src/components/ui/WalletNavPill';
import { PriceChart } from '@/src/components/charts/PriceChart';

type VerificationStatus = 'pending' | 'verified' | 'failed' | 'idle';

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
  const updateConditionResult = useCapsuleStore((s) => s.updateConditionResult);
  const countdown = useCountdown(capsule?.unlockTimestamp || 0);

  const isReputation = capsule?.capsuleType === CapsuleType.Reputation;
  const isLocked = capsule?.status === CapsuleStatus.Locked;
  const isUnlocked = capsule?.status === CapsuleStatus.Unlocked;
  const hasCondition = !!capsule?.condition;

  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('idle');
  const [evaluatingCondition, setEvaluatingCondition] = useState(false);

  useEffect(() => {
    if (!isReputation || !isUnlocked || !capsule) return;

    let cancelled = false;
    (async () => {
      setVerificationStatus('pending');
      try {
        let encryptedPayload: string;
        if (capsule.isDemo) {
          const payload = await useCapsuleStore.getState().getDemoPayload(capsule.id);
          if (!payload) throw new Error('Demo payload missing');
          encryptedPayload = payload;
        } else {
          encryptedPayload = await fetchFromIPFS(capsule.encryptedCid);
        }
        const decrypted = await decryptData(encryptedPayload, capsule.encryptionKeyId);
        const content = JSON.parse(decrypted) as DecryptedCapsule;

        if (cancelled) return;
        if (!content.commitmentSalt || !capsule.commitmentHash) {
          setVerificationStatus('failed');
          return;
        }
        const valid = await verifyCommitment(
          content.message,
          content.commitmentSalt,
          capsule.commitmentHash
        );
        if (!cancelled) setVerificationStatus(valid ? 'verified' : 'failed');
      } catch {
        if (!cancelled) setVerificationStatus('failed');
      }
    })();
    return () => { cancelled = true; };
  }, [isReputation, isUnlocked, capsule?.id]);

  useEffect(() => {
    if (!capsule?.condition || capsule.conditionResult !== 'pending') return;
    if (!isConditionEvaluationReady(capsule.condition)) return;
    if (evaluatingCondition) return;

    let cancelled = false;
    setEvaluatingCondition(true);
    (async () => {
      try {
        const { result, evaluation } = await evaluateCondition(capsule.condition!);
        if (!cancelled && result !== 'pending') {
          updateConditionResult(capsule.id, result, evaluation);
        }
      } catch { /* retry next visit */ }
      finally {
        if (!cancelled) setEvaluatingCondition(false);
      }
    })();
    return () => { cancelled = true; };
  }, [capsule?.id, capsule?.condition, capsule?.conditionResult]);

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

  const canUnlock = isLocked && countdown.isExpired;

  const conditionStatusColor =
    capsule.conditionResult === 'passed' ? '#10B981'
    : capsule.conditionResult === 'failed' ? '#EF4444'
    : '#6B7280';

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
        <View className="flex-row items-center gap-2">
          {capsule.privacyMode === 'public' && capsule.status === CapsuleStatus.Unlocked && (
            <TouchableOpacity
              onPress={() => router.push(`/(app)/share/${capsule.id}`)}
              className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
            >
              <Ionicons name="share-outline" size={18} color="#8B5CF6" />
            </TouchableOpacity>
          )}
          <WalletNavPill />
        </View>
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
            color={isLocked ? (isReputation ? '#F59E0B' : '#8B5CF6') : '#10B981'}
          >
            <View
              className={`w-20 h-20 rounded-full items-center justify-center border-2 ${
                isLocked
                  ? isReputation
                    ? 'bg-vault-card border-amber-500'
                    : 'bg-vault-card border-vault-purple'
                  : 'bg-vault-card border-emerald-500'
              }`}
            >
              <Ionicons
                name={isLocked ? (isReputation ? 'shield-checkmark' : 'lock-closed') : 'lock-open'}
                size={32}
                color={isLocked ? (isReputation ? '#F59E0B' : '#8B5CF6') : '#10B981'}
              />
            </View>
          </PulseRing>

          <Animated.Text
            entering={FadeInDown.delay(200).duration(400)}
            className="text-vault-white text-xl font-bold mt-6"
          >
            {capsule.title}
          </Animated.Text>

          <View className="flex-row items-center gap-2 mt-2">
            {isReputation && (
              <View className="bg-amber-500/20 px-3 py-1 rounded-full">
                <Text className="text-amber-400 text-xs font-bold">REPUTATION</Text>
              </View>
            )}
            <View
              className={`px-3 py-1 rounded-full ${
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
            </View>
            {hasCondition && capsule.conditionResult && (
              <View
                className={`px-3 py-1 rounded-full ${
                  capsule.conditionResult === 'passed' ? 'bg-emerald-500/20'
                  : capsule.conditionResult === 'failed' ? 'bg-red-500/20'
                  : 'bg-vault-dark'
                }`}
              >
                <Text
                  className="text-xs font-bold"
                  style={{ color: conditionStatusColor }}
                >
                  {capsule.conditionResult === 'passed' ? 'PASSED'
                  : capsule.conditionResult === 'failed' ? 'FAILED'
                  : 'PENDING'}
                </Text>
              </View>
            )}
          </View>
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

        {/* Condition Card */}
        {hasCondition && capsule.condition && (
          <Animated.View
            entering={FadeInDown.delay(420).duration(500)}
            className="mx-5 mb-6"
          >
            <ConditionResultCard
              condition={capsule.condition}
              conditionResult={capsule.conditionResult || 'pending'}
              evaluation={capsule.conditionEvaluation}
            />
          </Animated.View>
        )}

        {/* Live Price Chart for condition capsules while locked */}
        {hasCondition && isLocked && capsule.condition?.type === 'price_prediction' && (
          <Animated.View
            entering={FadeInDown.delay(440).duration(500)}
            className="mx-5 mb-6"
          >
            <PriceChart
              asset={capsule.condition.asset}
              targetPrice={capsule.condition.targetPrice}
            />
          </Animated.View>
        )}

        {/* Proof Card (Reputation capsules) */}
        {isReputation && (
          <Animated.View
            entering={FadeInDown.delay(450).duration(500)}
            className={`mx-5 rounded-2xl p-5 border mb-6 ${
              isLocked
                ? 'bg-amber-500/5 border-amber-500/20'
                : verificationStatus === 'verified'
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : verificationStatus === 'failed'
                ? 'bg-red-500/5 border-red-500/20'
                : 'bg-vault-card border-vault-border'
            }`}
          >
            <View className="flex-row items-center mb-3">
              <Ionicons
                name="shield-checkmark"
                size={18}
                color={
                  isLocked
                    ? '#F59E0B'
                    : verificationStatus === 'verified'
                    ? '#10B981'
                    : verificationStatus === 'failed'
                    ? '#EF4444'
                    : '#6B7280'
                }
              />
              <Text
                className={`text-sm font-bold ml-2 ${
                  isLocked
                    ? 'text-amber-400'
                    : verificationStatus === 'verified'
                    ? 'text-emerald-400'
                    : verificationStatus === 'failed'
                    ? 'text-red-400'
                    : 'text-vault-muted'
                }`}
              >
                {isLocked
                  ? 'Commitment Proof'
                  : verificationStatus === 'verified'
                  ? 'Verified'
                  : verificationStatus === 'failed'
                  ? 'Verification Failed'
                  : 'Verifying...'}
              </Text>
            </View>

            {capsule.commitmentHash && (
              <TouchableOpacity
                onPress={async () => {
                  await Clipboard.setStringAsync(capsule.commitmentHash!);
                  Alert.alert('Copied', 'Commitment hash copied to clipboard');
                }}
                className="bg-black/20 rounded-lg p-3 mb-3"
              >
                <Text className="text-vault-muted text-[10px] mb-1 uppercase tracking-wider">Commitment Hash</Text>
                <Text className="text-vault-text text-xs font-mono" numberOfLines={2}>
                  {capsule.commitmentHash}
                </Text>
                <View className="flex-row items-center mt-1.5">
                  <Ionicons name="copy-outline" size={10} color="#6B7280" />
                  <Text className="text-vault-muted text-[10px] ml-1">Tap to copy</Text>
                </View>
              </TouchableOpacity>
            )}

            <View className="flex-row justify-between">
              <View>
                <Text className="text-vault-muted text-[10px] uppercase tracking-wider">Stake</Text>
                <Text className="text-amber-400 text-sm font-semibold mt-0.5">
                  {capsule.escrowAmount} SOL
                </Text>
              </View>
              <View className="items-end">
                <Text className="text-vault-muted text-[10px] uppercase tracking-wider">Unlock Date</Text>
                <Text className="text-vault-text text-sm mt-0.5">
                  {formatUnlockDate(capsule.unlockTimestamp)}
                </Text>
              </View>
            </View>

            {isLocked && (
              <Text className="text-amber-400/50 text-[10px] mt-3 text-center">
                Prediction is encrypted and hidden until unlock
              </Text>
            )}

            {isUnlocked && verificationStatus === 'verified' && (
              <Text className="text-emerald-400/60 text-[10px] mt-3 text-center">
                SHA-256 commitment hash matches — prediction is authentic
              </Text>
            )}
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
          {isReputation && (
            <InfoRow label="Type" value="Reputation" />
          )}
          {hasCondition && (
            <InfoRow label="Condition" value="Price Prediction" />
          )}
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
            <InfoRow
              label={isReputation ? 'Stake' : 'Escrow'}
              value={`${capsule.escrowAmount} SOL`}
            />
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
