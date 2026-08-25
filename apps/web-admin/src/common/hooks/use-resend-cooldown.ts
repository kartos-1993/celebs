import { useCallback,useEffect, useState } from 'react';

export function useResendCooldown(storageKey = 'resend_cooldown_expiry', cooldownSeconds = 60) {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(() => {
    if (typeof window === 'undefined') return 0;
    const storedExpiry = localStorage.getItem(storageKey);
    if (!storedExpiry) return 0;
    const expiryTime = parseInt(storedExpiry, 10);
    const remaining = Math.ceil((expiryTime - Date.now()) / 1000);
    return remaining > 0 ? remaining : 0;
  });

  useEffect(() => {
    if (secondsRemaining <= 0) {
      localStorage.removeItem(storageKey);
      return;
    }

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          localStorage.removeItem(storageKey);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [secondsRemaining, storageKey]);

  const startCooldown = useCallback(() => {
    const expiryTime = Date.now() + cooldownSeconds * 1000;
    localStorage.setItem(storageKey, expiryTime.toString());
    setSecondsRemaining(cooldownSeconds);
  }, [cooldownSeconds, storageKey]);

  return {
    secondsRemaining,
    isCoolingDown: secondsRemaining > 0,
    startCooldown,
  };
}
