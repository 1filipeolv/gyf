import { useEffect, useState } from 'react';

export function useNow(active = true) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, [active]);
  return now;
}