import React, { useState, useEffect } from 'react';
import { X, RefreshCw, FolderCheck, Clock, CheckCircle2 } from 'lucide-react';

export function DriveSyncModal({ isOpen, onClose, syncInfo = {}, onTriggerManualSync }) {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSyncClick = async () => {
    setSyncing(true);
    setMessage('');
    try {
      const res = await onTriggerManualSync();
      setSyncing(false);
      setMessage(`Sync complete! ${res.importedCount || 0} transactions imported, ${res.filesStoredCount || 0} files stored, ${res.duplicateCount || 0} duplicates skipped.`);
    } catch (err) {
      setSyncing(false);
      setMessage('Sync failed: ' + err.message);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} aria-modal="true" role="dialog">
      <div className="modal-content" style={{ maxWidth: '520px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <RefreshCw size={20} color="#6558D3" />
            <h2 className="modal-title">Google Drive Sync</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body">
          {message && (
            <div style={{ padding: '12px 14px', backgroundColor: '#ECFDF5', border: '1px solid #6EE7B7', color: '#065F46', borderRadius: '8px', marginBottom: '16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={18} />
              <span>{message}</span>
            </div>
          )}

          <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '12px', border: '1px solid #E2E8F0', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <FolderCheck size={20} color="#6558D3" />
              <div>
                <div style={{ fontWeight: 700, fontSize: '15px' }}>{syncInfo.folderName || 'Ledgerly Financial Inbox'}</div>
                <div style={{ fontSize: '12px', color: '#94A3B8' }}>Dedicated Google Drive import folder</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', marginTop: '12px', fontSize: '13px' }}>
              <div>
                <span style={{ color: '#94A3B8' }}>Schedule:</span>
                <div style={{ fontWeight: 600, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} color="#6558D3" />
                  Daily at 8:00 AM CDT
                </div>
              </div>
              <div>
                <span style={{ color: '#94A3B8' }}>Last Synced:</span>
                <div style={{ fontWeight: 600, color: '#F8FAFC' }}>
                  {syncInfo.lastSyncedAt ? new Date(syncInfo.lastSyncedAt).toLocaleString() : 'Never synced'}
                </div>
              </div>
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: '1.5' }}>
            <strong>How it works:</strong> The ChatGPT Work background automation checks your dedicated Drive folder daily at 8:00 AM CDT and sends new receipts, CSVs, and statements directly to your private Site endpoint (`/api/drive-sync`).
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={syncing}>
            Close
          </button>
          <button className="btn btn-primary" onClick={handleSyncClick} disabled={syncing}>
            <RefreshCw size={16} className={syncing ? 'spin' : ''} />
            <span>{syncing ? 'Syncing...' : 'Sync Now'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
