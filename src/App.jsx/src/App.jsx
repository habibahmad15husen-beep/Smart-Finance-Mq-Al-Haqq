
import React, { useEffect, useState } from 'react';
import { supabase } from './supabase';
import {
  Wallet, Lock, Mail, LogOut,
  LayoutDashboard, Building2, LoaderCircle
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setInstitutions([]);
      return;
    }

    async function loadInstitutions() {
      const { data, error } = await supabase
        .from('finance_institutions')
        .select('id, code, name')
        .eq('active', true)
        .order('code');

      if (error) {
        setError('Gagal mengambil data lembaga: ' + error.message);
        return;
      }

      setInstitutions(data || []);

      if (data?.length) {
        setSelected(data[0].id);
      }
    }

    loadInstitutions();
  }, [session]);

  async function handleLogin(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) setError(error.message);

    setBusy(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setInstitutions([]);
    setSelected('');
  }

  if (loading) {
    return <div className="loading">Memuat Smart Finance...</div>;
  }

  if (!session) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="login-logo">
            <Wallet size={36} />
          </div>

          <h1>SMART FINANCE</h1>
          <p className="login-subtitle">MQ ALHAQQ</p>
          <p className="login-description">
            Sistem Informasi Keuangan Lembaga
          </p>

          <form onSubmit={handleLogin}>
            <label>Email Admin</label>
            <div className="login-input">
              <Mail size={19} />
              <input
                type="email"
                placeholder="Masukkan email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>

            <label>Password</label>
            <div className="login-input">
              <Lock size={19} />
              <input
                type="password"
                placeholder="Masukkan password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>

            {error && <p className="error">{error}</p>}

            <button className="login-button" disabled={busy}>
              {busy ? 'Memeriksa...' : 'Masuk ke Aplikasi'}
            </button>
          </form>

          <p className="login-footer">
            Smart Finance MQ Alhaqq © 2026
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="brand">SMART FINANCE</div>
          <small>MQ ALHAQQ</small>
        </div>
        <button className="logout-button" onClick={handleLogout}>
          <LogOut size={18} /> Keluar
        </button>
      </header>

      <main className="content">
        <h2>Dashboard Keuangan</h2>
        <p className="muted">
          Selamat datang, {session.user.email}
        </p>

        <div className="welcome">
          <Building2 size={28} />
          <h3>Pilih Lembaga</h3>
          <select
            value={selected}
            onChange={e => setSelected(e.target.value)}
          >
            {institutions.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {error && <p className="error">{error}</p>}

        {!institutions.length ? (
          <p className="notice">
            Belum ada lembaga yang dapat diakses akun ini.
          </p>
        ) : (
          <div className="stat-card">
            <LayoutDashboard />
            <h3>Dashboard {institutions.find(
              item => item.id === selected
            )?.name}</h3>
            <p>Data transaksi akan ditampilkan pada tahap berikutnya.</p>
          </div>
        )}
      </main>
    </div>
  );
}
