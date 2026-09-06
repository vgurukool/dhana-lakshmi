import React, { useState, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';
import { parseCSVString, autoDetectMapping, mapCSVRowToTransaction } from '../utils/csvImporter';

export function ImportModal({ isOpen, onClose, onImportTransactions, onUploadDocuments, accounts = [] }) {
  const [tab, setTab] = useState('csv'); // 'csv' or 'document'
  const [csvFile, setCsvFile] = useState(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({ date: '', merchant: '', amount: '', debit: '', credit: '', category: '', account: '' });
  const [step, setStep] = useState(1); // 1: Select, 2: Map & Preview, 3: Result
  const [importResult, setImportResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Document upload state
  const [docFiles, setDocFiles] = useState([]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setCsvFile(file);
    setError('');

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target.result;
        const { headers, rows } = parseCSVString(text);
        if (headers.length === 0) {
          setError('Could not parse CSV headers. Please check file format.');
          return;
        }
        setCsvHeaders(headers);
        setCsvRows(rows);
        const detected = autoDetectMapping(headers);
        setMapping(detected);
        setStep(2);
      } catch (err) {
        setError('Error reading CSV file: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleRunCsvImport = async () => {
    if (!mapping.date || (!mapping.amount && !mapping.debit && !mapping.credit)) {
      setError('Please select at least a Date column and an Amount or Debit/Credit column.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const defaultAcc = accounts[0] || 'Imported account';
      const parsedTxList = csvRows.map(row => mapCSVRowToTransaction(row, mapping, defaultAcc));
      const validTxList = parsedTxList.filter(t => t.merchant && t.amount > 0);

      const result = await onImportTransactions(validTxList);
      setImportResult(result);
      setStep(3);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Import failed');
    }
  };

  const handleDocUploadSubmit = async () => {
    if (docFiles.length === 0) {
      setError('Please select at least one document file.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await onUploadDocuments(docFiles);
      setImportResult({
        success: true,
        filesStored: result.documents ? result.documents.length : 0,
        message: `${result.documents ? result.documents.length : 0} file(s) stored successfully in R2 and D1.`
      });
      setStep(3);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError(err.message || 'Document upload failed');
    }
  };

  const resetAll = () => {
    setCsvFile(null);
    setCsvHeaders([]);
    setCsvRows([]);
    setStep(1);
    setImportResult(null);
    setDocFiles([]);
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={resetAll} aria-modal="true" role="dialog">
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <h2 className="modal-title">Import Financial Data</h2>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={resetAll}>
            <X size={18} />
          </button>
        </div>

        {/* Tab Switcher */}
        {step === 1 && (
          <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 24px' }}>
            <button
              style={{
                padding: '12px 16px',
                borderBottom: tab === 'csv' ? '2px solid #6558D3' : '2px solid transparent',
                color: tab === 'csv' ? '#6558D3' : '#64748B',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => setTab('csv')}
            >
              CSV Statement
            </button>
            <button
              style={{
                padding: '12px 16px',
                borderBottom: tab === 'document' ? '2px solid #6558D3' : '2px solid transparent',
                color: tab === 'document' ? '#6558D3' : '#64748B',
                fontWeight: 600,
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
              onClick={() => setTab('document')}
            >
              Document Upload
            </button>
          </div>
        )}

        <div className="modal-body">
          {error && (
            <div style={{ padding: '10px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5', color: '#991B1B', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>
              {error}
            </div>
          )}

          {step === 1 && tab === 'csv' && (
            <div className="empty-state" style={{ padding: '36px 20px' }}>
              <div className="empty-state-icon">
                <FileSpreadsheet size={28} />
              </div>
              <h3 className="empty-state-title">Choose bank or credit card CSV statement</h3>
              <p className="empty-state-text">
                Supports all standard bank CSV exports. Columns for Date, Description, Amount, Debit, Credit, Category will be auto-detected.
              </p>
              <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                <Upload size={16} />
                <span>Browse CSV File</span>
                <input type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
              </label>
            </div>
          )}

          {step === 1 && tab === 'document' && (
            <div className="empty-state" style={{ padding: '36px 20px' }}>
              <div className="empty-state-icon">
                <FileText size={28} />
              </div>
              <h3 className="empty-state-title">Upload Receipts, Invoices, or Statements</h3>
              <p className="empty-state-text">
                Original file bytes stored securely in R2 object bucket (max 20 MB per file). Supports PDF, PNG, JPG, CSV, XLSX.
              </p>
              <input
                type="file"
                multiple
                className="form-input"
                accept="image/*,application/pdf,.csv,.xlsx"
                onChange={(e) => setDocFiles(Array.from(e.target.files))}
                style={{ marginBottom: '16px', maxWidth: '360px' }}
              />
              <button className="btn btn-primary" onClick={handleDocUploadSubmit} disabled={docFiles.length === 0 || loading}>
                {loading ? 'Uploading...' : `Upload ${docFiles.length} File(s)`}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <h4 style={{ fontWeight: 700, marginBottom: '12px' }}>Map CSV Columns ({csvRows.length} rows detected)</h4>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Date Column *</label>
                  <select className="form-select" value={mapping.date} onChange={(e) => setMapping({ ...mapping, date: e.target.value })}>
                    <option value="">-- Select --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Merchant / Description *</label>
                  <select className="form-select" value={mapping.merchant} onChange={(e) => setMapping({ ...mapping, merchant: e.target.value })}>
                    <option value="">-- Select --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Column (Combined)</label>
                  <select className="form-select" value={mapping.amount} onChange={(e) => setMapping({ ...mapping, amount: e.target.value })}>
                    <option value="">-- None / Separate --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Debit / Withdrawal Column</label>
                  <select className="form-select" value={mapping.debit} onChange={(e) => setMapping({ ...mapping, debit: e.target.value })}>
                    <option value="">-- None --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Credit / Deposit Column</label>
                  <select className="form-select" value={mapping.credit} onChange={(e) => setMapping({ ...mapping, credit: e.target.value })}>
                    <option value="">-- None --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Category Column</label>
                  <select className="form-select" value={mapping.category} onChange={(e) => setMapping({ ...mapping, category: e.target.value })}>
                    <option value="">-- Needs review --</option>
                    {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Preview First 3 Rows */}
              <div style={{ marginTop: '16px' }}>
                <h5 style={{ fontWeight: 600, fontSize: '13px', color: '#94A3B8', marginBottom: '8px' }}>Preview Sample Rows:</h5>
                <div style={{ backgroundColor: '#F8FAFC', padding: '10px', borderRadius: '8px', fontSize: '12px', border: '1px solid #E2E8F0' }}>
                  {csvRows.slice(0, 3).map((r, i) => (
                    <div key={i} style={{ marginBottom: '4px', borderBottom: i < 2 ? '1px dashed #CBD5E1' : 'none', paddingBottom: '4px' }}>
                      <strong>Row {i + 1}:</strong> {mapping.date ? r[mapping.date] : ''} | {mapping.merchant ? r[mapping.merchant] : ''} | ${mapping.amount ? r[mapping.amount] : (mapping.debit ? r[mapping.debit] : r[mapping.credit])}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && importResult && (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ width: '48px', height: '48px', backgroundColor: '#ECFDF5', color: '#10B981', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                <CheckCircle2 size={28} />
              </div>
              <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>Import Completed</h3>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', margin: '20px 0' }}>
                <div style={{ backgroundColor: '#F8FAFC', padding: '12px 20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: '#10B981' }}>{importResult.insertedCount || importResult.filesStored || 0}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8' }}>New Records</div>
                </div>
                {importResult.duplicateCount !== undefined && (
                  <div style={{ backgroundColor: '#F8FAFC', padding: '12px 20px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: '20px', fontWeight: 800, color: '#F97316' }}>{importResult.duplicateCount}</div>
                    <div style={{ fontSize: '12px', color: '#94A3B8' }}>Duplicates Skipped</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 2 && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep(1)} disabled={loading}>
                Back
              </button>
              <button className="btn btn-primary" onClick={handleRunCsvImport} disabled={loading}>
                {loading ? 'Importing...' : 'Run Import'}
              </button>
            </>
          )}
          {step === 3 && (
            <button className="btn btn-primary" onClick={resetAll}>
              Done
            </button>
          )}
          {step === 1 && (
            <button className="btn btn-secondary" onClick={resetAll}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
