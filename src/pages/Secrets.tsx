import { useState, useEffect } from 'react';
import { SecretsRepository } from '@/repositories/secrets.repository';
import { AppInstancesRepository } from '@/repositories/app-instances.repository';
import type { AppInstance, SecretCompareResult } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Lock, ArrowRight, Loader2, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

export default function SecretsPage() {
  const { toast } = useToast();
  const [instances, setInstances] = useState<AppInstance[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [result, setResult] = useState<SecretCompareResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { AppInstancesRepository.findAll().then(setInstances).catch(() => {}); }, []);

  const handleCompare = async () => {
    if (!sourceId || !targetId) return;
    setLoading(true);
    try { setResult(await SecretsRepository.compareByInstance(sourceId, targetId)); }
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
      <div><h1 className="text-2xl font-bold">Secrets</h1><p className="text-sm text-muted-foreground">Compare and sync Secrets between instances (values masked)</p></div>

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
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />} Compare
          </Button>
        </div>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Total', value: result.summary.totalSecrets ?? 0 },
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
                <th className="text-left p-3 font-medium">Secret</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Keys</th>
              </tr></thead>
              <tbody>
                {result.comparisons.map(c => (
                  <tr key={c.secretName} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-3 text-sm font-mono">{c.secretName}</td>
                    <td className="p-3"><div className="flex items-center gap-2">{statusIcon(c.status)}<span className="text-xs capitalize">{c.status}</span></div></td>
                    <td className="p-3 text-xs text-muted-foreground">
                      {c.differences ? Object.keys(c.differences).map(k => <span key={k} className="inline-block bg-muted px-1.5 py-0.5 rounded mr-1 font-mono">••• {k}</span>) : '—'}
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
