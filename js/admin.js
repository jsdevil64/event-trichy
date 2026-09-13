import {
  auth, db, signInWithEmailAndPassword, signOut,
  authEmailFromPhone, normalizePhone, collection,
  onSnapshot, updateDoc, doc, getDoc, query, deleteDoc,
  safeText, serverTimestamp, categoryLabel, where
} from "./firebase.js";

const loginSection = document.querySelector("#adminLoginSection");
const panel = document.querySelector("#adminPanel");
const message = document.querySelector("#adminMessage");
const adminCards = document.querySelector("#adminCards");
const status = document.querySelector("#adminStatus");
const logout = document.querySelector("#adminLogout");
const searchInput = document.querySelector("#providerIdSearch");
const searchBtn = document.querySelector("#providerSearchBtn");
const clearBtn = document.querySelector("#providerClearBtn");
const searchMessage = document.querySelector("#adminSearchMessage");
const adminLeads = document.querySelector("#adminLeads");
let stopLeadsListener = null;

let allProviders = [];
let stopProvidersListener = null;

// ---------- Admin login ----------
document.querySelector("#adminLoginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  message.textContent = "Checking...";

  try {
    const phone = normalizePhone(document.querySelector("#adminPhone").value);
    const password = document.querySelector("#adminPassword").value;

    if (!/^[0-9]{10}$/.test(phone) || !password) {
      message.textContent = "Correct phone number and password enter pannunga.";
      return;
    }

    const credential = await signInWithEmailAndPassword(auth, authEmailFromPhone(phone), password);
    const adminSnap = await getDoc(doc(db, "admins", credential.user.uid));

    if (!adminSnap.exists() || adminSnap.data().active !== true) {
      await signOut(auth);
      message.textContent = "This account is not an active admin.";
      return;
    }

    message.textContent = "Admin Login Successful!";
    loginSection.classList.add("hidden");
    panel.classList.remove("hidden");
    logout.classList.remove("hidden");
    loadProviders();
    loadLeads();
  } catch (e) {
    console.error(e);
    message.textContent =
      e.code === "auth/invalid-credential"
        ? "Phone number or password incorrect."
        : e.code === "auth/network-request-failed"
          ? "Firebase connection failed. Internet/browser connection check pannunga."
          : e.message;
  }
});

logout.addEventListener("click", async () => {
  if (stopProvidersListener) stopProvidersListener();
  if (stopLeadsListener) stopLeadsListener();
  await signOut(auth);
  location.reload();
});


function loadLeads() {
  if (!adminLeads) return;
  const q = query(collection(db, "leads"));
  stopLeadsListener = onSnapshot(q, snap => {
    const leads = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    if (!leads.length) {
      adminLeads.innerHTML = '<div class="admin-empty"><strong>No customer leads yet</strong><p>New enquiries will appear here.</p></div>';
      return;
    }
    adminLeads.innerHTML = leads.map(l => `
      <article class="admin-item" data-lead-card="${escapeAttr(l.id)}">
        <div class="admin-card-top"><div><span class="eyebrow">Lead</span><h3>${escapeHtml(l.customerName || "Customer")}</h3>
        <div class="meta">Provider ID: ${escapeHtml(l.providerId || "-")} · Event Date: ${escapeHtml(l.eventDate || "Not selected")}</div>
        <div class="meta">Customer Phone: ${escapeHtml(l.customerPhone || "-")}</div></div>
        <span class="admin-active-badge ${l.status === "confirmed" ? "active" : "inactive"}">${l.status === "confirmed" ? "Booking Confirmed" : "New Enquiry"}</span></div>
        <div class="admin-info-grid"><div><span>Booking Amount</span><strong>₹${Number(l.bookingAmount||0).toLocaleString("en-IN")}</strong></div><div><span>3% Commission</span><strong>₹${Number(l.commissionAmount||0).toLocaleString("en-IN")}</strong></div><div><span>Commission</span><strong>${l.commissionPaid ? "Paid" : "Pending"}</strong></div></div>
        <label>Admin Note<textarea class="admin-lead-note" rows="2" placeholder="Add admin note...">${escapeHtml(l.adminNote || "")}</textarea></label>
        <div class="admin-actions"><button class="primary-btn save-lead-note" data-id="${escapeAttr(l.id)}">Save Note</button><button class="ghost-btn mark-commission" data-id="${escapeAttr(l.id)}">${l.commissionPaid ? "Mark Commission Pending" : "Mark Commission Paid"}</button></div>
      </article>`).join("");
    adminLeads.querySelectorAll(".save-lead-note").forEach(btn => btn.addEventListener("click", async () => {
      const card = btn.closest("[data-lead-card]"); const note = card.querySelector(".admin-lead-note").value;
      btn.disabled = true;
      try { await updateDoc(doc(db,"leads",btn.dataset.id), { adminNote: safeText(note), updatedAt: serverTimestamp() }); btn.textContent="Saved ✓"; setTimeout(()=>{btn.textContent="Save Note";btn.disabled=false;},700); }
      catch(e){console.error(e);alert("Could not save note.");btn.disabled=false;}
    }));
    adminLeads.querySelectorAll(".mark-commission").forEach(btn => btn.addEventListener("click", async () => {
      const card = btn.closest("[data-lead-card]");
      const isPaid = btn.textContent.includes("Pending");
      try { await updateDoc(doc(db,"leads",btn.dataset.id), { commissionPaid: isPaid, updatedAt: serverTimestamp() }); }
      catch(e){console.error(e);alert("Could not update commission status.");}
    }));
  }, err => { console.error(err); adminLeads.innerHTML='<div class="admin-empty"><strong>Could not load leads</strong><p>Check Firestore Rules.</p></div>'; });
}

// ---------- Provider loading ----------
function loadProviders() {
  const q = query(collection(db, "providers"));

  stopProvidersListener = onSnapshot(q, (snap) => {
    allProviders = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => String(a.brandName || "").localeCompare(String(b.brandName || "")));

    status.textContent = `${allProviders.length} provider card(s) available.`;

    // Do not show every card after login. Admin searches by Provider ID.
    if (!searchInput.value.trim()) {
      adminCards.innerHTML = `
        <div class="admin-empty">
          <strong>Search a Provider ID</strong>
          <p>மேலே Provider ID paste பண்ணி Search அழுத்துங்க.</p>
        </div>`;
    } else {
      searchProvider();
    }
  }, (e) => {
    console.error(e);
    status.textContent = "Could not load providers.";
  });
}

// ---------- Search ----------
searchBtn.addEventListener("click", searchProvider);
searchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    searchProvider();
  }
});

clearBtn.addEventListener("click", () => {
  searchInput.value = "";
  searchMessage.textContent = "";
  adminCards.innerHTML = `
    <div class="admin-empty">
      <strong>Search a Provider ID</strong>
      <p>மேலே Provider ID paste பண்ணி Search அழுத்துங்க.</p>
    </div>`;
});

function searchProvider() {
  const id = safeText(searchInput.value);
  searchMessage.textContent = "";

  if (!id) {
    searchMessage.textContent = "Provider ID enter pannunga.";
    adminCards.innerHTML = "";
    return;
  }

  const provider = allProviders.find((p) => p.id === id);

  if (!provider) {
    searchMessage.textContent = "Provider ID not found.";
    adminCards.innerHTML = `
      <div class="admin-empty">
        <strong>No provider found</strong>
        <p>Provider ID correct-ஆ copy பண்ணி மீண்டும் search பண்ணுங்க.</p>
      </div>`;
    return;
  }

  searchMessage.textContent = "Provider card found.";
  renderProvider(provider);
}

// ---------- Provider card + editing ----------
function renderProvider(p) {
  const busyCount = Array.isArray(p.busyDates) ? p.busyDates.length : 0;
  const video = safeText(p.videoLink);

  adminCards.innerHTML = `
    <article class="admin-item admin-provider-card" data-provider-id="${escapeAttr(p.id)}">
      <div class="admin-card-top">
        <div>
          <span class="eyebrow">Provider Card</span>
          <h2>${escapeHtml(p.brandName || "Unnamed Provider")}</h2>
          <div class="meta">ID: <strong>${escapeHtml(p.id)}</strong></div>
        </div>
        <span class="admin-active-badge ${p.active === false ? "inactive" : "active"}">
          ${p.active === false ? "Inactive" : "Active"}
        </span>
      </div>

      <div class="admin-info-grid">
        <div><span>Category</span><strong>${escapeHtml(categoryLabel(p.category))}</strong></div>
        <div><span>Name</span><strong>${escapeHtml(p.name || "-")}</strong></div>
        <div><span>Phone</span><strong>${escapeHtml(p.phone || "-")}</strong></div>
        <div><span>Location</span><strong>${escapeHtml(p.location || "-")}</strong></div>
        <div><span>Busy dates</span><strong>${busyCount}</strong></div>
        <div><span>Video</span><strong>${video ? "Added" : "Not added"}</strong></div>
      </div>

      <div class="admin-section">
        <h3>Edit Card Information</h3>
        <form id="adminEditForm" class="admin-edit-grid">
          <label>Category
            <select id="editCategory">
              <option value="decoration">Decoration</option>
              <option value="photography">Photography</option>
              <option value="catering">Catering</option>
              <option value="mahal">Mahal</option>
            </select>
          </label>
          <label>Brand Name<input id="editBrandName" value="${escapeAttr(p.brandName || "")}" required></label>
          <label>Name<input id="editName" value="${escapeAttr(p.name || "")}" required></label>
          <label>Phone Number<input id="editPhone" inputmode="tel" value="${escapeAttr(p.phone || "")}" required></label>
          <label class="admin-full">Location<input id="editLocation" value="${escapeAttr(p.location || "")}" required></label>
          <label class="admin-check"><input id="editActive" type="checkbox" ${p.active === false ? "" : "checked"}> Active card</label>
          <div class="admin-actions admin-full">
            <button class="primary-btn" type="submit">Save Card Changes</button>
            <button id="deleteProviderBtn" class="danger-btn" type="button">Delete Card</button>
          </div>
          <p id="editMessage" class="form-message admin-full"></p>
        </form>
      </div>

      <div class="admin-section">
        <h3>Admin-only Video Link</h3>
        <label>Video URL
          <input id="videoLinkInput" class="video-input" value="${escapeAttr(video)}" placeholder="YouTube or MP4 URL">
        </label>
        <div class="admin-actions">
          <button id="saveVideoBtn" class="primary-btn" type="button">Save / Update Video Link</button>
          <button id="removeVideoBtn" class="ghost-btn" type="button">Remove Video Link</button>
        </div>
        <p id="videoMessage" class="form-message"></p>
      </div>
    </article>
  `;

  document.querySelector("#editCategory").value = p.category || "";

  document.querySelector("#adminEditForm").addEventListener("submit", (e) => saveProvider(e, p.id));
  document.querySelector("#deleteProviderBtn").addEventListener("click", () => deleteProvider(p.id, p.brandName));
  document.querySelector("#saveVideoBtn").addEventListener("click", () => saveVideo(p.id));
  document.querySelector("#removeVideoBtn").addEventListener("click", () => removeVideo(p.id));
}

async function saveProvider(e, id) {
  e.preventDefault();
  const msg = document.querySelector("#editMessage");
  msg.textContent = "Saving card changes...";

  const phone = normalizePhone(document.querySelector("#editPhone").value);
  if (!/^[0-9]{10}$/.test(phone)) {
    msg.textContent = "10 digit phone number enter pannunga.";
    return;
  }

  try {
    await updateDoc(doc(db, "providers", id), {
      category: safeText(document.querySelector("#editCategory").value),
      brandName: safeText(document.querySelector("#editBrandName").value),
      name: safeText(document.querySelector("#editName").value),
      phone,
      location: safeText(document.querySelector("#editLocation").value),
      active: document.querySelector("#editActive").checked,
      updatedAt: serverTimestamp()
    });
    msg.textContent = "Card information updated successfully.";
  } catch (e) {
    console.error(e);
    msg.textContent = "Update failed. Check Firestore Rules.";
  }
}

async function deleteProvider(id, brandName) {
  const ok = confirm(`Delete ${brandName || "this provider"} card? This cannot be undone.`);
  if (!ok) return;

  try {
    await deleteDoc(doc(db, "providers", id));
    searchInput.value = "";
    searchMessage.textContent = "Provider card deleted successfully.";
    adminCards.innerHTML = `
      <div class="admin-empty">
        <strong>Card deleted</strong>
        <p>Another Provider ID search பண்ணலாம்.</p>
      </div>`;
  } catch (e) {
    console.error(e);
    alert("Delete failed. Check Firestore Rules.");
  }
}

async function saveVideo(id) {
  const input = document.querySelector("#videoLinkInput");
  const msg = document.querySelector("#videoMessage");
  const btn = document.querySelector("#saveVideoBtn");
  btn.disabled = true;
  msg.textContent = "Saving video link...";

  try {
    await updateDoc(doc(db, "providers", id), {
      videoLink: safeText(input.value),
      updatedAt: serverTimestamp()
    });
    msg.textContent = "Video link saved successfully.";
  } catch (e) {
    console.error(e);
    msg.textContent = "Could not save video link. Check Firestore Rules.";
  } finally {
    btn.disabled = false;
  }
}

async function removeVideo(id) {
  const msg = document.querySelector("#videoMessage");
  try {
    await updateDoc(doc(db, "providers", id), {
      videoLink: "",
      updatedAt: serverTimestamp()
    });
    document.querySelector("#videoLinkInput").value = "";
    msg.textContent = "Video link removed.";
  } catch (e) {
    console.error(e);
    msg.textContent = "Could not remove video link.";
  }
}

function escapeHtml(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
function escapeAttr(v) { return escapeHtml(v); }
