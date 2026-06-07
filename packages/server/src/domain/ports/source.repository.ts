import type { Source } from '@pet/shared';

export interface SourceRepository {
  findByTenant(tenantId: string): Promise<Source[]>;
  findById(id: string, tenantId: string): Promise<Source | null>;
  findByIds(ids: string[], tenantId: string): Promise<Source[]>;
  create(source: Omit<Source, 'id' | 'createdAt' | 'updatedAt'>): Promise<Source>;
  update(id: string, tenantId: string, patch: { url?: string; title?: string }): Promise<Source | null>;
  delete(id: string, tenantId: string): Promise<void>;
}
