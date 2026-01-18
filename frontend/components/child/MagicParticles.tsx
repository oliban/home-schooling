'use client';

import { useEffect, useRef, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

interface MagicParticlesProps {
  active: boolean;
  burst?: boolean; // Trigger a burst of particles
  centerX?: number;
  centerY?: number;
  colors?: string[];
}

const DEFAULT_COLORS = [
  '#FFB347', // sunset-gold
  '#F9C74F', // sunset-amber
  '#FF8C42', // sunset-tangerine
  '#FFCBA4', // sunset-peach
  '#FFD700', // gold
];

export function MagicParticles({
  active,
  burst = false,
  centerX,
  centerY,
  colors = DEFAULT_COLORS,
}: MagicParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number | undefined>(undefined);
  const burstTriggeredRef = useRef(false);

  const createParticle = useCallback((x: number, y: number, isBurst: boolean = false): Particle => {
    const angle = Math.random() * Math.PI * 2;
    const speed = isBurst ? 3 + Math.random() * 5 : 0.5 + Math.random() * 1.5;
    const life = isBurst ? 60 + Math.random() * 40 : 80 + Math.random() * 60;

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (isBurst ? 2 : 0.5),
      life,
      maxLife: life,
      size: isBurst ? 4 + Math.random() * 6 : 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 1,
    };
  }, [colors]);

  const createBurst = useCallback((x: number, y: number, count: number = 50) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push(createParticle(x, y, true));
    }
  }, [createParticle]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      if (!ctx || !canvas) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add ambient particles when active
      if (active && particlesRef.current.length < 30) {
        const x = centerX ?? canvas.width / 2;
        const y = centerY ?? canvas.height / 2;
        if (Math.random() < 0.3) {
          particlesRef.current.push(
            createParticle(
              x + (Math.random() - 0.5) * 100,
              y + (Math.random() - 0.5) * 100,
              false
            )
          );
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.02; // Slight gravity
        p.life--;
        p.alpha = p.life / p.maxLife;

        if (p.life <= 0) return false;

        // Draw particle with glow
        ctx.save();
        ctx.globalAlpha = p.alpha;

        // Outer glow
        const gradient = ctx.createRadialGradient(
          p.x, p.y, 0,
          p.x, p.y, p.size * 2
        );
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, 'transparent');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        ctx.fill();

        // Core
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [active, centerX, centerY, createParticle]);

  // Handle burst trigger
  useEffect(() => {
    if (burst && !burstTriggeredRef.current) {
      const canvas = canvasRef.current;
      if (canvas) {
        const x = centerX ?? canvas.width / 2;
        const y = centerY ?? canvas.height / 2;
        createBurst(x, y, 60);
        burstTriggeredRef.current = true;
      }
    }
    if (!burst) {
      burstTriggeredRef.current = false;
    }
  }, [burst, centerX, centerY, createBurst]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}

// Sparkle effect component for smaller areas
interface SparkleProps {
  count?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function Sparkles({ count = 5, size = 'md' }: SparkleProps) {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`absolute ${sizeClasses[size]} rounded-full bg-sunset-gold animate-sparkle`}
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            opacity: 0,
          }}
        />
      ))}
    </div>
  );
}
