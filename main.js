import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCQaJ-b6Q4JDW0O_7FFYvc7xBXeCNrfaC8',
  authDomain: 'falhas-e-solucoes.firebaseapp.com',
  projectId: 'falhas-e-solucoes',
  storageBucket: 'falhas-e-solucoes.firebasestorage.app',
  messagingSenderId: '178404125289',
  appId: '1:178404125289:web:ca83a35479e84fa41490f8',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const CORPORATE_DOMAIN = '@triviatrens.com.br';
let lastWelcomedUid = null;

const authScreen = document.getElementById('auth-screen');
const homeScreen = document.getElementById('home-screen');
const welcomeText = document.getElementById('welcome-text');

function showScreen(name) {
  authScreen.classList.add('hidden');
  homeScreen.classList.add('hidden');

  if (name === 'auth') authScreen.classList.remove('hidden');
  if (name === 'home') homeScreen.classList.remove('hidden');
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    lastWelcomedUid = null;
    showScreen('auth');
    return;
  }

  const email = (user.email || '').toLowerCase();
  if (!email.endsWith(CORPORATE_DOMAIN)) {
    alert('Use seu e-mail corporativo da Trivia Trens (@triviatrens.com.br).');
    await signOut(auth);
    showScreen('auth');
    return;
  }

  if (lastWelcomedUid !== user.uid) {
    alert(`Bem-vindo(a), ${user.displayName || user.email}!`);
    lastWelcomedUid = user.uid;
  }

  welcomeText.textContent = user.displayName || user.email;
  showScreen('home');
});

document.getElementById('google-login-btn').addEventListener('click', async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert(`Erro no login com Google: ${error.message}`);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
});
