// Scénario de bout en bout à exécuter DANS la page (console du navigateur) : dossier fictif -> plan -> justifications
// -> Word -> Excel. Renvoie une empreinte de chaque sortie, pour comparer deux versions de l'appli.
// Aléatoire et date figés pour que deux exécutions donnent la même chose.
(async () => {
  let seed = 42; Math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
  Date.now = () => 1761300000000;
  const out = {}; let last = null;
  download = (blob, name) => { last = blob; };
  const pick = re => { const i = BASE.findIndex(b => re.test(b.agent) && String(b.labo || "").trim()); if (i < 0) throw new Error("agent absent : " + re); return i; };
  S = normalize({ v: 1, ent: { nom: "Entreprise fictive", adresse: "1 rue de l'essai", cpville: "57000 Metz", affaire: "TEST-0001", activite: "Peinture et dégraissage de pièces métalliques" } });
  S.cap = { pumps: 6, techs: 1, h8: 4, ct: 3 };
  const g1 = Object.assign(newGeh("Peintre cabine", "3"), { taches: [{ id: uid(), t: "Application peinture au pistolet", duree: "Entre 1 et 4h", freq: "Quotidienne", prod: "Peinture PU\ntoluène, xylène" }] });
  const g2 = Object.assign(newGeh("Opérateur dégraissage", "2"), { taches: [{ id: uid(), t: "Dégraissage au trempé", duree: "Plus de 4h", freq: "Quotidienne", prod: "Dégraissant\nacétone" }] });
  const g3 = Object.assign(newGeh("Agent de maintenance", "1"), { taches: [{ id: uid(), t: "Nettoyage pistolets", duree: "Moins de 15 min", freq: "Hebdomadaire", prod: "Diluant\ntoluène" }] });
  S.ateliers = [{ id: uid(), nom: "Atelier peinture", gehs: [g1, g3] }, { id: uid(), nom: "Atelier traitement", gehs: [g2] }];
  const add = (re, gehs) => { const a = snapshot(BASE[pick(re)]); a.uid = uid(); S.agents.push(a); gehs.forEach(g => g.agents.push(a.uid)); return a; };
  add(/^toluène$/i, [g1, g3]); add(/^o-xylène/i, [g1]); add(/^acétate de n-butyle/i, [g1]); add(/^acétone$/i, [g2]); add(/^formaldéhyde$/i, [g2]);
  out.agents = S.agents.map(a => a.agent);
  const r = genPlan({ nb: 3, ct: true, grp: true, mode: "cap" });
  out.genPlan = r; out.plan = S.plan.map(p => [p.jour, p.ag.map(agName).join("+"), planGeh(p), p.nb, p.type, p.plage]);
  out.nJust = genJust(); out.just = S.just.map(j => (j.txt || j.t || JSON.stringify(j)).slice(0, 400));
  ["ent", "terrain", "agents", "geh", "plan", "just", "devis", "export"].forEach(p => { try { show(p); } catch (e) { out["show_" + p] = e.message; } });
  const txt = async blob => { const z = await JSZip.loadAsync(blob), o = {}; for (const n of Object.keys(z.files).sort()) if (/\.xml$/.test(n)) o[n] = await z.file(n).async("string"); return o; };
  const hash = s => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return h; };
  await $("#bWord").onclick(); const w = await txt(last); out.word = Object.fromEntries(Object.entries(w).map(([k, v]) => [k, hash(v)]));
  out.wordTexte = w["word/document.xml"].replace(/<[^>]+>/g, "").slice(0, 3000);
  out.xlsx = Object.fromEntries(Object.entries(await txt(await buildXlsx())).map(([k, v]) => [k, hash(v)]));
  try { const lib = await loadPdfJs(); out.pdfjs = typeof lib.getDocument; } catch (e) { out.pdfjs = "ERREUR " + e.message; }
  return out;
})();
