
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
  Link2,
  ShieldX,
  UserPlus,
  ArrowRight,
  ShieldQuestion,
  LocateFixed,
  Zap,
  ZapOff,
  MapPin,
  ChevronDown,
  User as UserIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, push, remove, update, onChildAdded, off, get, serverTimestamp } from "firebase/database";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useRtdb } from "@/firebase/database/use-rtdb";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const SOSMap = dynamic(() => import("./sos-map"), { 
  ssr: false,
  loading: () => <div className="h-[200px] sm:h-[250px] md:h-[350px] w-full neo-inset animate-pulse flex items-center justify-center text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground">Initializing Tactical Map...</div>
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
  phoneNumber?: string;
  status: 'online' | 'offline' | 'error';
  temperature?: number;
  targetGroups?: string[];
  ownerUid?: string;
  ownerEmail?: string;
  trackRequest?: boolean;
  latitude?: number;
  longitude?: number;
}

export default function DashboardPage() {
  const { user, loading: userLoading } = useUser();
  const { auth } = useFirebase();
  const rtdb = useDatabase();
  const router = useRouter();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>('notifications');
  const [hasMounted, setHasMounted] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [radarSearchTerm, setRadarSearchTerm] = useState("");
  const [hasNewAlerts, setHasNewAlerts] = useState(false);
  const lastReadRef = useRef<number>(Date.now());
  const interceptedAlertsRef = useRef<Set<string>>(new Set());
  const activeTabRef = useRef<TabType>('notifications');

  const [isBuddyDialogOpen, setIsBuddyDialogOpen] = useState(false);
  const [isNodeDialogOpen, setIsNodeDialogOpen] = useState(false);
  const [isProtocolDialogOpen, setIsProtocolDialogOpen] = useState(false);
  const [editingBuddy, setEditingBuddy] = useState<Buddy | null>(null);
  const [editingNode, setEditingNode] = useState<Node | null>(null);
  const [viewingBuddy, setViewingBuddy] = useState<Buddy | null>(null);
  const [viewingNode, setViewingNode] = useState<Node | null>(null);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  const [selectedNodeGroups, setSelectedNodeGroups] = useState<string[]>([]);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'buddy' | 'node' | 'group' | 'link' | 'clear-notifications', name: string } | null>(null);
  const [pendingUpdate, setPendingUpdate] = useState<{ type: 'buddy' | 'node', data: any } | null>(null);
  const [interceptAlert, setInterceptAlert] = useState<any>(null);

  const profileRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/profile`) : null, [rtdb, user]);
  const buddiesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddies`) : null, [rtdb, user]);
  const nodesRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/nodes`) : null, [rtdb, user]);
  const groupsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/buddyGroups`) : null, [rtdb, user]);
  const notificationsRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/notifications`) : null, [rtdb, user]);
  const linksRef = useMemo(() => user ? ref(rtdb, `users/${user.uid}/links`) : null, [rtdb, user]);
  const allUsersRef = useMemo(() => (user && rtdb) ? ref(rtdb, `users`) : null, [rtdb, user]);

  const { data: profileData, loading: roleLoading } = useRtdb(profileRef);
  const { data: buddiesData } = useRtdb(buddiesRef);
  const { data: nodesData } = useRtdb(nodesRef);
  const { data: groupsData } = useRtdb(groupsRef);
  const { data: notificationsData } = useRtdb(notificationsRef);
  const { data: linksData } = useRtdb(linksRef);
  const { data: allUsersData } = useRtdb(allUsersRef);

  const groups = useMemo(() => groupsData ? Object.entries(groupsData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [groupsData]);
  
  const buddies = useMemo(() => {
    if (!buddiesData) return [];
    const activeGroupIds = new Set(groups.map(g => g.id));
    return Object.entries(buddiesData).map(([id, val]: [string, any]) => {
      const validatedGroups = (val.groups || []).filter((gid: string) => activeGroupIds.has(gid));
      return { ...val, id, groups: validatedGroups };
    });
  }, [buddiesData, groups]);

  const nodes = useMemo(() => nodesData ? Object.entries(nodesData).map(([id, val]: [string, any]) => ({ ...val, id })) : [], [nodesData]);
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
              ownerEmail: userData.profile?.email || "SECURE ASSET"
            });
          }
        });
      }
    });
    return nodeDiscovery;
  }, [allUsersData, user]);

  const radarSearchResults = useMemo(() => {
    if (!radarSearchTerm || radarSearchTerm.trim().length < 3) return [];
    const term = radarSearchTerm.toLowerCase().trim();
    return availableNodes.filter(node => {
      const hId = String(node.hardwareId || "").toLowerCase();
      return hId === term;
    });
  }, [availableNodes, radarSearchTerm]);

  const currentName = useMemo(() => profileData?.displayName || user?.email?.split('@')[0] || "Personnel", [user, profileData]);

  const navItems = useMemo(() => {
    return userRole === 'guardian' 
      ? [{ id: 'guardian', label: 'RADAR', icon: Radar }, { id: 'linked', label: 'LINKED USER', icon: ShieldCheck }, { id: 'notifications', label: 'NOTIFICATION', icon: Bell }, { id: 'settings', label: 'PROFILE', icon: UserIcon }]
      : [{ id: 'buddies', label: 'MANAGE BUDDIES', icon: Users }, { id: 'nodes', label: 'MANAGE NODES', icon: Cpu }, { id: 'linked', label: 'LINKED USER', icon: ShieldCheck }, { id: 'notifications', label: 'NOTIFICATION', icon: Bell }, { id: 'settings', label: 'PROFILE', icon: UserIcon }];
  }, [userRole]);

  const relayedAlertsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setHasMounted(true);
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    if (!userLoading && !user && hasMounted) {
      router.push("/login");
    } else if (user && !user.emailVerified && hasMounted) {
      router.push("/verify-email");
    }
  }, [user, userLoading, router, hasMounted]);

  useEffect(() => {
    if (profileData) {
      const role = profileData.role || 'user';
      setUserRole(role);
    }
  }, [profileData]);

  useEffect(() => {
    if (user && rtdb) {
      const notifRef = ref(rtdb, `users/${user.uid}/notifications`);
      const listener = onChildAdded(notifRef, (snapshot) => {
        const val = snapshot.val();
        const now = Date.now();
        const timestamp = val.timestamp || val.createdAt || 0;
        const alertId = snapshot.key || 'unknown';
        
        if (activeTabRef.current !== 'notifications' && (timestamp > lastReadRef.current)) {
          setHasNewAlerts(true);
        }

        if (val.type === 'sos' && val.trigger !== 'TrackResponse' && (now - timestamp < 45000)) {
          if (!interceptedAlertsRef.current.has(alertId)) {
            interceptedAlertsRef.current.add(alertId);
            setInterceptAlert({ ...val, id: alertId });
          }
          
          if (userRole === 'user' && !val.relayed) {
            if (!relayedAlertsRef.current.has(alertId)) {
              relayedAlertsRef.current.add(alertId);
              
              const guardianLinks = Object.entries(linksData || {}).filter(([_, l]: [string, any]) => l.status === 'linked');
              if (guardianLinks.length > 0) {
                const relayUpdates: any = {};
                relayUpdates[`users/${user.uid}/notifications/${alertId}/relayed`] = true;
                
                guardianLinks.forEach(([guardianUid, _]) => {
                  const relayKey = push(ref(rtdb, `users/${guardianUid}/notifications`)).key;
                  relayUpdates[`users/${guardianUid}/notifications/${relayKey}`] = {
                    ...val,
                    isRelay: true,
                    relayed: true,
                    originalUser: user.email,
                    relayTimestamp: serverTimestamp(),
                    createdAt: serverTimestamp()
                  };
                });
                update(ref(rtdb), relayUpdates).catch(e => console.error("SOS Relay Failure", e));
              }
            }
          }
        }
      });
      return () => off(notifRef, 'child_added', listener);
    }
  }, [user, rtdb, userRole, linksData]);

  useEffect(() => {
    if (activeTab === 'notifications') {
      setHasNewAlerts(false);
      lastReadRef.current = Date.now();
    }
  }, [activeTab]);

  const logOutTerminal = useCallback(() => signOut(auth).then(() => router.push("/login")), [auth, router]);

  const handleRequestLink = async (targetUid: string, hardwareId: string) => {
    if (!user || !rtdb) return;
    try {
      const targetNode = availableNodes.find(n => n.ownerUid === targetUid && n.hardwareId === hardwareId);
      const updates = {
        [`users/${user.uid}/links/${targetUid}`]: {
          status: 'requested',
          hardwareId,
          nodeName: targetNode?.nodeName || "SECURE ASSET",
          targetEmail: targetNode?.ownerEmail || "SECURE ASSET",
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

  const toggleNodeGroupSelection = (groupName: string, checked: boolean) => {
    setSelectedNodeGroups(prev => 
      checked ? [...prev, groupName] : prev.filter(name => name !== groupName)
    );
  };

  const handleSaveBuddy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    const formData = new FormData(e.currentTarget);
    const buddyData = {
      name: formData.get('buddyName') as string,
      phoneNumber: formData.get('phoneNumber') as string,
      groups: selectedGroups,
      registeredAt: serverTimestamp()
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
    const nodeName = formData.get('tacticalNodeName') as string;
    const hardwareId = formData.get('hardwareId') as string;

    const normalizedHardwareId = hardwareId.trim().toLowerCase();
    const isHardwareIdDuplicate = nodes.some(n => n.hardwareId.toLowerCase() === normalizedHardwareId && n.id !== editingNode?.id);
    
    if (isHardwareIdDuplicate) {
      toast({ 
        variant: "destructive", 
        title: "Signature Conflict", 
        description: "This Hardware ID is already registered in the tactical network." 
      });
      return;
    }

    const nodeData = {
      nodeName,
      hardwareId,
      phoneNumber: formData.get('nodePhoneNumber') as string,
      status: 'online',
      temperature: parseFloat(formData.get('tacticalTemperature') as string) || 24.5,
      targetGroups: selectedNodeGroups,
      registeredAt: serverTimestamp()
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
      const groupName = groups.find(g => g.id === id)?.name;
      const updates: any = {};
      updates[`users/${user.uid}/buddyGroups/${id}`] = null;
      
      buddies.forEach(buddy => {
        if (buddy.groups && buddy.groups.includes(id)) {
          const filteredGroups = buddy.groups.filter((gid: string) => gid !== id);
          updates[`users/${user.uid}/buddies/${buddy.id}/groups`] = filteredGroups;
        }
      });

      nodes.forEach(node => {
        if (groupName && node.targetGroups && node.targetGroups.includes(groupName)) {
          const filteredTargetGroups = node.targetGroups.filter(gn => gn !== groupName);
          updates[`users/${user.uid}/nodes/${node.id}/targetGroups`] = filteredTargetGroups;
        }
      });
      
      await update(ref(rtdb), updates);
      toast({ title: "Protocol Purged", description: "Group decommissioned and purged from all personnel and assets." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Purge Error", description: err.message });
    }
  };

  const clearNotifications = async () => {
    if (!user || !rtdb) return;
    try {
      const explicitNotifRef = ref(rtdb, `users/${user.uid}/notifications`);
      await remove(explicitNotifRef);
      toast({ title: "Stream Purged", description: "All alert logs have been decommissioned." });
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

  const quickAddGroup = async (name: string) => {
    if (!user || !rtdb) return;
    if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
      toast({ title: "Protocol Exists", description: `${name} group already defined.` });
      return;
    }
    try {
      await push(ref(rtdb, `users/${user.uid}/buddyGroups`), { name });
      toast({ title: "Protocol Created", description: `${name} initialized.` });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Protocol Error", description: err.message });
    }
  };

  if (userLoading || roleLoading || !hasMounted || !userRole) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#F0F4F8] text-foreground overflow-x-hidden font-sans">
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden flex justify-around items-center p-4 bg-white/80 backdrop-blur-md border-t border-black/5 pb-8 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as TabType)}
            className={cn(
              "flex flex-col items-center gap-1 transition-all text-[8px] font-black uppercase tracking-widest relative px-2",
              activeTab === item.id ? "text-primary scale-110" : "text-muted-foreground"
            )}
          >
            <item.icon className={cn("h-5 w-5", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
            <span className="text-foreground font-black">{item.label}</span>
            {hasNewAlerts && item.id === 'notifications' && (
              <span className="absolute top-0 right-1 h-2 w-2 bg-destructive rounded-full animate-pulse border-2 border-background" />
            )}
            {(links.some(l => l.status === 'pending' || l.trackingRequest === 'requested')) && (item.id === 'linked' || item.id === 'guardian') && (
              <span className="absolute top-0 right-1 h-1.5 w-1.5 bg-destructive rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </nav>

      <aside className="hidden md:flex w-72 p-6 h-screen sticky top-0 z-40 border-r border-black/5 bg-white flex-col justify-between shadow-sm">
        <div className="space-y-10">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
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
                  "flex items-center gap-4 px-5 py-4 transition-all text-[10px] font-black uppercase tracking-[0.1em] relative group whitespace-nowrap rounded-xl",
                  activeTab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-black/5 hover:text-foreground"
                )}
              >
                <item.icon className={cn("h-4 w-4", activeTab === item.id ? "text-primary" : "text-muted-foreground")} />
                <span className="text-foreground">{item.label}</span>
                {hasNewAlerts && item.id === 'notifications' && (
                  <span className="absolute top-1/2 -translate-y-1/2 right-6 h-2 w-2 bg-destructive rounded-full animate-pulse border-2 border-background" />
                )}
                {(links.some(l => l.status === 'pending' || l.trackingRequest === 'requested')) && (item.id === 'linked' || item.id === 'guardian') && (
                  <span className="absolute top-1/2 -translate-y-1/2 right-6 h-1.5 w-1.5 bg-destructive rounded-full animate-pulse" />
                )}
              </button>
            ))}
          </nav>
        </div>
        <div className="mt-auto">
          <div className="p-5 bg-[#F8FAFC] rounded-2xl border border-black/5 space-y-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-9 w-9 border border-black/5 shrink-0">
                <AvatarFallback className="bg-primary/10 text-[9px] font-black text-primary">{currentName[0].toUpperCase()}</AvatarFallback>
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
                  <Button onClick={() => { setEditingBuddy(null); setSelectedGroups([]); setIsBuddyDialogOpen(true); }} className="flex-1 sm:flex-none h-10 px-4 text-[9px] font-black uppercase tracking-widest bg-white text-foreground hover:text-primary transition-all border border-black/5 shadow-sm">
                    <PlusSquare className="h-4 w-4 mr-2 text-primary" /> ENLIST
                  </Button>
                  <Button onClick={() => setIsProtocolDialogOpen(true)} className="flex-1 sm:flex-none h-10 px-4 text-[9px] font-black uppercase tracking-widest bg-white text-foreground hover:text-primary border border-black/5 shadow-sm">
                    <ShieldAlert className="h-4 w-4 mr-2 text-primary/60" /> PROTOCOLS
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {buddies.length === 0 ? (
                  <div className="col-span-full bg-white rounded-[2rem] p-12 text-center opacity-30 flex flex-col items-center border border-black/5">
                    <Smartphone className="h-12 w-12 mb-6 text-foreground" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Operational Vault Empty</p>
                  </div>
                ) : (
                  buddies.map(buddy => (
                    <div key={buddy.id} className="bg-white rounded-[2rem] p-6 space-y-4 hover:shadow-xl transition-all duration-300 group border border-black/5">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <Avatar className="h-10 w-10 border border-black/5 shrink-0">
                            <AvatarFallback className="bg-primary/5 text-[10px] font-black text-primary">{buddy.name[0]}</AvatarFallback>
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
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary bg-[#F8FAFC] rounded-lg" onClick={() => setViewingBuddy(buddy)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary bg-[#F8FAFC] rounded-lg" onClick={() => { setEditingBuddy(buddy); setSelectedGroups(buddy.groups || []); setIsBuddyDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive bg-[#F8FAFC] rounded-lg" onClick={() => setDeleteConfirm({ id: buddy.id, type: 'buddy', name: buddy.name })}>
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
                <Button onClick={() => { setEditingNode(null); setSelectedNodeGroups([]); setIsNodeDialogOpen(true); }} className="w-full sm:w-auto h-10 px-4 text-[9px] font-black uppercase tracking-widest bg-primary text-white hover:bg-primary/90 transition-all rounded-xl shadow-lg shadow-primary/20">
                  <Cpu className="h-4 w-4 mr-2" /> ARM NODE
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nodes.length === 0 ? (
                  <div className="col-span-full bg-white rounded-[2rem] p-12 text-center opacity-30 flex flex-col items-center border border-black/5">
                    <Activity className="h-12 w-12 mb-6 text-foreground" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">No Active Assets</p>
                  </div>
                ) : (
                  nodes.map(node => (
                    <div key={node.id} className="bg-white rounded-[2rem] p-6 space-y-6 hover:shadow-xl transition-all duration-300 group border border-black/5">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-4 items-center">
                          <div className={cn("h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center border border-black/5 text-primary")}>
                            <Cpu className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-foreground">{node.nodeName}</p>
                            <p className="text-[8px] font-black text-muted-foreground mt-1 uppercase tracking-widest">{node.hardwareId}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {node.targetGroups?.map((gn, idx) => (
                          <div
                            key={idx}
                            className="text-[7px] font-black px-2 py-0.5 rounded-sm uppercase border transition-all bg-primary border-primary text-white shadow-sm"
                          >
                            {gn}
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#F8FAFC] rounded-2xl p-3 space-y-1 text-center border border-black/5">
                        <p className="text-[8px] font-black text-foreground/40 uppercase mb-1 tracking-tighter">Current Telemetry</p>
                        <div className="flex items-center justify-center gap-2">
                          <Thermometer className="h-3 w-3 text-orange-500/60" />
                          <p className="text-[10px] font-black text-foreground">{node.temperature || '--'}°C</p>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary bg-[#F8FAFC] rounded-lg" onClick={() => setViewingNode(node)}>
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary bg-[#F8FAFC] rounded-lg" onClick={() => { setEditingNode(node); setSelectedNodeGroups(node.targetGroups || []); setIsNodeDialogOpen(true); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive bg-[#F8FAFC] rounded-lg" onClick={() => setDeleteConfirm({ id: node.id, type: 'node', name: node.nodeName })}>
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
              <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">LINKED USER</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {links.length === 0 ? (
                  <div className="col-span-full bg-white rounded-[2rem] p-12 text-center opacity-30 flex flex-col items-center border border-black/5">
                    <Link2 className="h-12 w-12 mb-6 text-foreground" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">No Active Handshake Signals</p>
                  </div>
                ) : (
                  <>
                    {userRole !== 'guardian' && links.map(link => (
                      <div key={link.id} className={cn("bg-white rounded-[2rem] p-6 space-y-4 border border-black/5", (link.status === 'pending' || link.trackingRequest === 'requested') && "border-primary/20 bg-primary/5 shadow-lg shadow-primary/5")}>
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-3 items-center min-w-0 flex-1">
                            <Avatar className="h-10 w-10 border border-black/5 shrink-0">
                              <AvatarFallback className="bg-primary/10 text-[10px] font-black text-primary">{link.guardianEmail?.[0].toUpperCase() || 'G'}</AvatarFallback>
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
                            <Button onClick={() => handleAcceptLink(link.id)} className="flex-1 h-10 bg-primary text-white text-[9px] font-black uppercase tracking-widest rounded-xl">ACCEPT</Button>
                            <Button onClick={() => handleRejectLink(link.id)} className="flex-1 h-10 bg-white border border-black/5 text-destructive text-[9px] font-black uppercase tracking-widest rounded-xl">REJECT</Button>
                          </div>
                        )}

                        {link.status === 'linked' && link.trackingRequest === 'requested' && (
                          <div className="p-4 rounded-2xl bg-destructive/5 space-y-3 border border-destructive/20">
                            <p className="text-[8px] font-black text-destructive uppercase tracking-widest flex items-center gap-2"><Zap className="h-3 w-3" /> Incoming Track Request</p>
                            <div className="flex gap-2">
                              <Button onClick={() => handleApproveTracking(link.id)} className="flex-1 h-8 bg-primary text-white text-[8px] font-black uppercase rounded-lg">APPROVE</Button>
                              <Button onClick={() => handleRejectLink(link.id)} className="flex-1 h-8 bg-white text-destructive text-[8px] font-black uppercase rounded-lg border border-black/5">REJECT</Button>
                            </div>
                          </div>
                        )}

                        {link.status === 'linked' && link.trackingRequest === 'approved' && (
                          <div className="p-3 rounded-2xl bg-green-500/5 border border-green-500/10">
                            <p className="text-[8px] font-black text-green-600 uppercase tracking-widest flex items-center justify-center gap-2">
                              <ShieldCheck className="h-3 w-3" /> Telemetry Authorized
                            </p>
                          </div>
                        )}

                        {link.status === 'linked' && (
                          <Button onClick={() => handleRejectLink(link.id)} variant="ghost" className="w-full h-8 text-[8px] font-black uppercase text-muted-foreground hover:text-destructive bg-[#F8FAFC] rounded-lg"><Trash2 className="h-3 w-3 mr-2" /> TERMINATE LINK</Button>
                        )}
                      </div>
                    ))}

                    {userRole === 'guardian' && links.map(link => {
                      const linkedNode = availableNodes.find(n => n.hardwareId === link.hardwareId && n.ownerUid === link.id);
                      const assetName = linkedNode?.nodeName || link.nodeName || link.targetEmail || "SECURE ASSET";
                      return (
                        <div key={link.id} className="bg-white rounded-[2rem] p-6 space-y-4 border border-black/5 shadow-sm">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex gap-4 items-center min-w-0 flex-1">
                              <Avatar className="h-10 w-10 border border-black/5 shrink-0">
                                <AvatarFallback className="bg-primary/5 text-[10px] font-black text-primary">{assetName[0].toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{assetName}</p>
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
                                    "w-full h-12 text-[9px] font-black uppercase tracking-[0.2em] transition-all rounded-xl",
                                    linkedNode?.trackRequest ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white border border-black/5 text-foreground"
                                  )}
                                >
                                  {linkedNode?.trackRequest ? <Zap className="h-3.5 w-3.5 mr-2 animate-pulse" /> : <ZapOff className="h-3.5 w-3.5 mr-2" />}
                                  {linkedNode?.trackRequest ? "TRACKING ACTIVE" : "TRACK"}
                                </Button>
                              ) : link.trackingRequest === 'requested' ? (
                                <Button disabled className="w-full h-12 bg-black/5 text-primary/40 text-[9px] font-black uppercase rounded-xl">
                                  <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> PENDING AUTHORIZATION
                                </Button>
                              ) : (
                                <Button onClick={() => handleRequestTracking(link.id)} className="w-full h-12 bg-white border border-black/5 text-foreground hover:text-primary text-[9px] font-black uppercase rounded-xl">
                                  <Radar className="h-3.5 w-3.5 mr-2" /> REQUEST TELEMETRY
                                </Button>
                              )}
                            </div>
                          )}
                          <Button onClick={() => handleRejectLink(link.id)} variant="ghost" className="w-full h-8 text-[8px] font-black uppercase text-muted-foreground hover:text-destructive bg-[#F8FAFC] rounded-lg"><Trash2 className="h-3 w-3 mr-2" /> DISCONNECT</Button>
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
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-xl md:text-2xl font-black tracking-tight uppercase text-foreground">NOTIFICATION</h2>
                {notifications.length > 0 && (
                  <Button 
                    onClick={() => setDeleteConfirm({ id: 'all', type: 'clear-notifications', name: 'All Alerts' })}
                    className="h-10 px-4 text-[9px] font-black uppercase tracking-widest bg-white text-destructive border border-black/5 shadow-sm rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" /> CLEAR ALL
                  </Button>
                )}
              </div>
              <div className="bg-white rounded-[2rem] p-4 sm:p-8 border border-black/5 shadow-sm">
                <ScrollArea className="h-[600px] pr-4">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] opacity-10">
                      <Bell className="h-12 w-12 mb-6 text-foreground" />
                      <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Telemetry Clear</p>
                    </div>
                  ) : (
                    notifications.map(n => {
                      const isTrack = n.trigger === 'TrackResponse' || n.type === 'telemetry';
                      const isSOS = n.type === 'sos' && n.trigger !== 'TrackResponse';
                      const accentColor = isSOS ? "bg-destructive" : "bg-primary";
                      const label = isSOS ? "SOS ALERT" : "TRACK ASSET";
                      const badgeText = isSOS ? "URGENT" : (isTrack ? "ACTIVE" : "INFO");

                      return (
                        <Collapsible key={n.id} className="mb-6 group/item">
                          <div className={cn("bg-white rounded-[2rem] border border-black/5 relative overflow-hidden transition-all duration-300 hover:shadow-lg flex gap-0")}>
                            <div className={cn("w-3 shrink-0", accentColor)} />
                            
                            <div className="flex-1 p-4 sm:p-6 flex flex-col min-w-0">
                              <CollapsibleTrigger asChild>
                                <button className="flex gap-4 items-center w-full text-left outline-none group">
                                  <div className={cn("h-10 w-10 flex items-center justify-center bg-[#F8FAFC] rounded-full shrink-0 border border-black/5 shadow-sm", isSOS ? "text-destructive" : "text-primary")}>
                                    {isSOS ? <AlertTriangle className="h-5 w-5" /> : <Radar className="h-5 w-5" />}
                                  </div>
                                  <div className="min-w-0 flex-1 pr-8">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className={cn("text-[10px] font-black uppercase tracking-widest leading-relaxed", isSOS ? "text-destructive" : "text-primary")}>{label}</p>
                                      <Badge className={cn("text-[7px] font-black px-2 py-0.5 rounded-sm uppercase border-none", isSOS ? "bg-destructive text-white animate-pulse" : "bg-primary text-white")}>
                                        {badgeText}
                                      </Badge>
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-foreground break-words mt-1 line-clamp-1">{n.message || 'Incoming Telemetry Fix'}</p>
                                    <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                                  </div>
                                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform group-data-[state=open]/item:rotate-180 absolute right-6 top-1/2 -translate-y-1/2" />
                                </button>
                              </CollapsibleTrigger>
                              
                              <CollapsibleContent className="w-full space-y-4 pt-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                {n.place && (
                                  <div className="flex items-start gap-2.5 p-4 bg-[#F8FAFC] rounded-2xl border border-black/5">
                                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                                    <p className="text-[9px] font-black text-foreground uppercase tracking-widest break-words flex-1 leading-relaxed">
                                      {n.place}
                                    </p>
                                  </div>
                                )}
                                
                                <div className="flex flex-col sm:flex-row gap-3 w-full">
                                  {n.latitude !== undefined && n.longitude !== undefined && (
                                    <Button size="sm" className={cn("w-full h-12 text-[9px] font-black uppercase tracking-widest text-white rounded-xl", isSOS ? "bg-destructive hover:bg-destructive/90" : "bg-primary hover:bg-primary/90")} onClick={() => setInterceptAlert({ ...n, id: n.id })}>
                                      <Eye className="h-4 w-4 mr-2" /> TACTICAL MAP
                                    </Button>
                                  )}
                                  <Button size="sm" variant="outline" className="w-full h-12 text-[9px] font-black uppercase tracking-widest bg-white border border-black/5 text-foreground hover:bg-black/5 rounded-xl" onClick={() => window.open(`https://www.google.com/maps?q=${n.latitude},${n.longitude}`, '_blank')}>
                                    <LocateFixed className="h-4 w-4 mr-2 text-primary" /> GOOGLE MAPS
                                  </Button>
                                </div>
                              </CollapsibleContent>
                            </div>
                          </div>
                        </Collapsible>
                      );
                    })
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
                      className="h-12 bg-white text-foreground border border-black/5 pl-12 font-black uppercase text-[10px] tracking-widest rounded-xl shadow-sm"
                      value={radarSearchTerm}
                      onChange={(e) => setRadarSearchTerm(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {!radarSearchTerm || radarSearchTerm.trim().length < 3 ? (
                  <div className="col-span-full bg-white rounded-[2rem] p-12 text-center opacity-30 flex flex-col items-center border border-black/5">
                    <Radar className="h-12 w-12 mb-6 text-foreground" />
                    <p className="text-[9px] font-black uppercase tracking-[0.4em] text-foreground">Enter Precise Hardware ID to Scan</p>
                  </div>
                ) : radarSearchResults.length === 0 ? (
                  <div className="col-span-full bg-white rounded-[2rem] p-12 text-center opacity-30 flex flex-col items-center border border-black/5">
                    <ShieldX className="h-12 w-12 mb-6 text-destructive/60" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-foreground">No Asset Signature Detected</p>
                  </div>
                ) : (
                  radarSearchResults.map(node => {
                    const existingLink = links.find(l => l.hardwareId === node.hardwareId);
                    return (
                      <div key={node.id} className="bg-white rounded-[2rem] p-6 space-y-4 group border border-black/5 shadow-sm">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex gap-4 items-center min-w-0">
                            <div className="h-10 w-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary/40 shrink-0"><Cpu className="h-5 w-5" /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[10px] font-black uppercase tracking-widest text-foreground truncate">{node.nodeName}</p>
                              <p className="text-[8px] font-black text-muted-foreground uppercase tracking-widest truncate">{node.ownerEmail}</p>
                            </div>
                          </div>
                        </div>
                        {existingLink ? (
                          <div className="w-full py-3 bg-[#F8FAFC] text-center border border-black/5 rounded-xl">
                            <p className={cn("text-[8px] font-black uppercase flex items-center justify-center gap-2", existingLink.status === 'linked' ? "text-green-600" : "text-primary animate-pulse")}>
                              {existingLink.status === 'linked' ? <ShieldCheck className="h-3 w-3" /> : <Loader2 className="h-3 w-3 animate-spin" />}
                              {existingLink.status === 'linked' ? "ACTIVE LINK" : "PENDING AUTHORIZATION"}
                            </p>
                          </div>
                        ) : (
                          <Button onClick={() => handleRequestLink(node.ownerUid!, node.hardwareId)} className="w-full h-10 bg-white border border-black/5 text-foreground hover:text-primary text-[9px] font-black uppercase tracking-widest rounded-xl shadow-sm">
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
               <div className="bg-white rounded-[2rem] p-12 flex flex-col items-center gap-8 border border-black/5 shadow-sm">
                  <div className="h-32 w-32 bg-primary/5 rounded-[2rem] flex items-center justify-center text-4xl font-black text-primary border border-primary/10">{currentName[0].toUpperCase()}</div>
                  <div className="text-center space-y-2">
                    <p className="text-xl font-black uppercase tracking-[0.2em] text-black">{currentName}</p>
                    <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">{user?.email}</p>
                  </div>
                  <Button onClick={() => router.push('/profile')} className="h-12 px-8 text-[10px] font-black uppercase tracking-[0.3em] bg-white border border-black/5 text-foreground hover:text-primary transition-all rounded-xl shadow-sm">
                    <Settings className="h-4 w-4 mr-3 text-primary/60" /> CONFIGURE HUB
                  </Button>
               </div>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent className="bg-white rounded-[2rem] p-8 border border-black/5 max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-destructive" /> Confirm Purge
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[10px] font-black uppercase tracking-widest text-foreground pt-4 leading-relaxed">
              Are you sure you want to remove <span className="text-foreground">{deleteConfirm?.name}</span>? This action is permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3">
            <AlertDialogCancel className="h-12 flex-1 text-[10px] font-black uppercase bg-white border border-black/5 text-foreground rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                const type = deleteConfirm?.type;
                const id = deleteConfirm?.id;
                setDeleteConfirm(null);
                setTimeout(() => {
                  if (type === 'buddy') deleteBuddy(id!);
                  if (type === 'node') deleteNode(id!);
                  if (type === 'group') deleteGroup(id!);
                  if (type === 'clear-notifications') clearNotifications();
                }, 100);
              }}
              className="h-12 flex-1 text-[10px] font-black uppercase bg-destructive text-white hover:bg-destructive/90 rounded-xl"
            >
              Confirm Purge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingUpdate} onOpenChange={(open) => !open && setPendingUpdate(null)}>
        <AlertDialogContent className="bg-white rounded-[2rem] p-8 border border-black/5 max-w-md shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary" /> Confirm Sync
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[10px] font-black uppercase tracking-widest text-foreground pt-4 leading-relaxed">
              Are you sure you want to synchronize these changes to the master vault?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-6 gap-3">
            <AlertDialogCancel className="h-12 flex-1 text-[10px] font-black uppercase bg-white border border-black/5 text-foreground rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={executeUpdate}
              className="h-12 flex-1 text-[10px] font-black uppercase bg-primary text-white hover:bg-primary/90 rounded-xl"
            >
              Confirm Change
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isBuddyDialogOpen} onOpenChange={(open) => { setIsBuddyDialogOpen(open); if (!open) setEditingBuddy(null); }}>
        <DialogContent className="bg-white rounded-[2rem] p-8 border border-black/5 max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" />
              {editingBuddy ? "Edit Personnel" : "Enlist Personnel"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveBuddy} className="space-y-6 mt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Personnel Name</Label>
              <Input name="buddyName" defaultValue={editingBuddy?.name} required className="h-12 bg-white border border-black/5 px-5 font-black uppercase text-[10px] rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Contact Signal</Label>
              <Input 
                name="phoneNumber" 
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={editingBuddy?.phoneNumber} 
                required 
                className="h-12 bg-white border border-black/5 px-5 font-black uppercase text-[10px] rounded-xl" 
              />
            </div>
            
            <div className="space-y-3">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Protocol Assignment</Label>
              <ScrollArea className="h-40 bg-[#F8FAFC] p-4 rounded-2xl border border-black/5">
                <div className="flex flex-col gap-5 py-2">
                  {groups.length === 0 ? (
                    <p className="text-[8px] text-center text-muted-foreground uppercase py-8 font-black">No protocols defined</p>
                  ) : (
                    groups.map(group => (
                      <div key={group.id} className="flex items-center space-x-3 py-1 shrink-0">
                        <Checkbox 
                          id={`buddy-group-${group.id}`} 
                          checked={selectedGroups.includes(group.id)} 
                          onCheckedChange={(checked) => toggleGroupSelection(group.id, !!checked)}
                          className="border-primary/40 h-5 w-5 rounded-md shrink-0"
                        />
                        <Label htmlFor={`buddy-group-${group.id}`} className="text-[10px] font-black uppercase text-foreground cursor-pointer select-none truncate">{group.name}</Label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="pt-4 pb-2">
              <Button type="submit" className="w-full h-14 bg-primary text-white hover:bg-primary/90 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl">
                {editingBuddy ? "SYNCHRONIZE" : "INITIALIZE"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isNodeDialogOpen} onOpenChange={(open) => { setIsNodeDialogOpen(open); if (!open) setEditingNode(null); }}>
        <DialogContent className="bg-white rounded-[2rem] p-8 border border-black/5 max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <Cpu className="h-5 w-5 text-primary" />
              {editingNode ? "Edit Node" : "Arm New Node"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveNode} className="space-y-6 mt-4 flex-1 overflow-y-auto pr-2">
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Asset Name</Label>
              <Input name="tacticalNodeName" defaultValue={editingNode?.nodeName} required className="h-12 bg-white border border-black/5 px-5 font-black uppercase text-[10px] rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Hardware ID</Label>
              <Input name="hardwareId" defaultValue={editingNode?.hardwareId} required className="h-12 bg-white border border-black/5 px-5 font-black uppercase text-[10px] rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Node Contact Signal</Label>
              <Input 
                name="nodePhoneNumber" 
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                defaultValue={editingNode?.phoneNumber} 
                className="h-12 bg-white border border-black/5 px-5 font-black uppercase text-[10px] rounded-xl" 
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Calibration Temperature (°C)</Label>
              <Input name="tacticalTemperature" type="number" step="0.1" defaultValue={editingNode?.temperature || 24.5} required className="h-12 bg-white border border-black/5 px-5 font-black uppercase text-[10px] rounded-xl" />
            </div>

            <div className="space-y-3">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Protocol Selection</Label>
              <ScrollArea className="h-40 bg-[#F8FAFC] p-4 rounded-2xl border border-black/5">
                <div className="flex flex-col gap-5 py-2">
                  {groups.length === 0 ? (
                    <p className="text-[8px] text-center text-muted-foreground uppercase py-8 font-black">No protocols defined</p>
                  ) : (
                    groups.map(group => (
                      <div key={group.id} className="flex items-center space-x-3 py-1 shrink-0">
                        <Checkbox 
                          id={`node-group-sel-${group.id}`} 
                          checked={selectedNodeGroups.includes(group.name)} 
                          onCheckedChange={(checked) => toggleNodeGroupSelection(group.name, !!checked)}
                          className="border-primary/40 h-5 w-5 rounded-md shrink-0"
                        />
                        <Label htmlFor={`node-group-sel-${group.id}`} className="text-[10px] font-black uppercase text-foreground cursor-pointer select-none truncate">{group.name}</Label>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            <DialogFooter className="pt-4 pb-2">
              <Button type="submit" className="w-full h-14 bg-primary text-white hover:bg-primary/90 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl">
                {editingNode ? "SYNCHRONIZE" : "ARM ASSET"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isProtocolDialogOpen} onOpenChange={setIsProtocolDialogOpen}>
        <DialogContent className="bg-white rounded-[2rem] p-8 border border-black/5 max-w-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-primary" /> Security Protocols
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-8 mt-4">
            <div className="space-y-3">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Quick Add Defaults</Label>
              <div className="flex flex-wrap gap-2">
                {['FRIEND', 'FAMILY', 'BESTFRIEND'].map(def => (
                  <Button 
                    key={def} 
                    type="button"
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[8px] font-black uppercase px-4 rounded-xl border-black/5 bg-[#F8FAFC] hover:text-primary transition-all"
                    onClick={() => quickAddGroup(def)}
                  >
                    + {def}
                  </Button>
                ))}
              </div>
            </div>

            <form onSubmit={handleAddGroup} className="space-y-3">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Custom Protocol Group</Label>
              <div className="flex gap-2">
                <Input name="groupName" required className="h-12 bg-white border border-black/5 flex-1 px-4 font-black uppercase text-[10px] rounded-xl" />
                <Button type="submit" size="icon" className="h-12 w-12 bg-primary text-white rounded-xl"><PlusSquare className="h-5 w-5" /></Button>
              </div>
            </form>
            <div className="space-y-4">
              <Label className="text-[9px] font-black text-foreground uppercase tracking-widest ml-1">Active Groups</Label>
              <ScrollArea className="h-48 pr-4">
                <div className="flex flex-col gap-3">
                  {groups.length === 0 ? <p className="text-[9px] text-center text-muted-foreground py-8 uppercase font-black">No Groups Defined</p> : groups.map(group => (
                    <div key={group.id} className="flex justify-between items-center bg-[#F8FAFC] p-4 border border-black/5 shadow-sm rounded-2xl">
                      <span className="text-[10px] font-black uppercase text-foreground truncate mr-2">{group.name}</span>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-full shrink-0" onClick={() => setDeleteConfirm({ id: group.id, type: 'group', name: group.name })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!interceptAlert} onOpenChange={(open) => !open && setInterceptAlert(null)}>
        <DialogContent className="max-w-2xl bg-white rounded-[2rem] p-0 border border-black/5 [&>button]:hidden flex flex-col overflow-hidden max-h-[90vh] shadow-2xl">
          {(() => {
            const isTrack = interceptAlert?.trigger === 'TrackResponse' || interceptAlert?.type === 'telemetry';
            const isSOS = interceptAlert?.type === 'sos' && interceptAlert?.trigger !== 'TrackResponse';
            const headerBg = isSOS ? "bg-destructive/5" : "bg-primary/5";
            const accentText = isSOS ? "text-destructive" : "text-primary";
            const label = isSOS ? "SOS ALERT" : "TRACK ASSET";
            
            return (
              <>
                <DialogHeader className={cn("p-8 pb-4 flex-shrink-0 border-b border-black/5", headerBg)}>
                  <div className="flex justify-between items-center w-full">
                    <div className="flex items-center gap-4">
                      <div className={cn("h-12 w-12 flex items-center justify-center bg-white border border-black/5 rounded-full shrink-0", accentText)}>
                        {isSOS ? <AlertTriangle className="h-6 w-6 animate-pulse" /> : <Radar className="h-6 w-6" />}
                      </div>
                      <div>
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground">{label}</DialogTitle>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest mt-1", accentText)}>
                          {isSOS ? "High Intensity Alert Active" : "Tactical Telemetry Active"}
                        </p>
                      </div>
                    </div>
                    {isSOS && <Badge className="bg-destructive text-white border-none text-[8px] font-black px-4 py-1 animate-pulse uppercase shadow-lg shadow-destructive/20">Critical</Badge>}
                    {isTrack && <Badge className="bg-primary text-white border-none text-[8px] font-black px-4 py-1 uppercase shadow-lg shadow-primary/20">Active</Badge>}
                  </div>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto px-8 py-8 space-y-6">
                  <div className="bg-[#F8FAFC] p-6 space-y-4 border border-black/5 rounded-[2rem]">
                    <div className="flex items-center gap-4">
                       <div className={cn("h-10 w-10 flex items-center justify-center bg-white rounded-full shrink-0 border border-black/5 shadow-sm", accentText)}>
                        {isSOS ? <AlertTriangle className="h-5 w-5" /> : <Radar className="h-5 w-5" />}
                       </div>
                       <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed text-foreground break-words">{interceptAlert?.message || 'Awaiting Device Telemetry'}</p>
                    </div>

                    {interceptAlert?.place && (
                      <div className="flex items-center gap-2 mt-2 p-3 bg-white rounded-xl border border-black/5 shadow-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <p className="text-[10px] font-black text-foreground uppercase tracking-widest">{interceptAlert.place}</p>
                      </div>
                    )}

                    <div className="bg-white p-4 space-y-1 border border-black/5 rounded-2xl shadow-sm">
                      <p className="text-[8px] font-black text-muted-foreground uppercase">Signal Time</p>
                      <p className="text-[10px] font-black uppercase text-foreground">{interceptAlert && new Date(interceptAlert.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                  {interceptAlert?.latitude !== undefined && interceptAlert?.longitude !== undefined && (
                    <div className="overflow-hidden border border-black/5 shadow-lg rounded-[2rem]">
                      <SOSMap 
                        latitude={interceptAlert.latitude} 
                        longitude={interceptAlert.longitude} 
                        variant={isTrack ? 'track' : 'sos'}
                        mapLabel={label} 
                      />
                    </div>
                  )}
                </div>
                <div className="p-8 pt-4 border-t border-black/5 flex-shrink-0 bg-[#F8FAFC]">
                  <Button onClick={() => setInterceptAlert(null)} className="w-full h-16 bg-white border border-black/5 text-foreground hover:bg-destructive hover:text-white text-[11px] font-black uppercase tracking-[0.4em] rounded-[1.5rem] shadow-sm transition-all">CLOSE</Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingBuddy} onOpenChange={(open) => !open && setViewingBuddy(null)}>
        <DialogContent className="bg-white rounded-[2rem] p-8 border border-black/5 max-md shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <Users className="h-5 w-5 text-primary" /> Personnel Signature
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 mt-4">
            <div className="bg-[#F8FAFC] p-6 flex flex-col items-center gap-4 text-center rounded-[2rem] border border-black/5 shadow-inner">
              <Avatar className="h-20 w-20 border border-black/5 shadow-sm">
                <AvatarFallback className="bg-primary/5 text-2xl font-black text-primary">{viewingBuddy?.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xl font-black uppercase tracking-widest text-foreground">{viewingBuddy?.name}</p>
                <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mt-1">{viewingBuddy?.phoneNumber}</p>
              </div>
            </div>
            
            {viewingBuddy?.groups && viewingBuddy.groups.length > 0 && (
              <div className="space-y-3">
                <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest ml-1">Assigned Protocols</p>
                <div className="flex flex-wrap gap-2">
                  {viewingBuddy.groups.map(gid => {
                    const groupName = groups.find(g => g.id === gid)?.name || "Protocol Signal";
                    return (
                      <Badge key={gid} className="bg-primary/5 text-primary text-[8px] font-black border-none px-3 py-1 rounded-sm uppercase">
                        {groupName}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-8">
            <Button onClick={() => setViewingBuddy(null)} className="w-full h-14 bg-white border border-black/5 text-foreground hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-sm">CLOSE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingNode} onOpenChange={(open) => !open && setViewingNode(null)}>
        <DialogContent className="bg-white rounded-[2rem] p-8 border border-black/5 max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight text-foreground flex items-center gap-3">
              <Cpu className="h-5 w-5 text-primary" /> Asset Signature
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 space-y-6 mt-4">
            <div className="bg-[#F8FAFC] p-6 flex flex-col items-center gap-4 text-center rounded-[2rem] border border-black/5 shadow-inner">
              <div className={cn("h-16 w-16 bg-primary/5 rounded-2xl flex items-center justify-center border border-black/5 text-primary")}>
                <Cpu className="h-8 w-8" />
              </div>
              <div>
                <p className="text-xl font-black uppercase tracking-widest text-foreground">{viewingNode?.nodeName}</p>
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">ID: {viewingNode?.hardwareId}</p>
                {viewingNode?.phoneNumber && (
                  <p className="text-[9px] font-black text-primary uppercase tracking-[0.2em] mt-1 flex items-center justify-center gap-2">
                    <Phone className="h-3 w-3" /> {viewingNode.phoneNumber}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-[#F8FAFC] p-4 text-center space-y-1 rounded-2xl border border-black/5">
                <p className="text-[8px] font-black text-foreground/40 uppercase tracking-tighter">Asset Name</p>
                <p className="text-sm font-black text-foreground">{viewingNode?.nodeName || '--'}</p>
              </div>
              <div className="bg-[#F8FAFC] p-4 text-center space-y-1 rounded-2xl border border-black/5">
                <p className="text-[8px] font-black text-foreground/40 uppercase tracking-tighter">Owner Sector</p>
                <p className="text-sm font-black text-foreground truncate">{viewingNode?.ownerEmail ? viewingNode.ownerEmail.split('@')[0] : 'Private'}</p>
              </div>
            </div>

            {viewingNode?.latitude !== undefined && viewingNode?.longitude !== undefined && (
              <div className="space-y-3">
                 <p className="text-[9px] font-black text-foreground/40 uppercase tracking-widest ml-1">Asset Location</p>
                 <div className="overflow-hidden border border-black/5 shadow-lg rounded-[2rem]">
                   <SOSMap latitude={viewingNode.latitude} longitude={viewingNode.longitude} variant="track" mapLabel="LAST KNOWN" />
                 </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-8 pt-4 border-t border-black/5">
            <Button onClick={() => setViewingNode(null)} className="w-full h-14 bg-white border border-black/5 text-foreground hover:text-primary text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-sm">CLOSE</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
