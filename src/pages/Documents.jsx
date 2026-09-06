import React, { useState } from 'react';
import {
  FileText,
  Upload,
  FolderCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  Trash2,
  Building2,
  KeyRound,
  Download
} from 'lucide-react';

export function Documents({
  documents = [],
  settings = {},
  onUploadDocuments,
  onDeleteDocument,
  onOpenDriveSync,
  onOpenBankConnectors
}) {
  const { driveSyncInfo = {} } = settings;
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setError('');
    setUploading(true);

    try {
      await onUploadDocuments(files);
      setUploading(false);
    } catch (err) {
      setUploading(false);
      setError(err.message || 'Upload failed');
    }
  };

  const handleDelete = async (docId, filename) => {
    if (!window.confirm(`Are you sure you want to delete "${filename}"?`)) return;
    try {
      await onDeleteDocument(docId);
    } catch (err) {
      setError(err.message || 'Failed to delete document');
    }
  };

  return (
    <div className="page-wrapper">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontWeight: 800, color: '#FFFFFF' }}>Document Vault & Automated Ingestion</h2>
          <p style={{ fontSize: '14px', color: '#94A3B8' }}>Automate bank statement extraction via Playwright, Google Drive sync, and receipt storage</p>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', backgroundColor: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.4)', color: '#F87171', borderRadius: '10px', marginBottom: '20px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Top 3 Ingestion Action Cards */}
      <div className="grid-3" style={{ marginBottom: '28px' }}>
        {/* Card 1: Automated Bank Connectors (Playwright) */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '10px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', color: '#FBBF24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building2 size={18} />
                Bank Connectors
              </h3>
              <span className="badge badge-primary">Playwright</span>
            </div>
            <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '14px', lineHeight: '1.4' }}>
              Connect <strong>Chase, BofA, Capital One, Citi, Amex, HDFC, SBI</strong> to automatically extract monthly PDF/CSV statements with 2FA session persistence.
            </p>
          </div>
          <button className="btn btn-primary" onClick={onOpenBankConnectors} style={{ width: '100%', justifyContent: 'center' }}>
            <KeyRound size={16} />
            <span>Manage Bank Sessions</span>
          </button>
        </div>

        {/* Card 2: Manual Upload */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '10px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} color="#818CF8" />
                Upload Statements
              </h3>
            </div>
            <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '14px', lineHeight: '1.4' }}>
              Upload local bank PDFs, CSVs, invoices, or receipts (up to 20MB). Transactions will be parsed automatically.
            </p>
          </div>
          <label className="btn btn-secondary" style={{ cursor: 'pointer', width: '100%', justifyContent: 'center' }}>
            <Upload size={16} />
            <span>{uploading ? 'Uploading...' : 'Choose Files'}</span>
            <input
              type="file"
              multiple
              accept="image/*,application/pdf,.csv,.xlsx,.xls"
              style={{ display: 'none' }}
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {/* Card 3: Google Drive Inbox */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div className="card-header" style={{ marginBottom: '10px' }}>
              <h3 className="card-title" style={{ fontSize: '16px', color: '#FFFFFF', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FolderCheck size={18} color="#34D399" />
                Google Drive Inbox
              </h3>
              <span className="badge badge-success">Auto-Sync</span>
            </div>
            <p style={{ fontSize: '13px', color: '#CBD5E1', marginBottom: '14px', lineHeight: '1.4' }}>
              Folder: <strong style={{ color: '#F8FAFC' }}>{driveSyncInfo.folderName || 'Ledgerly Financial Inbox'}</strong>. Statements dropped in Drive sync automatically.
            </p>
          </div>
          <button className="btn btn-secondary" onClick={onOpenDriveSync} style={{ width: '100%', justifyContent: 'center' }}>
            <RefreshCw size={14} /> View Sync Details
          </button>
        </div>
      </div>

      {/* Document Vault List */}
      <div className="card" style={{ padding: 0 }}>
        <div className="card-header" style={{ padding: '18px 24px', borderBottom: '1px solid #334155' }}>
          <h3 className="card-title" style={{ fontSize: '16px', fontWeight: 800 }}>Document Vault ({documents.length})</h3>
        </div>

        {documents.length > 0 ? (
          <div className="table-container" style={{ border: 'none', borderRadius: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Filename</th>
                  <th>Type</th>
                  <th>Size</th>
                  <th>Source</th>
                  <th>Uploaded Date</th>
                  <th style={{ textAlign: 'center' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map(doc => (
                  <tr key={doc.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={16} color="#FBBF24" />
                        <span style={{ fontWeight: 700, color: '#F8FAFC' }}>{doc.filename}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-info">{doc.type || 'document'}</span>
                    </td>
                    <td style={{ color: '#CBD5E1' }}>
                      {doc.size ? `${(doc.size / 1024).toFixed(1)} KB` : '—'}
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ textTransform: 'capitalize' }}>
                        {doc.source || 'manual_upload'}
                      </span>
                    </td>
                    <td style={{ color: '#94A3B8' }}>
                      {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        {doc.url && (
                          <a
                            href={doc.url}
                            download
                            className="btn btn-ghost btn-sm"
                            style={{ color: '#34D399', padding: '4px' }}
                            title="Download Document"
                          >
                            <Download size={15} />
                          </a>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          style={{ color: '#F87171', padding: '4px' }}
                          title="Delete Document"
                          onClick={() => handleDelete(doc.id, doc.filename)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state" style={{ margin: '32px' }}>
            <div className="empty-state-icon">
              <FileText size={24} />
            </div>
            <h4 className="empty-state-title">No documents yet</h4>
            <p className="empty-state-text">Connect a bank via Playwright or upload statement files to populate your vault.</p>
          </div>
        )}
      </div>
    </div>
  );
}
