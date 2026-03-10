import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreenView } from '@/src/components/ui/ScreenContainer';

import { useCapsuleStore } from '@/src/stores/capsuleStore';
import { useWalletStore } from '@/src/stores/walletStore';
import { VaultUnlock } from '@/src/components/animations/VaultUnlock';
import { ConditionResultCard } from '@/src/components/capsule/ConditionResultCard';
import { Button } from '@/src/components/ui/Button';
import { CapsuleStatus, CapsuleType } from '@/src/types/capsule';
import type { DecryptedCapsule } from '@/src/types/capsule';
import { decryptData } from '@/src/utils/encryption';
import { verifyCommitment } from '@/src/utils/hash';
import { fetchFromIPFS } from '@/src/services/ipfs';
import { sendUnlockCapsule } from '@/src/services/solana';
import { evaluateCondition, isConditionEvaluationReady } from '@/src/services/conditionEvaluator';
import { formatUnlockDate } from '@/src/utils/time';
import { WalletNavPill } from '@/src/components/ui/WalletNavPill';

type Phase = 'confirm' | 'unlocking' | 'animating' | 'revealed';
type VerificationStatus = 'pending' | 'verified' | 'failed';

export default function UnlockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const capsule = useCapsuleStore((s) => s.getCapsuleById(id));
  const updateStatus = useCapsuleStore((s) => s.updateCapsuleStatus);
  const updateConditionResult = useCapsuleStore((s) => s.updateConditionResult);
  const wallet = useWalletStore();

  const [phase, setPhase] = useState<Phase>(
    capsule?.status === CapsuleStatus.Unlocked ? 'revealed' : 'confirm'
  );
  const [decryptedContent, setDecryptedContent] = useState<DecryptedCapsule | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('pending');

  const isReputation = capsule?.capsuleType === CapsuleType.Reputation;
  const hasCondition = !!capsule?.condition;

  const verifyIfReputation = useCallback(
    async (content: DecryptedCapsule) => {
      if (!isReputation || !capsule?.commitmentHash) {
        setVerificationStatus('pending');
        return;
      }
      if (!content.commitmentSalt) {
        setVerificationStatus('failed');
        return;
      }
      try {
        const valid = await verifyCommitment(
          content.message,
          content.commitmentSalt,
          capsule.commitmentHash
        );
        setVerificationStatus(valid ? 'verified' : 'failed');
      } catch {
        setVerificationStatus('failed');
      }
    },
    [isReputation, capsule?.commitmentHash]
  );

  const evaluateConditionIfReady = useCallback(async () => {
    if (!capsule?.condition) return;
    if (capsule.conditionResult && capsule.conditionResult !== 'pending') return;
    if (!isConditionEvaluationReady(capsule.condition)) return;

    try {
      const { result, evaluation } = await evaluateCondition(capsule.condition);
      if (result !== 'pending') {
        updateConditionResult(capsule.id, result, evaluation);
      }
    } catch { /* will retry */ }
  }, [capsule?.id, capsule?.condition, capsule?.conditionResult, updateConditionResult]);

  const doUnlock = useCallback(async () => {
    if (!capsule) return;
    if (!wallet.publicKey) {
      setError('Connect a Solana wallet (e.g. Phantom) to unlock this capsule.');
      return;
    }
    const isDemoCapsule = capsule.isDemo === true;
    if (!isDemoCapsule && !wallet.signAndSendTransaction) {
      setError('You\u2019re using the demo wallet. To unlock capsules, connect a real Solana wallet (e.g. Phantom) on web.');
      return;
    }

    setPhase('unlocking');
    setError(null);

    try {
      let encryptedPayload: string;

      if (isDemoCapsule) {
        const getDemoPayload = useCapsuleStore.getState().getDemoPayload;
        const payload = await getDemoPayload(capsule.id);
        if (!payload) {
          throw new Error('Demo capsule data not found.');
        }
        encryptedPayload = payload;
      } else {
        await sendUnlockCapsule(
          { creatorPubkey: wallet.publicKey, capsuleId: capsule.id },
          wallet.signAndSendTransaction!
        );
        encryptedPayload = await fetchFromIPFS(capsule.encryptedCid);
      }

      const decrypted = await decryptData(encryptedPayload, capsule.encryptionKeyId);
      const content = JSON.parse(decrypted) as DecryptedCapsule;

      updateStatus(capsule.id, CapsuleStatus.Unlocked);
      setDecryptedContent(content);
      await verifyIfReputation(content);
      await evaluateConditionIfReady();
      setPhase('animating');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock capsule');
      setPhase('confirm');
    }
  }, [capsule, wallet.publicKey, wallet.signAndSendTransaction, updateStatus, verifyIfReputation, evaluateConditionIfReady]);

  useEffect(() => {
    if (phase === 'revealed' && !decryptedContent && capsule) {
      (async () => {
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
          setDecryptedContent(content);
          await verifyIfReputation(content);
          await evaluateConditionIfReady();
        } catch {
          setDecryptedContent({
            title: capsule.title,
            message: 'Content could not be decrypted. The encryption key may have been lost.',
            creatorWallet: capsule.creatorPubkey,
            createdAt: capsule.createdAt * 1000,
          });
          if (isReputation) setVerificationStatus('failed');
        }
      })();
    }
  }, [phase, decryptedContent, capsule, verifyIfReputation, isReputation, evaluateConditionIfReady]);

  if (!capsule) {
    return (
      <SafeScreenView className="flex-1 bg-vault-black items-center justify-center">
        <Text className="text-vault-muted">Capsule not found</Text>
      </SafeScreenView>
    );
  }

  if (phase === 'animating') {
    return <VaultUnlock onComplete={() => setPhase('revealed')} />;
  }

  if (phase === 'confirm') {
    return (
      <SafeScreenView className="flex-1 bg-vault-black">
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
          >
            <Ionicons name="arrow-back" size={20} color="#E5E7EB" />
          </TouchableOpacity>
          <WalletNavPill />
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.duration(600)} className="items-center">
            <View className="w-24 h-24 rounded-full bg-vault-card items-center justify-center border-2 border-vault-purple mb-8">
              <Ionicons name="lock-closed" size={40} color="#8B5CF6" />
            </View>

            <Text className="text-vault-white text-2xl font-bold text-center mb-3">
              Ready to Unlock?
            </Text>

            {isReputation && (
              <View className="bg-amber-500/10 rounded-full px-3 py-1 mb-3">
                <Text className="text-amber-400 text-xs font-medium">REPUTATION CAPSULE</Text>
              </View>
            )}

            {hasCondition && (
              <View className="bg-vault-card rounded-xl p-3 mb-3 border border-vault-border">
                <Text className="text-vault-muted text-[10px] uppercase tracking-wider mb-1">
                  Verifiable Condition
                </Text>
                <Text className="text-amber-400 text-xs font-medium">
                  {capsule.condition?.type === 'price_prediction'
                    ? `${capsule.condition.asset} ${capsule.condition.comparator} $${capsule.condition.targetPrice.toLocaleString()}`
                    : 'Attached condition'}
                </Text>
              </View>
            )}

            <Text className="text-vault-muted text-base text-center leading-6 mb-2">
              &quot;{capsule.title}&quot;
            </Text>

            <Text className="text-vault-muted text-sm text-center mb-10">
              Locked since {formatUnlockDate(capsule.createdAt)}
            </Text>

            {error && (
              <View className="bg-red-900/30 rounded-xl p-4 mb-6 w-full border border-red-800">
                <Text className="text-red-400 text-sm text-center">{error}</Text>
              </View>
            )}

            <Button
              title="Unlock the Vault"
              onPress={doUnlock}
              size="lg"
              icon={<Ionicons name="lock-open" size={20} color="#FFFFFF" />}
            />
          </Animated.View>
        </View>
      </SafeScreenView>
    );
  }

  if (phase === 'unlocking') {
    return (
      <SafeScreenView className="flex-1 bg-vault-black items-center justify-center">
        <Animated.View entering={FadeIn.duration(500)} className="items-center px-8">
          <View className="w-20 h-20 rounded-full bg-vault-card items-center justify-center border border-vault-purple mb-6">
            <Ionicons name="sync" size={32} color="#8B5CF6" />
          </View>
          <Text className="text-vault-white text-xl font-bold mb-2">
            Unlocking Vault
          </Text>
          <Text className="text-vault-muted text-sm text-center">
            {hasCondition
              ? 'Decrypting prediction, verifying proof, and evaluating condition...'
              : isReputation
              ? 'Decrypting prediction and verifying commitment proof...'
              : 'Verifying on-chain timestamp and decrypting your message...'}
          </Text>
        </Animated.View>
      </SafeScreenView>
    );
  }

  const conditionResult = capsule.conditionResult;
  const conditionPassed = conditionResult === 'passed';
  const conditionFailed = conditionResult === 'failed';

  return (
    <SafeScreenView className="flex-1 bg-vault-black">
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
        >
          <Ionicons name="arrow-back" size={20} color="#E5E7EB" />
        </TouchableOpacity>
        <WalletNavPill />
        {capsule.privacyMode === 'public' && (
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
        {/* Revealed Icon */}
        <Animated.View
          entering={FadeIn.delay(200).duration(800)}
          className="items-center mt-8 mb-6"
        >
          <View
            className={`w-16 h-16 rounded-full items-center justify-center border ${
              hasCondition
                ? conditionPassed
                  ? 'bg-emerald-500/10 border-emerald-500/30'
                  : conditionFailed
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-emerald-500/10 border-emerald-500/30'
            }`}
          >
            <Ionicons
              name={hasCondition && conditionFailed ? 'close' : 'sparkles'}
              size={28}
              color={hasCondition && conditionFailed ? '#EF4444' : '#10B981'}
            />
          </View>
        </Animated.View>

        {/* Title */}
        <Animated.Text
          entering={FadeInDown.delay(400).duration(600)}
          className="text-vault-white text-3xl font-bold text-center px-8 mb-2"
        >
          {decryptedContent?.title || capsule.title}
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.delay(500).duration(600)}
          className="text-vault-muted text-sm text-center mb-4"
        >
          Created {formatUnlockDate(capsule.createdAt)}
        </Animated.Text>

        {/* Reputation Badge */}
        {isReputation && (
          <Animated.View
            entering={FadeInDown.delay(550).duration(600)}
            className="items-center mb-6"
          >
            <View className="bg-amber-500/10 rounded-full px-4 py-1.5">
              <Text className="text-amber-400 text-xs font-bold tracking-wider">REPUTATION CAPSULE</Text>
            </View>
          </Animated.View>
        )}

        {/* Message Content */}
        <Animated.View
          entering={SlideInDown.delay(700).duration(800).springify().damping(18)}
          className="mx-5 bg-vault-card rounded-2xl p-6 border border-vault-border mb-6"
        >
          <View className="flex-row items-center mb-4">
            <Ionicons
              name={isReputation ? 'telescope-outline' : 'chatbubble-outline'}
              size={16}
              color={isReputation ? '#F59E0B' : '#8B5CF6'}
            />
            <Text
              className={`text-xs font-medium ml-2 uppercase tracking-wider ${
                isReputation ? 'text-amber-400' : 'text-vault-purple'
              }`}
            >
              {isReputation ? 'Your Prediction' : 'Your Message'}
            </Text>
          </View>
          <Text className="text-vault-white text-lg leading-7">
            {decryptedContent?.message || 'Decrypting...'}
          </Text>
        </Animated.View>

        {/* Commitment Verification Card */}
        {isReputation && (
          <Animated.View
            entering={FadeInDown.delay(800).duration(600)}
            className={`mx-5 rounded-2xl p-5 border mb-6 ${
              verificationStatus === 'verified'
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : verificationStatus === 'failed'
                ? 'bg-red-500/10 border-red-500/30'
                : 'bg-vault-card border-vault-border'
            }`}
          >
            <View className="flex-row items-center mb-3">
              <Ionicons
                name={
                  verificationStatus === 'verified'
                    ? 'shield-checkmark'
                    : verificationStatus === 'failed'
                    ? 'shield-outline'
                    : 'hourglass-outline'
                }
                size={20}
                color={
                  verificationStatus === 'verified'
                    ? '#10B981'
                    : verificationStatus === 'failed'
                    ? '#EF4444'
                    : '#6B7280'
                }
              />
              <Text
                className={`text-sm font-bold ml-2 ${
                  verificationStatus === 'verified'
                    ? 'text-emerald-400'
                    : verificationStatus === 'failed'
                    ? 'text-red-400'
                    : 'text-vault-muted'
                }`}
              >
                {verificationStatus === 'verified'
                  ? 'Commitment Verified'
                  : verificationStatus === 'failed'
                  ? 'Verification Failed'
                  : 'Verifying...'}
              </Text>
            </View>
            <Text
              className={`text-xs leading-5 ${
                verificationStatus === 'verified'
                  ? 'text-emerald-400/70'
                  : verificationStatus === 'failed'
                  ? 'text-red-400/70'
                  : 'text-vault-muted'
              }`}
            >
              {verificationStatus === 'verified'
                ? 'The SHA-256 hash of your prediction matches the commitment stored at creation time. This proves you committed to this prediction before the unlock date.'
                : verificationStatus === 'failed'
                ? 'The commitment hash does not match. The prediction may have been altered or the salt is missing.'
                : 'Computing commitment hash...'}
            </Text>

            {capsule.commitmentHash && (
              <View className="mt-3 pt-3 border-t border-white/10">
                <Text className="text-vault-muted text-[10px] font-mono" numberOfLines={1}>
                  Hash: {capsule.commitmentHash}
                </Text>
              </View>
            )}
          </Animated.View>
        )}

        {/* Condition Evaluation Result */}
        {hasCondition && capsule.condition && (
          <Animated.View
            entering={FadeInDown.delay(850).duration(600)}
            className="mx-5 mb-6"
          >
            <ConditionResultCard
              condition={capsule.condition}
              conditionResult={capsule.conditionResult || 'pending'}
              evaluation={capsule.conditionEvaluation}
              delay={0}
            />
          </Animated.View>
        )}

        {/* Media (if exists) */}
        {decryptedContent?.mediaUrl && (
          <Animated.View
            entering={FadeInDown.delay(900).duration(600)}
            className="mx-5 bg-vault-card rounded-2xl p-4 border border-vault-border mb-6 items-center"
          >
            <Ionicons name="image-outline" size={40} color="#6B7280" />
            <Text className="text-vault-muted text-sm mt-2">
              Attached media
            </Text>
          </Animated.View>
        )}

        {/* Escrow / Stake Released */}
        {capsule.escrowAmount > 0 && (
          <Animated.View
            entering={FadeInUp.delay(1000).duration(600)}
            className={`mx-5 rounded-2xl p-5 border mb-6 flex-row items-center ${
              hasCondition
                ? conditionPassed
                  ? 'bg-emerald-500/10 border-emerald-500/20'
                  : conditionFailed
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-amber-500/10 border-amber-500/20'
                : isReputation
                ? 'bg-amber-500/10 border-amber-500/20'
                : 'bg-emerald-500/10 border-emerald-500/20'
            }`}
          >
            <Ionicons
              name={conditionFailed ? 'flame' : 'diamond'}
              size={24}
              color={
                hasCondition
                  ? conditionPassed ? '#10B981' : conditionFailed ? '#EF4444' : '#F59E0B'
                  : isReputation ? '#F59E0B' : '#10B981'
              }
            />
            <View className="ml-4">
              <Text
                className={`text-base font-semibold ${
                  conditionFailed ? 'text-red-400'
                  : conditionPassed ? 'text-emerald-400'
                  : isReputation ? 'text-amber-400' : 'text-emerald-400'
                }`}
              >
                {capsule.escrowAmount} SOL {conditionFailed ? 'Stake Lost' : 'Stake Released'}
              </Text>
              <Text
                className={`text-xs mt-1 ${
                  conditionFailed ? 'text-red-400/60'
                  : conditionPassed ? 'text-emerald-400/60'
                  : isReputation ? 'text-amber-400/60' : 'text-emerald-400/60'
                }`}
              >
                {conditionFailed
                  ? 'Prediction was incorrect. Stake has been forfeited.'
                  : conditionPassed
                  ? 'Prediction was correct! Stake released to your wallet.'
                  : hasCondition
                  ? 'Stake release pending condition evaluation.'
                  : isReputation
                  ? 'Reputation stake returned to your wallet'
                  : 'Escrow funds returned to your wallet'}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View
          entering={FadeInUp.delay(1100).duration(600)}
          className="mx-5 mt-4"
        >
          <Button
            title="Back to Dashboard"
            onPress={() => router.replace('/(app)/home')}
            variant="secondary"
            size="lg"
          />
        </Animated.View>
      </ScrollView>
    </SafeScreenView>
  );
}
