import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CapsuleMetadata, CapsuleStatus, CapsuleType, SUPPORTED_ASSETS } from '@/src/types/capsule';
import { formatUnlockDate } from '@/src/utils/time';
import { CountdownTimer } from './CountdownTimer';
import { GlowDot } from '@/src/components/ui/GlowDot';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface CapsuleCardProps {
  capsule: CapsuleMetadata;
  onPress: () => void;
  index?: number;
}

export function CapsuleCard({ capsule, onPress, index = 0 }: CapsuleCardProps) {
  const scale = useSharedValue(1);
  const isLocked = capsule.status === CapsuleStatus.Locked;
  const isReputation = capsule.capsuleType === CapsuleType.Reputation;
  const hasCondition = !!capsule.condition;
  const conditionResult = capsule.conditionResult;

  const glowColor =
    conditionResult === 'passed' ? '#10B981'
    : conditionResult === 'failed' ? '#EF4444'
    : isReputation ? '#F59E0B'
    : isLocked ? '#8B5CF6'
    : '#10B981';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).duration(500)}>
      <AnimatedTouchable
        onPress={onPress}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 15, stiffness: 400 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 15, stiffness: 400 });
        }}
        activeOpacity={0.9}
        style={animatedStyle}
        className="bg-vault-card rounded-2xl p-5 mb-4 border border-vault-border"
      >
        <View className="flex-row items-center justify-between mb-3">
          <View className="flex-row items-center flex-1">
            <View
              className={`w-10 h-10 rounded-full bg-vault-dark items-center justify-center mr-3 ${
                isReputation && isLocked ? 'border border-amber-500/30' : ''
              }`}
            >
              <Ionicons
                name={
                  hasCondition
                    ? conditionResult === 'passed' ? 'checkmark-circle'
                    : conditionResult === 'failed' ? 'close-circle'
                    : 'analytics'
                    : isReputation ? 'shield-checkmark'
                    : isLocked ? 'lock-closed'
                    : 'lock-open'
                }
                size={18}
                color={glowColor}
              />
            </View>
            <View className="flex-1">
              <View className="flex-row items-center gap-2">
                <Text className="text-vault-white text-base font-semibold flex-shrink" numberOfLines={1}>
                  {capsule.title}
                </Text>
                {isReputation && (
                  <View className="bg-amber-500/20 rounded-full px-2 py-0.5">
                    <Text className="text-amber-400 text-[9px] font-bold">REP</Text>
                  </View>
                )}
                {hasCondition && (
                  <View
                    className={`rounded-full px-2 py-0.5 ${
                      conditionResult === 'passed' ? 'bg-emerald-500/20'
                      : conditionResult === 'failed' ? 'bg-red-500/20'
                      : 'bg-vault-dark'
                    }`}
                  >
                    <Text
                      className={`text-[9px] font-bold ${
                        conditionResult === 'passed' ? 'text-emerald-400'
                        : conditionResult === 'failed' ? 'text-red-400'
                        : 'text-vault-muted'
                      }`}
                    >
                      {conditionResult === 'passed' ? 'PASSED'
                      : conditionResult === 'failed' ? 'FAILED'
                      : 'PENDING'}
                    </Text>
                  </View>
                )}
              </View>
              <Text className="text-vault-muted text-xs mt-0.5">
                {formatUnlockDate(capsule.unlockTimestamp)}
              </Text>
            </View>
          </View>
          <GlowDot color={glowColor} size={6} />
        </View>

        {/* Condition Summary */}
        {hasCondition && capsule.condition?.type === 'price_prediction' && (
          <View className="bg-vault-dark rounded-lg p-3 mb-2">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="w-5 h-5 rounded-full items-center justify-center mr-1.5"
                  style={{ backgroundColor: `${SUPPORTED_ASSETS.find((a) => a.id === capsule.condition!.asset)?.color || '#8B5CF6'}20` }}
                >
                  <Text
                    className="text-[8px] font-bold"
                    style={{ color: SUPPORTED_ASSETS.find((a) => a.id === capsule.condition!.asset)?.color }}
                  >
                    {capsule.condition.asset[0]}
                  </Text>
                </View>
                <Text className="text-vault-text text-xs font-mono">
                  {capsule.condition.asset} {capsule.condition.comparator} ${capsule.condition.targetPrice.toLocaleString()}
                </Text>
              </View>
              {capsule.conditionEvaluation && (
                <Text
                  className={`text-xs font-bold font-mono ${
                    conditionResult === 'passed' ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  ${capsule.conditionEvaluation.fetchedPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </Text>
              )}
            </View>
          </View>
        )}

        {isLocked && (
          <View className="mt-2">
            <CountdownTimer unlockTimestamp={capsule.unlockTimestamp} size="sm" />
          </View>
        )}

        {!isLocked && !hasCondition && (
          <View className="mt-2 flex-row items-center justify-center py-2">
            <Ionicons name="sparkles" size={16} color="#10B981" />
            <Text className="text-emerald-400 text-sm font-medium ml-1.5">
              Capsule Unlocked
            </Text>
          </View>
        )}

        {!isLocked && hasCondition && (
          <View className={`mt-2 flex-row items-center justify-center py-2 ${
            conditionResult === 'passed' ? '' : conditionResult === 'failed' ? '' : ''
          }`}>
            <Ionicons
              name={conditionResult === 'passed' ? 'checkmark-circle' : conditionResult === 'failed' ? 'close-circle' : 'sparkles'}
              size={16}
              color={conditionResult === 'passed' ? '#10B981' : conditionResult === 'failed' ? '#EF4444' : '#10B981'}
            />
            <Text
              className={`text-sm font-medium ml-1.5 ${
                conditionResult === 'passed' ? 'text-emerald-400'
                : conditionResult === 'failed' ? 'text-red-400'
                : 'text-emerald-400'
              }`}
            >
              {conditionResult === 'passed' ? 'Prediction Correct'
              : conditionResult === 'failed' ? 'Prediction Incorrect'
              : 'Capsule Unlocked'}
            </Text>
          </View>
        )}

        {capsule.escrowAmount > 0 && (
          <View className="mt-3 pt-3 border-t border-vault-border flex-row items-center">
            <Ionicons
              name={
                conditionResult === 'failed' ? 'flame'
                : isReputation ? 'shield-outline'
                : 'diamond-outline'
              }
              size={14}
              color={
                conditionResult === 'failed' ? '#EF4444'
                : conditionResult === 'passed' ? '#10B981'
                : isReputation ? '#F59E0B'
                : '#6B7280'
              }
            />
            <Text className={`text-xs ml-1.5 ${
              conditionResult === 'failed' ? 'text-red-400/70'
              : conditionResult === 'passed' ? 'text-emerald-400/70'
              : isReputation ? 'text-amber-400/70'
              : 'text-vault-muted'
            }`}>
              {capsule.escrowAmount} SOL{' '}
              {conditionResult === 'failed' ? 'lost'
              : conditionResult === 'passed' ? 'returned'
              : isReputation ? 'staked'
              : 'locked'}
            </Text>
          </View>
        )}
      </AnimatedTouchable>
    </Animated.View>
  );
}
