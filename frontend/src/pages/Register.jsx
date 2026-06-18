import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { ShieldCheck, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';

function Register() {
  const [formData, setFormData] = useState({
    full_name: '', email: '', password: '', role: 'Vendor',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/register', formData);
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
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
            <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Create account</h1>
            <p className="mt-1 text-sm text-[var(--muted)]">Join the Vendour compliance network</p>
          </div>

          {error && (
            <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Full Name</label>
              <Input type="text" placeholder="John Doe" required value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} autoComplete="name" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Email</label>
              <Input type="email" placeholder="john@example.com" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Password</label>
              <Input type="password" placeholder="Create a password" required value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} autoComplete="new-password" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Role</label>
              <Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="Vendor">Vendor</option>
                <option value="Compliance Officer">Compliance Officer</option>
                <option value="Finance Team">Finance Team</option>
                <option value="Super Admin">Super Admin</option>
              </Select>
            </div>
            <Button type="submit" className="w-full" size="xl" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">Creating…</span>
              ) : (
                <span className="flex items-center gap-2"><UserPlus className="h-4 w-4" /> Create Account</span>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-[var(--muted)]">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-[var(--primary)] hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Register;
