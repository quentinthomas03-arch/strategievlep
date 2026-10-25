"use strict";
/* ================= Utilitaires ================= */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const esc = s => String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const cleanName = s => String(s||"").replace(/\s*\n\s*/g," – ").replace(/\s{2,}/g," ").trim();
const fmt = v => (v==null||v==="") ? "-" : String(v).replace(".",",");
const CAS_RE = /\b\d{2,7}-\d{2}-\d\b/;
function vtype(a){ return a.vContr||a.type==="contr" ? "contr" : (a.vIndic||a.type==="indic" ? "indic" : (a.vAdm||a.type==="adm" ? "adm" : "")); }
const TYPE_LBL = {contr:"contraignante", indic:"indicative", adm:"admise", "":"—"};
