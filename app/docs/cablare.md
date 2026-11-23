# Cablarea instalației electrice – reguli pentru Ap. 3, Str. Pârâului 15, Brașov

Document de referință pentru funcția „Trasee” din aplicație. Apartamentul are ~65 m², pereți de 2,40 m, placă de beton cu **șapă de 5 cm**, un singur tablou în Hol (camera 3).
Este un ghid pentru planificare și deviz. Proiectul tehnic și execuția le face un electrician autorizat ANRE.

**Surse principale**

- [I7] Normativ I7/2011 – textul oficial pe [legislatie.just.ro](https://legislatie.just.ro/Public/DetaliiDocument/287132), plus [versiunea PDF](https://www.arya.ro/legislatie/pdf.php?slug=normativ-i7-2011) cu tabelele.
- [I7-2023] Ordinul MDLPA de modificare a I7, din [Monitorul Oficial nr. 512 din 12.06.2023](https://curentulelectric.ro/wp-content/uploads/2023/11/Actualizari-2023-la-normativ-I7-2011.pdf).
- [50174] EN 50174-2 (separarea cablurilor de date de cele de forță):
  - [rezumatul ANCOM al SR EN 50174-2:2019](https://www.ancom.ro/uploads/standarde/pdf/Rezumat%20SR%20EN%2050174-2_2019_Tehnologia%20informa%C8%9Biei.Instalarea%20cablurilor.Proiectare%20%C8%99i%20prectici%20de%20instalare%20%C3%AEn%20interiorul%20cl%C4%83dirilor.pdf);
  - [tabelul de distanțe din Excel Networking, TN01](https://excel-networking.com/excel_web_files/uploads/Technical%20Notes/TN01_Power_Segregation_Distances.pdf).
- [Tub] [Fișa tehnică Legrand ICTA 3422](https://cdn.dedeman.ro/media/catalog/product/fise-tehnice/Fisa_tehnica_-_tub_flexibil_Legrand_rezistenta_marita.pdf), un tub flexibil de 750 N.
- [CYY] [Fișa tehnică a cablului CYY-F](https://cdn.mathaus.ro/medias/sys_master/productPdfs/h02/hf1/h00/9467631894558.pdf), pentru diametrele exterioare.
- [18015] Zonele de instalare din DIN 18015-3:
  - [pe pereți (Baunetz Wissen)](https://www.baunetzwissen.de/elektro/fachwissen/leitungen-verteiler/leitungsverlegung-und-installationszonen-153012);
  - [în pardoseală (elektro-wandelt.de)](https://www.elektro-wandelt.de/ratgeber/Elektro-Installationszonen-im-Fussboden/).
- [NFC] NF C 15-100, ca practică de referință pentru numărul de prize pe circuit: [Legrand](https://www.legrand.fr/questions-frequentes/combien-de-prises-de-courant-par-disjoncteur).

Unde o cifră nu vine din I7, o spunem explicit și o tratăm ca presupunere.

---

## 1. Separarea circuitelor

| Regulă | Sursă |
|---|---|
| Circuitele de iluminat sunt distincte de cele de prize. | I7 5.4.1 |
| Într-o locuință, un circuit de prize monofazat are o putere instalată de **2 kW**. Aparatele de peste 2 kW (mașini de spălat, climatizare etc.) au circuite de priză separate. | I7 5.4.7 |
| Un circuit de iluminat monofazat are cel mult 3 kW instalați (recomandare). | I7 5.4.5 |
| Pentru părțile instalației comandate separat se prevăd circuite distincte. | I7 3.5.2 |
| Se evită traversarea băilor și bucătăriilor cu circuite pentru alte încăperi. În locuințe traversarea e admisă, dar e de evitat. | I7 5.4.12 |
| Dozele pot fi comune pentru iluminat și prize, dacă tensiunea e aceeași. | I7 5.4.2 |

**Numărul de prize pe circuit.** I7 nu dă un număr, ci doar cei 2 kW de mai sus.

- Ca practică folosim NF C 15-100 [NFC]:
  - max 8 prize pe un circuit de 16 A;
  - max 12 pe un circuit cu 2,5 mm²;
  - max 6 pe circuitul de prize din bucătărie.
- În aplicație limita se alege (6 / 8 / 10 doze, implicit 8). În plus, un circuit are cel mult 12 locuri de ștecher, iar bucătăria cel mult 6 doze.

## 2. Secțiuni, siguranțe, diferențiale

**Secțiuni minime pentru cupru** (I7 anexa 5.32):

- iluminat: 1,5 mm²;
- prize monofazate: **2,5 mm²**;
- coloana individuală a locuinței: 4 mm².

**Dimensionare** (I7 5.2.4.1). Curentul de calcul trebuie să fie cel mult curentul admisibil corectat (I_c ≤ I'_z). Valorile de curent admisibil sunt pentru PVC la 30 °C, din I7 anexa 5.10 (= SR HD 60364-5-52):

- conductoare în tub (B1): 1,5 → 17,5 A, 2,5 → 24 A, 4 → 32 A, 6 → 41 A;
- cablu în tub (B2): 16,5 / 23 / 30 / 38 A.

**Alegerea folosită:**

- iluminat: 1,5 mm² cu C10;
- prize: 2,5 mm² cu C16;
- aparat ≤ 3,7 kW (încape într-o priză Schuko de 16 A): 2,5 mm² cu C16;
- aparat mai mare (de exemplu o plită de 7,2 kW, 31 A): C32 și 4 mm² cu FY, respectiv 6 mm² cu CYY-F. Aparatul se racordează fix, nu prin priză.

**Diferențial de 30 mA:**

- obligatoriu pentru prizele de uz general ≤ 32 A (I7 4.1.5.2.1, în forma din 2023);
- obligatoriu pentru **toate circuitele din băi** (I7 7.1.3.5).

Iluminatul din apartamente nu e obligatoriu pe diferențial; regula de la I7 4.1.5.2.1 îl cere doar în locuințele unifamiliale. Noi îl punem totuși pe diferențial, pentru că lumina din baie o cere.

**Alte reguli din modificarea din 2023:**

- **AFDD** (detector de arc electric) e obligatoriu pentru toate circuitele de c.a. ≤ 32 A din „spații amenajate pentru dormit din clădiri rezidențiale” (I7 4.2.2.10, [I7-2023]).
- AFDD se montează la originea circuitului (I7 4.2.2.12).
- Pentru acest apartament înseamnă Camera mare (7) și Camera copii (6).

**Practică (nu e normă):**

- diferențial tip A, nu AC (aparatele cu electronică produc curenți de defect pe care tipul AC nu îi vede);
- cel mult 6 circuite pe un diferențial;
- două diferențiale, ca o declanșare să nu lase toată casa fără curent;
- descărcător de supratensiuni tip 2, recomandat; obligativitatea reiese din evaluarea de risc din I7 cap. 4.4.

## 3. Băi (I7 7.1, = SR HD 60364-7-701)

**Volume:**

- Volumul 0 e interiorul căzii sau al dușului.
- Volumul 1 e deasupra lui, până la 2,25 m.
- Volumul 2 se întinde **60 cm** în jurul volumului 1 (I7 7.1.2).

**Ce se montează unde** (I7 7.1.4.3):

- în volumele 0 și 1: nicio priză;
- în volumul 2: accesorii, dar nu prize (excepție: priza de aparat de ras cu transformator).
- Prizele obișnuite stau deci la **cel puțin 60 cm de marginea căzii sau a dușului**, pe diferențial de 30 mA.

**Alte reguli:**

- grad de protecție IPX4 în volumele 1 și 2 (I7 7.1.4.1);
- în pereții care mărginesc volumele 0–2, tuburile se îngroapă la cel puțin 5 cm sau se protejează altfel (I7 7.1.4.2).

## 4. Bucătărie și aparate mari

Fiecare aparat de peste 2 kW are circuitul lui (I7 5.4.7). Puterile implicite din aplicație sunt orientative; se schimbă din foaia prizei, câmpul „Aparat”:

| Aparat | kW | Circuit |
|---|---|---|
| Plită electrică | 7,2 | C32, 4 mm² FY, racord fix, RCBO |
| Cuptor | 3,5 | C16, 2,5 mm² |
| Mașină de spălat vase / rufe | 2,2 / 2,3 | C16, 2,5 mm² |
| Boiler | 2,0 | C16, 2,5 mm² |
| Aer condiționat | 2,5 | C16, 2,5 mm² |

Pentru calculul căderii de tensiune, prizele de pe blat (cel mult 6 pe circuit) au 3,5 kW pe circuit. Aceasta e o presupunere: fierbător plus prăjitor.

## 5. Înălțimi

- Prizele: axul la peste **0,1 m** de pardoseala finită, în afară de băi, bucătării și spălătorii (I7 5.4.25).
- Întrerupătoarele: I7 nu le fixează înălțimea. În practică se pun la 1,0–1,2 m, la 10–30 cm de tocul ușii, pe partea clanței [18015].
- Tabloul: latura de sus la cel mult 2,5 m în locuințe (I7 5.3.3.21). Latura de jos se alege încât tuburile să intre cu raza de curbură admisă (I7 5.3.3.22).

## 6. Trasee: pardoseală, pereți, plafon

**Pereți** [18015]:

- Zonele orizontale stau la 15–45 cm sub tavan și deasupra pardoselii (cota preferată 30 cm).
- Zonele verticale stau la 10–30 cm de colțuri și de tocurile ușilor și ferestrelor (cota preferată 15 cm).
- O coborâre verticală spre un aparat aflat în afara zonei e admisă.
- I7 recomandă trasee orizontale pe pereți la ~0,3 m sub plafon (I7 5.2.12.2.4).
- Șlițul se acoperă cu cel puțin 1 cm de tencuială (I7 5.2.12.2.6).
- Traseele sunt verticale și orizontale, niciodată oblice.

**Pardoseală** [18015]:

- Traseele stau la cel puțin **20 cm de pereți** și la 15 cm de tocuri în dreptul ușilor.
- Se țin la 20 cm de țevile de apă sau încălzire.
- Merg paralel cu pereții.
- În beton sau șapă se pun tuburi de 750 N (I7 tabelul 5.8, clasa 3 la compresiune).

**Doze și curbe:**

- Dozele în pardoseală sunt admise doar dacă sunt omologate pentru asta (I7 5.2.12.3.8). Dozele de derivație se pun pe pereți (I7 5.2.12.3.7).
- Raza de curbură a unui tub îngropat este de cel puțin **10 × diametrul exterior** (I7 5.2.12.3.5): Ø20 → 20 cm.
- Între două doze sunt admise cel mult **15 m și 3 curbe**, ori **25 m în linie dreaptă** (I7 5.2.12.3.10 și nota 4 la tabelul 5.7).

**Șapă de 5 cm** (practică, nu normă):

- Tubul rămâne sub ~25 mm de șapă deasupra: Ø20 lasă 30 mm, Ø25 lasă 25 mm, iar Ø32 lasă doar 18 mm și nu se folosește.
- La o încrucișare cele două tuburi se suprapun: Ø20 + Ø20 = 40 mm, deci rămân 10 mm. Încrucișările se evită, așezând tuburile alăturat pe culoare, sau se scobește local placa.
- DIN 18560-2 cere, la șapa flotantă, ca țevile să stea într-un strat de egalizare. Varianta potrivită trebuie confirmată cu cel care toarnă șapa.

**Plafon:**

- În blocurile cu planșeu de beton, plafonul nu se poate scobi adânc.
- Legătura de la întrerupător la lampă urcă vertical până la o doză de derivație la ~30 cm sub plafon, apoi trece prin tencuiala plafonului sau prin tavanul fals.

**Străpungeri:**

- Pereții exteriori și ghenele nu se străpung.
- Străpungerile prin anvelopă se etanșează (I7 3.0.1.10, 2023).
- Nu se fac îmbinări de tub în dreptul unui perete (I7 5.2.12.3.4).

## 7. Tuburi (copex)

- Toate conductoarele unui circuit, inclusiv PE, stau în același tub (I7 5.2.12.1.5).
- Mai multe circuite într-un tub sunt admise doar cu condiții (I7 5.2.12.1.6). Recomandat: un tub pe circuit.

**Umplere, pentru conductoare FY / H07V-U** (I7 5.2.12.1.7, tabelul 5.7):

- Regula: S_i ≥ 3·S_c.
- Ariile cu izolație: FY 1,5 = 8 mm², 2,5 = 11,94 mm², 4 = 15,2 mm², 6 = 19,62 mm².
- Diametrul interior minim, din tabelul 5.7:

| Conductoare | D_i minim | Copex (D_i: Ø16 = 10,7, Ø20 = 14,1, Ø25 = 18,3, Ø32 = 24,3 mm [Tub]) |
|---|---|---|
| 3 × 1,5 | 9,6 mm | Ø16 |
| 4–5 × 1,5 | 11–12,3 mm | Ø20 |
| 3 × 2,5 | 11,7 mm | Ø20 |
| 3 × 4 | 13,2 mm | Ø20 |
| 3 × 6 | 15 mm | Ø25 |

**Un singur cablu în tub:** D_i > 1,5 × diametrul cablului (I7 5.2.3.2.2). Regula e formulată pentru tuburile din pământ; o aplicăm prin analogie. Diametrele exterioare ale cablului CYY-F, după [CYY]:

| Cablu CYY-F | Diametru exterior | D_i necesar | Tub |
|---|---|---|---|
| 3×1,5 | 10,1 mm | 15,2 mm | Ø25 |
| 3×2,5 | 11,0 mm | 16,5 mm | Ø25 |
| 3×4 / 3×6 | 12,9 / 13,9 mm | – | **Ø32** – prea gros pentru 5 cm de șapă |

**De aceea recomandarea pentru acest apartament e FY în tub.**

**Peste 15 m sau 3 curbe** între doze, tabelul nu mai e garantat. Aici aplicăm o presupunere proprie: cerem S_i ≥ 4·S_c, ceea ce mărește tubul unde e nevoie, și tub cu fir de tragere.

## 8. Curenți slabi (internet, TV)

**Topologie:**

- Stea dintr-un punct media („tablou de curenți slabi”), fiecare priză cu cablul ei.
- Internet: FTP Cat6, maximum 90 m până la priză; aici sunt sub 15 m.
- TV: RG6 dintr-un splitter.
- În aplicație punctul media e pus automat lângă tabloul electric, pe același perete, la ~45 cm.

**Separare față de forță:**

- Circuite în același sistem de pozare doar cu izolație pentru tensiunea cea mai mare, cu compartimente separate sau cu **tub separat** (I7 5.2.8.1).
- În canale comune, golurile se separă prin ecran (I7 5.2.12.4.2, 2023).

**Distanțe (EN 50174-2):** distanța este A = S × P [50174].

| Cablu | Clasă | S fără ecran metalic |
|---|---|---|
| U/UTP Cat6 | c | 50 mm |
| F/UTP (FTP) | d | 10 mm |
| Coaxial | a | 300 mm |

Factorul P este 0,2 pentru 1–3 circuite de 20 A și 0,4 pentru 4–6 circuite.

- Pentru un circuit monofazat ≤ 32 A cu conductoarele strânse împreună, standardul admite distanță zero.
- **Regula din aplicație:** tub separat, fără porțiuni paralele în aceeași bandă de 10 cm cu forța (la 10 cm se acoperă și coaxialul lângă 1–3 circuite: 300 × 0,2 = 60 mm), încrucișări în unghi drept.
- Excepție: lângă tablou și cutia media, unde toate tuburile converg.

## 9. Căderea de tensiune

- Limitele, de la contor (branșament de joasă tensiune): **3% la iluminat, 5% la celelalte receptoare** (I7 5.2.5.1).
- Se verifică pe traseul cel mai lung și mai încărcat, la puterea maximă absorbită.

**Formula monofazată folosită:** ΔU% = 200·ρ·L·I / (S·230), cu ρ = 0,0206 Ω·mm²/m (cupru la 70 °C) și toată sarcina la capătul circuitului (acoperitor).

**Presupuneri:**

- coloana contor–tablou: 3 m × 10 mm² la 25 A (contorul e lângă tablou), adică ~0,15%;
- prize: 2 kW pe circuit;
- bucătărie: 3,5 kW pe circuit;
- iluminat: 100 W pe punct de lumină, minimum 300 W.

Dacă limita e depășită, aplicația mărește secțiunea și afișează o avertizare.

## 10. Tabloul – schemă tipică pentru acest apartament (2 camere + living)

| Poziție | Aparat | Module |
|---|---|---|
| Q0 | Întrerupător general 2P 40 A (de corelat cu avizul de racordare) | 2 |
| F0 | Descărcător de supratensiuni tip 2 (recomandat) | 2 |
| Q1 | DDR 2P 40 A / 30 mA tip A: iluminat zi, prize baie, aparate (cuptor, mașini, AC living) | 2 + 1/circuit |
| Q2 | DDR 2P 40 A / 30 mA tip A: prize living / hol, prize bucătărie, boiler | 2 + 1/circuit |
| Cx | AFDD + RCBO 1P+N 30 mA, câte unul pe fiecare circuit din dormitoare (iluminat, prize, AC) | 2 / circuit |
| Cx | RCBO C32 30 mA pentru plită | 2 |

- Pentru exemplul de mai jos rezultă ~25 de module ocupate. Cu **20% rezervă** (practică) e nevoie de o cutie de **36 de module** (3 × 12).
- Sub tablou intră un tub pe circuit, deci tabloul să fie montat suficient de sus pentru curbe (I7 5.3.3.22).

## 11. Materiale (ce numără aplicația)

**Cabluri:**

- FY pe secțiuni și culori: maro pentru L, albastru pentru N, galben-verde pentru PE, negru pentru retur și comutare.
- Sau CYY-F, pe tipuri: 3×1,5, 3×2,5, 3×4 / 3×6, 4×1,5, 5×1,5.
- FTP Cat6 și RG6.

**Rezerve incluse:**

- 30 cm în fiecare doză;
- la curenți slabi, 50 cm în cutia media și 30 cm la priză.
- Cantitățile se cumpără cu 10–15% în plus.

**Alte materiale:**

- Tub copex 750 N pe diametre, separat pentru curenți slabi.
- Doze de aparat după numărul de module: simplă Ø60, dublă, triplă sau cvadruplă; priza combinată primește separator între 230 V și date.
- Doze de tragere și doză de racord fix.
- Aparatele din tablou: disjunctoare pe calibre, diferențiale, AFDD, RCBO și cutia cu numărul de module.
- Curenți slabi: cutie media, conectori RJ45, patch panel / switch, splitter, mufe F.
- Aparataj pe tipuri și puncte de lumină (estimare).

---

## 12. Cum se reflectă în cod

Codul e în `app/src/plan/routes.js`. Constantele au articolul alături.

| Regulă | Unde |
|---|---|
| Iluminat separat de prize; bucătărie, băi, dormitoare și fiecare aparat `ded` pe circuit propriu | `computeRoutes` → `cluster(...)`, tipurile `light` / `socket` / `kitchen` / `bath` / `ded` |
| Cel mult `RS.max` doze și 12 locuri pe circuit, 6 în bucătărie, 8 întrerupătoare pe iluminat | `cluster`, `LOC_MAX`, `KITCH_MAX`, `MAX_LIGHT` |
| Secțiuni minime (anexa 5.32) și I_n ≤ I_z (anexa 5.10) | `IZ`, `IZ_C`, blocul „dimensionare electrică” |
| Puterea aparatului (`kw`, text „3,5 kW” sau tip recunoscut); peste 3,7 kW racord fix | `APPL`, `applOf`, `SOCKET_KW` |
| Căderea de tensiune 3% / 5%, cu secțiune mărită la nevoie | `DU_MAX`, `COL`, `RHO`, `g.dU` |
| DDR 30 mA pe toate circuitele, cel mult 6 pe un DDR; AFDD în dormitoare; RCBO pentru plită | `SLEEP`, `RCD_MAX`, blocul „tabloul” → `res.board` |
| Numărul de module + 20% rezervă → mărimea cutiei | `board.mods`, `board.need`, `board.encl` |
| Trasee în pardoseală la ≥ 20 cm de pereți, prin uși, ocolind băile | `costArr` (`nearW`, `near2`, `wet`) |
| Coborâre doar verticală sub aparat, nu prin goluri de uși / ferestre | `dropBlocked` |
| Curbe (echivalent 90°, inclusiv cele două coborâri) și lungimea între doze; S_i ≥ 3·S_c, respectiv ≥ 4·S_c peste 15 m / 3 curbe; doză de tragere peste 25 m | `pathInfo` → `bends`, `sizeLink`, `tubeIdx`, `TUBES`, `FY_A`, `CYY_D` |
| Tub ≤ Ø25 în șapa de 5 cm; încrucișări care lasă sub 1 cm de șapă | `SCREED_MM`, `COVER_MIN`, `crossPairs` |
| Curenți slabi în stea din punctul media, tub separat, penalizare lângă forță, verificarea porțiunilor paralele | `mediaOf`, costul `CD`, `g.par` |
| Prize prea jos (I7 5.4.25), prize în baie (I7 7.1.4.3), comutatoare necuplate | blocul „verificări pe aparate” → `res.warn` |
| Materiale | `add(...)` → `res.bom`; export în `routeText` și `bomCsv` |

Interfața este în `app/src/App.jsx`:

- `Routes`: tab-urile Circuite / Tablou / Materiale, avertizările, exportul text și CSV;
- `Appliance`: aparatul și puterea pe circuitul separat.

Câmpul `kw` al elementului e validat pe server în `app/server/core.js` (`cleanItem`). Cutia media e desenată în `scene.js` (`drawRoutes`).

## 13. Presupuneri și întrebări pentru proprietar

Răspunsuri primite (23.11.2026):
- **Plita e pe gaz:** nu are circuit propriu; aprinderea electrică merge pe o priză obișnuită din bucătărie. Se recomandă un detector de gaz cu electrovalvă, cu priză lângă el, la circa 30 cm sub tavan.
- **Fără aer condiționat.**
- **Apa caldă vine de la centrala pe gaz:** nu e boiler. Centrala primește circuit separat (recomandat de producători).
- **În living nu doarme nimeni**, doar ocazional musafirii: AFDD nu e obligatoriu acolo, rămâne opțional.
- **Centrala e în bucătărie**, pe peretele din fața tabloului. Lângă ea vine priza pe circuit separat; detectorul de gaz se pune tot în bucătărie.
- **Contorul e aproape de tablou:** coloana e scurtă, presupusă 3 m × 10 mm² (secțiunea rămâne de verificat).
- **Baia mare are cadă**, la capătul opus ușii, pe toată lățimea băii (170 × 70 cm). Aplicația desenează cada și avertizează dacă o priză sau un întrerupător e la mai puțin de 60 cm de ea. **Baia de serviciu nu are cadă.**
- **Șapa e turnată direct pe placă (aderentă):** tuburile stau în cei 5 cm de șapă, fără strat de egalizare.

- **Cutia media (internet și TV) rămâne lângă tablou**, în Hol.
- **Luminile nu se calculează:** traseele și materialele cuprind doar circuitele până la întrerupătoare (plus firele de comutare dintre cap-scară). Legătura întrerupător–lampă, dozele de sub plafon și corpurile de iluminat se stabilesc separat. Pentru căderea de tensiune la iluminat se ia 100 W pe clapă, minimum 300 W pe circuit.
