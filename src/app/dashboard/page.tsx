
"use client";

import { useUser, useDatabase, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Check,
  X,
  ShieldCheck,
  UserCheck,
  Navigation,
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
  loading: () => <div className="h-[250px] md:h-[350px] w-full bg-muted animate-pulse rounded-lg flex items-center justify-center text-[10px] font-bold uppercase tracking-widest opacity-40">Initializing Terminal Map...</div>
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
  const [registerLoading, setRegisterLoading] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const trackingTimers = useRef<Record<string, any>>({});

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

  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTelemetryOpen, setIsTelemetryOpen] = useState(false);
  const [activeTrackedNodes, setActiveTrackedNodes] = useState<any[]>([]);
  const [telemetryTargetUid, setTelemetryTargetUid] = useState<string | null>(null);

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

  const isValidCoordinate = (val: any) => {
    if (val === undefined || val === null || val === "No_fix") return false;
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return !isNaN(num) && isFinite(num) && num !== 0;
  };

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
        if (role === 'guardian') {
          setActiveTab('guardian');
        } else {
          setActiveTab('buddies');
        }
      });
    }
  }, [user, userLoading, router, rtdb]);

  useEffect(() => {
    if (rtdb && user && user.emailVerified) {
      const usersRef = ref(rtdb, 'users');
      const unsubscribe = onValue(usersRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
          const list = Object.entries(data)
            .filter(([uid]) => uid !== user.uid)
            .map(([uid, val]: [string, any]) => ({
              uid,
              email: val.profile?.email || 'N/A',
              displayName: val.profile?.displayName || (val.profile?.email ? val.profile.email.split('@')[0] : 'Tactical Unit'),
              role: val.profile?.role || 'user',
              nodes: val.nodes || {}
            }));
          setAllUsers(list);
        }
      });
      return () => off(usersRef, 'value', unsubscribe);
    }
  }, [user, rtdb]);

  useEffect(() => {
    if (itemToEdit && (activeTab === 'buddies' || activeTab === 'nodes')) {
      if (activeTab === 'buddies') {
        setBuddyForm({
          name: itemToEdit.name || '',
          phoneNumber: itemToEdit.phoneNumber || '',
          groups: itemToEdit.groups || []
        });
      } else {
        setNodeForm({
          nodeName: itemToEdit.nodeName || '',
          hardwareId: itemToEdit.hardwareId || '',
          phoneNumber: itemToEdit.phoneNumber || '',
          temperature: itemToEdit.temperature || 24,
          targetGroups: itemToEdit.targetGroups || []
        });
      }
    }
  }, [itemToEdit, activeTab]);

  useEffect(() => {
    if (!rtdb || !telemetryTargetUid || !isTelemetryOpen) {
      setActiveTrackedNodes([]);
      return;
    }

    const nodeRef = ref(rtdb, `users/${telemetryTargetUid}/nodes`);
    const unsubscribe = onValue(nodeRef, (snapshot) => {
      const nodesVal = snapshot.val();
      if (nodesVal) {
        const nodeList = Object.entries(nodesVal).map(([id, val]: [string, any]) => ({ ...val, id }));
        setActiveTrackedNodes(nodeList);
      } else {
        setActiveTrackedNodes([]);
      }
    });

    return () => off(nodeRef, 'value', unsubscribe);
  }, [rtdb, telemetryTargetUid, isTelemetryOpen]);

  const groupsRef = useMemo(() => user && user.emailVerified ? ref(rtdb, `users/${user.uid}/buddyGroups`) : null, [rtdb, user]);
  const { data: customGroupsData } = useRtdb(groupsRef);

  const buddiesRef = useMemo(() => user && user.emailVerified ? ref(rtdb, `users/${user.uid}/buddies`) : null, [rtdb, user]);
  const { data: buddiesData } = useRtdb(buddiesRef);

  const nodesRef = useMemo(() => user && user.emailVerified ? ref(rtdb, `users/${user.uid}/nodes`) : null, [rtdb, user]);
  const { data: nodesData } = useRtdb(nodesRef);

  const notificationsRef = useMemo(() => user && user.emailVerified ? ref(rtdb, `users/${user.uid}/notifications`) : null, [rtdb, user]);
  const { data: notificationsData } = useRtdb(notificationsRef);

  const linksRef = useMemo(() => user && user.emailVerified ? ref(rtdb, `users/${user.uid}/links`) : null, [rtdb, user]);
  const { data: linksData } = useRtdb(linksRef);

  useEffect(() => {
    if (!user || !user.emailVerified || !rtdb || !userRole) return;

    const queryRef = ref(rtdb, `users/${user.uid}/notifications`);
    
    const unsubscribe = onChildAdded(queryRef, async (snapshot) => {
      const alert = snapshot.val();
      const alertId = snapshot.key;

      if (alert && alert.type === "sos" && userRole === 'user' && alertId !== lastProcessedSosRef.current) {
        lastProcessedSosRef.current = alertId;
        const createdAt = alert.createdAt || alert.timestamp || 0;
        if (Date.now() - createdAt < 30000) {
          let enhancedAlert = { ...alert, id: alertId, createdAt };
          
          if (isValidCoordinate(alert.latitude) && isValidCoordinate(alert.longitude) && !alert.place) {
            try {
              const geo = await reverseGeocode({ latitude: Number(alert.latitude), longitude: Number(alert.longitude) });
              enhancedAlert.place = `${geo.city}, ${geo.province}, ${geo.country}`;
              update(ref(rtdb, `users/${user.uid}/notifications/${alertId}`), { place: enhancedAlert.place });
            } catch (e) {
              console.error("SOS Geocoding failed", e);
            }
          }
          
          setActiveSosAlert(enhancedAlert);
          setIsSosMapOpen(true);
        }
      }
    });

    return () => off(queryRef, "child_added", unsubscribe);
  }, [user, rtdb, userRole]);

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
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [notificationsData]);

  const links = useMemo(() => {
    if (!linksData) return [];
    return Object.entries(linksData).map(([id, val]: [string, any]) => ({ ...val, uid: id }));
  }, [linksData]);

  const pendingRequests = useMemo(() => links.filter(l => l.status === 'pending'), [links]);
  const activeLinks = useMemo(() => links.filter(l => l.status === 'linked'), [links]);

  const logAction = (message: string, type: string = 'system_log', extras: any = {}) => {
    if (!user || !rtdb) return;
    const notificationRef = ref(rtdb, `users/${user.uid}/notifications`);
    push(notificationRef, {
      message,
      createdAt: Date.now(),
      type,
      ...extras
    });
  };

  const handleClearNotifications = () => {
    if (!user || !rtdb) return;
    const notificationsRef = ref(rtdb, `users/${user.uid}/notifications`);
    remove(notificationsRef).then(() => {
      toast({ title: "Terminal Purged", description: "All tactical logs permanently cleared from the database." });
    }).catch((err) => {
      toast({ variant: "destructive", title: "Purge Failed", description: err.message });
    });
  };

  const handleSendLinkRequest = (targetUser: any) => {
    if (!user || !rtdb) return;
    setRegisterLoading(true);

    const now = Date.now();
    const updates: any = {};
    
    updates[`users/${targetUser.uid}/links/${user.uid}`] = {
      status: 'pending',
      email: user.email,
      role: userRole,
      createdAt: now
    };
    updates[`users/${user.uid}/links/${targetUser.uid}`] = {
      status: 'requested',
      email: targetUser.email,
      role: targetUser.role,
      createdAt: now
    };

    update(ref(rtdb), updates)
      .then(() => {
        toast({ title: "Link Dispatched", description: `Tactical link request sent to user associated with hardware signature.` });
        
        const targetNotifRef = ref(rtdb, `users/${targetUser.uid}/notifications`);
        push(targetNotifRef, {
          message: `Incoming tactical link request from ${user.email}`,
          type: 'link_request',
          senderEmail: user.email,
          senderUid: user.uid,
          createdAt: Date.now()
        });

        logAction(`Initiated tactical link request for hardware ID.`);
      })
      .catch((err) => toast({ variant: "destructive", title: "Dispatch Failed", description: err.message }))
      .finally(() => setRegisterLoading(false));
  };

  const handleApproveLink = (request: any) => {
    if (!user || !rtdb) return;
    const updates: any = {};
    updates[`users/${user.uid}/links/${request.uid}/status`] = 'linked';
    updates[`users/${request.uid}/links/${user.uid}/status`] = 'linked';

    update(ref(rtdb), updates).then(() => {
      toast({ title: "Link Synchronized", description: "Guardian link authorized." });
      logAction(`Approved tactical link from Guardian: ${request.email}`);
    });
  };

  const handleRejectLink = (request: any) => {
    if (!user || !rtdb) return;
    const updates: any = {};
    updates[`users/${user.uid}/links/${request.uid}`] = null;
    updates[`users/${request.uid}/links/${user.uid}`] = null;

    update(ref(rtdb), updates).then(() => {
      toast({ title: "Link Terminated", description: "Tactical connection purged." });
      logAction(`Terminated tactical link from: ${request.email}`);
    });
  };

  const handleRequestTracking = (link: any) => {
    if (!user || !rtdb) return;
    const updates: any = {};
    updates[`users/${link.uid}/links/${user.uid}/trackingRequest`] = 'pending';
    updates[`users/${user.uid}/links/${link.uid}/trackingRequest`] = 'requested';

    update(ref(rtdb), updates).then(() => {
      toast({ title: "Track Request Sent", description: "Awaiting user authorization." });
      
      const targetNotifRef = ref(rtdb, `users/${link.uid}/notifications`);
      push(targetNotifRef, {
        message: `Tactical telemetry track request initiated by Guardian ${user.email}`,
        type: 'track_request',
        senderEmail: user.email,
        senderUid: user.uid,
        createdAt: Date.now()
      });

      logAction(`Dispatched location track request for: ${link.email}`);
    });
  };

  const handleApproveTracking = (link: any) => {
    if (!user || !rtdb) return;
    const updates: any = {};
    updates[`users/${user.uid}/links/${link.uid}/trackingRequest`] = 'approved';
    updates[`users/${link.uid}/links/${user.uid}/trackingRequest`] = 'approved';

    update(ref(rtdb), updates).then(() => {
      toast({ title: "Track Authorized", description: "Hardware telemetry broadcast granted." });
      logAction(`Authorized tracking for Guardian: ${link.email}`);
    });
  };

  const handleRejectTracking = (link: any) => {
    if (!user || !rtdb) return;
    const updates: any = {};
    updates[`users/${user.uid}/links/${link.uid}/trackingRequest`] = null;
    updates[`users/${link.uid}/links/${user.uid}/trackingRequest`] = null;

    update(ref(rtdb), updates).then(() => {
      toast({ title: "Track Denied", description: "Spatial telemetry request rejected." });
      logAction(`Rejected tracking request from: ${link.email}`);
    });
  };

  const handleSearchManual = () => {
    if (!searchQuery) return;
    const target = allUsers.find(u => {
      const userNodes = Object.values(u.nodes || {});
      return userNodes.some((node: any) => node.hardwareId?.toLowerCase() === searchQuery.toLowerCase());
    });
    
    if (target) {
      const existingLink = links.find(l => l.uid === target.uid);
      if (existingLink && (existingLink.status === 'linked' || existingLink.status === 'requested')) {
        toast({ 
          variant: "destructive", 
          title: "Protocol Conflict", 
          description: "Already linked on this node." 
        });
        return;
      }
      handleSendLinkRequest(target);
    } else {
      toast({ variant: "destructive", title: "Target Missing", description: "No registered hardware signature found." });
    }
  };

  const handleOpenTelemetry = (targetUid: string) => {
    setTelemetryTargetUid(targetUid);
    setIsTelemetryOpen(true);
  };

  const handleToggleNodeTrack = (nodeId: string, currentStatus: boolean) => {
    if (!rtdb || !telemetryTargetUid || !user) return;
    const nodePath = `users/${telemetryTargetUid}/nodes/${nodeId}`;
    const newStatus = !currentStatus;

    if (trackingTimers.current[nodeId]) {
      clearTimeout(trackingTimers.current[nodeId]);
      delete trackingTimers.current[nodeId];
    }

    update(ref(rtdb, nodePath), { 
      trackRequest: newStatus,
      trackRequester: newStatus ? user.uid : null 
    });
    
    if (newStatus) {
      toast({ 
        title: "Track Signal Dispatched",
        description: "Requesting hardware telemetry broadcast (10s window)."
      });

      trackingTimers.current[nodeId] = setTimeout(() => {
        update(ref(rtdb, nodePath), { 
          trackRequest: false,
          trackRequester: null
        });
        toast({
          title: "Signal Window Closed",
          description: `Tracking for node ${nodeId} has timed out.`
        });
        delete trackingTimers.current[nodeId];
      }, 10000);
    } else {
      toast({ 
        title: "Track Signal Suspended",
        description: "Telemetry request terminated manually."
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

  if (!user || !user.emailVerified) return null;

  const navItems = userRole === 'guardian' 
    ? [
        { id: 'guardian', label: 'LINKED USERS', icon: Radar },
        { id: 'notifications', label: 'NOTIFICATION', icon: Bell },
        { id: 'settings', label: 'PROFILE', icon: Settings },
      ]
    : [
        { id: 'buddies', label: 'MANAGE BUDDIES', icon: Smartphone },
        { id: 'nodes', label: 'MANAGE NODES', icon: Cpu },
        { id: 'my-guardians', label: 'MY GUARDIANS', icon: ShieldCheck },
        { id: 'notifications', label: 'NOTIFICATION', icon: Bell },
        { id: 'settings', label: 'PROFILE', icon: Settings },
      ];

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#e1f1fd] text-[#12086F] overflow-x-hidden w-full relative">
      <aside className="w-full md:w-64 bg-white/50 border-r border-primary/10 p-4 sm:p-6 md:h-screen md:sticky top-0 backdrop-blur-md z-40 flex-shrink-0">
        <div className="space-y-8 md:space-y-12">
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
          <nav className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-col gap-2 md:gap-4">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as TabType)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-3 transition-all rounded-xl text-[9px] md:text-[10px] font-bold uppercase tracking-widest relative min-w-0",
                    isActive 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "hover:bg-primary/5 text-muted-foreground"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                  {item.id === 'my-guardians' && (pendingRequests.length > 0 || links.some(l => l.trackingRequest === 'pending')) && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]" />
                  )}
                  {item.id === 'notifications' && notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 bg-secondary rounded-full animate-pulse shadow-[0_0_8px_rgba(72,149,239,0.6)]" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </aside>

      <main className="flex-1 p-4 sm:p-6 md:p-10 lg:p-16 overflow-y-auto w-full min-w-0">
        <div className="max-w-6xl mx-auto w-full">
          {activeTab === 'guardian' && userRole === 'guardian' && (
            <div className="space-y-8 md:space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#12086F]">LINKED USERS</h1>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 mt-1 md:mt-2">Tactical Personnel Recruitment</p>
                </div>
                <Badge className="bg-secondary/20 text-secondary border-none px-4 py-1.5 text-[9px] uppercase font-bold rounded-full w-fit">
                  Scan Active
                </Badge>
              </div>

              <Card className="glass-card border-none p-6 md:p-10 shadow-2xl overflow-hidden">
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Precision Search (Hardware ID)</Label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Input 
                        placeholder="e.g. NODE-X92J" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchManual()}
                        className="bg-primary/5 border-primary/10 rounded-2xl h-14 md:h-16 text-sm font-bold flex-1 px-6 shadow-inner"
                      />
                      <Button 
                        onClick={handleSearchManual} 
                        disabled={registerLoading || !searchQuery}
                        className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-14 md:h-16 px-12 bg-secondary hover:bg-secondary/90 text-white w-full sm:w-auto"
                      >
                        {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Search className="h-5 w-5 mr-3" /> Intercept</>}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>

              <div className="space-y-6 pt-10 border-t border-primary/10">
                <h2 className="text-xl font-bold tracking-tight text-[#12086F]">ACTIVE PROTOCOLS</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {activeLinks.map(link => (
                    <Card key={link.uid} className="glass-card border-none group transition-all p-6 md:p-8 border-l-4 border-l-secondary overflow-hidden">
                      <div className="flex justify-between items-start mb-4 gap-2">
                        <div className="max-w-[70%] min-w-0">
                          <p className="text-lg font-bold text-[#12086F] truncate">{link.email.split('@')[0]}</p>
                        </div>
                        <Badge className="bg-secondary text-white text-[8px] px-2 py-0.5 rounded-md flex-shrink-0">LINKED</Badge>
                      </div>
                      <div className="space-y-3">
                        {link.trackingRequest === 'approved' ? (
                          <Button 
                            className="w-full bg-accent hover:bg-accent text-white rounded-xl h-10 text-[9px] font-bold uppercase tracking-widest"
                            onClick={() => handleOpenTelemetry(link.uid)}
                          >
                            <Radar className="h-3.5 w-3.5 mr-2" /> Track Assets
                          </Button>
                        ) : link.trackingRequest === 'requested' || link.trackingRequest === 'pending' ? (
                          <Button disabled className="w-full bg-muted text-muted-foreground rounded-xl h-10 text-[9px] font-bold uppercase tracking-widest">
                            Awaiting Authorization
                          </Button>
                        ) : (
                          <Button 
                            className="w-full bg-primary hover:bg-primary text-white rounded-xl h-10 text-[9px] font-bold uppercase tracking-widest"
                            onClick={() => handleRequestTracking(link)}
                          >
                            <Radar className="h-3.5 w-3.5 mr-2" /> Request Track
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          className="w-full text-destructive hover:text-destructive hover:bg-destructive/5 text-[9px] font-bold uppercase tracking-widest h-10 rounded-xl" 
                          onClick={() => handleRejectLink(link)}
                        >
                          Terminate Link
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'my-guardians' && userRole === 'user' && (
            <div className="space-y-8 md:space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#12086F]">MY GUARDIANS</h1>
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 mt-1 md:mt-2">Authorization Protocols</p>
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-bold tracking-tight text-[#12086F]">PENDING REQUESTS</h2>
                {pendingRequests.length === 0 ? (
                  <Card className="glass-card p-12 text-center border-dashed border-primary/40 bg-white/40">
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">No incoming link requests</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {pendingRequests.map(request => (
                      <Card key={request.uid} className="glass-card border-none p-6 md:p-8 space-y-6 bg-secondary/5 border-l-4 border-l-destructive animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
                        <div>
                          <p className="text-lg font-bold text-[#12086F] truncate">{request.email.split('@')[0]}</p>
                          <Badge className="mt-3 bg-secondary text-white text-[8px] uppercase font-bold px-2 py-0.5 rounded-md">Identity: Guardian</Badge>
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={() => handleApproveLink(request)} className="flex-1 bg-primary hover:bg-primary text-white rounded-xl h-10 text-[9px] font-bold uppercase tracking-widest">
                            <Check className="h-4 w-4 mr-2" /> Approve
                          </Button>
                          <Button onClick={() => handleRejectLink(request)} variant="ghost" className="flex-1 border border-destructive/20 text-destructive hover:bg-destructive/5 rounded-xl h-10 text-[9px] font-bold uppercase tracking-widest">
                            <X className="h-4 w-4 mr-2" /> Reject
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-10 border-t border-primary/10">
                <h2 className="text-xl font-bold tracking-tight text-[#12086F]">TRACKING REQUESTS</h2>
                {links.filter(l => l.trackingRequest === 'pending').length === 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No pending signal track requests.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {links.filter(l => l.trackingRequest === 'pending').map(link => (
                      <Card key={link.uid} className="glass-card border-none p-6 md:p-8 bg-accent/5 border-l-4 border-l-accent overflow-hidden">
                        <div className="flex justify-between items-start mb-6 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-lg font-bold text-[#12086F] truncate">{link.email.split('@')[0]}</p>
                            <Badge className="mt-3 bg-accent text-white text-[8px] uppercase font-bold px-2 py-0.5 rounded-md">Request: Hardware Tracking</Badge>
                          </div>
                          <Radar className="h-5 w-5 text-accent animate-pulse flex-shrink-0" />
                        </div>
                        <div className="flex gap-3">
                          <Button onClick={() => handleApproveTracking(link)} className="flex-1 bg-accent hover:bg-accent text-white rounded-xl h-10 text-[9px] font-bold uppercase tracking-widest">
                            Grant Access
                          </Button>
                          <Button onClick={() => handleRejectTracking(link)} variant="ghost" className="flex-1 border border-destructive/20 text-destructive hover:bg-destructive/5 rounded-xl h-10 text-[9px] font-bold uppercase tracking-widest">
                            Deny
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-6 pt-10 border-t border-primary/10">
                <h2 className="text-xl font-bold tracking-tight text-[#12086F]">LINKED GUARDIANS</h2>
                {activeLinks.length === 0 ? (
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No active guardian links synchronized.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                    {activeLinks.map(link => (
                      <Card key={link.uid} className="glass-card border-none p-6 md:p-8 border-l-4 border-l-secondary overflow-hidden">
                        <div className="flex justify-between items-start gap-2">
                          <div className="max-w-[80%] min-w-0 flex-1">
                            <p className="text-lg font-bold text-[#12086F] truncate">{link.email.split('@')[0]}</p>
                            {link.trackingRequest === 'approved' && (
                              <Badge className="mt-2 bg-accent/20 text-accent border-none text-[8px] font-bold px-2 block w-fit truncate">HARDWARE TRACKING ACTIVE</Badge>
                            )}
                          </div>
                          <UserCheck className="h-5 w-5 text-secondary flex-shrink-0" />
                        </div>
                        <div className="mt-6 space-y-3">
                          {link.trackingRequest === 'approved' && (
                            <Button 
                              variant="outline" 
                              className="w-full border-accent text-accent hover:bg-accent/5 text-[9px] font-bold uppercase tracking-widest h-10 rounded-xl"
                              onClick={() => handleRejectTracking(link)}
                            >
                              Revoke Track Access
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            className="w-full text-destructive hover:bg-destructive/5 text-[9px] font-bold uppercase tracking-widest h-10 rounded-xl"
                            onClick={() => handleRejectLink(link)}
                          >
                            Terminate Protocol
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {(activeTab === 'buddies' || activeTab === 'nodes') && userRole === 'guardian' ? (
             <div className="flex flex-col items-center justify-center min-h-[50vh] opacity-40">
                <ShieldAlert className="h-16 w-16 mb-4" />
                <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Unauthorized: Buddy/Node protocols restricted to User role.</p>
             </div>
          ) : activeTab === 'buddies' && (
            <div className="space-y-8 md:space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#12086F]">MANAGE BUDDIES</h1>
                <div className="flex flex-wrap gap-4">
                  <Button onClick={() => setIsAddBuddyDialogOpen(true)} className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-6 bg-primary hover:bg-primary text-white flex-1 sm:flex-none">
                    <UserPlus className="h-4 w-4 mr-2" /> Enlist
                  </Button>
                  <Button onClick={() => setIsManageGroupsDialogOpen(true)} variant="outline" className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-6 border-primary/20 hover:bg-primary/5 flex-1 sm:flex-none">
                    <Layers className="h-4 w-4 mr-2" /> Protocols
                  </Button>
                </div>
              </div>

              {buddies.length === 0 ? (
                <Card className="glass-card p-12 md:p-24 text-center border-dashed border-primary/40 bg-white/40">
                  <Smartphone className="h-12 w-12 text-primary/20 mx-auto mb-6" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Standby Mode: No Enlisted Buddies</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {buddies.map(buddy => (
                    <Card key={buddy.id} className="glass-card border-none group transition-all overflow-hidden">
                      <CardHeader className="p-6 md:p-8">
                        <div className="flex justify-between items-start mb-6 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xl font-bold text-[#12086F] truncate">{buddy.name}</p>
                            <p className="text-[10px] font-mono text-secondary uppercase tracking-widest mt-1 truncate">{buddy.phoneNumber}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {buddy.groups?.map((g: string) => (
                            <Badge key={g} variant="outline" className="text-[9px] border-secondary/40 text-secondary uppercase font-bold px-3 bg-secondary/5">{g}</Badge>
                          ))}
                        </div>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 pt-0">
                        <div className="flex flex-wrap gap-2 pt-6 border-t border-primary/10">
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-primary/5 min-w-[70px]" onClick={() => { setItemToView(buddy); setIsViewItemDialogOpen(true); }}><Eye className="h-3.5 w-3.5 mr-2" /> View</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-primary text-white min-w-[70px]" onClick={() => { setItemToEdit(buddy); setIsEditBuddyDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-destructive hover:bg-destructive/5 flex-shrink-0" onClick={() => { setItemToDelete({ ...buddy, type: 'buddy' }); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'nodes' && userRole === 'user' && (
            <div className="space-y-8 md:space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#12086F]">MANAGE NODES</h1>
                <Button onClick={() => setIsAddNodeDialogOpen(true)} className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8 bg-primary hover:bg-primary text-white w-full sm:w-auto">
                  <PlusSquare className="h-4 w-4 mr-2" /> Arm Node
                </Button>
              </div>

              {nodes.length === 0 ? (
                <Card className="glass-card p-12 md:p-24 text-center border-dashed border-primary/40 bg-white/40">
                  <Cpu className="h-12 w-12 text-primary/20 mx-auto mb-6" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Systems Offline: No Active Nodes</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {nodes.map(node => (
                    <Card key={node.id} className="glass-card border-none group transition-all overflow-hidden">
                      <CardHeader className="p-6 md:p-8">
                        <div className="flex justify-between items-center mb-4 gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-xl font-bold text-[#12086F] truncate">{node.nodeName}</p>
                            {node.phoneNumber && <p className="text-[9px] font-mono text-secondary mt-1 uppercase tracking-widest truncate">{node.phoneNumber}</p>}
                          </div>
                          <div className={cn("h-3 w-3 rounded-full flex-shrink-0", node.status === 'online' ? 'bg-secondary shadow-[0_0_15px_rgba(72,149,239,0.4)]' : 'bg-muted')} />
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] truncate">ID: {node.hardwareId}</p>
                      </CardHeader>
                      <CardContent className="p-6 md:p-8 pt-0 space-y-6">
                        <div className="space-y-4">
                          <div className="flex justify-between items-center gap-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 flex items-center gap-2 whitespace-nowrap"><Thermometer className="h-3 w-3" /> Thermal Threshold</Label>
                            <span className="text-[10px] font-mono font-bold text-secondary flex-shrink-0">{node.temperature || 24}°C</span>
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
                        <div className="flex flex-wrap gap-2 pt-6 border-t border-primary/10">
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-primary/5 min-w-[70px]" onClick={() => { setItemToView(node); setIsViewItemDialogOpen(true); }}><Eye className="h-3.5 w-3.5 mr-2" /> View</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-primary text-white min-w-[70px]" onClick={() => { setItemToEdit(node); setIsEditNodeDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-destructive hover:bg-destructive/5 flex-shrink-0" onClick={() => { setItemToDelete({ ...node, type: 'node' }); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-8 md:space-y-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#12086F]">NOTIFICATION</h1>
                <div className="flex flex-wrap gap-4 w-full sm:w-auto">
                  {notifications.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={handleClearNotifications} 
                      className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8 border border-destructive/20 hover:bg-destructive/5 text-destructive w-full sm:w-auto"
                    >
                      <Eraser className="h-4 w-4 mr-2" /> Clear Vault
                    </Button>
                  )}
                </div>
              </div>
              <Card className="glass-card border-none overflow-hidden">
                <ScrollArea className="h-[500px] md:h-[600px] p-4 sm:p-8">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] md:h-[400px] opacity-10">
                      <Bell className="h-16 w-16 mb-6" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Notification Vault Clear</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={cn("mb-6 md:mb-8 pb-6 md:pb-8 border-b border-primary/5 last:border-0 last:mb-0 min-w-0", n.type === 'sos' && "bg-destructive/5 -mx-4 px-4 rounded-xl", (n.type === 'link_request' || n.type === 'track_request') && "bg-secondary/5 -mx-4 px-4 rounded-xl")}>
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3">
                          <div className="flex gap-4 items-center min-w-0 flex-1">
                            {n.type === 'sos' && <AlertTriangle className="h-5 w-5 text-destructive animate-pulse flex-shrink-0" />}
                            {(n.type === 'link_request' || n.type === 'track_request') && <UserPlus className="h-5 w-5 text-secondary flex-shrink-0" />}
                            <p className={cn("text-sm md:text-md font-bold tracking-wide break-words flex-1 min-w-0", n.type === 'sos' && "text-destructive uppercase", (n.type === 'link_request' || n.type === 'track_request') && "text-secondary")}>
                              {n.type === 'sos' ? `🚨 SOS ALERT - ${n.nodeName || 'UNIDENTIFIED'}` : n.message}
                            </p>
                          </div>
                          <Badge variant="outline" className={cn("text-[8px] md:text-[9px] font-bold px-3 bg-white/50 flex-shrink-0 self-end sm:self-center", n.type === 'sos' ? "border-destructive/40 text-destructive" : "border-secondary/40 text-secondary")}>
                            {safeFormatTime(n.createdAt)}
                          </Badge>
                        </div>
                        
                        {n.type === 'sos' && userRole === 'user' && (
                          <div className="space-y-4 mb-4 ml-0 sm:ml-9">
                            <p className="text-xs font-medium text-destructive/80">Trigger: {n.trigger || 'Manual SOS'}</p>
                            <div className="space-y-2">
                              <p className="text-xs font-medium opacity-60 flex items-center gap-2 break-words"><MapPin className="h-3 w-3 flex-shrink-0" /> {n.place || 'Location Coordinates Acquired'}</p>
                              {isValidCoordinate(n.latitude) && isValidCoordinate(n.longitude) && (
                                <p className="text-[10px] font-mono font-bold opacity-60 flex items-center gap-2">
                                  <Navigation className="h-3 w-3 flex-shrink-0" /> LAT: {n.latitude} | LNG: {n.longitude}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3">
                               <Button size="sm" onClick={() => { setActiveSosAlert(n); setIsSosMapOpen(true); }} className="h-8 rounded-lg bg-destructive text-[9px] font-bold uppercase tracking-widest px-6 shadow-lg shadow-destructive/20 text-white flex-1 sm:flex-none">Tactical Map</Button>
                            </div>
                          </div>
                        )}

                        {(n.type === 'link_request' || n.type === 'track_request') && (
                          <div className="mt-4 ml-0 sm:ml-9">
                             <Button 
                               size="sm" 
                               onClick={() => setActiveTab('my-guardians')} 
                               className="h-8 rounded-lg bg-secondary text-[9px] font-bold uppercase tracking-widest px-6 shadow-lg shadow-secondary/20 text-white w-full sm:w-auto"
                             >
                               {n.type === 'track_request' ? "Review Track Access" : "Review Link Request"}
                             </Button>
                          </div>
                        )}

                        {isValidCoordinate(n.latitude) && n.type !== 'sos' && n.type !== 'track_request' && n.type !== 'link_request' && (
                          <div className="ml-0 sm:ml-9 mb-4 space-y-3">
                            <div className="space-y-2">
                              {n.place && <p className="text-xs font-medium text-secondary/80 flex items-center gap-2 break-words"><MapPin className="h-3 w-3 flex-shrink-0" /> {n.place}</p>}
                              <p className="text-[10px] font-mono font-bold opacity-60 flex items-center gap-2">
                                <Navigation className="h-3 w-3 flex-shrink-0" /> LAT: {n.latitude} | LNG: {n.longitude}
                              </p>
                            </div>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 rounded-xl text-[9px] font-bold uppercase tracking-widest px-6 border-primary/20 hover:bg-primary/5 w-full sm:w-auto"
                              onClick={() => {
                                setMapNotification(n);
                                setIsMapModalOpen(true);
                              }}
                            >
                              <MapPin className="h-3.5 w-3.5 mr-2" /> View Map
                            </Button>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold ml-0 sm:ml-9">{safeFormatDate(n.createdAt)}</p>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-md w-full space-y-8 md:space-y-10 mx-auto lg:mx-0">
              <h1 className="text-3xl md:text-4xl font-bold tracking-tighter text-[#12086F]">PROFILE SETTINGS</h1>
              <Card className="bg-white border-none p-6 md:p-10 space-y-8 overflow-hidden shadow-2xl">
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

      <Dialog open={isTelemetryOpen} onOpenChange={setIsTelemetryOpen}>
        <DialogContent className="bg-white border-2 border-accent/20 shadow-2xl rounded-[2rem] w-[95vw] max-w-4xl p-0 overflow-hidden max-h-[90vh] flex flex-col [&>button]:hidden">
          <DialogHeader className="p-6 md:p-10 border-b border-accent/5 bg-accent/5 z-50">
             <div className="flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <Radar className="h-6 w-6 md:h-8 md:w-8 text-accent animate-pulse flex-shrink-0" />
                  <DialogTitle className="text-sm sm:text-lg md:text-xl font-bold uppercase tracking-widest text-[#12086F] truncate">Asset Control Hub</DialogTitle>
               </div>
             </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              {activeTrackedNodes.length === 0 ? (
                <div className="p-12 md:p-24 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No active assets reported.</p>
                </div>
              ) : (
                <div className="divide-y divide-accent/5">
                  {activeTrackedNodes.map(node => (
                    <div key={node.id} className="p-6 md:p-10 space-y-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="max-w-full overflow-hidden flex-1">
                           <p className="text-lg font-bold text-[#12086F] truncate">{node.nodeName}</p>
                           <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest truncate">ID: {node.hardwareId}</p>
                           {node.place && <p className="text-[10px] font-bold text-accent uppercase tracking-widest mt-1"><MapPin className="h-3 w-3 inline mr-1" /> {node.place}</p>}
                        </div>
                        <div className="w-full sm:w-auto flex items-center gap-4">
                           <Button 
                             onClick={() => handleToggleNodeTrack(node.id, node.trackRequest || false)}
                             className={cn(
                               "h-12 px-8 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all w-full sm:w-auto",
                               node.trackRequest 
                                 ? "bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20" 
                                 : "bg-accent hover:bg-accent text-white shadow-lg shadow-accent/20"
                             )}
                           >
                             {node.trackRequest ? "Stop Request" : "Track Request"}
                           </Button>
                        </div>
                      </div>
                      
                      {node.trackRequest && isValidCoordinate(node.latitude) && isValidCoordinate(node.longitude) && (
                        <div className="rounded-2xl overflow-hidden border border-accent/10">
                           <SOSMap 
                             latitude={node.latitude} 
                             longitude={node.longitude} 
                             label={`${node.nodeName} - ${node.place || 'LIVE'}`} 
                           />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="p-6 md:p-10 bg-white border-t border-accent/5 z-50">
            <Button 
              onClick={() => setIsTelemetryOpen(false)} 
              className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] bg-accent hover:bg-accent shadow-xl shadow-accent/20 text-white"
            >
              CLOSE ASSET
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isMapModalOpen} onOpenChange={setIsMapModalOpen}>
        <DialogContent className="bg-white border-none shadow-2xl rounded-[2rem] w-[95vw] max-w-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col [&>button]:hidden">
          <DialogHeader className="p-6 md:p-8 border-b border-primary/5 z-50 bg-white">
            <DialogTitle className="text-sm sm:text-lg md:text-xl font-bold uppercase tracking-widest text-secondary break-words min-w-0">Spatial Coordinate Intercept</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden relative">
             <ScrollArea className="h-full">
              {mapNotification && isValidCoordinate(mapNotification.latitude) && isValidCoordinate(mapNotification.longitude) && (
                <div className="flex flex-col h-full">
                  <SOSMap 
                      latitude={mapNotification.latitude} 
                      longitude={mapNotification.longitude}
                      label={mapNotification.place || mapNotification.message || "SIGNAL INTERCEPT"}
                  />
                  {mapNotification.place && (
                    <div className="p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-primary/10 flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                        <p className="text-[10px] font-bold uppercase tracking-widest flex-1 break-words">{mapNotification.place}</p>
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>
          </div>
          <div className="p-6 md:p-8 border-t border-primary/5 bg-white z-50">
             <Button onClick={() => setIsMapModalOpen(false)} className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg bg-primary hover:bg-primary text-white">
               Acknowledge Signal
             </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSosMapOpen} onOpenChange={setIsSosMapOpen}>
        <DialogContent className="bg-white border-2 border-destructive/20 shadow-2xl rounded-[2rem] w-[95vw] max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col [&>button]:hidden">
          <DialogHeader className="p-6 md:p-10 border-b border-destructive/5 bg-destructive/5 z-50">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
               <div className="flex items-center gap-4 overflow-hidden flex-1 min-w-0">
                  <AlertTriangle className="h-6 w-6 md:h-8 md:w-8 text-destructive animate-bounce flex-shrink-0" />
                  <div className="overflow-hidden min-w-0">
                    <DialogTitle className="text-sm sm:text-xl md:text-2xl font-bold text-destructive uppercase tracking-tighter break-words min-w-0">Tactical SOS Intercept</DialogTitle>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 truncate">Master Signal: {activeSosAlert?.nodeName || 'Hardware Node'}</p>
                  </div>
               </div>
               <Badge className="bg-destructive text-white border-none text-[10px] font-bold uppercase px-4 py-2 rounded-xl animate-pulse flex-shrink-0">Critical Alert</Badge>
             </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6 md:p-10 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Trigger Source</Label>
                    <p className="text-sm font-bold text-destructive break-words">{activeSosAlert?.trigger || 'Security Protocol 1-TAP'}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Timestamp</Label>
                    <p className="text-sm font-bold">{activeSosAlert?.createdAt ? new Date(activeSosAlert.createdAt).toLocaleString() : 'N/A'}</p>
                  </div>
                  <div className="space-y-2 lg:col-span-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40">Spatial Coordinates</Label>
                    <p className="text-[10px] font-mono font-bold text-secondary">LAT: {activeSosAlert?.latitude}<br/>LNG: {activeSosAlert?.longitude}</p>
                  </div>
                </div>
                
                <div className="relative rounded-2xl overflow-hidden border border-destructive/10 shadow-inner">
                  <SOSMap 
                      latitude={activeSosAlert?.latitude || 0} 
                      longitude={activeSosAlert?.longitude || 0}
                      label={activeSosAlert?.place || activeSosAlert?.nodeName || "SOS SIGNAL"}
                  />
                  <div className="p-4 md:p-6 bg-white/80 backdrop-blur-md border-t border-destructive/10 flex items-center gap-3">
                      <MapPin className="h-4 w-4 md:h-5 md:w-5 text-destructive flex-shrink-0" />
                      <p className="text-9px md:text-[10px] font-bold uppercase tracking-widest flex-1 break-words">{activeSosAlert?.place || 'Coordinates Identified'}</p>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
          <div className="p-6 md:p-10 bg-white border-t border-destructive/5 z-50">
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
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] w-[95vw] max-w-md p-6 md:p-10 max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader><DialogTitle className="text-lg md:text-xl font-bold uppercase tracking-widest text-secondary mb-6 truncate">Enlist Buddy</DialogTitle></DialogHeader>
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
              <Input value={buddyForm.phoneNumber} onChange={e => setBuddyForm({...buddyForm, phoneNumber: e.target.value.replace(/\D/g, '')})} inputMode="numeric" className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Protocol Groups</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:p-6 bg-primary/5 rounded-2xl border border-primary/10">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-3 min-w-0">
                    <Checkbox checked={buddyForm.groups.includes(g)} onCheckedChange={() => {
                      const updated = buddyForm.groups.includes(g) ? buddyForm.groups.filter(x => x !== g) : [...buddyForm.groups, g];
                      setBuddyForm({...buddyForm, groups: updated});
                    }} className="rounded-md border-primary/20 data-[state=checked]:bg-primary flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 truncate">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setIsAddBuddyDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest">Abort</Button>
              <Button type="submit" className="flex-1 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg bg-primary hover:bg-primary text-white" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Buddy"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditBuddyDialogOpen} onOpenChange={setIsEditBuddyDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] w-[95vw] max-w-md p-6 md:p-10 max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader><DialogTitle className="text-lg md:text-xl font-bold uppercase tracking-widest text-secondary mb-6 truncate">Recalibrate Buddy Protocol</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!user || !rtdb || !itemToEdit) return;
            setRegisterLoading(true);
            update(ref(rtdb, `users/${user.uid}/buddies/${itemToEdit.id}`), buddyForm)
              .then(() => {
                logAction(`Updated buddy profile: ${buddyForm.name}`);
                setIsEditBuddyDialogOpen(false);
                setItemToEdit(null);
                toast({ title: "Buddy Protocol Synchronized" });
              })
              .finally(() => setRegisterLoading(false));
          }} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Full Name</Label>
              <Input value={buddyForm.name} onChange={e => setBuddyForm({...buddyForm, name: e.target.value})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Phone Number</Label>
              <Input value={buddyForm.phoneNumber} onChange={e => setBuddyForm({...buddyForm, phoneNumber: e.target.value.replace(/\D/g, '')})} inputMode="numeric" className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Protocol Groups</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:p-6 bg-primary/5 rounded-2xl border border-primary/10">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-3 min-w-0">
                    <Checkbox checked={buddyForm.groups.includes(g)} onCheckedChange={() => {
                      const updated = buddyForm.groups.includes(g) ? buddyForm.groups.filter(x => x !== g) : [...buddyForm.groups, g];
                      setBuddyForm({...buddyForm, groups: updated});
                    }} className="rounded-md border-primary/20 data-[state=checked]:bg-primary flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 truncate">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setIsEditBuddyDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest">Abort</Button>
              <Button type="submit" className="flex-1 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg bg-primary hover:bg-primary text-white" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Recalibration"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddNodeDialogOpen} onOpenChange={setIsAddNodeDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] w-[95vw] max-w-md p-6 md:p-10 max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader><DialogTitle className="text-lg md:text-xl font-bold uppercase tracking-widest text-secondary mb-6 truncate">Arm Node</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!user || !rtdb) return;
            setRegisterLoading(true);

            const hwIdClean = nodeForm.hardwareId.trim().toLowerCase();
            const isHardwareIdTaken = allUsers.some(u => 
              Object.values(u.nodes || {}).some((n: any) => n.hardwareId?.trim().toLowerCase() === hwIdClean)
            ) || nodes.some(n => n.hardwareId?.trim().toLowerCase() === hwIdClean);

            if (isHardwareIdTaken) {
              toast({
                variant: "destructive",
                title: "Signature Conflict",
                description: "Hardware ID is already synchronized with another tactical unit."
              });
              setRegisterLoading(false);
              return;
            }

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
              <Input value={nodeForm.phoneNumber} onChange={e => setNodeForm({...nodeForm, phoneNumber: e.target.value.replace(/\D/g, '')})} inputMode="numeric" className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Initial Thermal Threshold (°C)</Label>
              <Input type="number" value={nodeForm.temperature} onChange={e => setNodeForm({...nodeForm, temperature: parseInt(e.target.value)})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Broadcast Targets</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:p-6 bg-primary/5 rounded-2xl border border-primary/10">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-3 min-w-0">
                    <Checkbox checked={nodeForm.targetGroups.includes(g)} onCheckedChange={() => {
                      const updated = nodeForm.targetGroups.includes(g) ? nodeForm.targetGroups.filter(x => x !== g) : [...nodeForm.targetGroups, g];
                      setNodeForm({...nodeForm, targetGroups: updated});
                    }} className="rounded-md border-primary/20 data-[state=checked]:bg-primary flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 truncate">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setIsAddNodeDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest">Abort</Button>
              <Button type="submit" className="flex-1 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg bg-primary hover:bg-primary text-white" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Arm Node"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditNodeDialogOpen} onOpenChange={setIsEditNodeDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] w-[95vw] max-w-md p-6 md:p-10 max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader><DialogTitle className="text-lg md:text-xl font-bold uppercase tracking-widest text-secondary mb-6 truncate">Calibrate Node Hardware</DialogTitle></DialogHeader>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!user || !rtdb || !itemToEdit) return;
            setRegisterLoading(true);

            const hwIdClean = nodeForm.hardwareId.trim().toLowerCase();
            const isHardwareIdTaken = allUsers.some(u => 
              Object.values(u.nodes || {}).some((n: any) => n.hardwareId?.trim().toLowerCase() === hwIdClean)
            ) || nodes.some(n => n.id !== itemToEdit.id && n.hardwareId?.trim().toLowerCase() === hwIdClean);

            if (isHardwareIdTaken) {
              toast({
                variant: "destructive",
                title: "Signature Conflict",
                description: "Hardware ID is already synchronized with another tactical unit."
              });
              setRegisterLoading(false);
              return;
            }

            update(ref(rtdb, `users/${user.uid}/nodes/${itemToEdit.id}`), nodeForm)
              .then(() => {
                logAction(`Recalibrated hardware node: ${nodeForm.nodeName}`);
                setIsEditNodeDialogOpen(false);
                setItemToEdit(null);
                toast({ title: "Hardware Recalibrated" });
              })
              .finally(() => setRegisterLoading(false));
          }} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Node Name</Label>
              <Input value={nodeForm.nodeName} onChange={e => setNodeForm({...nodeForm, nodeName: e.target.value})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Hardware ID</Label>
              <Input 
                value={nodeForm.hardwareId} 
                onChange={e => setNodeForm({...nodeForm, hardwareId: e.target.value})} 
                className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-mono" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Phone Number</Label>
              <Input value={nodeForm.phoneNumber} onChange={e => setNodeForm({...nodeForm, phoneNumber: e.target.value.replace(/\D/g, '')})} inputMode="numeric" className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Thermal Threshold (°C)</Label>
              <Input type="number" value={nodeForm.temperature} onChange={e => setNodeForm({...nodeForm, temperature: parseInt(e.target.value)})} className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-60 ml-1">Broadcast Targets</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:p-6 bg-primary/5 rounded-2xl border border-primary/10">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-3 min-w-0">
                    <Checkbox checked={nodeForm.targetGroups.includes(g)} onCheckedChange={() => {
                      const updated = nodeForm.targetGroups.includes(g) ? nodeForm.targetGroups.filter(x => x !== g) : [...nodeForm.targetGroups, g];
                      setNodeForm({...nodeForm, targetGroups: updated});
                    }} className="rounded-md border-primary/20 data-[state=checked]:bg-primary flex-shrink-0" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70 truncate">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-4">
              <Button type="button" variant="outline" onClick={() => setIsEditNodeDialogOpen(false)} className="flex-1 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest">Abort</Button>
              <Button type="submit" className="flex-1 h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg bg-primary hover:bg-primary text-white" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Confirm Calibration"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isViewItemDialogOpen} onOpenChange={setIsViewItemDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] w-[95vw] max-w-md p-6 md:p-10 max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader><DialogTitle className="text-lg md:text-xl font-bold uppercase tracking-widest text-secondary mb-6 truncate">Asset Overview</DialogTitle></DialogHeader>
          {itemToView && (
            <div className="space-y-6 md:space-y-8">
              <div className="p-6 md:p-8 bg-primary/5 rounded-3xl border border-primary/10 space-y-4 overflow-hidden">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest flex-shrink-0">Descriptor</span>
                  <span className="text-sm font-bold text-[#12086F] truncate">{itemToView.nodeName || itemToView.name}</span>
                </div>
                {itemToView.place && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest flex-shrink-0">Last Known Base</span>
                    <span className="text-[10px] font-bold text-accent truncate">{itemToView.place}</span>
                  </div>
                )}
                {itemToView.phoneNumber && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest flex-shrink-0">Phone Number</span>
                    <span className="text-[10px] font-mono text-secondary truncate">{itemToView.phoneNumber}</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest flex-shrink-0">{itemToView.hardwareId ? 'Hardware ID' : 'Internal ID'}</span>
                  <span className="text-[10px] font-mono text-secondary truncate">{itemToView.hardwareId || itemToView.id}</span>
                </div>
                {itemToView.temperature !== undefined && (
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest flex-shrink-0">Thermal Threshold</span>
                    <span className="text-[10px] font-mono text-secondary">{itemToView.temperature}°C</span>
                  </div>
                )}
                <div className="flex justify-between items-center gap-2">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest flex-shrink-0">Current Status</span>
                  <Badge className={cn("text-[9px] uppercase font-bold", itemToView.status === 'online' ? "bg-secondary/20 text-secondary" : "bg-muted/20 text-muted-foreground")}>{itemToView.status || 'Active'}</Badge>
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest flex-shrink-0">Link Created</span>
                  <span className="text-[10px] opacity-60 font-bold whitespace-nowrap">{safeFormatDate(itemToView.registeredAt)} {safeFormatTime(itemToView.registeredAt)}</span>
                </div>
              </div>
              <div className="p-6 md:p-8 bg-primary/5 rounded-3xl border border-primary/10 overflow-hidden">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-secondary mb-4 md:mb-6">Authorized Protocols</p>
                <div className="flex flex-wrap gap-2">
                  {(itemToView.targetGroups || itemToView.groups || []).map((g: string) => (
                    <Badge key={g} variant="outline" className="bg-white/50 border-primary/10 text-[9px] px-4 py-1.5 opacity-80 uppercase font-bold text-primary truncate max-w-full">{g}</Badge>
                  ))}
                </div>
              </div>
              <Button onClick={() => setIsViewItemDialogOpen(false)} className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest bg-primary hover:bg-primary text-white">Acknowledge Asset</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isManageGroupsDialogOpen} onOpenChange={setIsManageGroupsDialogOpen}>
        <DialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] w-[95vw] max-w-md p-6 md:p-10 max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader><DialogTitle className="text-lg md:text-xl font-bold uppercase tracking-widest text-secondary mb-6 truncate">Safety Protocols</DialogTitle></DialogHeader>
          <div className="space-y-6 md:space-y-8">
            <div className="flex gap-3">
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Protocol Name" className="bg-primary/5 border-primary/10 rounded-2xl h-14 text-sm font-bold uppercase tracking-widest flex-1 min-w-0" />
              <Button onClick={() => {
                if (!user || !newGroupName) return;
                push(ref(rtdb, `users/${user.uid}/buddyGroups`), { name: newGroupName });
                logAction(`Created new protocol group: ${newGroupName}`);
                setNewGroupName("");
              }} className="h-14 w-14 rounded-2xl p-0 shadow-lg bg-primary hover:bg-primary text-white flex-shrink-0"><PlusCircle className="h-6 w-6" /></Button>
            </div>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {buddyGroups.map(g => (
                  <div key={g} className="p-5 bg-primary/5 rounded-2xl flex justify-between items-center group/item transition-all border border-transparent overflow-hidden gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest truncate flex-1">{g}</span>
                    {!DEFAULT_BUDDY_GROUPS.includes(g) && (
                      <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl text-destructive hover:bg-destructive/5 flex-shrink-0" onClick={() => {
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
            <Button onClick={() => setIsManageGroupsDialogOpen(false)} className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest bg-secondary hover:bg-secondary text-white">Close Protocols</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="bg-white border border-primary/10 shadow-xl rounded-[2rem] p-6 md:p-10 w-[95vw] max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-lg md:text-xl font-bold uppercase tracking-widest text-destructive mb-4">Purge Asset?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">This asset will be permanently erased from the terminal hub and protocol networks.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 flex flex-col sm:flex-row gap-4">
            <AlertDialogCancel className="rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest flex-1 border-primary/10 w-full sm:w-auto">Abort</AlertDialogCancel>
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
            }} className="rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest flex-1 bg-destructive hover:bg-destructive text-white w-full sm:w-auto">Confirm Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
