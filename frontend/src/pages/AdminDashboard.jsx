import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { ArrowRight, Shield, Users, Wallet, FileClock, Building2, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

function AdminDashboard() {
  const userName = localStorage.getItem('full_name');
  const navigate = useNavigate();
  const [counts, setCounts] = useState({});
  const [analytics, setAnalytics] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/admin/dashboard', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCounts(response.data?.counts || {});
        setAnalytics(response.data?.analytics || {});
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load admin dashboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const metrics = [
    { label: 'Total Vendors', value: counts.totalVendors ?? 0, icon: Building2, color: 'text-[var(--review)] bg-[var(--review-soft)]' },
    { label: 'Draft', value: counts.draftVendors ?? 0, icon: FileClock, color: 'text-[var(--muted)] bg-[var(--surface-3)]' },
    { label: 'Under Review', value: counts.underReviewVendors ?? 0, icon: Clock3, color: 'text-[var(--warning)] bg-[var(--warning-soft)]' },
    { label: 'Compliance Approved', value: counts.complianceApprovedVendors ?? 0, icon: CheckCircle2, color: 'text-[var(--primary)] bg-[var(--primary-soft)]' },
    { label: 'Finance Approved', value: counts.financeApprovedVendors ?? 0, icon: CheckCircle2, color: 'text-[var(--review)] bg-[var(--review-soft)]' },
    { label: 'Active', value: counts.activeVendors ?? 0, icon: Building2, color: 'text-[var(--success)] bg-[var(--success-soft)]' },
    { label: 'Rejected', value: counts.rejectedVendors ?? 0, icon: XCircle, color: 'text-[var(--danger)] bg-[var(--danger-soft)]' },
  ];

  const analyticsCards = [
    { label: 'Approval Rate', value: `${analytics.approvalRate ?? 0}%`, icon: CheckCircle2, color: 'text-[var(--success)] bg-[var(--success-soft)]' },
    { label: 'Rejection Rate', value: `${analytics.rejectionRate ?? 0}%`, icon: XCircle, color: 'text-[var(--danger)] bg-[var(--danger-soft)]' },
    { label: 'Pending Reviews', value: analytics.pendingReviews ?? 0, icon: Clock3, color: 'text-[var(--warning)] bg-[var(--warning-soft)]' },
    { label: 'Active', value: analytics.activeVendors ?? 0, icon: Building2, color: 'text-[var(--primary)] bg-[var(--primary-soft)]' },
  ];

  const roleCards = [
    { title: 'Super Admin', desc: 'Platform oversight and activation control.', icon: Shield },
    { title: 'Compliance Officer', desc: 'Document verification and OCR review.', icon: FileClock },
    { title: 'Finance Team', desc: 'Bank and tax verification gate.', icon: Wallet },
    { title: 'Vendor', desc: 'Self-service onboarding and tracking.', icon: Users },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Admin Dashboard</h1>
          <Badge variant="finance">Executive View</Badge>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Welcome, {userName}. Monitor the onboarding lifecycle, platform health, and vendor governance.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px] ${m.color}`}>
                <m.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{m.label}</p>
                <p className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">
                  {loading ? '…' : m.value}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr]">
        <Card>
          <CardHeader>
            <CardTitle>Operational Analytics</CardTitle>
            <CardDescription>Platform performance and approval funnel metrics.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {analyticsCards.map((a) => (
                <Card key={a.label} className="border-[var(--border)] shadow-none">
                  <CardContent className="flex items-center gap-3 p-4">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] ${a.color}`}>
                      <a.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{a.label}</p>
                      <p className="text-lg font-extrabold tracking-tight text-[var(--text-strong)]">
                        {loading ? '…' : a.value}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/admin-vendors')}>
                Manage Vendors <ArrowRight className="h-4 w-4" />
              </Button>
              <Button variant="secondary" onClick={() => navigate('/admin-audit-logs')}>Audit Logs</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
            <CardDescription>Who can do what across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {roleCards.map((role) => {
              const Icon = role.icon;
              return (
                <div key={role.title} className="flex items-start gap-3 rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)]">{role.title}</p>
                    <p className="text-xs text-[var(--muted)]">{role.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

export default AdminDashboard;
