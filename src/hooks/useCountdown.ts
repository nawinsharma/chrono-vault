import { useEffect, useState } from 'react';
import { CountdownParts, getCountdown } from '@/src/utils/time';

export function useCountdown(unlockTimestamp: number): CountdownParts {
  const [countdown, setCountdown] = useState<CountdownParts>(
    getCountdown(unlockTimestamp)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const updated = getCountdown(unlockTimestamp);
      setCountdown(updated);

      if (updated.isExpired) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [unlockTimestamp]);

  return countdown;
}
