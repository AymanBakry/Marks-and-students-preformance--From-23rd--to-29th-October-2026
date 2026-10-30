// ===== الإعدادات =====
const SHEET_ID = "1CxDCPkOi42Vh8X5Vrw7FVHKtREN4kLI9VHuKGDh4Cuk";
const SHEET_NAME = "Sheet1";
const URL_CSV = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(SHEET_NAME)}`;

// أعمدة الدرجات (ابدأ العد من 0: A=0, B=1, C=2 ...) عدّل الأسماء أو الأرقام حسب ملفك
const FIELDS = [
  { col: 2, label: "اختبار 1", max: 20 },
  { col: 3, label: "الأداء الأكاديمي", text: true },
  { col: 4, label: "المشاركة", max: 10 },
  { col: 5, label: "الأداء السلوكي والانضباط الصفي", text: true },
  { col: 6, label: "السلوك", max: 10 },
  { col: 7, label: "المذكرة", max: 10 },
  { col: 8, label: "المهمة 1", max: 5 },
  { col: 9, label: "المهمة 2", max: 5 },
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

// تحويل الأرقام العربية/الهندية إلى إنجليزية وإزالة المسافات والرموز
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
  let html = `<h2>${esc(r[1])}</h2><div class="seat">رقم الجلوس: ${esc(r[0])}</div><table>`;
  FIELDS.forEach(f => {
    const v = (r[f.col] || "").trim();
    if (!v && f.text) return;
    const n = num(v);
    const shown = f.max ? `${n === null ? "-" : esc(n)} / ${f.max}` : esc(v);
    html += `<tr><th>${esc(f.label)}</th><td>${shown}</td></tr>`;
  });
  html += `</table><div class="total">المجموع: ${esc(num(r[TOTAL_COL]) ?? "-")} / ${TOTAL_MAX}</div>`;
  box.innerHTML = html;
  box.classList.remove("hidden");
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
