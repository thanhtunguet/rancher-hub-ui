import { useState, useEffect } from 'react';
import { SitesRepository } from '@/repositories/sites.repository';
import type { Site, CreateSiteDto } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Server, Wifi, WifiOff, Trash2, Edit, Zap, ZapOff, Loader2 } from 'lucide-react';

export default function SitesPage() {
  const { toast } = useToast();
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSite, setEditingSite] = useState<Site | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateSiteDto>({ name: '', url: '', token: '' });
  const [saving, setSaving] = useState(false);

  const fetchSites = async () => {
    try {
      const data = await SitesRepository.findAll();
      setSites(data);
    } catch { toast({ title: 'Error', description: 'Failed to load sites', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSites(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editingSite) {
        await SitesRepository.update(editingSite.id, form);
        toast({ title: 'Site updated' });
      } else {
        await SitesRepository.create(form);
        toast({ title: 'Site created' });
      }
      setDialogOpen(false);
      setEditingSite(null);
      setForm({ name: '', url: '', token: '' });
      fetchSites();
    } catch { toast({ title: 'Error', description: 'Failed to save site', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await SitesRepository.remove(deleteId);
      toast({ title: 'Site deleted' });
      fetchSites();
    } catch { toast({ title: 'Error', description: 'Failed to delete', variant: 'destructive' }); }
    setDeleteId(null);
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const res = await SitesRepository.testConnection(id);
      toast({ title: res.success ? 'Connected!' : 'Failed', description: res.message });
    } catch { toast({ title: 'Error', description: 'Connection test failed', variant: 'destructive' }); }
    setTestingId(null);
  };

  const handleToggleActive = async (site: Site) => {
    try {
      if (site.active) {
        await SitesRepository.deactivate(site.id);
      } else {
        await SitesRepository.activate(site.id);
      }
      fetchSites();
    } catch { toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' }); }
  };

  const openEdit = (site: Site) => {
    setEditingSite(site);
    setForm({ name: site.name, url: site.url, token: '' });
    setDialogOpen(true);
  };

  const openCreate = () => {
    setEditingSite(null);
    setForm({ name: '', url: '', token: '' });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Rancher Sites</h1>
          <p className="text-sm text-muted-foreground">Manage your Rancher server connections</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Site
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : sites.length === 0 ? (
        <div className="surface-elevated rounded-lg p-12 text-center">
          <Server className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No sites configured yet</p>
          <Button onClick={openCreate} variant="outline" className="mt-4 gap-2">
            <Plus className="h-4 w-4" /> Add your first site
          </Button>
        </div>
      ) : (
        <div className="grid gap-3">
          {sites.map((site) => (
            <div key={site.id} className="surface-elevated rounded-lg p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${site.active ? 'bg-success' : 'bg-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{site.name}</p>
                  <p className="text-xs text-muted-foreground font-mono truncate">{site.url}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => handleTest(site.id)} disabled={testingId === site.id}>
                  {testingId === site.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleToggleActive(site)}>
                  {site.active ? <Zap className="h-4 w-4 text-success" /> : <ZapOff className="h-4 w-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => openEdit(site)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setDeleteId(site.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingSite ? 'Edit Site' : 'Add Rancher Site'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Production Rancher" />
            </div>
            <div className="space-y-2">
              <Label>URL</Label>
              <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://rancher.example.com" className="font-mono text-sm" />
            </div>
            <div className="space-y-2">
              <Label>API Token</Label>
              <Input value={form.token} onChange={(e) => setForm({ ...form, token: e.target.value })} type="password" placeholder="token-abc123:xyz789" className="font-mono text-sm" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingSite ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Site</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. Are you sure?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
