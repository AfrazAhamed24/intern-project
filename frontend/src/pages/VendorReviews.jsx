import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Search, X, CheckCircle2, XCircle, RotateCw } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

const statusVariant = (status) => {
  const s = String(status || '').toLowerCase().replace(/\s+/g, '-');
  if (s === 'approved' || s === 'match') return 'approved';
  if (s === 'rejected' || s === 'mismatch') return 'danger';
  if (s === 'correction-requested') return 'warning';
  return 'default';
};

const matchVariant = (match) => {
  const m = String(match || '').toLowerCase().replace(/\s+/g, '-');
  if (m === 'match') return 'approved';
  if (m === 'mismatch') return 'danger';
  return 'warning';
};

function VendorReviews() {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/compliance/vendors?status=${statusFilter}&search=${searchTerm}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(response.data);
    } catch {
      setError('Failed to fetch vendors');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchVendors(); }, [searchTerm, statusFilter]);

  const handleAction = async (vendorId, actionType) => {
    if (!window.confirm(`Change status to ${actionType}?`)) return;
    setActionLoading(true);
    const endpoint = actionType === 'Approved' ? 'approve' : actionType === 'Rejected' ? 'reject' : 'correction';
    try {
      const token = localStorage.getItem('token');
      const res = await api.put(`/compliance/vendor/${vendorId}/${endpoint}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.modified_count > 0 || res.data.matched_count > 0) {
        setVendors(vendors.map((v) => (v._id === vendorId ? { ...v, status: actionType } : v)));
        setSelectedVendor(null);
      }
    } catch {
      alert('Action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Vendor Reviews</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Review submitted vendor profiles and manage onboarding status.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Compliance Queue</CardTitle>
          <CardDescription>Review vendor profiles and OCR comparisons.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input className="pl-10" placeholder="Search by company or email…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="min-w-[180px]">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Correction Requested">Correction Requested</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </Select>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-[10px] bg-[var(--surface-3)]" />
              ))}
            </div>
          ) : (
            <div className="overflow-auto rounded-[10px] border border-[var(--border)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Company</th>
                    <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Category</th>
                    <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Region</th>
                    <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Submitted</th>
                    <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Status</th>
                    <th className="px-4 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-4 py-10 text-center text-sm text-[var(--muted)]">
                        No vendors match your search.
                      </td>
                    </tr>
                  ) : (
                    vendors.map((vendor) => (
                      <tr key={vendor._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                        <td className="px-4 py-3 text-sm font-semibold text-[var(--text)]">{vendor.companyName}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text)]">{vendor.category}</td>
                        <td className="px-4 py-3 text-sm text-[var(--text)]">{vendor.region}</td>
                        <td className="px-4 py-3 text-sm text-[var(--muted)]">
                          {vendor.createdAt ? new Date(vendor.createdAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant(vendor.status)}>{vendor.status}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Button size="sm" variant="subtle" onClick={() => setSelectedVendor(vendor)}>
                            Review
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedVendor && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setSelectedVendor(null)}
        >
          <div
            className="w-full max-w-4xl overflow-auto rounded-[16px] border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-lg font-extrabold tracking-tight text-[var(--text-strong)]">{selectedVendor.companyName}</h2>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-[10px] p-0" onClick={() => setSelectedVendor(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">GST</p>
                <p className="text-sm text-[var(--text)]">{selectedVendor.gstNumber}</p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">PAN</p>
                <p className="text-sm text-[var(--text)]">{selectedVendor.panNumber}</p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Contact</p>
                <p className="text-sm text-[var(--text)]">{selectedVendor.contactPerson}</p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Email</p>
                <p className="text-sm text-[var(--text)]">{selectedVendor.email}</p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Phone</p>
                <p className="text-sm text-[var(--text)]">{selectedVendor.phone}</p>
              </div>
              <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Address</p>
                <p className="text-sm text-[var(--text)]">{selectedVendor.address}</p>
              </div>
            </div>

            <h3 className="mb-3 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">OCR Document Verification</h3>
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
                  {(selectedVendor.ocrSummary || []).length === 0 ? (
                    <tr>
                      <td colSpan="4" className="px-3.5 py-8 text-center text-sm text-[var(--muted)]">No OCR comparison data.</td>
                    </tr>
                  ) : (
                    (selectedVendor.ocrSummary || []).map((item) => (
                      <tr key={item.fieldName} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                        <td className="px-3.5 py-2.5 text-sm font-semibold text-[var(--text)]">{item.fieldName}</td>
                        <td className="max-w-[180px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{item.profileValue || '—'}</td>
                        <td className="max-w-[180px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{item.ocrExtractedValue || '—'}</td>
                        <td className="px-3.5 py-2.5">
                          <Badge variant={matchVariant(item.matchStatus)}>{item.matchStatus}</Badge>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-5 flex justify-end gap-3">
              <Button variant="danger" disabled={actionLoading} onClick={() => handleAction(selectedVendor._id, 'Rejected')}>
                <XCircle className="h-4 w-4" /> Reject
              </Button>
              <Button variant="warning" disabled={actionLoading} onClick={() => handleAction(selectedVendor._id, 'Correction Requested')}>
                <RotateCw className="h-4 w-4" /> Request Correction
              </Button>
              <Button variant="success" disabled={actionLoading} onClick={() => handleAction(selectedVendor._id, 'Approved')}>
                <CheckCircle2 className="h-4 w-4" /> Approve
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default VendorReviews;
