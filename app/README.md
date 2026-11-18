# Plan 3D – Ap. 3, Str. Pârâului 15, Brașov (aplicație cu salvare comună)

Aceeași funcționalitate ca `plan-3d-apartament.html` (plan 3D din releveu, prize / întrerupătoare / note / tablou pe pereți, mod de plimbare, listă, trasee de cablu prin șapă), dar **planul este comun**: oricine deschide pagina îl poate modifica, iar modificările se salvează pe server și apar imediat la toți cei care au pagina deschisă.

- **Frontend:** React 18 + Three.js (Vite)
- **Server:** Node.js + Express; planul se păstrează în `data/plan.json` (sau într-un Durable Object pe Cloudflare), iar modificările ajung live prin WebSocket
- **Istoric:** serverul păstrează automat ultimele 100 de versiuni (la câteva minute de modificări și înainte de orice import / ștergere completă). Din ⋯ → „Istoric versiuni” se poate reveni la una mai veche, dacă cineva strică planul.

## Pornire locală

```bash
npm install
npm run dev        # server pe :3001 + interfață pe http://localhost:5173
```

Varianta de producție (un singur proces):

```bash
npm run build
npm start          # http://localhost:3001
```

Variabile de mediu: `PORT` (implicit 3001), `DATA_DIR` (implicit `./data`).

## Publicare pe internet

### Cloudflare Workers (recomandat, gratuit)

Configurația este în `wrangler.jsonc` (în rădăcina repo-ului). Paginile sunt servite ca fișiere statice, iar `/api/*` ajunge la un Durable Object (`worker/index.js`) care păstrează planul și istoricul în SQLite și trimite modificările live prin WebSocket. Serverul Node nu este folosit acolo.

- **Din GitHub (Workers Builds):** în dashboard, Worker-ul legat de repo trebuie să aibă același nume ca `"name"` din `wrangler.jsonc`; directorul rădăcină rămâne `/`, comanda de deploy `npx wrangler deploy`. La fiecare push pe ramura de producție se face build (`npm run build` în `app/`) și deploy automat.
- **Din calculator:** `npx wrangler login`, apoi `npm run cf:deploy`.
- **Test local al variantei Cloudflare:** `npm run cf:dev` (http://localhost:8787).

### Server Node propriu

Serverul trebuie să ruleze continuu și să aibă **un disc care se păstrează** (altfel planul se pierde la repornire):

- **Docker** (orice VPS, NAS, Raspberry Pi):
  ```bash
  docker build -t plan-apartament .
  docker run -d -p 3001:3001 -v plan-data:/data --restart unless-stopped plan-apartament
  ```
- **Render / Railway / Fly.io:** comanda de build `npm install && npm run build`, comanda de start `npm start`; adaugă un volum persistent montat, de exemplu, la `/data` și setează `DATA_DIR=/data`. Pe planurile gratuite fără volum, datele se pierd la fiecare repornire.

## Mutarea datelor din planul vechi

În planul vechi: ⋯ → „Copiază datele”. Aici: ⋯ → „Importă date”, lipește și apasă „Importă”. Formatul este același.

## Atenție

Oricine are linkul poate modifica planul. Pentru un grup restrâns, ține linkul privat; dacă cineva greșește ceva, revino din „Istoric versiuni”.
