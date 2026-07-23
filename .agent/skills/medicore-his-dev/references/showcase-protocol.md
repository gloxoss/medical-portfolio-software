# MediCore HIS — Showcase Protocol

> Extended reference for generating standalone feature showcases.
> Each showcase is a self-contained HTML page for social media + learning.

---

## Base Showcase Template

Every showcase `index.html` includes this shared foundation:

```html
<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MediCore — {{FEATURE_NAME}} (Showcase)</title>

  <!-- Open Graph for social sharing -->
  <meta property="og:title" content="MediCore HIS — {{FEATURE_NAME}}">
  <meta property="og:description" content="{{ONE_LINE_DESCRIPTION}}">
  <meta property="og:type" content="website">

  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

  <style>
    /* ===== SHARED SHOWCASE TOKENS ===== */
    :root {
      --sc-bg: #0A0A0B;
      --sc-surface: #111113;
      --sc-surface-hover: #18181B;
      --sc-border: #27272A;
      --sc-text-primary: #FAFAFA;
      --sc-text-secondary: #A1A1AA;
      --sc-text-muted: #71717A;
      --sc-accent: #0EA5E9;        /* Clinical Teal */
      --sc-accent-hover: #38BDF8;
      --sc-accent-subtle: rgba(14, 165, 233, 0.12);
      --sc-success: #22C55E;
      --sc-warning: #F59E0B;
      --sc-danger: #EF4444;
      --sc-radius: 8px;
      --sc-radius-lg: 12px;
      --sc-font: 'Inter', -apple-system, sans-serif;
      --sc-shadow: 0 1px 3px rgba(0,0,0,0.4);
      --sc-shadow-lg: 0 8px 30px rgba(0,0,0,0.5);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: var(--sc-font);
      background: var(--sc-bg);
      color: var(--sc-text-primary);
      line-height: 1.6;
      min-height: 100vh;
    }

    /* ===== SHOWCASE HEADER ===== */
    .showcase-header {
      padding: 40px 24px 32px;
      text-align: center;
      border-bottom: 1px solid var(--sc-border);
      background: linear-gradient(180deg, rgba(14,165,233,0.04) 0%, transparent 100%);
    }
    .showcase-header .badge {
      display: inline-block;
      background: var(--sc-accent-subtle);
      color: var(--sc-accent);
      padding: 4px 12px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    .showcase-header h1 {
      font-size: 28px;
      font-weight: 700;
      margin-bottom: 8px;
      background: linear-gradient(135deg, var(--sc-text-primary), var(--sc-accent));
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .showcase-header .subtitle {
      color: var(--sc-text-secondary);
      font-size: 15px;
      max-width: 480px;
      margin: 0 auto;
    }

    /* ===== DAY COUNTER ===== */
    .day-counter {
      position: fixed;
      top: 16px;
      right: 16px;
      background: var(--sc-surface);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 600;
      color: var(--sc-accent);
      z-index: 100;
      box-shadow: var(--sc-shadow);
    }

    /* ===== MAIN CONTENT ===== */
    .showcase-main {
      max-width: 900px;
      margin: 0 auto;
      padding: 40px 24px;
    }

    /* ===== CARDS ===== */
    .card {
      background: var(--sc-surface);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius-lg);
      padding: 24px;
      margin-bottom: 20px;
      box-shadow: var(--sc-shadow);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--sc-border);
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
    }

    /* ===== FORM ELEMENTS ===== */
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--sc-text-secondary);
      margin-bottom: 6px;
    }
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px 14px;
      background: var(--sc-bg);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius);
      color: var(--sc-text-primary);
      font-size: 14px;
      font-family: var(--sc-font);
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: var(--sc-accent);
      box-shadow: 0 0 0 3px var(--sc-accent-subtle);
    }

    /* ===== BUTTONS ===== */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 18px;
      border: none;
      border-radius: var(--sc-radius);
      font-size: 14px;
      font-weight: 500;
      font-family: var(--sc-font);
      cursor: pointer;
      transition: all 0.15s;
    }
    .btn-primary {
      background: var(--sc-accent);
      color: white;
    }
    .btn-primary:hover {
      background: var(--sc-accent-hover);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(14, 165, 233, 0.3);
    }
    .btn-secondary {
      background: var(--sc-surface-hover);
      color: var(--sc-text-primary);
      border: 1px solid var(--sc-border);
    }

    /* ===== STATUS BADGES ===== */
    .status { 
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 10px;
      border-radius: 100px;
      font-size: 12px;
      font-weight: 500;
    }
    .status-success { background: rgba(34,197,94,0.12); color: var(--sc-success); }
    .status-warning { background: rgba(245,158,11,0.12); color: var(--sc-warning); }
    .status-danger  { background: rgba(239,68,68,0.12);  color: var(--sc-danger); }
    .status-info    { background: var(--sc-accent-subtle); color: var(--sc-accent); }
    .status::before {
      content: '';
      width: 6px; height: 6px;
      border-radius: 50%;
      background: currentColor;
    }

    /* ===== TABLE ===== */
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    .data-table th {
      text-align: left;
      padding: 10px 14px;
      font-size: 12px;
      font-weight: 500;
      color: var(--sc-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid var(--sc-border);
    }
    .data-table td {
      padding: 12px 14px;
      font-size: 14px;
      border-bottom: 1px solid var(--sc-border);
    }
    .data-table tr:hover td {
      background: var(--sc-surface-hover);
    }

    /* ===== FOOTER ===== */
    .showcase-footer {
      text-align: center;
      padding: 32px 24px;
      border-top: 1px solid var(--sc-border);
      color: var(--sc-text-muted);
      font-size: 13px;
    }
    .showcase-footer strong {
      color: var(--sc-text-primary);
    }
    .showcase-footer .tech {
      color: var(--sc-text-muted);
      font-size: 12px;
      margin-top: 4px;
    }

    /* ===== LEARN ANNOTATIONS ===== */
    .learn-callout {
      background: rgba(14, 165, 233, 0.06);
      border-left: 3px solid var(--sc-accent);
      border-radius: 0 var(--sc-radius) var(--sc-radius) 0;
      padding: 12px 16px;
      margin: 16px 0;
      font-size: 13px;
      color: var(--sc-text-secondary);
    }
    .learn-callout strong {
      color: var(--sc-accent);
    }

    /* ===== ANIMATIONS ===== */
    @keyframes fadeInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in {
      animation: fadeInUp 0.4s ease-out forwards;
    }
    .delay-1 { animation-delay: 0.1s; }
    .delay-2 { animation-delay: 0.2s; }
    .delay-3 { animation-delay: 0.3s; }

    /* Toast notification */
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--sc-surface);
      border: 1px solid var(--sc-border);
      border-radius: var(--sc-radius);
      padding: 12px 20px;
      font-size: 14px;
      box-shadow: var(--sc-shadow-lg);
      display: flex;
      align-items: center;
      gap: 10px;
      transform: translateY(100px);
      opacity: 0;
      transition: all 0.3s ease-out;
      z-index: 1000;
    }
    .toast.visible {
      transform: translateY(0);
      opacity: 1;
    }

    /* ===== RESPONSIVE ===== */
    @media (max-width: 640px) {
      .showcase-header h1 { font-size: 22px; }
      .showcase-main { padding: 24px 16px; }
      .card { padding: 16px; }
      .form-row { flex-direction: column; }
    }
  </style>
</head>
```

---

## Showcase Examples by Feature Type

### Login Page Showcase

```html
<main class="showcase-main">
  <div class="card animate-in" style="max-width: 420px; margin: 0 auto;">
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="font-size: 32px; margin-bottom: 8px;">🏥</div>
      <h2 style="font-size: 20px; font-weight: 700;">Sign in to MediCore</h2>
      <p style="color: var(--sc-text-muted); font-size: 13px;">Enter your credentials to access your dashboard</p>
    </div>

    <form id="loginForm">
      <div class="form-group">
        <label>Email address</label>
        <input type="email" placeholder="doctor@clinic.ma" id="email">
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" placeholder="••••••••" id="password">
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; margin: 16px 0;">
        <label style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--sc-text-muted);">
          <input type="checkbox"> Remember me
        </label>
        <a href="#" style="font-size: 13px; color: var(--sc-accent); text-decoration: none;">Forgot password?</a>
      </div>
      <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
        Sign In
      </button>
    </form>

    <!-- LEARN: Role-based redirect -->
    <div class="learn-callout" style="margin-top: 20px;">
      <strong>💡 Learn:</strong> After login, the server returns a JWT with role info.
      The frontend reads the role and redirects:<br>
      Doctor → /clinical/dashboard<br>
      Receptionist → /ops/queue<br>
      Admin → /admin/dashboard
    </div>
  </div>
</main>

<script>
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.innerHTML = '⏳ Authenticating...';
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = '✅ Redirecting to Dashboard...';
      btn.style.background = 'var(--sc-success)';

      // Show toast
      showToast('✅ Login successful — Welcome, Dr. Benali!');
    }, 1500);
  });

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add('visible'));
    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
</script>
```

---

### Patient List Showcase

```html
<main class="showcase-main">
  <div class="card animate-in">
    <div class="card-header">
      <h3 class="card-title">Patient Directory</h3>
      <div style="display: flex; gap: 8px;">
        <input type="text" placeholder="Search by name, MRN, phone..."
          style="width: 280px; padding: 8px 12px; background: var(--sc-bg); border: 1px solid var(--sc-border); border-radius: var(--sc-radius); color: var(--sc-text-primary); font-size: 13px;"
          id="searchInput">
        <button class="btn btn-primary">+ Register Patient</button>
      </div>
    </div>

    <table class="data-table">
      <thead>
        <tr>
          <th>MRN</th>
          <th>Patient</th>
          <th>Phone</th>
          <th>Age</th>
          <th>Last Visit</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody id="patientTable">
        <!-- Populated by JS with realistic data -->
      </tbody>
    </table>

    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; margin-top: 16px; border-top: 1px solid var(--sc-border);">
      <span style="font-size: 13px; color: var(--sc-text-muted);">Showing 1-10 of 1,247 patients</span>
      <div style="display: flex; gap: 4px;">
        <button class="btn btn-secondary" style="padding: 6px 12px; font-size: 13px;">← Prev</button>
        <button class="btn btn-primary" style="padding: 6px 12px; font-size: 13px;">Next →</button>
      </div>
    </div>
  </div>

  <!-- LEARN -->
  <div class="learn-callout">
    <strong>💡 Learn:</strong> The search uses <code>ILIKE</code> in PostgreSQL for 
    case-insensitive fuzzy matching across name, MRN, and phone columns.
    Results are debounced (300ms) on the frontend to avoid excessive API calls.
  </div>
</main>

<script>
  const patients = [
    { mrn: 'CEA-2026-00048', name: 'Ahmed Benali', phone: '+212 661 234 567', age: 42, lastVisit: '2 hours ago', status: 'active' },
    { mrn: 'CEA-2026-00047', name: 'Fatima Zahra El Idrissi', phone: '+212 622 987 654', age: 35, lastVisit: 'Yesterday', status: 'active' },
    { mrn: 'CEA-2026-00046', name: 'Youssef Alaoui', phone: '+212 655 112 233', age: 58, lastVisit: '3 days ago', status: 'active' },
    { mrn: 'CEA-2026-00045', name: 'Khadija Bennani', phone: '+212 670 445 566', age: 29, lastVisit: '1 week ago', status: 'active' },
    { mrn: 'CEA-2026-00044', name: 'Omar Fassi Fihri', phone: '+212 698 778 899', age: 67, lastVisit: '2 weeks ago', status: 'inactive' },
  ];

  function renderTable(data) {
    const tbody = document.getElementById('patientTable');
    tbody.innerHTML = data.map((p, i) => `
      <tr class="animate-in delay-${i}" style="cursor: pointer;">
        <td><code style="color: var(--sc-accent); font-size: 13px;">${p.mrn}</code></td>
        <td style="font-weight: 500;">${p.name}</td>
        <td style="color: var(--sc-text-secondary);">${p.phone}</td>
        <td>${p.age}y</td>
        <td style="color: var(--sc-text-muted);">${p.lastVisit}</td>
        <td><span class="status status-${p.status === 'active' ? 'success' : 'warning'}">${p.status}</span></td>
      </tr>
    `).join('');
  }

  renderTable(patients);

  // Live search
  document.getElementById('searchInput').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    const filtered = patients.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.mrn.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
    renderTable(filtered);
  });
</script>
```

---

## Recording Showcase Demos

For social media video content, use the `browser_subagent` to record interactions:

```
1. Open the showcase HTML (file:// or localhost)
2. Record a 15-30 second demo:
   - Type in search → show filtering
   - Fill form → show validation
   - Submit → show success animation
3. The recording is auto-saved as WebP
4. Use it as-is for Twitter/LinkedIn, or convert to MP4 for Instagram
```

---

## Showcase Naming Convention

```
showcase/
  {NNN}-{feature-kebab-case}/
    index.html
    LEARN.md
    social-caption.md

Examples:
  001-login-auth/
  002-patient-registration/
  003-patient-directory/
  004-appointment-booking/
  005-queue-management/
  006-encounter-workspace/
  007-soap-notes/
  008-prescription-writer/
  009-invoice-detail/
  010-lab-order-entry/
```

---

## Social Post Timing Guide

| Platform | Best Time (GMT+1) | Format | Max Length |
|----------|-------------------|--------|-----------|
| LinkedIn | 8-9am Tue-Thu | Text + screenshot | 3000 chars |
| X/Twitter | 12-1pm / 6-7pm | Thread (4-6 tweets) | 280/tweet |
| Instagram | 6-8pm | Story carousel / Reel | 15s per slide |

---

## Screenshot Best Practices

When capturing showcase screenshots for posts:

1. **Browser:** Use Chrome at 1440×900 (landscape) or 390×844 (mobile)
2. **Quality:** Capture at 2x resolution for retina
3. **Crop:** Tight crop on the feature, no browser chrome
4. **Annotate:** Add callout arrows pointing to key features
5. **Before/After:** Show empty state → filled state side-by-side when possible
