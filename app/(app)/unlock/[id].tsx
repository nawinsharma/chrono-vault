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
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCapsuleStore } from '@/src/stores/capsuleStore';
import { useWalletStore } from '@/src/stores/walletStore';
import { VaultUnlock } from '@/src/components/animations/VaultUnlock';
import { Button } from '@/src/components/ui/Button';
import { CapsuleStatus } from '@/src/types/capsule';
import type { DecryptedCapsule } from '@/src/types/capsule';
import { decryptData } from '@/src/utils/encryption';
import { fetchFromIPFS } from '@/src/services/ipfs';
import { sendUnlockCapsule } from '@/src/services/solana';
import { formatUnlockDate } from '@/src/utils/time';

type Phase = 'confirm' | 'unlocking' | 'animating' | 'revealed';

export default function UnlockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const capsule = useCapsuleStore((s) => s.getCapsuleById(id));
  const updateStatus = useCapsuleStore((s) => s.updateCapsuleStatus);
  const wallet = useWalletStore();

  const [phase, setPhase] = useState<Phase>(
    capsule?.status === CapsuleStatus.Unlocked ? 'revealed' : 'confirm'
  );
  const [decryptedContent, setDecryptedContent] = useState<DecryptedCapsule | null>(null);
  const [error, setError] = useState<string | null>(null);

  const doUnlock = useCallback(async () => {
    if (!capsule) return;
    if (!wallet.publicKey || !wallet.signAndSendTransaction) {
      setError('Connect a Solana wallet (e.g. Phantom) to unlock this capsule.');
      return;
    }

    setPhase('unlocking');
    setError(null);

    try {
      // Step 1: Send unlock transaction (on-chain)
      await sendUnlockCapsule(
        { creatorPubkey: wallet.publicKey, capsuleId: capsule.id },
        wallet.signAndSendTransaction
      );

      // Step 2: Fetch from IPFS
      const encryptedPayload = await fetchFromIPFS(capsule.encryptedCid);

      // Step 3: Decrypt
      const decrypted = await decryptData(encryptedPayload, capsule.encryptionKeyId);
      const content = JSON.parse(decrypted) as DecryptedCapsule;

      // Step 4: Update status
      updateStatus(capsule.id, CapsuleStatus.Unlocked);
      setDecryptedContent(content);

      // Phase: Show cinematic animation
      setPhase('animating');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlock capsule');
      setPhase('confirm');
    }
  }, [capsule, wallet.publicKey, wallet.signAndSendTransaction, updateStatus]);

  useEffect(() => {
    if (phase === 'revealed' && !decryptedContent && capsule) {
      (async () => {
        try {
          const encryptedPayload = await fetchFromIPFS(capsule.encryptedCid);
          const decrypted = await decryptData(encryptedPayload, capsule.encryptionKeyId);
          setDecryptedContent(JSON.parse(decrypted));
        } catch {
          setDecryptedContent({
            title: capsule.title,
            message: 'Content could not be decrypted. The encryption key may have been lost.',
            creatorWallet: capsule.creatorPubkey,
            createdAt: capsule.createdAt * 1000,
          });
        }
      })();
    }
  }, [phase, decryptedContent, capsule]);

  if (!capsule) {
    return (
      <SafeAreaView className="flex-1 bg-vault-black items-center justify-center">
        <Text className="text-vault-muted">Capsule not found</Text>
      </SafeAreaView>
    );
  }

  // Phase: Cinematic vault open animation
  if (phase === 'animating') {
    return <VaultUnlock onComplete={() => setPhase('revealed')} />;
  }

  // Phase: Confirm unlock
  if (phase === 'confirm') {
    return (
      <SafeAreaView className="flex-1 bg-vault-black">
        <View className="flex-row items-center px-5 pt-4 pb-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
          >
            <Ionicons name="arrow-back" size={20} color="#E5E7EB" />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.duration(600)} className="items-center">
            <View className="w-24 h-24 rounded-full bg-vault-card items-center justify-center border-2 border-vault-purple mb-8">
              <Ionicons name="lock-closed" size={40} color="#8B5CF6" />
            </View>

            <Text className="text-vault-white text-2xl font-bold text-center mb-3">
              Ready to Unlock?
            </Text>

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
      </SafeAreaView>
    );
  }

  // Phase: Unlocking in progress
  if (phase === 'unlocking') {
    return (
      <SafeAreaView className="flex-1 bg-vault-black items-center justify-center">
        <Animated.View entering={FadeIn.duration(500)} className="items-center px-8">
          <View className="w-20 h-20 rounded-full bg-vault-card items-center justify-center border border-vault-purple mb-6">
            <Ionicons name="sync" size={32} color="#8B5CF6" />
          </View>
          <Text className="text-vault-white text-xl font-bold mb-2">
            Unlocking Vault
          </Text>
          <Text className="text-vault-muted text-sm text-center">
            Verifying on-chain timestamp and decrypting your message...
          </Text>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // Phase: Revealed content
  return (
    <SafeAreaView className="flex-1 bg-vault-black">
      <View className="flex-row items-center px-5 pt-4 pb-2">
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
        >
          <Ionicons name="arrow-back" size={20} color="#E5E7EB" />
        </TouchableOpacity>
        <View className="flex-1" />
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
          <View className="w-16 h-16 rounded-full bg-emerald-500/10 items-center justify-center border border-emerald-500/30">
            <Ionicons name="sparkles" size={28} color="#10B981" />
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
          className="text-vault-muted text-sm text-center mb-10"
        >
          Created {formatUnlockDate(capsule.createdAt)}
        </Animated.Text>

        {/* Message Content */}
        <Animated.View
          entering={SlideInDown.delay(700).duration(800).springify().damping(18)}
          className="mx-5 bg-vault-card rounded-2xl p-6 border border-vault-border mb-6"
        >
          <View className="flex-row items-center mb-4">
            <Ionicons name="chatbubble-outline" size={16} color="#8B5CF6" />
            <Text className="text-vault-purple text-xs font-medium ml-2 uppercase tracking-wider">
              Your Message
            </Text>
          </View>
          <Text className="text-vault-white text-lg leading-7">
            {decryptedContent?.message || 'Decrypting...'}
          </Text>
        </Animated.View>

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

        {/* Escrow Released */}
        {capsule.escrowAmount > 0 && (
          <Animated.View
            entering={FadeInUp.delay(1000).duration(600)}
            className="mx-5 bg-emerald-500/10 rounded-2xl p-5 border border-emerald-500/20 mb-6 flex-row items-center"
          >
            <Ionicons name="diamond" size={24} color="#10B981" />
            <View className="ml-4">
              <Text className="text-emerald-400 text-base font-semibold">
                {capsule.escrowAmount} SOL Released
              </Text>
              <Text className="text-emerald-400/60 text-xs mt-1">
                Escrow funds returned to your wallet
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
    </SafeAreaView>
  );
}
