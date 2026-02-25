import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2, CheckCircle, AlertTriangle, XCircle, ArrowRight, Minus, Plus, RefreshCw } from 'lucide-react';
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
  maskedKeys?: string[];
}

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  identical: { icon: <CheckCircle className="h-4 w-4 text-success" />, label: 'Identical', color: 'bg-success/10 text-success' },
  different: { icon: <AlertTriangle className="h-4 w-4 text-warning" />, label: 'Different', color: 'bg-warning/10 text-warning' },
  missing: { icon: <XCircle className="h-4 w-4 text-destructive" />, label: 'Missing', color: 'bg-destructive/10 text-destructive' },
};

function formatValue(val: unknown, mask = false): string {
  if (val === null || val === undefined) return '';
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

type DiffType = 'identical' | 'added' | 'removed' | 'modified';

function getDiffType(srcVal: unknown, tgtVal: unknown): DiffType {
  const inSrc = srcVal !== undefined;
  const inTgt = tgtVal !== undefined;
  if (inSrc && !inTgt) return 'removed';
  if (!inSrc && inTgt) return 'added';
  if (JSON.stringify(srcVal) !== JSON.stringify(tgtVal)) return 'modified';
  return 'identical';
}

const diffStyles: Record<DiffType, { row: string; srcCell: string; tgtCell: string; icon: React.ReactNode; label: string }> = {
  identical: {
    row: '',
    srcCell: '',
    tgtCell: '',
    icon: <CheckCircle className="h-3 w-3 text-muted-foreground" />,
    label: '',
  },
  removed: {
    row: 'bg-[hsl(var(--diff-removed-bg))]',
    srcCell: 'bg-[hsl(var(--diff-removed-highlight))] text-[hsl(var(--diff-removed-fg))]',
    tgtCell: 'opacity-40',
    icon: <Minus className="h-3 w-3 text-[hsl(var(--diff-removed-fg))]" />,
    label: 'Removed',
  },
  added: {
    row: 'bg-[hsl(var(--diff-added-bg))]',
    srcCell: 'opacity-40',
    tgtCell: 'bg-[hsl(var(--diff-added-highlight))] text-[hsl(var(--diff-added-fg))]',
    icon: <Plus className="h-3 w-3 text-[hsl(var(--diff-added-fg))]" />,
    label: 'Added',
  },
  modified: {
    row: 'bg-[hsl(var(--diff-modified-bg))]',
    srcCell: 'bg-[hsl(var(--diff-removed-highlight))] text-[hsl(var(--diff-removed-fg))]',
    tgtCell: 'bg-[hsl(var(--diff-added-highlight))] text-[hsl(var(--diff-added-fg))]',
    icon: <RefreshCw className="h-3 w-3 text-[hsl(var(--diff-modified-fg))]" />,
    label: 'Modified',
  },
};

export function CompareDetailDialog({
  open, onOpenChange, title, status, sourceLabel, targetLabel, loading, detail, maskedKeys = [],
}: CompareDetailDialogProps) {
  const cfg = statusConfig[status] || statusConfig.missing;
  const allKeys = detail ? getAllKeys(detail.source, detail.target) : [];

  // Sort: modified first, then added, removed, identical
  const sortOrder: Record<DiffType, number> = { modified: 0, added: 1, removed: 2, identical: 3 };
  const sortedKeys = detail
    ? [...allKeys].sort((a, b) => {
        const da = getDiffType(detail.source?.[a], detail.target?.[a]);
        const db = getDiffType(detail.source?.[b], detail.target?.[b]);
        return (sortOrder[da] ?? 9) - (sortOrder[db] ?? 9) || a.localeCompare(b);
      })
    : [];

  const counts = { identical: 0, modified: 0, added: 0, removed: 0 };
  if (detail) {
    for (const key of allKeys) {
      counts[getDiffType(detail.source?.[key], detail.target?.[key])]++;
    }
  }

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
          <div className="flex items-center gap-4 mt-2">
            <p className="text-xs text-muted-foreground">
              {sourceLabel} <ArrowRight className="inline h-3 w-3 mx-1" /> {targetLabel}
            </p>
            <div className="flex items-center gap-3 text-[11px] ml-auto">
              {counts.modified > 0 && (
                <span className="flex items-center gap-1 text-[hsl(var(--diff-modified-fg))]">
                  <RefreshCw className="h-3 w-3" /> {counts.modified} modified
                </span>
              )}
              {counts.added > 0 && (
                <span className="flex items-center gap-1 text-[hsl(var(--diff-added-fg))]">
                  <Plus className="h-3 w-3" /> {counts.added} added
                </span>
              )}
              {counts.removed > 0 && (
                <span className="flex items-center gap-1 text-[hsl(var(--diff-removed-fg))]">
                  <Minus className="h-3 w-3" /> {counts.removed} removed
                </span>
              )}
              {counts.identical > 0 && (
                <span className="flex items-center gap-1 text-muted-foreground">
                  <CheckCircle className="h-3 w-3" /> {counts.identical} identical
                </span>
              )}
            </div>
          </div>
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
                    <th className="p-2 w-6"></th>
                    <th className="text-left p-2 font-medium text-xs uppercase tracking-wider w-[22%]">Key</th>
                    <th className="text-left p-2 font-medium text-xs uppercase tracking-wider w-[36%]">{sourceLabel}</th>
                    <th className="text-left p-2 font-medium text-xs uppercase tracking-wider w-[36%]">{targetLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedKeys.map(key => {
                    const isMasked = maskedKeys.includes(key);
                    const srcVal = detail.source?.[key];
                    const tgtVal = detail.target?.[key];
                    const diffType = getDiffType(srcVal, tgtVal);
                    const style = diffStyles[diffType];

                    return (
                      <tr key={key} className={`border-b border-border/30 ${style.row}`}>
                        <td className="p-2 text-center align-top">{style.icon}</td>
                        <td className="p-2 font-mono text-xs font-medium align-top">{key}</td>
                        <td className={`p-2 font-mono text-xs align-top whitespace-pre-wrap break-all ${style.srcCell}`}>
                          {formatValue(srcVal, isMasked) || <span className="text-muted-foreground/40 italic">—</span>}
                        </td>
                        <td className={`p-2 font-mono text-xs align-top whitespace-pre-wrap break-all ${style.tgtCell}`}>
                          {formatValue(tgtVal, isMasked) || <span className="text-muted-foreground/40 italic">—</span>}
                        </td>
                      </tr>
                    );
                  })}
                  {sortedKeys.length === 0 && (
                    <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">No keys to display</td></tr>
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
