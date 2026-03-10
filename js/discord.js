// ============================================================
// RANKFORGE — Discord Integration
// Handles: OAuth login, user data, server challenges display
// ============================================================

// ─── Discord OAuth Config ────────────────────────────────────
// Replace with your Discord application's Client ID
// Create app at: https://discord.com/developers/applications
const DISCORD_CLIENT_ID = '1465025250189381869';
const DISCORD_REDIRECT   = window.location.origin + '/discord-callback.html';
const DISCORD_SCOPES     = 'identify guilds';

// State of the currently logged-in Discord user
const Discord = {
  user: null,       // { id, username, avatar, discriminator }
  token: null,      // access token (short-lived, stored in memory only)
};

// ─── Initiate OAuth Flow ─────────────────────────────────────
function loginWithDiscord() {
  const state = crypto.randomUUID();
  sessionStorage.setItem('discord_oauth_state', state);

  const url = new URL('https://discord.com/api/oauth2/authorize');
  url.searchParams.set('client_id',     DISCORD_CLIENT_ID);
  url.searchParams.set('redirect_uri',  DISCORD_REDIRECT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope',         DISCORD_SCOPES);
  url.searchParams.set('state',         state);
  url.searchParams.set('prompt',        'none'); // skip re-consent if already authorized

  window.location.href = url.toString();
}

// ─── Load Discord user from callback result ──────────────────
function loadDiscordSession() {
  const raw = sessionStorage.getItem('discord_user');
  if (!raw) return false;
  try {
    Discord.user = JSON.parse(raw);
    return true;
  } catch { return false; }
}

function logoutDiscord() {
  sessionStorage.removeItem('discord_user');
  Discord.user  = null;
  Discord.token = null;
  renderDiscordDashboard(); // re-render to show login prompt
}

// ─── Avatar URL helper ────────────────────────────────────────
function discordAvatarUrl(user) {
  if (!user.avatar) {
    // Default discord avatar based on discriminator
    const idx = parseInt(user.discriminator || '0') % 5;
    return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
  }
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

// ─── Render the Discord Dashboard page ───────────────────────
async function renderDiscordDashboard() {
  const page = document.getElementById('page-discord');
  if (!page) return;

  const isLoggedIn = loadDiscordSession();

  if (!isLoggedIn) {
    // ── Not connected: show login prompt ──
    page.innerHTML = `
      <div class="page-header">
        <h2>Discord Dashboard</h2>
        <p>Connect your Discord account to view your server's study challenge data.</p>
      </div>
      <div class="card" style="max-width:480px;margin:40px auto;text-align:center;padding:48px 40px">
        <div style="width:72px;height:72px;background:rgba(88,101,242,0.15);border:2px solid rgba(88,101,242,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 20px">
          <svg width="36" height="36" viewBox="0 0 71 55" fill="#5865F2">
            <path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.9a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.6 37.6 0 0 0 25.5 1a.2.2 0 0 0-.2-.1A58.3 58.3 0 0 0 10.7 4.9a.2.2 0 0 0-.1.1C1.5 18.1-1 30.9.4 43.5a.2.2 0 0 0 .1.1 58.8 58.8 0 0 0 17.7 8.9.2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.8a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.8a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.6 58.6 0 0 0 17.8-8.9.2.2 0 0 0 .1-.1c1.7-15-2.8-27.7-11.9-39.1a.2.2 0 0 0-.1-.2zM23.7 36c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1c3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1c3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1z"/>
          </svg>
        </div>
        <h3 style="margin-bottom:8px">Connect Discord</h3>
        <p class="text-muted text-sm" style="margin-bottom:28px;line-height:1.6">
          Login with your Discord account to view the Ascend Hub bot's live challenge leaderboards and your study stats from your server.
        </p>
        <button class="btn" style="background:#5865F2;color:#fff;border:none;width:100%;gap:10px;font-size:0.9rem;padding:12px 20px;border-radius:8px;cursor:pointer;display:flex;align-items:center;justify-content:center" onclick="loginWithDiscord()">
          <svg width="20" height="20" viewBox="0 0 71 55" fill="white"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.9a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.6 37.6 0 0 0 25.5 1a.2.2 0 0 0-.2-.1A58.3 58.3 0 0 0 10.7 4.9a.2.2 0 0 0-.1.1C1.5 18.1-1 30.9.4 43.5a.2.2 0 0 0 .1.1 58.8 58.8 0 0 0 17.7 8.9.2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.8a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.8a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.6 58.6 0 0 0 17.8-8.9.2.2 0 0 0 .1-.1c1.7-15-2.8-27.7-11.9-39.1a.2.2 0 0 0-.1-.2zM23.7 36c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1c3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1c3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1z"/></svg>
          Login with Discord
        </button>
        <p class="text-xs text-muted" style="margin-top:16px">We only request your username and server list. No messages are accessed.</p>
      </div>
    `;
    return;
  }

  // ── Logged In: show user info + challenge data ──
  const u = Discord.user;
  page.innerHTML = `
    <div class="page-header" style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:16px">
      <div>
        <h2>Discord Dashboard</h2>
        <p>Live challenge data from Ascend Hub bot — your server's study stats.</p>
      </div>
      <div style="display:flex;align-items:center;gap:12px;background:var(--bg-surface);border:1px solid var(--border-soft);border-radius:12px;padding:10px 16px">
        <img src="${discordAvatarUrl(u)}" style="width:36px;height:36px;border-radius:50%;border:2px solid #5865F2" onerror="this.style.display='none'">
        <div>
          <div style="font-weight:600;font-size:0.9rem;color:var(--text-primary)">${escapeHtml(u.username)}</div>
          <div style="font-size:0.72rem;color:var(--text-muted)">Discord Connected</div>
        </div>
        <button class="btn btn-ghost btn-sm" onclick="logoutDiscord()" style="margin-left:8px">Disconnect</button>
      </div>
    </div>

    <!-- My Stats Card -->
    <div class="stat-grid mb-6" id="discordStatsRow">
      <div class="stat-card cyan">
        <div class="stat-icon-wrap"><i data-lucide="clock"></i></div>
        <div class="stat-value" id="dc-totalHours">—</div>
        <div class="stat-label">My Study Hours</div>
        <div class="stat-change neutral">Across all challenges</div>
      </div>
      <div class="stat-card yellow">
        <div class="stat-icon-wrap"><i data-lucide="zap"></i></div>
        <div class="stat-value" id="dc-activeChallenges">—</div>
        <div class="stat-label">Active Challenges</div>
        <div class="stat-change up">In server</div>
      </div>
      <div class="stat-card green">
        <div class="stat-icon-wrap"><i data-lucide="trophy"></i></div>
        <div class="stat-value" id="dc-bestRank">—</div>
        <div class="stat-label">Best Rank</div>
        <div class="stat-change neutral">Current challenges</div>
      </div>
    </div>

    <!-- Active Challenges -->
    <div id="dc-challenges-container">
      <div class="card" style="text-align:center;padding:40px">
        <div class="spinner" style="margin:0 auto"></div>
        <p class="text-muted text-sm" style="margin-top:12px">Loading challenge data…</p>
      </div>
    </div>

    <!-- Ended Challenges -->
    <div id="dc-ended-container" class="mt-6"></div>
  `;

  if (window.lucide) lucide.createIcons();

  // Load data from Firestore
  await loadDiscordChallengeData(u.id);
}

// ─── Load challenge data from Firestore ──────────────────────
async function loadDiscordChallengeData(discordUserId) {
  try {
    // Fetch ALL challenges (active + recent ended)
    const [activeSnap, endedSnap] = await Promise.all([
      db.collection('challenges').where('status', '==', 'active').get(),
      db.collection('challenges').where('status', '==', 'ended')
        .orderBy('endedAt', 'desc').limit(5).get()
    ]);

    const active = activeSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const ended  = endedSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    renderActiveDiscordChallenges(active, discordUserId);
    renderEndedDiscordChallenges(ended, discordUserId);
    renderDiscordStats(active, ended, discordUserId);

  } catch(e) {
    console.error('Discord data load error:', e);
    const container = document.getElementById('dc-challenges-container');
    if (container) {
      container.innerHTML = `
        <div class="card" style="text-align:center;padding:40px">
          <div style="color:var(--red);font-size:2rem;margin-bottom:12px">⚠️</div>
          <h3 style="margin-bottom:8px">Could not load data</h3>
          <p class="text-muted text-sm">${e.message}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top:16px" onclick="loadDiscordChallengeData('${discordUserId}')">
            Retry
          </button>
        </div>
      `;
    }
  }
}

// ─── Render active challenges ─────────────────────────────────
function renderActiveDiscordChallenges(challenges, myDiscordId) {
  const container = document.getElementById('dc-challenges-container');
  if (!container) return;

  if (challenges.length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:48px">
        <div style="font-size:2.5rem;margin-bottom:16px">🏖️</div>
        <h3 style="margin-bottom:8px">No Active Challenges</h3>
        <p class="text-muted text-sm">No study challenges are running right now. Ask a moderator to start one!</p>
      </div>
    `;
    return;
  }

  const html = challenges.map(ch => {
    const participants = Object.entries(ch.participants || {});
    participants.sort((a, b) => (b[1].studyMinutes || 0) - (a[1].studyMinutes || 0));

    const myEntry = ch.participants?.[myDiscordId];
    const myMinutes = myEntry?.studyMinutes || 0;
    const myHours   = (myMinutes / 60).toFixed(1);
    const myRank    = participants.findIndex(p => p[0] === myDiscordId) + 1;
    const isJoined  = !!myEntry;

    const timeLeft = ch.endAt ? formatTimeLeft(ch.endAt) : 'Unknown';

    const topRows = participants.slice(0, 10).map((p, i) => {
      const isMe = p[0] === myDiscordId;
      const hrs  = ((p[1].studyMinutes || 0) / 60).toFixed(2);
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`;
      return `
        <tr style="${isMe ? 'background:rgba(255,209,0,0.06);' : ''}">
          <td style="font-weight:700;color:${i < 3 ? 'var(--yellow)' : 'var(--text-muted)'}">${medal}</td>
          <td>
            <div style="display:flex;align-items:center;gap:8px">
              <div style="width:28px;height:28px;border-radius:50%;background:var(--bg-elevated);border:1px solid var(--border-soft);display:flex;align-items:center;justify-content:center;font-size:0.65rem;color:var(--text-muted);flex-shrink:0">
                ${isMe ? '<span style="color:var(--yellow)">YOU</span>' : '👤'}
              </div>
              <span style="${isMe ? 'color:var(--yellow);font-weight:600' : ''}">${isMe ? 'You' : `<@${p[0]}>`}</span>
            </div>
          </td>
          <td class="mono">${hrs}h</td>
          <td><span class="badge ${isMe ? 'badge-yellow' : 'badge-muted'}">${isMe ? 'You' : (i < 3 ? 'Top 3' : 'Active')}</span></td>
        </tr>
      `;
    }).join('');

    return `
      <div class="card card-glow-y mb-6">
        <div class="card-header" style="flex-wrap:wrap;gap:12px">
          <div>
            <div class="card-title" style="font-size:1rem">
              <svg width="18" height="18" viewBox="0 0 71 55" fill="#5865F2" style="flex-shrink:0"><path d="M60.1 4.9A58.5 58.5 0 0 0 45.5.9a.2.2 0 0 0-.2.1 40.7 40.7 0 0 0-1.8 3.7 54 54 0 0 0-16.2 0A37.6 37.6 0 0 0 25.5 1a.2.2 0 0 0-.2-.1A58.3 58.3 0 0 0 10.7 4.9a.2.2 0 0 0-.1.1C1.5 18.1-1 30.9.4 43.5a.2.2 0 0 0 .1.1 58.8 58.8 0 0 0 17.7 8.9.2.2 0 0 0 .2-.1 42 42 0 0 0 3.6-5.9.2.2 0 0 0-.1-.3 38.7 38.7 0 0 1-5.5-2.6.2.2 0 0 1 0-.4l1.1-.8a.2.2 0 0 1 .2 0c11.5 5.3 24 5.3 35.4 0a.2.2 0 0 1 .2 0l1.1.8a.2.2 0 0 1 0 .4 36.2 36.2 0 0 1-5.5 2.6.2.2 0 0 0-.1.3 47.1 47.1 0 0 0 3.6 5.9.2.2 0 0 0 .2.1 58.6 58.6 0 0 0 17.8-8.9.2.2 0 0 0 .1-.1c1.7-15-2.8-27.7-11.9-39.1a.2.2 0 0 0-.1-.2zM23.7 36c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1c3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1zm23.6 0c-3.5 0-6.4-3.2-6.4-7.1s2.8-7.1 6.4-7.1c3.6 0 6.5 3.2 6.4 7.1 0 3.9-2.8 7.1-6.4 7.1z"/></svg>
              ${escapeHtml(ch.title || 'Study Challenge')}
            </div>
            <div class="card-subtitle mono" style="margin-top:4px">
              ⏰ Ends ${timeLeft} &nbsp;·&nbsp; 👥 ${participants.length} participants
            </div>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="live-dot">LIVE</span>
            ${isJoined ? `
              <div style="background:var(--bg-elevated);border:1px solid var(--border-soft);border-radius:8px;padding:6px 14px;font-size:0.8rem">
                <span style="color:var(--text-muted)">Your time:</span>
                <span class="mono" style="color:var(--yellow);margin-left:6px;font-weight:700">${myHours}h</span>
                ${myRank > 0 ? `<span style="color:var(--text-muted);margin-left:6px">·</span><span style="color:var(--cyan);margin-left:6px">#${myRank}</span>` : ''}
              </div>
            ` : `<span class="badge badge-muted">Not Joined</span>`}
          </div>
        </div>

        ${isJoined ? `
          <!-- My Progress Bar -->
          <div style="margin:0 0 20px;padding:14px 16px;background:var(--bg-elevated);border-radius:10px;border:1px solid var(--border-dim)">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span class="text-xs text-muted mono" style="text-transform:uppercase;letter-spacing:0.08em">Your Progress</span>
              <span class="text-xs mono" style="color:var(--yellow)">${myHours}h / ${((ch.targetMinutes || 600) / 60).toFixed(0)}h target</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill yellow" style="width:${Math.min(100, Math.round((myMinutes / (ch.targetMinutes || 600)) * 100))}%"></div>
            </div>
          </div>
        ` : ''}

        <!-- Leaderboard Table -->
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th style="width:60px">Rank</th>
                <th>Participant</th>
                <th>Study Hours</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${topRows || `<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-muted)">No participants yet</td></tr>`}
            </tbody>
          </table>
        </div>
        ${participants.length > 10 ? `<div class="text-xs text-muted text-center" style="margin-top:10px">+${participants.length - 10} more participants</div>` : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="margin-bottom:16px;display:flex;align-items:center;gap:10px">
      <h3 style="margin:0;font-size:1rem">Active Challenges</h3>
      <span class="badge badge-green">${challenges.length} running</span>
    </div>
    ${html}
  `;

  if (window.lucide) lucide.createIcons();
}

// ─── Render ended challenges ──────────────────────────────────
function renderEndedDiscordChallenges(challenges, myDiscordId) {
  const container = document.getElementById('dc-ended-container');
  if (!container || challenges.length === 0) return;

  const rows = challenges.map(ch => {
    const participants = Object.entries(ch.participants || {});
    participants.sort((a, b) => (b[1].studyMinutes || 0) - (a[1].studyMinutes || 0));
    const myEntry = ch.participants?.[myDiscordId];
    const myRank  = participants.findIndex(p => p[0] === myDiscordId) + 1;
    const winner  = participants[0];

    return `
      <tr>
        <td style="font-weight:600">${escapeHtml(ch.title || 'Challenge')}</td>
        <td class="mono text-muted">${ch.endedAt ? new Date(ch.endedAt).toLocaleDateString() : '—'}</td>
        <td>${participants.length}</td>
        <td>${winner ? `<span class="mono" style="font-size:0.8rem">🥇 <@${winner[0]}> (${((winner[1].studyMinutes||0)/60).toFixed(1)}h)</span>` : '—'}</td>
        <td>${myEntry ? `<span class="badge badge-cyan">#${myRank || '?'}</span>` : '<span class="badge badge-muted">Didn\'t join</span>'}</td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="card">
      <div class="card-header">
        <div class="card-title"><i data-lucide="history"></i> Past Challenges</div>
        <span class="text-xs text-muted mono">Last 5 ended</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Ended</th>
              <th>Participants</th>
              <th>Winner</th>
              <th>Your Rank</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>
  `;

  if (window.lucide) lucide.createIcons();
}

// ─── Compute & render Discord stats ──────────────────────────
function renderDiscordStats(active, ended, myDiscordId) {
  let totalMinutes = 0;
  let bestRank     = Infinity;

  const allChallenges = [...active, ...ended];
  allChallenges.forEach(ch => {
    const myEntry = ch.participants?.[myDiscordId];
    if (!myEntry) return;
    totalMinutes += myEntry.studyMinutes || 0;

    const participants = Object.entries(ch.participants || {});
    participants.sort((a, b) => (b[1].studyMinutes || 0) - (a[1].studyMinutes || 0));
    const rank = participants.findIndex(p => p[0] === myDiscordId) + 1;
    if (rank > 0 && rank < bestRank) bestRank = rank;
  });

  const totalHoursEl        = document.getElementById('dc-totalHours');
  const activeChallengesEl  = document.getElementById('dc-activeChallenges');
  const bestRankEl          = document.getElementById('dc-bestRank');

  if (totalHoursEl)       totalHoursEl.textContent       = (totalMinutes / 60).toFixed(1) + 'h';
  if (activeChallengesEl) activeChallengesEl.textContent = active.length;
  if (bestRankEl)         bestRankEl.textContent         = bestRank === Infinity ? '—' : '#' + bestRank;
}

// ─── Helpers ─────────────────────────────────────────────────
function formatTimeLeft(endAt) {
  const ms   = endAt - Date.now();
  if (ms <= 0) return 'Ended';
  const days  = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  if (days > 0)  return `in ${days}d ${hours}h`;
  if (hours > 0) return `in ${hours}h`;
  return 'ending soon';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Auto-check if returning from OAuth ──────────────────────
(function() {
  if (window.location.hash === '#discord-dashboard') {
    history.replaceState(null, '', window.location.pathname);
    // Will be navigated to discord page by app.js after auth loads
    window._pendingDiscordNav = true;
  }
})();
