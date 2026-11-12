import { useState, type ReactNode } from 'react';
import { Alert, Button, Card, Spinner } from '@/components/ui';
import { ApiError } from '../api';
import { useAsync } from '../hooks/useAsync';
import { MarkdownPreview } from './MarkdownPreview';
import { StatusBadge, isWorking, shortDate } from './StatusBadge';

type Doc = {
  id: string;
  filename: string;
  status: string;
  error: string | null;
  created_at: string;
};

type Props = {
  doc: Doc;
  /** Extra text after the date, e.g. "by admin". */
  meta?: ReactNode;
  badge?: ReactNode;
  loadText: () => Promise<{ content: { text: string } | null }>;
  onDelete: () => Promise<void>;
  onDeleted: () => void;
};

/** One uploaded document (resume or demand document): status, extracted text, delete. */
export function DocumentRow({ doc, meta, badge, loadText, onDelete, onDeleted }: Props) {
  const [open, setOpen] = useState(doc.status !== 'ready');
  const [deleteError, setDeleteError] = useState<string>();
  const [deleting, setDeleting] = useState(false);
  const text = useAsync(loadText, [doc.id, doc.status]);

  async function remove() {
    setDeleting(true);
    setDeleteError(undefined);
    try {
      await onDelete();
      onDeleted();
    } catch (e) {
      // 409 = a chat uses this document. Show the server's reason as is.
      setDeleteError(e instanceof ApiError ? e.detail : 'Could not delete.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Card>
      <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
        <summary>
          <span className="row" style={{ display: 'inline-flex' }}>
            <StatusBadge status={doc.status} />
            <strong>{doc.filename}</strong>
            <span>{shortDate(doc.created_at)}</span>
            {meta}
            {badge}
          </span>
        </summary>
        <div className="stack" style={{ marginTop: 'var(--space-3)' }}>
          {isWorking(doc.status) && <Spinner label="Reading the file" />}
          {doc.error && <Alert kind="error">{doc.error}</Alert>}
          {deleteError && <Alert kind="error">{deleteError}</Alert>}
          {doc.status === 'ready' && (
            <div className="stack-sm">
              <h3>
                Extracted text
                {text.data?.content ? ` (${text.data.content.text.length} characters)` : ''}
              </h3>
              {text.loading && <Spinner />}
              {text.error && <Alert kind="error">{text.error}</Alert>}
              {text.data?.content && <MarkdownPreview text={text.data.content.text} />}
            </div>
          )}
          {doc.status !== 'extracting' && (
            <div>
              <Button variant="secondary" compact onClick={remove} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          )}
        </div>
      </details>
    </Card>
  );
}
