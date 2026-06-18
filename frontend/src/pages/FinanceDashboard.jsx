import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Users, CheckCircle2, XCircle, FileText, RotateCw } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const statusVariant = (status) => {
  const s = String(status || '').toUpperCase();
  if (['ACTIVE', 'FINANCE_APPROVED', 'APPROVED'].includes(s)) return 'approved';
  if (['FINANCE_REJECTED'].includes(s)) return 'danger';
  if (['FINANCE_REVIEW', 'COMPLIANCE_APPROVED', 'UNDER REVIEW'].includes(s)) return 'warning';
  return 'default';
};

function FinanceDashboard() {
  const userName = localStorage.getItem('full_name');
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchQueue = async (preferredId = selectedVendorId) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/finance/vendors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const queue = response.data || [];
      setVendors(queue);
      if (queue.length === 0) {
        setSelectedVendorId('');
        setSelectedVendor(null);
        return;
      }
      const stillVisible = queue.some((v) => v._id === preferredId);
      setSelectedVendorId(stillVisible ? preferredId : queue[0]._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load finance queue.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorDetail = async (vendorId) => {
    if (!vendorId) { setSelectedVendor(null); return; }
    setLoadingDetail(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/finance/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedVendor(response.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vendor details.');
      setSelectedVendor(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);
  useEffect(() => { fetchVendorDetail(selectedVendorId); }, [selectedVendorId]);

  const handleDecision = async (decision) => {
    if (!selectedVendorId) return;
    const label = decision === 'approve' ? 'Approve Finance' : 'Reject Finance';
    if (!window.confirm(`Are you sure you want to ${label.toLowerCase()} for this vendor?`)) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await api.put(`/finance/${decision}/${selectedVendorId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(response.data?.message || 'Finance decision saved.');
      if (response.data?.vendor) setSelectedVendor(response.data.vendor);
      await fetchQueue();
    } catch (err) {
      const message = err.response?.data?.message || 'Finance action failed.';
      const validationErrors = err.response?.data?.errors;
      setError(validationErrors ? `${message} ${validationErrors.join(' ')}` : message);
    } finally {
      setActionLoading(false);
    }
  };

  const selectedOcrSummary = selectedVendor?.ocrSummary || [];
  const selectedDocuments = selectedVendor?.documents || [];
  const financeChecks = selectedVendor
    ? [
        { label: 'GST Exists', passed: Boolean(selectedVendor.gstNumber) },
        { label: 'PAN Exists', passed: Boolean(selectedVendor.panNumber) },
        { label: 'Bank Proof Exists', passed: selectedDocuments.some((doc) => doc.documentType === 'Bank Proof') },
        {
          label: 'Compliance Approved',
          passed: ['COMPLIANCE_APPROVED', 'APPROVED'].includes(String(selectedVendor.complianceStatus || selectedVendor.status || '').toUpperCase()),
        },
      ]
    : [];
  const financeReady = financeChecks.length > 0 && financeChecks.every((c) => c.passed);
  const matchedCount = selectedOcrSummary.filter((i) => i.matchStatus === 'Match').length;

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Finance Overview</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Welcome, {userName}. Review compliance-approved vendors and finalize finance decisions.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--success)_18%,transparent)] bg-[var(--success-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--success)]">{success}</div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--success-soft)] text-[var(--success)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Awaiting Review</p>
              <p className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">{vendors.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--primary-soft)] text-[var(--primary)]">
              <RotateCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">OCR Matches</p>
              <p className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">{matchedCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--review-soft)] text-[var(--review)]">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Uploaded Docs</p>
              <p className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">{selectedDocuments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Financial Review Queue</CardTitle>
              <CardDescription>Compliance-approved vendors awaiting finance decision.</CardDescription>
            </div>
            {selectedVendor && (
              <Badge variant={statusVariant(selectedVendor.financeStatus || 'FINANCE_REVIEW')}>
                {selectedVendor.financeStatus || 'FINANCE_REVIEW'}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-[10px] bg-[var(--surface-3)]" />
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--muted)]">
              <CheckCircle2 className="h-8 w-8" />
              <p className="text-sm">No vendors waiting for finance review.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
              <div className="space-y-1.5">
                {vendors.map((vendor) => (
                  <button
                    key={vendor._id}
                    type="button"
                    onClick={() => setSelectedVendorId(vendor._id)}
                    className={`w-full rounded-[10px] border px-4 py-3 text-left transition-all duration-150 ${
                      selectedVendorId === vendor._id
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--text)]">{vendor.companyName}</p>
                    <p className="text-xs text-[var(--muted)]">{vendor.financeStatus || 'FINANCE_REVIEW'}</p>
                  </button>
                ))}
              </div>

              <div>
                {loadingDetail && !selectedVendor ? (
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-12 animate-pulse rounded-[10px] bg-[var(--surface-3)]" />
                    ))}
                  </div>
                ) : selectedVendor ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Company</p>
                        <p className="text-sm font-semibold text-[var(--text)]">{selectedVendor.companyName || '—'}</p>
                        <p className="text-xs text-[var(--muted)]">{selectedVendor.category || '—'}</p>
                      </div>
                      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Registration</p>
                        <p className="text-sm text-[var(--text)]">GST: {selectedVendor.gstNumber || '—'}</p>
                        <p className="text-sm text-[var(--text)]">PAN: {selectedVendor.panNumber || '—'}</p>
                      </div>
                      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Contact</p>
                        <p className="text-sm text-[var(--text)]">{selectedVendor.contactPerson || '—'}</p>
                        <p className="text-xs text-[var(--muted)]">{selectedVendor.phone || '—'}</p>
                        <p className="text-xs text-[var(--muted)]">{selectedVendor.email || '—'}</p>
                      </div>
                      <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Workflow</p>
                        <div className="flex flex-wrap gap-1.5">
                          <Badge variant={statusVariant(selectedVendor.complianceStatus || selectedVendor.status)}>
                            {selectedVendor.complianceStatus || selectedVendor.status || '—'}
                          </Badge>
                          <Badge variant={statusVariant(selectedVendor.financeStatus || 'FINANCE_REVIEW')}>
                            {selectedVendor.financeStatus || 'FINANCE_REVIEW'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-auto rounded-[10px] border border-[var(--border)]">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Field</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Submitted</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">OCR</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Match</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedOcrSummary.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="px-3.5 py-8 text-center text-sm text-[var(--muted)]">No OCR comparison data.</td>
                            </tr>
                          ) : (
                            selectedOcrSummary.map((item) => (
                              <tr key={item.fieldName} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                                <td className="px-3.5 py-2.5 text-sm font-semibold text-[var(--text)]">{item.fieldName}</td>
                                <td className="max-w-[160px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{item.profileValue || '—'}</td>
                                <td className="max-w-[160px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{item.ocrExtractedValue || '—'}</td>
                                <td className="px-3.5 py-2.5">
                                  <Badge variant={statusVariant(item.matchStatus)}>{item.matchStatus || '—'}</Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="overflow-auto rounded-[10px] border border-[var(--border)]">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Document</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">File</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">OCR</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Uploaded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedDocuments.length === 0 ? (
                            <tr>
                              <td colSpan="4" className="px-3.5 py-8 text-center text-sm text-[var(--muted)]">No documents found.</td>
                            </tr>
                          ) : (
                            selectedDocuments.map((doc) => (
                              <tr key={doc._id || doc.documentType} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                                <td className="px-3.5 py-2.5 text-sm font-semibold text-[var(--text)]">{doc.documentType || '—'}</td>
                                <td className="max-w-[160px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{doc.fileName || '—'}</td>
                                <td className="px-3.5 py-2.5">
                                  <Badge variant={statusVariant(doc.ocrStatus)}>{doc.ocrStatus || 'Not Detected'}</Badge>
                                </td>
                                <td className="px-3.5 py-2.5 text-sm text-[var(--muted)]">
                                  {doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-[1.2fr_0.8fr]">
                      <div className="space-y-1.5">
                        {financeChecks.map((check) => (
                          <div
                            key={check.label}
                            className={`flex items-center justify-between rounded-[8px] border px-3.5 py-2.5 ${
                              check.passed
                                ? 'border-[color-mix(in_oklab,var(--success)_18%,transparent)] bg-[var(--success-soft)]'
                                : 'border-[color-mix(in_oklab,var(--danger)_16%,transparent)] bg-[var(--danger-soft)]'
                            }`}
                          >
                            <span className="text-sm text-[var(--text)]">{check.label}</span>
                            <Badge variant={check.passed ? 'approved' : 'danger'}>{check.passed ? 'Ready' : 'Missing'}</Badge>
                          </div>
                        ))}
                      </div>
                      <div className="flex flex-col items-start gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-4">
                        <Badge variant={financeReady ? 'approved' : 'danger'}>
                          {financeReady ? 'Finance Ready' : 'Needs Attention'}
                        </Badge>
                        <p className="text-xs leading-relaxed text-[var(--muted)]">
                          {financeReady
                            ? 'All finance prerequisites are available for approval.'
                            : 'Resolve missing documents or compliance status before approving.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button variant="danger" disabled={actionLoading} onClick={() => handleDecision('reject')}>
                        <XCircle className="h-4 w-4" /> Reject Finance
                      </Button>
                      <Button variant="success" disabled={actionLoading} onClick={() => handleDecision('approve')}>
                        <CheckCircle2 className="h-4 w-4" /> Approve Finance
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--muted)]">
                    <Users className="h-8 w-8" />
                    <p className="text-sm">Select a vendor to inspect finance readiness.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}

export default FinanceDashboard;
