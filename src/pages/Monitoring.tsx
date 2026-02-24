import { useState, useEffect } from 'react';
import { MonitoringRepository } from '@/repositories/monitoring.repository';
import type { MonitoringConfig, MonitoredInstance, MonitoringAlert } from '@/api/types';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Activity, Bell, Loader2, CheckCircle, XCircle } from 'lucide-react';

export default function MonitoringPage() {
  const { toast } = useToast();
  const [config, setConfig] = useState<MonitoringConfig | null>(null);
  const [instances, setInstances] = useState<MonitoredInstance[]>([]);
  const [alerts, setAlerts] = useState<MonitoringAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.allSettled([
      MonitoringRepository.getConfig(),
      MonitoringRepository.getInstances(),
      MonitoringRepository.getAlerts(),
    ]).then(([configRes, instRes, alertRes]) => {
      if (configRes.status === 'fulfilled') setConfig(configRes.value);
      if (instRes.status === 'fulfilled') setInstances(instRes.value);
      if (alertRes.status === 'fulfilled') setAlerts(alertRes.value);
      setLoading(false);
    });
  }, []);

  const resolveAlert = async (id: string) => {
    try {
      await MonitoringRepository.resolveAlert(id);
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
      toast({ title: 'Alert resolved' });
    } catch { toast({ title: 'Error', variant: 'destructive' }); }
  };

  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Monitoring</h1><p className="text-sm text-muted-foreground">Health monitoring and alerts</p></div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Config status */}
          <div className="surface-elevated rounded-lg p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Activity className="h-4 w-4" /> Configuration</h2>
            {config ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div><span className="text-muted-foreground">Status:</span> <span className={config.monitoringEnabled ? 'text-success' : 'text-muted-foreground'}>{config.monitoringEnabled ? 'Enabled' : 'Disabled'}</span></div>
                <div><span className="text-muted-foreground">Schedule:</span> <span>{config.notificationSchedule}</span></div>
                <div><span className="text-muted-foreground">Threshold:</span> <span className="font-mono">{config.alertThreshold}</span></div>
                <div><span className="text-muted-foreground">Telegram:</span> <span>{config.telegramChatId ? 'Configured' : 'Not set'}</span></div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No monitoring configuration found</p>
            )}
          </div>

          {/* Monitored instances */}
          <div className="surface-elevated rounded-lg p-5">
            <h2 className="font-semibold mb-3">Monitored Instances ({instances.length})</h2>
            {instances.length === 0 ? (
              <p className="text-sm text-muted-foreground">No instances being monitored</p>
            ) : (
              <div className="space-y-2">
                {instances.map(inst => (
                  <div key={inst.id} className="flex items-center justify-between p-3 rounded-md bg-background border border-border">
                    <div>
                      <p className="text-sm font-medium">{inst.appInstance?.name || inst.appInstanceId}</p>
                      <p className="text-xs text-muted-foreground">Every {inst.checkIntervalMinutes}min • {inst.monitoringEnabled ? 'Active' : 'Paused'}</p>
                    </div>
                    <div className={`h-2.5 w-2.5 rounded-full ${inst.monitoringEnabled ? 'bg-success animate-pulse-glow' : 'bg-muted-foreground'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alerts */}
          <div className="surface-elevated rounded-lg p-5">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Bell className="h-4 w-4" /> Alerts ({alerts.filter(a => !a.resolved).length} active)</h2>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No alerts</p>
            ) : (
              <div className="space-y-2">
                {alerts.map(alert => (
                  <div key={alert.id} className="flex items-center justify-between p-3 rounded-md bg-background border border-border">
                    <div className="flex items-center gap-3">
                      {alert.resolved ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-destructive" />}
                      <div>
                        <p className="text-sm">{alert.message || 'Alert'}</p>
                        <p className="text-xs text-muted-foreground">{alert.createdAt ? new Date(alert.createdAt).toLocaleString() : ''}</p>
                      </div>
                    </div>
                    {!alert.resolved && (
                      <Button variant="outline" size="sm" onClick={() => resolveAlert(alert.id)}>Resolve</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
