import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type { SupportedAsset, ConditionComparator, PricePredictionCondition } from '@/src/types/capsule';
import { SUPPORTED_ASSETS } from '@/src/types/capsule';
import { fetchCurrentPrice } from '@/src/services/priceApi';
import { PriceChart } from '@/src/components/charts/PriceChart';

interface ConditionPickerProps {
  unlockDate: Date;
  onChange: (condition: PricePredictionCondition | null) => void;
}

const COMPARATORS: { id: ConditionComparator; label: string; symbol: string }[] = [
  { id: '>', label: 'Above', symbol: '>' },
  { id: '>=', label: 'At or Above', symbol: '>=' },
  { id: '<', label: 'Below', symbol: '<' },
  { id: '<=', label: 'At or Below', symbol: '<=' },
];

export function ConditionPicker({ unlockDate, onChange }: ConditionPickerProps) {
  const [enabled, setEnabled] = useState(false);
  const [asset, setAsset] = useState<SupportedAsset>('SOL');
  const [comparator, setComparator] = useState<ConditionComparator>('>');
  const [targetPrice, setTargetPrice] = useState('');
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoadingPrice(true);
    fetchCurrentPrice(asset)
      .then((result) => {
        if (!cancelled) setCurrentPrice(result.price);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoadingPrice(false);
      });
    return () => { cancelled = true; };
  }, [asset, enabled]);

  useEffect(() => {
    if (!enabled) {
      onChange(null);
      return;
    }
    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      onChange(null);
      return;
    }
    onChange({
      type: 'price_prediction',
      asset,
      comparator,
      targetPrice: price,
      evaluationTimestamp: Math.floor(unlockDate.getTime() / 1000),
      currency: 'USD',
    });
  }, [enabled, asset, comparator, targetPrice, unlockDate, onChange]);

  if (!enabled) {
    return (
      <Animated.View entering={FadeInDown.duration(400)}>
        <TouchableOpacity
          onPress={() => setEnabled(true)}
          className="bg-vault-dark rounded-2xl p-5 border border-dashed border-vault-border items-center"
        >
          <View className="w-12 h-12 rounded-full bg-vault-card items-center justify-center border border-vault-border mb-3">
            <Ionicons name="analytics-outline" size={24} color="#F59E0B" />
          </View>
          <Text className="text-vault-white text-sm font-semibold mb-1">
            Add Price Prediction
          </Text>
          <Text className="text-vault-muted text-xs text-center">
            Attach a verifiable price condition to your prediction capsule
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(400)} className="bg-vault-card rounded-2xl p-5 border border-amber-500/30">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center">
          <Ionicons name="analytics" size={18} color="#F59E0B" />
          <Text className="text-amber-400 text-sm font-bold ml-2">Price Prediction</Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setEnabled(false);
            setTargetPrice('');
          }}
        >
          <Ionicons name="close-circle" size={22} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <Text className="text-vault-muted text-xs mb-2 font-medium">Asset</Text>
      <View className="flex-row gap-2 mb-4">
        {SUPPORTED_ASSETS.map((a) => (
          <TouchableOpacity
            key={a.id}
            onPress={() => setAsset(a.id)}
            className={`flex-1 py-2.5 rounded-xl items-center border ${
              asset === a.id
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-vault-border bg-vault-dark'
            }`}
          >
            <Text
              className={`text-xs font-bold ${asset === a.id ? 'text-amber-400' : 'text-vault-muted'}`}
            >
              {a.id}
            </Text>
            <Text className="text-vault-muted text-[9px] mt-0.5">{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {currentPrice != null && (
        <View className="bg-vault-dark rounded-xl p-3 mb-4">
          <Text className="text-vault-muted text-[10px] uppercase tracking-wider mb-1">Current Price</Text>
          <Text className="text-vault-white text-lg font-bold font-mono">
            ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </Text>
        </View>
      )}
      {loadingPrice && currentPrice == null && (
        <View className="bg-vault-dark rounded-xl p-3 mb-4">
          <Text className="text-vault-muted text-xs">Loading current price...</Text>
        </View>
      )}

      <Text className="text-vault-muted text-xs mb-2 font-medium">Condition</Text>
      <View className="flex-row gap-2 mb-4">
        {COMPARATORS.map((c) => (
          <TouchableOpacity
            key={c.id}
            onPress={() => setComparator(c.id)}
            className={`flex-1 py-2.5 rounded-xl items-center border ${
              comparator === c.id
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-vault-border bg-vault-dark'
            }`}
          >
            <Text
              className={`text-sm font-bold font-mono ${
                comparator === c.id ? 'text-amber-400' : 'text-vault-muted'
              }`}
            >
              {c.symbol}
            </Text>
            <Text className="text-vault-muted text-[9px] mt-0.5">{c.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text className="text-vault-muted text-xs mb-2 font-medium">Target Price (USD)</Text>
      <View className="bg-vault-dark rounded-xl px-4 py-3 border border-vault-border mb-4 flex-row items-center">
        <Text className="text-vault-muted text-lg mr-1">$</Text>
        <TextInput
          placeholder="200"
          placeholderTextColor="#6B7280"
          value={targetPrice}
          onChangeText={setTargetPrice}
          keyboardType="decimal-pad"
          className="text-vault-white text-lg font-semibold font-mono flex-1"
        />
      </View>

      {targetPrice && parseFloat(targetPrice) > 0 && (
        <View className="bg-amber-500/5 rounded-xl p-3 mb-4 border border-amber-500/10">
          <Text className="text-amber-400/80 text-xs leading-5">
            Prediction: {asset} price will be{' '}
            <Text className="font-bold">
              {COMPARATORS.find((c) => c.id === comparator)?.label.toLowerCase()}{' '}
              ${parseFloat(targetPrice).toLocaleString('en-US', { maximumFractionDigits: 2 })} USD
            </Text>{' '}
            by{' '}
            <Text className="font-bold">
              {unlockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </Text>
          </Text>
        </View>
      )}

      <PriceChart
        asset={asset}
        targetPrice={parseFloat(targetPrice) > 0 ? parseFloat(targetPrice) : undefined}
        compact
        height={80}
      />

      <View className="mt-3 flex-row items-center">
        <Ionicons name="time-outline" size={12} color="#6B7280" />
        <Text className="text-vault-muted text-[10px] ml-1">
          Evaluated at unlock: {unlockDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Animated.View>
  );
}
