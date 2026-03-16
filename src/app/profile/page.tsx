"use client";

import { useUser, useDatabase, useRtdb, useAuth } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { updatePassword, updateProfile, signOut } from "firebase/auth";
import { ref, set } from "firebase/database";
import { Loader2, User as UserIcon, Shield, Bell, LogOut, IdCard, Mail, Camera, ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [updating, setUpdating] = useState(false);

  const profileRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/profile`) : null, [rtdb, user]);
  const { data: profileData, loading: profileLoading } = useRtdb(profileRef);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
    if (user && !profileLoading && profileData) {
      setDisplayName(profileData.displayName || user.displayName || "");
      setAvatarUrl(profileData.avatarUrl || user.photoURL || "");
    }
  }, [user, userLoading, profileData, profileLoading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    setUpdating(true);
    
    try {
      await updateProfile(user, { 
        displayName: displayName,
        photoURL: avatarUrl 
      });

      const userProfileRef = ref(rtdb, `users/${user.uid}/profile`);
      await set(userProfileRef, {
        ...profileData,
        displayName,
        email: user.email,
        avatarUrl,
        updatedAt: Date.now()
      });

      toast({ 
        title: "Profile Synchronized", 
        description: `Identity updated to: ${displayName || (user.email ? user.email.split('@')[0] : 'Default Node')}` 
      });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Update Failed", 
        description: error.message 
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newPassword) return;
    setUpdating(true);
    try {
      await updatePassword(user, newPassword);
      setNewPassword("");
      toast({ 
        title: "Password Rotated", 
        description: "Your access keys are now updated." 
      });
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Security Update Failed", 
        description: "Please re-authenticate to verify ownership." 
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSignOut = () => {
    signOut(auth).then(() => router.push("/login"));
  };

  if (userLoading || profileLoading) return (
     <div className="flex items-center justify-center h-[80vh] bg-background">
      <div className="flex flex-col items-center">
        <Loader2 className="h-10 w-10 animate-spin text-accent mb-4" />
        <p className="text-[10px] uppercase tracking-widest font-bold text-accent">Accessing Vault</p>
      </div>
    </div>
  );

  if (!user) return null;

  const currentDisplayName = profileData?.displayName || user.displayName || (user.email ? user.email.split('@')[0] : "Anonymous Node");

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-background min-h-screen">
      <Button 
        variant="ghost" 
        onClick={() => router.push("/dashboard")} 
        className="mb-8 p-0 h-auto hover:bg-transparent text-[10px] uppercase font-bold tracking-widest flex items-center gap-2 group transition-all text-secondary"
      >
        <ArrowLeft className="h-3 w-3 transition-transform group-hover:-translate-x-1" />
        Back to Hub
      </Button>

      <header className="mb-12">
        <h1 className="text-4xl font-headline font-bold tracking-tighter uppercase mb-2 text-foreground">Account Hub</h1>
        <p className="text-muted-foreground text-sm tracking-wide uppercase">System identification and security protocols.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <aside className="space-y-4">
          <div className="p-8 border-2 border-dashed border-white/10 bg-card flex flex-col items-center text-center mb-6 rounded-xl shadow-xl">
            <Avatar className="h-28 w-28 rounded-none border-2 border-primary mb-4 shadow-[0_0_20px_rgba(72,149,239,0.3)]">
              <AvatarImage src={avatarUrl} alt={currentDisplayName} />
              <AvatarFallback className="rounded-none bg-primary text-primary-foreground text-3xl font-bold">
                {currentDisplayName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <p className="text-sm font-bold uppercase tracking-widest truncate w-full text-foreground">{currentDisplayName}</p>
            <p className="text-[10px] text-muted-foreground font-mono mt-2 truncate w-full">{user.email}</p>
          </div>

          <nav className="space-y-2">
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 font-bold uppercase text-[10px] tracking-widest shadow-lg">
              <UserIcon className="h-4 w-4" /> Identification
            </Button>
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-md hover:bg-card font-bold uppercase text-[10px] tracking-widest text-muted-foreground">
              <Shield className="h-4 w-4" /> Security
            </Button>
            <Separator className="my-6 border-white/10" />
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-md text-destructive hover:bg-destructive/10 font-bold uppercase text-[10px] tracking-widest" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Terminate Session
            </Button>
          </nav>
        </aside>

        <div className="md:col-span-2 space-y-10">
          <Card className="border-none shadow-2xl bg-card rounded-xl">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-sm uppercase font-bold tracking-[0.2em] text-secondary">Identification Profile</CardTitle>
              <CardDescription className="text-[10px] uppercase text-muted-foreground">Core system identity settings.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <IdCard className="h-3 w-3" /> Unique ID
                    </Label>
                    <Input value={user.uid} disabled className="bg-background border-none rounded-md h-12 font-mono text-[10px] text-secondary opacity-70" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" /> Master Email
                    </Label>
                    <Input value={user.email || ""} disabled className="bg-background border-none rounded-md h-12 font-mono text-[10px] text-secondary opacity-70" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="display-name" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Display Name / Identity</Label>
                  <Input 
                    id="display-name" 
                    placeholder="e.g. ALPHA-1" 
                    value={displayName} 
                    onChange={(e) => setDisplayName(e.target.value)} 
                    className="bg-background border-white/10 focus:border-primary h-14 uppercase text-sm font-bold tracking-widest"
                  />
                  <p className="text-[8px] text-muted-foreground uppercase">This name will be displayed across your terminal hub.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="avatar-url" className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 text-muted-foreground">
                    <Camera className="h-3 w-3" /> Avatar resource URL
                  </Label>
                  <Input 
                    id="avatar-url" 
                    placeholder="https://..." 
                    value={avatarUrl} 
                    onChange={(e) => setAvatarUrl(e.target.value)} 
                    className="bg-background border-white/10 focus:border-primary h-14 text-[10px] font-mono"
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-6 border-t border-white/10">
                <Button type="submit" disabled={updating} className="w-full h-16 bg-primary hover:bg-secondary uppercase font-bold tracking-[0.3em] text-xs shadow-2xl">
                  {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Synchronize Profile"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-none shadow-2xl bg-card rounded-xl">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-sm uppercase font-bold tracking-[0.2em] text-secondary">Security Protocol</CardTitle>
              <CardDescription className="text-[10px] uppercase text-muted-foreground">Rotate your access credentials.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdatePassword}>
              <CardContent className="space-y-4 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">New System Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    placeholder="••••••••"
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="bg-background border-white/10 focus:border-primary h-14"
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-6 border-t border-white/10">
                <Button type="submit" variant="outline" disabled={updating || !newPassword} className="w-full h-14 border-primary text-primary hover:bg-primary/10 uppercase font-bold tracking-[0.2em] text-[10px]">
                  Rotate Access Keys
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}