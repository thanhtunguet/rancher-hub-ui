import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, AlertTriangle, XCircle, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DetailData {
  source: Record<string, unknown> | null;
  target: Record<string, unknown> | null;
  differences?: Record<string, { source?: unknown; target?: unknown }>;
  [key: string]: unknown;
}

interface CompareDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  status: string;
  sourceLabel: string;
  targetLabel: string;
  loading: boolean;
  detail: DetailData | null;
  /** Keys to mask values (e.g. secret data) */
  maskedKeys?: string[];
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  identical: { icon: <CheckCircle className="h-4 w-4 text-success" />, label: 'Identical', color: 'bg-success/10 text-success' },
  different: { icon: <AlertTriangle className="h-4 w-4 text-warning" />, label: 'Different', color: 'bg-warning/10 text-warning' },
  missing: { icon: <XCircle className="h-4 w-4 text-destructive" />, label: 'Missing', color: 'bg-destructive/10 text-destructive' },
};

function formatValue(val: unknown, mask = false): string {
  if (val === null || val === undefined) return '—';
  if (mask) return '••••••••';
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

function getAllKeys(source: Record<string, unknown> | null, target: Record<string, unknown> | null): string[] {
  const keys = new Set<string>();
  if (source) Object.keys(source).forEach(k => keys.add(k));
  if (target) Object.keys(target).forEach(k => keys.add(k));
  return Array.from(keys).sort();
}

export function CompareDetailDialog({
  open, onOpenChange, title, status, sourceLabel, targetLabel, loading, detail, maskedKeys = [],
}: CompareDetailDialogProps) {
  const cfg = statusConfig[status] || statusConfig.missing;
  const diffKeys = detail?.differences ? new Set(Object.keys(detail.differences)) : new Set<string>();
  const allKeys = detail ? getAllKeys(detail.source, detail.target) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle className="font-mono text-lg">{title}</DialogTitle>
            <Badge variant="outline" className={cfg.color}>
              <span className="flex items-center gap-1.5">{cfg.icon} {cfg.label}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {sourceLabel} <ArrowRight className="inline h-3 w-3 mx-1" /> {targetLabel}
          </p>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : !detail ? (
          <p className="text-sm text-muted-foreground text-center py-8">No detail data available</p>
        ) : (
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider w-[25%]">Key</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider w-[35%]">{sourceLabel}</th>
                    <th className="text-left p-3 font-medium text-xs uppercase tracking-wider w-[35%]">{targetLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {allKeys.map(key => {
                    const isDiff = diffKeys.has(key);
                    const isMasked = maskedKeys.includes(key);
                    const srcVal = detail.source?.[key];
                    const tgtVal = detail.target?.[key];
                    const onlyInSource = srcVal !== undefined && tgtVal === undefined;
                    const onlyInTarget = tgtVal !== undefined && srcVal === undefined;

                    return (
                      <tr
                        key={key}
                        className={`border-b border-border/50 ${isDiff ? 'bg-warning/5' : ''} ${onlyInSource ? 'bg-destructive/5' : ''} ${onlyInTarget ? 'bg-info/5' : ''}`}
                      >
                        <td className="p-3 font-mono text-xs font-medium align-top">
                          {key}
                          {isDiff && <span className="ml-2 text-warning">●</span>}
                          {onlyInSource && <span className="ml-2 text-destructive text-[10px]">SRC ONLY</span>}
                          {onlyInTarget && <span className="ml-2 text-info text-[10px]">TGT ONLY</span>}
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground align-top whitespace-pre-wrap break-all">
                          {formatValue(srcVal, isMasked)}
                        </td>
                        <td className="p-3 font-mono text-xs text-muted-foreground align-top whitespace-pre-wrap break-all">
                          {formatValue(tgtVal, isMasked)}
                        </td>
                      </tr>
                    );
                  })}
                  {allKeys.length === 0 && (
                    <tr><td colSpan={3} className="p-6 text-center text-muted-foreground">No keys to display</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
