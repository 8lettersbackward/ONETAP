"use client";

import Link from "next/link";
import { useUser, useAuth } from "@/firebase";
import { Button } from "@/components/ui/button";
import { signOut } from "firebase/auth";
import { Menu, X, User as UserIcon, Hexagon } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user } = useUser();
  const auth = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut(auth);
  };

  const currentEmailPrefix = user?.email ? user.email.split('@')[0] : "User";
  const currentName = user?.displayName || currentEmailPrefix;

  return (
    <nav className="fixed top-0 w-full z-50 neo-blur border-b border-black/5 h-16 bg-white/5">
      <div className="max-w-7xl mx-auto px-6 h-full">
        <div className="flex justify-between h-full items-center">
          <div className="flex-shrink-0">
            <Link href="/" className="flex items-center gap-3 text-primary group">
              <Hexagon className="h-7 w-7 transition-transform group-hover:rotate-45" fill="currentColor" fillOpacity={0.2} />
              <span className="font-bold tracking-tighter text-2xl uppercase text-foreground">1TAP</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-10">
            {user ? (
              <div className="flex items-center space-x-8">
                <div className="flex flex-col items-end">
                   <span className="text-[10px] font-bold uppercase tracking-widest text-primary leading-none mb-1">{currentName}</span>
                   <Link href="/dashboard" className="text-[8px] font-bold uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors">
                    TERMINAL
                  </Link>
                </div>
                <div className="h-6 w-[1px] bg-white/10" />
                <Link href="/profile">
                   <Button variant="ghost" size="icon" className="hover:bg-white/5 text-primary rounded-xl">
                     <UserIcon className="h-5 w-5" />
                   </Button>
                </Link>
                <Button variant="outline" size="sm" onClick={handleSignOut} className="border-white/10 rounded-2xl text-muted-foreground hover:bg-white/5 text-[10px] font-bold uppercase px-6 h-10 tracking-widest">
                  Log Out
                </Button>
              </div>
            ) : (
              <div className="flex items-center space-x-8">
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-transparent">Sign In</Button>
                </Link>
                <Link href="/signup">
                  <Button className="bg-primary hover:bg-secondary text-[10px] font-bold uppercase px-10 h-11 rounded-2xl tracking-[0.2em] shadow-lg">Get Started</Button>
                </Link>
              </div>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="p-2 text-foreground">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden glass-card mx-6 my-4 p-8 space-y-8 rounded-[32px] animate-in fade-in zoom-in-95 duration-200">
          {user ? (
            <>
              <div className="pb-6 border-b border-white/5">
                <p className="text-sm font-bold uppercase tracking-widest text-primary">{currentName}</p>
                <p className="text-[10px] font-mono text-muted-foreground mt-2">{user.email}</p>
              </div>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold uppercase tracking-[0.3em] text-foreground">TERMINAL</Link>
              <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold uppercase tracking-[0.3em] text-foreground">PROFILE</Link>
              <button onClick={handleSignOut} className="w-full text-left text-xs font-bold uppercase tracking-[0.3em] text-destructive">TERMINATE SESSION</button>
            </>
          ) : (
            <>
              <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold uppercase tracking-[0.3em] text-foreground">SIGN IN</Link>
              <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="block text-xs font-bold uppercase tracking-[0.3em] text-primary">GET STARTED</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}