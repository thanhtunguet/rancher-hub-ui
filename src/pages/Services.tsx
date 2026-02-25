import { useState, useEffect, useCallback } from 'react';
import { ServicesRepository } from '@/repositories/services.repository';
import type { Service, AppInstance, CompareResult, ImageTag, SyncServicesDto } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Layers, Search, Tag, Loader2, RefreshCw, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { IconButton } from '@/components/IconButton';
import { InstanceSelector } from '@/components/InstanceSelector';
import { CompareDetailDialog } from '@/components/CompareDetailDialog';

export default function ServicesPage() {
  const { toast } = useToast();
  const [source, setSource] = useState<AppInstance | null>(null);
  const [target, setTarget] = useState<AppInstance | null>(null);

  // Single-instance mode
  const [services, setServices] = useState<Service[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Compare mode
  const [compareResult, setCompareResult] = useState<CompareResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Tag update dialog
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [tags, setTags] = useState<ImageTag[]>([]);
  const [selectedTag, setSelectedTag] = useState('');
  const [tagsLoading, setTagsLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Detail dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailName, setDetailName] = useState('');
  const [detailStatus, setDetailStatus] = useState('');
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const openDetail = async (name: string, status: string) => {
    if (!source || !target) return;
    setDetailName(name); setDetailStatus(status); setDetailOpen(true); setDetailLoading(true); setDetailData(null);
    try {
      const data = await ServicesRepository.compareByInstance(source.id, target.id);
      const match = data.comparisons.find(c => c.serviceName === name);
      setDetailData(match ? { source: match.source, target: match.target, differences: match.differences } : null);
    } catch { setDetailData(null); }
    finally { setDetailLoading(false); }
  };

  const isCompareMode = !!source && !!target;

  const handleSelectionChange = useCallback((s: AppInstance | null, t: AppInstance | null) => {
    setSource(s);
    setTarget(t);
    setServices([]);
    setCompareResult(null);
    setSelectedIds([]);
  }, []);

  // Fetch single-instance services
  const fetchServices = useCallback(async () => {
    if (!source || target) return;
    setLoading(true);
    try {
      setServices(await ServicesRepository.getByAppInstance(source.id, undefined, search || undefined));
    } catch { toast({ title: 'Error loading services', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [source, target, search]);

  useEffect(() => { if (source && !target) fetchServices(); }, [source, target]);

  // Fetch comparison
  const fetchComparison = useCallback(async () => {
    if (!source || !target) return;
    setLoading(true);
    try {
      setCompareResult(await ServicesRepository.compareByInstance(source.id, target.id));
    } catch { toast({ title: 'Compare failed', variant: 'destructive' }); }
    finally { setLoading(false); }
  }, [source, target]);

  useEffect(() => { if (source && target) fetchComparison(); }, [source, target]);

  const handleSync = async () => {
    if (!source || !target || selectedIds.length === 0) return;
    setSyncing(true);
    try {
      const dto: SyncServicesDto = {
        sourceEnvironmentId: source.environmentId,
        targetEnvironmentId: target.environmentId,
        serviceIds: selectedIds,
        targetAppInstanceIds: [target.id],
      };
      await ServicesRepository.syncServices(dto);
      toast({ title: 'Sync complete', description: `${selectedIds.length} services synced` });
      setSyncDialogOpen(false);
      setSelectedIds([]);
      fetchComparison();
    } catch { toast({ title: 'Sync failed', variant: 'destructive' }); }
    finally { setSyncing(false); }
  };

  const toggleSelection = (name: string) => {
    setSelectedIds(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const openTagDialog = async (service: Service) => {
    setSelectedService(service);
    setTagDialogOpen(true);
    setTagsLoading(true);
    try { setTags(await ServicesRepository.getImageTags(service.id)); }
    catch { toast({ title: 'Failed to load tags', variant: 'destructive' }); }
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

  const statusIcon = (s: string) => {
    if (s === 'identical') return <CheckCircle className="h-4 w-4 text-success" />;
    if (s === 'different') return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Services</h1>
        <p className="text-sm text-muted-foreground">View deployments or compare between instances</p>
      </div>

      <InstanceSelector onSelectionChange={handleSelectionChange} />

      {/* Search bar for single mode */}
      {source && !target && (
        <div className="flex gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchServices()} placeholder="Search services..." className="pl-10" />
          </div>
          <IconButton tooltip="Refresh" variant="outline" onClick={fetchServices}><RefreshCw className="h-4 w-4" /></IconButton>
        </div>
      )}

      {/* Empty state */}
      {!source && (
        <div className="surface-elevated rounded-lg p-12 text-center">
          <Layers className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Select an app instance to view services</p>
        </div>
      )}

      {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>}

      {/* Single instance table */}
      {!loading && source && !target && services.length > 0 && (
        <div className="surface-elevated rounded-lg overflow-hidden">
          <table className="w-full">
            <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Image</th>
              <th className="text-left p-3 font-medium">Tag</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr></thead>
            <tbody>
              {services.map(svc => (
                <tr key={svc.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                  <td className="p-3 text-sm font-medium">{svc.name}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono">{svc.workloadType || '—'}</td>
                  <td className="p-3 text-xs text-muted-foreground font-mono truncate max-w-[200px]">{svc.imageRepo || '—'}</td>
                  <td className="p-3"><span className="text-xs font-mono bg-primary/10 text-primary px-2 py-0.5 rounded">{svc.imageTag || '—'}</span></td>
                  <td className="p-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => openTagDialog(svc)} className="gap-1 text-xs"><Tag className="h-3 w-3" /> Change Tag</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && source && !target && services.length === 0 && (
        <div className="surface-elevated rounded-lg p-12 text-center"><p className="text-muted-foreground">No services found</p></div>
      )}

      {/* Compare mode */}
      {!loading && isCompareMode && compareResult && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: compareResult.summary.totalServices ?? 0 },
              { label: 'Identical', value: compareResult.summary.identical, color: 'text-success' },
              { label: 'Different', value: compareResult.summary.different, color: 'text-warning' },
              { label: 'Missing Source', value: compareResult.summary.missingInSource, color: 'text-destructive' },
              { label: 'Missing Target', value: compareResult.summary.missingInTarget, color: 'text-info' },
            ].map(s => (
              <div key={s.label} className="surface-elevated rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold font-mono ${s.color || ''}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm">{selectedIds.length} service(s) selected</span>
              <Button onClick={() => setSyncDialogOpen(true)} className="gap-2"><RefreshCw className="h-4 w-4" /> Sync Selected</Button>
            </div>
          )}

          <div className="surface-elevated rounded-lg overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="p-3 w-10"></th>
                <th className="text-left p-3 font-medium">Service</th>
                <th className="text-left p-3 font-medium">Type</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Differences</th>
              </tr></thead>
              <tbody>
                {compareResult.comparisons.map(c => (
                  <tr key={c.serviceName} className="border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => openDetail(c.serviceName, c.status)}>
                    <td className="p-3" onClick={e => e.stopPropagation()}>
                      {c.status !== 'identical' && <Checkbox checked={selectedIds.includes(c.serviceName)} onCheckedChange={() => toggleSelection(c.serviceName)} />}
                    </td>
                    <td className="p-3 text-sm font-medium font-mono">{c.serviceName}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c.workloadType || '—'}</td>
                    <td className="p-3"><div className="flex items-center gap-2">{statusIcon(c.status)}<span className="text-xs capitalize">{c.status}</span></div></td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">
                      {c.status === 'different' && c.differences ? (
                        <div className="max-w-xs truncate">{Object.entries(c.differences).map(([k, v]) => <div key={k}>{k}: {JSON.stringify(v)}</div>)}</div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tag dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Image Tag — {selectedService?.name}</DialogTitle></DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">Current: <span className="font-mono text-primary">{selectedService?.imageTag}</span></p>
            {tagsLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : (
              <div className="max-h-[300px] overflow-y-auto space-y-1">
                {tags.map(tag => (
                  <button key={tag.name} onClick={() => setSelectedTag(tag.name)} className={`w-full text-left p-3 rounded-md border transition-colors text-sm ${selectedTag === tag.name ? 'border-primary bg-primary/10' : 'border-border hover:bg-muted/50'}`}>
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
            <Button onClick={handleUpdateTag} disabled={!selectedTag || updating}>{updating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Deploy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Compare detail */}
      <CompareDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        title={detailName}
        status={detailStatus}
        sourceLabel={source?.name || 'Source'}
        targetLabel={target?.name || 'Target'}
        loading={detailLoading}
        detail={detailData}
      />

      {/* Sync confirmation */}
      <AlertDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sync</AlertDialogTitle>
            <AlertDialogDescription>Sync {selectedIds.length} service(s) from source to target? This will update image tags on the target.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync} disabled={syncing}>{syncing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sync Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
