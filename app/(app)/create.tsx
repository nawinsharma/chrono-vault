import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';

import { Input } from '@/src/components/ui/Input';
import { Button } from '@/src/components/ui/Button';
import { useWalletStore } from '@/src/stores/walletStore';
import { useCapsuleStore } from '@/src/stores/capsuleStore';
import { encryptData } from '@/src/utils/encryption';
import { uploadToIPFS } from '@/src/services/ipfs';
import { sendCreateCapsule } from '@/src/services/solana';
import { PrivacyMode, CapsuleStatus } from '@/src/types/capsule';
import type { CapsuleData } from '@/src/types/capsule';

export default function CreateCapsuleScreen() {
  const router = useRouter();
  const wallet = useWalletStore();
  const capsuleStore = useCapsuleStore();

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
  const [escrowAmount, setEscrowAmount] = useState('');
  const [step, setStep] = useState(0);

  const steps = ['Encrypting...', 'Uploading to IPFS...', 'Creating on-chain...', 'Done!'];

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
      Alert.alert('Missing Message', 'Write a message for your future self.');
      return;
    }
    if (unlockDate <= new Date()) {
      Alert.alert('Invalid Date', 'Unlock date must be in the future.');
      return;
    }
    if (!wallet.publicKey || !wallet.signAndSendTransaction) {
      Alert.alert(
        'Wallet required',
        'Connect a Solana wallet (e.g. Phantom in your browser) to create capsules.'
      );
      return;
    }

    capsuleStore.setCreating(true);
    const capsuleId = uuidv4();

    try {
      // Step 1: Encrypt
      setStep(0);
      const capsuleData: CapsuleData = {
        title: title.trim(),
        message: message.trim(),
        mediaUrl: imageUri || undefined,
        creatorWallet: wallet.publicKey,
        createdAt: Date.now(),
      };

      const { encrypted, keyId } = await encryptData(JSON.stringify(capsuleData));

      // Step 2: Upload to IPFS
      setStep(1);
      const cid = await uploadToIPFS(encrypted);

      // Step 3: Create on-chain (real transaction)
      setStep(2);
      const escrow = parseFloat(escrowAmount) || 0;
      const txHash = await sendCreateCapsule(
        {
          creatorPubkey: wallet.publicKey,
          capsuleId,
          unlockTimestamp: Math.floor(unlockDate.getTime() / 1000),
          encryptedCid: cid,
          escrowAmount: escrow,
        },
        wallet.signAndSendTransaction
      );

      // Step 4: Save locally
      setStep(3);
      capsuleStore.addCapsule({
        id: capsuleId,
        title: title.trim(),
        creatorPubkey: wallet.publicKey,
        unlockTimestamp: Math.floor(unlockDate.getTime() / 1000),
        encryptedCid: cid,
        escrowAmount: escrow,
        status: CapsuleStatus.Locked,
        privacyMode,
        createdAt: Math.floor(Date.now() / 1000),
        transactionHash: txHash,
        encryptionKeyId: keyId,
      });

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
      <SafeAreaView className="flex-1 bg-vault-black">
        <View className="flex-1 items-center justify-center px-8">
          <Animated.View entering={FadeIn.duration(500)} className="items-center">
            <View className="w-20 h-20 rounded-full bg-vault-card items-center justify-center border border-vault-purple mb-8">
              <Ionicons name="hourglass" size={36} color="#8B5CF6" />
            </View>

            <Text className="text-vault-white text-xl font-bold mb-8">
              Creating Capsule
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-vault-black">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <View className="flex-row items-center px-5 pt-4 pb-2">
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

        <ScrollView
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          <Animated.View entering={FadeInDown.duration(500)} className="mt-4">
            {/* Title */}
            <Input
              label="Capsule Title"
              placeholder="A letter to future me..."
              value={title}
              onChangeText={setTitle}
              maxLength={80}
            />

            {/* Message */}
            <View className="mb-4">
              <Text className="text-vault-muted text-sm mb-2 font-medium">
                Your Message
              </Text>
              <View className="bg-vault-card rounded-xl px-4 py-3 border border-vault-border min-h-[160px]">
                <TextInput
                  placeholder="Write something meaningful for your future self..."
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

            {/* Escrow Amount */}
            <Input
              label="Lock SOL (Optional)"
              placeholder="0.00"
              value={escrowAmount}
              onChangeText={setEscrowAmount}
              keyboardType="decimal-pad"
              hint="SOL will be locked until the capsule is unlocked"
            />

            {/* Create Button */}
            <View className="mt-6">
              <Button
                title="Lock Capsule in Time"
                onPress={handleCreate}
                size="lg"
                icon={<Ionicons name="lock-closed" size={20} color="#FFFFFF" />}
              />
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
