// ============================================================
// RANKFORGE — Core App Logic v2.0
// Auth, Routing, State, Points, Utilities
// ============================================================

const App = {
  currentUser: null,
  currentPage: 'dashboard',
  userProfile: null,
  isAdmin: false,
  charts: {},
  pomodoroInterval: null,
  pomodoroState: null,
  sessionListener: null,
  unsubscribers: [],
};


// ─── Security Config ─────────────────────────────────────────
// Change ADMIN_SECRET_KEY to any passphrase only you know.
// Anyone trying to register as admin must enter this first.
const ADMIN_SECRET_KEY  = 'RF-ADMIN-2026';
const DISCORD_WEBHOOK   = 'https://canary.discord.com/api/webhooks/1476079557630234676/q7ybZUVYpgWIsLU2EWIjNZc6X82cdY9ojNbBDFtB3kZu2rVa5R8EwIchwHpFlfk0b81o';

// ─── Discord Notification ─────────────────────────────────────
async function notifyDiscordAdmin(data) {
  const when = new Date().toLocaleString('en-IN', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12:true
  });
  const body = {
    username: 'RankForge Guard',
    avatar_url: 'https://cdn-icons-png.flaticon.com/512/4946/4946344.png',
    embeds: [{
      title: '🔔  New Admin Application',
      color: 0xFFD100,
      fields: [
        { name: '👤  Name',        value: data.name,          inline: true  },
        { name: '📧  Email',       value: data.email,         inline: true  },
        { name: '🏫  Institute',   value: data.instituteName, inline: false },
        { name: '📱  Phone',       value: data.phone || 'Not provided', inline: true },
        { name: '🕐  Applied',     value: when,               inline: true  },
        { name: '🆔  UID',         value: '`' + data.uid + '`', inline: false },
      ],
      description: '**To approve:** Go to Firebase Console → Firestore → `users` → find this UID → set `role` to `"admin"` and create their institute doc.',
      footer: { text: 'RankForge Admin Security System' },
      timestamp: new Date().toISOString(),
    }]
  };
  try {
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  } catch(e) { console.warn('Discord ping failed (non-critical):', e.message); }
}

// ─── Admin Key Gate ───────────────────────────────────────────
function showAdminKeyModal() {
  const modal = document.getElementById('adminKeyModal');
  if (!modal) return;
  modal.querySelector('#adminKeyError').style.display = 'none';
  modal.querySelector('#adminSecretKeyInput').value   = '';
  modal.classList.add('open');
  if (window.lucide) lucide.createIcons();
}

function verifyAdminKey() {
  const input = document.getElementById('adminSecretKeyInput').value.trim();
  const errBox = document.getElementById('adminKeyError');
  const errMsg = document.getElementById('adminKeyErrorMsg');

  if (input !== ADMIN_SECRET_KEY) {
    errMsg.textContent = 'Wrong key. Contact RankForge support to obtain one.';
    errBox.style.display = 'block';
    const m = document.querySelector('#adminKeyModal .modal');
    m.style.animation = 'shake 0.4s ease';
    setTimeout(() => m.style.animation = '', 450);
    if (window.lucide) lucide.createIcons();
    return;
  }

  // Correct — unlock admin fields in register form
  document.getElementById('adminKeyModal').classList.remove('open');
  document.getElementById('adminRegisterSection').style.display = 'block';
  document.getElementById('instCodeGroup').style.display = 'none';
  document.getElementById('regRole').value = 'admin';
  const trigger = document.getElementById('adminKeyTrigger');
  if (trigger) trigger.style.display = 'none';
  showToast('Admin registration unlocked. Fill in your institute details.', 'success');
}

// ─── Pending Admin Screen ─────────────────────────────────────
function showPendingScreen(instituteName) {
  const el = document.getElementById('pendingScreen');
  if (!el) return;
  const nameEl = document.getElementById('pendingInstituteName');
  if (nameEl) nameEl.textContent = instituteName || 'your institute';
  el.classList.remove('hidden');
  document.getElementById('appShell').classList.add('hidden');
  document.getElementById('authScreen').classList.add('hidden');
  if (window.lucide) lucide.createIcons();
}

function hidePendingScreen() {
  const el = document.getElementById('pendingScreen');
  if (el) el.classList.add('hidden');
}

async function checkApprovalStatus() {
  if (!App.currentUser) return;
  const btn = document.querySelector('#pendingScreen .btn-secondary');
  if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner"></div>'; }
  try {
    const doc = await db.collection('users').doc(App.currentUser.uid).get();
    const role = doc.data()?.role;
    if (role === 'admin') {
      hidePendingScreen();
      await loadUserProfile(App.currentUser.uid);
      document.getElementById('appShell').classList.remove('hidden');
      initApp();
      showToast('Your account has been approved! Welcome, Admin.', 'success');
    } else {
      showToast('Still pending. Our team will review your application soon.', 'info');
      if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="refresh-cw"></i> Check Approval Status'; if (window.lucide) lucide.createIcons(); }
    }
  } catch(e) {
    showToast('Could not check status. Try again.', 'error');
    if (btn) { btn.disabled = false; btn.innerHTML = '<i data-lucide="refresh-cw"></i> Check Approval Status'; if (window.lucide) lucide.createIcons(); }
  }
}

function logoutFromPending() {
  hidePendingScreen();
  auth.signOut();
  showToast('Signed out.', 'info');
}

// ─── SVG Icons for toasts ────────────────────────────────────
const TOAST_ICONS = {
  success: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  error:   `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
  warning: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  info:    `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
};

// ─── Toast Notifications ────────────────────────────────────
function showToast(message, type = 'info', duration = 4000) {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}<span>${message}</span>`;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s, transform 0.3s';
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(30px)';
    setTimeout(() => toast.remove(), 310);
  }, duration);
}

// ─── Auth State ──────────────────────────────────────────────
auth.onAuthStateChanged(async (user) => {
  if (user) {
    App.currentUser = user;
    await loadUserProfile(user.uid);

    // Pending admins get a special holding screen
    if (App.userProfile?.role === 'pending_admin') {
      document.getElementById('authScreen').classList.add('hidden');
      document.getElementById('appShell').classList.add('hidden');
      showPendingScreen(App.userProfile.instituteName);
      return;
    }

    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    initApp();
  } else {
    App.currentUser = null;
    App.userProfile = null;
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appShell').classList.add('hidden');
    hidePendingScreen();
    stopAllListeners();
  }
});

async function loadUserProfile(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      App.userProfile = doc.data();
      App.isAdmin = App.userProfile.role === 'admin';
    } else {
      showOnboarding && showOnboarding();
    }
    updateSidebarUser();
  } catch (e) {
    console.error('Profile load error:', e);
  }
}

// ─── Auth: Email Login ───────────────────────────────────────
async function loginEmail(e) {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value;
  const pass  = document.getElementById('loginPass').value;
  const btn   = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';
  try {
    await auth.signInWithEmailAndPassword(email, pass);
    showToast('Welcome back!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="log-in"></i> Sign In';
    if (window.lucide) lucide.createIcons();
  }
}

// ─── Auth: Email Register ────────────────────────────────────
async function registerEmail(e) {
  e.preventDefault();
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const pass  = document.getElementById('regPass').value;
  const code  = document.getElementById('regCode').value.trim();
  const role  = document.getElementById('regRole').value; // 'student' or 'admin' (set by secret key flow)
  const phone = (document.getElementById('regPhone')?.value || '').trim();
  const instituteName = (document.getElementById('regInstituteName')?.value || '').trim() || name + "'s Institute";
  const btn   = document.getElementById('registerBtn');

  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';

  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });

    if (role === 'admin') {
      // ── ADMIN PATH: save as pending_admin, notify Discord ──
      await db.collection('users').doc(cred.user.uid).set({
        name, email, phone, instituteName,
        role: 'pending_admin',   // NOT active admin yet
        instituteId: null,
        totalPoints: 0, weeklyPoints: 0, monthlyPoints: 0,
        streak: 0, studyHours: 0, attendanceCount: 0, testsGiven: 0,
        appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Separate collection for easy admin review
      await db.collection('adminApplications').doc(cred.user.uid).set({
        uid: cred.user.uid, name, email, phone, instituteName,
        status: 'pending',
        appliedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

      // Ping Discord
      await notifyDiscordAdmin({ uid: cred.user.uid, name, email, phone, instituteName });

      showToast('Application submitted! You will be notified once approved.', 'success');

    } else {
      // ── STUDENT PATH: require valid institute code ──
      if (!code) {
        showToast('Please enter your institute code.', 'warning');
        await cred.user.delete();
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="user-plus"></i> Create Account';
        if (window.lucide) lucide.createIcons();
        return;
      }
      const snap = await db.collection('institutes')
        .where('code', '==', code.toUpperCase()).get();
      if (snap.empty) {
        showToast('Invalid institute code. Ask your admin for the correct code.', 'error');
        await cred.user.delete();
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="user-plus"></i> Create Account';
        if (window.lucide) lucide.createIcons();
        return;
      }
      const instituteId = snap.docs[0].id;
      await db.collection('institutes').doc(instituteId).update({
        totalStudents: firebase.firestore.FieldValue.increment(1)
      });
      await db.collection('users').doc(cred.user.uid).set({
        name, email, role: 'student', instituteId,
        totalPoints: 0, weeklyPoints: 0, monthlyPoints: 0,
        streak: 0, studyHours: 0, attendanceCount: 0, testsGiven: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });
      showToast('Account created! Welcome to RankForge 🎉', 'success');
    }
  } catch (err) {
    showToast(err.message, 'error');
    btn.disabled = false;
    btn.innerHTML = '<i data-lucide="user-plus"></i> Create Account';
    if (window.lucide) lucide.createIcons();
  }
}

// ─── Auth: Google ────────────────────────────────────────────
async function loginGoogle() {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    const result = await auth.signInWithPopup(provider);
    const uid = result.user.uid;
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) {
      document.getElementById('googleRoleModal').classList.add('open');
      window._pendingGoogleUser = result.user;
    }
    showToast('Signed in with Google!', 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

async function completeGoogleSetup() {
  const u = window._pendingGoogleUser;
  const code = document.getElementById('googleCode').value.trim();
  if (!u) return;

  if (!code) {
    showToast('Please enter your institute code.', 'warning');
    return;
  }

  const snap = await db.collection('institutes')
    .where('code', '==', code.toUpperCase()).get();
  if (snap.empty) {
    showToast('Invalid institute code. Ask your admin.', 'error');
    return;
  }
  const instituteId = snap.docs[0].id;
  await db.collection('institutes').doc(instituteId).update({
    totalStudents: firebase.firestore.FieldValue.increment(1)
  });
  await db.collection('users').doc(u.uid).set({
    name: u.displayName, email: u.email, role: 'student', instituteId,
    totalPoints: 0, weeklyPoints: 0, monthlyPoints: 0,
    streak: 0, studyHours: 0, attendanceCount: 0, testsGiven: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  document.getElementById('googleRoleModal').classList.remove('open');
  showToast('Setup complete! Welcome to RankForge 🎉', 'success');
}

function logout() {
  auth.signOut();
  showToast('Signed out successfully', 'info');
}

// ─── Navigation ──────────────────────────────────────────────
const PAGE_TITLES = {
  dashboard:   { icon: 'layout-dashboard', label: 'Dashboard' },
  sessions:    { icon: 'video', label: 'Live Sessions' },
  leaderboard: { icon: 'trophy', label: 'Leaderboard' },
  sprint:      { icon: 'zap', label: 'Rank Sprint' },
  analytics:   { icon: 'bar-chart-2', label: 'Analytics' },
  students:    { icon: 'users', label: 'Students' },
  'add-points':{ icon: 'star', label: 'Add Points' },
  profile:     { icon: 'user-circle', label: 'Profile' },
};

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  if (pageEl) {
    pageEl.classList.add('active');
    App.currentPage = page;
  }

  document.querySelectorAll(`[data-page="${page}"]`).forEach(el => el.classList.add('active'));

  // Update topbar title with icon
  const meta = PAGE_TITLES[page] || { icon: 'layout-dashboard', label: 'RankForge' };
  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) {
    titleEl.innerHTML = `<i data-lucide="${meta.icon}" style="width:16px;height:16px;color:var(--yellow)"></i>${meta.label}`;
  }

  loadPageData(page);
  closeMobileSidebar();
  setTimeout(() => { if (window.lucide) lucide.createIcons(); }, 50);
}

function loadPageData(page) {
  switch(page) {
    case 'dashboard':    renderDashboard(); break;
    case 'sessions':     renderSessions(); break;
    case 'leaderboard':  renderLeaderboard(); break;
    case 'sprint':       renderSprint(); break;
    case 'analytics':    renderAnalytics(); break;
    case 'students':     renderStudents(); break;
  }
}

// ─── App Init ────────────────────────────────────────────────
function initApp() {
  updateSidebarUser();
  updateNavForRole();
  startClock();
  navigate('dashboard');
  startStreakCheck();
  // Apply saved theme
  const savedTheme = localStorage.getItem('rf_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  if (typeof updateThemeIcon === 'function') updateThemeIcon();
}

function updateNavForRole() {
  const adminItems = document.querySelectorAll('.admin-only');
  const studentItems = document.querySelectorAll('.student-only');
  adminItems.forEach(el => el.classList.toggle('hidden', !App.isAdmin));
  studentItems.forEach(el => el.classList.toggle('hidden', App.isAdmin));
}

function updateSidebarUser() {
  const p = App.userProfile;
  if (!p) return;

  document.getElementById('sidebarUserName').textContent = p.name || 'User';
  document.getElementById('sidebarUserRank').textContent =
    App.isAdmin ? 'Admin' : `#${p.rank || '—'} · ${(p.totalPoints || 0).toLocaleString()} pts`;

  // Avatar in sidebar
  const avatarEl = document.getElementById('sidebarUserAvatar');
  if (avatarEl) {
    avatarEl.innerHTML = '';
    if (p.avatar) {
      const img = document.createElement('img');
      img.src = p.avatar;
      img.alt = p.name || 'Avatar';
      img.onerror = () => {
        avatarEl.textContent = (p.name || 'U')[0].toUpperCase();
      };
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = (p.name || 'U')[0].toUpperCase();
    }
  }

  const streakEl = document.getElementById('sidebarStreak');
  if (streakEl) streakEl.textContent = `${p.streak || 0} day streak`;
}

function startClock() {
  function tick() {
    const now = new Date();
    const el = document.getElementById('topbarClock');
    if (el) el.textContent = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  tick();
  setInterval(tick, 1000);
}

function stopAllListeners() {
  App.unsubscribers.forEach(fn => fn && fn());
  App.unsubscribers = [];
}

// ─── Utilities ───────────────────────────────────────────────
function generateInstCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({length: 6}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function getWeekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now - start) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week.toString().padStart(2, '0')}`;
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${(now.getMonth()+1).toString().padStart(2,'0')}`;
}

function timeSince(ts) {
  if (!ts) return 'never';
  const seconds = Math.floor((Date.now() - ts.toMillis()) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds/60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds/3600)}h ago`;
  return `${Math.floor(seconds/86400)}d ago`;
}

function formatHours(h) {
  if (!h) return '0h 0m';
  return `${Math.floor(h)}h ${Math.round((h % 1) * 60)}m`;
}

// ─── Points System ───────────────────────────────────────────
const POINT_VALUES = {
  ATTENDANCE:   15,
  STUDY_HOUR:   10,
  TEST_PASS:    25,
  TEST_PERFECT: 50,
  TASK_DONE:    8,
  GOAL_MET:     12,
  REPORT_FILED: 5,
  STREAK_7:     30,
  STREAK_30:    100,
};

async function awardPoints(uid, type, amount, reason) {
  const batch = db.batch();
  const userRef = db.collection('users').doc(uid);
  const logRef  = db.collection('users').doc(uid).collection('pointLogs').doc();

  batch.update(userRef, {
    totalPoints:   firebase.firestore.FieldValue.increment(amount),
    weeklyPoints:  firebase.firestore.FieldValue.increment(amount),
    monthlyPoints: firebase.firestore.FieldValue.increment(amount),
  });

  batch.set(logRef, {
    type, amount, reason,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  });

  await batch.commit();
  await updateLeaderboard(uid);
}

async function updateLeaderboard(uid) {
  const userDoc = await db.collection('users').doc(uid).get();
  const user = userDoc.data();
  if (!user?.instituteId) return;

  const weekKey  = getWeekKey();
  const monthKey = getMonthKey();
  const lbRef    = db.collection('institutes').doc(user.instituteId).collection('leaderboard');

  await lbRef.doc(`weekly-${weekKey}`).set({
    [`${uid}`]: { name: user.name, points: user.weeklyPoints, uid }
  }, { merge: true });

  await lbRef.doc(`monthly-${monthKey}`).set({
    [`${uid}`]: { name: user.name, points: user.monthlyPoints, uid }
  }, { merge: true });
}

// ─── Mobile Sidebar ──────────────────────────────────────────
function openMobileSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('mobileOverlay').classList.add('open');
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobileOverlay').classList.remove('open');
}

// ─── Streak Check ────────────────────────────────────────────
async function startStreakCheck() {
  if (!App.currentUser) return;
  const today = new Date().toDateString();
  const lastKey = `rf_lastActive_${App.currentUser.uid}`;
  const last = localStorage.getItem(lastKey);
  if (last !== today) {
    localStorage.setItem(lastKey, today);
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    if (last === yesterday) {
      const newStreak = (App.userProfile?.streak || 0) + 1;
      await db.collection('users').doc(App.currentUser.uid).update({ streak: newStreak });
      App.userProfile.streak = newStreak;
      updateSidebarUser();
      if (newStreak === 7)  await awardPoints(App.currentUser.uid, 'STREAK_7', POINT_VALUES.STREAK_7, '7-Day Streak!');
      if (newStreak === 30) await awardPoints(App.currentUser.uid, 'STREAK_30', POINT_VALUES.STREAK_30, '30-Day Legend!');
    } else if (last && last !== yesterday) {
      await db.collection('users').doc(App.currentUser.uid).update({ streak: 1 });
      App.userProfile.streak = 1;
      updateSidebarUser();
    }
  }
}

// ─── Auth Tab Switch ─────────────────────────────────────────
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.auth-panel').forEach(p => {
    p.style.display = 'none';
    p.classList.remove('active');
  });
  document.querySelector(`[data-auth="${tab}"]`).classList.add('active');
  const panel = document.getElementById(`auth-${tab}`);
  if (panel) { panel.style.display = 'block'; panel.classList.add('active'); }
}

// ─── Event Delegation ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('loginForm')?.addEventListener('submit', loginEmail);
  document.getElementById('registerForm')?.addEventListener('submit', registerEmail);
});

// ─── Cloudinary Avatar Upload ─────────────────────────────────
async function uploadAvatarToCloudinary(file) {
  const cloudName    = "dkxuilgai";
  const uploadPreset = "rankforge";

  const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);

  const response = await fetch(url, { method: "POST", body: formData });
  const data = await response.json();

  if (!response.ok) throw new Error(data.error?.message || "Upload failed");
  return data.secure_url;
}

// ─── Handle Avatar Upload ─────────────────────────────────────
async function handleAvatarUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (file.size > 2 * 1024 * 1024) {
    showToast("Image must be under 2MB", "warning");
    return;
  }

  const statusEl = document.getElementById('avatarUploadStatus');
  if (statusEl) statusEl.textContent = 'Uploading...';

  try {
    showToast("Uploading avatar...", "info");

    const avatarUrl = await uploadAvatarToCloudinary(file);

    await db.collection("users").doc(App.currentUser.uid).update({ avatar: avatarUrl });
    App.userProfile.avatar = avatarUrl;

    updateSidebarUser();

    // Update profile page avatar too
    const profAvatar = document.getElementById('profileAvatar');
    if (profAvatar) {
      profAvatar.innerHTML = `<img src="${avatarUrl}" alt="Avatar">`;
    }

    if (statusEl) statusEl.textContent = 'Photo updated!';
    showToast("Avatar updated successfully!", "success");

  } catch (err) {
    if (statusEl) statusEl.textContent = 'Upload failed.';
    showToast(err.message, "error");
  }
}
