import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { ShieldCheck, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/login', { email, password });
      const { token, role, full_name } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('role', role);
      localStorage.setItem('full_name', full_name);
      const routes = {
        Vendor: '/vendor-dashboard',
        'Compliance Officer': '/compliance-dashboard',
        'Finance Team': '/finance-dashboard',
        'Super Admin': '/admin-dashboard',
      };
      navigate(routes[role] || '/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] p-4">
      <div className="w-full max-w-md">
        <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-8 shadow-[var(--shadow)]">
          <div className="mb-6">
            <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-[14px] bg-[var(--primary-soft)] text-[var(--primary)]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Welcome back</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Sign in to your Vendour account</p>
          </div>

          {error && (
            <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Email</label>
              <Input type="email" placeholder="john@example.com" required value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Password</label>
              <Input type="password" placeholder="Enter your password" required value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" size="xl" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">Signing in…</span>
              ) : (
                <span className="flex items-center gap-2"><LogIn className="h-4 w-4" /> Sign In</span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-[var(--primary)] hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
