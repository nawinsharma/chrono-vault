import { SafeScreenView } from '@/src/components/ui/ScreenContainer';
import { WalletNavPill } from '@/src/components/ui/WalletNavPill';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { ConditionPicker } from '@/src/components/capsule/ConditionPicker';
import { Button } from '@/src/components/ui/Button';
import { Input } from '@/src/components/ui/Input';
import { uploadToIPFS } from '@/src/services/ipfs';
import { sendCreateCapsule } from '@/src/services/solana';
import { useCapsuleStore } from '@/src/stores/capsuleStore';
import { useWalletStore } from '@/src/stores/walletStore';
import type { CapsuleData, PricePredictionCondition } from '@/src/types/capsule';
import { CapsuleStatus, CapsuleType, PrivacyMode } from '@/src/types/capsule';
import { encryptData } from '@/src/utils/encryption';
import { computeCommitmentHash, generateSalt } from '@/src/utils/hash';
import { uuidv4 } from '@/src/utils/uuid';

const STAKE_CHIPS = [0.1, 0.2, 0.5, 1.0];
const DEFAULT_REPUTATION_STAKE = '0.2';

export default function CreateCapsuleScreen() {
  const router = useRouter();
  const wallet = useWalletStore();
  const capsuleStore = useCapsuleStore();

  const [capsuleType] = useState<CapsuleType>(CapsuleType.Reputation);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [unlockDate, setUnlockDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [privacyMode, setPrivacyMode] = useState<PrivacyMode>(PrivacyMode.Private);
  const [escrowAmount, setEscrowAmount] = useState(DEFAULT_REPUTATION_STAKE);
  const [step, setStep] = useState(0);
  const [condition, setCondition] = useState<PricePredictionCondition | null>(null);

  const isReputation = capsuleType === CapsuleType.Reputation;

  const stepsReal = ['Encrypting...', 'Uploading to IPFS...', 'Creating on-chain...', 'Done!'];
  const stepsDemo = ['Encrypting...', 'Saving...', 'Done!'];
  const steps = wallet.signAndSendTransaction ? stepsReal : stepsDemo;

  const handleConditionChange = useCallback((c: PricePredictionCondition | null) => {
    setCondition(c);
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      Alert.alert('Missing Title', 'Please give your capsule a title.');
      return;
    }
    if (!message.trim()) {
      Alert.alert(
        'Missing Prediction',
        'Write a prediction or belief to commit to.'
      );
      return;
    }
    if (unlockDate <= new Date()) {
      Alert.alert('Invalid Date', 'Unlock date must be in the future.');
      return;
    }
    if (!wallet.publicKey) {
      Alert.alert(
        'Wallet required',
        'Connect a Solana wallet (e.g. Phantom in your browser) to create capsules.'
      );
      return;
    }

    const escrow = parseFloat(escrowAmount) || 0;

    if (isReputation && escrow <= 0) {
      Alert.alert('Stake Required', 'Reputation capsules require a stake greater than 0 SOL.');
      return;
    }

    if (condition && condition.targetPrice <= 0) {
      Alert.alert('Invalid Target', 'Enter a valid target price for your prediction condition.');
      return;
    }

    const isDemo = !wallet.signAndSendTransaction;
    capsuleStore.setCreating(true);
    const capsuleId = await uuidv4();

    try {
      setStep(0);

      let commitmentHash: string | undefined;
      let commitmentSalt: string | undefined;

      if (isReputation) {
        commitmentSalt = await generateSalt();
        commitmentHash = await computeCommitmentHash(message.trim(), commitmentSalt);
      }

      const capsuleData: CapsuleData = {
        title: title.trim(),
        message: message.trim(),
        mediaUrl: imageUri || undefined,
        creatorWallet: wallet.publicKey,
        createdAt: Date.now(),
        ...(isReputation && {
          commitmentSalt,
          commitmentVersion: 1 as const,
        }),
      };

      const { encrypted, keyId } = await encryptData(JSON.stringify(capsuleData));
      const unlockTs = Math.floor(unlockDate.getTime() / 1000);

      const metadataBase = {
        id: capsuleId,
        title: title.trim(),
        creatorPubkey: wallet.publicKey,
        unlockTimestamp: unlockTs,
        escrowAmount: escrow,
        status: CapsuleStatus.Locked,
        privacyMode,
        createdAt: Math.floor(Date.now() / 1000),
        encryptionKeyId: keyId,
        ...(isReputation && {
          capsuleType: CapsuleType.Reputation,
          commitmentHash,
          commitmentVersion: 1 as const,
        }),
        ...(condition && {
          condition,
          conditionResult: 'pending' as const,
        }),
      };

      if (isDemo) {
        setStep(1);
        await capsuleStore.setDemoPayload(capsuleId, encrypted);
        capsuleStore.addCapsule({
          ...metadataBase,
          encryptedCid: 'demo',
          isDemo: true,
        });
        setStep(2);
      } else {
        setStep(1);
        const cid = await uploadToIPFS(encrypted);

        setStep(2);
        const txHash = await sendCreateCapsule(
          {
            creatorPubkey: wallet.publicKey,
            capsuleId,
            unlockTimestamp: unlockTs,
            encryptedCid: cid,
            escrowAmount: escrow,
          },
          wallet.signAndSendTransaction!
        );

        setStep(3);
        capsuleStore.addCapsule({
          ...metadataBase,
          encryptedCid: cid,
          transactionHash: txHash,
        });
      }

      await new Promise((r) => setTimeout(r, 600));
      capsuleStore.setCreating(false);
      router.replace(`/(app)/capsule/${capsuleId}`);
    } catch (error) {
      capsuleStore.setCreating(false);
      Alert.alert(
        'Creation Failed',
        error instanceof Error ? error.message : 'Something went wrong. Please try again.'
      );
    }
  };

  if (capsuleStore.creating) {
    return (
      <SafeScreenView className="flex-1 bg-vault-black">
        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.duration(500)} className="">
            <View className="w-20 h-20 rounded-full bg-vault-card items-center justify-center border border-vault-purple mb-8">
              <Ionicons name="hourglass" size={36} color="#8B5CF6" />
            </View>

            <Text className="text-vault-white text-xl font-bold mb-8">
              Creating Reputation Capsule
            </Text>

            {steps.map((s, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(i * 200).duration(400)}
                className="flex-row items-center mb-4 w-full"
              >
                <View className="w-8 h-8 rounded-full items-center justify-center mr-3">
                  {i < step ? (
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  ) : i === step ? (
                    <Ionicons name="ellipsis-horizontal-circle" size={24} color="#8B5CF6" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="#2A2A3E" />
                  )}
                </View>
                <Text
                  className={`text-base ${
                    i <= step ? 'text-vault-white' : 'text-vault-muted'
                  }`}
                >
                  {s}
                </Text>
              </Animated.View>
            ))}
          </Animated.View>
        </View>
      </SafeScreenView>
    );
  }

  return (
    <SafeScreenView className="flex-1 bg-vault-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 pt-4 pb-2">
          <View className="flex-row items-center flex-1">
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
            >
              <Ionicons name="arrow-back" size={20} color="#E5E7EB" />
            </TouchableOpacity>
            <Text className="text-vault-white text-lg font-semibold ml-4">
              Create Capsule
            </Text>
          </View>
          <WalletNavPill />
        </View>

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Animated.View entering={FadeInDown.duration(500)} className="mt-4">
            {/* Capsule Type */}
            <View className="mb-5">
              <Text className="text-vault-muted text-sm mb-2 font-medium">
                Capsule Type
              </Text>
              <View className="flex-row gap-3">
                <View className="flex-1 p-4 rounded-xl border items-center bg-amber-500/10 border-amber-500">
                  <Ionicons name="shield-checkmark" size={22} color="#F59E0B" />
                  <Text className="text-sm mt-2 font-medium text-amber-400">
                    Reputation
                  </Text>
                  <Text className="text-[10px] mt-1 text-amber-400/70">
                    Stake + Proof
                  </Text>
                </View>
              </View>
            </View>

            {/* Title */}
            <Input
              label="Capsule Title"
              placeholder="My 2026 prediction..."
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            {/* Message / Prediction */}
            <View className="mb-4">
              <Text className="text-vault-muted text-sm mb-2 font-medium">
                Prediction / Belief
              </Text>
              <View className="bg-vault-card rounded-xl px-4 py-3 border border-vault-border min-h-[160px]">
                <TextInput
                  placeholder="I predict that by unlock date..."
                  placeholderTextColor="#6B7280"
                  value={message}
                  onChangeText={setMessage}
                  multiline
                  numberOfLines={6}
                  className="text-vault-white text-base"
                  style={{ textAlignVertical: 'top', minHeight: 140 }}
                />
              </View>
            </View>

            {/* Price Prediction Condition */}
            <View className="mb-4">
              <Text className="text-vault-muted text-sm mb-2 font-medium">
                Verifiable Condition
              </Text>
              <ConditionPicker
                unlockDate={unlockDate}
                onChange={handleConditionChange}
              />
            </View>

            {/* Image Upload */}
            <View className="mb-4">
              <Text className="text-vault-muted text-sm mb-2 font-medium">
                Attach Image (Optional)
              </Text>
              <TouchableOpacity
                onPress={pickImage}
                className="bg-vault-card rounded-xl p-4 border border-vault-border border-dashed items-center"
              >
                {imageUri ? (
                  <View className="flex-row items-center">
                    <Ionicons name="image" size={20} color="#10B981" />
                    <Text className="text-emerald-400 text-sm ml-2">Image attached</Text>
                    <TouchableOpacity onPress={() => setImageUri(null)} className="ml-3">
                      <Ionicons name="close-circle" size={20} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="items-center py-2">
                    <Ionicons name="cloud-upload-outline" size={28} color="#6B7280" />
                    <Text className="text-vault-muted text-sm mt-2">
                      Tap to upload an image
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* Unlock Date */}
            <View className="mb-4">
              <Text className="text-vault-muted text-sm mb-2 font-medium">
                Unlock Date
              </Text>
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                className="bg-vault-card rounded-xl p-4 border border-vault-border flex-row items-center justify-between"
              >
                <View className="flex-row items-center">
                  <Ionicons name="calendar-outline" size={20} color="#8B5CF6" />
                  <Text className="text-vault-white text-base ml-3">
                    {unlockDate.toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowTimePicker(true)}
                className="bg-vault-card rounded-xl p-4 border border-vault-border flex-row items-center justify-between mt-2"
              >
                <View className="flex-row items-center">
                  <Ionicons name="time-outline" size={20} color="#8B5CF6" />
                  <Text className="text-vault-white text-base ml-3">
                    {unlockDate.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#6B7280" />
              </TouchableOpacity>

              {showDatePicker && (
                <DateTimePicker
                  value={unlockDate}
                  mode="date"
                  minimumDate={new Date()}
                  onChange={(_, date) => {
                    setShowDatePicker(false);
                    if (date) setUnlockDate(date);
                  }}
                  themeVariant="dark"
                />
              )}
              {showTimePicker && (
                <DateTimePicker
                  value={unlockDate}
                  mode="time"
                  onChange={(_, date) => {
                    setShowTimePicker(false);
                    if (date) setUnlockDate(date);
                  }}
                  themeVariant="dark"
                />
              )}
            </View>

            {/* Privacy Mode */}
            <View className="mb-4">
              <Text className="text-vault-muted text-sm mb-2 font-medium">
                Privacy Mode
              </Text>
              <View className="flex-row gap-3">
                {[PrivacyMode.Private, PrivacyMode.Public].map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    onPress={() => setPrivacyMode(mode)}
                    className={`flex-1 p-4 rounded-xl border items-center ${
                      privacyMode === mode
                        ? 'bg-vault-card border-vault-purple'
                        : 'bg-vault-dark border-vault-border'
                    }`}
                  >
                    <Ionicons
                      name={mode === PrivacyMode.Private ? 'lock-closed' : 'globe-outline'}
                      size={22}
                      color={privacyMode === mode ? '#8B5CF6' : '#6B7280'}
                    />
                    <Text
                      className={`text-sm mt-2 font-medium capitalize ${
                        privacyMode === mode ? 'text-vault-white' : 'text-vault-muted'
                      }`}
                    >
                      {mode}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Stake / Escrow */}
            <View className="mb-4">
              <Text className="text-vault-muted text-sm mb-2 font-medium">
                Stake Amount (SOL)
              </Text>
              <View className="bg-vault-card rounded-xl px-4 py-3 border border-amber-500/40">
                <TextInput
                  placeholder="0.2"
                  placeholderTextColor="#6B7280"
                  value={escrowAmount}
                  onChangeText={setEscrowAmount}
                  keyboardType="decimal-pad"
                  className="text-vault-white text-lg font-semibold"
                />
              </View>
              <View className="flex-row gap-2 mt-2">
                {STAKE_CHIPS.map((chip) => (
                  <TouchableOpacity
                    key={chip}
                    onPress={() => setEscrowAmount(String(chip))}
                    className={`flex-1 py-2 rounded-lg items-center border ${
                      escrowAmount === String(chip)
                        ? 'bg-amber-500/20 border-amber-500'
                        : 'bg-vault-dark border-vault-border'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        escrowAmount === String(chip) ? 'text-amber-400' : 'text-vault-muted'
                      }`}
                    >
                      {chip} SOL
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text className="text-vault-muted text-xs mt-2">
                {condition
                  ? 'Stake is locked until condition is evaluated at unlock time'
                  : 'Stake is locked until the capsule is unlocked'}
              </Text>
            </View>

            {/* Create Button */}
            <View className="mt-6">
              <Button
                title={condition ? 'Commit Verifiable Prediction' : 'Commit Prediction'}
                onPress={handleCreate}
                size="lg"
                icon={<Ionicons name="shield-checkmark" size={20} color="#FFFFFF" />}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeScreenView>
  );
}
