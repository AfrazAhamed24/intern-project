import { useState, useEffect } from 'react';
import api from '../lib/api';
import {
  FileText,
  ShieldCheck,
  Clock,
  CheckCircle2,
  ArrowRight,
  Upload,
  Activity,

  Building2,
} from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

function VendorDashboard() {
  const [profileStatus, setProfileStatus] = useState('Not Created');
  const [documents, setDocuments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const token = localStorage.getItem('token');
        const [profileRes, docsRes] = await Promise.all([
          api.get('/vendor/profile', { headers: { Authorization: `Bearer ${token}` } }),
          api.get('/vendor/documents', { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (profileRes.data) {
          setProfile(profileRes.data);
          setProfileStatus(profileRes.data.status || 'Draft');
        }
        setDocuments(docsRes.data || []);
      } catch (err) {
        if (err.response && err.response.status === 404) {
          setProfileStatus('Not Created');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOverview();
  }, []);

  const statusVariant = (() => {
    const s = String(profileStatus || '').toUpperCase();
    if (['ACTIVE', 'FINANCE_APPROVED', 'COMPLIANCE_APPROVED', 'APPROVED'].includes(s)) return 'approved';
    if (['FINANCE_REVIEW', 'UNDER REVIEW'].includes(s)) return 'finance';
    if (['CORRECTION REQUESTED'].includes(s)) return 'warning';
    if (['REJECTED', 'FINANCE_REJECTED'].includes(s)) return 'danger';
    return 'default';
  })();

  const timeline = [
    { title: 'Profile created', desc: profile ? 'Company profile saved.' : 'Create your company profile.', icon: FileText, done: !!profile },
    { title: 'Compliance review', desc: 'Compliance checks documents & OCR.', icon: ShieldCheck, done: ['Under Review', 'COMPLIANCE_APPROVED', 'FINANCE_REVIEW', 'FINANCE_APPROVED', 'ACTIVE'].includes(profileStatus) },
    { title: 'Finance verification', desc: 'Finance validates bank & tax.', icon: Clock, done: ['FINANCE_REVIEW', 'FINANCE_APPROVED', 'ACTIVE'].includes(profileStatus) },
    { title: 'Vendor activated', desc: 'Eligible for procurement.', icon: CheckCircle2, done: profileStatus === 'ACTIVE' },
  ];

  const handleSubmitReview = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.post('/vendor/submit-review', {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data.success) setProfileStatus('Under Review');
    } catch { /* ignore */ }
  };

  const statCards = [
    { label: 'Documents', value: loading ? '…' : documents.length, icon: Upload, color: 'text-[var(--primary)] bg-[var(--primary-soft)]' },
    { label: 'Status', value: profileStatus, icon: Activity, color: 'text-[var(--success)] bg-[var(--success-soft)]' },
    { label: 'Readiness', value: profileStatus === 'ACTIVE' ? 'Live' : 'In Progress', icon: Building2, color: 'text-[var(--review)] bg-[var(--review-soft)]' },
  ];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Vendor Dashboard</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Track your onboarding stage, document readiness, and compliance journey.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex h-11 w-11 items-center justify-center rounded-[12px] ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{s.label}</p>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">{s.value}</span>
                  {s.label === 'Status' && (
                    <Badge variant={statusVariant}>{profileStatus}</Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Timeline</CardTitle>
            <CardDescription>Linear view of the vendor journey from draft to activation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.title} className="flex items-start gap-3 rounded-[12px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      step.done
                        ? 'border-[var(--success)] bg-[var(--success-soft)] text-[var(--success)]'
                        : 'border-[var(--border-strong)] bg-[var(--surface)] text-[var(--muted)]'
                    }`}
                  >
                    {step.done ? <CheckCircle2 className="h-3 w-3" /> : <div className="h-2 w-2 rounded-full bg-[var(--border-strong)]" />}
                  </div>
                  <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${step.done ? 'text-[var(--success)]' : 'text-[var(--muted)]'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--text)]">{step.title}</p>
                    <p className="text-xs text-[var(--muted)]">{step.desc}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Document Summary</CardTitle>
                  <CardDescription>Uploaded artifacts and review state.</CardDescription>
                </div>
                {(profileStatus === 'Draft' || profileStatus === 'Correction Requested') && (
                  <Button size="sm" variant="subtle" onClick={handleSubmitReview}>Submit for Review</Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-11 animate-pulse rounded-[10px] bg-[var(--surface-3)]" />
                  ))}
                </div>
              ) : documents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-[var(--muted)]">
                  <Upload className="h-8 w-8" />
                  <p className="text-sm">No documents uploaded yet.</p>
                </div>
              ) : (
                documents.slice(0, 5).map((doc) => (
                  <div key={doc._id || doc.documentType} className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[var(--text)]">{doc.documentType}</p>
                      <p className="truncate text-xs text-[var(--muted)]">{doc.fileName}</p>
                    </div>
                    <Badge variant={statusVariant}>{doc.ocrStatus || 'Pending'}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest onboarding changes.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--text)]">Current stage</p>
                    <p className="text-xs text-[var(--muted)]">{profileStatus}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-[var(--muted)]" />
                </div>
                <div className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] px-3.5 py-3 text-xs text-[var(--muted)]">
                  {profile ? `Profile loaded for ${profile.companyName}.` : 'Create your profile to begin onboarding.'}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

export default VendorDashboard;
