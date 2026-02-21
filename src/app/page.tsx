
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
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Prevent flash of content if user is logged in
  if (user) return null;

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center px-4 bg-background">
        <div className="max-w-4xl text-center">
          <div className="flex justify-center mb-6 animate-in fade-in zoom-in duration-1000">
            <ShieldAlert className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-6xl md:text-8xl font-headline font-bold tracking-tighter mb-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
            1TAP <br /> <span className="text-muted-foreground uppercase">Emergency Buddy</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
            Instant safety orchestration and emergency response. Pure clarity, absolute protection in a single tap.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in fade-in slide-in-from-bottom-12 duration-1000 delay-500">
            <Link href="/signup">
              <Button size="lg" className="px-10 h-14 text-lg font-bold rounded-none">
                Secure My Life <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline" className="px-10 h-14 text-lg font-bold rounded-none">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Simplified Footer */}
      <footer className="py-8 border-t text-center text-muted-foreground text-xs tracking-widest uppercase">
        <div className="max-w-7xl mx-auto px-4">
          <p>© 2024 1tap. Clarity in Protection.</p>
        </div>
      </footer>
    </div>
  );
}
