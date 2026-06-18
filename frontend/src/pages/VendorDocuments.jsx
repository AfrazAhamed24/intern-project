import { useState, useEffect } from 'react';
import api from '../lib/api';
import { FileText, Upload, Trash2, ShieldCheck, Landmark, ScrollText, Fingerprint } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent } from '../components/ui/card';

const REQUIRED_DOCUMENTS = [
  { type: 'GST Certificate', icon: ScrollText, desc: 'Goods and Services Tax registration certificate.' },
  { type: 'PAN Card', icon: Fingerprint, desc: 'Permanent Account Number card of the business/proprietor.' },
  { type: 'Trade License', icon: ShieldCheck, desc: 'Official trade license issued by local municipality.' },
  { type: 'Bank Proof', icon: Landmark, desc: 'Cancelled cheque or bank statement copy.' },
  { type: 'Insurance Certificate', icon: FileText, desc: 'Business liability or asset insurance certificate.' },
];

const statusVariant = (status) => {
  const s = String(status || '').toUpperCase();
  if (s === 'DETECTED') return 'approved';
  if (s === 'NOT DETECTED') return 'warning';
  return 'default';
};

function VendorDocuments() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadingType, setUploadingType] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [profileStatus, setProfileStatus] = useState('Not Created');
  const [submitResult, setSubmitResult] = useState(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/vendor/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (response.data && response.data.status) setProfileStatus(response.data.status);
      } catch { /* ignore */ }
    };
    fetchStatus();
  }, []);

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/vendor/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDocuments(response.data);
    } catch {
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDocuments(); }, []);

  const handleUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingType(type);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const fileData = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Unable to read file'));
        reader.readAsDataURL(file);
      });
      const response = await api.post('/vendor/document', {
        documentType: type,
        fileName: file.name,
        fileData: ['GST Certificate', 'PAN Card'].includes(type) ? fileData : null,
      }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.success) {
        const doc = response.data.document;
        setSuccess(
          doc.ocrStatus === 'Detected'
            ? `${type} uploaded & OCR processed.`
            : `${type} uploaded.`,
        );
        fetchDocuments();
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to upload ${type}.`);
    } finally {
      setUploadingType(null);
      e.target.value = '';
    }
  };

  const handleDelete = async (id, type) => {
    if (!window.confirm(`Delete the uploaded document for ${type}?`)) return;
    setDeletingId(id);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await api.delete(`/vendor/document/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) {
        setSuccess(`${type} deleted.`);
        fetchDocuments();
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to delete ${type}.`);
    } finally {
      setDeletingId(null);
    }
  };

  const getDocForType = (type) => documents.find((doc) => doc.documentType === type);
  const role = localStorage.getItem('role') || '';
  const canSubmit = role.toLowerCase() === 'vendor' && (profileStatus.toLowerCase() === 'draft' || profileStatus.toLowerCase() === 'correction requested');

  const handleSubmitReview = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/vendor/submit-review', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSubmitResult(res.data.message);
      if (res.data.success) setProfileStatus('Under Review');
    } catch (err) {
      setSubmitResult(err.response?.data?.message || 'Submission failed.');
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Compliance Documents</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Upload and manage your business credentials for onboarding verification.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--success)_18%,transparent)] bg-[var(--success-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--success)]">{success}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-[16px] border border-[var(--border)] bg-[var(--surface-3)]" />
          ))}
        </div>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {REQUIRED_DOCUMENTS.map((reqDoc) => {
              const doc = getDocForType(reqDoc.type);
              const isUploading = uploadingType === reqDoc.type;
              const isDeleting = doc && deletingId === doc._id;
              const Icon = reqDoc.icon;

              return (
                <Card key={reqDoc.type} className={`flex flex-col ${doc ? 'ring-1 ring-[var(--success)]/20' : ''}`}>
                  <CardContent className="flex flex-1 flex-col p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--surface-2)] text-[var(--muted)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant={doc ? 'approved' : 'warning'}>{doc ? 'Uploaded' : 'Pending'}</Badge>
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-[var(--text)]">{reqDoc.type}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--muted)]">{reqDoc.desc}</p>

                    {doc ? (
                      <div className="mt-auto space-y-1.5 pt-3">
                        <div className="rounded-[8px] border border-[var(--border)] bg-[var(--surface-2)] p-2.5 text-xs">
                          <div className="flex justify-between gap-2">
                            <span className="text-[var(--muted)]">File:</span>
                            <span className="max-w-[140px] truncate font-semibold text-[var(--text)]" title={doc.fileName}>{doc.fileName}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-[var(--muted)]">Date:</span>
                            <span className="text-[var(--text)]">
                              {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : '—'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="text-[var(--muted)]">OCR:</span>
                            <Badge variant={statusVariant(doc.ocrStatus)} className="text-[10px]">{doc.ocrStatus || 'Not Detected'}</Badge>
                          </div>
                        </div>
                        <Button variant="danger" size="sm" className="w-full" disabled={isDeleting} onClick={() => handleDelete(doc._id, reqDoc.type)}>
                          <Trash2 className="h-3.5 w-3.5" />
                          {isDeleting ? 'Deleting…' : 'Remove'}
                        </Button>
                      </div>
                    ) : (
                      <div className="mt-auto pt-3">
                        <label className="cursor-pointer">
                          <Button variant="default" size="sm" className="w-full" disabled={isUploading} asChild>
                            <span>
                              <Upload className="h-3.5 w-3.5" />
                              {isUploading ? 'Uploading…' : 'Upload'}
                            </span>
                          </Button>
                          <input type="file" onChange={(e) => handleUpload(e, reqDoc.type)} disabled={isUploading} className="hidden" />
                        </label>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {canSubmit && (
            <div className="flex items-center justify-between rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
              <p className="text-sm text-[var(--muted)]">All documents uploaded? Submit for compliance review.</p>
              <Button onClick={handleSubmitReview}>Submit for Review</Button>
            </div>
          )}
          {submitResult && (
            <p className="mt-2 text-sm text-[var(--muted)]">{submitResult}</p>
          )}
        </>
      )}
    </Layout>
  );
}

export default VendorDocuments;
