import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useEffect, useState } from 'react';

function StarField() {
  const [stars, setStars] = useState([]);

  useEffect(() => {
    // Generate random stars
    const newStars = Array.from({ length: 80 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.2,
      delay: Math.random() * 4,
      duration: Math.random() * 3 + 2,
    }));
    setStars(newStars);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden">
      {/* Gradient base */}
      <div className="absolute inset-0 bg-gradient-cosmic" />

      {/* Nebula glow spots */}
      <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full bg-star/5 blur-3xl animate-drift" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-nebula/5 blur-3xl animate-drift" style={{ animationDelay: '-10s', animationDuration: '25s' }} />
      <div className="absolute top-1/2 right-1/3 w-64 h-64 rounded-full bg-galaxy/5 blur-3xl animate-drift" style={{ animationDelay: '-5s', animationDuration: '30s' }} />

      {/* Central glow */}
      <div className="absolute inset-0 bg-gradient-glow opacity-60" />

      {/* Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="absolute rounded-full bg-white animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: `${star.delay}s`,
            animationDuration: `${star.duration}s`,
          }}
        />
      ))}

      {/* Noise texture overlay */}
      <div className="absolute inset-0 bg-noise opacity-30" />

      {/* Vignette effect */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 0%, rgba(3,0,18,0.4) 100%)',
        }}
      />
    </div>
  );
}

export default function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden relative">
      {/* Cosmic background */}
      <StarField />

      {/* Main content wrapper with glass effect */}
      <div className="relative z-10 flex h-full w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden backdrop-blur-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
