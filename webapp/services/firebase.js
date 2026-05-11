import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js';
import { getAuth, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

const firebaseConfig = {
  apiKey: 'AIzaSyCQaJ-b6Q4JDW0O_7FFYvc7xBXeCNrfaC8',
  authDomain: 'falhas-e-solucoes.firebaseapp.com',
  projectId: 'falhas-e-solucoes',
  storageBucket: 'falhas-e-solucoes.firebasestorage.app',
  messagingSenderId: '178404125289',
  appId: '1:178404125289:web:ca83a35479e84fa41490f8',
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
