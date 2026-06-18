import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Save, Building2 } from 'lucide-react';
import Layout from '../components/Layout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

function VendorProfile() {
  const [formData, setFormData] = useState({
    companyName: '', gstNumber: '', panNumber: '', contactPerson: '',
    phone: '', email: '', address: '', category: 'IT Services', region: 'North',
  });
  const [initialLoad, setInitialLoad] = useState(true);
  const [isExisting, setIsExisting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await api.get('/vendor/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.data) {
        setFormData({
          companyName: response.data.companyName || '',
          gstNumber: response.data.gstNumber || '',
          panNumber: response.data.panNumber || '',
          contactPerson: response.data.contactPerson || '',
          phone: response.data.phone || '',
          email: response.data.email || '',
          address: response.data.address || '',
          category: response.data.category || 'IT Services',
          region: response.data.region || 'North',
        });
        setIsExisting(true);
      }
    } catch (err) {
      if (err.response && err.response.status !== 404) setError('Failed to fetch profile.');
    } finally {
      setInitialLoad(false);
    }
  };
  useEffect(() => { fetchProfile(); }, []);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (isExisting) {
        await api.put('/vendor/profile', formData, config);
        setSuccess('Profile updated successfully.');
      } else {
        await api.post('/vendor/profile', formData, config);
        setSuccess('Profile created successfully.');
        setIsExisting(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-[var(--text-strong)]">Company Profile</h1>
        <p className="mt-1 text-sm text-[var(--muted)]">Manage your vendor details and registration entities.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--danger)_18%,transparent)] bg-[var(--danger-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--danger)]">{error}</div>
      )}
      {success && (
        <div className="mb-4 rounded-[10px] border border-[color-mix(in_oklab,var(--success)_18%,transparent)] bg-[var(--success-soft)] px-3.5 py-2.5 text-sm font-medium text-[var(--success)]">{success}</div>
      )}

      {initialLoad ? (
        <div className="flex items-center justify-center rounded-[16px] border border-dashed border-[var(--border)] py-16 text-sm text-[var(--muted)]">Loading profile data…</div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-[var(--primary-soft)] text-[var(--primary)]">
                <Building2 className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>{isExisting ? 'Edit Profile' : 'Create Profile'}</CardTitle>
                <CardDescription>Fill in your official business details.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Company Name</label>
                  <Input name="companyName" required value={formData.companyName} onChange={handleChange} placeholder="Global Tech Partners LLC" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">GST Number</label>
                  <Input name="gstNumber" required value={formData.gstNumber} onChange={handleChange} placeholder="GSTIN" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">PAN Number</label>
                  <Input name="panNumber" required value={formData.panNumber} onChange={handleChange} placeholder="PAN / VAT" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Contact Person</label>
                  <Input name="contactPerson" required value={formData.contactPerson} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Phone</label>
                  <Input name="phone" type="tel" required value={formData.phone} onChange={handleChange} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Official Email</label>
                  <Input name="email" type="email" required value={formData.email} onChange={handleChange} />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Registered Address</label>
                  <Input name="address" required value={formData.address} onChange={handleChange} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Category</label>
                  <Select name="category" value={formData.category} onChange={handleChange}>
                    <option value="IT Services">IT Services</option>
                    <option value="Consulting">Consulting</option>
                    <option value="Hardware Supplier">Hardware Supplier</option>
                    <option value="Logistics">Logistics</option>
                    <option value="Other">Other</option>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Region</label>
                  <Select name="region" value={formData.region} onChange={handleChange}>
                    <option value="North">North</option>
                    <option value="South">South</option>
                    <option value="East">East</option>
                    <option value="West">West</option>
                    <option value="International">International</option>
                  </Select>
                </div>
              </div>
              <div className="mt-5 flex justify-end border-t border-[var(--border)] pt-4">
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving…' : isExisting ? 'Update Profile' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </Layout>
  );
}

export default VendorProfile;
