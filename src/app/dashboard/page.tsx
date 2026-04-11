
"use client";

import { useUser, useDatabase, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
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
  Link2,
  ShieldX,
  UserPlus,
  ArrowRight,
  ShieldQuestion,
  LocateFixed,
  Zap,
  ZapOff
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

type TabType = 'buddies' | 'nodes' | 'notifications' | 'settings' | 'guardian' | 'linked';

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
  ownerUid?: string;
  ownerEmail?: string;
  trackRequest?: boolean;
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
  const [radarSearchTerm, setRadarSearchTerm] = useState("");

  const [isBuddyDialogOpen, setIsBuddyDialogOpen] = useState(false);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false);
  const [editingBuddy, setEditingBuddy] = useState<Buddy | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'buddy' | 'node' | 'group' | 'link', name: string } | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ type: 'buddy' | 'node', data: any } | null>(null);
  const [interceptAlert, setInterceptAlert] = useState<any>(null);

  const buddiesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddies`) : null, [rtdb, user]);
  const nodesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/nodes`) : null, [rtdb, user]);
  const groupsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddyGroups`) : null, [rtdb, user]);
  const notificationsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/notifications`) : null, [rtdb, user]);
  const linksRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/links`) : null, [rtdb, user]);
  const allUsersRef = useMemo(() => (user && rtdb) ? ref(rtdb, `users`) : null, [rtdb, user]);

  const { data: buddiesData } = useRtdb(buddiesRef);
  const { data: nodesData } = useRtdb(nodesRef);
  const { data: groupsData } = useRtdb(groupsRef);
  const { data: notificationsData } = useRtdb(notificationsRef);
  const { data: linksData } = useRtdb(linksRef);
  const { data: allUsersData } = useRtdb(allUsersRef);

  const buddies = useMemo(() => buddiesData ? Object.entries(buddiesData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [buddiesData]);
  const nodes = useMemo(() => nodesData ? Object.entries(nodesData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [nodesData]);
  const groups = useMemo(() => groupsData ? Object.entries(groupsData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [groupsData]);
  const notifications = useMemo(() => notificationsData ? Object.entries(notificationsData).map(([id, val]: [string, any]) => ({ ...val, id, createdAt: val.createdAt || val.timestamp || 0 })).sort((a, b) => b.createdAt - a.createdAt) : [], [notificationsData]);
  const links = useMemo(() => linksData ? Object.entries(linksData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [linksData]);

  const availableNodes = useMemo(() => {
    if (!allUsersData || !user) return [];
    const nodeDiscovery: Node[] = [];
    Object.entries(allUsersData).forEach(([uid, userData]: [string, any]) => {
      if (uid === user.uid) return;
      if (userData.nodes) {
        Object.entries(userData.nodes).forEach(([nid, nData]: [string, any]) => {
          if (nData && nData.hardwareId) {
            nodeDiscovery.push({
              ...nData,
              id: nid,
              ownerUid: uid,
              ownerEmail: userData.profile?.email || "Unknown Sector"
            });
          }
        });
      }
    });
    return nodeDiscovery;
  }, [allUsersData, user]);

  const radarSearchResults = useMemo(() => {
    if (!radarSearchTerm || !radarSearchTerm.trim() || radarSearchTerm.trim().length < 3) return [];
    const term = radarSearchTerm.toLowerCase().trim();
    return availableNodes.filter(node => {
      const hId = node.hardwareId ? String(node.hardwareId).toLowerCase() : "";
      return hId === term;
    });
  }, [availableNodes, radarSearchTerm]);

  const currentName = useMemo(() => user?.email?.split('@')[0] || "Personnel", [user]);

  const navItems = useMemo(() => {
    return userRole === 'guardian' 
      ? [{ id: 'guardian', label: 'RADAR', icon: Radar }, { id: 'linked', label: 'LINKS', icon: Link2 }, { id: 'notifications', label: 'ALERTS', icon: Bell }, { id: 'settings', label: 'PROFILE', icon: Settings }]
      : [{ id: 'buddies', label: 'BUDDIES', icon: Smartphone }, { id: 'nodes', label: 'NODES', icon: Cpu }, { id: 'linked', label: 'LINKED', icon: Link2 }, { id: 'notifications', label: 'ALERTS', icon: Bell }, { id: 'settings', label: 'PROFILE', icon: Settings }];
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
        if (role === 'guardian' && (activeTab === 'buddies' || activeTab === 'nodes')) {
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

  const handleRequestLink = async (targetUid: string, hardwareId: string) => {
    if (!user || !rtdb) return;
    try {
      const updates = {
        [`users/${user.uid}/links/${targetUid}`]: {
          status: 'requested',
          hardwareId,
          targetEmail: availableNodes.find(n => n.ownerUid === targetUid && n.hardwareId === hardwareId)?.ownerEmail || "Unknown",
          trackingRequest: null
        },
        [`users/${targetUid}/links/${user.uid}`]: {
          status: 'pending',
          hardwareId,
          guardianEmail: user.email,
          createdAt: Date.now(),
          trackingRequest: null
        }
      };
      await update(ref(rtdb), updates);
      toast({ title: "Link Requested", description: "Authorization signal dispatched to asset owner." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Handshake Error", description: err.message });
    }
  };

  const handleAcceptLink = async (guardianId: string) => {
    if (!user || !rtdb) return;
    try {
      const updates = {
        [`users/${user.uid}/links/${guardianId}/status`]: 'linked',
        [`users/${guardianId}/links/${user.uid}/status`]: 'linked',
      };
      await update(ref(rtdb), updates);
      toast({ title: "Link Synchronized", description: "Guardian access granted." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Authorization Error", description: err.message });
    }
  };

  const handleRequestTracking = async (targetUid: string) => {
    if (!user || !rtdb) return;
    try {
      const updates = {
        [`users/${user.uid}/links/${targetUid}/trackingRequest`]: 'requested',
        [`users/${targetUid}/links/${user.uid}/trackingRequest`]: 'requested',
      };
      await update(ref(rtdb), updates);
      toast({ title: "Tracking Requested", description: "Telemetry authorization signal dispatched." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Protocol Error", description: err.message });
    }
  };

  const handleApproveTracking = async (guardianId: string) => {
    if (!user || !rtdb) return;
    try {
      const updates = {
        [`users/${user.uid}/links/${guardianId}/trackingRequest`]: 'approved',
        [`users/${guardianId}/links/${user.uid}/trackingRequest`]: 'approved',
      };
      await update(ref(rtdb), updates);
      toast({ title: "Telemetry Authorized", description: "Real-time tracking enabled for this Guardian." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Authorization Error", description: err.message });
    }
  };

  const handleRejectLink = async (guardianId: string) => {
    if (!user || !rtdb) return;
    try {
      const updates = {
        [`users/${user.uid}/links/${guardianId}`]: null,
        [`users/${guardianId}/links/${user.uid}`]: null,
      };
      await update(ref(rtdb), updates);
      toast({ title: "Protocol Purged", description: "Link request rejected or terminated." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Error", description: err.message });
    }
  };

  const handleToggleTrack = async (targetUid: string, hardwareId: string, currentStatus: boolean) => {
    if (!user || !rtdb) return;
    try {
      const targetNodesRef = ref(rtdb, `users/${targetUid}/nodes`);
      const snapshot = await get(targetNodesRef);
      if (!snapshot.exists()) return;
      
      const targetNodes = snapshot.val();
      const nodeEntry = Object.entries(targetNodes).find(([_, data]: [string, any]) => data.hardwareId === hardwareId);
      
      if (nodeEntry) {
        const [nodeId] = nodeEntry;
        const updates = {
          [`users/${targetUid}/nodes/${nodeId}/trackRequest`]: !currentStatus,
          [`users/${targetUid}/nodes/${nodeId}/trackRequester`]: !currentStatus ? user.uid : null,
        };
        await update(ref(rtdb), updates);
        toast({ 
          title: !currentStatus ? "Tracking Enabled" : "Tracking Terminated", 
          description: `Asset telemetry ${!currentStatus ? 'activated' : 'deactivated'}.` 
        });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "Protocol Error", description: err.message });
    }
  };

  const toggleGroupSelection = (groupId: string, checked: boolean) => {
    setSelectedGroups(prev => 
      checked ? [...prev, groupId] : prev.filter(id => id !== groupId)
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

    setIsBuddyDialogOpen(false);
    setTimeout(() => {
      setPendingUpdate({ type: 'buddy', data: buddyData });
    }, 400);
  };

  const handleSaveNode = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    const formData = new FormData(e.currentTarget);
    const nodeData = {
      nodeName: formData.get('tacticalNodeName') as string,
      hardwareId: formData.get('hardwareId') as string,
      status: editingNode?.status || 'online',
      temperature: parseFloat(formData.get('tacticalTemperature') as string) || 24.5,
      targetGroups: selectedGroups
    };

    setIsNodeDialogOpen(false);
    setTimeout(() => {
      setPendingUpdate({ type: 'node', data: nodeData });
    }, 400);
  };

  const executeUpdate = async () => {
    if (!user || !rtdb || !pendingUpdate) return;
    const { type, data } = pendingUpdate;
    const currentEditingBuddy = editingBuddy;
    const currentEditingNode = editingNode;

    setPendingUpdate(null);

    try {
      if (type === 'buddy') {
        if (currentEditingBuddy) {
          await update(ref(rtdb, `users/${user.uid}/buddies/${currentEditingBuddy.id}`), data);
          setEditingBuddy(null);
        } else {
          await push(ref(rtdb, `users/${user.uid}/buddies`), data);
        }
      } else if (type === 'node') {
        if (currentEditingNode) {
          await update(ref(rtdb, `users/${user.uid}/nodes/${currentEditingNode.id}`), data);
          setEditingNode(null);
        } else {
          await push(ref(rtdb, `users/${user.uid}/nodes`), data);
        }
      }
      toast({ title: "Sync Complete", description: "Master vault updated." });
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
      {/* Mobile Navigation */}
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
            {(links.some(l => l.status === 'pending' || l.trackingRequest === 'requested')) && (item.id === 'linked' || item.id === 'guardian') && (
              <span className="absolute top-0 right-1 h-1.5 w-1.5 bg-destructive rounded-full animate-pulse" />
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
                {(links.some(l => l.status === 'pending' || l.trackingRequest === 'requested')) && (item.id === 'linked' || item.id === 'guardian') && (
                  <span className="absolute top-1/2 -translate-y-1/2 right-6 h-1.5 w-1.5 bg-destructive rounded-full animate-pulse" />
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
                      </div>
                      
                      {buddy.groups && buddy.groups.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2">
                          {buddy.groups.map(gid => {
                            const groupName = groups.find(g => g.id === gid)?.name || "Protocol Signal";
                            return (
                              <Badge key={gid} className="bg-primary/5 text-primary text-[7px] font-black border-none px-2 py-0.5 rounded-sm uppercase">
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
                          <div className={cn("h-10 w-10 neo-inset flex items-center justify-center border border-black/5", node.status === 'online' ? "text-green-500" : "text-muted-foreground")}>
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
                            const groupName = groups.find(g => g.id === gid)?.name || "Protocol Signal";
                            return (
                              <Badge key={gid} className="bg-secondary text-foreground text-[7px] font-black border border-black/5 px-2 py-0.5 rounded-sm uppercase">
                                {groupName}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      <div className="neo-inset p-3 space-y-1 text-center border border-black/5">
                        <p className="text-[8px] font-black text-foreground/40 uppercase mb-1 tracking-tighter">Current Telemetry</p>
                        <div className="flex items-center justify-center gap-2">
                          <Thermometer className="h-3 w-3 text-orange-500/60" />
                          <p className="text-[10px] font-black text-foreground">{node.temperature || '--'}°C</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-primary" onClick={() => { setEditingNode(node); setSelectedGroups(node.targetGroups || []); setIsNodeDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 neo-btn text-muted-foreground hover:text-destructive" onClick={() => setDeleteConfirm({ id: node.id, type: 'node', name: node.nodeName })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'linked' && (
            <div className="space-y-8">
              <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">LINKED Authorization</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {links.length === 0 ? (
                  <div className="col-span-full neo-flat p-12 text-center opacity-30 flex flex-col items-center">
                    <Link2 className="h-12 w-12 mb-6 text-foreground" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">No Active Handshake Signals</p>
                  </div>
                ) : (
                  <>
                    {userRole !== 'guardian' && links.map(link => (
                      <div key={link.id} className={cn("neo-flat p-6 space-y-4", link.status === 'pending' || link.trackingRequest === 'requested' ? "bg-primary/5" : "bg-white")}>
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex gap-3 items-center min-w-0">
                            <Avatar className="h-10 w-10 neo-inset border border-black/5 shrink-0">
                              <AvatarFallback className="bg-transparent text-[10px] font-black text-foreground">{link.guardianEmail?.[0].toUpperCase() || 'G'}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{link.guardianEmail}</p>
                              <Badge className={cn("text-[7px] font-black px-2 py-0.5 rounded-sm uppercase mt-1 shrink-0", link.status === 'linked' ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary")}>
                                {link.status}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        {link.status === 'pending' && (
                          <div className="flex gap-3 pt-2">
                            <Button onClick={() => handleAcceptLink(link.id)} className="flex-1 h-10 neo-btn bg-primary text-white text-[9px] font-black uppercase tracking-widest"><ShieldCheck className="h-3.5 w-3.5 mr-2" /> ACCEPT</Button>
                            <Button onClick={() => handleRejectLink(link.id)} className="flex-1 h-10 neo-btn bg-background text-destructive text-[9px] font-black uppercase tracking-widest"><ShieldX className="h-3.5 w-3.5 mr-2" /> REJECT</Button>
                          </div>
                        )}

                        {link.status === 'linked' && link.trackingRequest === 'requested' && (
                          <div className="p-4 neo-inset bg-destructive/5 space-y-3 border border-destructive/20">
                            <p className="text-[8px] font-black text-destructive uppercase tracking-widest flex items-center gap-2"><Zap className="h-3 w-3" /> Incoming Track Request</p>
                            <div className="flex gap-2">
                              <Button onClick={() => handleApproveTracking(link.id)} className="flex-1 h-8 neo-btn bg-primary text-white text-[8px] font-black uppercase">APPROVE</Button>
                              <Button onClick={() => handleRejectLink(link.id)} className="flex-1 h-8 neo-btn bg-background text-destructive text-[8px] font-black uppercase">REJECT</Button>
                            </div>
                          </div>
                        )}

                        {link.status === 'linked' && link.trackingRequest === 'approved' && (
                          <div className="p-3 neo-inset bg-green-500/5 border border-green-500/10">
                            <p className="text-[8px] font-black text-green-600 uppercase tracking-widest flex items-center justify-center gap-2">
                              <ShieldCheck className="h-3 w-3" /> Telemetry Authorized
                            </p>
                          </div>
                        )}

                        {link.status === 'linked' && (
                          <Button onClick={() => handleRejectLink(link.id)} variant="ghost" className="w-full h-8 text-[8px] font-black uppercase text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3 mr-2" /> TERMINATE LINK</Button>
                        )}
                      </div>
                    ))}

                    {userRole === 'guardian' && links.map(link => {
                      const linkedNode = availableNodes.find(n => n.hardwareId === link.hardwareId && n.ownerUid === link.id);
                      return (
                        <div key={link.id} className="neo-flat p-6 space-y-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex gap-4 items-center min-w-0">
                              <Avatar className="h-10 w-10 neo-inset border border-black/5 shrink-0">
                                <AvatarFallback className="bg-transparent text-[10px] font-black text-foreground">{link.targetEmail?.[0].toUpperCase() || 'U'}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{link.targetEmail}</p>
                                <p className="text-[8px] font-black text-muted-foreground uppercase mt-1 truncate">ID: {link.hardwareId}</p>
                              </div>
                            </div>
                            <Badge className={cn("text-[7px] font-black px-2 py-0.5 rounded-sm uppercase shrink-0", link.status === 'linked' ? "bg-green-500/10 text-green-600" : "bg-primary/10 text-primary")}>
                              {link.status}
                            </Badge>
                          </div>

                          {link.status === 'linked' && (
                            <div className="space-y-3 pt-2">
                              {link.trackingRequest === 'approved' ? (
                                <Button 
                                  onClick={() => handleToggleTrack(link.id, link.hardwareId, linkedNode?.trackRequest || false)} 
                                  className={cn(
                                    "w-full h-12 neo-btn text-[9px] font-black uppercase tracking-[0.2em] transition-all",
                                    linkedNode?.trackRequest ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-background text-foreground"
                                  )}
                                >
                                  {linkedNode?.trackRequest ? <Zap className="h-3.5 w-3.5 mr-2 animate-pulse" /> : <ZapOff className="h-3.5 w-3.5 mr-2" />}
                                  {linkedNode?.trackRequest ? "TRACKING ACTIVE" : "START TRACKING"}
                                </Button>
                              ) : link.trackingRequest === 'requested' ? (
                                <Button disabled className="w-full h-12 neo-btn bg-background text-primary/40 text-[9px] font-black uppercase">
                                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> PENDING AUTHORIZATION
                                </Button>
                              ) : (
                                <Button onClick={() => handleRequestTracking(link.id)} className="w-full h-12 neo-btn bg-background text-foreground hover:text-primary text-[9px] font-black uppercase">
                                  <Radar className="h-3.5 w-3.5 mr-2" /> REQUEST TELEMETRY
                                </Button>
                              )}
                            </div>
                          )}
                          <Button onClick={() => handleRejectLink(link.id)} variant="ghost" className="w-full h-8 text-[8px] font-black uppercase text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3 mr-2" /> DISCONNECT</Button>
                        </div>
                      );
                    })}
                  </>
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
                          {n.latitude !== undefined && n.longitude !== undefined && (
                            <Button size="sm" className="neo-btn w-full sm:w-auto h-8 px-4 text-[8px] font-black uppercase tracking-widest bg-background text-foreground hover:text-primary" onClick={() => setInterceptAlert({ ...n, id: n.id })}>
                              <Eye className="h-3.5 w-3.5 mr-2 text-primary/60" /> TACTICAL MAP
                            </Button>
                          )}
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
              <div className="flex flex-col gap-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">Guardian Radar</h2>
                <div className="flex gap-2 max-w-md">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-primary/60" />
                    <Input 
                      placeholder="SCAN HARDWARE ID..." 
                      className="h-12 neo-inset bg-background text-foreground border-none pl-12 font-black uppercase text-[10px] tracking-widest"
                      value={radarSearchTerm}
                      onChange={(e) => setRadarSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!radarSearchTerm || radarSearchTerm.trim().length < 3 ? (
                  <div className="col-span-full neo-flat p-12 text-center opacity-30 flex flex-col items-center">
                    <Radar className="h-12 w-12 mb-6 text-foreground" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Enter Precise Hardware ID to Scan</p>
                  </div>
                ) : radarSearchResults.length === 0 ? (
                  <div className="col-span-full neo-flat p-12 text-center opacity-30 flex flex-col items-center">
                    <ShieldX className="h-12 w-12 mb-6 text-destructive/60" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">No Asset Signature Detected</p>
                  </div>
                ) : (
                  radarSearchResults.map(node => {
                    const existingLink = links.find(l => l.hardwareId === node.hardwareId);
                    return (
                      <div key={node.id} className="neo-flat p-6 space-y-4 group">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-4 items-center min-w-0">
                            <div className="h-10 w-10 neo-inset flex items-center justify-center text-primary/40 shrink-0"><Cpu className="h-5 w-5" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{node.nodeName}</p>
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest truncate">{node.ownerEmail}</p>
                            </div>
                          </div>
                        </div>
                        {existingLink ? (
                          <div className="w-full py-3 neo-inset text-center bg-white/50 border border-black/5">
                            <p className={cn("text-[8px] font-black uppercase flex items-center justify-center gap-2", existingLink.status === 'linked' ? "text-green-600" : "text-primary animate-pulse")}>
                              {existingLink.status === 'linked' ? <ShieldCheck className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
                              {existingLink.status === 'linked' ? "ACTIVE LINK" : "PENDING AUTHORIZATION"}
                            </p>
                          </div>
                        ) : (
                          <Button onClick={() => handleRequestLink(node.ownerUid!, node.hardwareId)} className="w-full h-10 neo-btn bg-background text-foreground hover:text-primary text-[9px] font-black uppercase tracking-widest shadow-sm">
                            <UserPlus className="h-3.5 w-3.5 mr-2" /> REQUEST HANDSHAKE
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
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

      {/* Operational Confirmation Modals */}
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

      {/* Primary Configuration Dialogs */}
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
                        onCheckedChange={(checked) => toggleGroupSelection(group.id, !!checked)}
                        className="border-primary/40 h-5 w-5 rounded-sm"
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
              <Input name="tacticalNodeName" defaultValue={editingNode?.nodeName} required className="h-12 neo-inset bg-background text-foreground border-none px-5 font-black uppercase text-[10px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Hardware ID</Label>
              <Input name="hardwareId" defaultValue={editingNode?.hardwareId} required className="h-12 neo-inset bg-background text-foreground border-none px-5 font-black uppercase text-[10px]" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Calibration Temperature (°C)</Label>
              <Input name="tacticalTemperature" type="number" step="0.1" defaultValue={editingNode?.temperature || 24.5} required className="h-12 neo-inset bg-background text-foreground border-none px-5 font-black uppercase text-[10px]" />
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
                        onCheckedChange={(checked) => toggleGroupSelection(group.id, !!checked)}
                        className="border-primary/40 h-5 w-5 rounded-sm"
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
