import React, { useEffect, useRef } from 'react';

const Snowfall: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // The canvas will be sized to its parent container (the app shell)
    let width = canvas.offsetWidth;
    let height = canvas.offsetHeight;
    canvas.width = width;
    canvas.height = height;

    const snowflakes: { x: number; y: number; r: number; d: number }[] = [];
    const maxSnowflakes = 70; // Reduced count for cleaner look inside app

    for (let i = 0; i < maxSnowflakes; i++) {
      snowflakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        r: Math.random() * 2 + 1, // Smaller flakes
        d: Math.random() * maxSnowflakes,
      });
    }

    function draw() {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, width, height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.beginPath();
      for (let i = 0; i < maxSnowflakes; i++) {
        const f = snowflakes[i];
        ctx.moveTo(f.x, f.y);
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2, true);
      }
      ctx.fill();
      move();
    }

    let angle = 0;
    function move() {
      angle += 0.01;
      for (let i = 0; i < maxSnowflakes; i++) {
        const f = snowflakes[i];
        // Slower fall speed (significantly reduced)
        f.y += 0.4 + (f.d / maxSnowflakes) * 0.5;
        f.x += Math.sin(angle) * 0.5; // Less side-to-side movement

        // Reset if it goes off bottom or wraps side
        if (f.y > height) {
          snowflakes[i] = { x: Math.random() * width, y: -10, r: f.r, d: f.d };
        }
        if (f.x > width + 5) {
          snowflakes[i].x = -5;
        } else if (f.x < -5) {
          snowflakes[i].x = width + 5;
        }
      }
    }

    let animationFrameId: number;
    const render = () => {
      draw();
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    // Handle resizing if the container changes size
    const resizeObserver = new ResizeObserver(() => {
      if (canvas) {
        width = canvas.offsetWidth;
        height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;
      }
    });
    resizeObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none z-50" />;
};

export default Snowfall;