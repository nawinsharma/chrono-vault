import { differenceInSeconds, format, formatDistanceToNow } from 'date-fns';

export interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export function getCountdown(unlockTimestamp: number): CountdownParts {
  const now = Date.now();
  const unlockMs = unlockTimestamp * 1000;
  const totalSeconds = Math.max(0, differenceInSeconds(unlockMs, now));

  if (totalSeconds <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalSeconds: 0, isExpired: true };
  }

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds, totalSeconds, isExpired: false };
}

export function formatUnlockDate(timestamp: number): string {
  return format(new Date(timestamp * 1000), 'MMM dd, yyyy · h:mm a');
}

export function formatTimeAgo(timestamp: number): string {
  return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
}

export function padNumber(n: number): string {
  return n.toString().padStart(2, '0');
}
