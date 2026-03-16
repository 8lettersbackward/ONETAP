"use client";

import { useUser, useDatabase, useRtdb, useFirebase } from "@/firebase";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Smartphone,
  Loader2,
  Trash2,
  LogOut,
  UserPlus,
  Layers,
  Zap,
  PlusCircle,
  Pencil,
  PlusSquare,
  Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ref, set, push, remove, update } from "firebase/database";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

type TabType = 'buddies' | 'nodes' | 'notifications' | 'settings';

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

  const [buddyForm, setBuddyForm] = useState({
    name: '',
    phoneNumber: '',
    groups: [] as string[]
  });

  const [nodeForm, setNodeForm] = useState({
    nodeName: '',
    hardwareId: '',
    targetGroups: [] as string[]
  });

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
  }, [user, userLoading, router]);

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
      .map(([id, val]: [string, any]) => ({ ...val, id }))
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }, [notificationsData]);

  const handleRegisterBuddy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !rtdb) return;
    setRegisterLoading(true);
    const buddyId = `BUDDY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    const payload = { ...buddyForm, id: buddyId, registeredAt: Date.now() };
    set(ref(rtdb, `users/${user.uid}/buddies/${buddyId}`), payload)
      .then(() => {
        setIsAddBuddyDialogOpen(false);
        setBuddyForm({ name: '', phoneNumber: '', groups: [] });
        toast({ title: "Asset Deployed" });
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
        toast({ title: "Asset Synchronized" });
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
        toast({ title: "Hardware Node Linked" });
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
        toast({ title: "System Config Updated" });
      })
      .finally(() => setRegisterLoading(false));
  };

  const triggerNodeAlert = (node: any) => {
    if (!user || !rtdb) return;
    const isCurrentlyActive = sosStatus?.sosTrigger === true && sosStatus?.triggeredByNode === node.id;
    
    if (isCurrentlyActive) {
      update(ref(rtdb, "sosSystem"), { 
        sosTrigger: false, 
        timestamp: Date.now(),
        triggeredByNode: null 
      });
      return;
    }

    const broadcastSOS = async (lat?: number, lng?: number) => {
      update(ref(rtdb, "sosSystem"), {
        sosTrigger: true,
        sender: user.email || "Unknown",
        nodename: node.nodeName,
        timestamp: Date.now(),
        triggeredByNode: node.id,
        latitude: lat || null,
        longitude: lng || null,
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
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const navItems = [
    { id: 'buddies', label: 'Human Assets', icon: Smartphone },
    { id: 'nodes', label: 'Hardware Hub', icon: Cpu },
    { id: 'notifications', label: 'History', icon: Bell },
    { id: 'settings', label: 'Terminal', icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      <aside className="w-full md:w-64 bg-white/40 border-r border-white/20 p-6 md:h-screen sticky top-0">
        <div className="space-y-12">
          <div className="flex items-center gap-4">
            <Avatar className="h-10 w-10 border-2 border-primary">
              <AvatarFallback className="bg-primary/10 text-primary font-bold">
                {currentName[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="overflow-hidden">
              <p className="text-sm font-bold truncate">{currentName}</p>
              <p className="text-[10px] text-muted-foreground truncate uppercase tracking-widest">{user.email}</p>
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
                    ? "bg-primary text-white shadow-lg" 
                    : "hover:bg-white/20 text-muted-foreground"
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
          {activeTab === 'buddies' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold tracking-tighter">Human Assets</h1>
                <div className="flex gap-4">
                  <Button onClick={() => setIsAddBuddyDialogOpen(true)} className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8">
                    <UserPlus className="h-4 w-4 mr-2" /> Enlist
                  </Button>
                  <Button onClick={() => setIsManageGroupsDialogOpen(true)} variant="outline" className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8 bg-white/20 border-white/40">
                    <Layers className="h-4 w-4 mr-2" /> Protocols
                  </Button>
                </div>
              </div>

              {buddies.length === 0 ? (
                <Card className="glass-card p-24 text-center border-dashed border-primary/20 bg-white/20">
                  <Smartphone className="h-12 w-12 text-primary/20 mx-auto mb-6" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Standby Mode: No Registered Assets</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {buddies.map(buddy => (
                    <Card key={buddy.id} className="glass-card border-none group hover:bg-white/90 transition-all bg-white/60">
                      <CardHeader className="p-8">
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <p className="text-xl font-bold">{buddy.name}</p>
                            <p className="text-[10px] font-mono text-primary uppercase tracking-widest mt-1">{buddy.phoneNumber}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {buddy.groups?.map((g: string) => (
                            <Badge key={g} variant="outline" className="text-[9px] border-primary/20 text-primary uppercase font-bold px-3">{g}</Badge>
                          ))}
                        </div>
                      </CardHeader>
                      <CardContent className="p-8 pt-0">
                        <div className="flex gap-4 pt-6 border-t border-black/5 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-black/5 hover:bg-primary hover:text-white" onClick={() => { setItemToEdit(buddy); setIsEditBuddyDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => { setItemToDelete({ ...buddy, type: 'buddy' }); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'nodes' && (
            <div className="space-y-10">
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-bold tracking-tighter">Hardware Hub</h1>
                <Button onClick={() => setIsAddNodeDialogOpen(true)} className="rounded-2xl font-bold text-[10px] uppercase tracking-widest h-12 px-8">
                  <PlusSquare className="h-4 w-4 mr-2" /> Arm Node
                </Button>
              </div>

              {nodes.length === 0 ? (
                <Card className="glass-card p-24 text-center border-dashed border-primary/20 bg-white/20">
                  <Cpu className="h-12 w-12 text-primary/20 mx-auto mb-6" />
                  <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Systems Offline: No Active Nodes</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {nodes.map(node => (
                    <Card key={node.id} className="glass-card border-none group hover:bg-white/90 transition-all bg-white/60">
                      <CardHeader className="p-8">
                        <div className="flex justify-between items-center mb-4">
                          <p className="text-xl font-bold">{node.nodeName}</p>
                          <div className={cn("h-3 w-3 rounded-full", node.status === 'online' ? 'bg-secondary shadow-[0_0_15px_rgba(72,149,239,0.4)]' : 'bg-muted')} />
                        </div>
                        <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em]">ID: {node.hardwareId}</p>
                      </CardHeader>
                      <CardContent className="p-8 pt-0 space-y-6">
                        <div className="flex flex-wrap gap-2">
                          {node.targetGroups?.map((g: string) => (
                            <Badge key={g} className="bg-primary/10 border-none text-primary text-[9px] uppercase font-bold px-3">{g}</Badge>
                          ))}
                        </div>
                        <Button 
                          className={cn("w-full h-14 rounded-2xl text-[10px] font-bold tracking-[0.2em] uppercase transition-all", sosStatus?.sosTrigger && sosStatus?.triggeredByNode === node.id ? "bg-destructive hover:bg-destructive/90 shadow-lg" : "bg-primary hover:bg-secondary shadow-lg")}
                          onClick={() => triggerNodeAlert(node)}
                        >
                          <Zap className="h-4 w-4 mr-3" /> 
                          {sosStatus?.sosTrigger && sosStatus?.triggeredByNode === node.id ? "Reset Protocol" : "Initiate SOS"}
                        </Button>
                        <div className="flex gap-4 pt-6 border-t border-black/5 opacity-0 group-hover:opacity-100 transition-all">
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-black/5" onClick={() => { setItemToView(node); setIsViewItemDialogOpen(true); }}><Eye className="h-3.5 w-3.5 mr-2" /> View</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-[9px] font-bold uppercase tracking-widest flex-1 bg-black/5" onClick={() => { setItemToEdit(node); setIsEditNodeDialogOpen(true); }}><Pencil className="h-3.5 w-3.5 mr-2" /> Edit</Button>
                          <Button variant="ghost" size="sm" className="h-10 rounded-xl text-destructive hover:bg-destructive/10" onClick={() => { setItemToDelete({ ...node, type: 'node' }); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4" /></Button>
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
              <h1 className="text-4xl font-bold tracking-tighter">System History</h1>
              <Card className="glass-card border-none bg-white/60">
                <ScrollArea className="h-[600px] p-8">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[400px] opacity-10">
                      <Bell className="h-16 w-16 mb-6" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.4em]">Vault Clear</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className="mb-8 pb-8 border-b border-black/5 last:border-0 last:mb-0">
                        <div className="flex justify-between items-start mb-3">
                          <p className="text-md font-bold text-foreground tracking-wide">{n.message}</p>
                          <Badge variant="outline" className="text-[9px] border-primary/20 text-primary font-bold px-3">{new Date(n.createdAt).toLocaleTimeString()}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{new Date(n.createdAt).toLocaleDateString()}</p>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </Card>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-md space-y-10">
              <h1 className="text-4xl font-bold tracking-tighter">Terminal Hub</h1>
              <Card className="glass-card border-none p-10 space-y-8 bg-white/60">
                <div className="p-6 bg-black/5 rounded-2xl border border-black/5">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest mb-2">Auth Identification</p>
                  <p className="text-[10px] font-mono opacity-40 truncate">{user.uid}</p>
                </div>
                <Button variant="destructive" onClick={() => signOut(auth).then(() => router.push("/login"))} className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-[0.3em] shadow-lg">
                  <LogOut className="h-4 w-4 mr-3" /> Terminate Session
                </Button>
              </Card>
            </div>
          )}
        </div>
      </main>

      <Dialog open={isAddBuddyDialogOpen} onOpenChange={setIsAddBuddyDialogOpen}>
        <DialogContent className="glass-card border-none rounded-[2rem] max-w-md p-10 bg-white">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary mb-6">Enlist Asset</DialogTitle></DialogHeader>
          <form onSubmit={handleRegisterBuddy} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Identity Name</Label>
              <Input value={buddyForm.name} onChange={e => setBuddyForm({...buddyForm, name: e.target.value})} className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Comms Path</Label>
              <Input value={buddyForm.phoneNumber} onChange={e => setBuddyForm({...buddyForm, phoneNumber: e.target.value})} className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Protocol Groups</Label>
              <div className="grid grid-cols-2 gap-4 p-6 bg-black/5 rounded-2xl border border-black/5">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-3">
                    <Checkbox checked={buddyForm.groups.includes(g)} onCheckedChange={() => {
                      const updated = buddyForm.groups.includes(g) ? buddyForm.groups.filter(x => x !== g) : [...buddyForm.groups, g];
                      setBuddyForm({...buddyForm, groups: updated});
                    }} className="rounded-md border-black/20 data-[state=checked]:bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg" disabled={registerLoading}>
              {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Deploy Asset"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditBuddyDialogOpen} onOpenChange={setIsEditBuddyDialogOpen}>
        <DialogContent className="glass-card border-none rounded-[2rem] max-w-md p-10 bg-white">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary mb-6">Modify Asset</DialogTitle></DialogHeader>
          {itemToEdit && (
            <form onSubmit={handleUpdateBuddy} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Identity Name</Label>
                <Input value={itemToEdit.name} onChange={e => setItemToEdit({...itemToEdit, name: e.target.value})} className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Comms Path</Label>
                <Input value={itemToEdit.phoneNumber} onChange={e => setItemToEdit({...itemToEdit, phoneNumber: e.target.value})} className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Protocol Groups</Label>
                <div className="grid grid-cols-2 gap-4 p-6 bg-black/5 rounded-2xl border border-black/5">
                  {buddyGroups.map(g => (
                    <div key={g} className="flex items-center gap-3">
                      <Checkbox checked={itemToEdit.groups?.includes(g)} onCheckedChange={() => {
                        const groups = itemToEdit.groups || [];
                        const updated = groups.includes(g) ? groups.filter((x: string) => x !== g) : [...groups, g];
                        setItemToEdit({...itemToEdit, groups: updated});
                      }} className="rounded-md border-black/20 data-[state=checked]:bg-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{g}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Sync Asset"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isAddNodeDialogOpen} onOpenChange={setIsAddNodeDialogOpen}>
        <DialogContent className="glass-card border-none rounded-[2rem] max-w-md p-10 bg-white">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary mb-6">Arm System</DialogTitle></DialogHeader>
          <form onSubmit={handleRegisterNode} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Node Alias</Label>
              <Input value={nodeForm.nodeName} onChange={e => setNodeForm({...nodeForm, nodeName: e.target.value})} className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-bold" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Hardware ID</Label>
              <Input value={nodeForm.hardwareId} onChange={e => setNodeForm({...nodeForm, hardwareId: e.target.value})} className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-mono" required />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Broadcast Targets</Label>
              <div className="grid grid-cols-2 gap-4 p-6 bg-black/5 rounded-2xl border border-black/5">
                {buddyGroups.map(g => (
                  <div key={g} className="flex items-center gap-3">
                    <Checkbox checked={nodeForm.targetGroups.includes(g)} onCheckedChange={() => {
                      const updated = nodeForm.targetGroups.includes(g) ? nodeForm.targetGroups.filter(x => x !== g) : [...nodeForm.targetGroups, g];
                      setNodeForm({...nodeForm, targetGroups: updated});
                    }} className="rounded-md border-black/20 data-[state=checked]:bg-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{g}</span>
                  </div>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg" disabled={registerLoading}>
              {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Initiate Link"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditNodeDialogOpen} onOpenChange={setIsEditNodeDialogOpen}>
        <DialogContent className="glass-card border-none rounded-[2rem] max-w-md p-10 bg-white">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary mb-6">Sync Node</DialogTitle></DialogHeader>
          {itemToEdit && (
            <form onSubmit={handleUpdateNode} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Node Alias</Label>
                <Input value={itemToEdit.nodeName} onChange={e => setItemToEdit({...itemToEdit, nodeName: e.target.value})} className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-bold" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Hardware ID</Label>
                <Input value={itemToEdit.hardwareId} onChange={e => setItemToEdit({...itemToEdit, hardwareId: e.target.value})} className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-mono" required />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest opacity-40 ml-1">Broadcast Targets</Label>
                <div className="grid grid-cols-2 gap-4 p-6 bg-black/5 rounded-2xl border border-black/5">
                  {buddyGroups.map(g => (
                    <div key={g} className="flex items-center gap-3">
                      <Checkbox checked={itemToEdit.targetGroups?.includes(g)} onCheckedChange={() => {
                        const targets = itemToEdit.targetGroups || [];
                        const updated = targets.includes(g) ? targets.filter((x: string) => x !== g) : [...targets, g];
                        setItemToEdit({...itemToEdit, targetGroups: updated});
                      }} className="rounded-md border-black/20 data-[state=checked]:bg-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest opacity-70">{g}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl font-bold text-[10px] uppercase tracking-widest shadow-lg" disabled={registerLoading}>
                {registerLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Verify Sync"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isViewItemDialogOpen} onOpenChange={setIsViewItemDialogOpen}>
        <DialogContent className="glass-card border-none rounded-[2rem] max-w-md p-10 bg-white">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary mb-6">Asset Overview</DialogTitle></DialogHeader>
          {itemToView && (
            <div className="space-y-8">
              <div className="p-8 bg-black/5 rounded-3xl border border-black/5 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Descriptor</span>
                  <span className="text-sm font-bold">{itemToView.nodeName || itemToView.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Hardware ID</span>
                  <span className="text-[10px] font-mono text-primary">{itemToView.hardwareId || itemToView.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Current Status</span>
                  <Badge className={cn("text-[9px] uppercase font-bold", itemToView.status === 'online' ? "bg-secondary/10 text-secondary" : "bg-muted/10 text-muted-foreground")}>{itemToView.status || 'Active'}</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold opacity-40 tracking-widest">Link Created</span>
                  <span className="text-[10px] opacity-60 font-bold">{new Date(itemToView.registeredAt).toLocaleString()}</span>
                </div>
              </div>
              <div className="p-8 bg-black/5 rounded-3xl border border-black/5">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary mb-6">Authorized Protocols</p>
                <div className="flex flex-wrap gap-2">
                  {(itemToView.targetGroups || itemToView.groups || []).map((g: string) => (
                    <Badge key={g} variant="outline" className="bg-white/40 border-black/10 text-[9px] px-4 py-1.5 opacity-80 uppercase font-bold">{g}</Badge>
                  ))}
                  {(itemToView.targetGroups || itemToView.groups || []).length === 0 && <p className="text-[10px] opacity-20 uppercase font-bold tracking-widest">Zero active protocols</p>}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isManageGroupsDialogOpen} onOpenChange={setIsManageGroupsDialogOpen}>
        <DialogContent className="glass-card border-none rounded-[2rem] max-w-md p-10 bg-white">
          <DialogHeader><DialogTitle className="text-xl font-bold uppercase tracking-widest text-primary mb-6">Safety Protocols</DialogTitle></DialogHeader>
          <div className="space-y-8">
            <div className="flex gap-3">
              <Input value={newGroupName} onChange={e => setNewGroupName(e.target.value)} placeholder="Protocol Name" className="bg-black/5 border-black/10 rounded-2xl h-14 text-sm font-bold uppercase tracking-widest" />
              <Button onClick={() => {
                if (!user || !newGroupName) return;
                push(ref(rtdb, `users/${user.uid}/buddyGroups`), { name: newGroupName });
                setNewGroupName("");
              }} className="h-14 w-14 rounded-2xl p-0 shadow-lg"><PlusCircle className="h-6 w-6" /></Button>
            </div>
            <ScrollArea className="h-64 pr-4">
              <div className="space-y-3">
                {buddyGroups.map(g => (
                  <div key={g} className="p-5 bg-black/5 rounded-2xl flex justify-between items-center group/item hover:bg-black/10 transition-all border border-transparent">
                    <span className="text-[10px] font-bold uppercase tracking-widest">{g}</span>
                    {!DEFAULT_BUDDY_GROUPS.includes(g) && (
                      <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl text-destructive opacity-0 group-hover/item:opacity-100" onClick={() => {
                        const gId = Object.entries(customGroupsData || {}).find(([k, v]: any) => v.name === g)?.[0];
                        if (gId) remove(ref(rtdb, `users/${user.uid}/buddyGroups/${gId}`));
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
        <AlertDialogContent className="glass-card border-none rounded-[2rem] p-10 bg-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold uppercase tracking-widest text-destructive mb-4">Purge Asset?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">This asset will be permanently erased from the terminal hub and protocol networks.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-4">
            <AlertDialogCancel className="rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest flex-1 border-black/10">Abort</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              if (!user || !itemToDelete) return;
              const path = itemToDelete.type === 'buddy' ? `users/${user.uid}/buddies/${itemToDelete.id}` : `users/${user.uid}/nodes/${itemToDelete.id}`;
              remove(ref(rtdb, path)).then(() => {
                setIsDeleteDialogOpen(false);
                setItemToDelete(null);
                toast({ title: "Asset Purged" });
              });
            }} className="rounded-2xl h-12 font-bold text-[10px] uppercase tracking-widest flex-1 bg-destructive hover:bg-destructive/90">Confirm Purge</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}