import React, { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useCapsuleStore } from '@/src/stores/capsuleStore';
import { useWalletStore } from '@/src/stores/walletStore';
import { CapsuleCard } from '@/src/components/capsule/CapsuleCard';
import { EmptyState } from '@/src/components/capsule/EmptyState';
import { Button } from '@/src/components/ui/Button';
import { truncateAddress } from '@/src/utils/format';
import { CapsuleStatus, CapsuleMetadata } from '@/src/types/capsule';
import { SafeAreaView } from 'react-native-safe-area-context';

type TabId = 'active' | 'unlocked';

export default function HomeScreen() {
  const router = useRouter();
  const wallet = useWalletStore();
  const capsuleStore = useCapsuleStore();
  const [activeTab, setActiveTab] = React.useState<TabId>('active');
  const [refreshing, setRefreshing] = React.useState(false);

  const activeCapsules = useMemo(
    () => capsuleStore.capsules.filter((c) => c.status === CapsuleStatus.Locked),
    [capsuleStore.capsules]
  );

  const unlockedCapsules = useMemo(
    () => capsuleStore.capsules.filter((c) => c.status === CapsuleStatus.Unlocked),
    [capsuleStore.capsules]
  );

  const currentCapsules = activeTab === 'active' ? activeCapsules : unlockedCapsules;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const renderCapsule = useCallback(
    ({ item, index }: { item: CapsuleMetadata; index: number }) => (
      <CapsuleCard
        capsule={item}
        index={index}
        onPress={() => {
          if (item.status === CapsuleStatus.Unlocked) {
            router.push(`/(app)/capsule/${item.id}`);
          } else {
            router.push(`/(app)/capsule/${item.id}`);
          }
        }}
      />
    ),
    [router]
  );

  return (
    <SafeAreaView className="flex-1 bg-vault-black">
      <View className="flex-1 px-5">
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(500)}
          className="flex-row items-center justify-between pt-4 pb-6"
        >
          <View>
            <Text className="text-vault-white text-2xl font-bold">
              ChronoVault
            </Text>
            {wallet.connected && (
              <Text className="text-vault-muted text-xs mt-1">
                {truncateAddress(wallet.publicKey || '')}
              </Text>
            )}
          </View>

          <View className="flex-row items-center gap-3">
            {!wallet.connected && (
              <TouchableOpacity
                onPress={() => router.push('/connect')}
                className="bg-vault-card px-4 py-2 rounded-full border border-vault-border flex-row items-center"
              >
                <Ionicons name="wallet-outline" size={16} color="#8B5CF6" />
                <Text className="text-vault-purple text-xs font-medium ml-1.5">
                  Connect
                </Text>
              </TouchableOpacity>
            )}
            {wallet.connected && (
              <TouchableOpacity
                onPress={() => {
                  wallet.disconnect();
                  router.replace('/connect');
                }}
                className="bg-vault-card w-10 h-10 rounded-full items-center justify-center border border-vault-border"
              >
                <Ionicons name="log-out-outline" size={18} color="#6B7280" />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          className="flex-row gap-3 mb-6"
        >
          <View className="flex-1 bg-vault-card rounded-2xl p-4 border border-vault-border">
            <Text className="text-vault-muted text-xs uppercase tracking-wider">
              Active
            </Text>
            <Text className="text-vault-white text-2xl font-bold mt-1">
              {activeCapsules.length}
            </Text>
          </View>
          <View className="flex-1 bg-vault-card rounded-2xl p-4 border border-vault-border">
            <Text className="text-vault-muted text-xs uppercase tracking-wider">
              Unlocked
            </Text>
            <Text className="text-vault-white text-2xl font-bold mt-1">
              {unlockedCapsules.length}
            </Text>
          </View>
          <View className="flex-1 bg-vault-card rounded-2xl p-4 border border-vault-border">
            <Text className="text-vault-muted text-xs uppercase tracking-wider">
              SOL Locked
            </Text>
            <Text className="text-vault-white text-2xl font-bold mt-1">
              {capsuleStore.capsules
                .filter((c) => c.status === CapsuleStatus.Locked)
                .reduce((sum, c) => sum + c.escrowAmount, 0)
                .toFixed(1)}
            </Text>
          </View>
        </Animated.View>

        {/* Tabs */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          className="flex-row mb-4 bg-vault-dark rounded-xl p-1"
        >
          {(['active', 'unlocked'] as TabId[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 rounded-lg items-center ${
                activeTab === tab ? 'bg-vault-card' : ''
              }`}
            >
              <Text
                className={`text-sm font-medium capitalize ${
                  activeTab === tab ? 'text-vault-white' : 'text-vault-muted'
                }`}
              >
                {tab === 'active' ? 'Active' : 'Unlocked'}
              </Text>
            </TouchableOpacity>
          ))}
        </Animated.View>

        {/* Capsule List */}
        <FlatList
          data={currentCapsules}
          renderItem={renderCapsule}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100, flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#8B5CF6"
            />
          }
          ListEmptyComponent={
            activeTab === 'active' ? (
              <EmptyState
                title="No Active Capsules"
                description="Create your first time capsule and send a message to your future self."
                icon="cube-outline"
              />
            ) : (
              <EmptyState
                title="No Unlocked Capsules"
                description="Your unlocked capsules will appear here when the time arrives."
                icon="lock-open-outline"
              />
            )
          }
        />

        {/* Create Button */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          className="absolute bottom-6 left-5 right-5"
        >
          <Button
            title="Create Capsule"
            onPress={() => router.push('/(app)/create')}
            size="lg"
            icon={<Ionicons name="add-circle-outline" size={22} color="#FFFFFF" />}
          />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}
