import { useState, useEffect } from 'react';
import { ServicesRepository } from '@/repositories/services.repository';
import { EnvironmentsRepository } from '@/repositories/environments.repository';
import { AppInstancesRepository } from '@/repositories/app-instances.repository';
import type { CompareResult, Environment, AppInstance, SyncServicesDto } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { GitCompare, ArrowRight, Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function CompareSyncPage() {
  const { toast } = useToast();
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [compareMode, setCompareMode] = useState<'environment' | 'instance'>('instance');
  const [result, setResult] = useState<CompareResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    Promise.all([EnvironmentsRepository.findAll(), AppInstancesRepository.findAll()])
      .then(([envs, insts]) => { setEnvironments(envs); setInstances(insts); })
      .catch(() => {});
  }, []);

  const handleCompare = async () => {
    if (!sourceId || !targetId) return;
    setLoading(true);
    setResult(null);
    try {
      const res = compareMode === 'instance'
        ? await ServicesRepository.compareByInstance(sourceId, targetId)
        : await ServicesRepository.compareServices(sourceId, targetId);
      setResult(res);
    } catch { toast({ title: 'Compare failed', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const handleSync = async () => {
    if (!result || selectedIds.length === 0) return;
    setSyncing(true);
    try {
      const dto: SyncServicesDto = {
        sourceEnvironmentId: sourceId,
        targetEnvironmentId: targetId,
        serviceIds: selectedIds,
        targetAppInstanceIds: [targetId],
      };
      await ServicesRepository.syncServices(dto);
      toast({ title: 'Sync complete', description: `${selectedIds.length} services synced` });
      setSyncDialogOpen(false);
      setSelectedIds([]);
      handleCompare(); // Refresh
    } catch { toast({ title: 'Sync failed', variant: 'destructive' }); }
    finally { setSyncing(false); }
  };

  const toggleSelection = (name: string) => {
    setSelectedIds(prev => prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]);
  };

  const statusIcon = (status: string) => {
    switch (status) {
      case 'identical': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'different': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'missing': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const items = compareMode === 'instance' ? instances : environments;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Compare & Sync</h1>
        <p className="text-sm text-muted-foreground">Compare services between environments or instances and sync differences</p>
      </div>

      {/* Controls */}
      <div className="surface-elevated rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Select value={compareMode} onValueChange={(v: 'environment' | 'instance') => { setCompareMode(v); setSourceId(''); setTargetId(''); setResult(null); }}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="instance">By Instance</SelectItem>
              <SelectItem value="environment">By Environment</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}{i.namespace ? ` (${i.namespace})` : ''}</SelectItem>)}</SelectContent>
          </Select>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Target" /></SelectTrigger>
            <SelectContent>{items.filter((i: any) => i.id !== sourceId).map((i: any) => <SelectItem key={i.id} value={i.id}>{i.name}{i.namespace ? ` (${i.namespace})` : ''}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleCompare} disabled={!sourceId || !targetId || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitCompare className="h-4 w-4" />}
            Compare
          </Button>
        </div>
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: result.summary.totalServices ?? 0 },
              { label: 'Identical', value: result.summary.identical, color: 'text-success' },
              { label: 'Different', value: result.summary.different, color: 'text-warning' },
              { label: 'Missing Source', value: result.summary.missingInSource, color: 'text-destructive' },
              { label: 'Missing Target', value: result.summary.missingInTarget, color: 'text-info' },
            ].map(s => (
              <div key={s.label} className="surface-elevated rounded-lg p-3 text-center">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold font-mono ${s.color || ''}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Sync button */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <span className="text-sm">{selectedIds.length} service(s) selected</span>
              <Button onClick={() => setSyncDialogOpen(true)} className="gap-2">
                <RefreshCw className="h-4 w-4" /> Sync Selected
              </Button>
            </div>
          )}

          {/* Comparison table */}
          <div className="surface-elevated rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="p-3 w-10"></th>
                  <th className="text-left p-3 font-medium">Service</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Differences</th>
                </tr>
              </thead>
              <tbody>
                {result.comparisons.map((c) => (
                  <tr key={c.serviceName} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      {c.status !== 'identical' && (
                        <Checkbox
                          checked={selectedIds.includes(c.serviceName)}
                          onCheckedChange={() => toggleSelection(c.serviceName)}
                        />
                      )}
                    </td>
                    <td className="p-3 text-sm font-medium font-mono">{c.serviceName}</td>
                    <td className="p-3 text-xs text-muted-foreground">{c.workloadType || '—'}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        {statusIcon(c.status)}
                        <span className="text-xs capitalize">{c.status}</span>
                      </div>
                    </td>
                    <td className="p-3 text-xs text-muted-foreground font-mono">
                      {c.status === 'different' && c.differences ? (
                        <div className="max-w-xs truncate">
                          {Object.entries(c.differences).map(([k, v]) => (
                            <div key={k}>{k}: {JSON.stringify(v)}</div>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Sync confirmation */}
      <AlertDialog open={syncDialogOpen} onOpenChange={setSyncDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sync</AlertDialogTitle>
            <AlertDialogDescription>
              Sync {selectedIds.length} service(s) from source to target? This will update image tags on the target.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSync} disabled={syncing}>
              {syncing && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Sync Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
