
"use client";

import { useUser, useDatabase, useRtdb, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Plus, 
  Settings, 
  Bell, 
  Cpu, 
  Activity,
  ShieldCheck,
  Smartphone,
  Loader2,
  Trash2,
  Info,
  Edit,
  LogOut,
  Moon,
  Sun,
  LayoutDashboard,
  History,
  PieChart as PieChartIcon,
  ShieldAlert,
  PlusSquare,
  Users,
  UserPlus,
  Radio,
  Layers,
  MapPin,
  Map as MapIcon,
  Navigation,
  Star,
  Zap,
  Pulse,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, set, push, remove, serverTimestamp } from "firebase/database";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { PieChart, Pie, Cell } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

type TabType = 'overview' | 'manage-buddy' | 'manage-node' | 'location' | 'notifications' | 'settings';

const DEFAULT_BUDDY_GROUPS = ["Family", "Friend", "Close Friend"];

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { auth } = useFirebase();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [searchQuery, setSearchQuery] = useState("");

  const [registerLoading, setRegisterLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    deviceId: '',
    type: 'SOS Beacon',
    status: 'online',
    phoneNumber: '',
    group: 'Friend',
    role: 'Primary Emergency Contact',
    priority: 'High',
    alertGroups: [] as string[],
    specialData: ''
  });

  const [locationData, setLocationData] = useState({ lat: '', lng: '' });
  const [updatingLocation, setUpdatingLocation] = useState(false);

  const [editingDevice, setEditingDevice] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewingDevice, setViewingDevice] = useState<any>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isAddBuddyDialogOpen, setIsAddBuddyDialogOpen] = useState(false);
  const [isAddNodeDialogOpen, setIsAddNodeDialogOpen] = useState(false);
  const [isManageGroupsDialogOpen, setIsManageGroupsDialogOpen] = useState(false);
  const [deviceToDelete, setDeviceToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!userLoading && !user) {
      router.push("/login");
    }
    const isDark = document.documentElement.classList.contains('dark');
    setTheme(isDark ? 'dark' : 'light');
  }, [user, userLoading, router]);

  // Realtime Database Subscriptions using useRtdb (implements onValue pattern)
  const profileRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/profile`) : null, [rtdb, user]);
  const { data: profileData } = useRtdb(profileRef);

  const groupsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddyGroups`) : null, [rtdb, user]);
  const { data: customGroupsData } = useRtdb(groupsRef);

  const devicesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/devices`) : null, [rtdb, user]);
  const { data: devicesData, loading: devicesLoading } = useRtdb(devicesRef);

  const notificationsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/notifications`) : null, [rtdb, user]);
  const { data: notificationsData } = useRtdb(notificationsRef);

  useEffect(() => {
    if (profileData) {
      setLocationData({
        lat: profileData.latitude?.toString() || '',
        lng: profileData.longitude?.toString() || ''
      });
    }
  }, [profileData]);

  const buddyGroups = useMemo(() => {
    const customNames = customGroupsData ? Object.values(customGroupsData).map((g: any) => g.name) : [];
    return Array.from(new Set([...DEFAULT_BUDDY_GROUPS, ...customNames]));
  }, [customGroupsData]);

  const toggleTheme = (isDark: boolean) => {
    const newTheme = isDark ? 'dark' : 'light';
    setTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = () => {
    signOut(auth).then(() => router.push("/login"));
  };

  const devices = useMemo(() => {
    if (!devicesData) return [];
    return Object.entries(devicesData).map(([id, val]: [string, any]) => ({ ...val, id }));
  }, [devicesData]);

  const notifications = useMemo(() => {
    if (!notificationsData) return [];
    return Object.entries(notificationsData)
      .map(([id, val]: [string, any]) => ({ ...val, id }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [notificationsData]);

  const statusStats = useMemo(() => {
    if (devices.length === 0) return { online: 0, offline: 0, error: 0, total: 0 };
    return devices.reduce((acc: any, d: any) => {
      acc[d.status] = (acc[d.status] || 0) + 1;
      acc.total++;
      return acc;
    }, { online: 0, offline: 0, error: 0, total: 0 });
  }, [devices]);

  const chartData = useMemo(() => [
    { name: 'Secured', value: statusStats.online, fill: "var(--color-online)" },
    { name: 'Inactive', value: statusStats.offline, fill: "var(--color-offline)" },
    { name: 'Alert', value: statusStats.error, fill: "var(--color-error)" },
  ], [statusStats]);

  const chartConfig = {
    online: { label: "Secured", color: "hsl(var(--primary))" },
    offline: { label: "Inactive", color: "hsl(var(--muted-foreground))" },
    error: { label: "Alert", color: "hsl(var(--destructive))" },
  };

  const filteredDevices = useMemo(() => {
    let filtered = devices;
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      filtered = filtered.filter((d: any) => 
        d.name?.toLowerCase().includes(lowerQuery) || 
        d.id?.toLowerCase().includes(lowerQuery) ||
        d.type?.toLowerCase().includes(lowerQuery) ||
        d.status?.toLowerCase().includes(lowerQuery) ||
        d.phoneNumber?.toLowerCase().includes(lowerQuery) ||
        d.group?.toLowerCase().includes(lowerQuery)
      );
    }
    if (activeTab === 'manage-buddy') {
      filtered = filtered.filter((d: any) => d.category === 'buddy');
    } else if (activeTab === 'manage-node') {
      filtered = filtered.filter((d: any) => d.category === 'node');
    }
    return filtered;
  }, [devices, searchQuery, activeTab]);

  const createNotification = (message: string) => {
    if (!user || !rtdb) return;
    const notifRef = push(ref(rtdb, `users/${user.uid}/notifications`));
    set(notifRef, {
      userId: user.uid,
      message,
      read: false,
      createdAt: serverTimestamp()
    });
  };

  const handleRegisterDevice = (e: React.FormEvent, category: 'buddy' | 'node') => {
    e.preventDefault();
    if (!user || !rtdb) return;
    setRegisterLoading(true);
    
    const finalId = formData.deviceId || `ID-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const devicePath = `users/${user.uid}/devices/${finalId}`;
    
    const payload = {
      name: formData.name,
      id: finalId,
      status: 'online', 
      category: category,
      ownerId: user.uid,
      registeredAt: Date.now(),
      lastActiveAt: Date.now(),
      ...(category === 'buddy' ? {
        phoneNumber: formData.phoneNumber,
        group: formData.group,
        role: formData.role,
        priority: formData.priority,
        specialData: formData.specialData
      } : {
        type: formData.type,
        alertGroups: formData.alertGroups,
        specialData: formData.specialData
      })
    };

    set(ref(rtdb, devicePath), payload)
      .then(() => {
        const label = category === 'buddy' ? 'Buddy' : 'Node';
        createNotification(`New ${label} registered: ${formData.name}`);
        
        // MIRROR TO ESP QUEUE for hardware synchronization
        if (category === 'buddy') {
          set(ref(rtdb, `esp_queue/${user.uid}/${finalId}`), {
            name: formData.name,
            phone: formData.phoneNumber,
            priority: formData.priority,
            uid: user.uid,
            buddyId: finalId,
            processed: false,
            timestamp: serverTimestamp()
          });
        }

        setFormData({ name: '', deviceId: '', type: 'SOS Beacon', status: 'online', phoneNumber: '', group: 'Friend', role: 'Primary Emergency Contact', priority: 'High', alertGroups: [], specialData: '' });
        setIsAddBuddyDialogOpen(false);
        setIsAddNodeDialogOpen(false);
        toast({ title: "Protocol Activated", description: `${label} successfully added to your network.` });
      })
      .catch((error) => {
        toast({ variant: "destructive", title: "Registration Error", description: error.message });
      })
      .finally(() => setRegisterLoading(false));
  };

  const handleUpdateDevice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb || !editingDevice) return;
    const deviceRef = ref(rtdb, `users/${user.uid}/devices/${editingDevice.id}`);
    
    set(deviceRef, editingDevice)
      .then(() => {
        createNotification(`Updated registry for: ${editingDevice.name}`);
        
        // Mirror update to ESP Queue
        if (editingDevice.category === 'buddy') {
          set(ref(rtdb, `esp_queue/${user.uid}/${editingDevice.id}`), {
            name: editingDevice.name,
            phone: editingDevice.phoneNumber,
            priority: editingDevice.priority,
            uid: user.uid,
            buddyId: editingDevice.id,
            processed: false,
            timestamp: serverTimestamp()
          });
        }

        setIsEditDialogOpen(false);
        setEditingDevice(null);
        toast({ title: "Registry Updated", description: "Changes saved to the encrypted network." });
      });
  };

  const handleUpdateLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    setUpdatingLocation(true);
    
    const userProfileRef = ref(rtdb, `users/${user.uid}/profile`);
    set(userProfileRef, {
      ...profileData,
      latitude: parseFloat(locationData.lat),
      longitude: parseFloat(locationData.lng),
      updatedAt: serverTimestamp()
    })
      .then(() => {
        createNotification(`Updated safety beacon coordinates.`);
        toast({ title: "Coordinates Locked", description: "New GPS data synchronized." });
      })
      .catch((error) => toast({ variant: "destructive", title: "Sync Failed", description: error.message }))
      .finally(() => setUpdatingLocation(false));
  };

  const triggerNodeAlert = (node: any) => {
    if (!user || !rtdb || !devices) return;
    
    const nodeAlertGroups = node.alertGroups || [];
    const groupsText = nodeAlertGroups.length > 0 ? nodeAlertGroups.join(", ") : "None assigned";
    const targetBuddies = devices.filter(d => d.category === 'buddy' && nodeAlertGroups.includes(d.group));

    if (targetBuddies.length > 0) {
      targetBuddies.forEach(buddy => {
        createNotification(`SOS TRIGGERED: Node ${node.name} Alerting Groups: [${groupsText}]. Contacting ${buddy.name}...`);
      });
      toast({ 
        title: "SOS Signal Dispatched", 
        description: `Alerts sent to groups: ${groupsText}. ${targetBuddies.length} buddies notified.` 
      });
    } else {
      createNotification(`SOS WARNING: Node ${node.name} triggered for groups: ${groupsText}, but NO CONTACTS assigned.`);
      toast({ 
        variant: "destructive", 
        title: "Orchestration Failed", 
        description: `No buddies found in the assigned groups: ${groupsText}.` 
      });
    }
  };

  const getBuddiesInGroup = (group: string) => {
    if (!devices) return [];
    return devices.filter(d => d.category === 'buddy' && d.group === group);
  };

  const toggleAlertGroup = (group: string, isEditing: boolean = false) => {
    if (isEditing) {
      const current = editingDevice.alertGroups || [];
      const updated = current.includes(group) 
        ? current.filter((g: string) => g !== group)
        : [...current, group];
      setEditingDevice({ ...editingDevice, alertGroups: updated });
    } else {
      const current = formData.alertGroups;
      const updated = current.includes(group) 
        ? current.filter(g => g !== group)
        : [...current, group];
      setFormData({ ...formData, alertGroups: updated });
    }
  };

  const getLinkedBuddies = (alertGroups: string[]) => {
    if (!devices || !alertGroups) return [];
    return devices.filter(d => d.category === 'buddy' && alertGroups.includes(d.group));
  };

  if (userLoading) return (
    <div className="flex items-center justify-center h-[80vh]">
      <div className="animate-pulse flex flex-col items-center">
        <ShieldAlert className="h-8 w-8 text-primary mb-4" />
        <p className="text-[10px] uppercase tracking-widest font-bold">Activating Safety Protocols</p>
      </div>
    </div>
  );

  if (!user) return null;

  const currentName = profileData?.displayName || user.displayName || "Protected User";

  const navItems = [
    { id: 'overview', label: 'Safety Overview', icon: LayoutDashboard },
    { id: 'manage-buddy', label: 'Manage Buddy', icon: Smartphone },
    { id: 'manage-node', label: 'Manage Node', icon: Cpu },
    { id: 'location', label: 'Location Hub', icon: MapPin },
    { id: 'notifications', label: 'Safety Alerts', icon: Bell },
    { id: 'settings', label: 'Security Settings', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-4rem)] bg-background">
      <aside className="w-full md:w-80 border-r bg-muted/5 order-1">
        <div className="sticky top-16 p-6 space-y-2">
          <div className="px-4 py-6 mb-4 flex items-center gap-4 border-b border-dashed">
            <Avatar className="h-10 w-10 rounded-none border border-primary">
              <AvatarImage src={profileData?.avatarUrl || user.photoURL || ""} alt={currentName} />
              <AvatarFallback className="rounded-none bg-primary text-primary-foreground font-bold text-xs">
                {currentName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-[10px] font-bold uppercase tracking-widest truncate">{currentName}</p>
              <p className="text-[8px] text-muted-foreground uppercase font-mono truncate">{user.email}</p>
            </div>
          </div>

          <div className="mb-4 px-4 py-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Control Center</p>
          </div>
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 transition-all duration-200 group",
                activeTab === item.id 
                  ? "bg-primary text-primary-foreground font-bold" 
                  : "hover:bg-muted text-muted-foreground"
              )}
            >
              <div className="flex items-center gap-4">
                <item.icon className={cn("h-4 w-4", activeTab === item.id ? "" : "group-hover:text-primary")} />
                <span className="text-[10px] uppercase tracking-widest font-bold">{item.label}</span>
              </div>
              {activeTab === item.id && <div className="h-1 w-1 bg-primary-foreground rotate-45" />}
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 p-6 md:p-10 order-2 overflow-y-auto">
        <div className="max-w-4xl">
          <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl font-headline font-bold tracking-tighter uppercase mb-2">
                {navItems.find(t => t.id === activeTab)?.label}
              </h1>
              <p className="text-muted-foreground text-sm tracking-wide">
                {activeTab === 'overview' && `System heartbeat for ${currentName}. Active orchestration and alert monitoring.`}
                {activeTab === 'manage-buddy' && "Manage your trusted emergency contacts and human safety network."}
                {activeTab === 'manage-node' && "Registry of your active hardware safety nodes and sensors."}
                {activeTab === 'location' && "Configure specific GPS coordinates for your safety beacon."}
                {activeTab === 'notifications' && "Critical safety logs and heartbeat history."}
                {activeTab === 'settings' && "Configure security protocols and account privacy."}
              </p>
            </div>
          </header>

          {activeTab === 'overview' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                 {[
                   { label: 'Secured', count: statusStats.online, color: 'bg-primary' },
                   { label: 'Inactive', count: statusStats.offline, color: 'bg-muted-foreground' },
                   { label: 'Warning', count: statusStats.error, color: 'bg-destructive' },
                 ].map((stat) => (
                   <Card key={stat.label} className="rounded-none border-none bg-muted/20 shadow-none">
                     <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                           <div className={cn("h-2 w-2", stat.color)} />
                           <span className="text-[10px] font-mono font-bold text-muted-foreground">
                             {statusStats.total > 0 ? ((stat.count / statusStats.total) * 100).toFixed(1) : 0}%
                           </span>
                        </div>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground">{stat.label}</p>
                        <p className="text-3xl font-bold font-headline mt-1">{stat.count}</p>
                     </CardContent>
                   </Card>
                 ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                 <div className="lg:col-span-2 space-y-10">
                    <div className="space-y-4">
                      <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
                        <Input 
                          placeholder="SEARCH NAME, GROUPS, ID, AND CONTACTS" 
                          className="pl-12 h-14 rounded-none border-none bg-muted/30 uppercase text-[10px] font-bold tracking-widest"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                          <ShieldAlert className="h-4 w-4" /> Comprehensive Network Registry
                        </h3>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-4">
                        {filteredDevices.slice(0, 10).map((device: any) => (
                          <div key={device.id} className="p-4 bg-muted/20 border border-transparent hover:border-primary/20 transition-all flex items-center justify-between group">
                            <div className="flex items-center gap-4">
                              <div className={cn(
                                "h-2 w-2 rounded-none",
                                device.status === 'online' ? 'bg-primary' : 
                                device.status === 'error' ? 'bg-destructive' : 'bg-muted-foreground'
                              )} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold uppercase">{device.name}</p>
                                  <span className="text-[8px] bg-muted px-1.5 py-0.5 font-bold uppercase opacity-70">{device.category}</span>
                                  {device.group && <span className="text-[8px] border border-primary/20 px-1.5 py-0.5 font-bold uppercase">{device.group}</span>}
                                </div>
                                <p className="text-[9px] font-mono text-muted-foreground">ID: {device.id} {device.phoneNumber && `| Contact: ${device.phoneNumber}`}</p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => { setViewingDevice(device); setIsViewDialogOpen(true); }} className="opacity-0 group-hover:opacity-100 uppercase text-[9px] font-bold">Inspect</Button>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>

                 <div className="space-y-10">
                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <PieChartIcon className="h-4 w-4" /> Status Demographics
                      </h3>
                      <div className="aspect-square bg-muted/10 p-4 border border-dashed flex items-center justify-center">
                        {statusStats.total > 0 ? (
                           <ChartContainer config={chartConfig} className="w-full h-full">
                              <PieChart>
                                <Pie data={chartData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                  {chartData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.fill} stroke="transparent" />)}
                                </Pie>
                                <ChartTooltip content={<ChartTooltipContent />} />
                              </PieChart>
                           </ChartContainer>
                        ) : <p className="text-[10px] uppercase font-bold text-muted-foreground opacity-50">Network Inactive</p>}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                        <History className="h-4 w-4" /> Safety Heartbeats
                      </h3>
                      <div className="space-y-4">
                        {notifications?.slice(0, 3).map((notif: any) => (
                          <div key={notif.id} className="p-4 border-l-2 border-primary bg-muted/10">
                            <p className="text-[10px] font-bold uppercase mb-1">{notif.message}</p>
                            <p className="text-[9px] text-muted-foreground font-mono">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString() : "SYNCING..."}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
              </div>
            </div>
          )}

          {activeTab === 'manage-buddy' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 items-center mb-6">
                <Button onClick={() => setIsAddBuddyDialogOpen(true)} variant="outline" className="rounded-none uppercase font-bold text-[10px] flex items-center gap-2">
                  <UserPlus className="h-4 w-4" /> Enlist Buddy
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {devicesLoading ? (
                  <div className="col-span-full py-12 flex flex-col items-center">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                     <p className="text-xs font-bold uppercase tracking-widest">Scanning Contacts...</p>
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="col-span-full py-20 border-2 border-dashed flex flex-col items-center justify-center text-center px-4">
                    <Smartphone className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-lg font-bold uppercase mb-2">No Buddies Enlisted</p>
                  </div>
                ) : (
                  filteredDevices.map((device: any) => (
                    <Card key={device.id} className="border-none shadow-none bg-muted/30 hover:bg-muted/50 transition-colors group relative">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-bold tracking-tight uppercase">{device.name}</CardTitle>
                          <div className="flex flex-col gap-0.5 mt-1">
                            <p className="text-[10px] text-muted-foreground uppercase font-bold">Role: {device.role || 'Emergency Contact'}</p>
                            <p className="text-[10px] text-muted-foreground uppercase font-bold flex items-center gap-1">
                              Priority: <Star className="h-2 w-2 fill-primary text-primary" /> {device.priority || 'High'}
                            </p>
                          </div>
                          <p className="text-[9px] text-muted-foreground font-mono mt-2">{device.group} | {device.phoneNumber}</p>
                        </div>
                        <Users className="h-4 w-4 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex gap-2">
                           <Button variant="outline" size="sm" className="rounded-none text-[9px] uppercase font-bold" onClick={() => { setViewingDevice(device); setIsViewDialogOpen(true); }}>View</Button>
                           <Button variant="outline" size="sm" className="rounded-none text-[9px] uppercase font-bold" onClick={() => { setEditingDevice({...device}); setIsEditDialogOpen(true); }}>Edit</Button>
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="rounded-none text-[9px] uppercase font-bold text-destructive hover:bg-destructive" 
                             onClick={() => { setDeviceToDelete(device); setIsDeleteDialogOpen(true); }}
                           >
                            <Trash2 className="h-3 w-3" />
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'manage-node' && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 items-center mb-6">
                <Button onClick={() => setIsAddNodeDialogOpen(true)} variant="outline" className="rounded-none uppercase font-bold text-[10px] flex items-center gap-2">
                  <PlusSquare className="h-4 w-4" /> Arm Node
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {devicesLoading ? (
                  <div className="col-span-full py-12 flex flex-col items-center">
                     <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
                     <p className="text-xs font-bold uppercase tracking-widest">Scanning Network...</p>
                  </div>
                ) : filteredDevices.length === 0 ? (
                  <div className="col-span-full py-20 border-2 border-dashed flex flex-col items-center justify-center text-center px-4">
                    <Cpu className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
                    <p className="text-lg font-bold uppercase mb-2">No Nodes Registered</p>
                  </div>
                ) : (
                  filteredDevices.map((device: any) => (
                    <Card key={device.id} className="border-none shadow-none bg-muted/30 hover:bg-muted/50 transition-colors group relative">
                      <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="space-y-1">
                          <CardTitle className="text-lg font-bold tracking-tight uppercase">{device.name}</CardTitle>
                          <p className="text-[10px] text-muted-foreground font-mono">ID: {device.id}</p>
                        </div>
                        <Cpu className="h-4 w-4 text-primary" />
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-2 mb-4">
                          <div className={cn("h-2 w-2 rounded-full", device.status === 'online' ? 'bg-primary animate-pulse' : 'bg-muted-foreground')} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">Status: {device.status === 'online' ? 'Online' : device.status === 'error' ? 'In Alert Mode' : 'Idle'}</span>
                        </div>
                        <div className="flex gap-2">
                           <Button variant="outline" size="sm" className="rounded-none text-[9px] uppercase font-bold" onClick={() => triggerNodeAlert(device)}>
                             <Zap className="h-3 w-3 mr-1" /> Trigger SOS
                           </Button>
                           <Button variant="outline" size="sm" className="rounded-none text-[9px] uppercase font-bold" onClick={() => { setViewingDevice(device); setIsViewDialogOpen(true); }}>View</Button>
                           <Button variant="outline" size="sm" className="rounded-none text-[9px] uppercase font-bold" onClick={() => { setEditingDevice({...device}); setIsEditDialogOpen(true); }}>Edit</Button>
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="rounded-none text-[9px] uppercase font-bold text-destructive hover:bg-destructive" 
                             onClick={() => { setDeviceToDelete(device); setIsDeleteDialogOpen(true); }}
                           >
                            <Trash2 className="h-3 w-3" />
                           </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'location' && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="border-none bg-muted/20 rounded-none shadow-none">
                  <CardHeader>
                    <CardTitle className="text-[10px] uppercase font-bold tracking-widest flex items-center gap-2">
                      <Navigation className="h-4 w-4" /> Safety Coordinates
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleUpdateLocation} className="space-y-6">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="lat" className="text-[10px] font-bold uppercase tracking-widest">Latitude</Label>
                          <Input 
                            id="lat" 
                            placeholder="e.g. 14.5995" 
                            className="rounded-none h-12 border-none bg-background font-mono text-[10px]" 
                            value={locationData.lat} 
                            onChange={(e) => setLocationData({...locationData, lat: e.target.value})}
                            required 
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lng" className="text-[10px] font-bold uppercase tracking-widest">Longitude</Label>
                          <Input 
                            id="lng" 
                            placeholder="e.g. 120.9842" 
                            className="rounded-none h-12 border-none bg-background font-mono text-[10px]" 
                            value={locationData.lng} 
                            onChange={(e) => setLocationData({...locationData, lng: e.target.value})}
                            required 
                          />
                        </div>
                      </div>
                      <Button type="submit" disabled={updatingLocation} className="w-full h-14 rounded-none uppercase font-bold tracking-[0.2em] text-[10px]">
                        {updatingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : "Lock Coordinates"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <MapIcon className="h-4 w-4" /> Visual Beacon Tracker
                  </h3>
                  <div className="aspect-video bg-muted/10 border-2 border-dashed relative overflow-hidden flex items-center justify-center group">
                    <div className="absolute inset-0 opacity-10 bg-[url('https://picsum.photos/seed/location-map/800/600')] bg-cover grayscale" />
                    <div className="relative z-10 flex flex-col items-center text-center">
                       <MapPin className="h-10 w-10 text-primary animate-bounce mb-4" />
                       <div className="bg-background/90 backdrop-blur-sm border p-4 shadow-xl">
                          <p className="text-[10px] font-bold uppercase text-primary mb-2">Live Beacon Active</p>
                          <p className="text-[10px] font-mono font-bold">LAT: {locationData.lat || 'PENDING'}</p>
                          <p className="text-[10px] font-mono font-bold">LNG: {locationData.lng || 'PENDING'}</p>
                       </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-center py-20 text-muted-foreground uppercase text-xs font-bold tracking-widest">No active system alerts</p>
              ) : (
                notifications.map((notif: any) => (
                  <div key={notif.id} className="p-4 border-b border-dashed flex justify-between items-center hover:bg-muted/10">
                    <div>
                      <p className="text-sm font-bold uppercase tracking-tight">{notif.message}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{notif.createdAt ? new Date(notif.createdAt).toLocaleString() : "Syncing..."}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-xl space-y-12">
              <section className="space-y-4">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Interface Customization</h3>
                <Card className="border-none bg-muted/30 rounded-none">
                  <CardContent className="p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold uppercase">Night Vision Protocol</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {theme === 'light' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
                    </div>
                  </CardContent>
                </Card>
              </section>

              <section className="space-y-4">
                <Button variant="destructive" onClick={handleLogout} className="w-full h-14 rounded-none uppercase font-bold tracking-[0.2em] flex items-center justify-center gap-3">
                  <LogOut className="h-4 w-4" /> Terminate Safety Session
                </Button>
              </section>
            </div>
          )}
        </div>
      </main>

      {/* Persistent Dialogs */}
      <Dialog open={isAddBuddyDialogOpen} onOpenChange={setIsAddBuddyDialogOpen}>
        <DialogContent className="rounded-none border-none max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-bold">Enlist New Buddy</DialogTitle>
          </DialogHeader>
          <div className="pt-6">
            <form onSubmit={(e) => handleRegisterDevice(e, 'buddy')} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="buddy-name" className="text-[10px] uppercase font-bold tracking-widest">Buddy Name</Label>
                <Input id="buddy-name" placeholder="e.g. Garry" className="rounded-none h-12" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buddy-phone" className="text-[10px] uppercase font-bold tracking-widest">Phone Number</Label>
                <Input id="buddy-phone" placeholder="+1..." className="rounded-none h-12" value={formData.phoneNumber} onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-widest">Role</Label>
                  <Input placeholder="e.g. Primary Emergency" className="rounded-none h-12" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-widest">Priority</Label>
                  <Select value={formData.priority} onValueChange={(v) => setFormData({...formData, priority: v})}>
                    <SelectTrigger className="rounded-none h-12">
                      <SelectValue placeholder="Priority" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold tracking-widest">Contact Group</Label>
                <Select value={formData.group} onValueChange={(v) => setFormData({...formData, group: v})}>
                  <SelectTrigger className="rounded-none h-12">
                    <SelectValue placeholder="Select group" />
                  </SelectTrigger>
                  <SelectContent>
                    {buddyGroups.map(g => (
                      <SelectItem key={g} value={g}>{g}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full rounded-none h-14 uppercase font-bold tracking-widest" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save & Authorize Buddy"}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddNodeDialogOpen} onOpenChange={setIsAddNodeDialogOpen}>
        <DialogContent className="rounded-none border-none max-w-md">
          <DialogHeader>
            <DialogTitle className="uppercase font-bold">Arm New Node</DialogTitle>
          </DialogHeader>
          <form onSubmit={(e) => handleRegisterDevice(e, 'node')} className="space-y-6 pt-4">
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="modal-node-name" className="text-[10px] uppercase font-bold tracking-widest">Node Name</Label>
                  <Input id="modal-node-name" placeholder="e.g. Primary SOS Beacon" className="rounded-none h-12" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modal-node-id" className="text-[10px] uppercase font-bold tracking-widest">Hardware ID</Label>
                  <Input id="modal-node-id" placeholder="e.g. BEACON-01" className="rounded-none h-12" value={formData.deviceId} onChange={(e) => setFormData({...formData, deviceId: e.target.value})} required />
                </div>
                
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-bold flex items-center gap-2">
                    <Radio className="h-3 w-3" /> Target Contact Groups
                  </Label>
                  <div className="grid grid-cols-1 gap-2 p-4 bg-muted/30 border border-dashed rounded-none max-h-[200px] overflow-y-auto">
                    {buddyGroups.map((group) => {
                      const groupBuddies = getBuddiesInGroup(group);
                      return (
                        <div key={group} className="flex flex-col space-y-1 py-1">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id={`group-${group}`} 
                              checked={formData.alertGroups.includes(group)}
                              onCheckedChange={() => toggleAlertGroup(group)}
                            />
                            <Label htmlFor={`group-${group}`} className="text-[10px] uppercase font-bold cursor-pointer flex flex-wrap items-center gap-2">
                              {group}
                              {groupBuddies.length > 0 && (
                                <span className="text-[8px] font-mono text-muted-foreground normal-case bg-muted px-1.5 py-0.5">
                                  Includes: {groupBuddies.map(b => b.name).join(', ')}
                                </span>
                              )}
                            </Label>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="space-y-2">
                    <p className="text-[8px] text-muted-foreground uppercase font-bold">Auto-Linked Recipients ({getLinkedBuddies(formData.alertGroups).length})</p>
                    <div className="flex flex-wrap gap-1">
                      {getLinkedBuddies(formData.alertGroups).length > 0 ? (
                        getLinkedBuddies(formData.alertGroups).map(b => (
                          <span key={b.id} className="text-[8px] bg-primary/10 text-primary px-2 py-0.5 border border-primary/20 font-bold uppercase">{b.name}</span>
                        ))
                      ) : (
                        <span className="text-[8px] text-muted-foreground italic">No buddies currently linked to these groups.</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-bold tracking-widest">Technical Data</Label>
                  <Textarea placeholder="Specific node safety details..." className="rounded-none min-h-[100px]" value={formData.specialData} onChange={(e) => setFormData({...formData, specialData: e.target.value})} />
                </div>
              </div>
            </ScrollArea>
            <DialogFooter className="pt-4 border-t border-dashed">
              <Button type="submit" className="w-full rounded-none h-14 uppercase font-bold tracking-widest" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save & Arm Node"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="rounded-none border-none">
          <DialogHeader><DialogTitle className="uppercase font-bold">Update Configuration</DialogTitle></DialogHeader>
          {editingDevice && (
            <form onSubmit={handleUpdateDevice} className="space-y-4">
              <ScrollArea className="max-h-[60vh] pr-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-bold">Label</Label>
                    <Input className="rounded-none" value={editingDevice.name} onChange={(e) => setEditingDevice({...editingDevice, name: e.target.value})} required />
                  </div>
                  {editingDevice.category === 'buddy' ? (
                    <>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Phone Number</Label>
                        <Input className="rounded-none" value={editingDevice.phoneNumber} onChange={(e) => setEditingDevice({...editingDevice, phoneNumber: e.target.value})} required />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold">Priority</Label>
                        <Select value={editingDevice.priority} onValueChange={(v) => setEditingDevice({...editingDevice, priority: v})}>
                          <SelectTrigger className="rounded-none">
                            <SelectValue placeholder="Priority" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Low">Low</SelectItem>
                            <SelectItem value="Medium">Medium</SelectItem>
                            <SelectItem value="High">High</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <div className="space-y-4">
                      <Label className="text-[10px] uppercase font-bold flex items-center gap-2">
                        <Radio className="h-3 w-3" /> Target Contact Groups
                      </Label>
                      <div className="grid grid-cols-1 gap-2 p-4 bg-muted/30 border border-dashed rounded-none max-h-[200px] overflow-y-auto">
                        {buddyGroups.map((group) => {
                          const groupBuddies = getBuddiesInGroup(group);
                          return (
                            <div key={group} className="flex flex-col space-y-1 py-1">
                              <div className="flex items-center space-x-2">
                                <Checkbox 
                                  id={`edit-group-${group}`} 
                                  checked={(editingDevice.alertGroups || []).includes(group)}
                                  onCheckedChange={() => toggleAlertGroup(group, true)}
                                />
                                <Label htmlFor={`edit-group-${group}`} className="text-[10px] uppercase font-bold cursor-pointer flex items-center gap-2">
                                  {group}
                                  {groupBuddies.length > 0 && (
                                    <span className="text-[8px] font-mono text-muted-foreground normal-case bg-muted px-1.5 py-0.5">
                                      ({groupBuddies.map(b => b.name).join(', ')})
                                    </span>
                                  )}
                                </Label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
              <DialogFooter className="pt-4 border-t border-dashed">
                <Button type="submit" className="rounded-none uppercase text-[10px] font-bold w-full h-12">Save Configuration</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="rounded-none border-none">
          <DialogHeader><DialogTitle className="uppercase font-bold">Asset Registry Information</DialogTitle></DialogHeader>
          {viewingDevice && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[8px] uppercase font-bold text-muted-foreground">Registry Name</p>
                  <p className="text-xs font-bold uppercase">{viewingDevice.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[8px] uppercase font-bold text-muted-foreground">Unique Hash ID</p>
                  <p className="text-xs font-mono">{viewingDevice.id}</p>
                </div>
                {viewingDevice.category === 'node' && viewingDevice.alertGroups && (
                  <div className="space-y-3 col-span-2 border-t border-dashed pt-4">
                    <p className="text-[8px] uppercase font-bold text-muted-foreground">Active Recipients ({getLinkedBuddies(viewingDevice.alertGroups).length})</p>
                    <div className="flex flex-wrap gap-1">
                      {getLinkedBuddies(viewingDevice.alertGroups).map(b => (
                        <span key={b.id} className="text-[9px] border border-primary text-primary px-2 py-0.5 font-bold uppercase">{b.name} ({b.phoneNumber})</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)} className="rounded-none w-full uppercase text-[10px] font-bold">Close Access Hub</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="rounded-none border-none">
          <AlertDialogHeader>
            <AlertDialogTitle className="uppercase font-bold tracking-tight">Purge Security Asset?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs uppercase leading-relaxed">
              This action is final and will truncate the safety orchestration protocol.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none uppercase text-[10px] font-bold">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!user || !rtdb || !deviceToDelete) return;
              remove(ref(rtdb, `users/${user.uid}/devices/${deviceToDelete.id}`)).then(() => {
                if (deviceToDelete.category === 'buddy') remove(ref(rtdb, `esp_queue/${user.uid}/${deviceToDelete.id}`));
                createNotification(`Removed from network: ${deviceToDelete.name}`);
                setIsDeleteDialogOpen(false);
                setDeviceToDelete(null);
                toast({ title: "Asset Purged" });
              });
            }} className="rounded-none uppercase text-[10px] font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
