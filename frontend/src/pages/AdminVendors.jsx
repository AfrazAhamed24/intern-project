import { useEffect, useState } from 'react';
import api from '../lib/api';
import { Search, X, CheckCircle2, RotateCw, Eye, Building2, FileText, MapPin, User, Mail, Phone, MapPinned } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

const statusVariant = (status) => {
  const s = String(status || '').toUpperCase();
  if (['ACTIVE', 'FINANCE_APPROVED', 'COMPLIANCE_APPROVED', 'APPROVED'].includes(s)) return 'approved';
  if (['REJECTED', 'FINANCE_REJECTED', 'INACTIVE'].includes(s)) return 'danger';
  if (['UNDER REVIEW', 'DRAFT', 'FINANCE_REVIEW'].includes(s)) return 'warning';
  return 'default';
};

function AdminVendors() {
  const userName = localStorage.getItem('full_name');
  const [vendors, setVendors] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [regionFilter, setRegionFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchVendors = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/admin/vendors', {
        headers: { Authorization: `Bearer ${token}` },
        params: { search: searchTerm, status: statusFilter, category: categoryFilter, region: regionFilter },
      });
      setVendors(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vendors.');
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorDetail = async (vendorId) => {
    if (!vendorId) { setSelectedVendor(null); return; }
    setDetailLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const response = await api.get(`/admin/vendor/${vendorId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedVendor(response.data || null);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load vendor details.');
      setSelectedVendor(null);
    } finally {
      setDetailLoading(false);
    }
  };

  useEffect(() => { fetchVendors(); }, [searchTerm, statusFilter, categoryFilter, regionFilter]);

  const resolveName = (v) => v?.companyName || v?.profile?.companyName || '—';
  const resolveField = (v, f) => v?.[f] || v?.profile?.[f] || '—';

  const handleAction = async (vendorId, action) => {
    if (!window.confirm(`Are you sure you want to ${action} this vendor?`)) return;
    setActionLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const response = await api.put(`/admin/vendor/${vendorId}/${action}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccess(response.data?.message || 'Vendor updated.');
      if (response.data?.vendor) setSelectedVendor(response.data.vendor);
      setDetailOpen(true);
      await fetchVendors();
      await fetchVendorDetail(vendorId);
    } catch (err) {
      setError(err.response?.data?.message || 'Vendor action failed.');
    } finally {
      setActionLoading(false);
    }
  };

  const openDetail = (vendorId) => {
    fetchVendorDetail(vendorId);
    setDetailOpen(true);
  };

  const detailSections = selectedVendor
    ? [
        { title: 'Profile', icon: User, items: [
            { label: 'Contact', value: resolveField(selectedVendor, 'contactPerson'), icon: User },
            { label: 'Email', value: resolveField(selectedVendor, 'email'), icon: Mail },
            { label: 'Phone', value: resolveField(selectedVendor, 'phone'), icon: Phone },
          ] },
        { title: 'Workflow', icon: RotateCw, items: [
            { label: 'Status', value: selectedVendor.currentWorkflowStatus || selectedVendor.status || '—', badge: true },
            { label: 'Compliance', value: selectedVendor.complianceStatus || '—', badge: true },
            { label: 'Finance', value: selectedVendor.financeStatus || '—', badge: true },
          ] },
        { title: 'Registration', icon: FileText, items: [
            { label: 'GST', value: resolveField(selectedVendor, 'gstNumber') },
            { label: 'PAN', value: resolveField(selectedVendor, 'panNumber') },
            { label: 'Category', value: resolveField(selectedVendor, 'category') },
            { label: 'Region', value: resolveField(selectedVendor, 'region') },
          ] },
        { title: 'Location', icon: MapPinned, items: [
            { label: 'Address', value: resolveField(selectedVendor, 'address') },
          ] },
      ]
    : [];

  const DetailCard = ({ section }) => (
    <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
      <div className="mb-2 flex items-center gap-2">
        <section.icon className="h-3.5 w-3.5 text-[var(--muted)]" />
        <p className="text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">{section.title}</p>
      </div>
      {section.items.map((item) => (
        <p key={item.label} className="py-0.5 text-sm text-[var(--text)]">
          {item.badge ? (
            <Badge variant={statusVariant(item.value)} className="mr-1">{item.value}</Badge>
          ) : (
            <><span className="text-[var(--muted)]">{item.label}:</span> {item.value}</>
          )}
        </p>
      ))}
    </div>
  );

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Vendor Management</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Welcome, {userName}. Review vendor status, OCR data, and lifecycle actions.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--success)_18%,transparent)] bg-[var(--success-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--success)]">{success}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>All Vendors</CardTitle>
          <CardDescription>{vendors.length} vendors found.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input className="pl-10" placeholder="Search company, GST, PAN, email…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="min-w-[160px]">
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Under Review">Under Review</option>
                <option value="COMPLIANCE_APPROVED">Compliance Approved</option>
                <option value="FINANCE_REVIEW">Finance Review</option>
                <option value="FINANCE_APPROVED">Finance Approved</option>
                <option value="ACTIVE">Active</option>
                <option value="FINANCE_REJECTED">Finance Rejected</option>
                <option value="INACTIVE">Inactive</option>
              </Select>
            </div>
            <div className="min-w-[160px]">
              <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="All">All Categories</option>
                <option value="IT Services">IT Services</option>
                <option value="Consulting">Consulting</option>
                <option value="Hardware Supplier">Hardware Supplier</option>
                <option value="Logistics">Logistics</option>
                <option value="Other">Other</option>
              </Select>
            </div>
            <div className="min-w-[140px]">
              <Select value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
                <option value="All">All Regions</option>
                <option value="North">North</option>
                <option value="South">South</option>
                <option value="East">East</option>
                <option value="West">West</option>
                <option value="International">International</option>
              </Select>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setSearchTerm(''); setStatusFilter('All'); setCategoryFilter('All'); setRegionFilter('All'); }}>
              Clear Filters
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-[10px] bg-[var(--surface-3)]" />
              ))}
            </div>
          ) : vendors.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--muted)]">
              <Building2 className="h-8 w-8" />
              <p className="text-sm">No vendors found.</p>
            </div>
          ) : (
            <div className="overflow-auto rounded-[10px] border border-[var(--border)]">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                    <th className="whitespace-nowrap px-3.5 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Vendor</th>
                    <th className="whitespace-nowrap px-3.5 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">GST</th>
                    <th className="whitespace-nowrap px-3.5 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">PAN</th>
                    <th className="whitespace-nowrap px-3.5 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Compliance</th>
                    <th className="whitespace-nowrap px-3.5 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Finance</th>
                    <th className="whitespace-nowrap px-3.5 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Status</th>
                    <th className="whitespace-nowrap px-3.5 py-3 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((vendor) => (
                    <tr key={vendor._id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                      <td className="px-3.5 py-3 text-sm font-semibold text-[var(--text)]">{resolveName(vendor)}</td>
                      <td className="max-w-[140px] truncate px-3.5 py-3 text-sm text-[var(--text)]">{resolveField(vendor, 'gstNumber')}</td>
                      <td className="max-w-[140px] truncate px-3.5 py-3 text-sm text-[var(--text)]">{resolveField(vendor, 'panNumber')}</td>
                      <td className="px-3.5 py-3"><Badge variant={statusVariant(vendor.complianceStatus)}>{vendor.complianceStatus || '—'}</Badge></td>
                      <td className="px-3.5 py-3"><Badge variant={statusVariant(vendor.financeStatus)}>{vendor.financeStatus || '—'}</Badge></td>
                      <td className="px-3.5 py-3"><Badge variant={statusVariant(vendor.currentWorkflowStatus)}>{vendor.currentWorkflowStatus || vendor.status || '—'}</Badge></td>
                      <td className="px-3.5 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <Button variant="subtle" size="sm" onClick={() => openDetail(vendor._id)}>
                            <Eye className="h-3.5 w-3.5" /> View
                          </Button>
                          <Button variant="success" size="sm" disabled={actionLoading} onClick={() => handleAction(vendor._id, 'activate')}>
                            <CheckCircle2 className="h-3.5 w-3.5" /> Activate
                          </Button>
                          <Button variant="danger" size="sm" disabled={actionLoading} onClick={() => handleAction(vendor._id, 'deactivate')}>
                            <X className="h-3.5 w-3.5" /> Deactivate
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {detailOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
          onClick={() => setDetailOpen(false)}
        >
          <div
            className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-[16px] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
              <h2 className="text-lg font-extrabold tracking-tight text-[var(--text-strong)]">
                {selectedVendor ? resolveName(selectedVendor) : 'Vendor Details'}
              </h2>
              <Button variant="ghost" size="sm" className="h-9 w-9 rounded-[10px] p-0" onClick={() => setDetailOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-auto p-5">
              {detailLoading && !selectedVendor ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-16 animate-pulse rounded-[10px] bg-[var(--surface-3)]" />
                  ))}
                </div>
              ) : selectedVendor ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {detailSections.map((section) => (
                      <DetailCard key={section.title} section={section} />
                    ))}
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">
                      <FileText className="h-3.5 w-3.5" /> OCR Details
                    </h3>
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
                          {(selectedVendor.ocrSummary || []).length === 0 ? (
                            <tr>
                              <td colSpan="4" className="px-3.5 py-8 text-center text-sm text-[var(--muted)]">No OCR summary available.</td>
                            </tr>
                          ) : (
                            (selectedVendor.ocrSummary || []).map((item) => (
                              <tr key={item.fieldName} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                                <td className="px-3.5 py-2.5 text-sm font-semibold text-[var(--text)]">{item.fieldName}</td>
                                <td className="max-w-[180px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{item.profileValue || '—'}</td>
                                <td className="max-w-[180px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{item.ocrExtractedValue || '—'}</td>
                                <td className="px-3.5 py-2.5">
                                  <Badge variant={statusVariant(item.matchStatus)}>{item.matchStatus || '—'}</Badge>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-3 flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">
                      <MapPin className="h-3.5 w-3.5" /> Documents
                    </h3>
                    <div className="overflow-auto rounded-[10px] border border-[var(--border)]">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Type</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">File</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">OCR</th>
                            <th className="px-3.5 py-2.5 text-left text-[0.65rem] font-bold uppercase tracking-wider text-[var(--muted)]">Uploaded</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(selectedVendor.documents || []).length === 0 ? (
                            <tr>
                              <td colSpan="4" className="px-3.5 py-8 text-center text-sm text-[var(--muted)]">No documents available.</td>
                            </tr>
                          ) : (
                            (selectedVendor.documents || []).map((doc) => (
                              <tr key={doc._id || `${doc.documentType}-${doc.fileName}`} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-2)]">
                                <td className="px-3.5 py-2.5 text-sm font-semibold text-[var(--text)]">{doc.documentType || '—'}</td>
                                <td className="max-w-[180px] truncate px-3.5 py-2.5 text-sm text-[var(--text)]">{doc.fileName || '—'}</td>
                                <td className="px-3.5 py-2.5">
                                  <Badge variant={statusVariant(doc.ocrStatus)}>{doc.ocrStatus || '—'}</Badge>
                                </td>
                                <td className="px-3.5 py-2.5 text-sm text-[var(--muted)]">
                                  {doc.uploadDate ? new Date(doc.uploadDate).toLocaleString() : '—'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--muted)]">
                  <Building2 className="h-8 w-8" />
                  <p className="text-sm">Select a vendor to inspect details.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default AdminVendors;
