import type {
  CapsuleCondition,
  ConditionComparator,
  ConditionEvaluationResult,
  ConditionResult,
  PricePredictionCondition,
} from '@/src/types/capsule';
import { fetchCurrentPrice, fetchPriceAtTimestamp } from './priceApi';

function compare(actual: number, comparator: ConditionComparator, target: number): boolean {
  switch (comparator) {
    case '>': return actual > target;
    case '>=': return actual >= target;
    case '<': return actual < target;
    case '<=': return actual <= target;
    default: return false;
  }
}

function formatExpression(cond: PricePredictionCondition, fetchedPrice?: number): string {
  const priceStr = fetchedPrice != null ? fetchedPrice.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '???';
  const targetStr = cond.targetPrice.toLocaleString('en-US', { maximumFractionDigits: 2 });
  return `${cond.asset}/USD ${priceStr} ${cond.comparator} ${targetStr}`;
}

async function evaluatePricePrediction(
  condition: PricePredictionCondition
): Promise<{ result: ConditionResult; evaluation: ConditionEvaluationResult }> {
  const now = Math.floor(Date.now() / 1000);

  if (now < condition.evaluationTimestamp) {
    return {
      result: 'pending',
      evaluation: {
        fetchedPrice: 0,
        fetchedAt: 0,
        source: '',
        expression: formatExpression(condition),
        passed: false,
      },
    };
  }

  const isRecent = now - condition.evaluationTimestamp < 86400;

  const priceResult = isRecent
    ? await fetchCurrentPrice(condition.asset)
    : await fetchPriceAtTimestamp(condition.asset, condition.evaluationTimestamp);

  const passed = compare(priceResult.price, condition.comparator, condition.targetPrice);

  return {
    result: passed ? 'passed' : 'failed',
    evaluation: {
      fetchedPrice: priceResult.price,
      fetchedAt: priceResult.timestamp,
      source: priceResult.source,
      expression: formatExpression(condition, priceResult.price),
      passed,
    },
  };
}

export async function evaluateCondition(
  condition: CapsuleCondition
): Promise<{ result: ConditionResult; evaluation: ConditionEvaluationResult }> {
  switch (condition.type) {
    case 'price_prediction':
      return evaluatePricePrediction(condition);
    default:
      throw new Error(`Unknown condition type: ${(condition as CapsuleCondition).type}`);
  }
}

export function isConditionEvaluationReady(condition: CapsuleCondition): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now >= condition.evaluationTimestamp;
}

export function getTimeUntilEvaluation(condition: CapsuleCondition): number {
  const now = Math.floor(Date.now() / 1000);
  return Math.max(0, condition.evaluationTimestamp - now);
}
