"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { ArrowRight, ShieldAlert, Loader2 } from "lucide-react";

export default function Home() {
  const { user, loading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex flex-col min-h-screen bg-background overflow-hidden relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      
      <section className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="max-w-4xl text-center space-y-12">
          <div className="flex justify-center">
            <div className="h-24 w-24 glass-card rounded-[32px] flex items-center justify-center shadow-lg border-primary/20">
              <ShieldAlert className="h-12 w-12 text-secondary" />
            </div>
          </div>
          
          <div className="space-y-6">
            <h1 className="text-6xl md:text-9xl font-bold tracking-tighter text-foreground leading-none">
              1TAP <br /> <span className="text-secondary uppercase tracking-[0.1em]">EMERGENCY BUDDY</span>
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto font-medium leading-relaxed">
              Professional safety orchestration. <br className="hidden md:block" /> Secure protection in a single tap.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Link href="/signup">
              <Button size="lg" className="px-12 h-16 text-sm font-bold uppercase bg-primary hover:bg-secondary rounded-2xl tracking-[0.2em] shadow-lg shadow-primary/20 text-white">
                SECURE MY LIFE <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="ghost" className="glass-card px-12 h-16 text-sm font-bold uppercase rounded-2xl border-primary/20 text-foreground tracking-[0.2em] hover:bg-primary/5">
                SIGN IN
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-12 border-t border-primary/5 text-center text-muted-foreground/40 text-[10px] tracking-[0.3em] uppercase relative z-10">
        <div className="max-w-7xl mx-auto px-6">
          <p>© 2024 1TAP SECURE. PRECISION IN PROTECTION.</p>
        </div>
      </footer>
    </div>
  );
}