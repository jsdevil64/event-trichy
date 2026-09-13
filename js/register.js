import {
  auth, db, createUserWithEmailAndPassword, authEmailFromPhone,
  doc, setDoc, serverTimestamp, normalizePhone, safeText
} from "./firebase.js";

const form = document.querySelector("#registerForm");
const message = document.querySelector("#message");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "Creating account...";

  const category = safeText(document.querySelector("#category").value);
  const brandName = safeText(document.querySelector("#brandName").value);
  const name = safeText(document.querySelector("#name").value);
  const phone = normalizePhone(document.querySelector("#phone").value);
  const location = safeText(document.querySelector("#location").value);
  const password = document.querySelector("#password").value;

  if (phone.length < 10) {
    message.textContent = "Please enter a valid phone number.";
    return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, authEmailFromPhone(phone), password);
    await setDoc(doc(db, "providers", cred.user.uid), {
      providerId: cred.user.uid,
      category, brandName, name, phone, location,
      videoLink: "",
      busyDates: [],
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    message.textContent = "Registration successful. Redirecting...";
    setTimeout(() => location.href = "dashboard.html", 700);
  } catch (err) {
    console.error(err);
    message.textContent = err.code === "auth/email-already-in-use"
      ? "This phone number is already registered."
      : (err.message || "Registration failed.");
  }
});
