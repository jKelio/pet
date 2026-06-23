import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Pencil, Trash2, Check, X, BookOpen } from 'lucide-react';
import { SPORTS, type LibraryEntry, type Sport } from '@pet/shared';
import { Button } from '../../../shared/components/ui/button.js';
import { Input } from '../../../shared/components/ui/input.js';
import { Textarea } from '../../../shared/components/ui/textarea.js';
import { Label } from '../../../shared/components/ui/label.js';
import { Card, CardContent, CardHeader, CardTitle } from '../../../shared/components/ui/card.js';
import { superAdminApi, type LibraryEntryInput } from '../api/superadmin.api.js';

interface KnowledgeLibrarySectionProps {
  accessToken: string;
}

const EMPTY_FORM: LibraryEntryInput = { title: '', content: '', sport: 'ice_hockey' };

export function KnowledgeLibrarySection({ accessToken }: KnowledgeLibrarySectionProps) {
  const { t } = useTranslation('pet');
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState<LibraryEntryInput>(EMPTY_FORM);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LibraryEntryInput>(EMPTY_FORM);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    superAdminApi.listLibrary(accessToken)
      .then(setEntries)
      .catch(() => setError(t('library.errorLoad')));
  }, [accessToken, t]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await superAdminApi.createLibraryEntry(
        { title: addForm.title.trim(), content: addForm.content.trim(), sport: addForm.sport },
        accessToken,
      );
      setEntries((prev) => [...prev, created]);
      setAddForm(EMPTY_FORM);
      setShowAdd(false);
    } catch {
      setError(t('library.errorSave'));
    } finally {
      setBusy(false);
    }
  }

  function startEdit(entry: LibraryEntry) {
    setEditId(entry.id);
    setEditForm({ title: entry.title, content: entry.content, sport: entry.sport });
    setError(null);
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editId) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await superAdminApi.updateLibraryEntry(
        editId,
        { title: editForm.title.trim(), content: editForm.content.trim(), sport: editForm.sport },
        accessToken,
      );
      setEntries((prev) => prev.map((en) => (en.id === editId ? updated : en)));
      setEditId(null);
    } catch {
      setError(t('library.errorSave'));
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm(t('library.confirmDelete'))) return;
    setError(null);
    try {
      await superAdminApi.deleteLibraryEntry(id, accessToken);
      setEntries((prev) => prev.filter((en) => en.id !== id));
    } catch {
      setError(t('library.errorDelete'));
    }
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base flex items-center gap-1.5 min-w-0">
          <BookOpen className="h-4 w-4 shrink-0" />
          {t('library.title')}
        </CardTitle>
        <Button size="sm" variant="outline" className="shrink-0" onClick={() => { setShowAdd(true); setEditId(null); setAddForm(EMPTY_FORM); }}>
          <Plus className="h-4 w-4 mr-1" />
          {t('library.addEntry')}
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">{t('library.subtitle')}</p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {showAdd && (
          <form onSubmit={handleAdd} className="rounded-lg border border-border p-4 space-y-3 bg-muted/30">
            <div className="space-y-1.5">
              <Label htmlFor="add-title">{t('library.titleLabel')}</Label>
              <Input
                id="add-title"
                value={addForm.title}
                onChange={(e) => setAddForm((f) => ({ ...f, title: e.target.value }))}
                placeholder={t('library.titlePlaceholder')}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="add-content">{t('library.contentLabel')}</Label>
              <Textarea
                id="add-content"
                value={addForm.content}
                onChange={(e) => setAddForm((f) => ({ ...f, content: e.target.value }))}
                placeholder={t('library.contentPlaceholder')}
                required
              />
            </div>
            <SportSelect value={addForm.sport} onChange={(s) => setAddForm((f) => ({ ...f, sport: s }))} label={t('library.sportLabel')} />
            <div className="flex gap-2 justify-end">
              <Button type="button" size="sm" variant="ghost" onClick={() => setShowAdd(false)}>
                {t('library.cancel')}
              </Button>
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : t('library.save')}
              </Button>
            </div>
          </form>
        )}

        {entries.length === 0 && !showAdd && (
          <p className="text-sm text-muted-foreground text-center py-6">{t('library.noEntries')}</p>
        )}

        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="rounded-lg border border-border bg-card px-4 py-3">
              {editId === entry.id ? (
                <form onSubmit={handleEdit} className="space-y-2">
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder={t('library.titleLabel')}
                    required
                  />
                  <Textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm((f) => ({ ...f, content: e.target.value }))}
                    placeholder={t('library.contentLabel')}
                    required
                  />
                  <SportSelect value={editForm.sport} onChange={(s) => setEditForm((f) => ({ ...f, sport: s }))} label={t('library.sportLabel')} />
                  <div className="flex gap-2 justify-end">
                    <Button type="button" size="icon" variant="ghost" onClick={() => setEditId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button type="submit" size="icon" disabled={busy}>
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{entry.title}</p>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">{entry.sport}</p>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-line">{entry.content}</p>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="icon" variant="ghost" onClick={() => startEdit(entry)} title={t('library.edit')}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDelete(entry.id)}
                      title={t('library.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SportSelect({ value, onChange, label }: { value: Sport; onChange: (s: Sport) => void; label: string }) {
  // Single sport today; the selector is the seam for future sports.
  if (SPORTS.length <= 1) return null;
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <select
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value as Sport)}
      >
        {SPORTS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
