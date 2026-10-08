import { useEffect, useState } from 'react';
import { animate } from 'motion';
import { useReducedMotion } from 'motion/react';

/** Count-up saat mount. Menghormati prefers-reduced-motion. */
export function useCountUp(target = 0, duration = 0.9) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? target : 0);

  useEffect(() => {
    if (reduce) { setV(target); return; }
    const c = animate(0, target, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (x) => setV(Math.round(x)),
    });
    return () => c.stop();
  }, [target, duration, reduce]);

  return v;
}
