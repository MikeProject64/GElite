'use client';

import React, { useRef, useEffect, useCallback } from 'react';

const NetworkAnimation: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameId = useRef<number>();

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const parent = canvas.parentElement;
        if (!parent) return;

        canvas.width = parent.offsetWidth;
        canvas.height = parent.offsetHeight;
        
        const computedStyle = getComputedStyle(document.documentElement);
        const h = computedStyle.getPropertyValue('--primary-h').trim() || '210';
        const s = computedStyle.getPropertyValue('--primary-s').trim() || '70%';
        const l = computedStyle.getPropertyValue('--primary-l').trim() || '40%';
        const pointColor = `hsl(${h}, ${s}, ${l})`;

        let particles: Particle[];

        class Particle {
            x: number;
            y: number;
            radius: number;
            vx: number;
            vy: number;

            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.radius = Math.random() * 1.5 + 1;
                this.vx = Math.random() * 0.5 - 0.25;
                this.vy = Math.random() * 0.5 - 0.25;
            }

            draw() {
                if (!ctx) return;
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
                ctx.fillStyle = pointColor;
                ctx.fill();
            }

            update() {
                if (this.x < 0 || this.x > canvas.width) {
                    this.vx = -this.vx;
                }
                if (this.y < 0 || this.y > canvas.height) {
                    this.vy = -this.vy;
                }
                this.x += this.vx;
                this.y += this.vy;
                this.draw();
            }
        }

        function init() {
            particles = [];
            // Adjust particle density by changing the divisor. Lower number = more particles.
            const numberOfParticles = Math.floor((canvas.width * canvas.height) / 12000);
            for (let i = 0; i < numberOfParticles; i++) {
                particles.push(new Particle());
            }
        }

        function connect() {
            let opacityValue = 1;
            for (let a = 0; a < particles.length; a++) {
                for (let b = a; b < particles.length; b++) {
                    const distance = ((particles[a].x - particles[b].x) * (particles[a].x - particles[b].x))
                                   + ((particles[a].y - particles[b].y) * (particles[a].y - particles[b].y));

                    // Connect particles that are reasonably close
                    if (distance < (canvas.width / 8) * (canvas.height / 8)) {
                        opacityValue = 1 - (distance / 25000);
                        ctx.strokeStyle = `hsla(${h}, ${s}, ${l}, ${opacityValue * 0.25})`; // Faint lines
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(particles[a].x, particles[a].y);
                        ctx.lineTo(particles[b].x, particles[b].y);
                        ctx.stroke();
                    }
                }
            }
        }
        
        const animate = () => {
            if (!ctx || !particles) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                particles[i].update();
            }
            connect();
            animationFrameId.current = requestAnimationFrame(animate);
        };

        init();
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        animate();

    }, []);

    useEffect(() => {
        // Initial draw
        const timeoutId = setTimeout(draw, 100);
        
        const handleResize = () => {
            draw();
        };

        window.addEventListener('resize', handleResize);

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
            if (animationFrameId.current) {
                cancelAnimationFrame(animationFrameId.current);
            }
        };
    }, [draw]);

    return <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full z-0" />;
};

export default NetworkAnimation;
