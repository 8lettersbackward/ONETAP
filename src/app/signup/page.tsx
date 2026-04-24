
"use client";

import { useState, useEffect } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
import { useAuth, useUser, useDatabase } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, UserPlus, Shield, Smartphone, Eye, EyeOff } from "lucide-react";
import { ref, set } from "firebase/database";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<"user" | "guardian">("user");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { user, loading: userLoading } = useUser();
  const rtdb = useDatabase();
  const { toast } = useToast();
  const router = useRouter();
  const auth = useAuth();

  useEffect(() => {
    if (!userLoading && user) {
      if (user.emailVerified) {
        router.push("/dashboard");
      } else {
        router.push("/verify-email");
      }
    }
  }, [user, userLoading, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Passwords do not match.",
      });
      return;
    }
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const newUser = userCredential.user;
      
      await sendEmailVerification(newUser);
      
      await set(ref(rtdb, `users/${newUser.uid}/profile`), {
        email: newUser.email,
        role: role,
        createdAt: Date.now(),
        displayName: email.split('@')[0]
      });

      toast({
        title: "Tactical Dispatch Sent",
        description: "Verification signature dispatched to your email (check spam messages).",
      });

      router.push("/verify-email");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Enlistment Failed",
        description: error.message || "Master identity creation error.",
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

  if (user && user.emailVerified) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <Card className="glass-card w-full max-w-md border-none rounded-[32px] p-8 space-y-8 relative z-10">
        <CardHeader className="space-y-4 text-center p-0">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20">
              <UserPlus className="h-8 w-8 text-secondary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight uppercase">Enlist</CardTitle>
            <CardDescription className="text-xs font-bold text-muted-foreground tracking-[0.2em] uppercase mt-2">Initialize Security Identity</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleSignup} className="space-y-6">
          <CardContent className="space-y-6 p-0">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Select Tactical Role</Label>
              <RadioGroup value={role} onValueChange={(val: any) => setRole(val)} className="grid grid-cols-2 gap-4">
                <div>
                  <RadioGroupItem value="user" id="user" className="peer sr-only" />
                  <Label
                    htmlFor="user"
                    className="flex flex-col items-center justify-between rounded-2xl border-2 border-primary/10 bg-primary/5 p-4 hover:bg-primary/10 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                  >
                    <Smartphone className="mb-2 h-6 w-6 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">User</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="guardian" id="guardian" className="peer sr-only" />
                  <Label
                    htmlFor="guardian"
                    className="flex flex-col items-center justify-between rounded-2xl border-2 border-primary/10 bg-primary/5 p-4 hover:bg-primary/10 peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer transition-all"
                  >
                    <Shield className="mb-2 h-6 w-6 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Guardian</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@agency.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-14 bg-primary/5 border-primary/10 rounded-2xl text-foreground placeholder:text-muted-foreground/40"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" title="Password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">PASSWORD</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-14 bg-primary/5 border-primary/10 rounded-2xl text-foreground pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password" title="Confirm" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">CONFIRM PASSWORD</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="h-14 bg-primary/5 border-primary/10 rounded-2xl text-foreground pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-6 p-0">
            <Button type="submit" className="w-full h-16 rounded-2xl text-sm font-bold uppercase bg-primary hover:bg-secondary tracking-[0.2em] shadow-lg shadow-primary/20 text-white" disabled={loading}>
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "SIGN UP"}
            </Button>
            <p className="text-xs text-center text-muted-foreground font-bold uppercase tracking-widest">
              Active identity?{" "}
              <Link href="/login" className="text-secondary hover:underline">
                Log in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
