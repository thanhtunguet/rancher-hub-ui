import { useState, useEffect } from 'react';
import { ServicesRepository } from '@/repositories/services.repository';
import { AppInstancesRepository } from '@/repositories/app-instances.repository';
import { EnvironmentsRepository } from '@/repositories/environments.repository';
import type { Service, AppInstance, Environment, ImageTag } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Layers, Search, Tag, Loader2, RefreshCw } from 'lucide-react';
import { IconButton } from '@/components/IconButton';

export default function ServicesPage() {
  const { toast } = useToast();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selectedEnv, setSelectedEnv] = useState('');
  const [selectedInstance, setSelectedInstance] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Image tag update
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [tags, setTags] = useState<ImageTag[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [tagsLoading, setTagsLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    Promise.all([EnvironmentsRepository.findAll(), AppInstancesRepository.findAll()])
      .then(([envs, insts]) => { setEnvironments(envs); setInstances(insts); })
      .catch(() => {})
      .finally(() => setInitialLoading(false));
  }, []);

  const filteredInstances = selectedEnv ? instances.filter(i => i.environmentId === selectedEnv) : instances;

  const fetchServices = async () => {
    if (!selectedInstance) return;
    setLoading(true);
    try {
      const data = await ServicesRepository.getByAppInstance(selectedInstance, undefined, search || undefined);
      setServices(data);
    } catch { toast({ title: 'Error loading services', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (selectedInstance) fetchServices(); }, [selectedInstance]);

  const openTagDialog = async (service: Service) => {
    setSelectedService(service);
    setTagDialogOpen(true);
    setTagsLoading(true);
    try {
      const t = await ServicesRepository.getImageTags(service.id);
      setTags(t);
    } catch { toast({ title: 'Failed to load tags', variant: 'destructive' }); }
    finally { setTagsLoading(false); }
  };

  const handleUpdateTag = async () => {
    if (!selectedService || !selectedTag) return;
    setUpdating(true);
    try {
      await ServicesRepository.updateServiceImage(selectedService.id, selectedTag);
      toast({ title: 'Image updated', description: `${selectedService.name} → ${selectedTag}` });
      setTagDialogOpen(false);
      fetchServices();
    } catch { toast({ title: 'Update failed', variant: 'destructive' }); }
    finally { setUpdating(false); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-sm text-muted-foreground">View and manage deployments across app instances</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={selectedEnv} onValueChange={(v) => { setSelectedEnv(v); setSelectedInstance(''); setServices([]); }}>
          <SelectTrigger className="w-48"><SelectValue placeholder="All environments" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All environments</SelectItem>
            {environments.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={selectedInstance} onValueChange={setSelectedInstance}>
          <SelectTrigger className="w-64"><SelectValue placeholder="Select app instance" /></SelectTrigger>
          <SelectContent>
            {filteredInstances.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.namespace})</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchServices()} placeholder="Search services..." className="pl-10" />
        </div>
        <IconButton tooltip="Refresh" variant="outline" onClick={fetchServices} disabled={!selectedInstance}><RefreshCw className="h-4 w-4" /></IconButton>
      </div>

      {/* Services list */}
      {!selectedInstance ? (
        <div className="surface-elevated rounded-lg p-12 text-center">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select an app instance to view services</p>
        </div>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : services.length === 0 ? (
        <div className="surface-elevated rounded-lg p-12 text-center"><p className="text-muted-foreground">No services found</p></div>
      ) : (
        <div className="surface-elevated rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left p-3 font-medium">Name</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Image</th>
                <th className="text-left p-3 font-medium">Tag</th>
                <th className="text-right p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {services.map((svc) => (
                <tr key={svc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm font-medium">{svc.name}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{svc.workloadType || '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono truncate max-w-[200px]">{svc.imageRepo || '—'}</td>
                  <td className="p-3"><span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{svc.imageTag || '—'}</span></td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openTagDialog(svc)} className="gap-1 text-xs">
                      <Tag className="h-3 w-3" /> Change Tag
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tag selection dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Image Tag — {selectedService?.name}</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              Current: <span className="font-mono text-primary">{selectedService?.imageTag}</span>
            </p>
            {tagsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {tags.map((tag) => (
                  <button
                    key={tag.name}
                    onClick={() => setSelectedTag(tag.name)}
                    className={`w-full text-left p-3 rounded-md border transition-colors text-sm ${
                      selectedTag === tag.name ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono">{tag.name}</span>
                      {tag.sizeFormatted && <span className="text-xs text-muted-foreground">{tag.sizeFormatted}</span>}
                    </div>
                    {tag.pushedAt && <p className="text-xs text-muted-foreground mt-1">{new Date(tag.pushedAt).toLocaleDateString()}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateTag} disabled={!selectedTag || updating}>
              {updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
