import { getApiClient } from '../api/client';
import type { SecretCompareResult } from '../api/types';

export const SecretsRepository = {
  getByAppInstance: (appInstanceId: string) =>
    getApiClient().get(`/api/secrets/by-app-instance/${appInstanceId}`).then(r => r.data),

  compareByInstance: (source: string, target: string) =>
    getApiClient().get<SecretCompareResult>('/api/secrets/compare/by-instance', { params: { source, target } }).then(r => r.data),

  getDetails: (secretName: string, source: string, target: string) =>
    getApiClient().get(`/api/secrets/${secretName}/details`, { params: { source, target } }).then(r => r.data),

  syncKey: (data: Record<string, unknown>) =>
    getApiClient().post('/api/secrets/sync-key', data).then(r => r.data),

  syncKeys: (data: Record<string, unknown>) =>
    getApiClient().post('/api/secrets/sync-keys', data).then(r => r.data),
};
