"use strict";
/* ================= Entreprise ================= */
function syncEnt(){ $$("[data-k]").forEach(el=>{ el.value = S.ent[el.dataset.k] || ""; }); }
function bindEnt(){
  syncEnt();
  $$("[data-k]").forEach(el=>{
    if(el.dataset.bound) return; el.dataset.bound = "1";
    el.addEventListener("input", ()=>{ S.ent[el.dataset.k]=el.value; persist();
      if(DEF_KEYS.includes(el.dataset.k)){ try{ const d = getDefaults(); d[el.dataset.k] = el.value; localStorage.setItem(DKEY, JSON.stringify(d)); }catch(e){} }
      $$('[data-k="'+el.dataset.k+'"]').forEach(o=>{ if(o!==el) o.value = el.value; }); });
  });
}
