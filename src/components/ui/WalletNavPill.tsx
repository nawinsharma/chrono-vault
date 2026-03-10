import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWalletStore } from '@/src/stores/walletStore';
import { truncateAddress } from '@/src/utils/format';
import { useRouter } from 'expo-router';

/** Compact wallet pill for top navbar – shows connected address (demo looks like real). */
export function WalletNavPill() {
  const router = useRouter();
  const wallet = useWalletStore();

  if (!wallet.connected) {
    return (
      <TouchableOpacity
        onPress={() => router.push('/connect')}
        className="bg-vault-card px-3 py-2 rounded-full border border-vault-border flex-row items-center"
      >
        <Ionicons name="wallet-outline" size={14} color="#8B5CF6" />
        <Text className="text-vault-purple text-xs font-medium ml-1.5">
          Connect
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View className="flex-row items-center bg-vault-card rounded-full pl-2.5 pr-2 py-1.5 border border-vault-border">
      <View className="w-5 h-5 rounded-full bg-vault-purple/20 items-center justify-center mr-1.5">
        <Ionicons name="wallet" size={12} color="#8B5CF6" />
      </View>
      <Text className="text-vault-white text-xs font-medium font-mono">
        {truncateAddress(wallet.getDisplayAddress())}
      </Text>
    </View>
  );
}
