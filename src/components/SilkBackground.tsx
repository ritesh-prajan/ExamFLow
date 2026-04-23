import React, { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useApp } from '@/context/AppContext';

export const SilkBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(undefined);
  const { state } = useApp();
  const isDark = state.theme === 'dark' || (state.theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = () => {
      const { width, height } = canvas;
      if (width === 0 || height === 0) return;
      
      ctx.clearRect(0, 0, width, height);
      
      // Subtle flowing lines for texture
      const lineOpacity = isDark ? 0.06 : 0.03;
      ctx.strokeStyle = isDark ? `rgba(255,255,255,${lineOpacity})` : `rgba(0,0,0,${lineOpacity})`;
      ctx.lineWidth = 1;
      
      for (let i = 0; i < 4; i++) {
        const tOffset = (time * 0.0006) + (i * 2.1);
        const offset = Math.sin(tOffset) * 20;
        ctx.beginPath();
        const yBase = (height / 4) * i + height / 8;
        ctx.moveTo(-100, yBase + offset);
        ctx.bezierCurveTo(
          width * 0.35, yBase - 150 + offset + Math.cos(tOffset) * 50, 
          width * 0.65, yBase + 150 + offset + Math.sin(tOffset) * 50, 
          width + 100, yBase + offset
        );
        ctx.stroke();
      }

      time += 16.67;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDark]);

  const bgColor = isDark ? '#000000' : '#ffffff';
  const accentColor = state.accentColor;

  return (
    <div className="fixed inset-0 -z-10 pointer-events-none transition-colors duration-1000 overflow-hidden bg-background">
      {/* 
        Radial gradient starting from center with the theme color 
        and ending with white (light) or black (dark).
      */}
      <div 
        className="absolute inset-0 transition-opacity duration-1000"
        style={{
          background: `radial-gradient(circle at center, ${accentColor}33 0%, ${accentColor}0a 80%, ${bgColor} 100%)`
        }}
      />
      
      {/* Moving Silk Texture Overlay */}
      <canvas 
        ref={canvasRef}
        className="w-full h-full block opacity-70"
      />
      
      {/* Decorative grain/vignette */}
      <div className={cn(
        "absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-transparent",
        isDark ? "to-black/30" : "to-black/5"
      )} />
    </div>
  );
};
