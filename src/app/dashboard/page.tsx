"use client";

import { useUser, useDatabase, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Bell, 
  Cpu, 
  Smartphone,
  Loader2,
  Trash2,
  LogOut,
  PlusSquare,
  Eye,
  Thermometer,
  Pencil,
  AlertTriangle,
  Radar,
  ShieldAlert,
  X,
  ShieldCheck,
  Hexagon,
  Phone,
  Activity,
  Circle,
  Search,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, push, remove, update, onChildAdded, off, get } from "firebase/database";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useRtdb } from "@/firebase/database/use-rtdb";

const SOSMap = dynamic(() => import("./sos-map"), { 
  ssr: false,
  loading: () => <div className="h-[200px] sm:h-[250px] md:h-[350px] w-full neo-inset animate-pulse flex items-center justify-center text-[10px] font-bold uppercase tracking-widest opacity-40 text-foreground">Initializing Tactical Map...</div>
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
  targetGroups?: string[];
}

export default function DashboardPage() {
  // 1. Hooks (Top Level Only)
  const { user, loading: userLoading } = useUser();
  const { auth } = useFirebase();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('buddies');
  const [hasMounted, setHasMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [isBuddyDialogOpen, setIsBuddyDialogOpen] = useState(false);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false);
  const [editingBuddy, setEditingBuddy] = useState<Buddy | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'buddy' | 'node' | 'group', name: string } | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ type: 'buddy' | 'node', data: any } | null>(null);
  const [interceptAlert, setInterceptAlert] = useState<any>(null);

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
        if (role === 'guardian' && activeTab === 'buddies') {
          setActiveTab('guardian');
        }
      });

      const notifRef = ref(rtdb, `users/${user.uid}/notifications`);
      const listener = onChildAdded(notifRef, (snapshot) => {
        const val = snapshot.val();
        const now = Date.now();
        const timestamp = val.timestamp || val.createdAt || 0;
        if (val.type === 'sos' && val.trigger !== 'TrackResponse' && (now - timestamp < 45000)) {
          setInterceptAlert({ ...val, id: snapshot.key });
        }
      });
      return () => off(notifRef, 'child_added', listener);
    }
  }, [user, userLoading, router, rtdb, activeTab]);

  const logOutTerminal = useCallback(() => signOut(auth).then(() => router.push("/login")), [auth, router]);

  const toggleGroupSelection = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSaveBuddy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    const formData = new FormData(e.currentTarget);
    const buddyData = {
      name: formData.get('buddyName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      groups: selectedGroups
    };

    if (editingBuddy) {
      // Sequence Modal Transition to prevent freeze
      setIsBuddyDialogOpen(false);
      setTimeout(() => {
        setPendingUpdate({ type: 'buddy', data: buddyData });
      }, 200);
    } else {
      try {
        await push(ref(rtdb, `users/${user.uid}/buddies`), buddyData);
        toast({ title: "Personnel Enlisted", description: "New buddy added to vault." });
        setIsBuddyDialogOpen(false);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Vault Error", description: err.message });
      }
    }
  };

  const handleSaveNode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    const formData = new FormData(e.currentTarget);
    const nodeData = {
      nodeName: formData.get('nodeName') as string,
      hardwareId: formData.get('hardwareId') as string,
      status: editingNode?.status || 'offline',
      temperature: editingNode?.temperature || 24.5,
      targetGroups: selectedGroups
    };

    if (editingNode) {
      // Sequence Modal Transition to prevent freeze
      setIsNodeDialogOpen(false);
      setTimeout(() => {
        setPendingUpdate({ type: 'node', data: nodeData });
      }, 200);
    } else {
      try {
        await push(ref(rtdb, `users/${user.uid}/nodes`), nodeData);
        toast({ title: "Node Armed", description: "Hardware asset registered." });
        setIsNodeDialogOpen(false);
      } catch (err: any) {
        toast({ variant: "destructive", title: "Hardware Error", description: err.message });
      }
    }
  };

  const executeUpdate = async () => {
    if (!user || !rtdb || !pendingUpdate) return;
    const { type, data } = pendingUpdate;
    const currentEditingBuddy = editingBuddy;
    const currentEditingNode = editingNode;

    setPendingUpdate(null);

    try {
      if (type === 'buddy' && currentEditingBuddy) {
        await update(ref(rtdb, `users/${user.uid}/buddies/${currentEditingBuddy.id}`), data);
        setEditingBuddy(null);
      } else if (type === 'node' && currentEditingNode) {
        await update(ref(rtdb, `users/${user.uid}/nodes/${currentEditingNode.id}`), data);
        setEditingNode(null);
      }
      toast({ title: "Sync Complete", description: "Data committed to master vault." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Sync Error", description: err.message });
    }
  };

  const deleteBuddy = async (id: string) => {
    if (!user || !rtdb) return;
    try {
      await remove(ref(rtdb, `users/${user.uid}/buddies/${id}`));
      toast({ title: "Personnel Purged", description: "Identity signature removed." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Error", description: err.message });
    }
  };

  const deleteNode = async (id: string) => {
    if (!user || !rtdb) return;
    try {
      await remove(ref(rtdb, `users/${user.uid}/nodes/${id}`));
      toast({ title: "Node Decommissioned", description: "Asset removed from network." });
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

  const handleAddGroup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    const formData = new FormData(e.currentTarget);
    const name = formData.get('groupName') as string;
    try {
      await push(ref(rtdb, `users/${user.uid}/buddyGroups`), { name });
      toast({ title: "Protocol Created", description: `Security group initialized.` });
      (e.target as HTMLFormElement).reset();
    } catch (err: any) {
      toast({ variant: "destructive", title: "Protocol Error", description: err.message });
    }
  };

  if (userLoading || !hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* 2. Navigation Structure (Handheld Bottom / Desktop Sidebar) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-around items-center p-4 bg-background/80 backdrop-blur-md border-t border-black/5 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all text-[8px] font-bold uppercase tracking-widest relative px-2",
              activeTab === item.id ? "text-primary scale-110" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
            <span className="text-foreground font-black">{item.label}</span>
            {notifications.length > 0 && item.id === 'notifications' && (
              <span className="absolute top-0 right-1 h-1.5 w-1.5 bg-primary rounded-full" />
            )}
          </button>
        ))}
      </nav>

      <aside className="hidden md:flex w-72 p-6 h-screen sticky top-0 z-40 border-r border-black/5 bg-background/50 flex-col justify-between">
        <div className="space-y-10">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 neo-flat flex items-center justify-center text-primary shrink-0">
              <Hexagon className="h-5 w-5" />
            </div>
            <h1 className="text-lg font-black tracking-tighter uppercase flex items-baseline gap-1 text-foreground">
              1TAP <span className="text-primary">SECURE</span>
            </h1>
          </div>
          <nav className="flex flex-col gap-3">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={cn(
                  "flex items-center gap-4 px-5 py-4 transition-all text-[10px] font-black uppercase tracking-[0.1em] relative group whitespace-nowrap rounded-[1.5rem]",
                  activeTab === item.id ? "neo-inset text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
                <span className="text-foreground">{item.label}</span>
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
              <Avatar className="h-9 w-9 neo-inset shrink-0 border border-black/5">
                <AvatarFallback className="bg-transparent text-[9px] font-black text-foreground">{currentName[0].toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="overflow-hidden">
                <p className="text-[10px] font-black truncate uppercase tracking-widest text-foreground">{currentName}</p>
                <p className="text-[8px] font-black text-primary uppercase tracking-widest">{userRole}</p>
              </div>
            </div>
            <button onClick={logOutTerminal} className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground hover:text-destructive transition-colors pl-1">
              <LogOut className="h-3 w-3" /> DISCONNECT
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-6 sm:p-8 md:p-8 w-full pb-32 md:pb-8">
        <div className="max-w-6xl mx-auto mt-4 md:mt-0">
          {activeTab === 'buddies' && (
            <div className="space-y-8">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Manage Buddies</h2>
                <div className="flex gap-3 w-full sm:w-auto">
                  <Button onClick={() => { setEditingBuddy(null); setSelectedGroups([]); setIsBuddyDialogOpen(true); }} className="neo-btn flex-1 sm:flex-none h-10 px-4 text-[9px] font-black uppercase tracking-widest bg-background text-foreground hover:text-primary transition-all">
                    <PlusSquare className="h-4 w-4 mr-2 text-primary" /> ENLIST
                  </Button>
                  <Button onClick={() => setIsProtocolDialogOpen(true)} className="neo-btn flex-1 sm:flex-none h-10 px-4 text-[9px] font-black uppercase tracking-widest bg-background text-foreground hover:text-primary">
                    <ShieldAlert className="h-4 w-4 mr-2 text-primary/60" /> PROTOCOLS
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buddies.length === 0 ? (
                  <div className="col-span-full neo-flat p-12 text-center opacity-30 flex flex-col items-center">
                    <Smartphone className="h-12 w-12 mb-6 text-foreground" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Operational Vault Empty</p>
                  </div>
                ) : (
                  buddies.map(buddy => (
                    <div key={buddy.id} className="neo-flat p-6 space-y-4 hover:shadow-lg transition-shadow duration-300 group">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <Avatar className="h-10 w-10 neo-inset border border-black/5">
                            <AvatarFallback className="bg-transparent text-[10px] font-black text-foreground">{buddy.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{buddy.name}</p>
                            <p className="text-[8px] font-black text-muted-foreground mt-1 uppercase tracking-widest">{buddy.phoneNumber}</p>
                          </div>
                        </div>
                        <Badge className="neo-btn bg-background text-foreground text-[7px] font-black px-2 py-0.5 uppercase border border-black/5">ID-{buddy.id.slice(-4)}</Badge>
                      </div>
                      
                      {buddy.groups && buddy.groups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {buddy.groups.map(gid => {
                            const groupName = groups.find(g => g.id === gid)?.name || "Unknown Protocol";
                            return (
                              <Badge key={gid} className="bg-primary/5 text-primary text-[7px] font-black border-none px-2 py-0.5 rounded-sm uppercase tracking-tighter">
                                {groupName}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-primary" onClick={() => { setEditingBuddy(buddy); setSelectedGroups(buddy.groups || []); setIsBuddyDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm({ id: buddy.id, type: 'buddy', name: buddy.name })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-primary hover:text-foreground ml-auto shadow-inner bg-primary/5">
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
                <Button onClick={() => { setEditingNode(null); setSelectedGroups([]); setIsNodeDialogOpen(true); }} className="neo-btn w-full sm:w-auto h-10 px-4 text-[9px] font-black uppercase tracking-widest bg-background text-foreground hover:text-primary transition-all">
                  <Cpu className="h-4 w-4 mr-2 text-primary" /> ARM NODE
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nodes.length === 0 ? (
                  <div className="col-span-full neo-flat p-12 text-center opacity-30 flex flex-col items-center">
                    <Activity className="h-12 w-12 mb-6 text-foreground" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">No Active Assets</p>
                  </div>
                ) : (
                  nodes.map(node => (
                    <div key={node.id} className="neo-flat p-6 space-y-6 hover:shadow-lg transition-shadow duration-300 group">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <div className={cn("h-10 w-10 neo-inset flex items-center justify-center border border-black/5", node.status === 'online' ? "text-green-500 shadow-[inset_0_0_10px_rgba(34,197,94,0.1)]" : "text-muted-foreground")}>
                            <Cpu className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{node.nodeName}</p>
                            <p className="text-[8px] font-black text-muted-foreground mt-1 uppercase tracking-widest">{node.hardwareId}</p>
                          </div>
                        </div>
                        <Badge className={cn("text-[7px] font-black px-3 py-1 uppercase rounded-full border border-black/5", node.status === 'online' ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground")}>
                          <Circle className={cn("h-1.5 w-1.5 mr-1.5 fill-current", node.status === 'online' ? "animate-pulse" : "opacity-30")} />
                          {node.status}
                        </Badge>
                      </div>

                      {node.targetGroups && node.targetGroups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {node.targetGroups.map(gid => {
                            const groupName = groups.find(g => g.id === gid)?.name || "Unknown Protocol";
                            return (
                              <Badge key={gid} className="bg-secondary text-foreground text-[7px] font-black border border-black/5 px-2 py-0.5 rounded-sm uppercase tracking-tighter">
                                {groupName}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      <div className="neo-inset p-3 space-y-1 text-center border border-black/5">
                        <Thermometer className="h-3 w-3 mx-auto text-orange-500/60" />
                        <p className="text-[8px] font-black text-foreground">{node.temperature || '--'}°C</p>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-primary" onClick={() => { setEditingNode(node); setSelectedGroups(node.targetGroups || []); setIsNodeDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm({ id: node.id, type: 'node', name: node.nodeName })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-green-500 hover:text-foreground ml-auto bg-green-500/5 shadow-inner">
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
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Telemetry Clear</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={cn("mb-6 p-6 neo-flat relative group overflow-hidden transition-all duration-300", n.type === 'sos' ? "bg-destructive/5" : "bg-primary/5")}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 relative z-10">
                          <div className="flex gap-4 items-center">
                            {n.type === 'sos' ? (
                              <div className="h-10 w-10 neo-inset flex items-center justify-center text-destructive animate-pulse border border-destructive/20 bg-white rounded-full">
                                <AlertTriangle className="h-5 w-5" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 neo-inset flex items-center justify-center text-primary border border-primary/20 bg-white rounded-full">
                                <Radar className="h-5 w-5" />
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-foreground">{n.message || 'Incoming Telemetry Fix'}</p>
                              <div className="flex items-center gap-3 mt-1.5">
                                <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest">{new Date(n.createdAt).toLocaleString()}</p>
                              </div>
                            </div>
                          </div>
                          <Button size="sm" className="neo-btn w-full sm:w-auto h-8 px-4 text-[8px] font-black uppercase tracking-widest bg-background text-foreground hover:text-primary" onClick={() => n.latitude !== undefined && n.longitude !== undefined ? setInterceptAlert({ ...n, id: n.id }) : toast({ variant: "destructive", title: "Coordinates Unavailable", description: "No spatial data detected." })}>
                            <Eye className="h-3.5 w-3.5 mr-2 text-primary/60" /> TACTICAL MAP
                          </Button>
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
              <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Guardian Radar</h2>
              <div className="neo-flat p-8 space-y-8">
                <div className="space-y-4">
                  <Label className="text-[10px] font-black text-foreground uppercase tracking-widest ml-1">Scan for Hardware Asset</Label>
                  <div className="flex gap-3">
                    <Input placeholder="ENTER HARDWARE ID SIGNATURE" className="h-12 neo-inset bg-background text-foreground border-none px-5 text-[10px] font-black uppercase tracking-widest flex-1" />
                    <Button className="h-12 w-12 neo-btn bg-background text-primary"><Search className="h-5 w-5" /></Button>
                  </div>
                </div>
                <div className="p-12 text-center opacity-30 flex flex-col items-center">
                  <Radar className="h-12 w-12 mb-6 text-foreground" />
                  <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">No Linked Assets Tracked</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-8">
               <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Personnel Profile</h2>
               <div className="neo-flat p-12 flex flex-col items-center gap-8">
                  <div className="h-32 w-32 neo-inset flex items-center justify-center text-4xl font-black text-primary border-2 border-primary/5">{currentName[0].toUpperCase()}</div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-black uppercase tracking-[0.2em] text-foreground">{currentName}</p>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{user?.email}</p>
                  </div>
                  <Button onClick={() => router.push('/profile')} className="neo-btn h-12 px-8 text-[10px] font-black uppercase tracking-[0.3em] bg-background text-foreground hover:text-primary transition-all">
                    <Settings className="h-4 w-4 mr-3 text-primary/60" /> CONFIGURE HUB
                  </Button>
               </div>
            </div>
          )}
        </div>
      </main>

      {/* 3. Operational Modals (Verification Gates) */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="neo-flat p-8 border-none bg-[#ECF0F3] max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Confirm Purge
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[10px] font-black uppercase tracking-widest text-foreground pt-4 leading-relaxed">
              Are you sure you want to remove <span className="text-foreground">{deleteConfirm?.name}</span>? This action is permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3">
            <AlertDialogCancel className="neo-btn h-12 flex-1 text-[10px] font-black uppercase bg-background text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteConfirm?.type === 'buddy') deleteBuddy(deleteConfirm.id);
                if (deleteConfirm?.type === 'node') deleteNode(deleteConfirm.id);
                if (deleteConfirm?.type === 'group') deleteGroup(deleteConfirm.id);
                setDeleteConfirm(null);
              }}
              className="neo-btn h-12 flex-1 text-[10px] font-black uppercase bg-destructive text-white hover:bg-destructive/90"
            >
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingUpdate} onOpenChange={(open) => !open && setPendingUpdate(null)}>
        <AlertDialogContent className="neo-flat p-8 border-none bg-[#ECF0F3] max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" /> Confirm Sync
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[10px] font-black uppercase tracking-widest text-foreground pt-4 leading-relaxed">
              Are you sure you want to synchronize these changes to the master vault?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3">
            <AlertDialogCancel className="neo-btn h-12 flex-1 text-[10px] font-black uppercase bg-background text-foreground">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeUpdate}
              className="neo-btn h-12 flex-1 text-[10px] font-black uppercase bg-primary text-white hover:bg-primary/90"
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isBuddyDialogOpen} onOpenChange={(open) => { setIsBuddyDialogOpen(open); if (!open) setEditingBuddy(null); }}>
        <DialogContent className="neo-flat p-8 border-none bg-[#ECF0F3] max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              {editingBuddy ? "Edit Personnel" : "Enlist Personnel"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBuddy} className="space-y-6 mt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Personnel Name</Label>
              <Input name="buddyName" defaultValue={editingBuddy?.name} required className="h-12 neo-inset bg-background text-foreground border-none px-5 font-black uppercase text-[10px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Contact Signal</Label>
              <Input name="phoneNumber" defaultValue={editingBuddy?.phoneNumber} required className="h-12 neo-inset bg-background text-foreground border-none px-5 font-black uppercase text-[10px]" />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Protocol Assignment</Label>
              <ScrollArea className="h-40 neo-inset p-4 bg-white/20 rounded-[1.5rem]">
                {groups.length === 0 ? (
                  <p className="text-[8px] text-center text-muted-foreground uppercase py-8 font-black">No protocols defined</p>
                ) : (
                  groups.map(group => (
                    <div key={group.id} className="flex items-center space-x-3 mb-4 last:mb-0">
                      <Checkbox 
                        id={`buddy-group-${group.id}`} 
                        checked={selectedGroups.includes(group.id)} 
                        onCheckedChange={() => toggleGroupSelection(group.id)}
                        className="border-primary/40 h-5 w-5 rounded-md"
                      />
                      <Label htmlFor={`buddy-group-${group.id}`} className="text-[10px] font-black uppercase text-foreground cursor-pointer select-none leading-none pt-0.5">{group.name}</Label>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>

            <DialogFooter className="pt-4 pb-2">
              <Button type="submit" className="w-full h-14 neo-btn bg-background text-foreground hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem]">
                {editingBuddy ? "SYNCHRONIZE" : "INITIALIZE"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isNodeDialogOpen} onOpenChange={(open) => { setIsNodeDialogOpen(open); if (!open) setEditingNode(null); }}>
        <DialogContent className="neo-flat p-8 border-none bg-[#ECF0F3] max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <Cpu className="h-5 w-5 text-primary" />
              {editingNode ? "Edit Node" : "Arm New Node"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNode} className="space-y-6 mt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Asset Name</Label>
              <Input name="nodeName" defaultValue={editingNode?.nodeName} required className="h-12 neo-inset bg-background text-foreground border-none px-5 font-black uppercase text-[10px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Hardware ID</Label>
              <Input name="hardwareId" defaultValue={editingNode?.hardwareId} required className="h-12 neo-inset bg-background text-foreground border-none px-5 font-black uppercase text-[10px]" />
            </div>

            <div className="space-y-3">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Target Protocols</Label>
              <ScrollArea className="h-40 neo-inset p-4 bg-white/20 rounded-[1.5rem]">
                {groups.length === 0 ? (
                  <p className="text-[8px] text-center text-muted-foreground uppercase py-8 font-black">No protocols defined</p>
                ) : (
                  groups.map(group => (
                    <div key={group.id} className="flex items-center space-x-3 mb-4 last:mb-0">
                      <Checkbox 
                        id={`node-group-${group.id}`} 
                        checked={selectedGroups.includes(group.id)} 
                        onCheckedChange={() => toggleGroupSelection(group.id)}
                        className="border-primary/40 h-5 w-5 rounded-md"
                      />
                      <Label htmlFor={`node-group-${group.id}`} className="text-[10px] font-black uppercase text-foreground cursor-pointer select-none leading-none pt-0.5">{group.name}</Label>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>

            <DialogFooter className="pt-4 pb-2">
              <Button type="submit" className="w-full h-14 neo-btn bg-background text-foreground hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-[1.5rem]">
                {editingNode ? "SYNCHRONIZE" : "ARM ASSET"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProtocolDialogOpen} onOpenChange={setIsProtocolDialogOpen}>
        <DialogContent className="neo-flat p-8 border-none bg-[#ECF0F3] max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-primary" /> Security Protocols
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-8 mt-4">
            <form onSubmit={handleAddGroup} className="space-y-3">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">New Protocol Group</Label>
              <div className="flex gap-2">
                <Input name="groupName" required className="h-12 neo-inset bg-background text-foreground flex-1 border-none px-4 font-black uppercase text-[10px]" />
                <Button type="submit" size="icon" className="h-12 w-12 neo-btn bg-background text-primary rounded-[1rem]"><PlusSquare className="h-5 w-5" /></Button>
              </div>
            </form>
            <div className="space-y-4">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Active Groups</Label>
              <ScrollArea className="h-48 pr-4">
                {groups.length === 0 ? <p className="text-[9px] text-center text-muted-foreground py-8 uppercase font-black">No Groups Defined</p> : groups.map(group => (
                  <div key={group.id} className="flex justify-between items-center neo-inset p-4 mb-3 border border-black/5 bg-white/30 shadow-inner rounded-[1.5rem]">
                    <span className="text-[10px] font-black uppercase text-foreground">{group.name}</span>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full" onClick={() => setDeleteConfirm({ id: group.id, type: 'group', name: group.name })}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!interceptAlert} onOpenChange={(open) => !open && setInterceptAlert(null)}>
        <DialogContent className="max-w-2xl neo-flat p-0 border-none bg-[#ECF0F3] [&>button]:hidden flex flex-col overflow-hidden max-h-[90vh] shadow-[0_0_50px_rgba(239,68,68,0.2)]">
          <DialogHeader className="p-8 pb-4 flex-shrink-0 bg-destructive/5 border-b border-destructive/10">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 neo-inset flex items-center justify-center text-destructive animate-pulse border border-destructive/30 bg-white rounded-full"><AlertTriangle className="h-6 w-6" /></div>
                <div>
                  <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">Tactical Intercept</DialogTitle>
                  <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1 text-foreground")}>{interceptAlert?.type === 'sos' ? "High Intensity Alert Active" : "Tactical Telemetry Active"}</p>
                </div>
              </div>
              {interceptAlert?.type === 'sos' && <Badge className="bg-destructive text-foreground border-none text-[8px] font-black px-4 py-1 animate-pulse uppercase shadow-[0_0_15px_rgba(239,68,68,0.5)]">Critical</Badge>}
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
            <div className="neo-inset p-6 space-y-4 border border-black/5 rounded-[1.5rem]">
              <div className="flex items-center gap-4">
                 <div className="h-10 w-10 neo-flat flex items-center justify-center text-foreground bg-white rounded-full">{interceptAlert?.type === 'sos' ? <AlertTriangle className="h-5 w-5 text-destructive/60" /> : <Radar className="h-5 w-5 text-primary/60" />}</div>
                 <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-foreground">{interceptAlert?.message || 'Awaiting Device Telemetry'}</p>
              </div>
              <div className="neo-flat bg-background/50 p-4 space-y-1 border border-black/5 rounded-[1.5rem]">
                <p className="text-[8px] font-black text-muted-foreground uppercase">Signal Time</p>
                <p className="text-[10px] font-black uppercase text-foreground">{interceptAlert && new Date(interceptAlert.createdAt).toLocaleTimeString()}</p>
              </div>
            </div>
            {interceptAlert?.latitude !== undefined && interceptAlert?.longitude !== undefined && (
              <div className="neo-flat overflow-hidden border border-black/5 shadow-lg rounded-[2rem]">
                <SOSMap latitude={interceptAlert.latitude} longitude={interceptAlert.longitude} mapLabel={interceptAlert?.type === 'sos' ? "SOS ORIGIN" : "ASSET POSITION"} />
              </div>
            )}
          </div>
          <div className="p-8 pt-4 border-t border-black/5 flex-shrink-0 bg-background/30">
            <Button onClick={() => setInterceptAlert(null)} className="w-full h-16 neo-btn bg-white text-foreground hover:bg-destructive hover:text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-[1.5rem]">CLOSE COMMAND</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
