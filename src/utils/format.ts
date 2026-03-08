export function truncateAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function formatSOL(amount: number): string {
  return `${amount.toFixed(4)} SOL`;
}

export function formatCID(cid: string, chars = 8): string {
  if (!cid) return '';
  if (cid.length <= chars * 2) return cid;
  return `${cid.slice(0, chars)}...${cid.slice(-chars)}`;
}
