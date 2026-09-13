import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getAuth,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import { getFirestore,collection,addDoc,doc,getDoc,setDoc,updateDoc,deleteDoc,onSnapshot,query,where,orderBy,serverTimestamp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
const firebaseConfig = {

  apiKey: "AIzaSyC5DpEgYYGo_lAzuf7Xm0k_oJK9LWSz1eQ",

  authDomain: "event-hub-c52bd.firebaseapp.com",

  projectId: "event-hub-c52bd",

  storageBucket: "event-hub-c52bd.firebasestorage.app",

  messagingSenderId: "237568694867",

  appId: "1:237568694867:web:11efc4247cfcd34679c4a6",

  measurementId: "G-EHHZPM1RK8"

};

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);
const ADMIN_WHATSAPP="918939717405";
function normalizePhone(p){return String(p||"").replace(/\D/g,"").replace(/^91/,"")}
function authEmailFromPhone(p){return `${normalizePhone(p)}@eventhub.local`}
function categoryLabel(c){return {decoration:"Decoration",photography:"Photography",catering:"Catering",mahal:"Mahal"}[c]||c}
function safeText(v){return String(v??"").trim()}
export {app,auth,db,ADMIN_WHATSAPP,onAuthStateChanged,createUserWithEmailAndPassword,signInWithEmailAndPassword,signOut,collection,addDoc,doc,getDoc,setDoc,updateDoc,deleteDoc,onSnapshot,query,where,orderBy,serverTimestamp,normalizePhone,authEmailFromPhone,categoryLabel,safeText};
