'use client';

import { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';

interface ConfettiProps {
  trigger: boolean;
  type?: 'burst' | 'fireworks' | 'coins';
}

export function Confetti({ trigger, type = 'burst' }: ConfettiProps) {
  const hasFired = useRef(false);

  useEffect(() => {
    if (trigger && !hasFired.current) {
      hasFired.current = true;

      switch (type) {
        case 'burst':
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
          });
          break;

        case 'fireworks':
          const duration = 2000;
          const animationEnd = Date.now() + duration;

          const interval = setInterval(() => {
            if (Date.now() > animationEnd) {
              clearInterval(interval);
              return;
            }

            confetti({
              particleCount: 50,
              startVelocity: 30,
              spread: 360,
              origin: {
                x: Math.random(),
                y: Math.random() - 0.2,
              },
              colors: ['#ff0', '#f0f', '#0ff', '#0f0'],
            });
          }, 250);
          break;

        case 'coins':
          confetti({
            particleCount: 30,
            spread: 50,
            origin: { y: 0.7 },
            colors: ['#ffd700', '#ffb700', '#ff9500'],
            shapes: ['circle'],
            scalar: 1.5,
          });
          break;
      }
    }
  }, [trigger, type]);

  // Reset when trigger changes back to false
  useEffect(() => {
    if (!trigger) {
      hasFired.current = false;
    }
  }, [trigger]);

  return null;
}

export function fireConfetti(type: 'burst' | 'fireworks' | 'coins' = 'burst') {
  switch (type) {
    case 'burst':
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899'],
      });
      break;

    case 'coins':
      confetti({
        particleCount: 30,
        spread: 50,
        origin: { y: 0.7 },
        colors: ['#ffd700', '#ffb700', '#ff9500'],
        shapes: ['circle'],
        scalar: 1.5,
      });
      break;

    case 'fireworks':
      const count = 200;
      const defaults = { origin: { y: 0.7 } };

      function fire(particleRatio: number, opts: confetti.Options) {
        confetti({
          ...defaults,
          ...opts,
          particleCount: Math.floor(count * particleRatio),
        });
      }

      fire(0.25, { spread: 26, startVelocity: 55 });
      fire(0.2, { spread: 60 });
      fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
      fire(0.1, { spread: 120, startVelocity: 45 });
      break;
  }
}
