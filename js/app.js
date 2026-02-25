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
    document.getElementById('authScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    initApp();
  } else {
    App.currentUser = null;
    App.userProfile = null;
    document.getElementById('authScreen').classList.remove('hidden');
    document.getElementById('appShell').classList.add('hidden');
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
  const name  = document.getElementById('regName').value;
  const email = document.getElementById('regEmail').value;
  const pass  = document.getElementById('regPass').value;
  const code  = document.getElementById('regCode').value;
  const role  = document.getElementById('regRole').value;
  const btn   = document.getElementById('registerBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner"></div>';
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, pass);
    await cred.user.updateProfile({ displayName: name });
    let instituteId = null;
    if (role === 'student' && code) {
      const snap = await db.collection('institutes')
        .where('code', '==', code.toUpperCase()).get();
      if (!snap.empty) {
        instituteId = snap.docs[0].id;
        await db.collection('institutes').doc(instituteId).update({
          totalStudents: firebase.firestore.FieldValue.increment(1)
        });
      } else {
        showToast('Invalid institute code', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="user-plus"></i> Create Account';
        if (window.lucide) lucide.createIcons();
        return;
      }
    }
    await db.collection('users').doc(cred.user.uid).set({
      name, email, role, instituteId,
      totalPoints: 0, weeklyPoints: 0, monthlyPoints: 0,
      streak: 0, studyHours: 0, attendanceCount: 0, testsGiven: 0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    if (role === 'admin') {
      const instRef = await db.collection('institutes').add({
        name: `${name}'s Institute`,
        code: generateInstCode(),
        ownerUid: cred.user.uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        totalStudents: 0,
      });
      await db.collection('users').doc(cred.user.uid).update({ instituteId: instRef.id });
    }
    showToast('Account created! Welcome to RankForge', 'success');
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
  const role = document.getElementById('googleRole').value;
  const code = document.getElementById('googleCode').value;
  if (!u) return;
  let instituteId = null;
  if (role === 'student') {
    const snap = await db.collection('institutes')
      .where('code', '==', code.toUpperCase()).get();
    if (!snap.empty) {
      instituteId = snap.docs[0].id;
      await db.collection('institutes').doc(instituteId).update({
        totalStudents: firebase.firestore.FieldValue.increment(1)
      });
    } else {
      showToast('Invalid institute code', 'error');
      return;
    }
  }
  await db.collection('users').doc(u.uid).set({
    name: u.displayName, email: u.email, role, instituteId,
    totalPoints: 0, weeklyPoints: 0, monthlyPoints: 0,
    streak: 0, studyHours: 0, attendanceCount: 0, testsGiven: 0,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  });
  if (role === 'admin') {
    const instRef = await db.collection('institutes').add({
      name: `${u.displayName}'s Institute`,
      code: generateInstCode(),
      ownerUid: u.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      totalStudents: 0,
    });
    await db.collection('users').doc(u.uid).update({ instituteId: instRef.id });
  }
  document.getElementById('googleRoleModal').classList.remove('open');
  showToast('Setup complete! Welcome to RankForge', 'success');
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
