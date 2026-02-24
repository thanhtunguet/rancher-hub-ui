import { getApiClient } from '../api/client';
import type { ConfigMap, ConfigMapCompareResult } from '../api/types';

export const ConfigMapsRepository = {
  getByAppInstance: (appInstanceId: string) =>
    getApiClient().get<ConfigMap[]>(`/api/configmaps/by-app-instance/${appInstanceId}`).then(r => r.data),

  compareByInstance: (source: string, target: string) =>
    getApiClient().get<ConfigMapCompareResult>('/api/configmaps/compare/by-instance', { params: { source, target } }).then(r => r.data),

  getDetails: (configMapName: string, source: string, target: string) =>
    getApiClient().get(`/api/configmaps/${configMapName}/details`, { params: { source, target } }).then(r => r.data),

  syncKey: (data: Record<string, unknown>) =>
    getApiClient().post('/api/configmaps/sync-key', data).then(r => r.data),

  syncKeys: (data: Record<string, unknown>) =>
    getApiClient().post('/api/configmaps/sync-keys', data).then(r => r.data),
};
