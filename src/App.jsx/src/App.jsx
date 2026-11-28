
import React, { useEffect, useState } from 'react';
import { supabase } from '../../supabase.js/src/supabase.js';
import {
  Wallet, Lock, Mail, LogOut, Building2,
  PlusCircle, ArrowDownCircle, ArrowUpCircle,
  RefreshCw, Receipt, X, Save
} from 'lucide-react';

const money = value =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institutions, setInstitutions] = useState([]);
  const [selected, setSelected] = useState('');
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    transaction_date: today(),
    transaction_type: 'income',
    category_id: '',
    amount: '',
    payment_method: 'Tunai',
    source_or_recipient: '',
    note: ''
  });

  const institution = institutions.find(x => x.id === selected);

  const availableCategories = categories.filter(
    x => x.transaction_type === form.transaction_type
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data?.session || null);
      setLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange(
      (_event, session) => setSession(session)
    );

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session) loadInstitutions();
    else {
      setInstitutions([]);
      setSelected('');
    }
  }, [session]);

  useEffect(() => {
    if (selected) loadData();
    else {
      setCategories([]);
      setTransactions([]);
    }
  }, [selected]);

  async function loadInstitutions() {
    setError('');

    const { data, error } = await supabase
      .from('finance_institutions')
      .select('id, code, name')
      .eq('active', true)
      .order('code');

    if (error) {
      setError('Gagal memuat lembaga: ' + error.message);
      return;
    }

    setInstitutions(data || []);
    if (data?.length && !selected) setSelected(data[0].id);
  }

  async function loadData() {
    setError('');

    const [cat, trx] = await Promise.all([
      supabase
        .from('finance_categories')
        .select('id, name, transaction_type, is_recurring')
        .eq('institution_id', selected)
        .eq('active', true)
        .order('name'),

      supabase
        .from('finance_transactions')
        .select('*')
        .eq('institution_id', selected)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(100)
    ]);

    if (cat.error) setError('Kategori: ' + cat.error.message);
    else setCategories(cat.data || []);

    if (trx.error) setError('Transaksi: ' + trx.error.message);
    else setTransactions(trx.data || []);
  }

  async function login(e) {
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

  async function logout() {
    await supabase.auth.signOut();
    setSession(null);
    setSelected('');
  }

  function changeForm(field, value) {
    setForm(old => ({
      ...old,
      [field]: value,
      ...(field === 'transaction_type' ? { category_id: '' } : {})
    }));
  }

  async function saveTransaction(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    const category = categories.find(x => x.id === form.category_id);

    if (!selected || !category) {
      setError('Pilih lembaga dan kategori terlebih dahulu.');
      setBusy(false);
      return;
    }

    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Nominal harus lebih besar dari nol.');
      setBusy(false);
      return;
    }

    const payload = {
      institution_id: selected,
      transaction_date: form.transaction_date,
      transaction_type: form.transaction_type,
      category_id: category.id,
      category_name: category.name,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      source_or_recipient: form.source_or_recipient.trim() || null,
      note: form.note.trim() || null,
      created_by: session.user.id
    };

    const { error } = await supabase
      .from('finance_transactions')
      .insert(payload);

    if (error) {
      setError('Gagal menyimpan transaksi: ' + error.message);
    } else {
      setSuccess('Transaksi berhasil disimpan.');
      setForm({
        transaction_date: today(),
        transaction_type: 'income',
        category_id: '',
        amount: '',
        payment_method: 'Tunai',
        source_or_recipient: '',
        note: ''
      });
      setShowForm(false);
      await loadData();
    }

    setBusy(false);
  }

  const income = transactions
    .filter(x => x.transaction_type === 'income')
    .reduce((sum, x) => sum + Number(x.amount), 0);

  const expense = transactions
    .filter(x => x.transaction_type === 'expense')
    .reduce((sum, x) => sum + Number(x.amount), 0);

  if (loading) {
    return <div className="login-page">Memuat aplikasi...</div>;
  }

  if (!session) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={login}>
          <div className="login-logo"><Wallet size={42} /></div>
          <h1>SMART FINANCE</h1>
          <h3>MQ ALHAQQ</h3>
          <p>Sistem Informasi Keuangan Lembaga</p>

          <label>Email Admin</label>
          <div className="login-input">
            <Mail size={20} />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email admin"
              required
            />
          </div>

          <label>Password</label>
          <div className="login-input">
            <Lock size={20} />
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button className="login-button" disabled={busy}>
            {busy ? 'Memproses...' : 'Masuk ke Aplikasi'}
          </button>
          <small>Smart Finance MQ Alhaqq © 2026</small>
        </form>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div>
          <strong>SMART FINANCE</strong>
          <small>MQ ALHAQQ</small>
        </div>
        <button onClick={logout}>
          <LogOut size={18} /> Keluar
        </button>
      </header>

      <main className="content">
        <section className="welcome">
          <h2>Dashboard Keuangan</h2>
          <p>Selamat datang, {session.user.email}</p>
        </section>

        <section className="stat-card">
          <Building2 size={26} />
          <h3>Pilih Lembaga</h3>
          <select
            value={selected}
            onChange={e => {
              setSelected(e.target.value);
              setSuccess('');
              setError('');
            }}
          >
            {institutions.map(x => (
              <option key={x.id} value={x.id}>{x.name}</option>
            ))}
          </select>
        </section>

        {error && <p className="error">{error}</p>}
        {success && <p className="notice">{success}</p>}

        {institution && (
          <>
            <section className="finance-heading">
              <h3>{institution.name}</h3>
              <button onClick={loadData}>
                <RefreshCw size={17} /> Muat ulang
              </button>
            </section>

            <section className="finance-grid">
              <div className="finance-card income">
                <ArrowUpCircle size={25} />
                <span>Total Pemasukan</span>
                <strong>{money(income)}</strong>
              </div>

              <div className="finance-card expense">
                <ArrowDownCircle size={25} />
                <span>Total Pengeluaran</span>
                <strong>{money(expense)}</strong>
              </div>

              <div className="finance-card balance">
                <Wallet size={25} />
                <span>Selisih Transaksi</span>
                <strong>{money(income - expense)}</strong>
              </div>
            </section>

            <section className="transaction-section">
              <div className="section-heading">
                <div>
                  <h3>Transaksi Keuangan</h3>
                  <p>Catat pemasukan dan pengeluaran lembaga</p>
                </div>
                <button onClick={() => {
                  setError('');
                  setSuccess('');
                  setShowForm(true);
                }}>
                  <PlusCircle size={18} /> Tambah
                </button>
              </div>

              {showForm && (
                <form className="transaction-form" onSubmit={saveTransaction}>
                  <div className="form-heading">
                    <h3>Tambah Transaksi</h3>
                    <button type="button" onClick={() => setShowForm(false)}>
                      <X size={20} />
                    </button>
                  </div>

                  <label>Jenis Transaksi</label>
                  <select
                    value={form.transaction_type}
                    onChange={e => changeForm('transaction_type', e.target.value)}
                  >
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>

                  <label>Tanggal Transaksi</label>
                  <input
                    type="date"
                    value={form.transaction_date}
                    onChange={e => changeForm('transaction_date', e.target.value)}
                    required
                  />

                  <label>Kategori</label>
                  <select
                    value={form.category_id}
                    onChange={e => changeForm('category_id', e.target.value)}
                    required
                  >
                    <option value="">Pilih kategori</option>
                    {availableCategories.map(x => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                  </select>

                  <label>Nominal (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.amount}
                    onChange={e => changeForm('amount', e.target.value)}
                    placeholder="Contoh: 500000"
                    required
                  />

                  <label>Metode Pembayaran</label>
                  <select
                    value={form.payment_method}
                    onChange={e => changeForm('payment_method', e.target.value)}
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="Transfer">Transfer</option>
                  </select>

                  <label>Sumber / Penerima Dana</label>
                  <input
                    value={form.source_or_recipient}
                    onChange={e => changeForm('source_or_recipient', e.target.value)}
                    placeholder="Nama sumber atau penerima"
                  />

                  <label>Catatan</label>
                  <textarea
                    rows="3"
                    value={form.note}
                    onChange={e => changeForm('note', e.target.value)}
                    placeholder="Keterangan tambahan"
                  />

                  <button type="submit" disabled={busy}>
                    <Save size={18} />
                    {busy ? 'Menyimpan...' : 'Simpan Transaksi'}
                  </button>
                </form>
              )}

              <div className="transaction-list">
                <h3><Receipt size={20} /> Riwayat Transaksi</h3>

                {!transactions.length ? (
                  <p>Belum ada transaksi untuk lembaga ini.</p>
                ) : (
                  transactions.map(x => (
                    <article className="transaction-item" key={x.id}>
                      <div>
                        <strong>{x.category_name}</strong>
                        <small>
                          {new Date(x.transaction_date + 'T00:00:00').toLocaleDateString('id-ID')}
                          {' · '}{x.payment_method}
                        </small>
                        {x.source_or_recipient && <small>{x.source_or_recipient}</small>}
                        {x.note && <small>{x.note}</small>}
                      </div>
                      <strong className={
                        x.transaction_type === 'income'
                          ? 'amount-income'
                          : 'amount-expense'
                      }>
                        {x.transaction_type === 'income' ? '+' : '-'}
                        {money(x.amount)}
                      </strong>
                    </article>
                  ))
                )}
              </div>

              <p className="notice">
                Menampilkan maksimal 100 transaksi terakhir.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
