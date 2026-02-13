'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '@/lib/utils';
import { HoverBorderGradient } from './ui/hover-border-gradient';
import ShinyText from './ShinyText';
import { imageToAsciiSvg, createAsciiSvgAnimation, type AsciiSvgResult } from '@/lib/ascii';

// ─── ascii ramp for character scrambling ───
const SCRAMBLE_CHARS = '@#%&*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^`. ';

// ─── navbar ───
function Navbar() {
  return (
    <div className="sticky top-4 z-50 flex justify-center px-4">
      <HoverBorderGradient
        containerClassName="rounded-full"
        as="nav"
        className="dark:bg-black bg-black text-white px-6 py-2 flex items-center gap-6"
      >
        <a href="/" className="font-medium text-sm hover:text-neutral-300 transition-colors">
          ascii motion
        </a>
        <div className="h-4 w-px bg-neutral-700" />
        <button
          onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-neutral-400 hover:text-white transition-colors text-sm"
        >
          how it works
        </button>
        <button
          onClick={() => document.getElementById('try-it')?.scrollIntoView({ behavior: 'smooth' })}
          className="text-neutral-400 hover:text-white transition-colors text-sm"
        >
          try it
        </button>
      </HoverBorderGradient>
    </div>
  );
}

// ─── hero ascii demo animation ───
interface SvgChar {
  x: string;
  y: string;
  char: string;
}

function HeroAsciiDemo({ speed, density, color }: { speed: number; density: number; color: string }) {
  const [chars, setChars] = useState<SvgChar[]>([]);
  const allChars = useRef<SvgChar[]>([]);
  const baseChars = useRef<SvgChar[]>([]);
  const svgSize = useRef({ width: '996', height: '990' });

  // fetch and parse the SVG once
  useEffect(() => {
    fetch('/ascii-hero.svg')
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (svgEl) {
          svgSize.current.width = svgEl.getAttribute('width') || '996';
          svgSize.current.height = svgEl.getAttribute('height') || '990';
        }
        const textEls = doc.querySelectorAll('text');
        const parsed: SvgChar[] = [];
        textEls.forEach((el) => {
          parsed.push({
            x: el.getAttribute('x') || '0',
            y: el.getAttribute('y') || '0',
            char: el.textContent || '',
          });
        });
        allChars.current = parsed;
        baseChars.current = parsed;
        setChars(parsed);
      });
  }, []);

  // resample characters when density changes
  useEffect(() => {
    if (allChars.current.length === 0) return;
    const step = Math.max(1, Math.round(11 - density));
    const sampled = allChars.current.filter((_, i) => i % step === 0);
    baseChars.current = sampled;
    setChars(sampled);
  }, [density]);

  // scramble characters on interval, keeping positions
  useEffect(() => {
    if (baseChars.current.length === 0) return;
    const interval = setInterval(() => {
      setChars(
        baseChars.current.map((c) => ({
          ...c,
          char: SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)],
        }))
      );
    }, speed);
    return () => clearInterval(interval);
  }, [speed, baseChars.current]);

  if (chars.length === 0) return null;

  return (
    <div className="relative w-full flex items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgSize.current.width} ${svgSize.current.height}`}
        className="select-none"
      >
        {chars.map((c, i) => (
          <text key={i} x={c.x} y={c.y} fill={color} fontFamily="monospace" fontSize="8">
            {c.char}
          </text>
        ))}
      </svg>
    </div>
  );
}

// ─── feature card components ───
function FeatureCard({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('p-4 sm:p-8 relative overflow-hidden', className)}>
      {children}
    </div>
  );
}

function FeatureTitle({ children }: { children?: React.ReactNode }) {
  return (
    <p className="max-w-5xl mx-auto text-left tracking-tight text-white text-xl md:text-2xl md:leading-snug">
      {children}
    </p>
  );
}

function FeatureDescription({ children }: { children?: React.ReactNode }) {
  return (
    <p
      className={cn(
        'text-sm md:text-base max-w-4xl text-left mx-auto',
        'text-neutral-500 font-normal dark:text-neutral-300',
        'text-left max-w-sm mx-0 md:text-sm my-2'
      )}
    >
      {children}
    </p>
  );
}

// ─── ascii card animation (fetches an SVG and scrambles characters) ───
function AsciiCard({ src }: { src: string }) {
  const [chars, setChars] = useState<SvgChar[]>([]);
  const baseChars = useRef<SvgChar[]>([]);
  const svgSize = useRef({ width: '100', height: '100' });

  useEffect(() => {
    fetch(src)
      .then((res) => res.text())
      .then((svgText) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svgEl = doc.querySelector('svg');
        if (svgEl) {
          svgSize.current.width = svgEl.getAttribute('width') || '100';
          svgSize.current.height = svgEl.getAttribute('height') || '100';
        }
        const textEls = doc.querySelectorAll('text');
        const parsed: SvgChar[] = [];
        textEls.forEach((el) => {
          parsed.push({
            x: el.getAttribute('x') || '0',
            y: el.getAttribute('y') || '0',
            char: el.textContent || '',
          });
        });
        baseChars.current = parsed;
        setChars(parsed);
      });
  }, [src]);

  useEffect(() => {
    if (baseChars.current.length === 0) return;
    const interval = setInterval(() => {
      setChars(
        baseChars.current.map((c) => ({
          ...c,
          char: SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)],
        }))
      );
    }, 300);
    return () => clearInterval(interval);
  }, [chars.length]);

  if (chars.length === 0) return null;

  return (
    <div className="relative flex pt-4 pb-10 h-full items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        viewBox={`0 0 ${svgSize.current.width} ${svgSize.current.height}`}
        className="select-none max-h-32"
      >
        {chars.map((c, i) => (
          <text key={i} x={c.x} y={c.y} fill="#d4d4d4" fontFamily="monospace" fontSize="8">
            {c.char}
          </text>
        ))}
      </svg>
      <div className="absolute bottom-0 z-40 inset-x-0 h-10 bg-gradient-to-t from-black to-transparent w-full pointer-events-none" />
    </div>
  );
}

// ─── try it section (upload + convert + display) ───
function TryItSection() {
  const [isDragging, setIsDragging] = useState(false);
  const [frames, setFrames] = useState<string[] | null>(null);
  const [dimensions, setDimensions] = useState({ cols: 0, rows: 0 });
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isAnimating, setIsAnimating] = useState(true);
  const [density, setDensity] = useState(6);
  const [speed, setSpeed] = useState(150);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [color, setColor] = useState('#d4d4d4');
  const [removeBackground, setRemoveBackground] = useState(false);
  const [fileName, setFileName] = useState('ascii-motion');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // animation loop
  useEffect(() => {
    if (!frames || !isAnimating || frames.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % frames.length);
    }, speed);
    return () => clearInterval(interval);
  }, [frames, isAnimating, speed]);

  // reprocess when density changes or a new image is loaded
  useEffect(() => {
    if (!imageSrc) return;
    const img = new Image();
    img.onload = () => {
      const baseResult = imageToAsciiSvg(img, {
        cellWidth: density,
        cellHeight: Math.round(density * 1.5),
        maxWidth: 120,
        color,
        removeBackground,
      });
      const animationFrames = createAsciiSvgAnimation(baseResult, 8, { color });
      setFrames(animationFrames);
      setDimensions({ cols: baseResult.gridCols, rows: baseResult.gridRows });
      setCurrentFrame(0);
    };
    img.src = imageSrc;
  }, [imageSrc, density, color, removeBackground]);

  const processImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setImageSrc(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        processImage(file);
      }
    },
    [processImage]
  );

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processImage(file);
      }
    },
    [processImage]
  );

  const handleDownload = useCallback(() => {
    if (!frames) return;
    const blob = new Blob([frames[currentFrame]], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName || 'ascii-motion'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }, [frames, currentFrame, fileName]);

  return (
    <div id="try-it" className="mt-20 px-4 md:px-8 scroll-mt-20">
      <h2 className="text-2xl md:text-3xl font-medium text-white text-center mb-12">
        try it
      </h2>

      {/* upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'max-w-2xl mx-auto border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-all',
          isDragging
            ? 'border-white bg-white/5'
            : 'border-neutral-800 bg-neutral-900/50 hover:border-neutral-600 hover:bg-neutral-900'
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <svg
          className="mx-auto mb-4 text-neutral-500"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <p className="text-neutral-400 text-sm mb-1">
          drag & drop an image here, or click to upload
        </p>
        <p className="text-neutral-600 text-xs">png, jpg, gif, webp</p>
      </div>

      {/* background removal toggle */}
      <div className="max-w-2xl mx-auto mt-3 flex justify-center">
        <label
          className="flex items-center gap-2 text-neutral-400 text-sm cursor-pointer select-none"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={removeBackground}
            onChange={(e) => setRemoveBackground(e.target.checked)}
            className="accent-white w-3.5 h-3.5 cursor-pointer"
          />
          <span>clean up background</span>
          <span className="text-neutral-600 text-xs">(removes noisy backgrounds)</span>
        </label>
      </div>

      {/* ascii output */}
      {frames && (
        <div className="mt-8 max-w-5xl mx-auto">
          {/* controls */}
          <div className="flex flex-wrap items-center gap-6 mb-4 px-2">
            <label className="flex items-center gap-2 text-neutral-400 text-sm">
              <span>density</span>
              <input
                type="range"
                min="3"
                max="12"
                value={density}
                onChange={(e) => setDensity(Number(e.target.value))}
                className="accent-white w-24"
              />
              <span className="text-neutral-500 text-xs w-4">{density}</span>
            </label>
            <label className="flex items-center gap-2 text-neutral-400 text-sm">
              <span>speed</span>
              <input
                type="range"
                min="50"
                max="500"
                step="50"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="accent-white w-24"
              />
              <span className="text-neutral-500 text-xs w-8">{speed}ms</span>
            </label>
            <label className="flex items-center gap-2 text-neutral-400 text-sm cursor-pointer">
              <span>color</span>
              <span className="relative">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <span
                  className="block w-5 h-5 rounded border border-neutral-700"
                  style={{ backgroundColor: color }}
                />
              </span>
              <span className="text-neutral-500 text-xs">{color}</span>
            </label>
            <button
              onClick={() => setIsAnimating(!isAnimating)}
              className="text-sm text-neutral-400 hover:text-white transition-colors"
            >
              {isAnimating ? 'pause' : 'play'}
            </button>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                placeholder="file name"
                className="bg-neutral-800 border border-neutral-700 rounded px-2 py-0.5 text-sm text-neutral-300 w-32 focus:outline-none focus:border-neutral-500 placeholder:text-neutral-600"
              />
              <span className="text-xs text-neutral-600">.svg</span>
              <button
                onClick={handleDownload}
                className="text-sm text-neutral-400 hover:text-white transition-colors ml-1"
              >
                download
              </button>
            </div>
          </div>

          {/* ascii display */}
          <div className="rounded-lg overflow-hidden border border-neutral-800 bg-[#0d1117]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-neutral-800">
              <span className="text-sm text-neutral-400">output</span>
              <span className="text-xs text-neutral-600">
                {dimensions.cols}x{dimensions.rows}
              </span>
            </div>
            <div className="p-4 overflow-x-auto" dangerouslySetInnerHTML={{ __html: frames[currentFrame] }} />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── main landing component ───
export default function Landing() {
  const [heroDensity, setHeroDensity] = useState(10);
  const [heroSpeed, setHeroSpeed] = useState(300);
  const [heroColor, setHeroColor] = useState('#d4d4d4');

  const features = [
    {
      title: 'upload',
      description: 'drag & drop or click to upload any image. supports png, jpg, gif, and webp.',
      skeleton: <AsciiCard src="/ascii-dragon.svg" />,
      className: 'col-span-1 md:col-span-1 lg:col-span-3 border-b md:border-r lg:border-r border-neutral-800',
    },
    {
      title: 'analyze',
      description: 'the image is divided into a grid. each cell\'s brightness is measured to determine the right character.',
      skeleton: <AsciiCard src="/ascii-mitsuki.svg" />,
      className: 'col-span-1 md:col-span-1 lg:col-span-3 border-b border-neutral-800',
    },
    {
      title: 'convert',
      description: 'brightness maps to ascii characters. dense areas get heavy characters like @#%, light areas get thin ones like .:',
      skeleton: <AsciiCard src="/ascii-rubiks.svg" />,
      className: 'col-span-1 md:col-span-1 lg:col-span-3 border-b md:border-b lg:border-b-0 md:border-r lg:border-r border-neutral-800',
    },
    {
      title: 'animate',
      description: 'subtle character variations create a living, breathing ascii animation from your still image.',
      skeleton: <AsciiCard src="/ascii-westwood.svg" />,
      className: 'col-span-1 md:col-span-1 lg:col-span-3 border-neutral-800',
    },
  ];

  return (
    <div className="relative z-20 max-w-7xl mx-auto pb-20">
      {/* navbar */}
      <Navbar />

      {/* hero */}
      <div className="pt-16 pb-12 md:pt-20 lg:pt-32 lg:pb-16 px-4 md:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* left: content */}
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl tracking-tight font-medium mb-6">
              <ShinyText text="ascii motion" speed={3} />
            </h1>

            <p className="text-lg md:text-xl text-neutral-300 font-normal leading-snug mb-4">
              turn any image into animated ascii art.
            </p>

            <p className="text-sm md:text-base text-neutral-400 font-normal leading-relaxed mb-8">
              upload an image and watch it come alive as ascii characters. adjust density, speed, and download your creation.
            </p>

            <button
              onClick={() => document.getElementById('try-it')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex items-center gap-3 bg-white hover:bg-neutral-200 border border-neutral-300 hover:border-white text-black px-6 py-3 rounded-lg font-mono text-sm cursor-pointer transition-all relative overflow-hidden"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
                backgroundBlendMode: 'overlay',
              }}
            >
              <span>upload an image</span>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="opacity-70"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
          </div>

          {/* right: demo */}
          <div className="flex flex-col items-center justify-center">
            <div className="flex flex-wrap items-center justify-center gap-5 mb-4">
              <label className="flex items-center gap-2 text-neutral-400 text-sm">
                <span>density</span>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={heroDensity}
                  onChange={(e) => setHeroDensity(Number(e.target.value))}
                  className="accent-white w-20"
                />
                <span className="text-neutral-500 text-xs w-4">{heroDensity}</span>
              </label>
              <label className="flex items-center gap-2 text-neutral-400 text-sm">
                <span>speed</span>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="50"
                  value={heroSpeed}
                  onChange={(e) => setHeroSpeed(Number(e.target.value))}
                  className="accent-white w-20"
                />
                <span className="text-neutral-500 text-xs w-8">{heroSpeed}ms</span>
              </label>
              <label className="flex items-center gap-2 text-neutral-400 text-sm cursor-pointer">
                <span>color</span>
                <span className="relative">
                  <input
                    type="color"
                    value={heroColor}
                    onChange={(e) => setHeroColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <span
                    className="block w-5 h-5 rounded border border-neutral-700"
                    style={{ backgroundColor: heroColor }}
                  />
                </span>
                <span className="text-neutral-500 text-xs">{heroColor}</span>
              </label>
            </div>
            <div className="bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 w-full max-w-md">
              <HeroAsciiDemo speed={heroSpeed} density={heroDensity} color={heroColor} />
            </div>
          </div>
        </div>
      </div>

      {/* how it works */}
      <div id="how-it-works" className="relative scroll-mt-20 px-4 md:px-0">
        <h2 className="text-2xl md:text-3xl font-medium text-white text-center mb-8">
          how it works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 border rounded-md border-neutral-800">
          {features.map((feature) => (
            <FeatureCard key={feature.title} className={feature.className}>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
              <div className="h-full w-full">{feature.skeleton}</div>
            </FeatureCard>
          ))}
        </div>
      </div>

      {/* try it */}
      <TryItSection />

      {/* footer */}
      <div className="mt-20 text-center">
        <p className="text-neutral-600 text-sm">ascii motion</p>
      </div>
    </div>
  );
}
