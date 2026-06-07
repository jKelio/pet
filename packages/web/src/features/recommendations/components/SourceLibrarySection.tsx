import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Source } from '@pet/shared';
import { Button } from '../../../shared/components/ui/button.js';
import { Input } from '../../../shared/components/ui/input.js';
import { Label } from '../../../shared/components/ui/label.js';
import { listSources, createSource, updateSource, deleteSource } from '../api/recommendation.api.js';

interface SourceLibrarySectionProps {
  accessToken: string;
  canEdit: boolean;
}

interface SourceFormState {
  url: string;
  title: string;
}

export function SourceLibrarySection({ accessToken, canEdit }: SourceLibrarySectionProps) {
  const { t } = useTranslation('pet');
  const [sources, setSources] = useState<Source[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<SourceFormState>({ url: '', title: '' });
  const [addError, setAddError] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SourceFormState>({ url: '', title: '' });
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    loadSources();
  }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadSources() {
    try {
      const data = await listSources(accessToken);
      setSources(data);
      setLoadError(null);
    } catch {
      setLoadError(t('sources.errorLoad'));
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setAddError(null);
    try {
      const created = await createSource({ url: addForm.url.trim(), title: addForm.title.trim() }, accessToken);
      setSources((prev) => [...prev, created]);
      setAddForm({ url: '', title: '' });
      setShowAdd(false);
    } catch {
      setAddError(t('sources.errorCreate'));
    }
  }

  function startEdit(source: Source) {
    setEditId(source.id);
    setEditForm({ url: source.url, title: source.title });
    setEditError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setEditError(null);
    try {
      const updated = await updateSource(editId, { url: editForm.url.trim(), title: editForm.title.trim() }, accessToken);
      setSources((prev) => prev.map((s) => (s.id === editId ? updated : s)));
      setEditId(null);
    } catch {
      setEditError(t('sources.errorUpdate'));
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('sources.confirmDelete'))) return;
    try {
      await deleteSource(id, accessToken);
      setSources((prev) => prev.filter((s) => s.id !== id));
    } catch {
      setLoadError(t('sources.errorDelete'));
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Link2 className="h-4 w-4" />
          {t('sources.title')}
        </h2>
        {canEdit && (
          <Button size="sm" variant="outline" onClick={() => { setShowAdd(true); setEditId(null); }}>
            <Plus className="h-4 w-4 mr-1" />
            {t('sources.addSource')}
          </Button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t('sources.subtitle')}</p>

      {!canEdit && (
        <p className="text-xs text-muted-foreground italic">{t('sources.readOnly')}</p>
      )}

      {loadError && <p className="text-sm text-destructive">{loadError}</p>}

      {showAdd && canEdit && (
        <form onSubmit={handleAdd} className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label htmlFor="add-title">{t('sources.titleLabel')}</Label>
            <Input
              id="add-title"
              value={addForm.title}
              onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
              placeholder={t('sources.titlePlaceholder')}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="add-url">{t('sources.urlLabel')}</Label>
            <Input
              id="add-url"
              type="url"
              value={addForm.url}
              onChange={(e) => setAddForm((f) => ({ ...f, url: e.target.value }))}
              placeholder={t('sources.urlPlaceholder')}
              required
            />
          </div>
          {addError && <p className="text-sm text-destructive">{addError}</p>}
          <div className="flex gap-2 justify-end">
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
              {t('sources.cancel')}
            </Button>
            <Button type="submit" size="sm">{t('sources.save')}</Button>
          </div>
        </form>
      )}

      {sources.length === 0 && !showAdd && (
        <p className="text-sm text-muted-foreground text-center py-6">{t('sources.noSources')}</p>
      )}

      <div className="space-y-2">
        {sources.map((source) => (
          <div key={source.id} className="rounded-lg border border-border bg-card px-4 py-3">
            {editId === source.id ? (
              <form onSubmit={handleEdit} className="space-y-2">
                <div className="space-y-1">
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t('sources.titleLabel')}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Input
                    type="url"
                    value={editForm.url}
                    onChange={(e) => setEditForm((f) => ({ ...f, url: e.target.value }))}
                    placeholder={t('sources.urlLabel')}
                    required
                  />
                </div>
                {editError && <p className="text-xs text-destructive">{editError}</p>}
                <div className="flex gap-2 justify-end">
                  <Button type="button" size="icon" variant="ghost" onClick={() => setEditId(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                  <Button type="submit" size="icon">
                    <Check className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            ) : (
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{source.title}</p>
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground underline truncate block"
                  >
                    {source.url}
                  </a>
                </div>
                {canEdit && (
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(source)} title={t('sources.edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(source.id)}
                      title={t('sources.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
