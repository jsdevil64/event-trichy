import { db, collection, onSnapshot, query, where, addDoc, serverTimestamp, safeText, ADMIN_WHATSAPP } from "./firebase.js";

const params = new URLSearchParams(location.search);
const category = params.get("category") || "catering";
const categoryNames = { decoration:"Decoration", photography:"Photography", catering:"Catering", mahal:"Mahal" };
const categoryDescriptions = {
  decoration:"Find decoration providers for your event.", photography:"Find photographers and videographers.",
  catering:"Find catering services and food packages.", mahal:"Find event halls and marriage mahals."
};

document.querySelector("#categoryTitle").textContent = categoryNames[category] || "Services";
document.querySelector("#categoryDescription").textContent = categoryDescriptions[category] || "Choose a service provider.";
const cardsGrid = document.querySelector("#cardsGrid");
const status = document.querySelector("#status");
const searchInput = document.querySelector("#searchInput");
const eventDate = document.querySelector("#eventDate");
const clearDate = document.querySelector("#clearDate");
let providers = [];
let selectedProviderId = "";

const q = query(collection(db,"providers"), where("active","==",true));
onSnapshot(q, snap => {
  providers = snap.docs.map(d => ({id:d.id,...d.data()})).filter(p => p.category === category && p.active !== false);
  render();
}, err => { console.error(err); status.textContent = "Could not load providers."; });

searchInput.addEventListener("input", render);
eventDate.addEventListener("change", render);
clearDate.addEventListener("click",()=>{eventDate.value="";render();});

function render(){
  const term=safeText(searchInput.value).toLowerCase(), date=eventDate.value;
  const list=providers.filter(p=>{
    const text=`${p.brandName||""} ${p.location||""}`.toLowerCase();
    const busy=Array.isArray(p.busyDates)&&date&&p.busyDates.includes(date);
    return (!term||text.includes(term))&&!busy;
  });
  status.textContent=`${list.length} provider(s) available.`;
  cardsGrid.innerHTML=list.length?list.map(cardHtml).join(""):`<div class="admin-empty"><strong>No providers found</strong><p>Try another search or event date.</p></div>`;
  cardsGrid.querySelectorAll("[data-enquire]").forEach(b=>b.addEventListener("click",()=>openLead(b.dataset.enquire)));
  cardsGrid.querySelectorAll("[data-video]").forEach(b=>b.addEventListener("click",()=>openVideo(b.dataset.video,b.dataset.brand)));
}

function cardHtml(p){
  return `<article class="service-card">
    <div class="service-card-head"><div class="service-icon">${category==='decoration'?'🎈':category==='photography'?'📸':category==='catering'?'🍽️':'🏛️'}</div><div><h3>${escapeHtml(p.brandName||'Provider')}</h3><p>${escapeHtml(p.location||'')}</p></div></div>
    <p class="muted">${escapeHtml(categoryNames[p.category]||p.category)}</p>
    <button class="primary-btn full" data-enquire="${escapeAttr(p.id)}">Enquire Now</button>
    <button class="ghost-btn full" data-video="${escapeAttr(p.videoLink||'')}" data-brand="${escapeAttr(p.brandName||'')}">▶ View Video</button>
  </article>`;
}

function openLead(providerId){
  const p=providers.find(x=>x.id===providerId); if(!p)return;
  selectedProviderId=providerId;
  document.querySelector("#customerName").value=""; document.querySelector("#customerPhone").value="";
  document.querySelector("#leadResult").textContent=""; document.querySelector("#leadModal").classList.remove("hidden");
}

document.querySelector("#leadForm").addEventListener("submit",async e=>{
  e.preventDefault();
  const providerId=selectedProviderId;
  const p=providers.find(x=>x.id===providerId);
  const customerName=safeText(document.querySelector("#customerName").value);
  const customerPhone=safeText(document.querySelector("#customerPhone").value).replace(/\D/g,"");
  const result=document.querySelector("#leadResult");
  if(!p||customerPhone.length<10){result.textContent="Valid phone number enter pannunga.";return;}
  result.textContent="Saving enquiry...";
  try{
    const ref=await addDoc(collection(db,"leads"),{
      providerId,cardId:providerId,category,customerName,customerPhone,
      eventDate:eventDate.value||"",createdAt:serverTimestamp(),status:"new",
      commissionRate:3,bookingAmount:0,commissionAmount:0,commissionPaid:false,adminNote:""
    });
    const terms="Event Hub மூலமாக உங்களுக்கு customer-ஐ connect பண்ணுகிறேன். நான் அனுப்பிய customer-கிட்ட booking confirm ஆகி payment complete ஆனால், அந்த booking amount-ல 3% commission-ஐ Event Hub-க்கு நீங்கள் வழங்க வேண்டும். Booking confirm ஆனதும் உங்கள் Provider Dashboard-ல் Booking Confirmed button click செய்து booking amount update செய்யவும்.";
    const text=`Event Hub - New Customer Enquiry\nProvider ID: ${p.id}\nCustomer Name: ${customerName}\nCustomer Phone: ${customerPhone}\nEvent Date: ${eventDate.value||"Not selected"}\n\n${terms}`;
    const businessPhone=String(p.phone||"").replace(/\D/g,"");
    const waPhone=businessPhone.length>=10?(businessPhone.startsWith("91")?businessPhone:"91"+businessPhone):"";
    const waUrl=waPhone?`https://wa.me/${waPhone}?text=${encodeURIComponent(text)}`:`https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(text)}`;
    window.open(waUrl,"_blank");
    result.textContent="Enquiry saved. Business WhatsApp opened.";
    setTimeout(()=>document.querySelector("#leadModal").classList.add("hidden"),1400);
  }catch(err){console.error(err);result.textContent="Could not save enquiry.";}
});

document.querySelectorAll("[data-close-lead]").forEach(el=>el.addEventListener("click",()=>document.querySelector("#leadModal").classList.add("hidden")));

function openVideo(url,brand){
  const c=document.querySelector("#videoContainer"); document.querySelector("#videoTitle").textContent=brand||"Video";
  if(!url)c.innerHTML=`<div class="video-placeholder">No video added yet.</div>`;
  else if(/youtube\.com|youtu\.be/i.test(url)){const id=youtubeId(url);c.innerHTML=id?`<iframe src="https://www.youtube.com/embed/${id}" title="${escapeAttr(brand)}" allowfullscreen></iframe>`:`<a class="primary-btn" href="${escapeAttr(url)}" target="_blank" rel="noopener">Open Video</a>`;}
  else if(/\.(mp4|webm|ogg)(\?.*)?$/i.test(url))c.innerHTML=`<video controls playsinline src="${escapeAttr(url)}"></video>`;
  else c.innerHTML=`<a class="primary-btn" href="${escapeAttr(url)}" target="_blank" rel="noopener">Open Video</a>`;
  document.querySelector("#videoModal").classList.remove("hidden");
}
document.querySelectorAll("[data-close-modal]").forEach(el=>el.addEventListener("click",()=>{document.querySelector("#videoModal").classList.add("hidden");document.querySelector("#videoContainer").innerHTML="";}));
function youtubeId(url){try{const u=new URL(url);return u.hostname.includes("youtu.be")?u.pathname.slice(1):u.searchParams.get("v")||u.pathname.split("/").filter(Boolean).pop();}catch{return "";}}
function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function escapeAttr(v){return escapeHtml(v);}
