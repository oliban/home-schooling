-- Migration 021: Enhance curriculum descriptions for LLM usage
-- Adds extended descriptions, requires_work_shown flag, example problems, and key concepts
-- Based on LGR22 curriculum: "förmåga att redogöra för beräkningar och slutsatser"

-- Add new columns to curriculum_objectives
ALTER TABLE curriculum_objectives ADD COLUMN extended_description TEXT;
ALTER TABLE curriculum_objectives ADD COLUMN requires_work_shown INTEGER DEFAULT 0;
ALTER TABLE curriculum_objectives ADD COLUMN example_problems TEXT;
ALTER TABLE curriculum_objectives ADD COLUMN key_concepts TEXT;

-- =============================================
-- MATEMATIK: TALUPPFATTNING (MA-TAL)
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Naturliga tal (1, 2, 3...) - förstå vad tal betyder, kunna räkna, jämföra storlek och ordna tal. Eleven ska utveckla förståelse för talens innebörd, inte bara kunna rabbla räkneramsan.',
  requires_work_shown = 0,
  example_problems = '["Vilket tal är störst: 8 eller 12?", "Räkna från 5 till 15", "Ordna talen 7, 3, 9 från minst till störst"]',
  key_concepts = '["räkneord", "jämföra", "ordna", "talföljd"]'
WHERE code = 'MA-TAL-01';

UPDATE curriculum_objectives SET
  extended_description = 'Positionssystemet för naturliga tal - förstå ental, tiotal, hundratal och deras värde beroende på position. Eleven ska kunna förklara att i talet 345 är 3:an värd 300, 4:an värd 40 och 5:an värd 5.',
  requires_work_shown = 0,
  example_problems = '["Vad betyder 3:an i talet 345?", "Vilket tal har 5 tiotal och 3 ental?", "Skriv 200 + 40 + 7 som ett tal"]',
  key_concepts = '["ental", "tiotal", "hundratal", "positionsvärde"]'
WHERE code = 'MA-TAL-02';

UPDATE curriculum_objectives SET
  extended_description = 'Del av helhet och del av antal - förstå vad "hälften", "en tredjedel", "en fjärdedel" betyder visuellt och konkret. Eleven ska kunna dela upp föremål eller mängder i lika delar.',
  requires_work_shown = 0,
  example_problems = '["Dela cirkeln i fyra lika delar", "Hur mycket är hälften av 8 äpplen?", "Färglägg en tredjedel av figuren"]',
  key_concepts = '["hälften", "tredjedel", "fjärdedel", "lika delar"]'
WHERE code = 'MA-TAL-03';

UPDATE curriculum_objectives SET
  extended_description = 'Tal i bråkform (1/2, 3/4) - förstå bråk som begrepp och representation av delar av helhet. INTE beräkningar med bråk, utan förståelse för vad bråk betyder och hur de relaterar till varandra.',
  requires_work_shown = 0,
  example_problems = '["Vilken bild visar 3/4?", "Är 1/2 större eller mindre än 1/4?", "Skriv hur stor del som är färgad som ett bråk"]',
  key_concepts = '["täljare", "nämnare", "del av helhet", "jämföra bråk"]'
WHERE code = 'MA-TAL-04';

UPDATE curriculum_objectives SET
  extended_description = 'Positionssystemet för decimaltal - förstå tiondelar och hundradelar som positioner efter decimaltecknet. Eleven ska förstå att 0.5 betyder 5 tiondelar och 0.25 betyder 25 hundradelar.',
  requires_work_shown = 0,
  example_problems = '["Vad betyder 7:an i 3.47?", "Skriv tre tiondelar som decimaltal", "Vilket är störst: 0.5 eller 0.35?"]',
  key_concepts = '["tiondel", "hundradel", "decimaltecken", "positionsvärde"]'
WHERE code = 'MA-TAL-05';

UPDATE curriculum_objectives SET
  extended_description = 'Samband mellan bråk och decimaltal - kunna omvandla mellan bråk och decimal (1/4 = 0.25, 1/2 = 0.5). Eleven ska förstå att bråk och decimaltal är olika sätt att skriva samma värde.',
  requires_work_shown = 0,
  example_problems = '["Skriv 1/2 som decimaltal", "Vilket bråk motsvarar 0.75?", "Är 3/4 samma som 0.75?"]',
  key_concepts = '["omvandling", "likvärdiga tal", "bråk", "decimal"]'
WHERE code = 'MA-TAL-06';

UPDATE curriculum_objectives SET
  extended_description = 'Tal i procentform - förstå vad procent betyder (25% = 25 av 100) och sambandet med bråk och decimal. INTE procentberäkningar i textuppgifter, utan begreppsförståelse.',
  requires_work_shown = 0,
  example_problems = '["Vad är 50% som bråk?", "Färglägg 25% av figuren", "Vilket är mest: 30% eller 1/4?"]',
  key_concepts = '["procent", "hundradel", "del av 100", "samband"]'
WHERE code = 'MA-TAL-07';

UPDATE curriculum_objectives SET
  extended_description = 'Negativa tal och tallinjen - förstå minustal, deras placering på tallinjen och hur de jämförs. Eleven ska kunna avgöra att -5 är mindre än -2 och förstå negativa tal i vardagen (temperatur, skuld).',
  requires_work_shown = 0,
  example_problems = '["Vilket är störst: -5 eller -2?", "Placera -3, 0, 2 på tallinjen", "Det är -4 grader ute. Blir det varmare eller kallare om temperaturen sjunker 2 grader?"]',
  key_concepts = '["negativa tal", "tallinje", "jämföra", "motsats"]'
WHERE code = 'MA-TAL-08';

UPDATE curriculum_objectives SET
  extended_description = 'Reella tal - rationella och irrationella tal, tallinjen som kontinuerlig. Eleven ska förstå att det finns tal som inte kan skrivas som bråk (t.ex. √2, π) och att tallinjen innehåller alla dessa tal.',
  requires_work_shown = 0,
  example_problems = '["Är √4 ett rationellt tal?", "Ge ett exempel på ett irrationellt tal", "Kan alla tal skrivas som bråk?"]',
  key_concepts = '["rationella tal", "irrationella tal", "tallinje", "kontinuitet"]'
WHERE code = 'MA-TAL-09';

UPDATE curriculum_objectives SET
  extended_description = 'Talsystemets utveckling - historik och samband mellan naturliga tal, heltal, rationella tal och reella tal. Eleven ska förstå hur talmängderna byggts ut steg för steg.',
  requires_work_shown = 0,
  example_problems = '["Varför behövdes negativa tal?", "Vilken talmängd tillhör -3?", "Ge ett tal som är reellt men inte rationellt"]',
  key_concepts = '["talmängder", "utvidgning", "historik", "samband"]'
WHERE code = 'MA-TAL-10';

UPDATE curriculum_objectives SET
  extended_description = 'Centrala metoder för beräkningar med reella tal - algoritmer och strategier för addition, subtraktion, multiplikation och division. Eleven ska kunna VISA och FÖRKLARA sina beräkningsmetoder, inte bara ge svar.',
  requires_work_shown = 1,
  example_problems = '["Beräkna 732 ÷ 6 och visa hur du tänker", "Räkna ut 45 × 23 med uppställning", "Förklara hur du räknar 3.5 + 2.75"]',
  key_concepts = '["algoritm", "uppställning", "beräkningsmetod", "visa lösning"]'
WHERE code = 'MA-TAL-11';

UPDATE curriculum_objectives SET
  extended_description = 'Rimlighetsbedömning vid uppskattningar och beräkningar - kunna uppskatta ungefärliga svar och kontrollera om beräknade svar verkar rimliga. Eleven ska utveckla talsinne och kritiskt tänkande.',
  requires_work_shown = 0,
  example_problems = '["Ungefär hur mycket är 49 × 21?", "Kan svaret 5000 stämma om vi multiplicerar 23 × 18?", "Uppskatta hur långt det är mellan Stockholm och Göteborg"]',
  key_concepts = '["uppskattning", "överslagsräkning", "rimlighet", "talsinne"]'
WHERE code = 'MA-TAL-12';

-- =============================================
-- MATEMATIK: ALGEBRA (MA-ALG)
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Likhetstecknets betydelse - förstå att = betyder "lika mycket på båda sidor", inte bara "svaret blir". Eleven ska förstå att 5 + 3 = 4 + 4 är sant för att båda sidor har samma värde.',
  requires_work_shown = 0,
  example_problems = '["Är 5 + 3 = 4 + 4 sant?", "Vilket tal saknas: 7 = 3 + ?", "Stämmer det att 10 = 10?"]',
  key_concepts = '["likhetstecken", "balans", "samma värde", "ekvation"]'
WHERE code = 'MA-ALG-01';

UPDATE curriculum_objectives SET
  extended_description = 'Enkla mönster - kunna fortsätta, beskriva och skapa återkommande mönster (röd, blå, röd, blå...). Eleven ska utveckla förmåga att se regelbundenheter och uttrycka dem.',
  requires_work_shown = 0,
  example_problems = '["Vad kommer härnäst: röd, blå, röd, blå, ?", "Rita ett eget mönster som upprepas", "Beskriv mönstret: ○●○●○●"]',
  key_concepts = '["mönster", "upprepning", "fortsätta", "beskriva"]'
WHERE code = 'MA-ALG-02';

UPDATE curriculum_objectives SET
  extended_description = 'Obekanta tal - använda symboler (x, ?, □) för att representera okända tal i enkla sammanhang. Eleven ska förstå att symbolen står för ett tal som ska hittas.',
  requires_work_shown = 0,
  example_problems = '["? + 5 = 12. Vad är ?", "Om x = 4, vad är x + 3?", "Skriv en öppen utsaga för: ett tal plus 7 är 15"]',
  key_concepts = '["obekant tal", "symbol", "variabel", "öppen utsaga"]'
WHERE code = 'MA-ALG-03';

UPDATE curriculum_objectives SET
  extended_description = 'Metoder för enkel ekvationslösning - hitta x i enkla ekvationer genom att prova, använda balansmetoden eller "tänka baklänges". Eleven ska VISA sin lösning steg för steg och kunna förklara metoden.',
  requires_work_shown = 1,
  example_problems = '["Lös x + 5 = 12 och visa hur du tänker", "Vad är x om 3x = 15? Förklara din metod", "Använd balansmetoden för att lösa 2x + 4 = 10"]',
  key_concepts = '["ekvationslösning", "balansmetoden", "tänka baklänges", "visa steg"]'
WHERE code = 'MA-ALG-04';

UPDATE curriculum_objectives SET
  extended_description = 'Mönster i talföljder - hitta och beskriva regeln i talsekvenser (2, 4, 6, 8... eller 1, 4, 9, 16...). Eleven ska kunna fortsätta följden och formulera regeln.',
  requires_work_shown = 0,
  example_problems = '["Vad är nästa tal: 2, 4, 6, 8, ?", "Beskriv regeln för 3, 6, 9, 12...", "Vilket är det 10:e talet i följden 5, 10, 15, 20...?"]',
  key_concepts = '["talföljd", "regel", "mönster", "fortsätta"]'
WHERE code = 'MA-ALG-05';

UPDATE curriculum_objectives SET
  extended_description = 'Variabelbegreppet - förstå att en variabel (x, y) kan representera olika värden i olika sammanhang. Eleven ska förstå skillnaden mellan variabel och obekant.',
  requires_work_shown = 0,
  example_problems = '["Om y = antal äpplen, vad betyder 2y?", "Kan x vara olika värden i olika uppgifter?", "Skriv en formel för arean av en rektangel med sidan s"]',
  key_concepts = '["variabel", "representation", "generalisering", "formel"]'
WHERE code = 'MA-ALG-06';

UPDATE curriculum_objectives SET
  extended_description = 'Algebraiska uttryck - förenkla och räkna med uttryck som 2x + 3x = 5x. Eleven ska förstå att man bara kan addera termer med samma variabel.',
  requires_work_shown = 0,
  example_problems = '["Förenkla: 3x + 2x", "Beräkna 4a - a + 2a", "Kan man förenkla 2x + 3y?"]',
  key_concepts = '["algebraiskt uttryck", "term", "förenkla", "koefficient"]'
WHERE code = 'MA-ALG-07';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerad ekvationslösning - lösa ekvationer med parenteser, x på båda sidor och flera steg. Eleven ska VISA varje steg och motivera sina omskrivningar.',
  requires_work_shown = 1,
  example_problems = '["Lös 2(x + 3) = 14 steg för steg", "Lös 3x + 5 = x + 11", "Visa hur du löser 4(x - 2) + 3 = 2x + 7"]',
  key_concepts = '["parenteser", "flera steg", "x på båda sidor", "visa lösning"]'
WHERE code = 'MA-ALG-08';

UPDATE curriculum_objectives SET
  extended_description = 'Linjära ekvationssystem - lösa två ekvationer med två obekanta genom substitution eller addition. Eleven ska behärska systematiska lösningsmetoder.',
  requires_work_shown = 1,
  example_problems = '["Lös: x + y = 10, x - y = 2", "Använd substitution för att lösa systemet", "Rita graferna och hitta skärningspunkten"]',
  key_concepts = '["ekvationssystem", "substitution", "additionsmetoden", "skärningspunkt"]'
WHERE code = 'MA-ALG-09';

UPDATE curriculum_objectives SET
  extended_description = 'Potenser med heltaliga exponenter - förstå och räkna med exponenter (2³ = 8, 10² = 100). Eleven ska kunna potenslagarna och tillämpa dem.',
  requires_work_shown = 0,
  example_problems = '["Beräkna 2⁴", "Förenkla 3² × 3³", "Vad är 10⁰?"]',
  key_concepts = '["potens", "bas", "exponent", "potenslagar"]'
WHERE code = 'MA-ALG-10';

-- =============================================
-- MATEMATIK: GEOMETRI (MA-GEO)
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Grundläggande geometriska objekt - känna igen och namnge cirkel, kvadrat, triangel, rektangel, kub, klot och andra vanliga former i omgivningen.',
  requires_work_shown = 0,
  example_problems = '["Vilken form har ett fönster?", "Rita en triangel", "Peka på alla cirklar i bilden"]',
  key_concepts = '["cirkel", "kvadrat", "triangel", "rektangel"]'
WHERE code = 'MA-GEO-01';

UPDATE curriculum_objectives SET
  extended_description = 'Konstruktion av enkla geometriska objekt - rita och bygga enkla former med linjal och andra verktyg. Eleven ska kunna SKAPA former, inte bara identifiera dem.',
  requires_work_shown = 1,
  example_problems = '["Rita en kvadrat med sidan 4 cm", "Bygg en kub av papper", "Rita en cirkel med radius 3 cm"]',
  key_concepts = '["konstruera", "rita", "linjal", "bygga"]'
WHERE code = 'MA-GEO-02';

UPDATE curriculum_objectives SET
  extended_description = 'Lägesord för att beskriva placering - använda ord som över, under, bredvid, mellan, framför, bakom, till vänster, till höger för att beskriva var saker finns.',
  requires_work_shown = 0,
  example_problems = '["Vad ligger ovanför bordet?", "Placera bollen till vänster om stolen", "Beskriv var katten sitter"]',
  key_concepts = '["över", "under", "bredvid", "framför", "bakom"]'
WHERE code = 'MA-GEO-03';

UPDATE curriculum_objectives SET
  extended_description = 'Symmetri i vardagen och konsten - känna igen spegelsymmetri i bilder, bokstäver, figurer och naturen. Eleven ska kunna identifiera symmetrilinjer.',
  requires_work_shown = 0,
  example_problems = '["Är bokstaven A symmetrisk?", "Rita andra halvan av fjärilen", "Hur många symmetrilinjer har en kvadrat?"]',
  key_concepts = '["spegelsymmetri", "symmetrilinje", "spegling", "identisk"]'
WHERE code = 'MA-GEO-04';

UPDATE curriculum_objectives SET
  extended_description = 'Geometriska objekts egenskaper (åk 4-6) - analysera former utifrån antal sidor, hörn, vinklar och andra egenskaper. Eleven ska kunna jämföra och klassificera figurer.',
  requires_work_shown = 0,
  example_problems = '["Hur många sidor har en hexagon?", "Vilka figurer har fyra räta vinklar?", "Jämför en kvadrat och en rektangel"]',
  key_concepts = '["sidor", "hörn", "vinklar", "egenskaper"]'
WHERE code = 'MA-GEO-05';

UPDATE curriculum_objectives SET
  extended_description = 'Konstruktion av geometriska objekt (åk 4-6) - rita med passare och linjal enligt instruktioner. Eleven ska VISA sin konstruktion och kunna förklara stegen.',
  requires_work_shown = 1,
  example_problems = '["Konstruera en liksidig triangel", "Rita en cirkel och en tangent", "Konstruera en vinkelrät linje"]',
  key_concepts = '["passare", "linjal", "konstruktion", "precision"]'
WHERE code = 'MA-GEO-06';

UPDATE curriculum_objectives SET
  extended_description = 'Metoder för att bestämma omkrets och area - BERÄKNA area (längd × bredd) och omkrets (summa av sidor) för olika figurer. Eleven ska VISA formler och mellansteg i beräkningarna.',
  requires_work_shown = 1,
  example_problems = '["Beräkna arean av en rektangel 5 cm × 3 cm och visa hur du räknar", "Vilken omkrets har en kvadrat med sidan 7 m?", "Förklara hur du räknar ut arean av en triangel"]',
  key_concepts = '["area", "omkrets", "formel", "visa beräkning"]'
WHERE code = 'MA-GEO-07';

UPDATE curriculum_objectives SET
  extended_description = 'Skala och dess användning - förstå kartskala, förstora/förminska (1:100 betyder 1 cm = 100 cm på riktigt). Eleven ska kunna tolka och använda skala praktiskt.',
  requires_work_shown = 0,
  example_problems = '["Om skalan är 1:50, hur långt är 3 cm på ritningen i verkligheten?", "Rita ett rum i skala 1:100", "Kartan har skala 1:10000. Hur långt är 5 cm?"]',
  key_concepts = '["skala", "förstoring", "förminskning", "proportioner"]'
WHERE code = 'MA-GEO-08';

UPDATE curriculum_objectives SET
  extended_description = 'Geometriska objekt och egenskaper (åk 7-9) - vinklar, parallella linjer, regelbundna polygoner och deras egenskaper. Fördjupad analys av geometriska samband.',
  requires_work_shown = 0,
  example_problems = '["Vilka vinklar är lika vid parallella linjer?", "Beskriv egenskaperna hos en reguljär femhörning", "Vad är vertikalvinklar?"]',
  key_concepts = '["vinklar", "parallella linjer", "polygon", "vertikalvinklar"]'
WHERE code = 'MA-GEO-09';

UPDATE curriculum_objectives SET
  extended_description = 'Avbildning och konstruktion (åk 7-9) - spegling, rotation, förflyttning av figurer samt mer avancerade konstruktioner. Eleven ska kunna UTFÖRA och BESKRIVA transformationer.',
  requires_work_shown = 1,
  example_problems = '["Spegla triangeln i linjen", "Rotera figuren 90° medurs", "Konstruera mittpunktsnormalen till en sträcka"]',
  key_concepts = '["spegling", "rotation", "förflyttning", "konstruktion"]'
WHERE code = 'MA-GEO-10';

UPDATE curriculum_objectives SET
  extended_description = 'Likformighet och symmetri - förstå att likformiga figurer har samma form men olika storlek, och utforska olika typer av symmetri.',
  requires_work_shown = 0,
  example_problems = '["Är dessa trianglar likformiga?", "Vilken förstoring har skett?", "Har figuren rotationssymmetri?"]',
  key_concepts = '["likformighet", "förstoring", "skalförhållande", "symmetri"]'
WHERE code = 'MA-GEO-11';

UPDATE curriculum_objectives SET
  extended_description = 'Metoder för beräkning av area, omkrets och volym (åk 7-9) - beräkna volym av lådor, cylindrar; area av sammansatta figurer. Eleven ska VISA alla beräkningssteg och formler.',
  requires_work_shown = 1,
  example_problems = '["Beräkna volymen av en cylinder med radie 3 cm och höjd 10 cm", "Räkna ut arean av en sammansatt figur", "Visa hur du räknar ut mantelarean på en kon"]',
  key_concepts = '["volym", "mantelarea", "cylinder", "sammansatt figur"]'
WHERE code = 'MA-GEO-12';

UPDATE curriculum_objectives SET
  extended_description = 'Pythagoras sats och triangelns vinkelsumma - använda a² + b² = c² för rätvinkliga trianglar och förstå att summan av vinklarna i en triangel alltid är 180°.',
  requires_work_shown = 1,
  example_problems = '["Beräkna hypotenusan om kateterna är 3 och 4", "En triangel har vinklarna 60° och 70°. Hur stor är tredje vinkeln?", "Är triangeln med sidorna 5, 12, 13 rätvinklig?"]',
  key_concepts = '["Pythagoras sats", "vinkelsumma", "hypotenusa", "katet"]'
WHERE code = 'MA-GEO-13';

-- =============================================
-- MATEMATIK: SANNOLIKHET OCH STATISTIK (MA-SAN)
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Slumphändelser i experiment och spel - förstå slump i tärningskast, kortdragning och myntkast. Eleven ska utveckla förståelse för att vissa händelser är slumpmässiga.',
  requires_work_shown = 0,
  example_problems = '["Vad kan hända när du kastar en tärning?", "Är det slump att det regnar?", "Vad betyder det att något är slumpmässigt?"]',
  key_concepts = '["slump", "möjliga utfall", "händelse", "experiment"]'
WHERE code = 'MA-SAN-01';

UPDATE curriculum_objectives SET
  extended_description = 'Enkla tabeller och diagram - läsa av och skapa enkla stapeldiagram och tabeller för att visa information.',
  requires_work_shown = 0,
  example_problems = '["Hur många gillar glass enligt diagrammet?", "Gör en tabell över klassens husdjur", "Vilket är vanligast enligt stapeldiagrammet?"]',
  key_concepts = '["tabell", "stapeldiagram", "avläsa", "redovisa"]'
WHERE code = 'MA-SAN-02';

UPDATE curriculum_objectives SET
  extended_description = 'Sannolikhet och chans - uttrycka hur troligt något är med ord (omöjligt, osannolikt, troligt, säkert) och enkla jämförelser.',
  requires_work_shown = 0,
  example_problems = '["Är det troligt eller osannolikt att det snöar i juli?", "Vilken färg är mest trolig att få på snurran?", "Kan det vara omöjligt att slå en 7:a på en vanlig tärning?"]',
  key_concepts = '["troligt", "osannolikt", "omöjligt", "säkert"]'
WHERE code = 'MA-SAN-03';

UPDATE curriculum_objectives SET
  extended_description = 'Enkel kombinatorik - räkna ANTAL KOMBINATIONER eller möjligheter systematiskt (3 tröjor × 4 byxor = 12 kombinationer). ENDAST för uppgifter som frågar "hur många sätt/kombinationer?".',
  requires_work_shown = 0,
  example_problems = '["Hur många outfits kan du göra med 3 tröjor och 2 byxor?", "På hur många sätt kan 3 personer stå i rad?", "Hur många tvåsiffriga tal kan du bilda med siffrorna 1, 2, 3?"]',
  key_concepts = '["kombinationer", "möjligheter", "multiplikationsprincipen", "systematisk"]'
WHERE code = 'MA-SAN-04';

UPDATE curriculum_objectives SET
  extended_description = 'Tabeller och diagram för att beskriva resultat - skapa och tolka diagram för att redovisa data från undersökningar och experiment.',
  requires_work_shown = 0,
  example_problems = '["Gör ett diagram av resultaten från enkäten", "Vilken slutsats kan du dra från tabellen?", "Vilket diagram passar bäst för denna data?"]',
  key_concepts = '["stapeldiagram", "cirkeldiagram", "tabell", "redovisa"]'
WHERE code = 'MA-SAN-05';

UPDATE curriculum_objectives SET
  extended_description = 'Lägesmått - beräkna och tolka medelvärde, median och typvärde. Eleven ska förstå vad dessa mått säger om en datamängd.',
  requires_work_shown = 0,
  example_problems = '["Vad är medelvärdet av 3, 5, 7, 9?", "Hitta medianen i 2, 8, 4, 6, 10", "Vilket är typvärdet om data är: 5, 3, 5, 7, 5, 2?"]',
  key_concepts = '["medelvärde", "median", "typvärde", "lägesmått"]'
WHERE code = 'MA-SAN-06';

UPDATE curriculum_objectives SET
  extended_description = 'Likformig sannolikhet och metoder för beräkning - beräkna sannolikhet som P(händelse) = gynnsamma utfall / möjliga utfall. Eleven ska VISA beräkningen och förklara resonemanget.',
  requires_work_shown = 1,
  example_problems = '["Vad är sannolikheten att slå en sexa?", "Beräkna P(röd kula) om det finns 3 röda och 7 blå", "Visa hur du räknar sannolikheten att dra ett hjärter-ess"]',
  key_concepts = '["sannolikhet", "gynnsamma utfall", "möjliga utfall", "kvot"]'
WHERE code = 'MA-SAN-07';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerad kombinatorik - permutationer och kombinationer, systematiska räknemetoder för mer komplexa situationer.',
  requires_work_shown = 0,
  example_problems = '["På hur många sätt kan 5 personer sitta i rad?", "Hur många handskakningar blir det om 10 personer skakar hand?", "Beräkna C(6,2)"]',
  key_concepts = '["permutation", "kombination", "fakultet", "binomialkoefficient"]'
WHERE code = 'MA-SAN-08';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerade diagram - linjediagram, cirkeldiagram, histogram och deras användningsområden. Eleven ska kunna välja rätt diagramtyp för olika data.',
  requires_work_shown = 0,
  example_problems = '["När passar ett linjediagram bäst?", "Gör ett histogram av längderna", "Tolka cirkeldiagrammet"]',
  key_concepts = '["linjediagram", "cirkeldiagram", "histogram", "datapresentation"]'
WHERE code = 'MA-SAN-09';

UPDATE curriculum_objectives SET
  extended_description = 'Spridningsmått - variationsbredd, kvartilavstånd och standardavvikelse för att beskriva hur spridd data är.',
  requires_work_shown = 0,
  example_problems = '["Beräkna variationsbredden", "Vad säger standardavvikelsen om data?", "Jämför spridningen i två datamängder"]',
  key_concepts = '["variationsbredd", "standardavvikelse", "spridning", "kvartil"]'
WHERE code = 'MA-SAN-10';

UPDATE curriculum_objectives SET
  extended_description = 'Bedömning av risker och chanser - tillämpa sannolikhet för att bedöma risker och chanser i verkliga situationer kritiskt.',
  requires_work_shown = 0,
  example_problems = '["Är det värt att spela på lotteriet?", "Bedöm risken med detta val", "Hur kan du använda sannolikhet för att fatta beslut?"]',
  key_concepts = '["risk", "chans", "beslutsfattande", "kritisk granskning"]'
WHERE code = 'MA-SAN-11';

-- =============================================
-- MATEMATIK: SAMBAND OCH FÖRÄNDRING (MA-SAM)
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Proportionalitet och procent - förstå att dubbelt så mycket kostar dubbelt så mycket, och enkla procentsamband. Grundläggande förståelse för hur storhetar hänger ihop.',
  requires_work_shown = 0,
  example_problems = '["Om 3 äpplen kostar 15 kr, vad kostar 6 äpplen?", "Hur mycket är 10% av 200?", "Är sambandet proportionellt?"]',
  key_concepts = '["proportionalitet", "dubbelt", "hälften", "procent"]'
WHERE code = 'MA-SAM-01';

UPDATE curriculum_objectives SET
  extended_description = 'Grafer för proportionella samband - förstå att proportionella samband visas som räta linjer genom origo. Eleven ska kunna koppla ihop tabell, formel och graf.',
  requires_work_shown = 0,
  example_problems = '["Rita grafen för y = 2x", "Går linjen genom origo? Är sambandet proportionellt?", "Läs av y när x = 4 i grafen"]',
  key_concepts = '["graf", "rät linje", "origo", "proportionell"]'
WHERE code = 'MA-SAM-02';

UPDATE curriculum_objectives SET
  extended_description = 'Koordinatsystem och gradering av axlar - placera punkter med (x, y)-koordinater och förstå hur axlarna graderas.',
  requires_work_shown = 0,
  example_problems = '["Placera punkten (3, 5) i koordinatsystemet", "Vilka koordinater har punkten?", "Rita ett koordinatsystem med lämplig gradering"]',
  key_concepts = '["koordinater", "x-axel", "y-axel", "punkt"]'
WHERE code = 'MA-SAM-03';

UPDATE curriculum_objectives SET
  extended_description = 'Funktioner och linjära ekvationer - förstå funktionsbegreppet där y = 2x + 3 ger en output för varje input. Eleven ska kunna tolka och använda funktioner.',
  requires_work_shown = 0,
  example_problems = '["Om f(x) = 2x + 1, vad är f(3)?", "Rita grafen för y = x + 2", "Beskriv sambandet med en formel"]',
  key_concepts = '["funktion", "input", "output", "graf"]'
WHERE code = 'MA-SAM-04';

UPDATE curriculum_objectives SET
  extended_description = 'Funktioners användning - modellera verkliga samband med funktioner, t.ex. kostnad beroende på antal, tid beroende på sträcka.',
  requires_work_shown = 0,
  example_problems = '["Skriv en funktion för kostnaden om varje enhet kostar 25 kr", "Tolka grafen: hur lång tid tar 50 km?", "Vilken funktion beskriver sambandet i tabellen?"]',
  key_concepts = '["modellering", "samband", "verkligt problem", "funktion"]'
WHERE code = 'MA-SAM-05';

UPDATE curriculum_objectives SET
  extended_description = 'Linjära funktioner och ekvationssystem - räta linjens ekvation y = kx + m, k-värde (lutning) och m-värde (skärning med y-axeln).',
  requires_work_shown = 0,
  example_problems = '["Vad är k och m i y = 3x + 2?", "Skriv ekvationen för linjen genom (0, 4) med lutning 2", "Rita y = -x + 5"]',
  key_concepts = '["k-värde", "m-värde", "lutning", "skärningspunkt"]'
WHERE code = 'MA-SAM-06';

UPDATE curriculum_objectives SET
  extended_description = 'Procentuell förändring - beräkna ökning och minskning i procent, förändringar faktor och upprepade förändringar.',
  requires_work_shown = 0,
  example_problems = '["Priset ökade från 200 till 250 kr. Hur många procent?", "Vad blir 800 kr efter 20% rabatt?", "Beräkna förändringsfaktorn"]',
  key_concepts = '["procentuell förändring", "förändringsfaktor", "ökning", "minskning"]'
WHERE code = 'MA-SAM-07';

-- =============================================
-- MATEMATIK: PROBLEMLÖSNING (MA-PRO)
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Problemlösning i vardagliga situationer (åk 1-3) - enkla problem från vardagen som kräver matematiskt tänkande. Eleven ska utveckla strategier för att angripa problem.',
  requires_work_shown = 0,
  example_problems = '["Lisa har 5 äpplen och får 3 till. Hur många har hon nu?", "Det finns 10 bollar. 4 är röda. Hur många är inte röda?", "Hur kan du dela 12 kakor lika mellan 3 barn?"]',
  key_concepts = '["vardagsproblem", "strategi", "fundera", "tänka"]'
WHERE code = 'MA-PRO-01';

UPDATE curriculum_objectives SET
  extended_description = 'Matematisk formulering av frågeställningar (åk 1-3) - skapa egna matematiska frågor utifrån situationer och bilder.',
  requires_work_shown = 0,
  example_problems = '["Titta på bilden och skriv en matematikfråga", "Gör ett eget räknetal med svaret 10", "Vilken fråga passar till uträkningen 5 + 3?"]',
  key_concepts = '["formulera", "egen fråga", "matematisk situation"]'
WHERE code = 'MA-PRO-02';

UPDATE curriculum_objectives SET
  extended_description = 'Strategier för problemlösning med addition och subtraktion (åk 1-3) - textuppgifter som löses med + eller -. Eleven ska kunna VISA sin strategi och förklara sitt tillvägagångssätt.',
  requires_work_shown = 1,
  example_problems = '["Emma hade 12 kr och köpte godis för 5 kr. Hur mycket har hon kvar? Visa hur du tänker.", "Det sitter 8 fåglar i trädet. 3 flyger iväg. Hur många är kvar? Rita och visa.", "Förklara hur du löste uppgiften"]',
  key_concepts = '["strategi", "addition", "subtraktion", "visa lösning"]'
WHERE code = 'MA-PRO-03';

UPDATE curriculum_objectives SET
  extended_description = 'Problemlösning i vardagsnära situationer (åk 4-6) - mer komplexa vardagsproblem som kan kräva flera steg eller olika räknesätt.',
  requires_work_shown = 0,
  example_problems = '["En buss tar 45 passagerare. Hur många bussar behövs för 200 personer?", "Klassen ska åka på utflykt. Räkna ut totalkostnaden.", "Planera inköpslistan för att hålla budgeten"]',
  key_concepts = '["vardagsproblem", "flera steg", "planering", "strategi"]'
WHERE code = 'MA-PRO-04';

UPDATE curriculum_objectives SET
  extended_description = 'Formulering av frågeställningar med hjälp av matematik (åk 4-6) - skapa matematiska modeller och frågor för att undersöka och lösa problem.',
  requires_work_shown = 0,
  example_problems = '["Skriv en egen uppgift om procent", "Vilka matematiska frågor kan du ställa om skolans schema?", "Formulera ett problem som löses med ekvation"]',
  key_concepts = '["formulera", "modellera", "matematisk fråga"]'
WHERE code = 'MA-PRO-05';

UPDATE curriculum_objectives SET
  extended_description = 'Strategier för problemlösning med de fyra räknesätten (åk 4-6) - textuppgifter som kräver val av räknesätt och strategi. Eleven ska VISA sin lösningsprocess och kunna förklara varför metoden fungerar.',
  requires_work_shown = 1,
  example_problems = '["3 vänner delar lika på 156 kr. Hur mycket får var och en? Visa din beräkning.", "En bok kostar 85 kr. Hur mycket kostar 7 böcker? Förklara hur du räknade.", "Välj rätt räknesätt och lös: En butik har 240 äpplen fördelade i lådor med 15 i varje..."]',
  key_concepts = '["fyra räknesätt", "strategi", "visa lösning", "förklara metod"]'
WHERE code = 'MA-PRO-06';

UPDATE curriculum_objectives SET
  extended_description = 'Strategier för problemlösning i vardags- och yrkessituationer (åk 7-9) - komplexa verkliga problem som kräver matematisk modellering. Eleven ska kunna BESKRIVA och MOTIVERA sina strategier.',
  requires_work_shown = 1,
  example_problems = '["Planera en resa inom budget och visa beräkningarna", "Beräkna hur mycket färg som behövs för rummet", "Jämför mobilabonnemang och motivera ditt val"]',
  key_concepts = '["modellering", "strategi", "motivera", "verkliga problem"]'
WHERE code = 'MA-PRO-07';

UPDATE curriculum_objectives SET
  extended_description = 'Formulering av frågeställningar med matematiska modeller (åk 7-9) - skapa matematiska modeller för komplexa situationer och formulera lämpliga frågeställningar.',
  requires_work_shown = 0,
  example_problems = '["Skapa en matematisk modell för befolkningstillväxt", "Formulera frågor om exponentiell tillväxt", "Vilken matematisk modell passar för detta samband?"]',
  key_concepts = '["matematisk modell", "formulera", "samband", "generalisera"]'
WHERE code = 'MA-PRO-08';

UPDATE curriculum_objectives SET
  extended_description = 'Strategier för matematisk problemlösning och resonemangsförmåga (åk 7-9) - avancerad problemlösning med krav på logiskt resonemang, argumentation och bevisföring. Eleven ska REDOVISA sitt resonemang.',
  requires_work_shown = 1,
  example_problems = '["Bevisa att summan av tre på varandra följande heltal alltid är delbar med 3", "Resonera dig fram till lösningen och motivera varje steg", "Formulera ett matematiskt bevis"]',
  key_concepts = '["resonemang", "bevis", "argumentation", "logik"]'
WHERE code = 'MA-PRO-09';

-- =============================================
-- SVENSKA: LÄSFÖRSTÅELSE (SV)
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Eleven ska kunna hitta och återge explicit information i texten. Detta inkluderar att identifiera fakta, detaljer, namn, platser, händelser och annan information som står direkt utskriven i texten. Grundläggande för all läsförståelse.',
  requires_work_shown = 0,
  example_problems = '["Vad heter huvudpersonen?", "Var utspelar sig berättelsen?", "Vad händer först i kapitlet?"]',
  key_concepts = '["explicita svar", "fakta", "detaljer", "återberätta"]'
WHERE code = 'SV-LITERAL';

UPDATE curriculum_objectives SET
  extended_description = 'Eleven ska kunna läsa mellan raderna och dra slutsatser utifrån ledtrådar i texten. Detta innebär att kombinera information från olika delar av texten med egen förkunskap för att förstå saker som inte sägs rakt ut.',
  requires_work_shown = 0,
  example_problems = '["Varför tror du att karaktären gjorde så?", "Vad kommer att hända härnäst?", "Hur vet du det?"]',
  key_concepts = '["inferens", "slutledning", "ledtrådar", "läsa mellan raderna"]'
WHERE code = 'SV-INFERENCE';

UPDATE curriculum_objectives SET
  extended_description = 'Eleven ska kunna identifiera textens övergripande budskap, tema eller huvudpoäng. Detta kräver förmåga att sammanfatta och urskilja vad som är viktigast i texten från mindre viktiga detaljer.',
  requires_work_shown = 0,
  example_problems = '["Vad handlar texten om?", "Vad är det viktigaste budskapet?", "Vad vill författaren säga?"]',
  key_concepts = '["huvudtanke", "tema", "budskap", "sammanfatta"]'
WHERE code = 'SV-MAIN-IDEA';

UPDATE curriculum_objectives SET
  extended_description = 'Eleven ska kunna analysera karaktärers egenskaper, känslor, handlingar och motiv. Inkluderar att förstå varför karaktärer agerar som de gör och hur de utvecklas genom berättelsen.',
  requires_work_shown = 0,
  example_problems = '["Hur känner sig karaktären?", "Varför gör karaktären så?", "Hur förändras karaktären?"]',
  key_concepts = '["karaktärsanalys", "motiv", "känslor", "utveckling"]'
WHERE code = 'SV-CHARACTER';

UPDATE curriculum_objectives SET
  extended_description = 'Eleven ska kunna använda sammanhanget (kontext) för att förstå okända ord och begrepp. Inkluderar ledtrådar från meningsbyggnad, omgivande text och bildspråk för att härleda betydelse.',
  requires_work_shown = 0,
  example_problems = '["Vad betyder ordet X i denna mening?", "Vilket ord passar bäst istället för Y?"]',
  key_concepts = '["ordförståelse", "kontext", "synonymer", "ledtrådar"]'
WHERE code = 'SV-VOCABULARY';
