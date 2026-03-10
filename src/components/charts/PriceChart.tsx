import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle, Line, Rect } from 'react-native-svg';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { fetchPriceHistory, fetchCurrentPrice, type PriceHistoryPoint } from '@/src/services/priceApi';
import type { SupportedAsset } from '@/src/types/capsule';
import { SUPPORTED_ASSETS } from '@/src/types/capsule';

const SCREEN_WIDTH = Dimensions.get('window').width;

interface PriceChartProps {
  asset: SupportedAsset;
  targetPrice?: number;
  compact?: boolean;
  height?: number;
}

type TimeRange = '1D' | '7D' | '30D' | '90D';
const TIME_RANGES: { id: TimeRange; label: string; days: number }[] = [
  { id: '1D', label: '1D', days: 1 },
  { id: '7D', label: '7D', days: 7 },
  { id: '30D', label: '30D', days: 30 },
  { id: '90D', label: '90D', days: 90 },
];

function buildPath(
  points: PriceHistoryPoint[],
  width: number,
  height: number,
  minPrice: number,
  maxPrice: number,
  areaFill?: boolean
): string {
  if (points.length < 2) return '';

  const range = maxPrice - minPrice || 1;
  const padding = 4;
  const drawH = height - padding * 2;
  const drawW = width;

  const coords = points.map((p, i) => {
    const x = (i / (points.length - 1)) * drawW;
    const y = padding + drawH - ((p.price - minPrice) / range) * drawH;
    return { x, y };
  });

  let d = `M ${coords[0]!.x} ${coords[0]!.y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1]!;
    const curr = coords[i]!;
    const cpx = (prev.x + curr.x) / 2;
    d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
  }

  if (areaFill) {
    d += ` L ${coords[coords.length - 1]!.x} ${height}`;
    d += ` L ${coords[0]!.x} ${height} Z`;
  }

  return d;
}

function getTargetLineY(
  targetPrice: number,
  height: number,
  minPrice: number,
  maxPrice: number
): number | null {
  const range = maxPrice - minPrice || 1;
  const padding = 4;
  const drawH = height - padding * 2;
  const y = padding + drawH - ((targetPrice - minPrice) / range) * drawH;
  if (y < 0 || y > height) return null;
  return y;
}

export function PriceChart({ asset, targetPrice, compact = false, height: propHeight }: PriceChartProps) {
  const [data, setData] = useState<PriceHistoryPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState<TimeRange>('30D');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const assetInfo = SUPPORTED_ASSETS.find((a) => a.id === asset);
  const chartColor = assetInfo?.color || '#8B5CF6';
  const chartWidth = compact ? SCREEN_WIDTH - 80 : SCREEN_WIDTH - 56;
  const chartHeight = propHeight || (compact ? 80 : 160);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const rangeDef = TIME_RANGES.find((r) => r.id === range)!;
      const [history, price] = await Promise.all([
        fetchPriceHistory(asset, rangeDef.days),
        fetchCurrentPrice(asset),
      ]);

      setData(history);
      setCurrentPrice(price.price);

      if (history.length >= 2) {
        const first = history[0]!.price;
        const last = history[history.length - 1]!.price;
        setPriceChange(((last - first) / first) * 100);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load price data');
    } finally {
      setLoading(false);
    }
  }, [asset, range]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    intervalRef.current = setInterval(async () => {
      try {
        const price = await fetchCurrentPrice(asset);
        setCurrentPrice(price.price);
      } catch { /* silent */ }
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [asset]);

  if (loading && data.length === 0) {
    return (
      <View className={`bg-vault-card rounded-2xl ${compact ? 'p-3' : 'p-5'} border border-vault-border`}>
        <View className="items-center justify-center" style={{ height: chartHeight }}>
          <Ionicons name="pulse-outline" size={24} color="#6B7280" />
          <Text className="text-vault-muted text-xs mt-2">Loading price data...</Text>
        </View>
      </View>
    );
  }

  if (error && data.length === 0) {
    return (
      <View className={`bg-vault-card rounded-2xl ${compact ? 'p-3' : 'p-5'} border border-vault-border`}>
        <View className="items-center justify-center" style={{ height: chartHeight }}>
          <Ionicons name="warning-outline" size={24} color="#EF4444" />
          <Text className="text-red-400 text-xs mt-2">{error}</Text>
          <TouchableOpacity onPress={loadData} className="mt-2">
            <Text className="text-vault-purple text-xs">Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const prices = data.map((d) => d.price);
  const minPrice = Math.min(...prices) * 0.998;
  const maxPriceBase = Math.max(...prices) * 1.002;
  const maxPrice = targetPrice ? Math.max(maxPriceBase, targetPrice * 1.05) : maxPriceBase;
  const adjustedMin = targetPrice ? Math.min(minPrice, targetPrice * 0.95) : minPrice;

  const linePath = buildPath(data, chartWidth, chartHeight, adjustedMin, maxPrice);
  const areaPath = buildPath(data, chartWidth, chartHeight, adjustedMin, maxPrice, true);
  const targetY = targetPrice != null ? getTargetLineY(targetPrice, chartHeight, adjustedMin, maxPrice) : null;

  const isPositive = priceChange >= 0;

  if (compact) {
    return (
      <Animated.View entering={FadeIn.duration(400)}>
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-vault-white text-sm font-semibold">{asset}/USD</Text>
          {currentPrice != null && (
            <Text className="text-vault-white text-sm font-bold font-mono">
              ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </Text>
          )}
        </View>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id={`grad-compact-${asset}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={chartColor} stopOpacity={0.3} />
              <Stop offset="1" stopColor={chartColor} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {areaPath && <Path d={areaPath} fill={`url(#grad-compact-${asset})`} />}
          {linePath && <Path d={linePath} stroke={chartColor} strokeWidth={1.5} fill="none" />}
          {targetY != null && (
            <Line
              x1={0} y1={targetY} x2={chartWidth} y2={targetY}
              stroke="#EF4444" strokeWidth={1} strokeDasharray="4,4" opacity={0.7}
            />
          )}
        </Svg>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(500)} className="bg-vault-card rounded-2xl p-5 border border-vault-border">
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center">
          <View className="w-8 h-8 rounded-full items-center justify-center mr-2" style={{ backgroundColor: `${chartColor}20` }}>
            <Text className="text-sm font-bold" style={{ color: chartColor }}>{asset[0]}</Text>
          </View>
          <View>
            <Text className="text-vault-white text-base font-semibold">{assetInfo?.label || asset}</Text>
            <Text className="text-vault-muted text-xs">{asset}/USD</Text>
          </View>
        </View>
        <View className="items-end">
          {currentPrice != null && (
            <Text className="text-vault-white text-lg font-bold font-mono">
              ${currentPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </Text>
          )}
          <View className="flex-row items-center">
            <Ionicons
              name={isPositive ? 'trending-up' : 'trending-down'}
              size={12}
              color={isPositive ? '#10B981' : '#EF4444'}
            />
            <Text className={`text-xs font-medium ml-1 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
              {isPositive ? '+' : ''}{priceChange.toFixed(2)}%
            </Text>
          </View>
        </View>
      </View>

      <View className="mt-3">
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id={`grad-${asset}`} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={chartColor} stopOpacity={0.25} />
              <Stop offset="1" stopColor={chartColor} stopOpacity={0.02} />
            </LinearGradient>
          </Defs>

          {areaPath && <Path d={areaPath} fill={`url(#grad-${asset})`} />}
          {linePath && (
            <Path d={linePath} stroke={chartColor} strokeWidth={2} fill="none" strokeLinecap="round" />
          )}

          {targetY != null && (
            <>
              <Line
                x1={0} y1={targetY} x2={chartWidth} y2={targetY}
                stroke="#F59E0B" strokeWidth={1} strokeDasharray="6,4" opacity={0.8}
              />
              <Rect
                x={chartWidth - 72} y={targetY - 10} width={68} height={18}
                rx={4} fill="#F59E0B" opacity={0.9}
              />
            </>
          )}

          {data.length > 0 && linePath && (
            <Circle
              cx={chartWidth}
              cy={4 + (chartHeight - 8) - ((data[data.length - 1]!.price - adjustedMin) / ((maxPrice - adjustedMin) || 1)) * (chartHeight - 8)}
              r={3}
              fill={chartColor}
              stroke="#1A1A2E"
              strokeWidth={2}
            />
          )}
        </Svg>
      </View>

      {targetPrice != null && (
        <View className="flex-row items-center mt-2">
          <View className="w-3 h-0.5 bg-amber-500 mr-2" />
          <Text className="text-amber-400 text-[10px]">
            Target: ${targetPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </Text>
        </View>
      )}

      <View className="flex-row mt-3 bg-vault-dark rounded-lg p-0.5">
        {TIME_RANGES.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => setRange(r.id)}
            className={`flex-1 py-1.5 rounded-md items-center ${range === r.id ? 'bg-vault-card' : ''}`}
          >
            <Text className={`text-xs font-medium ${range === r.id ? 'text-vault-white' : 'text-vault-muted'}`}>
              {r.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </Animated.View>
  );
}
