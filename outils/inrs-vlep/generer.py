# Fabrique js/data/inrs-vlep.js à partir de l'export Excel de la base VLEP de l'INRS
# (https://www.inrs.fr/publications/bdd/vlep.html, bouton d'export) :
#   python -I outils/inrs-vlep/generer.py "Export_VLEP (6).xlsx"
# Le fichier Excel reste hors git ; seules les valeurs utiles à l'appli sont reprises, avec la version de l'export.
import json, os, re, sys
import openpyxl

src = sys.argv[1]
ws = openpyxl.load_workbook(src, read_only=True, data_only=True).worksheets[0]
rows = list(ws.iter_rows(values_only=True))
version = next((str(c) for r in rows[:3] for c in r if c and re.search(r'Version du', str(c))), '')
hi = next(i for i, r in enumerate(rows) if r and 'Numero CAS' in [str(c) for c in r])
tete = [str(c or '').strip() for c in rows[hi]]
col = lambda nom: tete.index(nom)

def texte(v):
    return '' if v is None else str(v).strip()

def nature(t):
    t = t.lower()
    if 'contraignante' in t: return 'contraignante'
    if 'indicative' in t: return 'indicative'
    if 'admise' in t: return 'admise'
    if 'poussi' in t: return 'poussieres'
    return t

lignes = []
for r in rows[hi + 1:]:
    if not r or not texte(r[0]): continue
    lignes.append({
        'nom': texte(r[0]), 'cas': texte(r[col('Numero CAS')]), 'obs': texte(r[col('Observation')]), 'annee': texte(r[col('Annee')]),
        'v8ppm': texte(r[col('VLEP 8h (ppm)')]), 'v8': texte(r[col('VLEP 8h (mg/m3)')]),
        'vctppm': texte(r[col('VLEP CT (ppm)')]), 'vct': texte(r[col('VLEP CT (mg/m3)')]),
        'type': nature(texte(r[col('Type de valeur limite')])), 'com': texte(r[col('Commentaire')])
    })

dest = os.path.join(os.path.dirname(__file__), '..', '..', 'js', 'data', 'inrs-vlep.js')
with open(dest, 'w', encoding='utf-8') as f:
    f.write('/* Base VLEP de l\'INRS (export Excel), générée par outils/inrs-vlep/generer.py. Ne pas modifier à la main.\n'
            '   Une ligne par agent et un seul type par ligne : la nature exacte de chaque valeur se lit dans TEXTES_VLEP. */\n')
    f.write('const INRS_VLEP = ' + json.dumps({'version': version, 'source': 'https://www.inrs.fr/publications/bdd/vlep.html', 'lignes': lignes}, ensure_ascii=False) + ';\n')
print('Écrit : js/data/inrs-vlep.js (%s, %d lignes)' % (version, len(lignes)))
