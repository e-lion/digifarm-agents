"use client";

import React, { useRef, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Checkbox } from "@/components/ui/Checkbox";
import { Separator } from "@/components/ui/Separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/Tabs";
import { Eye, EyeOff, Mail, Lock, ArrowRight, Chrome, TrendingUp, MapPin, ShieldCheck, Zap, CloudOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- DotMap Component ---
type RoutePoint = {
  x: number;
  y: number;
  delay: number;
};

const DotMap = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeObserver = new ResizeObserver(entries => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
      canvas.width = width;
      canvas.height = height;
    });

    const parent = canvas.parentElement;
    if (parent) resizeObserver.observe(parent);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Generate static "map" dots covering the whole canvas evenly
    const mapDots: { x: number; y: number; opacity: number }[] = [];
    const gap = 16;
    for (let x = gap / 2; x < dimensions.width; x += gap) {
      for (let y = gap / 2; y < dimensions.height; y += gap) {
        // Uniform grid with slight offset for an organic feel
        mapDots.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          opacity: Math.random() * 0.15 + 0.05
        });
      }
    }

    // Generate fixed "hubs"
    const numHubs = 15;
    const hubs: { x: number; y: number }[] = Array.from({ length: numHubs }).map(() => ({
      x: dimensions.width * (0.1 + Math.random() * 0.8),
      y: dimensions.height * (0.1 + Math.random() * 0.8)
    }));

    // Helper to get random distinct hub pair
    const getRandomHubPair = () => {
      const idx1 = Math.floor(Math.random() * numHubs);
      let idx2 = Math.floor(Math.random() * numHubs);
      while (idx1 === idx2) idx2 = Math.floor(Math.random() * numHubs);
      return { start: hubs[idx1], end: hubs[idx2] };
    };

    // Logistic routes using curved paths
    const numRoutes = 6;
    const activePoints: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      cpX: number; // control point X
      cpY: number; // control point Y
      progress: number;
      speed: number;
    }[] = Array.from({ length: numRoutes }).map(() => {
      const { start, end } = getRandomHubPair();
      const midX = (start.x + end.x) / 2;
      const midY = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const perpX = -dy / dist;
      const perpY = dx / dist;
      // The further apart, the higher the curve arch
      const offset = (Math.random() > 0.5 ? 1 : -1) * dist * 0.3;
      
      return {
        startX: start.x,
        startY: start.y,
        endX: end.x,
        endY: end.y,
        cpX: midX + perpX * offset,
        cpY: midY + perpY * offset,
        progress: -Math.random() * 5, // staggered start
        speed: 0.0008 + Math.random() * 0.0007
      };
    });

    let animationFrameId: number;

    // Bezier evaluation
    const getBezierPoint = (t: number, p0: number, p1: number, p2: number) => {
      return (1 - t) * (1 - t) * p0 + 2 * (1 - t) * t * p1 + t * t * p2;
    };

    function animate() {
      if (!ctx) return;
      ctx.clearRect(0, 0, dimensions.width, dimensions.height);

      // Draw background dots (Emerald/Green)
      ctx.fillStyle = "rgba(16, 185, 129, 0.2)"; // emerald-500
      mapDots.forEach(dot => {
        ctx.globalAlpha = dot.opacity;
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, 1, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Draw hubs
      ctx.fillStyle = "rgba(16, 185, 129, 0.4)";
      hubs.forEach(hub => {
        ctx.beginPath();
        ctx.arc(hub.x, hub.y, 2, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw active routes
      activePoints.forEach(p => {
        p.progress += p.speed;
        
        if (p.progress > 3.0) { // Allow time before respawning
          const { start, end } = getRandomHubPair();
          p.startX = start.x;
          p.startY = start.y;
          p.endX = end.x;
          p.endY = end.y;
          
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const perpX = -dy / dist;
          const perpY = dx / dist;
          const offset = (Math.random() > 0.5 ? 1 : -1) * dist * 0.3;
          
          p.cpX = midX + perpX * offset;
          p.cpY = midY + perpY * offset;
          p.progress = 0;
          p.speed = 0.0008 + Math.random() * 0.0007;
        }

        if (p.progress >= 0 && p.progress <= 1) {
          const x = getBezierPoint(p.progress, p.startX, p.cpX, p.endX);
          const y = getBezierPoint(p.progress, p.startY, p.cpY, p.endY);

          // Draw bezier curve trailing path
          ctx.beginPath();
          const trailLength = 0.15;
          const trailStart = Math.max(0, p.progress - trailLength);
          
          ctx.moveTo(
            getBezierPoint(trailStart, p.startX, p.cpX, p.endX),
            getBezierPoint(trailStart, p.startY, p.cpY, p.endY)
          );
          
          // Sample points for smooth curve trail
          for(let t = trailStart; t <= p.progress; t += 0.03) {
             ctx.lineTo(
               getBezierPoint(t, p.startX, p.cpX, p.endX),
               getBezierPoint(t, p.startY, p.cpY, p.endY)
             )
          }
          ctx.lineTo(x, y);

          ctx.strokeStyle = "rgba(16, 185, 129, 0.4)";
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          ctx.stroke();

          // Main pulse
          ctx.shadowBlur = 10;
          ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = "#10b981";
          ctx.fill();
          ctx.shadowBlur = 0;
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [dimensions]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
};

// --- Auth Component ---
function AuthContent({ initialError }: { initialError?: string | null }) {
  const searchParams = useSearchParams();
  const searchError = searchParams.get("error");
  const error = searchError || initialError || null;
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      console.error("Auth error:", error.message);
      setIsLoading(false);
    }
  };

  const getErrorMessage = (errorCode: string | null) => {
    switch (errorCode) {
      case "UnauthorizedAccess":
        return "You must be logged in to access this page.";
      case "DeactivatedAccount":
        return "Your account has been deactivated. Please contact support.";
      default:
        return null;
    }
  };

  const errorMessage = getErrorMessage(error);

  return (
    <div className="relative flex flex-col md:flex-row min-h-[100dvh] overflow-x-hidden">
      {/* Background Animation */}
      <div className="fixed inset-0 -z-10 pointer-events-none bg-slate-50/10">
        <DotMap />
      </div>

      {/* Left Column: Visuals & Branding */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden border-r border-slate-100/50">
        
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-8 md:p-12 lg:p-16 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="mb-8 p-4 rounded-3xl bg-white shadow-xl shadow-green-100/50 border border-green-50"
          >
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-green-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200">
              <TrendingUp className="text-white w-8 h-8" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="space-y-4 max-w-sm backdrop-blur-md bg-white/20 p-8 rounded-[2.5rem] border border-white/30 shadow-2xl shadow-green-100/20"
          >
            <h2 className="text-4xl font-bold tracking-tight text-slate-900">
              DigiFlow <span className="text-green-600">Agents</span>
            </h2>
            <p className="text-lg text-slate-600 font-medium leading-relaxed">
              Optimize your routes, market discovery at scale, and insights that power your business.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="absolute bottom-12 flex gap-8 text-slate-400"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest font-semibold text-emerald-600/60">Geo-Optimization</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest font-semibold text-emerald-600/60">Real-time Analytics</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Column: Auth Form */}
      <div className="flex-1 md:w-1/2 flex flex-col items-center justify-center p-6 md:p-8 lg:p-16 relative bg-transparent overflow-y-auto">
        {/* Subtle background items for mobile */}
        <div className="md:hidden absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_50%)]" />

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-[440px]"
        >
          <div className="flex flex-col items-center mb-10 md:hidden backdrop-blur-md bg-white/20 p-6 rounded-3xl border border-white/30 shadow-xl shadow-green-100/10">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 p-3 rounded-2xl bg-white shadow-xl shadow-green-100/50 border border-green-50"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-green-600 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-200">
                <TrendingUp className="text-white w-6 h-6" />
              </div>
            </motion.div>
            
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 mb-3 text-center">
              DigiFlow <span className="text-green-600">Agents</span>
            </h1>
            <p className="text-slate-600 font-medium text-center text-sm px-4 leading-relaxed">
              Optimize your routes, market discovery at scale, and insights that power your business.
            </p>
          </div>

          <Card className="border-slate-200/60 shadow-2xl shadow-slate-200/40 bg-white/90 backdrop-blur-md">
            <CardHeader className="space-y-2 pb-6 text-center md:text-left">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900">Sign In</CardTitle>
              <CardDescription className="text-slate-500 text-base">
                Access your DigiFlow dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <AnimatePresence mode="wait">
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 rounded-xl bg-amber-50 border border-amber-100 flex items-start gap-3"
                  >
                    <div className="mt-1 w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <p className="text-sm font-medium text-amber-800">{errorMessage}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-4">
                <Button
                  className="w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-2xl transition-all shadow-xl shadow-green-200 flex items-center justify-center gap-3 group"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                >
                  <Chrome className="h-6 w-6 group-hover:rotate-12 transition-transform" />
                  Continue with Google
                </Button>
                
                <p className="text-xs text-center text-slate-400 px-6 leading-relaxed">
                  By signing in, you agree to our <a href="https://www.novaworks.pro/terms" className="underline hover:text-slate-600">Terms of Service</a> and <a href="https://www.novaworks.pro/privacy" className="underline hover:text-slate-600">Privacy Policy</a>.
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

export function LoginView({ error }: { error?: string | null }) {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <AuthContent initialError={error} />
    </Suspense>
  );
}
