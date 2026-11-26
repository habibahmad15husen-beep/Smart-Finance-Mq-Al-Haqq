
import React, { useState } from 'react';
import {
  LayoutDashboard, ArrowLeftRight, ChartNoAxesCombined,
  Users, CalendarClock, FileText, Wallet,
  TrendingUp, TrendingDown, Menu, Bell
} from 'lucide-react';

export default function App() {
  const [institution, setInstitution] = useState('L001');

  const institutions = {
    L001: 'Markaz Quran Khairu Ummah',
    L002: 'LTTQ Al Haqq Berau'
  };

  const menus = [
    [LayoutDashboard, 'Dashboard'],
    [ArrowLeftRight, 'Transaksi'],
    [ChartNoAxesCombined, 'Analisis Pengeluaran'],
    [Users, 'Mukafaah Guru'],
    [CalendarClock, 'Pengeluaran Rutin'],
    [FileText, 'Laporan']
  ];

  return (
    <div className="app">
      <header className="header">
        <div>
          <div className="brand">SMART FINANCE</div>
          <small>MQ ALHAQQ</small>
        </div>
        <button className="icon-button"><Bell /></button>
      </header>

      <main className="content">
        <h2>Dashboard Keuangan</h2>
        <p className="muted">Pantau keuangan lembaga Anda</p>

        <label>Pilih Lembaga</label>
        <select
          value={institution}
          onChange={e => setInstitution(e.target.value)}
        >
          <option value="L001">{institutions.L001}</option>
          <option value="L002">{institutions.L002}</option>
        </select>

        <div className="welcome">
          <span>Selamat datang di</span>
          <h3>{institutions[institution]}</h3>
          <small>Ringkasan keuangan</small>
        </div>

        <div className="cards">
          <div className="stat-card">
            <TrendingUp />
            <span>Total Pemasukan</span>
            <strong>Rp0</strong>
          </div>
          <div className="stat-card">
            <TrendingDown />
            <span>Total Pengeluaran</span>
            <strong>Rp0</strong>
          </div>
          <div className="stat-card">
            <Wallet />
            <span>Saldo</span>
            <strong>Rp0</strong>
          </div>
        </div>

        <h3>Menu Keuangan</h3>
        <div className="menu-grid">
          {menus.map(([Icon, name]) => (
            <button className="menu-card" key={name}>
              <Icon />
              <span>{name}</span>
            </button>
          ))}
        </div>

        <p className="notice">
          Data keuangan akan ditampilkan setelah database terhubung.
        </p>
      </main>

      <nav className="bottom-nav">
        <span><LayoutDashboard />Beranda</span>
        <span><ArrowLeftRight />Transaksi</span>
        <span><ChartNoAxesCombined />Analisis</span>
        <span><Menu />Menu</span>
      </nav>
    </div>
  );
}
