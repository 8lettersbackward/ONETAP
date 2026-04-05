
"use client";

import { useUser, useDatabase, useFirebase } from "@/firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  UserPlus,
  Layers,
  PlusSquare,
  Eye,
  Eraser,
  Thermometer,
  Pencil,
  PlusCircle,
  MapPin,
  AlertTriangle,
  Radar,
  ShieldAlert,
  Search,
  Activity
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, set, push, remove, update, onChildAdded, off, onValue, get } from "firebase/database";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useRtdb } from "@/firebase/database/use-rtdb";

const SOSMap = dynamic(() => import("./sos-map"), { 
  ssr: false,
  loading: () => <div className="h-[420px] w-full bg-muted animate-pulse rounded-lg flex items-center justify-center text-[10px] font-bold uppercase tracking-widest opacity-40">Initializing Terminal Map...</div>
});

type TabType = 'buddies' | 'nodes' | 'notifications' | 'settings' | 'guardian';

const DEFAULT_BUDDY_GROUPS = ["Family", "Friend", "Close Friend"];

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { auth } = useFirebase();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('buddies');
  const [hasMounted, setHasMounted] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [vaultClearedAt, setVaultClearedAt] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [buddyForm, setBuddyForm] = useState({
    name: '',
    phoneNumber: '',
    groups: [] as string[]
  });

  const [nodeForm, setNodeForm] = useState({
    nodeName: '',
    hardwareId: '',
    phoneNumber: '',
    temperature: 24,
    targetGroups: [] as string[]
  });

  const [allDiscoveredNodes, setAllDiscoveredNodes] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [trackingLocation, setTrackingLocation] = useState<any>(null);
  const [isLiveMapOpen, setIsLiveMapOpen] = useState(false);
  const [activeTrackedNode, setActiveTrackedNode] = useState<any>(null);

  const [isAddBuddyDialogOpen, setIsAddBuddyDialogOpen] = useState(false);
  const [isAddNodeDialogOpen, setIsAddNodeDialogOpen] = useState(false);
  const [isEditBuddyDialogOpen, setIsEditBuddyDialogOpen] = useState(false);
  const [isEditNodeDialogOpen, setIsEditNodeDialogOpen] = useState(false);
  const [isViewItemDialogOpen, setIsViewItemDialogOpen] = useState(false);
  const [isManageGroupsDialogOpen, setIsManageGroupsDialogOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [itemToView, setItemToView] = useState<any>(null);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [mapNotification, setMapNotification] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const [activeSosAlert, setActiveSosAlert] = useState<any>(null);
  const [isSosMapOpen, setIsSosMapOpen] = useState(false);
  const lastProcessedSosRef = useRef<string | null>(null);

  const currentName = useMemo(() => {
    if (!user?.email) return "User";
    return user.email.split('@')[0];
  }, [user]);

  useEffect(() => {
    setHasMounted(true);
    const savedClearedAt = localStorage.getItem('vaultClearedAt');
    if (savedClearedAt) {
      setVaultClearedAt(parseInt(savedClearedAt));
    }
    if (!userLoading && !user) {
      router.push("/login");
    }
    
    if (user && rtdb) {
      const profileRef = ref(rtdb, `users/${user.uid}/profile`);
      get(profileRef).then(snapshot => {
        const profile = snapshot.val();
        setUserRole(profile?.role || 'user');
        if (profile?.role === 'guardian') {
          setActiveTab('guardian');
        }
      });
    }
  }, [user, userLoading, router, rtdb]);

  useEffect(() => {
    if (userRole === 'guardian' && rtdb) {
      const usersRef = ref(rtdb, 'users');
      const unsubscribe = onValue(usersRef, (snapshot) => {
        const allUsers = snapshot.val();
        const nodesList: any[] = [];
        if (allUsers) {
          for (const uid in allUsers) {
            const userNodes = allUsers[uid].nodes;
            if (userNodes) {
              for (const nKey in userNodes) {
                nodesList.push({
                  ...userNodes[nKey],
                  ownerUid: uid,
                  nodeKey: nKey
                });
              }
            }
          }
        }
        setAllDiscoveredNodes(nodesList);
      });
      return () => off(usersRef, 'value', unsubscribe);
    }
  }, [userRole, rtdb]);

  const groupsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddyGroups`) : null, [rtdb, user]);
  const { data: customGroupsData } = useRtdb(groupsRef);

  const buddiesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddies`) : null, [rtdb, user]);
  const { data: buddiesData } = useRtdb(buddiesRef);

  const nodesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/nodes`) : null, [rtdb, user]);
  const { data: nodesData } = useRtdb(nodesRef);

  const notificationsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/notifications`) : null, [rtdb, user]);
  const { data: notificationsData } = useRtdb(notificationsRef);

  useEffect(() => {
    if (!user || !rtdb) return;

    const queryRef = ref(rtdb, `users/${user.uid}/notifications`);
    
    const unsubscribe = onChildAdded(queryRef, (snapshot) => {
      const alert = snapshot.val();
      const alertId = snapshot.key;

      if (alert && alert.type === "sos" && alertId !== lastProcessedSosRef.current) {
        lastProcessedSosRef.current = alertId;
        const createdAt = alert.createdAt || alert.timestamp || 0;
        if (Date.now() - createdAt < 30000) {
          setActiveSosAlert({ ...alert, id: alertId, createdAt });
          setIsSosMapOpen(true);
        }
      }
    });

    return () => off(queryRef, "child_added", unsubscribe);
  }, [user, rtdb]);

  const buddyGroups = useMemo(() => {
    const customNames = customGroupsData ? Object.values(customGroupsData).map((g: any) => g.name) : [];
    return Array.from(new Set([...DEFAULT_BUDDY_GROUPS, ...customNames]));
  }, [customGroupsData]);

  const buddies = useMemo(() => {
    if (!buddiesData) return [];
    return Object.entries(buddiesData).map(([id, val]: [string, any]) => ({ ...val, id }));
  }, [buddiesData]);

  const nodes = useMemo(() => {
    if (!nodesData) return [];
    return Object.entries(nodesData).map(([id, val]: [string, any]) => ({ ...val, id }));
  }, [nodesData]);

  const notifications = useMemo(() => {
    if (!notificationsData) return [];
    return Object.entries(notificationsData)
      .map(([id, val]: [string, any]) => {
        const createdAt = val.createdAt || val.timestamp || 0;
        return { ...val, id, createdAt };
      })
      .filter(n => n.createdAt > vaultClearedAt)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notificationsData, vaultClearedAt]);

  const logAction = (message: string, type: string = 'system_log') => {
    if (!user || !rtdb) return;
    const notificationRef = ref(rtdb, `users/${user.uid}/notifications`);
    push(notificationRef, {
      message,
      createdAt: Date.now(),
      type
    });
  };

  const handleClearNotifications = () => {
    const now = Date.now();
    setVaultClearedAt(now);
    localStorage.setItem('vaultClearedAt', now.toString());
    toast({ title: "Terminal Purged", description: "Interface logs cleared locally." });
  };

  const handleInitiateTracking = (targetNode: any) => {
    if (!user || !rtdb) return;
    
    setRegisterLoading(true);
    const nodeRef = ref(rtdb, `users/${targetNode.ownerUid}/nodes/${targetNode.nodeKey}`);
    
    update(nodeRef, { 
      trackRequest: true,
      trackRequester: user.uid 
    }).then(() => {
      setActiveTrackedNode(targetNode);
      logAction(`Signal Lock Initiated for Hardware: ${targetNode.hardwareId}`);
      
      const statusUnsubscribe = onValue(nodeRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          if (data.latitude && data.longitude) {
            setTrackingLocation({
              latitude: data.latitude,
              longitude: data.longitude
            });
            setIsLiveMapOpen(true);
            toast({ 
              title: "Signal Locked", 
              description: `Signal locked for hardware ID: ${targetNode.hardwareId}. Phone: ${data.phoneNumber || 'N/A'}` 
            });
            statusUnsubscribe();
            
            // Auto-reset signal after lock is established
            setTimeout(() => {
              update(nodeRef, { trackRequest: false, trackRequester: null });
            }, 10000);
          }
        }
      });
    }).catch((err) => {
      toast({ variant: "destructive", title: "Intercept Failed", description: err.message });
    }).finally(() => setRegisterLoading(false));
  };

  const handleManualSearch = () => {
    if (!searchQuery) return;
    
    const target = allDiscoveredNodes.find(n => 
      n.hardwareId?.toLowerCase() === searchQuery.toLowerCase() || 
      n.nodeName?.toLowerCase() === searchQuery.toLowerCase()
    );

    if (target) {
      handleInitiateTracking(target);
    } else {
      toast({
        variant: "destructive",
        title: "Signal Lost",
        description: "No matching hardware signature found in the network."
      });
    }
  };

  const safeFormatTime = (ts: any) => {
    if (!ts) return "---";
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "---" : d.toLocaleTimeString();
  };

  const safeFormatDate = (ts: any) => {
    if (!ts) return "---";
    const d = new Date(ts);
    return isNaN(d.getTime()) ? "---" : d.toLocaleDateString();
  };

  if (userLoading || !hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#e1f1fd]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const navItems = userRole === 'guardian' 
    ? [
        { id: 'guardian', label: 'TRACK', icon: Radar },
        { id: 'notifications', label: 'NOTIFICATION', icon: Bell },
        { id: 'settings', label: 'PROFILE', icon: Settings },
      ]
    : [
        { id: 'buddies', label: 'MANAGE BUDDIES', icon: Smartphone },
        { id: 'nodes', label: 'MANAGE NODES', icon: Cpu },
        { id: 'notifications', label: 'NOTIFICATION', icon: Bell },
        { id: 'settings', label: 'PROFILE', icon: Settings },
      ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#e1f1fd] text-[#12086F]">
      <aside className="w-full md:w-64 bg-white/50 border-r border-primary/10 p-6 md:h-screen sticky top-0 backdrop-blur-md">
        <div className="space-y-12">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarFallback className="bg-primary/20 text-primary font-bold">
                {currentName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{currentName}</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{userRole}</p>
            </div>
          </div>
          <nav className="space-y-4">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as TabType)}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 transition-all rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em]",
                  activeTab === item.id 
                    ? "bg-primary text-white shadow-lg shadow-primary/20" 
                    : "hover:bg-primary/5 text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-16 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'guardian' && (
             <div className="space-y-10">
               <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-4xl font-bold tracking-tighter text-[#12086F]">TRACK</h1>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 mt-2">Tactical Signal Intercept</p>
                  </div>
                  <Badge className="bg-secondary/20 text-secondary border-none px-4 py-1.5 text-[9px] uppercase font-bold rounded-full flex items-center gap-2">
                    <Activity className="h-3 w-3 animate-pulse" /> Network Scan Active
                  </Badge>
               </div>
               
               <Card className="glass-card border-none p-10 shadow-2xl">
                 <div className="space-y-8">
                   <div className="space-y-4">
                     <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Hardware ID or Node Name</Label>
                     <div className="flex flex-col md:flex-row gap-4">
                       <Input 
                         placeholder="Enter signature (e.g. 1Tap, SMART-01)" 
                         value={searchQuery}
                         onChange={(e) => setSearchQuery(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleManualSearch()}
                         className="bg-primary/5 border-primary/10 rounded-2xl h-16 text-sm font-bold flex-1 px-6 shadow-inner"
                       />
                       <Button 
                         onClick={handleManualSearch} 
                         disabled={registerLoading || !searchQuery}
                         className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-16 px-12 bg-secondary hover:bg-secondary/90 text-white shadow-xl shadow-secondary/20"
                       >
                         {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Radar className="h-5 w-5 mr-3" /> Intercept Signal</>}
                       </Button>
                     </div>
                   </div>
                   
                   <div className="pt-6 border-t border-primary/5">
                     <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Global Network Status: {allDiscoveredNodes.length} Active Nodes Detected</p>
                   </div>
                 </div>
               </Card>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 opacity-40 grayscale pointer-events-none">
                 {/* This section is now just a placeholder for background aesthetics as per "Search instead of selecting" */}
                 <div className="h-32 rounded-3xl border-2 border-dashed border-primary/10 flex items-center justify-center">
                    <p className="text-[8px] font-bold uppercase tracking-[0.4em]">Standby</p>
                 </div>
                 <div className="h-32 rounded-3xl border-2 border-dashed border-primary/10 flex items-center justify-center">
                    <p className="text-[8px] font-bold uppercase tracking-[0.4em]">Scanning</p>
                 </div>
                 <div className="h-32 rounded-3xl border-2 border-dashed border-primary/10 flex items-center justify-center">
                    <p className="text-[8px] font-bold uppercase tracking-[0.4em]">Waiting</p>
                 </div>
               </div>
             </div>
          )}

          {activeTab === 'buddies' && userRole !== 'guardian' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold tracking-tighter text-[#12086F]">MANAGE BUDDIES</h1>
                <div className="flex gap-4">
                  <Button onClick={() => setIsAddBuddyDialogOpen(true)} className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8 bg-primary hover:bg-primary text-white">
                    <UserPlus className="h-4 w-4 mr-2" /> Enlist
                  </Button>
                  <Button onClick={() => setIsManageGroupsDialogOpen(true)} variant="outline" className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8 border-primary/20 hover:bg-primary/5">
                    <Layers className="h-4 w-4 mr-2" /> Protocols
                  </Button>
                </div>
              </div>

              {buddies.length === 0 ? (
                <Card className="glass-card p-24 text-center border-dashed border-primary/40 bg-white/40">
                  <Smartphone className="h-12 w-12 text-primary/20 mx-auto mb-6" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Standby Mode: No Enlisted Buddies</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {buddies.map(buddy => (
                    <Card key={buddy.id} className="glass-card border-none group transition-all">
                      <CardHeader className="p-8">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-xl font-bold text-[#12086F]">{buddy.name}</p>
                            <p className="text-[10px] font-mono text-secondary uppercase tracking-widest mt-1">{buddy.phoneNumber}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {buddy.groups?.map((g: string) => (
                            <Badge key={g} variant="outline" className="text-[9px] border-secondary/40 text-secondary uppercase font-bold px-3 bg-secondary/5">{g}</Badge>
                          ))}
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 pt-0">
                        <div className="flex gap-4 pt-6 border-t border-primary/10">
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-primary/5" onClick={() => { setItemToView(buddy); setIsViewItemDialogOpen(true); }}><Eye className="h-3.5 w-3.5 mr-2" /> View</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-primary text-white" onClick={() => { setItemToEdit(buddy); setIsEditBuddyDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-destructive" onClick={() => { setItemToDelete({ ...buddy, type: 'buddy' }); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'nodes' && userRole !== 'guardian' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold tracking-tighter text-[#12086F]">MANAGE NODES</h1>
                <Button onClick={() => setIsAddNodeDialogOpen(true)} className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8 bg-primary hover:bg-primary text-white">
                  <PlusSquare className="h-4 w-4 mr-2" /> Arm Node
                </Button>
              </div>

              {nodes.length === 0 ? (
                <Card className="glass-card p-24 text-center border-dashed border-primary/40 bg-white/40">
                  <Cpu className="h-12 w-12 text-primary/20 mx-auto mb-6" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Systems Offline: No Active Nodes</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {nodes.map(node => (
                    <Card key={node.id} className="glass-card border-none group transition-all">
                      <CardHeader className="p-8">
                        <div className="flex justify-between items-center mb-4">
                          <div>
                            <p className="text-xl font-bold text-[#12086F]">{node.nodeName}</p>
                            {node.phoneNumber && <p className="text-[9px] font-mono text-secondary mt-1 uppercase tracking-widest">{node.phoneNumber}</p>}
                          </div>
                          <div className={cn("h-3 w-3 rounded-full", node.status === 'online' ? 'bg-secondary shadow-[0_0_15px_rgba(72,149,239,0.4)]' : 'bg-muted')} />
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">ID: {node.hardwareId}</p>
                      </CardHeader>
                      <CardContent className="p-8 pt-0 space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-2"><Thermometer className="h-3 w-3" /> Thermal Threshold</Label>
                            <span className="text-[10px] font-mono font-bold text-secondary">{node.temperature || 24}°C</span>
                          </div>
                          <Slider 
                            defaultValue={[node.temperature || 24]} 
                            max={60} 
                            min={0}
                            step={1} 
                            onValueCommit={(val) => {
                              if (!user || !rtdb) return;
                              update(ref(rtdb, `users/${user.uid}/nodes/${node.id}`), { temperature: val[0] });
                              logAction(`Adjusted thermal threshold for ${node.nodeName} to ${val[0]}°C`);
                            }}
                            className="py-2"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {node.targetGroups?.map((g: string) => (
                            <Badge key={g} className="bg-primary/10 border-none text-primary text-[9px] uppercase font-bold px-3">{g}</Badge>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-4 pt-6 border-t border-primary/10">
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-primary/5" onClick={() => { setItemToView(node); setIsViewItemDialogOpen(true); }}><Eye className="h-3.5 w-3.5 mr-2" /> View</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-primary text-white" onClick={() => { setItemToEdit(node); setIsEditNodeDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-destructive" onClick={() => { setItemToDelete({ ...node, type: 'node' }); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold tracking-tighter text-[#12086F]">NOTIFICATION</h1>
                {notifications.length > 0 && (
                  <Button 
                    variant="ghost" 
                    onClick={handleClearNotifications} 
                    className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8 border border-primary/10 hover:bg-destructive/10 text-destructive"
                  >
                    <Eraser className="h-4 w-4 mr-2" /> Clear Vault
                  </Button>
                )}
              </div>
              <Card className="glass-card border-none">
                <ScrollArea className="h-[600px] p-8">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] opacity-10">
                      <Bell className="h-16 w-16 mb-6" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Notification Vault Clear</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={cn("mb-8 pb-8 border-b border-primary/5 last:border-0 last:mb-0", n.type === 'sos' && "bg-destructive/5 -mx-4 px-4 rounded-xl")}>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-4 items-center">
                            {n.type === 'sos' && <AlertTriangle className="h-5 w-5 text-destructive animate-pulse" />}
                            <p className={cn("text-md font-bold tracking-wide", n.type === 'sos' && "text-destructive uppercase")}>
                              {n.type === 'sos' ? `🚨 SOS ALERT - ${n.nodeName || 'UNIDENTIFIED'}` : n.message}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("text-[9px] font-bold px-3 bg-white/50", n.type === 'sos' ? "border-destructive/40 text-destructive" : "border-secondary/40 text-secondary")}>
                            {safeFormatTime(n.createdAt)}
                          </Badge>
                        </div>
                        {n.type === 'sos' && (
                          <div className="space-y-4 mb-4 ml-9">
                            <p className="text-xs font-medium text-destructive/80">Trigger: {n.trigger || 'Manual SOS'}</p>
                            <p className="text-xs font-medium opacity-60 flex items-center gap-2"><MapPin className="h-3 w-3" /> {n.place || 'Location Coordinates Acquired'}</p>
                            <div className="flex gap-3">
                               <Button size="sm" onClick={() => { setActiveSosAlert(n); setIsSosMapOpen(true); }} className="h-8 rounded-lg bg-destructive text-[9px] font-bold uppercase tracking-widest px-6 shadow-lg shadow-destructive/20 text-white">Tactical Map</Button>
                               {n.latitude && n.longitude && (
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="h-8 rounded-lg text-[9px] font-bold uppercase tracking-widest px-6 border-destructive/20 text-destructive hover:bg-destructive/5"
                                    onClick={() => {
                                      setMapNotification(n);
                                      setIsMapModalOpen(true);
                                    }}
                                  >
                                    View
                                  </Button>
                               )}
                            </div>
                          </div>
                        )}
                        {!n.type || n.type !== 'sos' && n.latitude && n.longitude && (
                          <div className="ml-9 mb-4">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 rounded-xl text-[9px] font-bold uppercase tracking-widest px-6 border-primary/20 hover:bg-primary/5"
                              onClick={() => {
                                setMapNotification(n);
                                setIsMapModalOpen(true);
                              }}
                            >
                              <MapPin className="h-3.5 w-3.5 mr-2" /> View
                            </Button>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold ml-9">{safeFormatDate(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-md space-y-10">
              <h1 className="text-4xl font-bold tracking-tighter text-[#12086F]">PROFILE SETTINGS</h1>
              <Card className="glass-card border-none p-10 space-y-8">
                <div className="p-6 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] font-bold text-secondary uppercase tracking-widest mb-2">Auth Identification</p>
                  <p className="text-[10px] font-mono opacity-60 truncate">{user.uid}</p>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mt-4 mb-2">Tactical Role</p>
                  <Badge className="bg-primary text-white border-none text-[9px] font-bold uppercase px-4">{userRole}</Badge>
                </div>
                <Button variant="destructive" onClick={() => signOut(auth).then(() => router.push("/login"))} className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] shadow-lg shadow-destructive/20 text-white">
                  <LogOut className="h-4 w-4 mr-3" /> Terminate Session
                </Button>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isLiveMapOpen} onOpenChange={setIsLiveMapOpen}>
        <DialogContent className="bg-white border-2 border-secondary/20 shadow-2xl rounded-[2rem] max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-10 border-b border-secondary/5 bg-secondary/5">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <Radar className="h-8 w-8 text-secondary animate-pulse" />
                  <div>
                    <DialogTitle className="text-2xl font-bold text-secondary uppercase tracking-tighter">Live Asset Tracking</DialogTitle>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Asset: {activeTrackedNode?.nodeName} | ID: {activeTrackedNode?.hardwareId}</p>
                  </div>
               </div>
               <Badge className="bg-secondary text-white border-none text-[10px] font-bold uppercase px-4 py-2 rounded-xl">Signal Locked</Badge>
             </div>
          </DialogHeader>
          <div className="p-10 space-y-8">
            <div className="relative rounded-2xl overflow-hidden border border-secondary/10 shadow-inner">
               <SOSMap 
                  latitude={trackingLocation?.latitude || 0} 
                  longitude={trackingLocation?.longitude || 0}
                  label={`ACTIVE SIGNAL: ${activeTrackedNode?.nodeName}`}
               />
               <div className="absolute bottom-6 left-6 right-6 z-[1000] glass-card p-4 rounded-xl flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-secondary" />
                  <p className="text-[10px] font-bold uppercase tracking-widest flex-1">Lat: {trackingLocation?.latitude?.toFixed(6)} | Lng: {trackingLocation?.longitude?.toFixed(6)}</p>
               </div>
            </div>

            <Button 
              onClick={() => setIsLiveMapOpen(false)} 
              className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] bg-secondary hover:bg-secondary shadow-xl shadow-secondary/20 text-white"
            >
              Terminate Signal Monitoring
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-[2rem] max-w-3xl p-0 overflow-hidden">
          <DialogHeader className="p-8 border-b border-primary/5">
            <DialogTitle className="text-xl font-bold uppercase tracking-widest text-secondary">Spatial Coordinate Intercept</DialogTitle>
          </DialogHeader>
          <div className="p-0">
            {mapNotification && (
              <iframe
                width="100%"
                height="400"
                style={{ border: 0 }}
                loading="lazy"
                allowFullScreen
                referrerPolicy="no-referrer-when-downgrade"
                src={`https://www.google.com/maps?q=${mapNotification.latitude},${mapNotification.longitude}&output=embed`}
              ></iframe>
            )}
          </div>
          <div className="p-8">
             <Button onClick={() => setIsMapModalOpen(false)} className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg bg-primary hover:bg-primary text-white">
               Acknowledge Signal
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSosMapOpen} onOpenChange={setIsSosMapOpen}>
        <DialogContent className="bg-white border-2 border-destructive/20 shadow-2xl rounded-[2rem] max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="p-10 border-b border-destructive/5 bg-destructive/5">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <AlertTriangle className="h-8 w-8 text-destructive animate-bounce" />
                  <div>
                    <DialogTitle className="text-2xl font-bold text-destructive uppercase tracking-tighter">Tactical SOS Intercept</DialogTitle>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Master Signal: {activeSosAlert?.nodeName || 'Hardware Node'}</p>
                  </div>
               </div>
               <Badge className="bg-destructive text-white border-none text-[10px] font-bold uppercase px-4 py-2 rounded-xl animate-pulse">Critical Alert</Badge>
             </div>
          </DialogHeader>
          <div className="p-10 space-y-8">
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-2">
                 <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Trigger Source</Label>
                 <p className="text-sm font-bold text-destructive">{activeSosAlert?.trigger || 'Security Protocol 1-TAP'}</p>
               </div>
               <div className="space-y-2">
                 <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Timestamp</Label>
                 <p className="text-sm font-bold">{activeSosAlert?.createdAt ? new Date(activeSosAlert.createdAt).toLocaleString() : 'N/A'}</p>
               </div>
            </div>
            
            <div className="relative rounded-2xl overflow-hidden border border-destructive/10 shadow-inner">
               <SOSMap 
                  latitude={activeSosAlert?.latitude || 0} 
                  longitude={activeSosAlert?.longitude || 0}
                  label={activeSosAlert?.nodeName}
               />
               <div className="absolute bottom-6 left-6 right-6 z-[1000] glass-card p-4 rounded-xl flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-destructive" />
                  <p className="text-[10px] font-bold uppercase tracking-widest flex-1">{activeSosAlert?.place || 'Coordinates Identified'}</p>
               </div>
            </div>

            <Button 
              onClick={() => setIsSosMapOpen(false)} 
              className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] bg-destructive hover:bg-destructive shadow-xl shadow-destructive/20 text-white"
            >
              Acknowledge & Close Tactical Map
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddBuddyDialogOpen} onOpenChange={setIsAddBuddyDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] max-w-md p-10">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-secondary mb-6">Enlist Buddy</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!user || !rtdb) return;
            setRegisterLoading(true);
            const buddyId = `BUDDY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            set(ref(rtdb, `users/${user.uid}/buddies/${buddyId}`), { ...buddyForm, id: buddyId, registeredAt: Date.now() })
              .then(() => {
                logAction(`Enlisted new buddy: ${buddyForm.name}`);
                setIsAddBuddyDialogOpen(false);
                setBuddyForm({ name: '', phoneNumber: '', groups: [] });
                toast({ title: "Buddy Enlisted" });
              })
              .finally(() => setRegisterLoading(false));
          }} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Full Name</Label>
              <Input value={buddyForm.name} onChange={e => setBuddyForm({...buddyForm, name: e.target.value})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Phone Number</Label>
              <Input value={buddyForm.phoneNumber} onChange={e => setBuddyForm({...buddyForm, phoneNumber: e.target.value})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Protocol Groups</Label>
              <div className="grid grid-cols-2 gap-4 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-3">
                    <Checkbox checked={buddyForm.groups.includes(g)} onCheckedChange={() => {
                      const updated = buddyForm.groups.includes(g) ? buddyForm.groups.filter(x => x !== g) : [...buddyForm.groups, g];
                      setBuddyForm({...buddyForm, groups: updated});
                    }} className="rounded-md border-primary/20 data-[state=checked]:bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg bg-primary hover:bg-primary text-white" disabled={registerLoading}>
              {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Buddy"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddNodeDialogOpen} onOpenChange={setIsAddNodeDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] max-w-md p-10">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-secondary mb-6">Arm Node</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!user || !rtdb) return;
            setRegisterLoading(true);
            const nodeId = nodeForm.hardwareId || `NODE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            set(ref(rtdb, `users/${user.uid}/nodes/${nodeId}`), { ...nodeForm, id: nodeId, status: 'online', registeredAt: Date.now() })
              .then(() => {
                logAction(`Armed new hardware node: ${nodeForm.nodeName}`);
                setIsAddNodeDialogOpen(false);
                setNodeForm({ nodeName: '', hardwareId: '', phoneNumber: '', temperature: 24, targetGroups: [] });
                toast({ title: "Node Armed" });
              })
              .finally(() => setRegisterLoading(false));
          }} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Node Name</Label>
              <Input value={nodeForm.nodeName} onChange={e => setNodeForm({...nodeForm, nodeName: e.target.value})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Hardware ID</Label>
              <Input value={nodeForm.hardwareId} onChange={e => setNodeForm({...nodeForm, hardwareId: e.target.value})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-mono" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Phone Number</Label>
              <Input value={nodeForm.phoneNumber} onChange={e => setNodeForm({...nodeForm, phoneNumber: e.target.value})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Initial Thermal Threshold (°C)</Label>
              <Input type="number" value={nodeForm.temperature} onChange={e => setNodeForm({...nodeForm, temperature: parseInt(e.target.value)})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Broadcast Targets</Label>
              <div className="grid grid-cols-2 gap-4 p-6 bg-primary/5 rounded-2xl border border-primary/10">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-3">
                    <Checkbox checked={nodeForm.targetGroups.includes(g)} onCheckedChange={() => {
                      const updated = nodeForm.targetGroups.includes(g) ? nodeForm.targetGroups.filter(x => x !== g) : [...nodeForm.targetGroups, g];
                      setNodeForm({...nodeForm, targetGroups: updated});
                    }} className="rounded-md border-primary/20 data-[state=checked]:bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg bg-primary hover:bg-primary text-white" disabled={registerLoading}>
              {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Arm Node"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewItemDialogOpen} onOpenChange={setIsViewItemDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] max-w-md p-10">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-secondary mb-6">Asset Overview</DialogTitle></DialogHeader>
          {itemToView && (
            <div className="space-y-8">
              <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Descriptor</span>
                  <span className="text-sm font-bold text-[#12086F]">{itemToView.nodeName || itemToView.name}</span>
                </div>
                {itemToView.phoneNumber && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Phone Number</span>
                    <span className="text-[10px] font-mono text-secondary">{itemToView.phoneNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">{itemToView.hardwareId ? 'Hardware ID' : 'Internal ID'}</span>
                  <span className="text-[10px] font-mono text-secondary">{itemToView.hardwareId || itemToView.id}</span>
                </div>
                {itemToView.temperature !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Thermal Threshold</span>
                    <span className="text-[10px] font-mono text-secondary">{itemToView.temperature}°C</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Current Status</span>
                  <Badge className={cn("text-[9px] uppercase font-bold", itemToView.status === 'online' ? "bg-secondary/20 text-secondary" : "bg-muted/20 text-muted-foreground")}>{itemToView.status || 'Active'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Link Created</span>
                  <span className="text-[10px] opacity-60 font-bold">{safeFormatDate(itemToView.registeredAt)} {safeFormatTime(itemToView.registeredAt)}</span>
                </div>
              </div>
              <div className="p-8 bg-primary/5 rounded-3xl border border-primary/10">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary mb-6">Authorized Protocols</p>
                <div className="flex flex-wrap gap-2">
                  {(itemToView.targetGroups || itemToView.groups || []).map((g: string) => (
                    <Badge key={g} variant="outline" className="bg-white/50 border-primary/10 text-[9px] px-4 py-1.5 opacity-80 uppercase font-bold text-primary">{g}</Badge>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isManageGroupsDialogOpen} onOpenChange={setIsManageGroupsDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] max-w-md p-10">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-secondary mb-6">Safety Protocols</DialogTitle></DialogHeader>
          <div className="space-y-8">
            <div className="flex gap-3">
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Protocol Name" className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold uppercase tracking-widest" />
              <Button onClick={() => {
                if (!user || !newGroupName) return;
                push(ref(rtdb, `users/${user.uid}/buddyGroups`), { name: newGroupName });
                logAction(`Created new protocol group: ${newGroupName}`);
                setNewGroupName("");
              }} className="h-14 w-14 rounded-2xl p-0 shadow-lg bg-primary hover:bg-primary text-white"><PlusCircle className="h-6 w-6" /></Button>
            </div>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {buddyGroups.map(g => (
                  <div key={g} className="p-5 bg-primary/5 rounded-2xl flex justify-between items-center group/item transition-all border border-transparent">
                    <span className="text-[10px] font-bold uppercase tracking-widest">{g}</span>
                    {!DEFAULT_BUDDY_GROUPS.includes(g) && (
                      <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl text-destructive" onClick={() => {
                        const gId = Object.entries(customGroupsData || {}).find(([k, v]: any) => v.name === g)?.[0];
                        if (gId) {
                          remove(ref(rtdb, `users/${user.uid}/buddyGroups/${gId}`));
                          logAction(`Removed protocol group: ${g}`);
                        }
                      }}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] p-10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold uppercase tracking-widest text-destructive mb-4">Purge Asset?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">This asset will be permanently erased from the terminal hub and protocol networks.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest flex-1 border-primary/10">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!user || !itemToDelete) return;
              const path = itemToDelete.type === 'buddy' ? `users/${user.uid}/buddies/${itemToDelete.id}` : `users/${user.uid}/nodes/${itemToDelete.id}`;
              const name = itemToDelete.nodeName || itemToDelete.name;
              remove(ref(rtdb, path)).then(() => {
                logAction(`Purged asset from network: ${name} (${itemToDelete.type})`);
                setIsDeleteDialogOpen(false);
                setItemToDelete(null);
                toast({ title: "Asset Purged" });
              });
            }} className="rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest flex-1 bg-destructive hover:bg-destructive text-white">Confirm Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
