import { useState, useEffect } from 'react';
import { ConfigMapsRepository } from '@/repositories/configmaps.repository';
import { AppInstancesRepository } from '@/repositories/app-instances.repository';
import type { AppInstance, ConfigMapCompareResult } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Settings, ArrowRight, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function ConfigMapsPage() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [result, setResult] = useState<ConfigMapCompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    AppInstancesRepository.findAll().then(setInstances).catch(() => {});
  }, []);

  const handleCompare = async () => {
    if (!sourceId || !targetId) return;
    setLoading(true);
    try { setResult(await ConfigMapsRepository.compareByInstance(sourceId, targetId)); }
    catch { toast({ title: 'Compare failed', variant: 'destructive' }); }
    finally { setLoading(false); }
  };

  const statusIcon = (s: string) => {
    if (s === 'identical') return <CheckCircle className="h-4 w-4 text-success" />;
    if (s === 'different') return <AlertTriangle className="h-4 w-4 text-warning" />;
    return <XCircle className="h-4 w-4 text-destructive" />;
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">ConfigMaps</h1><p className="text-sm text-muted-foreground">Compare and sync ConfigMaps between instances</p></div>

      <div className="surface-elevated rounded-lg p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={sourceId} onValueChange={setSourceId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Source instance" /></SelectTrigger>
            <SelectContent>{instances.map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.namespace})</SelectItem>)}</SelectContent>
          </Select>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
          <Select value={targetId} onValueChange={setTargetId}>
            <SelectTrigger className="w-56"><SelectValue placeholder="Target instance" /></SelectTrigger>
            <SelectContent>{instances.filter(i => i.id !== sourceId).map(i => <SelectItem key={i.id} value={i.id}>{i.name} ({i.namespace})</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={handleCompare} disabled={!sourceId || !targetId || loading} className="gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />} Compare
          </Button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: result.summary.totalConfigMaps ?? 0 },
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

          <div className="surface-elevated rounded-lg overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                <th className="text-left p-3 font-medium">ConfigMap</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Differences</th>
              </tr></thead>
              <tbody>
                {result.comparisons.map(c => (
                  <tr key={c.configMapName} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-sm font-mono">{c.configMapName}</td>
                    <td className="p-3"><div className="flex items-center gap-2">{statusIcon(c.status)}<span className="text-xs capitalize">{c.status}</span></div></td>
                    <td className="p-3 text-xs text-muted-foreground font-mono max-w-xs truncate">
                      {c.differences ? Object.keys(c.differences).join(', ') : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
