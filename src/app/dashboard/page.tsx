
"use client";

import { useUser, useDatabase, useRtdb, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  Activity,
  Smartphone,
  Loader2,
  Trash2,
  LogOut,
  LayoutDashboard,
  History,
  PlusSquare,
  UserPlus,
  Layers,
  MapPin,
  Zap,
  PlusCircle,
  Pencil,
  Eye,
  ShieldAlert,
  ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, set, push, remove, serverTimestamp, update } from "firebase/database";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer } from "@/components/ui/chart";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { reverseGeocode } from "@/ai/flows/reverse-geocode-flow";

type TabType = 'overview' | 'buddies' | 'nodes' | 'location' | 'notifications' | 'settings';

const DEFAULT_BUDDY_GROUPS = ["Family", "Friend", "Close Friend"];

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { auth } = useFirebase();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [hasMounted, setHasMounted] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const [registerLoading, setRegisterLoading] = useState(false);
  const [buddyForm, setBuddyForm] = useState({
    name: '',
    phoneNumber: '',
    role: 'Primary Emergency Contact',
    priority: 'High',
    groups: [] as string[]
  });

  const [nodeForm, setNodeForm] = useState({
    nodeName: '',
    hardwareId: '',
    targetGroups: [] as string[]
  });

  const [locationData, setLocationData] = useState({ lat: '', lng: '' });
  const [locationName, setLocationName] = useState<string>("");
  const [resolvingLocation, setResolvingLocation] = useState(false);
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const [isAddBuddyDialogOpen, setIsAddBuddyDialogOpen] = useState(false);
  const [isAddNodeDialogOpen, setIsAddNodeDialogOpen] = useState(false);
  const [isEditBuddyDialogOpen, setIsEditBuddyDialogOpen] = useState(false);
  const [isEditNodeDialogOpen, setIsEditNodeDialogOpen] = useState(false);
  const [isViewItemDialogOpen, setIsViewItemDialogOpen] = useState(false);
  const [isManageGroupsDialogOpen, setIsManageGroupsDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any>(null);
  const [itemToView, setItemToView] = useState<any>(null);
  const [itemToEdit, setItemToEdit] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");

  const currentName = useMemo(() => {
    if (!user?.email) return "User";
    return user.email.split('@')[0];
  }, [user]);

  useEffect(() => {
    setHasMounted(true);
    if (!userLoading && !user) {
      router.push("/login");
    }
    const isDark = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, [user, userLoading, router]);

  const profileRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/profile`) : null, [rtdb, user]);
  const { data: profileData } = useRtdb(profileRef);

  const groupsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddyGroups`) : null, [rtdb, user]);
  const { data: customGroupsData } = useRtdb(groupsRef);

  const buddiesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddies`) : null, [rtdb, user]);
  const { data: buddiesData } = useRtdb(buddiesRef);

  const nodesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/nodes`) : null, [rtdb, user]);
  const { data: nodesData } = useRtdb(nodesRef);

  const notificationsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/notifications`) : null, [rtdb, user]);
  const { data: notificationsData } = useRtdb(notificationsRef);

  const sosSystemRef = useMemo(() => ref(rtdb, "sosSystem"), [rtdb]);
  const { data: sosStatus } = useRtdb(sosSystemRef);

  const handleResolveLocation = useCallback(async (lat: number, lng: number) => {
    setResolvingLocation(true);
    try {
      const result = await reverseGeocode({ latitude: lat, longitude: lng });
      if (result.city) setLocationName(`${result.city}, ${result.province}, ${result.country}`);
      else setLocationName("Coordinates Locked");
    } catch (err) {
      setLocationName("Coordinates Locked");
    } finally {
      setResolvingLocation(false);
    }
  }, []);

  useEffect(() => {
    if (profileData && hasMounted) {
      const lat = profileData.latitude?.toString() || '';
      const lng = profileData.longitude?.toString() || '';
      setLocationData({ lat, lng });
      if (lat && lng) handleResolveLocation(parseFloat(lat), parseFloat(lng));
    }
  }, [profileData, hasMounted, handleResolveLocation]);

  const buddyGroups = useMemo(() => {
    const customNames = customGroupsData ? Object.values(customGroupsData).map((g: any) => g.name) : [];
    return Array.from(new Set([...DEFAULT_BUDDY_GROUPS, ...customNames]));
  }, [customGroupsData]);

  const toggleTheme = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    if (typeof window !== 'undefined') {
      if (newTheme === 'dark') document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
    }
  };

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
      .map(([id, val]: [string, any]) => ({ ...val, id }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [notificationsData]);

  const statusStats = useMemo(() => {
    const online = nodes.filter(n => n.status === 'online').length;
    const offline = nodes.filter(n => n.status === 'offline').length;
    const error = nodes.filter(n => n.status === 'error').length;
    return { online, offline, error, total: nodes.length };
  }, [nodes]);

  const chartData = useMemo(() => [
    { name: 'Secured', value: statusStats.online, fill: "hsl(var(--primary))" },
    { name: 'Inactive', value: statusStats.offline, fill: "hsl(var(--muted-foreground))" },
    { name: 'Alert', value: statusStats.error, fill: "hsl(var(--destructive))" },
  ], [statusStats]);

  const handleRegisterBuddy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    setRegisterLoading(true);
    const buddyId = `BUDDY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const payload = { ...buddyForm, id: buddyId, registeredAt: Date.now() };
    set(ref(rtdb, `users/${user.uid}/buddies/${buddyId}`), payload)
      .then(() => {
        setIsAddBuddyDialogOpen(false);
        setBuddyForm({ name: '', phoneNumber: '', role: 'Primary Emergency Contact', priority: 'High', groups: [] });
        toast({ title: "Buddy Registered" });
      })
      .finally(() => setRegisterLoading(false));
  };

  const handleUpdateBuddy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb || !itemToEdit) return;
    setRegisterLoading(true);
    update(ref(rtdb, `users/${user.uid}/buddies/${itemToEdit.id}`), itemToEdit)
      .then(() => {
        setIsEditBuddyDialogOpen(false);
        setItemToEdit(null);
        toast({ title: "Buddy Updated" });
      })
      .finally(() => setRegisterLoading(false));
  };

  const handleRegisterNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    setRegisterLoading(true);
    const nodeId = nodeForm.hardwareId || `NODE-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const payload = { ...nodeForm, id: nodeId, status: 'online', registeredAt: Date.now() };
    set(ref(rtdb, `users/${user.uid}/nodes/${nodeId}`), payload)
      .then(() => {
        setIsAddNodeDialogOpen(false);
        setNodeForm({ nodeName: '', hardwareId: '', targetGroups: [] });
        toast({ title: "Node Armed" });
      })
      .finally(() => setRegisterLoading(false));
  };

  const handleUpdateNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb || !itemToEdit) return;
    setRegisterLoading(true);
    update(ref(rtdb, `users/${user.uid}/nodes/${itemToEdit.id}`), itemToEdit)
      .then(() => {
        setIsEditNodeDialogOpen(false);
        setItemToEdit(null);
        toast({ title: "Node Updated" });
      })
      .finally(() => setRegisterLoading(false));
  };

  const triggerNodeAlert = (node: any) => {
    if (!user || !rtdb) return;

    const broadcastSOS = (lat?: number, lng?: number) => {
      const now = Date.now();
      update(ref(rtdb, "sosSystem"), {
        sosTrigger: true,
        sender: currentName,
        nodename: node.nodeName,
        timestamp: now,
        triggeredByNode: node.id,
        latitude: lat || profileData?.latitude || null,
        longitude: lng || profileData?.longitude || null,
      }).then(() => {
        toast({ title: "SOS Triggered", description: "Signal broadcasted to emergency network." });
      }).catch((err) => {
        console.error(err);
        toast({ variant: "destructive", title: "Error triggering SOS" });
      });
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => broadcastSOS(pos.coords.latitude, pos.coords.longitude),
        () => broadcastSOS(),
        { timeout: 5000 }
      );
    } else broadcastSOS();
  };

  if (userLoading || !hasMounted) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Synchronizing Safety Hub</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { id: 'overview', label: 'Safety Overview', icon: LayoutDashboard },
    { id: 'buddies', label: 'Manage Buddies', icon: Smartphone },
    { id: 'nodes', label: 'Manage Nodes', icon: Cpu },
    { id: 'location', label: 'Location Hub', icon: MapPin },
    { id: 'notifications', label: 'Safety Alerts', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-background">
      <aside className="w-full md:w-80 border-r bg-muted/5 order-1">
        <div className="sticky top-16 p-6 space-y-2">
          <div className="px-4 py-6 mb-4 flex items-center gap-4 border-b border-dashed">
            <Avatar className="h-10 w-10 rounded-none border border-primary">
              <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-bold text-xs">
                {currentName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest truncate">{currentName}</p>
              <p className="text-[8px] text-muted-foreground uppercase font-mono truncate">{user.email}</p>
            </div>
          </div>
          
          <div className="px-4 pb-2 mt-6">
            <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground opacity-60">Control Center</p>
          </div>

          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 transition-all",
                activeTab === item.id ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className="h-4 w-4" />
                <span className="text-[10px] uppercase tracking-widest font-bold">{item.label}</span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 order-2">
        <div className="max-w-4xl mx-auto">
          {activeTab === 'overview' && (
            <div className="space-y-10">
              <header className="mb-2 flex justify-between items-start">
                <div>
                  <h2 className="text-4xl font-headline font-bold tracking-tighter uppercase">Control Center</h2>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">System Demographics: Armed & Active</p>
                </div>
                {sosStatus?.sosTrigger && (
                  <Badge className="bg-destructive text-destructive-foreground animate-pulse px-4 py-2 rounded-none text-[10px] font-bold uppercase tracking-widest">
                    <ShieldAlert className="h-4 w-4 mr-2" /> SOS ACTIVE
                  </Badge>
                )}
              </header>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {[
                   { label: 'Nodes Armed', count: nodes.length, color: 'bg-primary' },
                   { label: 'Buddies Linked', count: buddies.length, color: 'bg-muted-foreground' },
                   { label: 'System Health', count: '100%', color: 'bg-primary' },
                 ].map((stat) => (
                   <Card key={stat.label} className="rounded-none border-none bg-muted/20">
                     <CardContent className="p-6 text-center">
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold font-headline mt-1">{stat.count}</p>
                     </CardContent>
                   </Card>
                 ))}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                 <div className="flex-1 h-14 border border-dashed border-muted-foreground/30 flex items-center justify-center">
                   {sosStatus?.sosTrigger ? (
                     <div className="flex items-center gap-2">
                       <ShieldAlert className="h-4 w-4 text-destructive animate-pulse" />
                       <p className="text-[10px] uppercase font-bold tracking-widest text-destructive">Emergency Signal Broadcast in Progress</p>
                     </div>
                   ) : (
                     <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground opacity-50">System Nominal / SOS Inactive</p>
                   )}
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Activity className="h-4 w-4" /> Network Pulse</h3>
                  <div className="aspect-video bg-muted/10 border border-dashed flex items-center justify-center p-4">
                     {statusStats.total > 0 ? (
                        <ChartContainer config={{}} className="w-full h-full">
                           <PieChart>
                             <Pie data={chartData} innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                               {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} />)}
                             </Pie>
                           </PieChart>
                        </ChartContainer>
                     ) : <p className="text-[10px] uppercase font-bold text-muted-foreground">No Assets Detected</p>}
                  </div>
                </div>
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><History className="h-4 w-4" /> Activity Stream</h3>
                  <ScrollArea className="h-[200px] border border-dashed p-4">
                    {notifications.length === 0 ? (
                      <p className="text-[8px] uppercase font-mono text-muted-foreground">Logs silent. All protocols nominal.</p>
                    ) : (
                      notifications.slice(0, 5).map(n => (
                        <div key={n.id} className="mb-4 pb-2 border-b border-dashed last:border-0">
                          <p className="text-[10px] font-bold uppercase">{n.message}</p>
                          <p className="text-[8px] font-mono text-muted-foreground">
                            {hasMounted ? new Date(n.createdAt).toLocaleString() : 'Loading...'}
                          </p>
                        </div>
                      ))
                    )}
                  </ScrollArea>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'buddies' && (
            <div className="space-y-6">
              <div className="flex gap-4">
                <Button onClick={() => setIsAddBuddyDialogOpen(true)} variant="outline" className="rounded-none uppercase font-bold text-[10px] gap-2">
                  <UserPlus className="h-4 w-4" /> Enlist Buddy
                </Button>
                <Button onClick={() => setIsManageGroupsDialogOpen(true)} variant="outline" className="rounded-none uppercase font-bold text-[10px] gap-2">
                  <Layers className="h-4 w-4" /> Protocols
                </Button>
              </div>

              {buddies.length === 0 ? (
                <div className="p-16 border-2 border-dashed bg-muted/5 flex flex-col items-center justify-center text-center">
                  <Smartphone className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">No Buddy Enlisted</p>
                  <p className="text-[8px] uppercase text-muted-foreground font-mono">Your safety network is currently empty.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {buddies.map(buddy => (
                    <Card key={buddy.id} className="border-none bg-muted/30 rounded-none relative">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-lg font-bold uppercase">{buddy.name}</p>
                            <p className="text-[10px] font-mono text-muted-foreground">{buddy.phoneNumber}</p>
                          </div>
                          <Badge variant="outline" className="rounded-none text-[8px] font-bold uppercase">{buddy.priority}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground">Role: {buddy.role}</p>
                        <div className="flex flex-wrap gap-1">
                          {buddy.groups?.map((g: string) => (
                            <Badge key={g} className="rounded-none text-[8px] uppercase font-bold">{g}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="rounded-none text-[8px] uppercase font-bold" onClick={() => { setItemToView(buddy); setIsViewItemDialogOpen(true); }}><Eye className="h-3 w-3 mr-1" /> View</Button>
                          <Button variant="outline" size="sm" className="rounded-none text-[8px] uppercase font-bold" onClick={() => { setItemToEdit(buddy); setIsEditBuddyDialogOpen(true); }}><Pencil className="h-3 w-3 mr-1" /> Edit</Button>
                          <Button variant="outline" size="sm" className="rounded-none text-[8px] uppercase font-bold" onClick={() => { setItemToDelete({ ...buddy, type: 'buddy' }); setIsDeleteDialogOpen(true); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'nodes' && (
            <div className="space-y-6">
              <Button onClick={() => setIsAddNodeDialogOpen(true)} variant="outline" className="rounded-none uppercase font-bold text-[10px] gap-2">
                <PlusSquare className="h-4 w-4" /> Arm Node
              </Button>

              {nodes.length === 0 ? (
                <div className="p-16 border-2 border-dashed bg-muted/5 flex flex-col items-center justify-center text-center">
                  <Cpu className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1">No Nodes Armed</p>
                  <p className="text-[8px] uppercase text-muted-foreground font-mono">Initialize hardware to start tracking.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {nodes.map(node => (
                    <Card key={node.id} className="border-none bg-muted/30 rounded-none relative">
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <p className="text-lg font-bold uppercase">{node.nodeName}</p>
                          <div className={cn("h-2 w-2", node.status === 'online' ? 'bg-primary' : 'bg-destructive')} />
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground">ID: {node.hardwareId}</p>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <p className="text-[8px] uppercase font-bold text-muted-foreground mb-1">Target Groups:</p>
                          <div className="flex flex-wrap gap-1">
                            {node.targetGroups?.map((g: string) => (
                              <Badge key={g} variant="outline" className="rounded-none text-[8px] uppercase font-bold">{g}</Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="default" size="sm" className="rounded-none text-[8px] uppercase font-bold gap-2" onClick={() => triggerNodeAlert(node)}><Zap className="h-3 w-3" /> Trigger SOS</Button>
                          <Button variant="outline" size="sm" className="rounded-none text-[8px] uppercase font-bold" onClick={() => { setItemToEdit(node); setIsEditNodeDialogOpen(true); }}><Pencil className="h-3 w-3" /></Button>
                          <Button variant="outline" size="sm" className="rounded-none text-[8px] uppercase font-bold" onClick={() => { setItemToDelete({ ...node, type: 'node' }); setIsDeleteDialogOpen(true); }}><Trash2 className="h-3 w-3" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-10">
              <Card className="border-none bg-muted/20 rounded-none">
                <CardContent className="p-6 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Latitude</Label>
                      <input value={locationData.lat} onChange={e => setLocationData({...locationData, lat: e.target.value})} className="h-10 w-full rounded-none border-none bg-background px-3 font-mono text-xs focus:ring-1 focus:ring-primary" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold">Longitude</Label>
                      <input value={locationData.lng} onChange={e => setLocationData({...locationData, lng: e.target.value})} className="h-10 w-full rounded-none border-none bg-background px-3 font-mono text-xs focus:ring-1 focus:ring-primary" />
                    </div>
                  </div>
                  <Button onClick={() => {
                    if (!user) return;
                    setUpdatingLocation(true);
                    set(ref(rtdb, `users/${user.uid}/profile`), { ...profileData, latitude: parseFloat(locationData.lat), longitude: parseFloat(locationData.lng), updatedAt: serverTimestamp() })
                      .then(() => {
                        toast({ title: "Coordinates Updated" });
                        handleResolveLocation(parseFloat(locationData.lat), parseFloat(locationData.lng));
                      }).finally(() => setUpdatingLocation(false));
                  }} disabled={updatingLocation} className="w-full rounded-none uppercase font-bold h-12">
                    {updatingLocation ? <Loader2 className="h-4 w-4 animate-spin" /> : "Lock Beacon Coordinates"}
                  </Button>
                </CardContent>
              </Card>
              <div className="aspect-video bg-muted/10 border-2 border-dashed flex flex-col items-center justify-center p-6 text-center">
                <MapPin className="h-10 w-10 text-primary mb-4 animate-bounce" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">Visual Tracker Active</p>
                <p className="text-sm font-bold uppercase">{locationName || "Resolving Precise Location..."}</p>
                {resolvingLocation && <Loader2 className="h-4 w-4 animate-spin mt-4" />}
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
               <header className="mb-2">
                <h2 className="text-4xl font-headline font-bold tracking-tighter uppercase">Safety Alerts</h2>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Protocol Logs & Broadcast History</p>
              </header>
              <ScrollArea className="h-[500px] border-2 border-dashed p-6">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full opacity-20">
                    <Bell className="h-12 w-12 mb-4" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">No Alerts In Queue</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="mb-6 pb-4 border-b border-dashed last:border-0">
                      <div className="flex justify-between items-start mb-1">
                        <p className="text-sm font-bold uppercase">{n.message}</p>
                        <Badge variant="outline" className="text-[8px] font-mono">{hasMounted ? new Date(n.createdAt).toLocaleTimeString() : '...'}</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground uppercase font-mono">
                        {hasMounted ? new Date(n.createdAt).toLocaleDateString() : 'Loading...'}
                      </p>
                    </div>
                  ))
                )}
              </ScrollArea>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-md space-y-6">
              <Card className="border-none bg-muted/30 rounded-none">
                <CardContent className="p-6 flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold">Dark Protocol</span>
                  <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                </CardContent>
              </Card>
              <Button variant="destructive" onClick={() => signOut(auth).then(() => router.push("/login"))} className="w-full rounded-none uppercase font-bold h-14 tracking-widest gap-2">
                <LogOut className="h-4 w-4" /> Terminate Session
              </Button>
            </div>
          )}
        </div>
      </main>

      {/* DIALOGS */}
      <Dialog open={isAddBuddyDialogOpen} onOpenChange={setIsAddBuddyDialogOpen}>
        <DialogContent className="rounded-none border-none">
          <DialogHeader><DialogTitle className="uppercase font-bold">Enlist Buddy</DialogTitle></DialogHeader>
          <form onSubmit={handleRegisterBuddy} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold">Full Name</Label>
              <Input value={buddyForm.name} onChange={e => setBuddyForm({...buddyForm, name: e.target.value})} required className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold">Phone Number</Label>
              <Input value={buddyForm.phoneNumber} onChange={e => setBuddyForm({...buddyForm, phoneNumber: e.target.value})} required className="rounded-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Role</Label>
                <Input value={buddyForm.role} onChange={e => setBuddyForm({...buddyForm, role: e.target.value})} className="rounded-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Priority</Label>
                <Select value={buddyForm.priority} onValueChange={v => setBuddyForm({...buddyForm, priority: v})}>
                  <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold">Protocol Groups</Label>
              <div className="grid grid-cols-2 gap-2 p-2 border border-dashed">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-2">
                    <Checkbox checked={buddyForm.groups.includes(g)} onCheckedChange={() => {
                      const updated = buddyForm.groups.includes(g) ? buddyForm.groups.filter(x => x !== g) : [...buddyForm.groups, g];
                      setBuddyForm({...buddyForm, groups: updated});
                    }} />
                    <span className="text-[10px] uppercase font-bold">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full rounded-none h-12 uppercase font-bold" disabled={registerLoading}>
              {registerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Buddy"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditBuddyDialogOpen} onOpenChange={setIsEditBuddyDialogOpen}>
        <DialogContent className="rounded-none border-none">
          <DialogHeader><DialogTitle className="uppercase font-bold">Edit Buddy</DialogTitle></DialogHeader>
          {itemToEdit && (
            <form onSubmit={handleUpdateBuddy} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Full Name</Label>
                <Input value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} required className="rounded-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Phone Number</Label>
                <Input value={itemToEdit.phoneNumber} onChange={e => setItemToEdit({...itemToEdit, phoneNumber: e.target.value})} required className="rounded-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Role</Label>
                  <Input value={itemToEdit.role} onChange={e => setItemToEdit({...itemToEdit, role: e.target.value})} className="rounded-none" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold">Priority</Label>
                  <Select value={itemToEdit.priority} onValueChange={v => setItemToEdit({...itemToEdit, priority: v})}>
                    <SelectTrigger className="rounded-none"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Protocol Groups</Label>
                <div className="grid grid-cols-2 gap-2 p-2 border border-dashed">
                  {buddyGroups.map(g => (
                    <div key={g} className="flex items-center gap-2">
                      <Checkbox checked={itemToEdit.groups?.includes(g)} onCheckedChange={() => {
                        const groups = itemToEdit.groups || [];
                        const updated = groups.includes(g) ? groups.filter((x: string) => x !== g) : [...groups, g];
                        setItemToEdit({...itemToEdit, groups: updated});
                      }} />
                      <span className="text-[10px] uppercase font-bold">{g}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full rounded-none h-12 uppercase font-bold" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Buddy"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddNodeDialogOpen} onOpenChange={setIsAddNodeDialogOpen}>
        <DialogContent className="rounded-none border-none">
          <DialogHeader><DialogTitle className="uppercase font-bold">Arm Node</DialogTitle></DialogHeader>
          <form onSubmit={handleRegisterNode} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold">Node Name</Label>
              <Input value={nodeForm.nodeName} onChange={e => setNodeForm({...nodeForm, nodeName: e.target.value})} required className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold">Hardware ID</Label>
              <Input value={nodeForm.hardwareId} onChange={e => setNodeForm({...nodeForm, hardwareId: e.target.value})} required className="rounded-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-bold">Target Alert Groups</Label>
              <div className="grid grid-cols-2 gap-2 p-2 border border-dashed">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-2">
                    <Checkbox checked={nodeForm.targetGroups.includes(g)} onCheckedChange={() => {
                      const updated = nodeForm.targetGroups.includes(g) ? nodeForm.targetGroups.filter(x => x !== g) : [...nodeForm.targetGroups, g];
                      setNodeForm({...nodeForm, targetGroups: updated});
                    }} />
                    <span className="text-[10px] uppercase font-bold">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full rounded-none h-12 uppercase font-bold" disabled={registerLoading}>
              {registerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Arm Hardware"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditNodeDialogOpen} onOpenChange={setIsEditNodeDialogOpen}>
        <DialogContent className="rounded-none border-none">
          <DialogHeader><DialogTitle className="uppercase font-bold">Edit Node</DialogTitle></DialogHeader>
          {itemToEdit && (
            <form onSubmit={handleUpdateNode} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Node Name</Label>
                <Input value={itemToEdit.nodeName} onChange={e => setItemToEdit({...itemToEdit, nodeName: e.target.value})} required className="rounded-none" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Hardware ID</Label>
                <Input value={itemToEdit.hardwareId} disabled className="rounded-none bg-muted/50" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold">Target Alert Groups</Label>
                <div className="grid grid-cols-2 gap-2 p-2 border border-dashed">
                  {buddyGroups.map(g => (
                    <div key={g} className="flex items-center gap-2">
                      <Checkbox checked={itemToEdit.targetGroups?.includes(g)} onCheckedChange={() => {
                        const groups = itemToEdit.targetGroups || [];
                        const updated = groups.includes(g) ? groups.filter((x: string) => x !== g) : [...groups, g];
                        setItemToEdit({...itemToEdit, targetGroups: updated});
                      }} />
                      <span className="text-[10px] uppercase font-bold">{g}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full rounded-none h-12 uppercase font-bold" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Node"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewItemDialogOpen} onOpenChange={setIsViewItemDialogOpen}>
        <DialogContent className="rounded-none border-none">
          <DialogHeader><DialogTitle className="uppercase font-bold">Asset Overview</DialogTitle></DialogHeader>
          {itemToView && (
            <div className="space-y-4 pt-4">
               <div className="p-4 bg-muted/20 border border-dashed rounded-none">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Asset Identity</p>
                  <p className="text-xl font-bold uppercase">{itemToView.name || itemToView.nodeName}</p>
                  <p className="text-xs font-mono mt-1">{itemToView.phoneNumber || itemToView.hardwareId}</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/20 border border-dashed rounded-none">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Status / Priority</p>
                    <p className="text-sm font-bold uppercase">{itemToView.priority || itemToView.status || 'Active'}</p>
                  </div>
                  <div className="p-4 bg-muted/20 border border-dashed rounded-none">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Role / Type</p>
                    <p className="text-sm font-bold uppercase">{itemToView.role || 'Hardware Node'}</p>
                  </div>
               </div>
               <div className="p-4 bg-muted/20 border border-dashed rounded-none">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Assigned Protocols</p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {(itemToView.groups || itemToView.targetGroups || []).map((g: string) => (
                      <Badge key={g} className="rounded-none text-[8px] uppercase font-bold">{g}</Badge>
                    ))}
                  </div>
               </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isManageGroupsDialogOpen} onOpenChange={setIsManageGroupsDialogOpen}>
        <DialogContent className="rounded-none border-none">
          <DialogHeader><DialogTitle className="uppercase font-bold">Manage Protocols</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex gap-2">
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="NEW GROUP" className="rounded-none uppercase text-[10px] font-bold" />
              <Button onClick={() => {
                if (!user || !newGroupName) return;
                push(ref(rtdb, `users/${user.uid}/buddyGroups`), { name: newGroupName });
                setNewGroupName("");
              }} variant="outline" className="rounded-none"><PlusCircle className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-2">
              {buddyGroups.map(g => (
                <div key={g} className="p-3 bg-muted/20 border border-dashed flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold">{g}</span>
                  {!DEFAULT_BUDDY_GROUPS.includes(g) && (
                    <Button variant="ghost" size="sm" onClick={() => {
                      const gId = Object.entries(customGroupsData || {}).find(([k, v]: any) => v.name === g)?.[0];
                      if (gId) remove(ref(rtdb, `users/${user.uid}/buddyGroups/${gId}`));
                    }}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-none border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase font-bold">Purge Asset?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs uppercase">This action is final.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none text-[10px] font-bold uppercase">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!user || !itemToDelete) return;
              const path = itemToDelete.type === 'buddy' ? `users/${user.uid}/buddies/${itemToDelete.id}` : `users/${user.uid}/nodes/${itemToDelete.id}`;
              remove(ref(rtdb, path)).then(() => {
                setIsDeleteDialogOpen(false);
                setItemToDelete(null);
              });
            }} className="rounded-none text-[10px] font-bold uppercase bg-destructive text-destructive-foreground">Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
