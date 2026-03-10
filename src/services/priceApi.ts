import { SupportedAsset, SUPPORTED_ASSETS } from '@/src/types/capsule';

const COINGECKO_BASE = 'https://api.coingecko.com/api/v3';

function getCoingeckoId(asset: SupportedAsset): string {
  const entry = SUPPORTED_ASSETS.find((a) => a.id === asset);
  if (!entry) throw new Error(`Unsupported asset: ${asset}`);
  return entry.coingeckoId;
}

export interface PriceResult {
  price: number;
  timestamp: number;
  source: string;
}

export interface PriceHistoryPoint {
  timestamp: number;
  price: number;
}

export async function fetchCurrentPrice(asset: SupportedAsset): Promise<PriceResult> {
  const cgId = getCoingeckoId(asset);
  const url = `${COINGECKO_BASE}/simple/price?ids=${cgId}&vs_currencies=usd&include_last_updated_at=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Price API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const entry = data[cgId];
  if (!entry?.usd) {
    throw new Error(`No price data for ${asset}`);
  }

  return {
    price: entry.usd,
    timestamp: (entry.last_updated_at || Math.floor(Date.now() / 1000)) * 1000,
    source: 'CoinGecko',
  };
}

export async function fetchPriceHistory(
  asset: SupportedAsset,
  days: number = 30
): Promise<PriceHistoryPoint[]> {
  const cgId = getCoingeckoId(asset);
  const url = `${COINGECKO_BASE}/coins/${cgId}/market_chart?vs_currency=usd&days=${days}&interval=${days <= 1 ? '' : 'daily'}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Price history API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.prices || !Array.isArray(data.prices)) {
    throw new Error('Invalid price history data');
  }

  return data.prices.map(([ts, price]: [number, number]) => ({
    timestamp: ts,
    price,
  }));
}

export async function fetchPriceAtTimestamp(
  asset: SupportedAsset,
  targetTimestamp: number
): Promise<PriceResult> {
  const cgId = getCoingeckoId(asset);
  const date = new Date(targetTimestamp * 1000);
  const dd = String(date.getUTCDate()).padStart(2, '0');
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const yyyy = date.getUTCFullYear();
  const dateStr = `${dd}-${mm}-${yyyy}`;

  const url = `${COINGECKO_BASE}/coins/${cgId}/history?date=${dateStr}`;

  const response = await fetch(url);
  if (!response.ok) {
    const current = await fetchCurrentPrice(asset);
    return current;
  }

  const data = await response.json();
  const price = data?.market_data?.current_price?.usd;
  if (typeof price !== 'number') {
    const current = await fetchCurrentPrice(asset);
    return current;
  }

  return {
    price,
    timestamp: targetTimestamp * 1000,
    source: 'CoinGecko (historical)',
  };
}

export async function fetchMultipleCurrentPrices(
  assets: SupportedAsset[]
): Promise<Record<SupportedAsset, PriceResult>> {
  const ids = assets.map((a) => getCoingeckoId(a)).join(',');
  const url = `${COINGECKO_BASE}/simple/price?ids=${ids}&vs_currencies=usd&include_last_updated_at=true`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Price API error: ${response.status}`);
  }

  const data = await response.json();
  const result = {} as Record<SupportedAsset, PriceResult>;

  for (const asset of assets) {
    const cgId = getCoingeckoId(asset);
    const entry = data[cgId];
    if (entry?.usd) {
      result[asset] = {
        price: entry.usd,
        timestamp: (entry.last_updated_at || Math.floor(Date.now() / 1000)) * 1000,
        source: 'CoinGecko',
      };
    }
  }

  return result;
}
