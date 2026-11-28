
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

const today = () => new Date().toISOString().slice(0, 10);

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

  const selectedInstitution = institutions.find(
    item => item.id === selected
  );

  const filteredCategories = categories.filter(
    item => item.transaction_type === form.transaction_type
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data?.session || null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setInstitutions([]);
      setSelected('');
      return;
    }
    loadInstitutions();
  }, [session]);

  useEffect(() => {
    if (!selected) {
      setCategories([]);
      setTransactions([]);
      return;
    }
    loadInstitutionData();
  }, [selected]);

  async function loadInstitutions() {
    setError('');
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

    if (data?.length && !selected) {
      setSelected(data[0].id);
    }
  }

  async function loadInstitutionData() {
    setError('');

    const [categoryResult, transactionResult] = await Promise.all([
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
        .limit(50)
    ]);

    if (categoryResult.error) {
      setError('Gagal mengambil kategori: ' + categoryResult.error.message);
    } else {
      setCategories(categoryResult.data || []);
    }

    if (transactionResult.error) {
      setError('Gagal mengambil transaksi: ' + transactionResult.error.message);
    } else {
      setTransactions(transactionResult.data || []);
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
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
    setSession(null);
    setInstitutions([]);
    setSelected('');
  }

  function updateForm(field, value) {
    setForm(current => ({
      ...current,
      [field]: value,
      ...(field === 'transaction_type' ? { category_id: '' } : {})
    }));
  }

  async function saveTransaction(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');

    if (!selected) {
      setError('Pilih lembaga terlebih dahulu.');
      setBusy(false);
      return;
    }

    if (!form.category_id) {
      setError('Silakan pilih kategori transaksi.');
      setBusy(false);
      return;
    }

    if (!Number.isFinite(Number(form.amount)) || Number(form.amount) <= 0) {
      setError('Nominal harus lebih besar dari nol.');
      setBusy(false);
      return;
    }

    const category = categories.find(
      item => item.id === form.category_id
    );

    if (!category) {
      setError('Kategori tidak ditemukan. Muat ulang kategori.');
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
      setError('Transaksi gagal disimpan: ' + error.message);
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
      await loadInstitutionData();
    }

    setBusy(false);
  }

  const totalIncome = transactions
    .filter(item => item.transaction_type === 'income')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  const totalExpense = transactions
    .filter(item => item.transaction_type === 'expense')
    .reduce((sum, item) => sum + Number(item.amount), 0);

  if (loading) {
    return <div className="login-page">Memuat aplikasi...</div>;
  }

  if (!session) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <div className="login-logo">
            <Wallet size={42} />
          </div>
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
        <button onClick={handleLogout}>
          <LogOut size={18} /> Keluar
        </button>
      </header>

      <main className="content">
        <section className="welcome">
          <h2>Dashboard Keuangan</h2>
          <p>Selamat datang, {session.user.email}</p>
        </section>

        <section className="stat-card">
          <Building2 size={28} />
          <h3>Pilih Lembaga</h3>
          <select
            value={selected}
            onChange={e => {
              setSelected(e.target.value);
              setSuccess('');
              setError('');
            }}
          >
            {institutions.map(item => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </section>

        {!institutions.length && (
          <p className="notice">
            Belum ada lembaga yang dapat diakses akun ini.
          </p>
        )}

        {selectedInstitution && (
          <>
            {error && <p className="error">{error}</p>}
            {success && <p className="notice">{success}</p>}

            <section className="finance-heading">
              <h3>{selectedInstitution.name}</h3>
              <button onClick={loadInstitutionData}>
                <RefreshCw size={17} /> Muat ulang
              </button>
            </section>

            <section className="finance-grid">
              <div className="finance-card income">
                <ArrowUpCircle size={25} />
                <span>Total Pemasukan</span>
                <strong>{money(totalIncome)}</strong>
              </div>
              <div className="finance-card expense">
                <ArrowDownCircle size={25} />
                <span>Total Pengeluaran</span>
                <strong>{money(totalExpense)}</strong>
              </div>
              <div className="finance-card balance">
                <Wallet size={25} />
                <span>Selisih Transaksi</span>
                <strong>{money(totalIncome - totalExpense)}</strong>
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
                    onChange={e => updateForm('transaction_type', e.target.value)}
                  >
                    <option value="income">Pemasukan</option>
                    <option value="expense">Pengeluaran</option>
                  </select>

                  <label>Tanggal</label>
                  <input
                    type="date"
                    value={form.transaction_date}
                    onChange={e => updateForm('transaction_date', e.target.value)}
                    required
                  />

                  <label>Kategori</label>
                  <select
                    value={form.category_id}
                    onChange={e => updateForm('category_id', e.target.value)}
                    required
                  >
                    <option value="">Pilih kategori</option>
                    {filteredCategories.map(item => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>

                  <label>Nominal (Rp)</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.amount}
                    onChange={e => updateForm('amount', e.target.value)}
                    placeholder="Contoh: 500000"
                    required
                  />

                  <label>Metode Pembayaran</label>
                  <select
                    value={form.payment_method}
                    onChange={e => updateForm('payment_method', e.target.value)}
                  >
                    <option value="Tunai">Tunai</option>
                    <option value="Transfer">Transfer</option>
                  </select>

                  <label>Sumber / Penerima Dana</label>
                  <input
                    type="text"
                    value={form.source_or_recipient}
                    onChange={e => updateForm('source_or_recipient', e.target.value)}
                    placeholder="Nama sumber atau penerima"
                  />

                  <label>Catatan</label>
                  <textarea
                    value={form.note}
                    onChange={e => updateForm('note', e.target.value)}
                    placeholder="Keterangan tambahan (opsional)"
                    rows="3"
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
                  transactions.map(item => (
                    <article className="transaction-item" key={item.id}>
                      <div>
                        <strong>{item.category_name}</strong>
                        <small>
                          {new Date(item.transaction_date + 'T00:00:00').toLocaleDateString('id-ID')}
                          {' · '}{item.payment_method}
                        </small>
                        {item.source_or_recipient && (
                          <small>{item.source_or_recipient}</small>
                        )}
                        {item.note && <small>{item.note}</small>}
                      </div>
                      <strong className={
                        item.transaction_type === 'income' ? 'amount-income' : 'amount-expense'
                      }>
                        {item.transaction_type === 'income' ? '+' : '-'}
                        {money(item.amount)}
                      </strong>
                    </article>
                  ))
                )}
              </div>
              <p className="notice">
                Menampilkan maksimal 50 transaksi terakhir untuk lembaga yang dipilih.
              </p>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
