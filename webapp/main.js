import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { auth, provider } from './services/firebase.js';
import { renderTopbar } from './components/topbar.js';
import { createRouter } from './router/router.js';
import { dashboardPage, wireDashboard } from './pages/dashboard.js';
import { failureDetailsPage } from './pages/failure-details.js';

const CORPORATE_DOMAIN = '@triviatrens.com.br';
const authScreen = document.getElementById('auth-screen');
const appShell = document.getElementById('app-shell');
const topbarHost = document.getElementById('topbar-host');
const viewHost = document.getElementById('view-host');

let router;
let syncTimer;

function detectBasePath() {
  const isGithubPages = window.location.hostname.endsWith('github.io');
  if (!isGithubPages) return '';
  const parts = window.location.pathname.split('/').filter(Boolean);
  return parts.length ? `/${parts[0]}` : '';
}


function showAuth() { authScreen.classList.remove('hidden'); appShell.classList.add('hidden'); }
function showApp() { authScreen.classList.add('hidden'); appShell.classList.remove('hidden'); }

function startSyncClock() {
  let sec = 0;
  clearInterval(syncTimer);
  syncTimer = setInterval(() => {
    sec += 1;
    const el = document.getElementById('sync-status');
    if (el) el.textContent = `Última sincronização há ${sec} segundos`;
  }, 1000);
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return showAuth();
  const email = (user.email || '').toLowerCase();
  if (!email.endsWith(CORPORATE_DOMAIN)) {
    alert('Use seu e-mail corporativo da Trivia Trens (@triviatrens.com.br).');
    await signOut(auth);
    return showAuth();
  }

  showApp();
  topbarHost.innerHTML = renderTopbar({ userName: user.displayName || user.email });
  document.getElementById('logout-btn').onclick = () => signOut(auth);
  startSyncClock();

  const basePath = detectBasePath();
  router = createRouter({
    mount: viewHost,
    basename: basePath,
    routes: [
      { path: '/dashboard', component: async () => dashboardPage(), onMounted: () => wireDashboard({ navigate: router.navigate, user }) },
      { path: '/failure/:id', component: ({ id }) => failureDetailsPage(id), onMounted: () => { document.getElementById('back-dashboard').onclick = () => router.navigate('/dashboard'); } },
    ],
  });

  const appPath = router.withoutBase(window.location.pathname);
  if (!appPath.startsWith('/failure/')) router.navigate('/dashboard');
  else router.render(window.location.pathname);
});

document.getElementById('google-login-btn').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert(`Erro no login com Google: ${error.message}`);
  }
});
