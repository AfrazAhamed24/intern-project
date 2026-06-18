import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import { Activity, Filter, Search, Clock3, ListChecks } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge } from '../components/ui/badge';

const actionBadge = (action) => {
  const a = String(action || '').toUpperCase();
  if (a.includes('ACTIVATED')) return 'approved';
  if (a.includes('DEACTIVATED') || a.includes('REJECTED')) return 'danger';
  return 'review';
};

function AdminAuditLogs() {
  const userName = localStorage.getItem('full_name');
  const [logs, setLogs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await api.get('/admin/audit-logs', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setLogs(response.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const haystack = [log.action, log.vendorName, log.performedByName, log.vendorId].join(' ').toLowerCase();
      const matchesSearch = !searchTerm || haystack.includes(searchTerm.toLowerCase());
      const matchesAction = actionFilter === 'All' || String(log.action || '').toUpperCase() === actionFilter.toUpperCase();
      return matchesSearch && matchesAction;
    });
  }, [logs, searchTerm, actionFilter]);

  const actionOptions = ['All', ...new Set(logs.map((l) => l.action).filter(Boolean))];

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Activity Audit</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Welcome, {userName}. Review system actions, filter events, and trace decisions.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">
          {error}
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--primary-soft)] text-[var(--primary)]">
              <ListChecks className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Total Entries</p>
              <p className="text-xl font-extrabold tracking-tight text-[var(--text-strong)]">{logs.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-[var(--review-soft)] text-[var(--review)]">
              <Clock3 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Newest Entry</p>
              <p className="text-base font-bold tracking-tight text-[var(--text-strong)]">
                {logs[0] ? new Date(logs[0].timestamp).toLocaleString() : '—'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>System Audit History</CardTitle>
              <CardDescription>{filteredLogs.length} entries</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
              <Input className="pl-10" placeholder="Search vendor, action, or user…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
            <div className="min-w-[180px]">
              <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
                {actionOptions.map((action) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </Select>
            </div>
            <Button variant="secondary" size="sm" onClick={() => { setSearchTerm(''); setActionFilter('All'); }}>
              <Filter className="h-4 w-4" /> Clear
            </Button>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 animate-pulse rounded-[10px] bg-[var(--surface-3)]" />
              ))}
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-[var(--muted)]">
              <Activity className="h-8 w-8" />
              <p className="text-sm">No audit logs match your filters.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredLogs.map((log) => (
                <div key={log._id} className="rounded-[10px] border border-[var(--border)] bg-[var(--surface-2)] p-3.5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className={`mt-1 h-2 w-2 shrink-0 rounded-full ${actionBadge(log.action) === 'approved' ? 'bg-[var(--success)]' : actionBadge(log.action) === 'danger' ? 'bg-[var(--danger)]' : 'bg-[var(--primary)]'}`} />
                      <div>
                        <p className="text-sm font-semibold text-[var(--text)]">{log.action}</p>
                        <p className="text-xs text-[var(--muted)]">
                          {log.vendorName || log.vendorId || 'Unknown'} · {log.performedByName || log.performedBy || 'System'}
                        </p>
                      </div>
                    </div>
                    <Badge className="shrink-0">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '—'}</Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Badge variant={actionBadge(log.action)}>{log.action}</Badge>
                    <Badge variant="default">Vendor: {log.vendorName || '—'}</Badge>
                    <Badge variant="default">User: {log.performedByName || '—'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Layout>
  );
}

export default AdminAuditLogs;
