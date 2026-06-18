import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { Users, FileSearch, RotateCw, CheckCircle2, XCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const statusBadge = (status) => {
  const s = String(status || '').toLowerCase().replace(/\s+/g, '-');
  if (s === 'match') return 'approved';
  if (s === 'mismatch') return 'danger';
  return 'warning';
};

function ComplianceDashboard() {
  const userName = localStorage.getItem('full_name');
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessResult, setReprocessResult] = useState(null);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/compliance/vendors', {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(response.data || []);
      if (!selectedVendor && response.data?.length > 0) setSelectedVendor(response.data[0]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQueue(); }, []);

  useEffect(() => {
    if (vendors.length > 0 && selectedVendor) {
      const updated = vendors.find((v) => v._id === selectedVendor._id);
      if (updated) setSelectedVendor(updated);
    }
  }, [vendors]);

  const handleReprocessOcr = async () => {
    if (!window.confirm('Re-run OCR on documents with missing extraction data?')) return;
    setReprocessing(true);
    setReprocessResult(null);
    try {
      const token = localStorage.getItem('token');
      const res = await api.post('/admin/reprocess-ocr', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReprocessResult(res.data);
      fetchQueue();
    } catch (err) {
      setReprocessResult({ success: false, message: err.response?.data?.message || err.message });
    } finally {
      setReprocessing(false);
    }
  };

  const selectedComparison = useMemo(() => selectedVendor?.ocrSummary || [], [selectedVendor]);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Compliance Portal</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Welcome, {userName}. Review vendor compliance reports and OCR data.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--review-soft)] text-[var(--review)]">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total Vendors</p>
              <p className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">{vendors.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--warning-soft)] text-[var(--warning)]">
              <FileSearch className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Open Reviews</p>
              <p className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">
                {vendors.filter((v) => v.status === 'Under Review').length}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--success-soft)] text-[var(--success)]">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">OCR Ready</p>
              <p className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">
                {vendors.filter((v) => (v.ocrSummary || []).some((o) => o.matchStatus === 'Match')).length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {reprocessResult && (
        <div className={`mb-4 rounded-[10px] border px-3.5 py-2.5 text-sm font-medium ${
          reprocessResult.success
            ? 'border-[color-mix(in_oklab,var(--success)_18%,transparent)] bg-[var(--success-soft)] text-[var(--success)]'
            : 'border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] text-[var(--danger)]'
        }`}>
          {reprocessResult.success
            ? `OCR reprocessed ${reprocessResult.reprocessed_successfully}/${reprocessResult.total_documents} documents. ${reprocessResult.errors_count} errors.`
            : `Reprocess failed: ${reprocessResult.message}`}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Compliance Queue</CardTitle>
              <CardDescription>Review OCR comparisons for each vendor.</CardDescription>
            </div>
            <Button variant="subtle" size="sm" disabled={reprocessing} onClick={handleReprocessOcr}>
              <RotateCw className={`h-4 w-4 ${reprocessing ? 'animate-spin' : ''}`} />
              {reprocessing ? 'Reprocessing…' : 'Re-run OCR'}
            </Button>
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
              <FileSearch className="h-8 w-8" />
              <p className="text-sm">No vendors in the compliance queue.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
              <div className="space-y-1.5">
                {vendors.map((vendor) => (
                  <button
                    key={vendor._id}
                    type="button"
                    onClick={() => setSelectedVendor(vendor)}
                    className={`w-full rounded-[10px] border px-4 py-3 text-left transition-all duration-150 ${
                      selectedVendor?._id === vendor._id
                        ? 'border-[var(--primary)] bg-[var(--primary-soft)]'
                        : 'border-[var(--border)] bg-[var(--surface-2)] hover:border-[var(--border-strong)]'
                    }`}
                  >
                    <p className="text-sm font-semibold text-[var(--text)]">{vendor.companyName}</p>
                    <p className="text-xs text-[var(--muted)]">{vendor.status || 'Pending'}</p>
                  </button>
                ))}
              </div>

              <div>
                {selectedVendor ? (
                  <div className="rounded-[10px] border border-[var(--border)] p-4">
                    <h3 className="mb-4 text-base font-bold text-[var(--text-strong)]">{selectedVendor.companyName}</h3>
                    {selectedComparison.length === 0 ? (
                      <div className="flex flex-col items-center gap-2 py-8 text-center text-[var(--muted)]">
                        <XCircle className="h-8 w-8" />
                        <p className="text-sm">No OCR comparison data available.</p>
                      </div>
                    ) : (
                      <div className="overflow-auto rounded-[10px] border border-[var(--border)]">
                        <table className="w-full border-collapse">
                          <thead>
                            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                              <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Field</th>
                              <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Submitted</th>
                              <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">OCR</th>
                              <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedComparison.map((item) => (
                              <tr key={item.fieldName} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                                <td className="px-3.5 py-2.5 text-sm font-semibold text-[var(--text)]">{item.fieldName}</td>
                                <td className="max-w-[200px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{item.profileValue || '—'}</td>
                                <td className="max-w-[200px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{item.ocrExtractedValue || '—'}</td>
                                <td className="px-3.5 py-2.5">
                                  <Badge variant={statusBadge(item.matchStatus)}>{item.matchStatus}</Badge>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--muted)]">
                    <Users className="h-8 w-8" />
                    <p className="text-sm">Select a vendor to review.</p>
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

export default ComplianceDashboard;
