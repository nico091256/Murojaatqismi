import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import confetti from 'canvas-confetti';
import {
  Send, RotateCcw, AlertCircle, CheckCircle2, Copy, Check,
  Moon, Sun, Headphones, Monitor, DoorOpen, Sparkles,
  Clock, ShieldCheck, WifiOff, Printer, PowerOff,
  Tv2, KeyRound, Layers, Wrench, Package, User,
  Building2, Phone, Briefcase, Hash, Search, MessageSquare
} from 'lucide-react';
import { createProblem, checkHealth, checkTicketStatus } from './api';
import DynamicBackground from './components/DynamicBackground';
import CyberText from './components/CyberText';

// Texnik muammo uchun tezkor shablonlar
const ISSUE_PRESETS = [
  { id: 'wifi',     icon: WifiOff,  label: "Internet ishlamayapti",   text: "Internetga ulanib bo'lmayapti. Brauzer sahifalarni ochmayapti yoki Wi-Fi uzilib qolmoqda." },
  { id: 'printer',  icon: Printer,  label: "Printer chop etmayapti",  text: "Printer hujjatlarni chop etmayapti, navbatda qotib qolgan yoki qog'oz tiqilgan." },
  { id: 'power',    icon: PowerOff, label: "Kompyuter yoqilmayapti",  text: "Tizim bloki yoki noutbuk tugmasi bosilganda umumiy yonmayapti / quvvat kelmayapti." },
  { id: 'screen',   icon: Tv2,      label: "Monitor ko'rsatmayapti",  text: "Monitorga signal kelmayapti (No Signal), qora ekran yoki miltillab o'chyapti." },
  { id: 'freeze',   icon: Layers,   label: "Dastur qotib qoldi",      text: "Ishchi dastur ochilmayapti, qotib qoldi yoki xatolik kodi chiqarmoqda." },
  { id: 'password', icon: KeyRound, label: "Parol / Kirish muammosi", text: "Hisobga (Windows / tizimga) kirishda parol xato demoqda yoki bloklangan." },
];

// Jihoz so'rovi uchun tezkor tanlovlar
const DEVICE_PRESETS = [
  'Kompyuter', 'Monitor', 'Noutbuk', 'Klaviatura', 'Sichqoncha',
  'Printer', 'Kabel', 'RAM', 'UPS', 'Flash disk', 'Quloqchin', 'Veb-kamera',
];

const ROOM_SUGGESTIONS = ['101', '102', '104', '201', '203', '204', '301', '305'];
const PC_SUGGESTIONS   = ['PC-01', 'PC-02', 'PC-03', 'PC-05', 'PC-07', 'PC-10', 'Laptop'];

export default function App() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'check'
  const [selectedType, setSelectedType] = useState('');
  const [personalInfo, setPersonalInfo] = useState({
    lastName: '', firstName: '', middleName: '',
    position: '', objectName: '', phone: '',
  });
  const [form, setForm] = useState({
    room: '', computer: '', description: '', requestedItem: '', quantity: '1',
  });
  const [activePreset, setActivePreset] = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [submitted,    setSubmitted]    = useState(null);
  const [copied,       setCopied]       = useState(false);
  const [theme,        setTheme]        = useState(() => localStorage.getItem('portal_theme') || 'dark');
  const [serverOnline, setServerOnline] = useState(true);

  // Status check states (#4)
  const [searchTicket, setSearchTicket] = useState('');
  const [checking, setChecking] = useState(false);
  const [ticketResult, setTicketResult] = useState(null);
  const [ticketError, setTicketError] = useState('');

  // Apply theme to html/root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('portal_theme', theme);
  }, [theme]);

  // Periodic Backend Health Check
  useEffect(() => {
    let isMounted = true;
    const testConnection = async () => {
      const res = await checkHealth();
      if (isMounted) {
        setServerOnline(res.ok);
      }
    };
    testConnection();
    const interval = setInterval(testConnection, 20000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const toggleTheme = () => {
    setTheme(p => p === 'dark' ? 'light' : 'dark');
  };

  const handlePersonalChange = (e) => {
    setError('');
    setPersonalInfo(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleChange = (e) => {
    setError('');
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSelectPreset = (preset) => {
    if (activePreset === preset.id) {
      setActivePreset(null);
      setForm(p => ({ ...p, description: '' }));
    } else {
      setActivePreset(preset.id);
      setForm(p => ({ ...p, description: preset.text }));
      setError('');
    }
  };

  const handleTypeSelect = (type) => {
    setSelectedType(type);
    setError('');
    setActivePreset(null);
    setForm({ room: '', computer: '', description: '', requestedItem: '', quantity: '1' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedType)                   { setError('Murojaat turini tanlang');            return; }
    if (!personalInfo.lastName.trim())   { setError('Familiyani kiriting');                return; }
    if (!personalInfo.firstName.trim())  { setError('Ismingizni kiriting');                return; }
    if (!personalInfo.middleName.trim()) { setError('Sharifingizni kiriting');             return; }
    if (!personalInfo.position.trim())   { setError('Lavozimingizni kiriting');            return; }
    if (!personalInfo.objectName.trim()) { setError("Obyekt nomini kiriting");             return; }
    if (!personalInfo.phone.trim())      { setError('Telefon raqamingizni kiriting');      return; }

    if (selectedType === 'Texnik muammo') {
      if (!form.room.trim())        { setError('Xona raqamini kiriting');           return; }
      if (!form.computer.trim())    { setError('Kompyuter nomini kiriting');         return; }
      if (!form.description.trim()) { setError("Muammo tavsifini kiriting");        return; }
    } else {
      if (!form.requestedItem.trim()) { setError("So'ralgan jihoz nomini kiriting"); return; }
    }

    setLoading(true);
    setError('');
    try {
      const isTM = selectedType === 'Texnik muammo';
      const payload = {
        type: selectedType,
        ...personalInfo,
        ...(isTM
          ? { room: form.room.trim(), computer: form.computer.trim(), description: form.description.trim() }
          : {
              requestedItem: form.requestedItem.trim(),
              quantity: parseInt(form.quantity, 10) || 1,
              ...(form.description.trim() ? { description: form.description.trim() } : {}),
            }
        ),
      };
      const res = await createProblem(payload);
      setSubmitted(res.data?.problem);
      toast.success('Murojaatingiz IT xizmatiga yetkazildi!');
      try { confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#a855f7', '#10b981', '#38bdf8'] }); } catch { /* safe */ }
    } catch (err) {
      const msg = err.response?.data?.message || "Server bilan bog'lanishda xatolik yuz berdi. Iltimos, qayta urinib ko'ring.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyTicket = (ticketNum) => {
    navigator.clipboard.writeText(ticketNum);
    setCopied(true);
    toast.success("Chipta raqami nusxalandi: " + ticketNum);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setSubmitted(null);
    setSelectedType('');
    setPersonalInfo({ lastName: '', firstName: '', middleName: '', position: '', objectName: '', phone: '' });
    setForm({ room: '', computer: '', description: '', requestedItem: '', quantity: '1' });
    setActivePreset(null);
    setError('');
  };

  // Check Ticket Handler (#4)
  const handleCheckTicket = async (e) => {
    e?.preventDefault();
    if (!searchTicket.trim()) {
      setTicketError('Ticket raqamini kiriting (masalan: TM-1001)');
      return;
    }

    setChecking(true);
    setTicketError('');
    setTicketResult(null);

    try {
      const res = await checkTicketStatus(searchTicket.trim());
      setTicketResult(res.data.problem);
    } catch (err) {
      setTicketError(err.response?.data?.message || "Bunday ticket topilmadi. Raqamni tekshirib qayta kiriting.");
    } finally {
      setChecking(false);
    }
  };

  const switchToCheck = (ticketNum) => {
    setActiveTab('check');
    setSearchTicket(ticketNum);
    setTicketResult(null);
    setTicketError('');
  };

  const isTM = selectedType === 'Texnik muammo';
  const isJS = selectedType === "Jihoz so'rovi";

  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: theme === 'dark' ? '#1e293b' : '#ffffff',
            color:      theme === 'dark' ? '#f8fafc'  : '#0f172a',
            border:     theme === 'dark' ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.1)',
            fontSize: '0.9rem', borderRadius: '10px',
          },
        }}
      />
      <DynamicBackground theme={theme} />

      <div className="app-container">
        {/* ── Navbar ── */}
        <header className="top-navbar">
          <div className="brand-logo">
            <div className="logo-icon"><Headphones size={20} /></div>
            <div>
              <div className="brand-title">IT Yordam Xizmati</div>
              <div className="brand-subtitle">Texnik muammolarni qabul qilish portali</div>
            </div>
          </div>
          <div className="nav-actions">
            {/* Tab switchers */}
            <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.06)', padding: 3, borderRadius: 10, border: '1px solid var(--border)' }}>
              <button 
                className={`theme-toggle-btn ${activeTab === 'new' ? 'active-tab-btn' : ''}`}
                onClick={() => setActiveTab('new')}
                style={{ borderRadius: 8, fontSize: '0.8rem', padding: '6px 12px', width: 'auto', gap: 6, display: 'flex', alignItems: 'center', background: activeTab === 'new' ? 'var(--primary)' : 'transparent', color: activeTab === 'new' ? 'white' : 'var(--text-secondary)' }}
              >
                <Sparkles size={14} /> Murojaat
              </button>
              <button 
                className={`theme-toggle-btn ${activeTab === 'check' ? 'active-tab-btn' : ''}`}
                onClick={() => setActiveTab('check')}
                style={{ borderRadius: 8, fontSize: '0.8rem', padding: '6px 12px', width: 'auto', gap: 6, display: 'flex', alignItems: 'center', background: activeTab === 'check' ? 'var(--primary)' : 'transparent', color: activeTab === 'check' ? 'white' : 'var(--text-secondary)' }}
              >
                <Search size={14} /> Holatni tekshirish
              </button>
            </div>

            <div className={`status-badge ${serverOnline ? 'online' : 'offline'}`} title={serverOnline ? "Server faol ishlamoqda" : "Server bilan aloqa uzilgan"}>
              <span className="status-dot"></span>
              {serverOnline ? "IT Tizim Faol" : "Oflayn rejim"}
            </div>
            <button className="theme-toggle-btn" onClick={toggleTheme} title={theme === 'dark' ? "Yorug' rejimga o'tish" : "Qorong'i rejimga o'tish"} aria-label="Rejimni o'zgartirish">
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </header>

        <main className="main-content">
          <div className="content-grid">

            {/* ════ TICKET HOLATINI TEKSHIRISH (#4 TAB) ════ */}
            {activeTab === 'check' ? (
              <div className="form-card" style={{ maxWidth: 620, margin: '0 auto', width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: 24 }}>
                  <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', display: 'grid', placeItems: 'center', margin: '0 auto 12px' }}>
                    <Search size={24} color="#818cf8" />
                  </div>
                  <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>
                    Murojaat Holatini Tekshirish
                  </h2>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                    Yuborilgan murojaatingiz chipta raqamini kiriting
                  </p>
                </div>

                <form onSubmit={handleCheckTicket} style={{ marginBottom: 20 }}>
                  <div className="form-group">
                    <div className="input-wrapper">
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Masalan: TM-1001 yoki JS-1002"
                        value={searchTicket}
                        onChange={(e) => { setSearchTicket(e.target.value); setTicketError(''); }}
                        style={{ textTransform: 'uppercase', fontFamily: 'var(--font-mono)', fontSize: '1rem', letterSpacing: '0.05em' }}
                        autoFocus
                      />
                      <Hash className="input-icon" size={18} />
                    </div>
                  </div>

                  {ticketError && (
                    <div className="error-banner" style={{ marginBottom: 14 }}>
                      <AlertCircle size={16} />
                      <span>{ticketError}</span>
                    </div>
                  )}

                  <button type="submit" className="submit-btn" disabled={checking}>
                    {checking ? (
                      <><div className="btn-spinner"></div><span>Qidirilmoqda...</span></>
                    ) : (
                      <><Search size={18} /><span>Holatni ko'rish</span></>
                    )}
                  </button>
                </form>

                {/* Ticket Natijasi */}
                {ticketResult && (
                  <div style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 16,
                    padding: 20,
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 14, marginBottom: 16 }}>
                      <div>
                        <span style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#818cf8' }}>
                          {ticketResult.ticketNumber}
                        </span>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>
                          {ticketResult.type}
                        </div>
                      </div>

                      <span style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        padding: '4px 12px',
                        borderRadius: 20,
                        background: ticketResult.status === 'RESOLVED' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                        color: ticketResult.status === 'RESOLVED' ? '#10b981' : '#f59e0b',
                        border: ticketResult.status === 'RESOLVED' ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(245,158,11,0.3)',
                      }}>
                        {ticketResult.status === 'RESOLVED' ? '✅ Hal qilindi' : '🟡 Navbatda / Kutilmoqda'}
                      </span>
                    </div>

                    {/* Tracker */}
                    <div className="status-tracker" style={{ marginBottom: 16 }}>
                      <div className="tracker-step completed">
                        <div className="step-circle"><Check size={14} /></div>
                        <span className="step-name">Yuborildi</span>
                      </div>
                      <div className={`tracker-step ${ticketResult.assignedUser ? 'completed' : ticketResult.status === 'RESOLVED' ? 'completed' : 'active'}`}>
                        <div className="step-circle">{ticketResult.assignedUser || ticketResult.status === 'RESOLVED' ? <Check size={14} /> : '2'}</div>
                        <span className="step-name">
                          {ticketResult.assignedUser ? `Xodim: ${ticketResult.assignedUser.fullName}` : 'Ko`rilmoqda'}
                        </span>
                      </div>
                      <div className={`tracker-step ${ticketResult.status === 'RESOLVED' ? 'completed' : ''}`}>
                        <div className="step-circle">{ticketResult.status === 'RESOLVED' ? <Check size={14} /> : '3'}</div>
                        <span className="step-name">Yakunlandi</span>
                      </div>
                    </div>

                    {/* Resolve note */}
                    {ticketResult.resolveNote && (
                      <div style={{
                        background: 'rgba(16,185,129,0.08)',
                        border: '1px solid rgba(16,185,129,0.25)',
                        borderRadius: 10,
                        padding: '10px 14px',
                        marginBottom: 14,
                        fontSize: '0.85rem'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399', fontWeight: 600, marginBottom: 4 }}>
                          <MessageSquare size={14} /> IT Xizmati javobi / Yechim:
                        </div>
                        <div style={{ color: 'var(--text-primary)' }}>
                          {ticketResult.resolveNote}
                        </div>
                      </div>
                    )}

                    {/* Details */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                      <div>👤 Yuboruvchi: <strong style={{ color: 'var(--text-primary)' }}>{ticketResult.lastName} {ticketResult.firstName}</strong></div>
                      {ticketResult.room && <div>🚪 Xona: <strong style={{ color: 'var(--text-primary)' }}>{ticketResult.room}</strong></div>}
                      {ticketResult.computer && <div>🖥️ Kompyuter: <strong style={{ color: 'var(--text-primary)' }}>{ticketResult.computer}</strong></div>}
                      {ticketResult.requestedItem && <div>📦 Jihoz: <strong style={{ color: 'var(--text-primary)' }}>{ticketResult.requestedItem}</strong></div>}
                    </div>
                  </div>
                )}
              </div>
            ) : submitted ? (
              <div className="form-card">
                <div className="success-container">
                  <div className="success-badge-icon"><CheckCircle2 size={42} /></div>

                  <div className={`type-badge-pill ${submitted.type === 'Texnik muammo' ? 'type-tm' : 'type-js'}`}>
                    {submitted.type === 'Texnik muammo' ? <Wrench size={14} /> : <Package size={14} />}
                    {submitted.type}
                  </div>

                  <h2 className="success-title">Murojaat muvaffaqiyatli qabul qilindi!</h2>
                  <p className="success-subtitle">
                    Murojaatingiz tizimga kiritildi. IT xodimlari tez orada siz bilan bog'lanadi yoki xonangizga tashrif buyuradi.
                  </p>

                  <div className="ticket-pill-wrapper">
                    <div className="ticket-pill" onClick={() => handleCopyTicket(submitted.ticketNumber)} title="Chipta raqamini nusxalash">
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Chipta raqami:</span>
                      <span className="ticket-num">{submitted.ticketNumber}</span>
                      <span className="copy-hint">
                        {copied ? <Check size={16} color="var(--accent-emerald)" /> : <Copy size={16} />}
                        {copied ? 'Nusxalandi' : 'Nusxalash'}
                      </span>
                    </div>
                  </div>

                  <div className="status-tracker">
                    <div className="tracker-step completed"><div className="step-circle"><Check size={16} /></div><span className="step-name">1. Yuborildi</span></div>
                    <div className="tracker-step active"><div className="step-circle">2</div><span className="step-name">2. Navbatda / IT ko'rmoqda</span></div>
                    <div className="tracker-step"><div className="step-circle">3</div><span className="step-name">3. Hal qilinmoqda</span></div>
                  </div>

                  <div className="summary-card">
                    <div className="summary-meta-row">
                      <div className="summary-meta-item"><User size={16} color="var(--primary)" /><strong>{submitted.lastName} {submitted.firstName} {submitted.middleName}</strong></div>
                      <div className="summary-meta-item"><Briefcase size={16} color="var(--primary)" />{submitted.position}</div>
                      <div className="summary-meta-item"><Building2 size={16} color="var(--accent-emerald)" />{submitted.objectName}</div>
                      <div className="summary-meta-item"><Phone size={16} color="var(--accent-emerald)" />{submitted.phone}</div>
                      {submitted.type === 'Texnik muammo' && (<>
                        <div className="summary-meta-item"><DoorOpen size={16} color="var(--primary)" />Xona: <strong>{submitted.room}</strong></div>
                        <div className="summary-meta-item"><Monitor size={16} color="var(--primary)" />Kompyuter: <strong>{submitted.computer}</strong></div>
                      </>)}
                      {submitted.type === "Jihoz so'rovi" && (<>
                        <div className="summary-meta-item"><Package size={16} color="var(--primary)" />Jihoz: <strong>{submitted.requestedItem}</strong></div>
                        <div className="summary-meta-item"><Hash size={16} color="var(--primary)" />Miqdor: <strong>{submitted.quantity ?? 1} ta</strong></div>
                      </>)}
                      <div className="summary-meta-item"><Clock size={16} color="var(--accent-emerald)" />Kutilayotgan vaqt: <strong>~10-25 daqiqa</strong></div>
                    </div>
                    {submitted.description && (
                      <div className="summary-desc-box">
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                          {submitted.type === 'Texnik muammo' ? 'Muammo tavsifi:' : 'Izoh:'}
                        </div>
                        {submitted.description}
                      </div>
                    )}
                  </div>

                  <div className="success-actions" style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button className="submit-btn" style={{ width: 'auto' }} onClick={handleReset}>
                      <RotateCcw size={16} /> Yangi murojaat yuborish
                    </button>
                    <button 
                      className="submit-btn" 
                      style={{ width: 'auto', background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.4)' }}
                      onClick={() => switchToCheck(submitted.ticketNumber)}
                    >
                      <Search size={16} /> Holatini kuzatish
                    </button>
                  </div>
                </div>
              </div>

            ) : (
            /* ════ MUROJAAT FORMASI ════ */
              <>
                <div className="hero-section">
                  <div className="hero-pill"><Sparkles size={15} /><span>Tezkor Texnik Yordam</span></div>
                  <h1 className="hero-title">
                    IT xizmatiga murojaat <br />
                    <span className="gradient-text">qilish portali</span>
                  </h1>
                  <p className="hero-desc">
                    <CyberText text="Murojaat turini tanlang va ma'lumotlaringizni to'ldiring. IT mutaxassislarimiz imkon qadar tez yordam ko'rsatishadi." speed={25} delay={200} />
                  </p>
                </div>

                <div className="form-card">
                  {/* ── 1. Murojaat turi ── */}
                  <div className="type-selector-section">
                    <div className="form-section-label">
                      <Sparkles size={15} /> Murojaat turini tanlang <span className="req">*</span>
                    </div>
                    <div className="type-selector-grid">
                      <button type="button" className={`type-card${selectedType === 'Texnik muammo' ? ' active' : ''}`} onClick={() => handleTypeSelect('Texnik muammo')}>
                        <div className="type-card-icon tm"><Wrench size={28} /></div>
                        <div className="type-card-text">
                          <span className="type-card-title">Texnik muammo</span>
                          <span className="type-card-desc">Kompyuter, printer, internet, monitor va boshqa nosozliklar</span>
                        </div>
                        {selectedType === 'Texnik muammo' && <div className="type-card-check"><Check size={16} /></div>}
                      </button>
                      <button type="button" className={`type-card${selectedType === "Jihoz so'rovi" ? ' active' : ''}`} onClick={() => handleTypeSelect("Jihoz so'rovi")}>
                        <div className="type-card-icon js"><Package size={28} /></div>
                        <div className="type-card-text">
                          <span className="type-card-title">Jihoz so'rovi</span>
                          <span className="type-card-desc">Yangi kompyuter, monitor, klaviatura va boshqa jihozlar</span>
                        </div>
                        {selectedType === "Jihoz so'rovi" && <div className="type-card-check"><Check size={16} /></div>}
                      </button>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="alert-box error">
                      <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>{error}</div>
                    </div>
                  )}

                  {/* ── Forma (faqat tur tanlanganda) ── */}
                  {selectedType && (
                    <form onSubmit={handleSubmit} noValidate>

                      {/* ── Shaxsiy ma'lumotlar ── */}
                      <div className="form-section">
                        <div className="form-section-header"><User size={16} /><span>Shaxsiy ma'lumotlar</span></div>
                        <div className="personal-info-grid">
                          <div className="form-group">
                            <label className="form-label" htmlFor="lastNameInput"><span>Familiya <span className="req">*</span></span></label>
                            <div className="input-wrapper"><input id="lastNameInput" name="lastName" type="text" className="form-input" placeholder="Karimov" value={personalInfo.lastName} onChange={handlePersonalChange} autoComplete="family-name" /><User className="input-icon" size={18} /></div>
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="firstNameInput"><span>Ism <span className="req">*</span></span></label>
                            <div className="input-wrapper"><input id="firstNameInput" name="firstName" type="text" className="form-input" placeholder="Ali" value={personalInfo.firstName} onChange={handlePersonalChange} autoComplete="given-name" /><User className="input-icon" size={18} /></div>
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="middleNameInput"><span>Sharif <span className="req">*</span></span></label>
                            <div className="input-wrapper"><input id="middleNameInput" name="middleName" type="text" className="form-input" placeholder="Hamidovich" value={personalInfo.middleName} onChange={handlePersonalChange} /><User className="input-icon" size={18} /></div>
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="positionInput"><span>Lavozimi <span className="req">*</span></span></label>
                            <div className="input-wrapper"><input id="positionInput" name="position" type="text" className="form-input" placeholder="Muhosib" value={personalInfo.position} onChange={handlePersonalChange} /><Briefcase className="input-icon" size={18} /></div>
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="objectNameInput"><span>Obyekt nomi <span className="req">*</span></span></label>
                            <div className="input-wrapper"><input id="objectNameInput" name="objectName" type="text" className="form-input" placeholder="Bosh boshqarma" value={personalInfo.objectName} onChange={handlePersonalChange} /><Building2 className="input-icon" size={18} /></div>
                          </div>
                          <div className="form-group">
                            <label className="form-label" htmlFor="phoneInput"><span>Telefon raqami <span className="req">*</span></span></label>
                            <div className="input-wrapper"><input id="phoneInput" name="phone" type="tel" className="form-input" placeholder="+998 90 123 45 67" value={personalInfo.phone} onChange={handlePersonalChange} autoComplete="tel" /><Phone className="input-icon" size={18} /></div>
                          </div>
                        </div>
                      </div>

                      {/* ── Texnik muammo maydonlari ── */}
                      {isTM && (
                        <div className="form-section">
                          <div className="form-section-header"><Wrench size={16} /><span>Muammo ma'lumotlari</span></div>

                          <div className="presets-section">
                            <label className="presets-label">Tezkor muammo shablonlari:</label>
                            <div className="presets-grid">
                              {ISSUE_PRESETS.map((preset) => {
                                const IconComp = preset.icon;
                                return (
                                  <button key={preset.id} type="button" className={`preset-chip ${activePreset === preset.id ? 'active' : ''}`} onClick={() => handleSelectPreset(preset)}>
                                    <IconComp size={15} /><span>{preset.label}</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="form-row">
                            <div className="form-group">
                              <label className="form-label" htmlFor="roomInput">
                                <span>Xona raqami <span className="req">*</span></span>
                                <span className="hint">Masalan: 204</span>
                              </label>
                              <div className="input-wrapper">
                                <input id="roomInput" name="room" type="text" className="form-input" placeholder="Xona raqami (204)" value={form.room} onChange={handleChange} autoComplete="off" />
                                <DoorOpen className="input-icon" size={18} />
                              </div>
                              <div className="field-suggestions">
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tezkor:</span>
                                {ROOM_SUGGESTIONS.map(r => (<button key={r} type="button" className="field-chip" onClick={() => { setForm(p => ({ ...p, room: r })); setError(''); }}>{r}</button>))}
                              </div>
                            </div>
                            <div className="form-group">
                              <label className="form-label" htmlFor="compInput">
                                <span>Kompyuter nomi / raqami <span className="req">*</span></span>
                                <span className="hint">Masalan: PC-07</span>
                              </label>
                              <div className="input-wrapper">
                                <input id="compInput" name="computer" type="text" className="form-input" placeholder="Kompyuter nomi (PC-07)" value={form.computer} onChange={handleChange} autoComplete="off" />
                                <Monitor className="input-icon" size={18} />
                              </div>
                              <div className="field-suggestions">
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tezkor:</span>
                                {PC_SUGGESTIONS.map(pc => (<button key={pc} type="button" className="field-chip" onClick={() => { setForm(p => ({ ...p, computer: pc })); setError(''); }}>{pc}</button>))}
                              </div>
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="descInput">
                              <span>Muammo tavsifi <span className="req">*</span></span>
                              <span className="hint">Batafsil tushuntiring</span>
                            </label>
                            <textarea id="descInput" name="description" className="form-textarea" placeholder="Nima bo'ldi? (Masalan: Monitor o'chib qoldi, Wi-Fi ulanmayapti...)" value={form.description} onChange={handleChange} />
                            <div className="textarea-footer">
                              <span>💡 Yuqoridagi shablonlardan birini tanlashingiz ham mumkin</span>
                              <span>{form.description.length} ta belgi</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── Jihoz so'rovi maydonlari ── */}
                      {isJS && (
                        <div className="form-section">
                          <div className="form-section-header"><Package size={16} /><span>Jihoz ma'lumotlari</span></div>

                          <div className="presets-section">
                            <label className="presets-label">Tezkor jihoz tanlash:</label>
                            <div className="device-chips-grid">
                              {DEVICE_PRESETS.map(label => (
                                <button key={label} type="button" className={`field-chip${form.requestedItem === label ? ' active-chip' : ''}`} onClick={() => { setForm(p => ({ ...p, requestedItem: label })); setError(''); }}>{label}</button>
                              ))}
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="requestedItemInput">
                              <span>So'ralgan jihoz nomi <span className="req">*</span></span>
                              <span className="hint">Masalan: Monitor Samsung, Klaviatura</span>
                            </label>
                            <div className="input-wrapper">
                              <input id="requestedItemInput" name="requestedItem" type="text" className="form-input" placeholder="Nima kerakligi (Monitor, Kompyuter, Kabel...)" value={form.requestedItem} onChange={handleChange} autoComplete="off" />
                              <Package className="input-icon" size={18} />
                            </div>
                          </div>

                          <div className="form-group" style={{ maxWidth: '180px' }}>
                            <label className="form-label" htmlFor="quantityInput">
                              <span>Miqdor</span>
                              <span className="hint">Nechta (ixtiyoriy)</span>
                            </label>
                            <div className="input-wrapper">
                              <input id="quantityInput" name="quantity" type="number" min="1" max="999" className="form-input" placeholder="1" value={form.quantity} onChange={handleChange} />
                              <Hash className="input-icon" size={18} />
                            </div>
                          </div>

                          <div className="form-group">
                            <label className="form-label" htmlFor="descInputJS">
                              <span>Izoh</span>
                              <span className="hint">Ixtiyoriy — nima uchun kerakligini tushuntiring</span>
                            </label>
                            <textarea id="descInputJS" name="description" className="form-textarea" style={{ minHeight: '100px' }} placeholder="Masalan: Eski monitor ishlamay qoldi yoki yangi xodim uchun kerak..." value={form.description} onChange={handleChange} />
                            <div className="textarea-footer"><span></span><span>{form.description.length} ta belgi</span></div>
                          </div>
                        </div>
                      )}

                      <button type="submit" className="submit-btn" disabled={loading}>
                        {loading ? (<><div className="btn-spinner"></div><span>Yuborilmoqda...</span></>) : (<><Send size={18} /><span>Murojaatni yuborish</span></>)}
                      </button>
                    </form>
                  )}

                  <div className="form-footer-note">
                    <span><ShieldCheck size={15} color="var(--accent-emerald)" /> Ro'yxatdan o'tish talab qilinmaydi</span>
                    <span>•</span>
                    <span><Clock size={15} color="var(--primary)" /> O'rtacha javob vaqti: 15 daqiqa</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </main>

        <footer className="app-footer">
          <div className="footer-support-info">
            <span>📍 IT Bo'limi: 1-bino, 105-xona</span>
            <span>📞 Ichki telefon: 104</span>
            <span>⏰ Ish vaqti: 09:00 - 18:00</span>
          </div>
          <div>© {new Date().getFullYear()} Tizim Administratori Qo'llab-quvvatlash Xizmati</div>
        </footer>
      </div>
    </>
  );
}
