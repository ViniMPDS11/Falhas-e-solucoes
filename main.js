import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'SEU_API_KEY',
  authDomain: 'SEU_AUTH_DOMAIN',
  projectId: 'SEU_PROJECT_ID',
  appId: 'SEU_APP_ID',
};

const DEFAULT_DOMAIN = '@triviatrens.com.br';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authScreen = document.getElementById('auth-screen');
const changePasswordScreen = document.getElementById('change-password-screen');
const homeScreen = document.getElementById('home-screen');
const welcomeText = document.getElementById('welcome-text');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

function setAuthMode(mode) {
  const showLogin = mode === 'login';
  loginForm.classList.toggle('hidden', !showLogin);
  registerForm.classList.toggle('hidden', showLogin);
}

function showScreen(name) {
  authScreen.classList.add('hidden');
  changePasswordScreen.classList.add('hidden');
  homeScreen.classList.add('hidden');

  if (name === 'auth') authScreen.classList.remove('hidden');
  if (name === 'changePassword') changePasswordScreen.classList.remove('hidden');
  if (name === 'home') homeScreen.classList.remove('hidden');
}

async function mustChangePassword(uid) {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) return false;
  return userDoc.data().mustChangePassword === true;
}

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    showScreen('auth');
    setAuthMode('login');
    return;
  }

  if (await mustChangePassword(user.uid)) {
    showScreen('changePassword');
    return;
  }

  welcomeText.textContent = user.displayName || user.email;
  showScreen('home');
});

document.getElementById('show-register-btn').addEventListener('click', () => {
  setAuthMode('register');
});

document.getElementById('show-login-btn').addEventListener('click', () => {
  setAuthMode('login');
});

document.getElementById('login-btn').addEventListener('click', async () => {
  try {
    await signInWithEmailAndPassword(auth, emailInput.value.trim().toLowerCase(), passwordInput.value);
  } catch (error) {
    alert(`Erro no login: ${error.message}`);
  }
});

document.getElementById('register-btn').addEventListener('click', async () => {
  const email = registerEmailInput.value.trim().toLowerCase();
  const password = registerPasswordInput.value;

  if (!email.endsWith(DEFAULT_DOMAIN)) {
    alert(`Use um e-mail ${DEFAULT_DOMAIN}`);
    return;
  }

  const allowDoc = await getDoc(doc(db, 'allowed_emails', email));
  if (!allowDoc.exists()) {
    alert('E-mail não está na lista permitida.');
    return;
  }

  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', result.user.uid), {
      email,
      mustChangePassword: allowDoc.data().mustChangePassword === true,
      createdAt: serverTimestamp(),
    });
    alert('Cadastro concluído.');
  } catch (error) {
    alert(`Erro no cadastro: ${error.message}`);
  }
});

document.getElementById('change-password-btn').addEventListener('click', async () => {
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;

  if (newPassword.length < 8) {
    alert('A nova senha precisa ter pelo menos 8 caracteres.');
    return;
  }

  if (newPassword !== confirmPassword) {
    alert('As senhas não conferem.');
    return;
  }

  try {
    await updatePassword(auth.currentUser, newPassword);
    await updateDoc(doc(db, 'users', auth.currentUser.uid), { mustChangePassword: false });
    alert('Senha atualizada com sucesso. Faça login novamente.');
    await signOut(auth);
  } catch (error) {
    alert(`Erro ao trocar senha: ${error.message}`);
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  await signOut(auth);
});
