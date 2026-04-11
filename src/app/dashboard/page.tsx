
"use client";

import { useUser, useDatabase, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
  PlusSquare,
  Eye,
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
  Navigation,
  Hexagon,
  ChevronRight,
  Phone,
  Layers,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, set, push, remove, update, onChildAdded, off, onValue, get } from "firebase/database";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useRtdb } from "@/firebase/database/use-rtdb";
import { Checkbox } from "@/components/ui/checkbox";

const SOSMap = dynamic(() => import("./sos-map"), { 
  ssr: false,
  loading: () => <div className="h-[200px] sm:h-[250px] md:h-[350px] w-full neo-inset animate-pulse flex items-center justify-center text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">Initializing Terminal Map...</div>
});

type TabType = 'buddies' | 'nodes' | 'notifications' | 'settings' | 'guardian';

interface Buddy {
  id: string;
  name: string;
  phoneNumber: string;
  groups?: string[];
}

interface Node {
  id: string;
  nodeName: string;
  hardwareId: string;
  status: 'online' | 'offline' | 'error';
  temperature?: number;
  place?: string;
  targetGroups?: string[];
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { auth } = useFirebase();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('buddies');
  const [hasMounted, setHasMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  // CRUD States
  const [isBuddyDialogOpen, setIsBuddyDialogOpen] = useState(false);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false);
  const [editingBuddy, setEditingBuddy] = useState<Buddy | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  
  // SOS Intercept States
  const [interceptAlert, setInterceptAlert] = useState<any>(null);

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

      // Global SOS Listener
      const notifRef = ref(rtdb, `users/${user.uid}/notifications`);
      const listener = onChildAdded(notifRef, (snapshot) => {
        const val = snapshot.val();
        const now = Date.now();
        const timestamp = val.timestamp || val.createdAt || 0;
        
        // Only intercept fresh SOS signals that aren't TrackResponses
        if (val.type === 'sos' && val.trigger !== 'TrackResponse' && (now - timestamp < 30000)) {
          setInterceptAlert({ ...val, id: snapshot.key });
        }
      });

      return () => off(notifRef, 'child_added', listener);
    }
  }, [user, userLoading, router, rtdb]);

  const buddiesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddies`) : null, [rtdb, user]);
  const nodesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/nodes`) : null, [rtdb, user]);
  const groupsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddyGroups`) : null, [rtdb, user]);
  const notificationsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/notifications`) : null, [rtdb, user]);

  const { data: buddiesData } = useRtdb(buddiesRef);
  const { data: nodesData } = useRtdb(nodesRef);
  const { data: groupsData } = useRtdb(groupsRef);
  const { data: notificationsData } = useRtdb(notificationsRef);

  const buddies = useMemo(() => buddiesData ? Object.entries(buddiesData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [buddiesData]);
  const nodes = useMemo(() => nodesData ? Object.entries(nodesData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [nodesData]);
  const groups = useMemo(() => groupsData ? Object.entries(groupsData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [groupsData]);
  const notifications = useMemo(() => notificationsData ? Object.entries(notificationsData).map(([id, val]: [string, any]) => ({ ...val, id, createdAt: val.createdAt || val.timestamp || 0 })).sort((a, b) => b.createdAt - a.createdAt) : [], [notificationsData]);

  const currentName = useMemo(() => user?.email?.split('@')[0] || "Personnel", [user]);

  const navItems = useMemo(() => {
    return userRole === 'guardian' 
      ? [{ id: 'guardian', label: 'RADAR', icon: Radar }, { id: 'notifications', label: 'ALERTS', icon: Bell }, { id: 'settings', label: 'PROFILE', icon: Settings }]
      : [{ id: 'buddies', label: 'BUDDIES', icon: Smartphone }, { id: 'nodes', label: 'NODES', icon: Cpu }, { id: 'notifications', label: 'ALERTS', icon: Bell }, { id: 'settings', label: 'PROFILE', icon: Settings }];
  }, [userRole]);

  const logOutTerminal = () => signOut(auth).then(() => router.push("/login"));

  // CRUD Actions
  const handleSaveBuddy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    const formData = new FormData(e.currentTarget);
    const buddyData = {
      name: formData.get('name') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      groups: [] as string[]
    };

    try {
      if (editingBuddy) {
        await update(ref(rtdb, `users/${user.uid}/buddies/${editingBuddy.id}`), buddyData);
        toast({ title: "Personnel Updated", description: "Identity signature synchronized." });
      } else {
        await push(ref(rtdb, `users/${user.uid}/buddies`), buddyData);
        toast({ title: "Personnel Enlisted", description: "New buddy added to vault." });
      }
      setIsBuddyDialogOpen(false);
      setEditingBuddy(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Vault Error", description: err.message });
    }
  };

  const handleSaveNode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    const formData = new FormData(e.currentTarget);
    const nodeData = {
      nodeName: formData.get('nodeName') as string,
      hardwareId: formData.get('hardwareId') as string,
      status: 'offline',
      temperature: 24.5,
      place: formData.get('place') as string || 'Unknown Sector'
    };

    try {
      if (editingNode) {
        await update(ref(rtdb, `users/${user.uid}/nodes/${editingNode.id}`), nodeData);
        toast({ title: "Node Updated", description: "Hardware configuration synchronized." });
      } else {
        await push(ref(rtdb, `users/${user.uid}/nodes`), nodeData);
        toast({ title: "Node Armed", description: "New hardware asset registered." });
      }
      setIsNodeDialogOpen(false);
      setEditingNode(null);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Hardware Error", description: err.message });
    }
  };

  const handleAddGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('groupName') as string;
    try {
      await push(ref(rtdb, `users/${user.uid}/buddyGroups`), { name });
      toast({ title: "Protocol Created", description: `Security group '${name}' initialized.` });
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Protocol Error", description: err.message });
    }
  };

  const deleteBuddy = async (id: string) => {
    if (!user || !rtdb) return;
    try {
      await remove(ref(rtdb, `users/${user.uid}/buddies/${id}`));
      toast({ title: "Personnel Purged", description: "Identity signature removed from vault." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Error", description: err.message });
    }
  };

  const deleteNode = async (id: string) => {
    if (!user || !rtdb) return;
    try {
      await remove(ref(rtdb, `users/${user.uid}/nodes/${id}`));
      toast({ title: "Node Decommissioned", description: "Hardware asset removed from network." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Error", description: err.message });
    }
  };

  const deleteGroup = async (id: string) => {
    if (!user || !rtdb) return;
    try {
      await remove(ref(rtdb, `users/${user.uid}/buddyGroups/${id}`));
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Error", description: err.message });
    }
  };

  if (userLoading || !hasMounted) return <div className="flex items-center justify-center min-h-screen bg-background"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-around items-center p-4 bg-background/80 backdrop-blur-md border-t border-black/5 pb-8">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all text-[8px] font-bold uppercase tracking-widest relative px-2",
              activeTab === item.id 
                ? "text-primary scale-110" 
                : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
            <span>{item.label}</span>
            {notifications.length > 0 && item.id === 'notifications' && (
              <span className="absolute top-0 right-1 h-1.5 w-1.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 p-6 h-screen sticky top-0 z-40 border-r border-black/5 bg-background/50 flex-col justify-between">
        <div className="space-y-10">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 neo-flat flex items-center justify-center text-primary shrink-0">
              <Hexagon className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase flex items-baseline gap-1 text-foreground">
              1TAP <span className="text-primary">BUDDY</span>
            </h1>
          </div>

          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-all text-[10px] font-bold uppercase tracking-[0.1em] relative group whitespace-nowrap",
                  activeTab === item.id 
                    ? "neo-inset text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
                {notifications.length > 0 && item.id === 'notifications' && (
                  <span className="absolute top-1/2 -translate-y-1/2 right-6 h-1.5 w-1.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="mt-auto">
          <div className="p-5 neo-flat space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 neo-inset shrink-0">
                <AvatarFallback className="bg-transparent text-[9px] font-bold text-foreground">{currentName[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black truncate uppercase tracking-widest text-foreground">{currentName}</p>
                <p className="text-[8px] font-bold text-primary uppercase tracking-widest">{userRole}</p>
              </div>
            </div>
            <button 
              onClick={logOutTerminal}
              className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors pl-1"
            >
              <LogOut className="h-3 w-3" />
              DISCONNECT
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-8 md:p-8 w-full pb-32 md:pb-8">
        <div className="max-w-6xl mx-auto mt-4 md:mt-0">
          {activeTab === 'buddies' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Manage Buddies</h2>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button onClick={() => { setEditingBuddy(null); setIsBuddyDialogOpen(true); }} className="neo-btn flex-1 sm:flex-none h-10 px-4 text-[9px] font-bold uppercase tracking-widest bg-background text-foreground hover:text-primary">
                    <PlusSquare className="h-4 w-4 mr-2" /> ENLIST
                  </Button>
                  <Button onClick={() => setIsProtocolDialogOpen(true)} className="neo-btn flex-1 sm:flex-none h-10 px-4 text-[9px] font-bold uppercase tracking-widest bg-background text-primary">
                    <ShieldAlert className="h-4 w-4 mr-2" /> PROTOCOLS
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buddies.length === 0 ? (
                  <div className="col-span-full neo-flat p-12 text-center opacity-30 flex flex-col items-center">
                    <Smartphone className="h-12 w-12 mb-6" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.4em]">Operational Vault Empty</p>
                  </div>
                ) : (
                  buddies.map(buddy => (
                    <div key={buddy.id} className="neo-flat p-6 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <Avatar className="h-10 w-10 neo-inset">
                            <AvatarFallback className="bg-transparent text-[10px] font-black">{buddy.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">{buddy.name}</p>
                            <p className="text-[8px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{buddy.phoneNumber}</p>
                          </div>
                        </div>
                        <Badge className="neo-btn bg-background text-[7px] font-bold px-2 py-0.5 uppercase">ID-{buddy.id.slice(-4)}</Badge>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-primary" onClick={() => { setEditingBuddy(buddy); setIsBuddyDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-destructive" onClick={() => deleteBuddy(buddy.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-foreground ml-auto">
                          <Phone className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'nodes' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Manage Nodes</h2>
                <Button onClick={() => { setEditingNode(null); setIsNodeDialogOpen(true); }} className="neo-btn w-full sm:w-auto h-10 px-4 text-[9px] font-bold uppercase tracking-widest bg-background text-foreground hover:text-primary">
                  <Cpu className="h-4 w-4 mr-2" /> ARM NODE
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nodes.length === 0 ? (
                  <div className="col-span-full neo-flat p-12 text-center opacity-30 flex flex-col items-center">
                    <Activity className="h-12 w-12 mb-6" />
                    <p className="text-[9px] font-bold uppercase tracking-[0.4em]">No Active Assets</p>
                  </div>
                ) : (
                  nodes.map(node => (
                    <div key={node.id} className="neo-flat p-6 space-y-6">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <div className={cn("h-10 w-10 neo-inset flex items-center justify-center", node.status === 'online' ? "text-primary" : "text-muted-foreground")}>
                            <Cpu className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest">{node.nodeName}</p>
                            <p className="text-[8px] font-bold text-muted-foreground mt-1 uppercase tracking-widest">{node.hardwareId}</p>
                          </div>
                        </div>
                        <Badge className={cn("text-[7px] font-bold px-3 py-1 uppercase rounded-full border-none", node.status === 'online' ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                          {node.status}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="neo-inset p-3 space-y-1 text-center">
                          <Thermometer className="h-3 w-3 mx-auto text-primary/60" />
                          <p className="text-[8px] font-black text-foreground">{node.temperature || '--'}°C</p>
                        </div>
                        <div className="neo-inset p-3 space-y-1 text-center">
                          <MapPin className="h-3 w-3 mx-auto text-primary/60" />
                          <p className="text-[8px] font-black text-foreground truncate">{node.place || 'Unknown'}</p>
                        </div>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-primary" onClick={() => { setEditingNode(node); setIsNodeDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-destructive" onClick={() => deleteNode(node.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-foreground ml-auto">
                          <Activity className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Alert Stream</h2>
              <div className="neo-flat p-6 sm:p-8">
                <ScrollArea className="h-[500px] pr-4">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] opacity-10">
                      <Bell className="h-12 w-12 mb-6 text-foreground" />
                      <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-foreground">Telemetry Clear</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="mb-6 p-6 neo-flat bg-background/20 relative group overflow-hidden">
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
                          <div className="flex gap-4 items-center">
                            {n.type === 'sos' ? (
                              <div className="h-10 w-10 neo-inset flex items-center justify-center text-destructive animate-pulse">
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 neo-inset flex items-center justify-center text-primary">
                                <Radar className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed text-foreground">{n.message || 'Incoming Telemetry Fix'}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <p className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">{new Date(n.createdAt).toLocaleString()}</p>
                                {n.place && (
                                  <Badge variant="outline" className="text-[7px] border-none bg-primary/10 text-primary py-0 px-2 font-bold uppercase">{n.place}</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2 w-full sm:w-auto">
                            <Button size="sm" className="neo-btn flex-1 sm:flex-none h-8 px-4 text-[8px] font-bold uppercase tracking-widest bg-background text-foreground hover:text-primary">
                              <Eye className="h-3.5 w-3.5 mr-2" /> TACTICAL MAP
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {activeTab === 'guardian' && (
            <div className="space-y-8">
              <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Guardian Hub</h2>
              <div className="neo-flat p-8 min-h-[400px] flex items-center justify-center text-center">
                 <div className="space-y-6 opacity-30">
                   <Radar className="h-12 w-12 mx-auto text-foreground" />
                   <p className="text-[9px] font-bold uppercase tracking-[0.4em] text-foreground">Terminal Section Initializing...</p>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
               <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Personnel Profile</h2>
               <div className="neo-flat p-12 flex flex-col items-center gap-8">
                  <div className="h-32 w-32 neo-inset flex items-center justify-center text-4xl font-black text-primary">
                    {currentName[0].toUpperCase()}
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-black uppercase tracking-[0.2em]">{currentName}</p>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{user.email}</p>
                  </div>
                  <Button onClick={() => router.push('/profile')} className="neo-btn h-12 px-8 text-[10px] font-bold uppercase tracking-[0.3em] bg-background text-foreground hover:text-primary">
                    <Settings className="h-4 w-4 mr-3" /> CONFIGURE TERMINAL
                  </Button>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* SOS Intercept Modal */}
      <Dialog open={!!interceptAlert} onOpenChange={() => setInterceptAlert(null)}>
        <DialogContent className="max-w-2xl neo-flat p-0 border-none bg-[#ECF0F3] [&>button]:hidden flex flex-col overflow-hidden max-h-[90vh]">
          <DialogHeader className="p-8 pb-4 flex-shrink-0">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 neo-inset flex items-center justify-center text-destructive animate-pulse">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">Tactical SOS Intercept</DialogTitle>
                  <p className="text-[9px] font-bold text-destructive uppercase tracking-widest mt-1">High Intensity Alert Active</p>
                </div>
              </div>
              <Badge className="bg-destructive text-white border-none text-[8px] font-bold px-4 py-1 animate-pulse uppercase">Critical</Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 pb-8 space-y-6">
            <div className="neo-inset p-6 space-y-4">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 neo-flat flex items-center justify-center text-foreground">
                   <Smartphone className="h-5 w-5" />
                 </div>
                 <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">{interceptAlert?.message}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div className="neo-flat bg-background/50 p-4 space-y-1">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Sector Fix</p>
                    <p className="text-[10px] font-black uppercase">{interceptAlert?.place || 'Unknown Sector'}</p>
                 </div>
                 <div className="neo-flat bg-background/50 p-4 space-y-1">
                    <p className="text-[8px] font-bold text-muted-foreground uppercase">Signal Time</p>
                    <p className="text-[10px] font-black uppercase">{interceptAlert && new Date(interceptAlert.createdAt).toLocaleTimeString()}</p>
                 </div>
              </div>
            </div>

            {interceptAlert?.latitude && (
              <div className="neo-flat overflow-hidden">
                <SOSMap 
                  latitude={interceptAlert.latitude} 
                  longitude={interceptAlert.longitude} 
                  label="SOS ORIGIN"
                />
              </div>
            )}
          </div>

          <div className="p-8 pt-4 border-t border-black/5 flex-shrink-0">
            <Button 
              onClick={() => setInterceptAlert(null)}
              className="w-full h-16 neo-btn bg-background text-destructive hover:bg-destructive hover:text-white text-[11px] font-bold uppercase tracking-[0.4em] transition-all"
            >
              CLOSE COMMAND
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Buddy CRUD Dialog */}
      <Dialog open={isBuddyDialogOpen} onOpenChange={setIsBuddyDialogOpen}>
        <DialogContent className="neo-flat p-8 border-none bg-[#ECF0F3] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">
              {editingBuddy ? "Edit Personnel" : "Enlist Personnel"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBuddy} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Personnel Name</Label>
              <Input name="name" defaultValue={editingBuddy?.name} required className="h-12 neo-inset bg-background text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Contact Signal (Phone)</Label>
              <Input name="phoneNumber" defaultValue={editingBuddy?.phoneNumber} required className="h-12 neo-inset bg-background text-foreground" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-14 neo-btn bg-background text-foreground hover:text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                {editingBuddy ? "SYNCHRONIZE" : "INITIALIZE"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Node CRUD Dialog */}
      <Dialog open={isNodeDialogOpen} onOpenChange={setIsNodeDialogOpen}>
        <DialogContent className="neo-flat p-8 border-none bg-[#ECF0F3] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">
              {editingNode ? "Edit Node" : "Arm New Node"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNode} className="space-y-6 mt-4">
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Asset Name</Label>
              <Input name="nodeName" defaultValue={editingNode?.nodeName} required className="h-12 neo-inset bg-background text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Hardware ID Signature</Label>
              <Input name="hardwareId" defaultValue={editingNode?.hardwareId} required className="h-12 neo-inset bg-background text-foreground" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Deployment Sector (Place)</Label>
              <Input name="place" defaultValue={editingNode?.place} placeholder="e.g. Master Bedroom" className="h-12 neo-inset bg-background text-foreground" />
            </div>
            <DialogFooter className="pt-4">
              <Button type="submit" className="w-full h-14 neo-btn bg-background text-foreground hover:text-primary text-[10px] font-bold uppercase tracking-[0.2em]">
                {editingNode ? "SYNCHRONIZE" : "ARM ASSET"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Protocols Dialog */}
      <Dialog open={isProtocolDialogOpen} onOpenChange={setIsProtocolDialogOpen}>
        <DialogContent className="neo-flat p-8 border-none bg-[#ECF0F3] max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">Security Protocols</DialogTitle>
          </DialogHeader>
          <div className="space-y-8 mt-4">
            <form onSubmit={handleAddGroup} className="space-y-3">
              <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">New Protocol Group</Label>
              <div className="flex gap-2">
                <Input name="groupName" required className="h-10 neo-inset bg-background text-foreground flex-1" />
                <Button type="submit" size="icon" className="h-10 w-10 neo-btn bg-background text-primary">
                  <PlusSquare className="h-4 w-4" />
                </Button>
              </div>
            </form>

            <div className="space-y-4">
              <Label className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Active Groups</Label>
              <ScrollArea className="h-40 pr-4">
                {groups.length === 0 ? (
                  <p className="text-[9px] text-center text-muted-foreground py-4 uppercase">No Groups Defined</p>
                ) : (
                  groups.map(group => (
                    <div key={group.id} className="flex justify-between items-center neo-inset p-3 mb-2">
                      <span className="text-[10px] font-black uppercase">{group.name}</span>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteGroup(group.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
