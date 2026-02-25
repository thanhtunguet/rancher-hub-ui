import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { HarborSitesRepository } from '@/repositories/harbor-sites.repository';
import type { HarborSite } from '@/api/types';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Loader2, ChevronRight, Folder, Package, Tag, ArrowLeft,
  Info, Clock, HardDrive, Layers
} from 'lucide-react';

type BreadcrumbLevel = 'projects' | 'repositories' | 'tags' | 'tagDetail';

interface BreadcrumbItem {
  level: BreadcrumbLevel;
  label: string;
}

export default function HarborBrowserPage() {
  const { siteId } = useParams<{ siteId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [site, setSite] = useState<HarborSite | null>(null);
  const [loading, setLoading] = useState(true);

  // Navigation state
  const [currentLevel, setCurrentLevel] = useState<BreadcrumbLevel>('projects');
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [selectedRepo, setSelectedRepo] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Data state
  const [projects, setProjects] = useState<any[]>([]);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [tagDetail, setTagDetail] = useState<any>(null);

  useEffect(() => {
    if (!siteId) return;
    Promise.all([
      HarborSitesRepository.findOne(siteId),
      HarborSitesRepository.getProjects(siteId),
    ])
      .then(([s, p]) => {
        setSite(s);
        setProjects(Array.isArray(p) ? p : []);
      })
      .catch(() => toast({ title: 'Error', description: 'Failed to load harbor site', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [siteId]);

  const openProject = async (projectName: string) => {
    if (!siteId) return;
    setLoading(true);
    setSelectedProject(projectName);
    try {
      const repos = await HarborSitesRepository.getRepositories(siteId, projectName);
      setRepositories(Array.isArray(repos) ? repos : []);
      setCurrentLevel('repositories');
    } catch {
      toast({ title: 'Error', description: 'Failed to load repositories', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openRepository = async (repoName: string) => {
    if (!siteId || !selectedProject) return;
    setLoading(true);
    setSelectedRepo(repoName);
    try {
      const arts = await HarborSitesRepository.getArtifacts(siteId, selectedProject, repoName);
      setTags(Array.isArray(arts) ? arts : []);
      setCurrentLevel('tags');
    } catch {
      toast({ title: 'Error', description: 'Failed to load tags', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const openTag = async (tag: string) => {
    if (!siteId || !selectedProject || !selectedRepo) return;
    setLoading(true);
    setSelectedTag(tag);
    try {
      const detail = await HarborSitesRepository.getTagDetail(siteId, selectedProject, selectedRepo, tag);
      setTagDetail(detail);
      setCurrentLevel('tagDetail');
    } catch {
      toast({ title: 'Error', description: 'Failed to load tag details', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const navigateTo = (level: BreadcrumbLevel) => {
    if (level === 'projects') {
      setCurrentLevel('projects');
      setSelectedProject(null);
      setSelectedRepo(null);
      setSelectedTag(null);
    } else if (level === 'repositories' && selectedProject) {
      setCurrentLevel('repositories');
      setSelectedRepo(null);
      setSelectedTag(null);
    } else if (level === 'tags' && selectedProject && selectedRepo) {
      setCurrentLevel('tags');
      setSelectedTag(null);
    }
  };

  const breadcrumbs: BreadcrumbItem[] = [{ level: 'projects', label: site?.name || 'Projects' }];
  if (selectedProject) breadcrumbs.push({ level: 'repositories', label: selectedProject });
  if (selectedRepo) breadcrumbs.push({ level: 'tags', label: selectedRepo });
  if (selectedTag) breadcrumbs.push({ level: 'tagDetail', label: selectedTag });

  const formatSize = (bytes?: number) => {
    if (!bytes) return '—';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const formatDate = (d?: string) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleString(); } catch { return d; }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/harbor')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Harbor Browser</h1>
          {site && <p className="text-sm text-muted-foreground font-mono">{site.url}</p>}
        </div>
      </div>

      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm flex-wrap">
        {breadcrumbs.map((bc, i) => (
          <span key={bc.level} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-muted-foreground" />}
            {i < breadcrumbs.length - 1 ? (
              <button
                onClick={() => navigateTo(bc.level)}
                className="text-primary hover:underline font-medium"
              >
                {bc.label}
              </button>
            ) : (
              <span className="font-semibold text-foreground">{bc.label}</span>
            )}
          </span>
        ))}
      </nav>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Projects */}
          {currentLevel === 'projects' && (
            <div className="grid gap-2">
              {projects.length === 0 ? (
                <EmptyState icon={Folder} text="No projects found" />
              ) : (
                projects.map((p: any) => {
                  const name = p.name || p.project_id?.toString() || 'unknown';
                  return (
                    <ListRow
                      key={name}
                      icon={<Folder className="h-4 w-4 text-primary" />}
                      label={name}
                      meta={p.repo_count != null ? `${p.repo_count} repositories` : undefined}
                      onClick={() => openProject(name)}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* Repositories */}
          {currentLevel === 'repositories' && (
            <div className="grid gap-2">
              {repositories.length === 0 ? (
                <EmptyState icon={Package} text="No repositories found" />
              ) : (
                repositories.map((r: any) => {
                  const name = r.name || r.repository_name || 'unknown';
                  // Strip project prefix if present
                  const displayName = name.includes('/') ? name.split('/').slice(1).join('/') : name;
                  return (
                    <ListRow
                      key={name}
                      icon={<Package className="h-4 w-4 text-primary" />}
                      label={displayName}
                      meta={r.artifact_count != null ? `${r.artifact_count} artifacts` : undefined}
                      onClick={() => openRepository(displayName)}
                    />
                  );
                })
              )}
            </div>
          )}

          {/* Tags */}
          {currentLevel === 'tags' && (
            <div className="grid gap-2">
              {tags.length === 0 ? (
                <EmptyState icon={Tag} text="No tags found" />
              ) : (
                tags.map((t: any, idx: number) => {
                  const tagNames: string[] = t.tags?.map((tg: any) => tg.name) || [t.tag || t.name || `artifact-${idx}`];
                  const digest = t.digest ? t.digest.substring(0, 16) + '…' : undefined;
                  return (
                    <div key={t.digest || idx} className="surface-elevated rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <Tag className="h-4 w-4 text-primary shrink-0" />
                          <div className="flex flex-wrap gap-1.5">
                            {tagNames.map((tn: string) => (
                              <Badge
                                key={tn}
                                variant="secondary"
                                className="cursor-pointer hover:bg-primary/20 transition-colors"
                                onClick={() => openTag(tn)}
                              >
                                {tn}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                          {t.size != null && (
                            <span className="flex items-center gap-1">
                              <HardDrive className="h-3 w-3" />
                              {formatSize(t.size)}
                            </span>
                          )}
                          {t.push_time && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(t.push_time)}
                            </span>
                          )}
                        </div>
                      </div>
                      {digest && (
                        <p className="text-xs text-muted-foreground font-mono pl-7">{digest}</p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Tag Detail */}
          {currentLevel === 'tagDetail' && tagDetail && (
            <div className="space-y-4">
              <div className="surface-elevated rounded-lg p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <Info className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Tag Details</h2>
                </div>
                <DetailGrid detail={tagDetail} formatSize={formatSize} formatDate={formatDate} />
              </div>

              {/* Extra sections */}
              {tagDetail.config && (
                <CollapsibleJson title="Config" data={tagDetail.config} />
              )}
              {tagDetail.layers && Array.isArray(tagDetail.layers) && (
                <div className="surface-elevated rounded-lg p-6 space-y-3">
                  <div className="flex items-center gap-3">
                    <Layers className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Layers</h2>
                    <Badge variant="outline">{tagDetail.layers.length}</Badge>
                  </div>
                  <div className="space-y-1">
                    {tagDetail.layers.map((layer: any, i: number) => (
                      <div key={i} className="flex items-center justify-between text-xs font-mono py-1.5 px-3 rounded bg-muted/50">
                        <span className="truncate max-w-[70%]">{layer.digest?.substring(0, 24) || `layer-${i}`}…</span>
                        <span className="text-muted-foreground">{formatSize(layer.size)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Raw JSON fallback */}
              <CollapsibleJson title="Raw Response" data={tagDetail} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ---- Sub-components ---- */

function ListRow({ icon, label, meta, onClick }: { icon: React.ReactNode; label: string; meta?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="surface-elevated rounded-lg p-4 flex items-center justify-between gap-4 w-full text-left hover:ring-1 hover:ring-primary/30 transition-all group"
    >
      <div className="flex items-center gap-3 min-w-0">
        {icon}
        <span className="font-medium text-sm truncate">{label}</span>
        {meta && <span className="text-xs text-muted-foreground hidden sm:inline">({meta})</span>}
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

function EmptyState({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="surface-elevated rounded-lg p-12 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}

function DetailGrid({ detail, formatSize, formatDate }: { detail: any; formatSize: (b?: number) => string; formatDate: (d?: string) => string }) {
  const fields: { label: string; value: string }[] = [];

  if (detail.digest) fields.push({ label: 'Digest', value: detail.digest });
  if (detail.mediaType) fields.push({ label: 'Media Type', value: detail.mediaType });
  if (detail.architecture) fields.push({ label: 'Architecture', value: detail.architecture });
  if (detail.os) fields.push({ label: 'OS', value: detail.os });
  if (detail.size != null) fields.push({ label: 'Size', value: detail.sizeFormatted || formatSize(detail.size) });
  if (detail.push_time || detail.pushedAt) fields.push({ label: 'Pushed At', value: formatDate(detail.push_time || detail.pushedAt) });
  if (detail.pull_time) fields.push({ label: 'Last Pulled', value: formatDate(detail.pull_time) });
  if (detail.scan_overview) fields.push({ label: 'Scan Status', value: JSON.stringify(detail.scan_overview) });

  // fallback: show all top-level string/number fields not yet shown
  const shown = new Set(fields.map(f => f.label.toLowerCase().replace(/\s/g, '')));
  const skipKeys = new Set(['config', 'layers', 'tags', 'references', 'additions', 'labels']);
  Object.entries(detail).forEach(([k, v]) => {
    if (skipKeys.has(k)) return;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      const normalized = k.toLowerCase().replace(/[_\s]/g, '');
      if (!shown.has(normalized)) {
        fields.push({ label: k.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim(), value: String(v) });
        shown.add(normalized);
      }
    }
  });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {fields.map((f) => (
        <div key={f.label} className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{f.label}</p>
          <p className="text-sm font-mono break-all">{f.value}</p>
        </div>
      ))}
    </div>
  );
}

function CollapsibleJson({ title, data }: { title: string; data: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="surface-elevated rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between text-sm font-medium hover:bg-muted/50 transition-colors"
      >
        <span>{title}</span>
        <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <pre className="p-4 pt-0 text-xs font-mono text-muted-foreground overflow-auto max-h-96 whitespace-pre-wrap">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}
