// ===== الإعدادات =====
const SHEET_ID = "15_zR9P-8KX_UDgNSRNQ-f58Ah2-cjDeoblAEKJEMnm8";
const SHEET_NAME = "Sheet1";
const URL_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

// أعمدة الدرجات (ابدأ العد من 0: A=0, B=1, C=2 ...)
const FIELDS = [
  { col: 2, label: "اختبار 1", max: 20, icon: "📝" },
  { col: 3, label: "الأداء الأكاديمي", text: true, icon: "📘" },
  { col: 4, label: "المشاركة", max: 10, icon: "🙋" },
  { col: 5, label: "الأداء السلوكي والانضباط الصفي", text: true, icon: "🌟" },
  { col: 6, label: "السلوك", max: 10, icon: "🤝" },
  { col: 7, label: "المذكرة", max: 10, icon: "📓" },
  { col: 8, label: "المهمة 1", max: 5, icon: "✏️" },
  { col: 9, label: "المهمة 2", max: 5, icon: "📌" },
];
const TOTAL_COL = 10; // عمود المجموع (K)
let TOTAL_MAX = 60;
const FIRST_DATA_ROW = 2; // أول صف بيانات (الصف 3 في الشيت)

let rows = null;

function parseCSV(text) {
  const out = []; let row = [], cur = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; }
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cur); cur = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cur); out.push(row); row = []; cur = "";
    } else cur += c;
  }
  if (cur !== "" || row.length) { row.push(cur); out.push(row); }
  return out;
}

function normalize(s) {
  return String(s || "")
    .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
    .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
    .replace(/\D/g, "");
}
const esc = s => String(s).replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]));
const num = v => { const n = parseFloat(String(v).replace(/[^\d.]/g, "")); return isNaN(n) ? null : n; };

async function loadData() {
  if (rows) return rows;
  const res = await fetch(URL_CSV);
  if (!res.ok) throw new Error("fetch failed");
  rows = parseCSV(await res.text());
  // قراءة الدرجات العظمى تلقائيًا من الصف الثاني في الشيت
  const head = rows[1] || [];
  FIELDS.forEach(f => { if (f.max) { const m = num(head[f.col]); if (m) f.max = m; } });
  const tm = num(head[TOTAL_COL]); if (tm) TOTAL_MAX = tm;
  return rows;
}

function show(r) {
  const box = document.getElementById("student");
  const name = (r[1] || "").trim();
  const total = num(r[TOTAL_COL]);
  const pct = total === null ? 0 : Math.min(100, Math.round(total / TOTAL_MAX * 100));

  let tiles = "", comments = "";
  FIELDS.forEach(f => {
    const v = (r[f.col] || "").trim();
    if (f.text) {
      if (v) comments += `<div class="comment"><span class="ci">${f.icon}</span><div><b>${esc(f.label)}</b><p>${esc(v)}</p></div></div>`;
      return;
    }
    const n = num(v);
    const ratio = n === null ? 0 : n / f.max;
    const cls = n === null ? "g0" : ratio >= 0.85 ? "g1" : ratio >= 0.6 ? "g2" : "g3";
    tiles += `<div class="tile ${cls}"><div class="ti">${f.icon}</div><div class="tl">${esc(f.label)}</div>
      <div class="tv"><b>${n === null ? "-" : esc(n)}</b><span> / ${f.max}</span></div>
      <div class="bar"><i style="width:${Math.min(100, ratio * 100)}%"></i></div></div>`;
  });

  let color = "#16a34a", msg = "أداء ممتاز، بارك الله فيه وزاده من فضله 🌟";
  if (pct < 90) { color = "#2563eb"; msg = "أداء جيد جدًا، نتمنى له المزيد من التقدم 👏"; }
  if (pct < 75) { color = "#ea580c"; msg = "أداء جيد، ونشجعه على بذل مزيد من الجهد 💪"; }
  if (pct < 50) { color = "#CE1126"; msg = "يحتاج إلى مزيد من الاهتمام والمتابعة، ونأمل التعاون بين المدرسة والأسرة 🤝"; }

  box.innerHTML = `
    <div class="stu-head">
      <div class="avatar">${esc(name.charAt(0) || "؟")}</div>
      <div><h2>${esc(name)}</h2><span class="seat">رقم الجلوس: ${esc(r[0])}</span></div>
    </div>
    <div class="tiles">${tiles}</div>
    ${comments}
    <div class="totalbox">
      <div class="ring" style="--p:${pct};--c:${color}"><div><span>${total === null ? "-" : esc(total)}<small>من ${TOTAL_MAX}</small></span></div></div>
      <div><h4>المجموع الكلي: ${pct}%</h4><p>${msg}</p></div>
    </div>`;
  box.classList.remove("hidden");
  box.scrollIntoView({ behavior: "smooth", block: "start" });
}

async function search() {
  const msg = document.getElementById("msg");
  const box = document.getElementById("student");
  const btn = document.getElementById("btn");
  const seat = normalize(document.getElementById("seat").value);
  msg.textContent = ""; box.classList.add("hidden");
  if (!seat) { msg.textContent = "من فضلك أدخل رقم الجلوس."; return; }
  btn.disabled = true; btn.textContent = "جاري البحث...";
  try {
    const data = await loadData();
    const r = data.slice(FIRST_DATA_ROW).find(x => normalize(x[0]) === seat);
    if (r) show(r); else msg.textContent = "لم يتم العثور على رقم الجلوس، تأكد من الرقم وحاول مرة أخرى.";
  } catch (e) {
    msg.textContent = "تعذر تحميل البيانات. تأكد أن الملف مشارك (أي شخص لديه الرابط) وحاول لاحقًا.";
  } finally {
    btn.disabled = false; btn.textContent = "عرض الدرجات";
  }
}

document.getElementById("btn").addEventListener("click", search);
document.getElementById("seat").addEventListener("keydown", e => { if (e.key === "Enter") search(); });
