
"use client";

import { useState, useEffect } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { useAuth, useUser } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { Loader2, Mail, RefreshCw, LogOut } from "lucide-react";

export default function VerifyEmailPage() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
    if (user && user.emailVerified) {
      router.push("/dashboard");
    }
  }, [user, userLoading, router]);

  const handleResend = async () => {
    if (!user) return;
    setResending(true);
    try {
      await sendEmailVerification(user);
      toast({
        title: "Dispatch Synchronized",
        description: "A new tactical verification signature has been dispatched.",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Dispatch Error",
        description: error.message || "Failed to resend verification email.",
      });
    } finally {
      setResending(false);
    }
  };

  const checkVerificationStatus = async () => {
    if (!user) return;
    setChecking(true);
    try {
      await user.reload();
      if (user.emailVerified) {
        toast({
          title: "Identity Confirmed",
          description: "Spatial access granted to the terminal hub.",
        });
        router.push("/dashboard");
      } else {
        toast({
          title: "Signature Pending",
          description: "Identity confirmation still outstanding in the network.",
        });
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setChecking(false);
    }
  };

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || user.emailVerified) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-6 relative">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <Card className="glass-card w-full max-w-md border-none rounded-[32px] p-8 space-y-8 relative z-10">
        <CardHeader className="space-y-4 text-center p-0">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-primary/20 rounded-2xl flex items-center justify-center border border-primary/20">
              <Mail className="h-8 w-8 text-secondary" />
            </div>
          </div>
          <div>
            <CardTitle className="text-3xl font-bold tracking-tight uppercase">Confirm Identity</CardTitle>
            <CardDescription className="text-xs font-bold text-muted-foreground tracking-[0.2em] uppercase mt-2">Tactical verification dispatched to <br/> <span className="text-primary">{user.email}</span></CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-0 text-center">
          <p className="text-sm text-muted-foreground leading-relaxed">
            A confirmation signature has been sent to your master email. Please verify your identity on spam messages to initialize terminal hub access.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col space-y-4 p-0">
          <Button 
            onClick={checkVerificationStatus} 
            className="w-full h-16 rounded-2xl text-sm font-bold uppercase bg-primary hover:bg-secondary tracking-[0.2em] shadow-lg shadow-primary/20 text-white" 
            disabled={checking}
          >
            {checking ? <Loader2 className="h-5 w-5 animate-spin" /> : <><RefreshCw className="h-4 w-4 mr-3" /> Sync Status</>}
          </Button>
          <Button 
            variant="ghost" 
            onClick={handleResend} 
            className="w-full h-12 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary" 
            disabled={resending}
          >
            {resending ? "Resending Dispatch..." : "Resend Tactical Signature"}
          </Button>
          <div className="w-full pt-4 border-t border-primary/5">
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              className="w-full h-12 rounded-2xl border-primary/10 text-destructive hover:bg-destructive/5 text-[10px] font-bold uppercase tracking-widest"
            >
              <LogOut className="h-4 w-4 mr-3" /> Terminate Session
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
