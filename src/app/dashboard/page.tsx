"use client";

import { useUser, useDatabase, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Settings, 
  Bell, 
  Cpu, 
  Smartphone,
  Loader2,
  Trash2,
  LogOut,
  UserPlus,
  Layers,
  PlusSquare,
  Eye,
  Eraser,
  Thermometer,
  Pencil,
  MapPin,
  AlertTriangle,
  Radar,
  ShieldAlert,
  Search,
  Check,
  X,
  ShieldCheck,
  UserCheck,
  Navigation,
  Hexagon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, set, push, remove, update, onChildAdded, off, onValue, get } from "firebase/database";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useRtdb } from "@/firebase/database/use-rtdb";
import { reverseGeocode } from "@/ai/flows/reverse-geocode-flow";

const SOSMap = dynamic(() => import("./sos-map"), { 
  ssr: false,
  loading: () => <div className="h-[200px] sm:h-[250px] md:h-[350px] w-full neo-inset animate-pulse flex items-center justify-center text-[10px] font-bold uppercase tracking-widest opacity-40">Initializing Terminal Map...</div>
});

type TabType = 'buddies' | 'nodes' | 'notifications' | 'settings' | 'guardian' | 'my-guardians';

const DEFAULT_BUDDY_GROUPS = ["Family", "Friend", "Close Friend"];

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { auth } = useFirebase();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('buddies');
  const [hasMounted, setHasMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    setHasMounted(true);
    if (!userLoading) {
      if (!user) {
        router.push("/login");
      } else if (!user.emailVerified) {
        router.push("/verify-email");
      }
    }
    
    if (user && rtdb) {
      const profileRef = ref(rtdb, `users/${user.uid}/profile`);
      get(profileRef).then(snapshot => {
        const profile = snapshot.val();
        const role = profile?.role || 'user';
        setUserRole(role);
        setActiveTab(role === 'guardian' ? 'guardian' : 'buddies');
      });
    }
  }, [user, userLoading, router, rtdb]);

  const notificationsRef = useMemo(() => user && user.emailVerified ? ref(rtdb, `users/${user.uid}/notifications`) : null, [rtdb, user]);
  const { data: notificationsData } = useRtdb(notificationsRef);

  const notifications = useMemo(() => notificationsData ? Object.entries(notificationsData).map(([id, val]: [string, any]) => ({ ...val, id, createdAt: val.createdAt || val.timestamp || 0 })).sort((a, b) => b.createdAt - a.createdAt) : [], [notificationsData]);

  const logOutTerminal = () => signOut(auth).then(() => router.push("/login"));

  if (userLoading || !hasMounted) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  const currentName = useMemo(() => user?.email?.split('@')[0] || "Personnel", [user]);

  const navItems = userRole === 'guardian' 
    ? [{ id: 'guardian', label: 'TACTICAL RADAR', icon: Radar }, { id: 'notifications', label: 'NOTIFICATION', icon: Bell }, { id: 'settings', label: 'PROFILE', icon: Settings }]
    : [{ id: 'buddies', label: 'MANAGE BUDDIES', icon: Smartphone }, { id: 'nodes', label: 'MANAGE NODES', icon: Cpu }, { id: 'my-guardians', label: 'MY GUARDIANS', icon: ShieldCheck }, { id: 'notifications', label: 'NOTIFICATION', icon: Bell }, { id: 'settings', label: 'PROFILE', icon: Settings }];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Sidebar based on reference image */}
      <aside className="w-full md:w-80 p-8 md:h-screen md:sticky top-0 z-40 border-r border-white/20 bg-background/50 flex flex-col justify-between">
        <div className="space-y-12">
          <div className="flex items-center gap-3 px-2">
            <div className="h-10 w-10 neo-flat flex items-center justify-center text-primary">
              <Hexagon className="h-6 w-6" />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase flex items-baseline gap-1">
              1TAP <span className="text-primary">BUDDY</span>
            </h1>
          </div>

          <nav className="flex flex-col gap-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={cn(
                  "flex items-center gap-4 px-6 py-4 transition-all text-[11px] font-bold uppercase tracking-[0.1em] relative group",
                  activeTab === item.id 
                    ? "neo-inset text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
                <span className="truncate">{item.label}</span>
                {notifications.length > 0 && item.id === 'notifications' && (
                  <span className="absolute top-1/2 -translate-y-1/2 right-6 h-2 w-2 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* Profile Card at bottom of sidebar */}
        <div className="mt-auto space-y-4">
          <div className="p-6 neo-flat space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 neo-inset">
                <AvatarFallback className="bg-transparent text-[10px] font-bold text-muted-foreground">{currentName[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black truncate uppercase tracking-widest">{currentName} TERMINAL</p>
                <p className="text-[9px] font-bold text-primary uppercase tracking-widest">{userRole}</p>
              </div>
            </div>
            <button 
              onClick={logOutTerminal}
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors pl-1"
            >
              <LogOut className="h-3 w-3" />
              DISCONNECT
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 md:p-16 w-full">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'buddies' && (
            <div className="space-y-12">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <h2 className="text-2xl font-black tracking-tight uppercase text-foreground/80">Manage Buddies</h2>
                <div className="flex gap-4">
                  <Button className="neo-btn h-11 px-6 text-[10px] font-bold uppercase tracking-widest bg-background text-muted-foreground hover:text-primary">
                    <PlusSquare className="h-4 w-4 mr-2" /> ENLIST
                  </Button>
                  <Button className="neo-btn h-11 px-6 text-[10px] font-bold uppercase tracking-widest bg-background text-primary">
                    <ShieldAlert className="h-4 w-4 mr-2" /> PROTOCOLS
                  </Button>
                </div>
              </div>

              {/* Neomorphic Content Card */}
              <div className="neo-flat p-10 min-h-[400px] flex items-center justify-center text-center">
                 <div className="space-y-6 opacity-30">
                   <Smartphone className="h-16 w-16 mx-auto" />
                   <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Operational Vault Empty</p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-12">
              <h2 className="text-2xl font-black tracking-tight uppercase text-foreground/80">Notification Stream</h2>
              <div className="neo-flat p-10">
                <ScrollArea className="h-[600px] pr-6">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] opacity-10">
                      <Bell className="h-16 w-16 mb-6" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Telemetry Clear</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="mb-8 p-8 neo-flat bg-background/20">
                        <div className="flex justify-between items-start">
                          <div className="flex gap-4 items-center">
                            {n.type === 'sos' ? <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" /> : <Radar className="h-5 w-5 text-primary" />}
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest">{n.message}</p>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                            </div>
                          </div>
                          <Badge className="neo-btn bg-background text-[8px] font-bold px-4 py-1 uppercase">{n.type}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Placeholder for other tabs */}
          {activeTab !== 'buddies' && activeTab !== 'notifications' && (
            <div className="space-y-12">
               <h2 className="text-2xl font-black tracking-tight uppercase text-foreground/80">{activeTab.replace('-', ' ')}</h2>
               <div className="neo-flat p-20 flex items-center justify-center opacity-20">
                 <p className="text-[10px] font-bold uppercase tracking-[0.5em]">Terminal Section Initializing...</p>
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}