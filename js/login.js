import {
  auth, signInWithEmailAndPassword, authEmailFromPhone,
  normalizePhone, safeText
} from "./firebase.js";

const form = document.querySelector("#loginForm");
const message = document.querySelector("#message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const phone = normalizePhone(document.querySelector("#phone").value);
  const password = document.querySelector("#password").value;
  message.textContent = "Logging in...";

  try {
    await signInWithEmailAndPassword(auth, authEmailFromPhone(phone), password);
    location.href = "dashboard.html";
  } catch (err) {
    console.error(err);
    message.textContent = "Login failed. Check phone number and password.";
  }
});
