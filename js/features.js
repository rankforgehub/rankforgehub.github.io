// ============================================================
// RANKFORGE — Advanced Features v1.0
// Badges · Study Goals · Head-to-Head · Announcements
// Attendance Export · Student of the Week · Pomodoro History · PWA
// ============================================================

// ════════════════════════════════════════════════════════════
//  BADGES & ACHIEVEMENTS
// ════════════════════════════════════════════════════════════

const BADGE_DEFINITIONS = [
  { id: 'streak_7',      icon: 'flame',         color: '#f97316', label: '7-Day Streak',      desc: 'Study 7 days in a row',            check: p => (p.streak || 0) >= 7 },
  { id: 'streak_30',     icon: 'award',         color: '#ffd100', label: '30-Day Legend',     desc: 'Study 30 days in a row',           check: p => (p.streak || 0) >= 30 },
  { id: 'hours_10',      icon: 'clock',         color: '#22d3ee', label: '10h Scholar',       desc: 'Log 10 total study hours',         check: p => (p.studyHours || 0) >= 10 },
  { id: 'hours_50',      icon: 'clock-4',       color: '#06b6d4', label: '50h Grinder',       desc: 'Log 50 total study hours',         check: p => (p.studyHours || 0) >= 50 },
  { id: 'hours_100',     icon: 'timer',         color: '#0e7490', label: '100h Titan',        desc: 'Log 100 total study hours',        check: p => (p.studyHours || 0) >= 100 },
  { id: 'points_500',    icon: 'star',          color: '#ffd100', label: '500 Points',        desc: 'Earn 500 total points',            check: p => (p.totalPoints || 0) >= 500 },
  { id: 'points_1000',   icon: 'star',          color: '#f59e0b', label: '1K Elite',          desc: 'Earn 1000 total points',           check: p => (p.totalPoints || 0) >= 1000 },
  { id: 'points_5000',   icon: 'crown',         color: '#d97706', label: '5K Legend',         desc: 'Earn 5000 total points',           check: p => (p.totalPoints || 0) >= 5000 },
  { id: 'sessions_10',   icon: 'video',         color: '#22c55e', label: 'Regular',           desc: 'Attend 10 sessions',               check: p => (p.attendanceCount || 0) >= 10 },
  { id: 'sessions_50',   icon: 'calendar-check',color: '#16a34a', label: 'Dedicated',         desc: 'Attend 50 sessions',               check: p => (p.attendanceCount || 0) >= 50 },
  { id: 'tests_5',       icon: 'file-text',     color: '#a78bfa', label: 'Test Taker',        desc: 'Complete 5 tests',                 check: p => (p.testsGiven || 0) >= 5 },
  { id: 'tests_20',      icon: 'graduation-cap',color: '#7c3aed', label: 'Exam Ready',        desc: 'Complete 20 tests',                check: p => (p.testsGiven || 0) >= 20 },
  { id: 'top3',          icon: 'trophy',        color: '#ffd100', label: 'Podium Finisher',   desc: 'Reach top 3 on leaderboard',       check: p => (p.bestRank || 99) <= 3 },
  { id: 'first_session', icon: 'zap',           color: '#34d399', label: 'First Step',        desc: 'Complete your first session',      check: p => (p.attendanceCount || 0) >= 1 },
];

async function checkAndAwardBadges(uid, profile) {
  if (!uid || !profile) return;
  const earned = profile.badges || [];
  const newBadges = BADGE_DEFINITIONS.filter(b => !earned.includes(b.id) && b.check(profile));
  if (newBadges.length === 0) return;

  const ids = newBadges.map(b => b.id);
  await db.collection('users').doc(uid).update({
    badges: firebase.firestore.FieldValue.arrayUnion(...ids)
  });
  App.userProfile.badges = [...earned, ...ids];

  // Show toast for each new badge
  newBadges.forEach((b, i) => {
    setTimeout(() => {
      showToast(`Badge unlocked: ${b.label}`, 'success');
    }, i * 800);
  });
}

function renderBadges(badges = [], container) {
  if (!container) return;
  const earned = new Set(badges);
  container.innerHTML = BADGE_DEFINITIONS.map(b => {
    const has = earned.has(b.id);
    return `
      <div title="${b.desc}" style="
        display:flex;flex-direction:column;align-items:center;gap:6px;
        padding:14px 10px;border-radius:12px;text-align:center;
        background:${has ? 'var(--bg-elevated)' : 'var(--bg-deep)'};
        border:1px solid ${has ? b.color + '44' : 'var(--border-dim)'};
        opacity:${has ? '1' : '0.35'};transition:all 0.2s;cursor:default;
        min-width:80px;
      ">
        <div style="width:40px;height:40px;border-radius:50%;
          background:${has ? b.color + '22' : 'var(--bg-surface)'};
          border:2px solid ${has ? b.color : 'var(--border-dim)'};
          display:flex;align-items:center;justify-content:center;
          color:${has ? b.color : 'var(--text-muted)'}">
          <i data-lucide="${b.icon}" style="width:18px;height:18px"></i>
        </div>
        <div style="font-size:0.68rem;font-weight:${has ? '600' : '400'};
          color:${has ? 'var(--text-primary)' : 'var(--text-muted)'};
          line-height:1.2">${b.label}</div>
        ${has ? `<div style="width:6px;height:6px;border-radius:50%;background:${b.color}"></div>` : ''}
      </div>`;
  }).join('');
  reIcons();
}

// ════════════════════════════════════════════════════════════
//  STUDY GOALS
// ════════════════════════════════════════════════════════════

async function renderStudyGoals() {
  const page = document.getElementById('page-goals');
  if (!page) return;

  const uid = App.currentUser?.uid;
  if (!uid) return;

  let goals = [];
  try {
    const snap = await db.collection('users').doc(uid).collection('goals')
      .orderBy('createdAt', 'desc').limit(20).get();
    goals = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}

  const p = App.userProfile || {};
  const dailyHours  = (p.studyHours || 0);
  const dailyTarget = p.dailyGoalHours || 4;
  const dailyPct    = Math.min(100, Math.round((dailyHours % 24) / dailyTarget * 100));

  page.innerHTML = `
    <div class="page-header">
      <h2>Study Goals</h2>
      <p>Set daily and weekly targets. Track your progress. Stay accountable.</p>
    </div>

    <!-- Daily Target Card -->
    <div class="grid-2 mb-6" style="gap:22px">
      <div class="card card-glow-y">
        <div class="card-header">
          <div class="card-title"><i data-lucide="target"></i> Daily Study Target</div>
          <span class="badge badge-yellow">${dailyTarget}h / day</span>
        </div>
        <div style="text-align:center;margin:20px 0">
          <div style="position:relative;width:120px;height:120px;margin:0 auto">
            <svg viewBox="0 0 120 120" width="120" height="120">
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--border-dim)" stroke-width="10"/>
              <circle cx="60" cy="60" r="50" fill="none" stroke="var(--yellow)" stroke-width="10"
                stroke-dasharray="${Math.round(314 * dailyPct / 100)} 314"
                stroke-linecap="round" transform="rotate(-90 60 60)"
                style="transition:stroke-dasharray 0.6s ease"/>
            </svg>
            <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
              <div style="font-size:1.4rem;font-weight:700;color:var(--yellow)">${dailyPct}%</div>
              <div style="font-size:0.65rem;color:var(--text-muted);font-family:var(--font-mono)">today</div>
            </div>
          </div>
        </div>
        <div class="form-group" style="margin-bottom:12px">
          <label class="form-label">Daily target (hours)</label>
          <div class="input-wrap">
            <i data-lucide="clock"></i>
            <input type="number" id="dailyGoalInput" class="form-input" value="${dailyTarget}" min="1" max="16" step="0.5">
          </div>
        </div>
        <button class="btn btn-primary w-full" onclick="saveDailyGoal()">
          <i data-lucide="save"></i> Save Target
        </button>
      </div>

      <!-- Add New Goal -->
      <div class="card">
        <div class="card-header">
          <div class="card-title"><i data-lucide="plus-circle"></i> Add Goal</div>
        </div>
        <div class="form-group">
          <label class="form-label">Goal Title</label>
          <div class="input-wrap">
            <i data-lucide="edit-3"></i>
            <input type="text" id="goalTitle" class="form-input" placeholder="e.g. Finish Thermodynamics chapter">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Type</label>
          <select id="goalType" class="form-input">
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="custom">Custom</option>
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Target Date</label>
          <div class="input-wrap">
            <i data-lucide="calendar"></i>
            <input type="date" id="goalDeadline" class="form-input" value="${new Date(Date.now() + 86400000).toISOString().split('T')[0]}">
          </div>
        </div>
        <button class="btn btn-primary w-full" onclick="addStudyGoal()">
          <i data-lucide="plus"></i> Add Goal
        </button>
      </div>
    </div>

    <!-- Goals List -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="list-checks"></i> My Goals</div>
        <div class="flex gap-2">
          <span class="badge badge-green">${goals.filter(g => g.done).length} done</span>
          <span class="badge badge-yellow">${goals.filter(g => !g.done).length} active</span>
        </div>
      </div>
      <div id="goalsList">
        ${goals.length === 0
          ? `<div class="empty-state">
              <i data-lucide="target" style="width:32px;height:32px;color:var(--text-muted)"></i>
              <div class="empty-title">No goals yet</div>
              <div class="empty-desc">Add your first study goal above</div>
            </div>`
          : goals.map(g => goalCard(g)).join('')
        }
      </div>
    </div>
  `;
  reIcons();
}

function goalCard(g) {
  const deadline = g.deadline ? new Date(g.deadline).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '';
  const overdue  = g.deadline && !g.done && new Date(g.deadline) < new Date();
  return `
    <div class="flex items-center gap-3 mb-3 p-3 rounded-lg" style="
      background:var(--bg-elevated);border:1px solid ${g.done ? 'var(--border-dim)' : overdue ? 'rgba(244,63,94,0.2)' : 'var(--border-soft)'};
      border-radius:10px;opacity:${g.done ? '0.6' : '1'}">
      <button onclick="toggleGoal('${g.id}', ${!g.done})" style="
        width:22px;height:22px;border-radius:6px;border:2px solid ${g.done ? 'var(--green)' : 'var(--border-soft)'};
        background:${g.done ? 'var(--green)' : 'transparent'};cursor:pointer;flex-shrink:0;
        display:flex;align-items:center;justify-content:center;color:#fff">
        ${g.done ? '<i data-lucide="check" style="width:12px;height:12px"></i>' : ''}
      </button>
      <div style="flex:1;min-width:0">
        <div style="font-size:0.88rem;font-weight:500;color:var(--text-primary);
          text-decoration:${g.done ? 'line-through' : 'none'}">${g.title}</div>
        <div class="text-xs text-muted" style="margin-top:2px;display:flex;align-items:center;gap:8px">
          <span class="badge ${g.type === 'daily' ? 'badge-cyan' : g.type === 'weekly' ? 'badge-yellow' : 'badge-muted'}" style="font-size:0.6rem">${g.type}</span>
          ${deadline ? `<span style="color:${overdue ? 'var(--red)' : 'var(--text-muted)'}">
            <i data-lucide="calendar" style="width:10px;height:10px;vertical-align:middle"></i> ${deadline}
          </span>` : ''}
        </div>
      </div>
      <button onclick="deleteGoal('${g.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);padding:4px">
        <i data-lucide="trash-2" style="width:14px;height:14px"></i>
      </button>
    </div>`;
}

async function addStudyGoal() {
  const title    = document.getElementById('goalTitle')?.value.trim();
  const type     = document.getElementById('goalType')?.value;
  const deadline = document.getElementById('goalDeadline')?.value;
  if (!title) { showToast('Enter a goal title', 'warning'); return; }
  await db.collection('users').doc(App.currentUser.uid).collection('goals').add({
    title, type, deadline, done: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  showToast('Goal added!', 'success');
  renderStudyGoals();
}

async function toggleGoal(id, done) {
  await db.collection('users').doc(App.currentUser.uid).collection('goals').doc(id).update({ done });
  if (done) {
    await awardPoints(App.currentUser.uid, 'GOAL_MET', POINT_VALUES.GOAL_MET, 'Goal completed!');
    showToast('+' + POINT_VALUES.GOAL_MET + ' pts — Goal completed!', 'success');
  }
  renderStudyGoals();
}

async function deleteGoal(id) {
  await db.collection('users').doc(App.currentUser.uid).collection('goals').doc(id).delete();
  renderStudyGoals();
}

async function saveDailyGoal() {
  const val = parseFloat(document.getElementById('dailyGoalInput')?.value) || 4;
  await db.collection('users').doc(App.currentUser.uid).update({ dailyGoalHours: val });
  App.userProfile.dailyGoalHours = val;
  showToast('Daily target updated!', 'success');
  renderStudyGoals();
}

// ════════════════════════════════════════════════════════════
//  HEAD-TO-HEAD CHALLENGES
// ════════════════════════════════════════════════════════════

async function renderH2H() {
  const page = document.getElementById('page-h2h');
  if (!page) return;

  const uid = App.currentUser?.uid;
  let incoming = [], outgoing = [], active = [];

  try {
    // Split queries to avoid needing composite Firestore indexes
    const [inSnap, outSnap, actAsChallenger, actAsChallenged] = await Promise.all([
      db.collection('duels').where('challengedUid', '==', uid).where('status', '==', 'pending').get(),
      db.collection('duels').where('challengerUid', '==', uid).where('status', '==', 'pending').get(),
      db.collection('duels').where('challengerUid', '==', uid).where('status', '==', 'active').get(),
      db.collection('duels').where('challengedUid', '==', uid).where('status', '==', 'active').get(),
    ]);
    incoming = inSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    outgoing = outSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    // Merge active duels (as challenger or challenged), deduplicate by id
    const actMap = {};
    [...actAsChallenger.docs, ...actAsChallenged.docs].forEach(d => { actMap[d.id] = { id: d.id, ...d.data() }; });
    active = Object.values(actMap);
  } catch(e) { console.error('H2H load error:', e); }

  // Load students for challenge picker
  let students = [];
  if (App.userProfile?.instituteId) {
    try {
      const snap = await db.collection('users')
        .where('instituteId', '==', App.userProfile.instituteId)
        .where('role', '==', 'student').get();
      students = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(s => s.id !== uid);
    } catch(e) {}
  }

  page.innerHTML = `
    <div class="page-header">
      <h2>Head-to-Head</h2>
      <p>Challenge a fellow student to a 1v1 study duel. Most hours in the time limit wins.</p>
    </div>

    <!-- Incoming challenges -->
    ${incoming.length > 0 ? `
    <div class="card mb-6" style="border-color:rgba(255,209,0,0.3)">
      <div class="card-header">
        <div class="card-title"><i data-lucide="bell" style="color:var(--yellow)"></i> Incoming Challenges</div>
        <span class="badge badge-yellow">${incoming.length}</span>
      </div>
      ${incoming.map(d => `
        <div class="flex items-center justify-between mb-3 p-3" style="background:var(--bg-elevated);border-radius:10px">
          <div>
            <div style="font-weight:600">${d.challengerName || 'Someone'} challenged you!</div>
            <div class="text-xs text-muted mono">${d.durationHours}h duel · ${new Date(d.createdAt?.toMillis?.() || Date.now()).toLocaleDateString()}</div>
          </div>
          <div class="flex gap-2">
            <button class="btn btn-sm" style="background:var(--green-dim);color:var(--green);border:1px solid rgba(34,197,94,0.2)" onclick="acceptDuel('${d.id}')">
              <i data-lucide="check"></i> Accept
            </button>
            <button class="btn btn-sm btn-danger" onclick="declineDuel('${d.id}')">
              <i data-lucide="x"></i> Decline
            </button>
          </div>
        </div>`).join('')}
    </div>` : ''}

    <!-- Active duels -->
    ${active.length > 0 ? `
    <div class="card mb-6">
      <div class="card-header">
        <div class="card-title"><i data-lucide="swords"></i> Active Duels</div>
        <span class="live-dot">LIVE</span>
      </div>
      ${active.map(d => {
        const myMinutes    = d.progress?.[uid]?.studyMinutes || 0;
        const oppUid       = d.participants?.find(p => p !== uid);
        const oppMinutes   = d.progress?.[oppUid]?.studyMinutes || 0;
        const oppName      = d.challengerUid === uid ? d.challengedName : d.challengerName;
        const myHours      = (myMinutes / 60).toFixed(1);
        const oppHours     = (oppMinutes / 60).toFixed(1);
        const endsAt       = d.endsAt ? formatTimeLeft(d.endsAt.toMillis?.() || d.endsAt) : '?';
        const leading      = myMinutes >= oppMinutes;
        return `
          <div class="mb-3 p-4" style="background:var(--bg-elevated);border-radius:12px;border:1px solid var(--border-soft)">
            <div class="flex justify-between items-center mb-3">
              <div style="font-weight:600">vs ${oppName || 'Opponent'}</div>
              <span class="text-xs mono text-muted">Ends ${endsAt}</span>
            </div>
            <div class="flex gap-3 items-center">
              <div style="flex:1;text-align:center">
                <div style="font-size:1.4rem;font-weight:700;color:${leading ? 'var(--green)' : 'var(--text-primary)'}">${myHours}h</div>
                <div class="text-xs text-muted">You</div>
              </div>
              <div style="color:var(--text-muted);font-weight:700">VS</div>
              <div style="flex:1;text-align:center">
                <div style="font-size:1.4rem;font-weight:700;color:${!leading ? 'var(--red)' : 'var(--text-primary)'}">${oppHours}h</div>
                <div class="text-xs text-muted">${oppName || 'Opponent'}</div>
              </div>
            </div>
            <div class="progress-bar" style="margin-top:12px;height:6px">
              <div class="progress-fill ${leading ? 'green' : 'yellow'}" style="width:${myMinutes + oppMinutes > 0 ? Math.round(myMinutes / (myMinutes + oppMinutes) * 100) : 50}%"></div>
            </div>
          </div>`;
      }).join('')}
    </div>` : ''}

    <!-- Challenge someone -->
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="swords"></i> Challenge a Student</div>
      </div>
      ${students.length === 0
        ? `<div class="empty-state"><i data-lucide="users" style="width:28px;height:28px;color:var(--text-muted)"></i><div class="empty-title">No students found</div><div class="empty-desc">Students from your institute will appear here</div></div>`
        : `
        <div class="form-group">
          <label class="form-label">Select Opponent</label>
          <select id="duelOpponent" class="form-input">
            <option value="">Choose a student...</option>
            ${students.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name} — ${(s.totalPoints||0).toLocaleString()} pts</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Duel Duration</label>
          <select id="duelDuration" class="form-input">
            <option value="1">1 hour sprint</option>
            <option value="3">3 hour battle</option>
            <option value="6">6 hour grind</option>
            <option value="12" selected>12 hour marathon</option>
            <option value="24">24 hour legend</option>
          </select>
        </div>
        <button class="btn btn-primary" onclick="sendDuelChallenge()">
          <i data-lucide="swords"></i> Send Challenge
        </button>`
      }
    </div>

    ${outgoing.length > 0 ? `
    <div class="card mt-6">
      <div class="card-header">
        <div class="card-title"><i data-lucide="clock"></i> Pending Sent</div>
      </div>
      ${outgoing.map(d => `
        <div class="flex items-center justify-between mb-2 p-3" style="background:var(--bg-elevated);border-radius:8px">
          <div>
            <span class="text-sm">Challenged <strong>${d.challengedName}</strong></span>
            <div class="text-xs text-muted mono">${d.durationHours}h duel · Awaiting response</div>
          </div>
          <button class="btn btn-ghost btn-sm" onclick="cancelDuel('${d.id}')">
            <i data-lucide="x"></i> Cancel
          </button>
        </div>`).join('')}
    </div>` : ''}
  `;
  reIcons();
}

async function sendDuelChallenge() {
  const select = document.getElementById('duelOpponent');
  const oppUid = select?.value;
  const oppName = select?.options[select.selectedIndex]?.dataset?.name;
  const durationHours = parseInt(document.getElementById('duelDuration')?.value) || 12;

  if (!oppUid) { showToast('Select an opponent', 'warning'); return; }

  const myName = App.userProfile?.name || 'Someone';
  const endsAt = new Date(Date.now() + durationHours * 3600000);

  await db.collection('duels').add({
    challengerUid:  App.currentUser.uid,
    challengerName: myName,
    challengedUid:  oppUid,
    challengedName: oppName,
    participants:   [App.currentUser.uid, oppUid],
    durationHours,
    status:         'pending',
    progress:       { [App.currentUser.uid]: { studyMinutes: 0 }, [oppUid]: { studyMinutes: 0 } },
    endsAt:         firebase.firestore.Timestamp.fromDate(endsAt),
    createdAt:      firebase.firestore.FieldValue.serverTimestamp(),
  });
  showToast(`Challenge sent to ${oppName}!`, 'success');
  renderH2H();
}

async function acceptDuel(id) {
  await db.collection('duels').doc(id).update({ status: 'active' });
  showToast('Duel accepted! Study hard!', 'success');
  renderH2H();
}

async function declineDuel(id) {
  await db.collection('duels').doc(id).update({ status: 'declined' });
  showToast('Challenge declined', 'info');
  renderH2H();
}

async function cancelDuel(id) {
  await db.collection('duels').doc(id).delete();
  showToast('Challenge cancelled', 'info');
  renderH2H();
}

// ════════════════════════════════════════════════════════════
//  ANNOUNCEMENTS (Admin posts, all see)
// ════════════════════════════════════════════════════════════

async function renderAnnouncements() {
  const page = document.getElementById('page-announcements');
  if (!page) return;

  let announcements = [];
  try {
    const snap = await db.collection('institutes').doc(App.userProfile?.instituteId)
      .collection('announcements').orderBy('createdAt', 'desc').limit(20).get();
    announcements = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}

  page.innerHTML = `
    <div class="page-header">
      <h2>Announcements</h2>
      <p>Updates and notices from your institute admin.</p>
    </div>

    ${App.isAdmin ? `
    <div class="card mb-6">
      <div class="card-header">
        <div class="card-title"><i data-lucide="megaphone"></i> Post Announcement</div>
      </div>
      <div class="form-group">
        <label class="form-label">Title</label>
        <div class="input-wrap">
          <i data-lucide="type"></i>
          <input type="text" id="annTitle" class="form-input" placeholder="e.g. Weekend Mock Test Schedule">
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Message</label>
        <textarea id="annBody" class="form-input" rows="3" placeholder="Write your announcement here..."></textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Priority</label>
        <select id="annPriority" class="form-input">
          <option value="normal">Normal</option>
          <option value="important">Important</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>
      <button class="btn btn-primary" onclick="postAnnouncement()">
        <i data-lucide="send"></i> Post Announcement
      </button>
    </div>` : ''}

    <div id="annList">
      ${announcements.length === 0
        ? `<div class="card"><div class="empty-state">
            <i data-lucide="megaphone" style="width:32px;height:32px;color:var(--text-muted)"></i>
            <div class="empty-title">No announcements yet</div>
            <div class="empty-desc">Admin announcements will appear here</div>
           </div></div>`
        : announcements.map(a => announcementCard(a)).join('')
      }
    </div>
  `;
  reIcons();
}

function announcementCard(a) {
  const priColor = { urgent: 'var(--red)', important: 'var(--yellow)', normal: 'var(--cyan)' };
  const priIcon  = { urgent: 'alert-triangle', important: 'alert-circle', normal: 'info' };
  const color    = priColor[a.priority] || priColor.normal;
  const ico      = priIcon[a.priority]  || priIcon.normal;
  const when     = a.createdAt ? timeSince(a.createdAt) : '';

  return `
    <div class="card mb-3" style="border-left:3px solid ${color}">
      <div class="flex items-center gap-3 mb-2">
        <div style="color:${color}"><i data-lucide="${ico}" style="width:16px;height:16px"></i></div>
        <div style="font-weight:700;flex:1">${a.title || 'Announcement'}</div>
        <div class="text-xs text-muted mono">${when}</div>
        ${App.isAdmin ? `<button onclick="deleteAnnouncement('${a.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-muted)">
          <i data-lucide="trash-2" style="width:13px;height:13px"></i></button>` : ''}
      </div>
      <div class="text-sm text-secondary" style="line-height:1.6">${a.body || ''}</div>
      <div class="text-xs text-muted" style="margin-top:8px">
        <i data-lucide="user" style="width:11px;height:11px;vertical-align:middle"></i>
        ${a.authorName || 'Admin'}
      </div>
    </div>`;
}

async function postAnnouncement() {
  const title    = document.getElementById('annTitle')?.value.trim();
  const body     = document.getElementById('annBody')?.value.trim();
  const priority = document.getElementById('annPriority')?.value || 'normal';
  if (!title || !body) { showToast('Fill in title and message', 'warning'); return; }

  await db.collection('institutes').doc(App.userProfile.instituteId)
    .collection('announcements').add({
      title, body, priority,
      authorName: App.userProfile.name,
      authorUid:  App.currentUser.uid,
      createdAt:  firebase.firestore.FieldValue.serverTimestamp(),
    });
  showToast('Announcement posted!', 'success');
  renderAnnouncements();
}

async function deleteAnnouncement(id) {
  await db.collection('institutes').doc(App.userProfile.instituteId)
    .collection('announcements').doc(id).delete();
  showToast('Deleted', 'info');
  renderAnnouncements();
}

// Dashboard badge — show unread announcement count
async function loadAnnouncementBadge() {
  try {
    const snap = await db.collection('institutes').doc(App.userProfile?.instituteId)
      .collection('announcements').orderBy('createdAt', 'desc').limit(1).get();
    if (!snap.empty) {
      const badge = document.getElementById('annNavBadge');
      if (badge) badge.style.display = 'inline-flex';
    }
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════
//  STUDENT OF THE WEEK  (Admin pins, shown on dashboard)
// ════════════════════════════════════════════════════════════

async function renderStudentOfWeek() {
  const container = document.getElementById('studentOfWeekCard');
  if (!container) return;
  try {
    const doc = await db.collection('institutes').doc(App.userProfile?.instituteId)
      .collection('spotlight').doc('current').get();
    if (!doc.exists) { container.style.display = 'none'; return; }
    const s = doc.data();
    container.style.display = '';
    container.innerHTML = `
      <div class="card card-glow-y" style="border-color:rgba(255,209,0,0.3)">
        <div class="card-header">
          <div class="card-title">
            <i data-lucide="star" style="color:var(--yellow)"></i> Student of the Week
          </div>
          ${App.isAdmin ? `<button class="btn btn-ghost btn-sm" onclick="showSpotlightModal()">
            <i data-lucide="edit-3"></i> Change
          </button>` : ''}
        </div>
        <div class="flex items-center gap-4" style="padding:8px 0">
          <div class="user-avatar" style="width:56px;height:56px;font-size:20px;border:2px solid var(--yellow)">
            ${s.avatar ? `<img src="${s.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : (s.name||'?')[0].toUpperCase()}
          </div>
          <div>
            <div style="font-size:1.1rem;font-weight:700;color:var(--yellow)">${s.name || 'Student'}</div>
            <div class="text-sm text-muted">${s.reason || 'Outstanding performance this week'}</div>
            <div class="text-xs mono" style="margin-top:4px;color:var(--cyan)">
              <i data-lucide="star" style="width:11px;height:11px;vertical-align:middle"></i>
              ${(s.points || 0).toLocaleString()} pts this week
            </div>
          </div>
        </div>
      </div>`;
    reIcons();
  } catch(e) { container.style.display = 'none'; }
}

async function showSpotlightModal() {
  if (!App.isAdmin) return;
  let students = [];
  try {
    const snap = await db.collection('users')
      .where('instituteId', '==', App.userProfile.instituteId)
      .where('role', '==', 'student').get();
    students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch(e) {}

  const modal = document.getElementById('spotlightModal');
  document.getElementById('spotlightStudentSelect').innerHTML =
    students.map(s => `<option value="${s.id}" data-name="${s.name}" data-pts="${s.weeklyPoints||0}" data-avatar="${s.avatar||''}">
      ${s.name} — ${(s.weeklyPoints||0)} pts this week
    </option>`).join('');
  modal?.classList.add('open');
  reIcons();
}

async function saveSpotlight() {
  const select = document.getElementById('spotlightStudentSelect');
  const reason = document.getElementById('spotlightReason')?.value.trim();
  const opt    = select?.options[select.selectedIndex];
  if (!opt) return;

  await db.collection('institutes').doc(App.userProfile.instituteId)
    .collection('spotlight').doc('current').set({
      uid:    select.value,
      name:   opt.dataset.name,
      points: parseInt(opt.dataset.pts) || 0,
      avatar: opt.dataset.avatar || '',
      reason: reason || 'Outstanding performance this week',
      setAt:  firebase.firestore.FieldValue.serverTimestamp(),
    });
  document.getElementById('spotlightModal')?.classList.remove('open');
  showToast('Spotlight updated!', 'success');
  renderStudentOfWeek();
}

// ════════════════════════════════════════════════════════════
//  POMODORO HISTORY
// ════════════════════════════════════════════════════════════

async function logPomodoroSession(sessionName) {
  if (!App.currentUser) return;
  const today = new Date().toISOString().split('T')[0];
  const ref   = db.collection('users').doc(App.currentUser.uid)
    .collection('pomodoroLogs').doc();
  await ref.set({
    session: sessionName,
    date:    today,
    type:    'focus',
    minutes: 25,
    ts:      firebase.firestore.FieldValue.serverTimestamp(),
  });
}

async function renderPomodoroHistory() {
  const container = document.getElementById('pomodoroHistoryList');
  if (!container) return;

  try {
    const snap = await db.collection('users').doc(App.currentUser.uid)
      .collection('pomodoroLogs').orderBy('ts', 'desc').limit(50).get();
    const logs = snap.docs.map(d => d.data());

    if (logs.length === 0) {
      container.innerHTML = `<div class="empty-state" style="padding:24px">
        <i data-lucide="timer" style="width:24px;height:24px;color:var(--text-muted)"></i>
        <div class="empty-title" style="font-size:0.85rem">No pomodoros logged yet</div>
      </div>`;
      reIcons(); return;
    }

    // Group by date
    const grouped = {};
    logs.forEach(l => {
      if (!grouped[l.date]) grouped[l.date] = [];
      grouped[l.date].push(l);
    });

    container.innerHTML = Object.entries(grouped).slice(0, 7).map(([date, entries]) => {
      const total = entries.reduce((s, e) => s + (e.minutes || 25), 0);
      const count = entries.length;
      return `
        <div class="mb-3">
          <div class="flex justify-between items-center mb-1">
            <span class="text-xs mono text-muted">${new Date(date).toLocaleDateString('en-IN', { weekday:'short', month:'short', day:'numeric' })}</span>
            <span class="text-xs mono" style="color:var(--yellow)">${count} pomodoros · ${Math.round(total/60*10)/10}h</span>
          </div>
          <div class="flex gap-1 flex-wrap">
            ${entries.map(e => `
              <div title="${e.session || 'Focus'} · ${e.minutes}min" style="
                width:28px;height:28px;border-radius:6px;
                background:var(--yellow-glow);border:1px solid rgba(255,209,0,0.3);
                display:flex;align-items:center;justify-content:center;cursor:default">
                <i data-lucide="timer" style="width:12px;height:12px;color:var(--yellow)"></i>
              </div>`).join('')}
          </div>
        </div>`;
    }).join('');
    reIcons();
  } catch(e) {
    container.innerHTML = `<div class="text-xs text-muted" style="padding:12px">${e.message}</div>`;
  }
}

// ════════════════════════════════════════════════════════════
//  ATTENDANCE EXPORT (Admin)
// ════════════════════════════════════════════════════════════

async function exportAttendanceCSV() {
  if (!App.isAdmin || !App.userProfile?.instituteId) return;

  showToast('Generating attendance report...', 'info');

  try {
    const snap = await db.collection('users')
      .where('instituteId', '==', App.userProfile.instituteId)
      .where('role', '==', 'student').get();

    const students = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    students.sort((a, b) => (b.totalPoints || 0) - (a.totalPoints || 0));

    const rows = [
      ['Rank', 'Name', 'Email', 'Total Points', 'Study Hours', 'Sessions Attended', 'Streak', 'Tests Given', 'Weekly Points', 'Monthly Points']
    ];

    students.forEach((s, i) => {
      rows.push([
        i + 1,
        s.name || '',
        s.email || '',
        s.totalPoints || 0,
        (s.studyHours || 0).toFixed(1),
        s.attendanceCount || 0,
        s.streak || 0,
        s.testsGiven || 0,
        s.weeklyPoints || 0,
        s.monthlyPoints || 0,
      ]);
    });

    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `rankforge-attendance-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('CSV downloaded!', 'success');
  } catch(e) {
    showToast('Export failed: ' + e.message, 'error');
  }
}

// ════════════════════════════════════════════════════════════
//  PWA — Progressive Web App
// ════════════════════════════════════════════════════════════

let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Show install button if available
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'flex';
});

window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'none';
  showToast('RankForge installed!', 'success');
});

async function promptPWAInstall() {
  if (!deferredInstallPrompt) {
    showToast('App is already installed or not available on this browser', 'info');
    return;
  }
  deferredInstallPrompt.prompt();
  const { outcome } = await deferredInstallPrompt.userChoice;
  if (outcome === 'accepted') showToast('Installing RankForge...', 'success');
  deferredInstallPrompt = null;
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

// ════════════════════════════════════════════════════════════
//  HELPERS shared by features
// ════════════════════════════════════════════════════════════

function formatTimeLeft(ms) {
  const diff  = ms - Date.now();
  if (diff <= 0) return 'Ended';
  const days  = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  if (days > 0)  return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h`;
  return 'ending soon';
}

// ─── Update active H2H duel with study minutes ────────────────
// Called from tickPomodoro (per focus block) and submitEndReport
async function updateDuelProgress(minutesStudied) {
  if (!App.currentUser || minutesStudied <= 0) return;
  const uid = App.currentUser.uid;
  try {
    // Find active duels this user is in (as challenger or challenged)
    const [asChallenger, asChallenged] = await Promise.all([
      db.collection('duels').where('challengerUid', '==', uid).where('status', '==', 'active').get(),
      db.collection('duels').where('challengedUid', '==', uid).where('status', '==', 'active').get(),
    ]);
    const allDuels = [...asChallenger.docs, ...asChallenged.docs];
    const batch = db.batch();
    allDuels.forEach(doc => {
      batch.update(doc.ref, {
        [`progress.${uid}.studyMinutes`]: firebase.firestore.FieldValue.increment(minutesStudied)
      });
    });
    if (allDuels.length > 0) await batch.commit();
  } catch(e) {
    console.warn('Duel progress update failed:', e.message);
  }
}
