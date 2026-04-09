
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
import { updateProfile, signOut, updatePassword } from "firebase/auth";
import { ref, set, remove } from "firebase/database";
import { 
  Loader2, 
  User as UserIcon, 
  LogOut, 
  IdCard, 
  Mail, 
  ArrowLeft, 
  Lock, 
  KeyRound,
  Trash2,
  AlertTriangle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function ProfilePage() {
  const { user, loading: userLoading } = useUser();
  const auth = useAuth();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [displayName, setDisplayName] = useState("");
  const [updating, setUpdating] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const profileRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/profile`) : null, [rtdb, user]);
  const { data: profileData, loading: profileLoading } = useRtdb(profileRef);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
    if (user && !profileLoading && profileData) {
      setDisplayName(profileData.displayName || user.displayName || "");
    }
  }, [user, userLoading, profileData, profileLoading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    setUpdating(true);
    
    try {
      await updateProfile(user, { 
        displayName: displayName
      });

      const userProfileRef = ref(rtdb, `users/${user.uid}/profile`);
      await set(userProfileRef, {
        ...profileData,
        displayName,
        email: user.email,
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (newPassword !== confirmNewPassword) {
      toast({ variant: "destructive", title: "Validation Error", description: "Passwords do not match." });
      return;
    }
    if (newPassword.length < 6) {
      toast({ variant: "destructive", title: "Security Alert", description: "Password must be at least 6 characters." });
      return;
    }
    
    setUpdatingPassword(true);
    try {
      await updatePassword(user, newPassword);
      toast({ 
        title: "Password Synchronized", 
        description: "Your account password has been updated successfully." 
      });
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({ 
          variant: "destructive", 
          title: "Re-authentication Required", 
          description: "For security, please sign out and sign back in to change your password." 
        });
      } else {
        toast({ 
          variant: "destructive", 
          title: "Update Failed", 
          description: error.message 
        });
      }
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handlePurgeAccount = async () => {
    if (!user || !rtdb) return;
    setUpdating(true);
    try {
      const userRef = ref(rtdb, `users/${user.uid}`);
      await remove(userRef);
      toast({ title: "Master Purge Complete", description: "All tactical data has been decommissioned." });
      signOut(auth).then(() => router.push("/login"));
    } catch (error: any) {
      toast({ variant: "destructive", title: "Purge Failed", description: error.message });
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
        <p className="text-muted-foreground text-sm tracking-wide uppercase">System identification and hub protocols.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
        <aside className="space-y-4">
          <div className="p-8 border-2 border-dashed border-white/10 bg-white flex flex-col items-center text-center mb-6 rounded-xl shadow-xl">
            <Avatar className="h-28 w-28 rounded-none border-2 border-primary mb-4 shadow-[0_0_20px_rgba(72,149,239,0.3)]">
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
            <Separator className="my-6 border-white/10" />
            <Button variant="ghost" className="w-full justify-start gap-3 rounded-md text-destructive hover:bg-destructive/10 font-bold uppercase text-[10px] tracking-widest" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" /> Terminate Session
            </Button>
          </nav>
        </aside>

        <div className="md:col-span-2 space-y-10">
          <Card className="border-none shadow-2xl bg-white rounded-xl">
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
              </CardContent>
              <CardFooter className="pt-6 border-t border-white/10">
                <Button type="submit" disabled={updating} className="w-full h-16 bg-primary hover:bg-secondary uppercase font-bold tracking-[0.3em] text-xs shadow-2xl">
                  {updating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Synchronize Profile"}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-none shadow-2xl bg-white rounded-xl">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-sm uppercase font-bold tracking-[0.2em] text-secondary flex items-center gap-2">
                <Lock className="h-4 w-4" /> Change Password
              </CardTitle>
              <CardDescription className="text-[10px] uppercase text-muted-foreground">Update your master account password.</CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-6 pt-6">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password"
                    placeholder="••••••••" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                    className="bg-background border-white/10 focus:border-primary h-14"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-new-password" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Confirm New Password</Label>
                  <Input 
                    id="confirm-new-password" 
                    type="password"
                    placeholder="••••••••" 
                    value={confirmNewPassword} 
                    onChange={(e) => setConfirmNewPassword(e.target.value)} 
                    className="bg-background border-white/10 focus:border-primary h-14"
                    required
                  />
                </div>
              </CardContent>
              <CardFooter className="pt-6 border-t border-white/10">
                <Button type="submit" disabled={updatingPassword} className="w-full h-16 bg-accent hover:bg-accent/90 uppercase font-bold tracking-[0.3em] text-xs shadow-2xl text-white">
                  {updatingPassword ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><KeyRound className="mr-2 h-4 w-4" /> Change Password</>}
                </Button>
              </CardFooter>
            </form>
          </Card>

          <Card className="border-none shadow-2xl bg-white rounded-xl">
            <CardHeader className="border-b border-white/10">
              <CardTitle className="text-sm uppercase font-bold tracking-[0.2em] text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" /> Master Purge Protocol
              </CardTitle>
              <CardDescription className="text-[10px] uppercase text-muted-foreground">Irreversibly erase all tactical data from the network.</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="p-6 bg-destructive/5 rounded-2xl border border-destructive/10">
                 <p className="text-[10px] font-bold text-destructive uppercase tracking-widest mb-2">Warning: Absolute Erasure</p>
                 <p className="text-[10px] leading-relaxed opacity-60">Initiating this protocol will permanently wipe your Buddies, Nodes, Protocols, and Notifications from the database. This action cannot be undone.</p>
              </div>
            </CardContent>
            <CardFooter className="pt-6 border-t border-white/10">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="w-full h-16 bg-destructive hover:bg-destructive/90 uppercase font-bold tracking-[0.3em] text-xs shadow-2xl text-white">
                    <Trash2 className="mr-2 h-4 w-4" /> ERASE TACTICAL FOOTPRINT
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white border border-destructive/10 shadow-xl rounded-[2rem] p-10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-xl font-bold uppercase tracking-widest text-destructive">Confirm Master Purge?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium">Are you absolutely sure? All tactical data associated with your identity will be permanently decommissioned from the Realtime Database.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter className="mt-8 flex gap-4">
                    <AlertDialogCancel className="rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest flex-1">Abort</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePurgeAccount} className="rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest flex-1 bg-destructive hover:bg-destructive text-white">Confirm ERASE</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardFooter>
          </Card>
        </div>
      </div>
    </div>
  );
}
