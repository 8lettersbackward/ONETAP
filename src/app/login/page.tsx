"use client";

import { useState, useEffect } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useAuth, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!userLoading && user) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: error.message || "Credential verification failed.",
      });
    } finally {
      setLoading(false);
    }
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6">
      <Card className="glass-card w-full max-w-md border-none rounded-[32px] p-8 space-y-8 bg-white/60">
        <CardHeader className="space-y-4 text-center p-0">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center border border-primary/20">
              <ShieldCheck className="h-8 w-8 text-primary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight text-foreground uppercase">Access Hub</CardTitle>
            <CardDescription className="text-xs font-bold text-muted-foreground tracking-[0.2em] uppercase mt-2">Verified Personnel Only</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin} className="space-y-6">
          <CardContent className="space-y-6 p-0">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Terminal Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-black/5 border-black/10 rounded-2xl text-foreground placeholder:text-black/20"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <Label htmlFor="password" title="Password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Access Key</Label>
                <Link href="#" className="text-[10px] text-primary font-bold uppercase hover:opacity-80">Reset</Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-14 bg-black/5 border-black/10 rounded-2xl text-foreground"
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-6 p-0">
            <Button type="submit" className="w-full h-16 rounded-2xl text-sm font-bold uppercase bg-primary hover:bg-secondary tracking-[0.2em] shadow-lg" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Initiate Access"}
            </Button>
            <p className="text-xs text-center text-muted-foreground font-bold">
              UNARMED?{" "}
              <Link href="/signup" className="text-primary hover:underline">
                ENLIST NOW
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}