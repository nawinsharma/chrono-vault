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
import { CapsuleStatus, CapsuleMetadata, CapsuleType } from '@/src/types/capsule';
import { SafeScreenView } from '@/src/components/ui/ScreenContainer';

type TabId = 'active' | 'unlocked' | 'reputation';

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

  const reputationCapsules = useMemo(
    () => capsuleStore.capsules.filter((c) => c.capsuleType === CapsuleType.Reputation),
    [capsuleStore.capsules]
  );

  const repStats = useMemo(() => {
    const rep = reputationCapsules;
    const passed = rep.filter((c) => c.conditionResult === 'passed').length;
    const failed = rep.filter((c) => c.conditionResult === 'failed').length;
    const pending = rep.filter((c) => !c.conditionResult || c.conditionResult === 'pending').length;
    const total = rep.length;
    const rate = total > 0 && (passed + failed) > 0
      ? Math.round((passed / (passed + failed)) * 100)
      : null;
    return { passed, failed, pending, total, rate };
  }, [reputationCapsules]);

  const currentCapsules =
    activeTab === 'active'
      ? activeCapsules
      : activeTab === 'unlocked'
      ? unlockedCapsules
      : reputationCapsules;

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
          router.push(`/(app)/capsule/${item.id}`);
        }}
      />
    ),
    [router]
  );

  return (
    <SafeScreenView className="flex-1 bg-vault-black">
      <View className="flex-1 px-5">
        {/* Header / Navbar */}
        <Animated.View
          entering={FadeIn.duration(500)}
          className="flex-row items-center justify-between pt-4 pb-6"
        >
          <Text className="text-vault-white text-2xl font-bold">
            ChronoVault
          </Text>

          <View className="flex-row items-center gap-2">
            {wallet.connected ? (
              <>
                <View className="flex-row items-center bg-vault-card rounded-full pl-3 pr-2 py-2 border border-vault-border">
                  <View className="w-6 h-6 rounded-full bg-vault-purple/20 items-center justify-center mr-2">
                    <Ionicons name="wallet" size={14} color="#8B5CF6" />
                  </View>
                  <Text className="text-vault-white text-xs font-medium font-mono">
                    {truncateAddress(wallet.getDisplayAddress())}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    wallet.disconnect();
                    router.replace('/connect');
                  }}
                  className="w-10 h-10 rounded-full bg-vault-card items-center justify-center border border-vault-border"
                >
                  <Ionicons name="log-out-outline" size={18} color="#6B7280" />
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={() => router.push('/connect')}
                className="bg-vault-card px-4 py-2.5 rounded-full border border-vault-border flex-row items-center"
              >
                <Ionicons name="wallet-outline" size={16} color="#8B5CF6" />
                <Text className="text-vault-purple text-xs font-medium ml-1.5">
                  Connect
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          entering={FadeInDown.delay(200).duration(500)}
          className="flex-row gap-3 mb-3"
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
              SOL Staked
            </Text>
            <Text className="text-vault-white text-2xl font-bold mt-1">
              {capsuleStore.capsules
                .filter(
                  (c) =>
                    c.status === CapsuleStatus.Locked &&
                    c.capsuleType === CapsuleType.Reputation
                )
                .reduce((sum, c) => sum + c.escrowAmount, 0)
                .toFixed(1)}
            </Text>
          </View>
        </Animated.View>

        {/* Reputation Stats */}
        {repStats.total > 0 && (
          <Animated.View
            entering={FadeInDown.delay(250).duration(500)}
            className="bg-vault-card rounded-2xl p-4 border border-vault-border mb-6"
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="analytics" size={16} color="#F59E0B" />
                <Text className="text-amber-400 text-xs font-bold ml-2">Prediction Record</Text>
              </View>
              {repStats.rate != null && (
                <View className="bg-vault-dark rounded-full px-2.5 py-1">
                  <Text className={`text-xs font-bold ${repStats.rate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {repStats.rate}% accuracy
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-row mt-3 gap-4">
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5" />
                <Text className="text-vault-muted text-xs">
                  <Text className="text-emerald-400 font-bold">{repStats.passed}</Text> Passed
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-red-400 mr-1.5" />
                <Text className="text-vault-muted text-xs">
                  <Text className="text-red-400 font-bold">{repStats.failed}</Text> Failed
                </Text>
              </View>
              <View className="flex-row items-center">
                <View className="w-2 h-2 rounded-full bg-gray-500 mr-1.5" />
                <Text className="text-vault-muted text-xs">
                  <Text className="text-vault-text font-bold">{repStats.pending}</Text> Pending
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        {/* Tabs */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(500)}
          className="flex-row mb-4 bg-vault-dark rounded-xl p-1"
        >
          {(['active', 'unlocked', 'reputation'] as TabId[]).map((tab) => (
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
                {tab === 'active'
                  ? 'Active'
                  : tab === 'unlocked'
                  ? 'Unlocked'
                  : 'Reputation'}
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
            ) : activeTab === 'unlocked' ? (
              <EmptyState
                title="No Unlocked Capsules"
                description="Your unlocked capsules will appear here when the time arrives."
                icon="lock-open-outline"
              />
            ) : (
              <EmptyState
                title="No Reputation Capsules"
                description="Commit a verifiable price prediction with SOL stake to build your on-chain reputation."
                icon="shield-checkmark-outline"
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
    </SafeScreenView>
  );
}
