import { useState } from 'react';
import { Alert, Tag, type AlertKind } from '@/components/ui';
import { ApiError, useApi } from '../api';
import { DocumentRow } from '../components/DocumentRow';
import { FileUploader } from '../components/FileUploader';
import { isWorking } from '../components/StatusBadge';
import { useAsync, usePolling } from '../hooks/useAsync';

export function DemandTab() {
  const api = useApi();
  const docs = useAsync(() => api.listDemand(), []);
  const [flash, setFlash] = useState<{ kind: AlertKind; text: string }>();

  const list = docs.data ?? [];
  usePolling(
    list.some((d) => isWorking(d.status)),
    2000,
    docs.reload,
  );
  // The newest ready document is the one new chats use. The list is newest-first.
  const inUseId = list.find((d) => d.status === 'ready')?.id;

  async function upload(file: File) {
    setFlash(undefined);
    try {
      const { reused } = await api.uploadDemand(file);
      setFlash(
        reused
          ? { kind: 'info', text: 'This file was uploaded before, so the earlier copy is used.' }
          : { kind: 'success', text: 'Uploaded. We are reading it now.' },
      );
      docs.reload();
    } catch (e) {
      setFlash({ kind: 'error', text: e instanceof ApiError ? e.detail : 'Upload failed.' });
    }
  }

  return (
    <div className="stack">
      <h2>Demand document</h2>
      <p>The client demand the chat is about. New chats use the newest document that is ready.</p>
      {flash && <Alert kind={flash.kind}>{flash.text}</Alert>}
      <FileUploader
        label="Demand document"
        buttonLabel="Upload the demand document"
        onUpload={upload}
      />
      {docs.error && <Alert kind="error">{docs.error}</Alert>}
      {!docs.loading && list.length === 0 && <p>No demand document has been uploaded.</p>}
      <div className="stack-sm">
        {list.map((d) => (
          <DocumentRow
            key={d.id}
            doc={d}
            meta={<span>by {d.uploaded_by}</span>}
            badge={d.id === inUseId ? <Tag kind="success">In use</Tag> : null}
            loadText={() => api.getDemand(d.id)}
            onDelete={() => api.deleteDemand(d.id)}
            onDeleted={docs.reload}
          />
        ))}
      </div>
    </div>
  );
}
