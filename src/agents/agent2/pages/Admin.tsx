import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import type { Flag, FlagInput } from '../api/types';
import Alert from '../components/Alert';
import Button from '../components/Button';
import { fieldClass } from '../components/fieldStyles';
import { ClearIcon } from '../components/Icon';
import FlagFormModal from '../components/FlagFormModal';
import MergeDialog from '../components/MergeDialog';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';
import { fmtDateTime } from '../util/format';

export default function Admin() {
  const toast = useToast();
  const [flags, setFlags] = useState<Flag[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Flag | 'new' | null>(null);
  const [merging, setMerging] = useState(false);
  const [deleting, setDeleting] = useState<Flag | null>(null);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  /**
   * Every failure is shown as a toast with the server's message. A 401 was already reported to the host portal by the
   * API client (it owns sign-in); a 403 means the backend refused an admin action.
   */
  const handleError = useCallback((e: unknown) => toast((e as Error).message, 'error'), [toast]);

  const refresh = useCallback(async () => {
    try {
      setFlags(await api.listFlags());
      setLoadError(null);
    } catch (e) {
      setLoadError((e as Error).message);
    }
  }, []);
  useEffect(() => void refresh(), [refresh]);

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (flags ?? []).filter(
      (f) => !q || `${f.name} ${f.description}`.toLowerCase().includes(q),
    );
  }, [flags, query]);

  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  const selectedFlags = (flags ?? []).filter((f) => selected.has(f.id));
  const allShownSelected = shown.length > 0 && shown.every((f) => selected.has(f.id));

  async function save(input: FlagInput) {
    try {
      if (editing === 'new') {
        await api.createFlag(input);
        toast('Flag added', 'success');
      } else if (editing) {
        await api.updateFlag(editing.id, input);
        toast('Flag updated', 'success');
      }
      setEditing(null);
      await refresh();
    } catch (e) {
      handleError(e);
    }
  }

  /** Activate or deactivate a flag in place. Only enabled (active) flags are checked on new runs. */
  async function setActive(flag: Flag, enabled: boolean) {
    setToggling((s) => new Set(s).add(flag.id));
    try {
      await api.updateFlag(flag.id, { enabled });
      toast(`${enabled ? 'Activated' : 'Deactivated'} "${flag.name}"`, 'success');
      await refresh();
    } catch (e) {
      handleError(e);
    } finally {
      setToggling((s) => {
        const n = new Set(s);
        n.delete(flag.id);
        return n;
      });
    }
  }

  async function remove(flag: Flag) {
    try {
      await api.deleteFlag(flag.id);
      toast(`Deleted "${flag.name}"`, 'success');
      setDeleting(null);
      setSelected((s) => {
        const n = new Set(s);
        n.delete(flag.id);
        return n;
      });
      await refresh();
    } catch (e) {
      handleError(e);
    }
  }

  async function merge(target: FlagInput) {
    try {
      await api.mergeFlags({ source_ids: selectedFlags.map((f) => f.id), target });
      toast(`Merged ${selectedFlags.length} flags into "${target.name}"`, 'success');
      setMerging(false);
      setSelected(new Set());
      await refresh();
    } catch (e) {
      handleError(e);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1>Flag management</h1>
          <p className="text-sm text-body">
            The flags the agent checks every run against. Only active flags are checked.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={selected.size < 2} onClick={() => setMerging(true)}>
            Merge selected{selected.size ? ` (${selected.size})` : ''}
          </Button>
          <Button onClick={() => setEditing('new')}>+ Add flag</Button>
        </div>
      </div>

      <div className="relative mt-4 max-w-sm">
        <input
          aria-label="Search flags"
          placeholder="Search flags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={`${fieldClass} ${query ? 'pr-9' : ''}`}
        />
        {query && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setQuery('')}
            className="absolute right-1 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-sm text-neu-1000 hover:bg-secondary-hover"
          >
            <ClearIcon />
          </button>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-neu-50 text-xs font-medium text-body">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all shown flags"
                  checked={allShownSelected}
                  onChange={() =>
                    setSelected(allShownSelected ? new Set() : new Set(shown.map((f) => f.id)))
                  }
                />
              </th>
              <th className="px-4 py-3">Flag</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {flags === null && !loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-body">
                  Loading flags…
                </td>
              </tr>
            )}
            {loadError && (
              <tr>
                <td colSpan={5} className="px-4 py-4">
                  <Alert kind="error">
                    Could not load flags: {loadError}{' '}
                    <button className="text-link underline hover:text-link-hover" onClick={refresh}>
                      Retry
                    </button>
                  </Alert>
                </td>
              </tr>
            )}
            {flags && shown.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-body">
                  {flags.length
                    ? 'No flags match your search.'
                    : 'No flags yet. Add the first one.'}
                </td>
              </tr>
            )}
            {shown.map((f) => (
              <tr key={f.id} className={selected.has(f.id) ? 'bg-highlight' : 'hover:bg-highlight'}>
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    aria-label={`Select ${f.name}`}
                    checked={selected.has(f.id)}
                    onChange={() => toggle(f.id)}
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium text-heading">{f.name}</div>
                  <div className="max-w-md text-body">{f.description}</div>
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-2 font-medium text-heading">
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full ${f.enabled ? 'bg-success' : 'bg-neu-300'}`}
                    />
                    {f.enabled ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-body">
                  {fmtDateTime(f.updated_at)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={toggling.has(f.id)}
                    aria-label={`${f.enabled ? 'Deactivate' : 'Activate'} ${f.name}`}
                    onClick={() => setActive(f, !f.enabled)}
                  >
                    {f.enabled ? 'Deactivate' : 'Activate'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setEditing(f)}>
                    Edit
                  </Button>
                  <Button variant="danger-ghost" size="sm" onClick={() => setDeleting(f)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <FlagFormModal
          flag={editing === 'new' ? null : editing}
          onSave={save}
          onClose={() => setEditing(null)}
        />
      )}
      {merging && selectedFlags.length >= 2 && (
        <MergeDialog sources={selectedFlags} onMerge={merge} onClose={() => setMerging(false)} />
      )}
      {deleting && (
        <Modal
          title="Delete flag?"
          onClose={() => setDeleting(null)}
          footer={
            <>
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => remove(deleting)}>
                Delete
              </Button>
            </>
          }
        >
          <p className="text-sm text-body">
            The agent will stop checking for <strong>{deleting.name}</strong>. Past run results are
            not affected.
          </p>
        </Modal>
      )}
    </div>
  );
}
