# Plan 3D – Ap. 3, Str. Pârâului 15, Brașov
Rezumatul lucrului din 17–18 noiembrie 2026

## Ce este
O pagină web interactivă cu apartamentul în 3D, construită pe baza releveului (scara 1/100, ing. Rusmanica Constantin-Mihai, 04.10.2024). Pe pereții camerelor poți pune prize, întrerupătoare, tabloul electric și note text, cu înălțimea fiecăruia. Pagina calculează și traseele cablurilor prin șapă.

**Fișiere:**
- `plan-3d-apartament.html` – planul, într-un singur fișier gata de publicat; funcționează și fără internet.
- Varianta publicată în contul Claude: https://claude.ai/artifact/JV71aFGz91Cav63EBuRKv1 (fixată în bara laterală).
- Conversația: https://claude.ai/code/session_0161oS8pmRSE4ZAPtyQUfZD4

## Apartamentul (din releveu)
Suprafață utilă 65,0 m², totală 69,1 m². Înălțimea pereților este 2,40 m.

| Nr. | Încăpere | Suprafață |
|---|---|---|
| 1 | Cămară | 1,0 m² |
| 2 | Bucătărie | 9,8 m² |
| 3 | Hol | 7,2 m² |
| 4 | Grup sanitar suplimentar | 2,2 m² |
| 5 | Debara | 0,4 m² |
| 6 | Cameră | 10,3 m² |
| 7 | Cameră | 11,9 m² |
| 8 | Baie | 4,1 m² |
| 9 | Cameră | 18,1 m² |
| 10 | Balcon | 4,1 m² |

Dimensiunile camerelor sunt cele din releveu. Grosimea pereților și pozițiile ușilor și ferestrelor sunt măsurate pe desen, cu o abatere de câțiva centimetri. Ferestrele sunt presupuse cu parapet de 90 cm și partea de sus la 2,10 m.

## Cum se folosește
- **Vederi:** „3D” (de ansamblu) și „Sus” (planul văzut de deasupra). În aceste vederi nu se pot pune elemente pe pereți.
- **Intră în cameră:** alegi camera din meniu și ajungi la nivelul ochilor (1,60 m). Tragi cu degetul ca să privești în jur și te miști cu joystick-ul (pe calculator: W A S D sau săgețile). Treci prin uși, nu prin pereți.
- **Adăugare:** alegi jos Priză / Întrerupător / Text / Tablou, apoi atingi peretele.
  - Prize: simplă, dublă, triplă, TV/internet, doar internet, doar TV.
  - Întrerupătoare: simplu, dublu, cap-scară.
  - Tablou electric: unul singur; dacă atingi alt perete, se mută acolo.
- **Înălțime:** se ia din punctul atins sau e cea standard (prize 30 cm, întrerupătoare 110 cm, tablou 170 cm). Se poate modifica exact, în cm.
- **Editare:** atingi elementul. Poți schimba tipul, înălțimea și textul, sau poți muta, copia ori șterge elementul. Bifa „Circuit separat” e pentru aparatele de peste 2 kW.
- **Listă:** toate elementele, grupate pe camere, cu înălțimea; lista se poate copia ca text.
- **⋯ Opțiuni:** ascunzi/arăți etichetele, faci o captură de ecran, exporți sau imporți datele, ștergi tot.

**Aspect:** prizele și întrerupătoarele sunt negre și cam de 1,8 ori mai mari decât în realitate, ca să se vadă bine. Etichetele sunt lipite de perete, cu chenarul cât textul. Denumirile sunt prescurtate (Pr., Într., Com.).

**Salvare:** datele se păstrează automat în browserul în care lucrezi. Ca să le duci pe alt dispozitiv sau pe alt site: ⋯ → „Copiază datele”, apoi ⋯ → „Importă date” acolo.

## Calculul traseelor de cablu (⚡ Trasee)
Fiecare circuit pleacă din tablou, coboară în șapă și leagă dozele în buclă, în ordinea care dă cel mai scurt cablu. Detaliile arată, pentru fiecare circuit: ordinea dozelor, tipul de cablu, siguranța, lungimea și numărul de străpungeri de pereți. Arată și totalul de materiale.

**Reguli folosite:**
- Iluminatul pe circuite separate de prize; câte un circuit separat pentru fiecare aparat de peste 2 kW; prizele protejate cu diferențial de cel mult 30 mA (I7/2011).
- Prize: cablu de minimum 2,5 mm², siguranță C16. Iluminat: minimum 1,5 mm², siguranță C10.
- Implicit cel mult 8 prize pe circuit (se poate alege 6, 8 sau 10). Bucătăria are circuit propriu (cel mult 6 prize), iar băile au circuit propriu.
- Internet: cablu UTP Cat6 separat la fiecare priză. TV: cablu coaxial RG6 separat la fiecare priză.
- În șapă, cablurile merg numai în tub de protecție, cu toate firele unui circuit în același tub.
- Modul recomandat urmează DIN 18015-3: trasee paralele cu pereții, la aproximativ 20 cm de ei, cu trecerea prin dreptul ușilor. Există și varianta cea mai scurtă, pe diagonală.
- Pereții exteriori și ghenele nu se străpung. Pereții interiori se străpung doar dacă ocolul ar fi mult mai lung.
- Lungimile includ coborârea din doză până în șapă și o rezervă de aproximativ 30 cm în fiecare doză. Cablurile de la întrerupătoare până la becuri NU sunt incluse. Recomandare: cumpără cu 10–15% în plus.

> Calculul este orientativ, pentru planificare și deviz. Proiectul și execuția se fac de un electrician autorizat ANRE, conform normativului I7/2011.

**Surse:**
- https://economisi.ro/energie/solutii-casa/schema-tablou-electric-monofazat
- https://newsweek.ro/tehnologie/ce-tip-de-cablu-e-cel-mai-potrivit-pentru-instalatia-electrica-de-acasa
- https://primariabuzau.ro/wp-content/uploads/2020/09/Memoriu-instalatii-electrice-1.pdf
- https://lunca-muresului.ro/download/itymDw2FXhQFTroxvmlplVT2eg9mPegs8tLVtMQv.pdf
- https://www.elektro-wandelt.de/ratgeber/Elektro-Installationszonen-im-Fussboden/
- https://www.sanier.de/elektroinstallation/elektroinstallation-auf-dem-rohfussboden
- https://re-energy.ro/calculator-sectiune-cablu/

## Istoricul modificărilor
1. Plan 3D din releveu; prize, întrerupătoare și text pe pereți, cu înălțime.
2. Etichete lipite de perete; prize și întrerupătoare mai mari și negre.
3. Tablou electric și calculul traseelor de cablu prin șapă (cu research pe I7/2011 și DIN 18015-3).
4. Elementele se pun pe pereți doar din interiorul camerei; mod de plimbare cu joystick.
5. Scris mai mare, apoi rândul cu înălțimea micșorat; denumiri prescurtate.
6. Prize doar internet și doar TV, cu cabluri separate (UTP / coaxial).
7. Chenarul etichetei are mărimea textului.
8. Am scos cablurile de la întrerupătoare la becuri.
9. Mesaje de eroare clare la pornire; biblioteca 3D inclusă direct în fișier, ca să meargă în Firefox și fără internet.

## Publicarea pe site
- Urci `plan-3d-apartament.html` pe hosting (de exemplu ca `index.html` într-un folder) și îl deschizi la adresa lui. Nu are nevoie de alte fișiere și nici de server special.
- Merge și pe găzduiri gratuite pentru pagini statice (GitHub Pages, Netlify, Cloudflare Pages): încarci fișierul și primești un link.
- Pentru a-l include într-o pagină existentă: `<iframe src="plan-3d-apartament.html" style="width:100%;height:90vh;border:0"></iframe>`.
- **Varianta de pe claude.ai salvează pe site** (18.11.2026): ce modifică proprietarul (sau un Editor) se salvează automat într-o bază de date a paginii și apare live la toți cei care o deschid. Vizitatorii văd „👁 Doar vizualizare”; ce schimbă ei nu se salvează. Vizitatorii trebuie să fie conectați la claude.ai; pagina trebuie partajată din meniul Share.
- Pe un hosting static obișnuit, prizele puse de fiecare vizitator rămân doar în browserul lui. Ca să apară pe site prizele tale, vizitatorul le poate importa din datele copiate (⋯ → „Importă date”).
