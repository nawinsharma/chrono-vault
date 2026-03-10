import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import type {
  CapsuleCondition,
  ConditionResult,
  ConditionEvaluationResult,
  PricePredictionCondition,
} from '@/src/types/capsule';
import { SUPPORTED_ASSETS } from '@/src/types/capsule';
import { PriceChart } from '@/src/components/charts/PriceChart';

interface ConditionResultCardProps {
  condition: CapsuleCondition;
  conditionResult: ConditionResult;
  evaluation?: ConditionEvaluationResult;
  delay?: number;
}

function PricePredictionResult({
  condition,
  conditionResult,
  evaluation,
}: {
  condition: PricePredictionCondition;
  conditionResult: ConditionResult;
  evaluation?: ConditionEvaluationResult;
}) {
  const assetInfo = SUPPORTED_ASSETS.find((a) => a.id === condition.asset);
  const isPending = conditionResult === 'pending';
  const isPassed = conditionResult === 'passed';
  const isFailed = conditionResult === 'failed';

  const evalDate = new Date(condition.evaluationTimestamp * 1000);
  const evalDateStr = evalDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View>
      <View className="flex-row items-center mb-4">
        <View
          className={`w-10 h-10 rounded-full items-center justify-center ${
            isPending ? 'bg-vault-dark' : isPassed ? 'bg-emerald-500/20' : 'bg-red-500/20'
          }`}
        >
          <Ionicons
            name={isPending ? 'hourglass-outline' : isPassed ? 'checkmark-circle' : 'close-circle'}
            size={22}
            color={isPending ? '#6B7280' : isPassed ? '#10B981' : '#EF4444'}
          />
        </View>
        <View className="ml-3 flex-1">
          <Text
            className={`text-sm font-bold ${
              isPending ? 'text-vault-muted' : isPassed ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {isPending
              ? 'Prediction Pending'
              : isPassed
              ? 'Prediction Correct'
              : 'Prediction Incorrect'}
          </Text>
          <Text className="text-vault-muted text-[10px] mt-0.5">
            {isPending ? `Evaluates on ${evalDateStr}` : `Evaluated via ${evaluation?.source || 'CoinGecko'}`}
          </Text>
        </View>
      </View>

      <View className={`rounded-xl p-4 mb-4 ${
        isPending ? 'bg-vault-dark/50' : isPassed ? 'bg-emerald-500/5' : 'bg-red-500/5'
      }`}>
        <Text className="text-vault-muted text-[10px] uppercase tracking-wider mb-2">
          Condition
        </Text>
        <View className="flex-row items-center flex-wrap">
          <View className="rounded-md px-2 py-1 mr-1.5 mb-1" style={{ backgroundColor: `${assetInfo?.color || '#8B5CF6'}20` }}>
            <Text className="text-xs font-bold" style={{ color: assetInfo?.color || '#8B5CF6' }}>
              {condition.asset}
            </Text>
          </View>
          <Text className="text-vault-text text-xs mr-1.5 mb-1">price</Text>
          <View className="bg-vault-card rounded-md px-2 py-1 mr-1.5 mb-1 border border-vault-border">
            <Text className="text-vault-white text-xs font-mono font-bold">{condition.comparator}</Text>
          </View>
          <View className="bg-amber-500/20 rounded-md px-2 py-1 mb-1">
            <Text className="text-amber-400 text-xs font-bold font-mono">
              ${condition.targetPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {evaluation && !isPending && (
          <View className="mt-3 pt-3 border-t border-white/5">
            <View className="flex-row items-center justify-between">
              <Text className="text-vault-muted text-[10px] uppercase tracking-wider">
                Actual Price
              </Text>
              <Text className={`text-sm font-bold font-mono ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
                ${evaluation.fetchedPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </Text>
            </View>
            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-vault-muted text-[10px] uppercase tracking-wider">
                Expression
              </Text>
              <View className="flex-row items-center">
                <Text className="text-vault-text text-xs font-mono">{evaluation.expression}</Text>
                <Ionicons
                  name={isPassed ? 'checkmark' : 'close'}
                  size={12}
                  color={isPassed ? '#10B981' : '#EF4444'}
                  style={{ marginLeft: 4 }}
                />
              </View>
            </View>
          </View>
        )}
      </View>

      <PriceChart
        asset={condition.asset}
        targetPrice={condition.targetPrice}
        compact={isPending}
        height={isPending ? 80 : 140}
      />

      {!isPending && (
        <View
          className={`mt-4 rounded-xl p-4 flex-row items-center ${
            isPassed ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
          }`}
        >
          <Ionicons
            name={isPassed ? 'diamond' : 'flame'}
            size={24}
            color={isPassed ? '#10B981' : '#EF4444'}
          />
          <View className="ml-3 flex-1">
            <Text className={`text-sm font-bold ${isPassed ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPassed ? 'Stake Returned' : 'Stake Lost'}
            </Text>
            <Text className={`text-[11px] mt-0.5 ${isPassed ? 'text-emerald-400/60' : 'text-red-400/60'}`}>
              {isPassed
                ? 'Your prediction was correct. Stake released to your wallet.'
                : 'Your prediction was incorrect. Stake has been forfeited.'}
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

export function ConditionResultCard({
  condition,
  conditionResult,
  evaluation,
  delay = 0,
}: ConditionResultCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(500)}
      className={`rounded-2xl p-5 border ${
        conditionResult === 'pending'
          ? 'bg-vault-card border-vault-border'
          : conditionResult === 'passed'
          ? 'bg-emerald-500/5 border-emerald-500/20'
          : 'bg-red-500/5 border-red-500/20'
      }`}
    >
      {condition.type === 'price_prediction' && (
        <PricePredictionResult
          condition={condition}
          conditionResult={conditionResult}
          evaluation={evaluation}
        />
      )}
    </Animated.View>
  );
}
