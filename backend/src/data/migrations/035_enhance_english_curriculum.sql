-- Migration 035: Enhance LGR22 English curriculum objectives
-- Adds new categories aligned with LGR22 structure and comprehensive extended descriptions
-- Categories: Listening (LIS), Reading (REA), Speaking (SPE), Writing (WRI), plus existing VOC, GRM, CMP, TRN

-- =============================================
-- Step 1: Add new English categories
-- =============================================

INSERT OR IGNORE INTO math_categories (id, name_sv, name_en, min_grade, max_grade) VALUES
    ('english-listening', 'Engelska - Lyssna', 'English - Listening', 1, 9),
    ('english-reading', 'Engelska - Läsa', 'English - Reading', 1, 9),
    ('english-speaking', 'Engelska - Tala', 'English - Speaking', 1, 9),
    ('english-writing', 'Engelska - Skriva', 'English - Writing', 1, 9),
    ('english-culture', 'Engelska - Kultur', 'English - Culture', 1, 9),
    ('english-strategies', 'Engelska - Strategier', 'English - Strategies', 1, 9);

-- =============================================
-- Step 2: Add new curriculum objectives
-- =============================================

-- Listening objectives (EN-LIS)
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('english-listening', 'EN-LIS-01', 'Lyssna på enkla instruktioner och vanliga ord', '["1","2","3"]'),
    ('english-listening', 'EN-LIS-02', 'Lyssna på dialoger, berättelser och beskrivningar', '["4","5","6"]'),
    ('english-listening', 'EN-LIS-03', 'Lyssna på varierad engelska med olika accenter', '["7","8","9"]');

-- Reading objectives (EN-REA)
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('english-reading', 'EN-REA-01', 'Läsa enkla ord och korta fraser', '["1","2","3"]'),
    ('english-reading', 'EN-REA-02', 'Läsa korta texter och berättelser', '["4","5","6"]'),
    ('english-reading', 'EN-REA-03', 'Läsa längre texter, artiklar och skönlitteratur', '["7","8","9"]');

-- Speaking objectives (EN-SPE)
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('english-speaking', 'EN-SPE-01', 'Enkla muntliga fraser och presentationer', '["1","2","3"]'),
    ('english-speaking', 'EN-SPE-02', 'Samtal och muntliga beskrivningar', '["4","5","6"]'),
    ('english-speaking', 'EN-SPE-03', 'Avancerade diskussioner och argumentation', '["7","8","9"]');

-- Writing objectives (EN-WRI)
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('english-writing', 'EN-WRI-01', 'Skriva enkla ord och korta meningar', '["1","2","3"]'),
    ('english-writing', 'EN-WRI-02', 'Skriva korta texter och meddelanden', '["4","5","6"]'),
    ('english-writing', 'EN-WRI-03', 'Skriva längre texter med variation och struktur', '["7","8","9"]');

-- Culture objectives (EN-CUL)
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('english-culture', 'EN-CUL-01', 'Vardagsliv i engelskspråkiga länder', '["1","2","3"]'),
    ('english-culture', 'EN-CUL-02', 'Traditioner och levnadsvillkor i engelskspråkiga länder', '["4","5","6"]'),
    ('english-culture', 'EN-CUL-03', 'Samhällsfrågor och kulturella perspektiv', '["7","8","9"]');

-- Strategies objectives (EN-STR)
INSERT OR IGNORE INTO curriculum_objectives (category_id, code, description, grade_levels) VALUES
    ('english-strategies', 'EN-STR-01', 'Enkla strategier för att förstå och göra sig förstådd', '["1","2","3"]'),
    ('english-strategies', 'EN-STR-02', 'Strategier för språkinlärning och kommunikation', '["4","5","6"]'),
    ('english-strategies', 'EN-STR-03', 'Avancerade strategier för språkanvändning', '["7","8","9"]');

-- =============================================
-- Step 3: Add extended descriptions for ALL English codes
-- =============================================

-- LISTENING (EN-LIS) - Lyssna och förstå
UPDATE curriculum_objectives SET
  extended_description = 'Hörförståelse av enkla instruktioner och vanliga ord - eleven ska kunna förstå korta, tydligt talade instruktioner på engelska, t.ex. "stand up", "sit down", "open your book". Fokus på vardagliga ord som eleven möter i klassrummet och i enkla filmer/sånger. Eleven behöver inte producera språket, endast visa förståelse genom handling eller val.',
  example_problems = '["Lyssna och gör rätt: Stand up!", "Vilken bild visar en dog?", "Lyssna på sången - vad handlar den om?"]',
  key_concepts = '["instruktioner", "klassrumsord", "vardagsord", "lyssna aktivt"]'
WHERE code = 'EN-LIS-01';

UPDATE curriculum_objectives SET
  extended_description = 'Hörförståelse av dialoger, berättelser och beskrivningar - eleven ska kunna förstå huvudinnehållet i tydligt talade dialoger och korta berättelser på engelska. Inkluderar att förstå enkla instruktioner i flera steg, korta nyhetsklipp för barn, och dialoger i pedagogiska filmer. Eleven ska kunna återberätta huvuddragen.',
  example_problems = '["Lyssna på dialogen - vad pratar de om?", "Vad händer i berättelsen?", "Vilken ordning gör de sakerna?"]',
  key_concepts = '["dialog", "berättelse", "huvudinnehåll", "följdordning"]'
WHERE code = 'EN-LIS-02';

UPDATE curriculum_objectives SET
  extended_description = 'Hörförståelse av varierad engelska med olika accenter och talare - eleven ska kunna förstå talad engelska från olika engelskspråkiga länder (brittisk, amerikansk, australisk). Inkluderar nyheter, podcasts, filmer utan undertext, och samtal i naturligt tempo. Eleven ska kunna skilja ut detaljer och nyanser.',
  example_problems = '["Lyssna på nyhetsklippet - vad är huvudnyheten?", "Vilken accent talar personen med?", "Vilka argument framför talaren?"]',
  key_concepts = '["accenter", "naturligt tempo", "nyanser", "källkritik"]'
WHERE code = 'EN-LIS-03';

-- READING (EN-REA) - Läsa och förstå
UPDATE curriculum_objectives SET
  extended_description = 'Läsförståelse av enkla ord och korta fraser - eleven ska kunna läsa och förstå vanliga engelska ord och korta meningar. Fokus på ord som eleven känner igen från tal (cat, dog, hello, my name is). Eleven ska kunna koppla skriven text till bilder och förstå enkla skyltar och etiketter.',
  example_problems = '["Läs ordet och peka på rätt bild", "Vad står det på skylten?", "Para ihop ordet med bilden"]',
  key_concepts = '["ordbilder", "enkla ord", "bild-text", "skyltar"]'
WHERE code = 'EN-REA-01';

UPDATE curriculum_objectives SET
  extended_description = 'Läsförståelse av korta texter och berättelser - eleven ska kunna läsa och förstå korta engelska texter om bekanta ämnen (familj, skola, hobbyer). Inkluderar enkla berättelser, brev, e-post och faktatexter för barn. Eleven ska kunna hitta information, förstå huvudinnehållet och svara på frågor om texten.',
  example_problems = '["Läs texten - vad gillar huvudpersonen?", "Hitta tre fakta om djuret i texten", "Vad händer i slutet av berättelsen?"]',
  key_concepts = '["huvudinnehåll", "hitta information", "bekanta ämnen", "textfrågor"]'
WHERE code = 'EN-REA-02';

UPDATE curriculum_objectives SET
  extended_description = 'Läsförståelse av längre texter, artiklar och skönlitteratur - eleven ska kunna läsa och förstå mer komplexa engelska texter med okända ord. Inkluderar ungdomslitteratur, tidningsartiklar, instruktioner och webbtexter. Eleven ska kunna analysera textens syfte, dra slutsatser och värdera innehållet kritiskt.',
  example_problems = '["Läs artikeln - vad är författarens åsikt?", "Vilka argument framförs i texten?", "Jämför de två texternas perspektiv"]',
  key_concepts = '["textanalys", "kritisk läsning", "okända ord", "författarens syfte"]'
WHERE code = 'EN-REA-03';

-- SPEAKING (EN-SPE) - Tala och samtala
UPDATE curriculum_objectives SET
  extended_description = 'Enkel muntlig produktion - eleven ska kunna säga enkla fraser, presentera sig själv och delta i enkla samtal om välbekanta ämnen. Fokus på att våga använda språket i klassrummet: hälsa, tacka, be om saker, berätta om sig själv. Uttal behöver inte vara perfekt, fokus är på kommunikation.',
  example_problems = '["Presentera dig själv på engelska", "Berätta vad du gillar", "Fråga en kompis vad hen heter"]',
  key_concepts = '["presentation", "hälsningsfraser", "våga tala", "enkel dialog"]'
WHERE code = 'EN-SPE-01';

UPDATE curriculum_objectives SET
  extended_description = 'Muntliga samtal och beskrivningar - eleven ska kunna föra enkla samtal, ställa följdfrågor och beskriva saker muntligt. Inkluderar att berätta om upplevelser, beskriva bilder, och delta i rollspel. Eleven ska kunna anpassa sitt språk till mottagaren och situationen.',
  example_problems = '["Beskriv bilden för din partner", "Berätta om din senaste semester", "Diskutera med en klasskamrat: vilken sport är bäst?"]',
  key_concepts = '["samtal", "beskrivning", "följdfrågor", "rollspel"]'
WHERE code = 'EN-SPE-02';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerade diskussioner och argumentation - eleven ska kunna delta i diskussioner, framföra och bemöta argument, och hålla muntliga presentationer. Inkluderar debatter, förhandlingar och formella presentationer. Eleven ska kunna variera sitt språk efter syfte och mottagare.',
  example_problems = '["Håll en presentation om ett ämne du valt", "Delta i en debatt: för eller emot sociala medier?", "Förklara och försvara din åsikt"]',
  key_concepts = '["argumentation", "presentation", "debatt", "formellt/informellt"]'
WHERE code = 'EN-SPE-03';

-- WRITING (EN-WRI) - Skriva
UPDATE curriculum_objectives SET
  extended_description = 'Skriftlig produktion av enkla ord och korta meningar - eleven ska kunna skriva vanliga engelska ord och enkla meningar. Fokus på att kopiera och skriva av bekanta ord, skriva korta meddelanden och svara på enkla frågor skriftligt. Stavning och grammatik behöver inte vara perfekt.',
  example_problems = '["Skriv tre saker du gillar", "Skriv ett kort meddelande till en vän", "Fyll i luckorna med rätt ord"]',
  key_concepts = '["skriva ord", "enkla meningar", "meddelande", "luckor"]'
WHERE code = 'EN-WRI-01';

UPDATE curriculum_objectives SET
  extended_description = 'Skriftlig produktion av korta texter och meddelanden - eleven ska kunna skriva sammanhängande korta texter på engelska. Inkluderar brev, e-post, berättelser och faktatexter. Eleven ska kunna använda grundläggande struktur (inledning, innehåll, avslutning) och variera ordförrådet.',
  example_problems = '["Skriv ett brev till en penvän", "Skriv en kort berättelse", "Skriv en faktatext om ett djur"]',
  key_concepts = '["sammanhängande text", "struktur", "brev", "berättelse"]'
WHERE code = 'EN-WRI-02';

UPDATE curriculum_objectives SET
  extended_description = 'Skriftlig produktion av längre texter med variation och struktur - eleven ska kunna skriva längre, välstrukturerade texter för olika syften. Inkluderar argumenterande texter, rapporter, recensioner och kreativt skrivande. Eleven ska behärska styckeindelning, sambandsord och anpassa stil efter syfte.',
  example_problems = '["Skriv en argumenterande text om miljön", "Skriv en recension av en bok/film", "Skriv en rapport om ett samhällsproblem"]',
  key_concepts = '["argumentation", "struktur", "stil", "sambandsord"]'
WHERE code = 'EN-WRI-03';

-- VOCABULARY (EN-VOC) - Ordförråd (befintliga koder, nya beskrivningar)
UPDATE curriculum_objectives SET
  extended_description = 'Grundläggande ordförråd - vardagsord och enkla fraser på engelska. Eleven ska kunna förstå och använda vanliga ord om kroppen, färger, siffror, familj, djur och vardagliga föremål. Fokus på ord som eleven möter i klassrummet, sånger och enkla filmer. Eleven ska kunna koppla ord till bilder och använda dem i enkla sammanhang.',
  example_problems = '["Vad heter färgen på engelska?", "Para ihop ordet med bilden", "Vilka djur kan du säga på engelska?"]',
  key_concepts = '["vardagsord", "färger", "siffror", "djur", "familj"]'
WHERE code = 'EN-VOC-01';

UPDATE curriculum_objectives SET
  extended_description = 'Utökat ordförråd - ord och fraser om skola, familj, fritid och intressen. Eleven ska kunna förstå och använda ord för att beskriva sin vardag, sina intressen och sina upplevelser. Inkluderar ämnesspecifika ord från skolämnen, hobbyer och samhälle. Eleven ska börja förstå ordbildning (förstavelser, ändelser).',
  example_problems = '["Beskriv din hobby med minst 5 engelska ord", "Vad betyder ordet unhappy?", "Vilka skolämnen kan du på engelska?"]',
  key_concepts = '["skola", "fritid", "intressen", "ordbildning"]'
WHERE code = 'EN-VOC-02';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerat ordförråd och idiom - eleven ska kunna förstå och använda ett rikt ordförråd inklusive idiom, fasta uttryck och nyanserade ord. Inkluderar akademiskt språk, bildspråk och uttryck som är specifika för engelskspråkiga kulturer. Eleven ska kunna välja rätt ord för sammanhanget och förstå stilnivåer.',
  example_problems = '["Vad betyder idiomet \"it is raining cats and dogs\"?", "Välj det mest passande ordet för sammanhanget", "Förklara skillnaden mellan big, large och huge"]',
  key_concepts = '["idiom", "bildspråk", "stilnivåer", "nyanser"]'
WHERE code = 'EN-VOC-03';

-- GRAMMAR (EN-GRM) - Grammatik (befintliga koder, nya beskrivningar)
UPDATE curriculum_objectives SET
  extended_description = 'Grundläggande grammatik - enkla meningar och frågor på engelska. Eleven ska förstå enkel meningsbyggnad (subjekt + verb + objekt), kunna bilda enkla påståenden och ja/nej-frågor. Fokus på presens och vanliga verb som "be", "have", "like". Eleven ska kunna använda personliga pronomen och enkla prepositioner.',
  example_problems = '["Gör om till en fråga: She likes ice cream", "Fyll i rätt form: I ___ (be) happy", "Välj rätt: He/She like/likes dogs"]',
  key_concepts = '["meningsbyggnad", "presens", "frågor", "pronomen"]'
WHERE code = 'EN-GRM-01';

UPDATE curriculum_objectives SET
  extended_description = 'Utvecklad grammatik - verbformer, adjektiv och prepositioner. Eleven ska behärska olika tempus (presens, preteritum, futurum), oregelbundna verb, adjektivets komparation och vanliga prepositioner. Inkluderar sammandragningar (I am → I´m) och grundläggande ordföljd i olika satstyper.',
  example_problems = '["Skriv verbet i rätt form: Yesterday I ___ (go) to school", "Jämför: big, bigger, ___", "Välj rätt preposition: The book is ___ the table"]',
  key_concepts = '["tempus", "oregelbundna verb", "komparation", "prepositioner"]'
WHERE code = 'EN-GRM-02';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerad grammatik och satsbyggnad - komplex meningsbyggnad med bisatser, passiv form, konditionalis och rapporterat tal. Eleven ska kunna variera sin meningsbyggnad, använda sambandsord och behärska mer avancerade grammatiska strukturer för att uttrycka nyanser och relationer mellan idéer.',
  example_problems = '["Skriv om till passiv form", "Kombinera meningarna med ett sambandsord", "Rapporterat tal: He said, \"I am tired\" → He said that..."]',
  key_concepts = '["bisatser", "passiv", "konditionalis", "rapporterat tal"]'
WHERE code = 'EN-GRM-03';

-- COMPREHENSION (EN-CMP) - Läsförståelse (befintliga koder, nya beskrivningar)
UPDATE curriculum_objectives SET
  extended_description = 'Enkel textförståelse - kunna läsa och förstå korta engelska texter om välbekanta ämnen. Eleven ska kunna hitta specifik information och förstå huvudbudskapet i enkla texter, instruktioner och meddelanden. Fokus på texter med bekanta ord och tydlig struktur. Eleven ska kunna svara på enkla frågor om texten.',
  example_problems = '["Vad handlar texten om?", "Hitta svaret i texten: Vad gillar Sara?", "Är meningen sann eller falsk enligt texten?"]',
  key_concepts = '["hitta information", "huvudbudskap", "bekanta ämnen", "sant/falskt"]'
WHERE code = 'EN-CMP-01';

UPDATE curriculum_objectives SET
  extended_description = 'Läsförståelse av berättelser och faktatexter - eleven ska kunna läsa och förstå olika typer av texter för barn och ungdomar. Inkluderar att förstå händelseförlopp i berättelser, hitta fakta i informationstexter, och förstå instruktioner. Eleven ska kunna dra enkla slutsatser och svara på frågor som kräver viss tolkning.',
  example_problems = '["Vad händer först, sedan, sist?", "Varför gör karaktären så tror du?", "Vilka tre fakta lärde du dig om ämnet?"]',
  key_concepts = '["händelseförlopp", "fakta", "slutsatser", "tolkning"]'
WHERE code = 'EN-CMP-02';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerad textanalys och tolkning - eleven ska kunna analysera engelska texter kritiskt och dra välgrundade slutsatser. Inkluderar att förstå underliggande budskap, identifiera författarens perspektiv, jämföra texter och värdera trovärdighet. Eleven ska kunna motivera sina tolkningar med stöd i texten.',
  example_problems = '["Vad vill författaren att läsaren ska tycka?", "Jämför hur de två texterna beskriver ämnet", "Vilka argument är starkast och varför?"]',
  key_concepts = '["textanalys", "kritisk läsning", "perspektiv", "argumentation"]'
WHERE code = 'EN-CMP-03';

-- TRANSLATION (EN-TRN) - Översättning (befintliga koder, nya beskrivningar)
UPDATE curriculum_objectives SET
  extended_description = 'Översättning av ord och enkla fraser - eleven ska kunna översätta vanliga ord och enkla uttryck mellan svenska och engelska. Fokus på direkta motsvarigheter och vardagliga fraser. Eleven ska förstå att översättning ibland kräver anpassning, inte bara ord-för-ord-byten.',
  example_problems = '["Vad heter hund på engelska?", "Översätt: Jag gillar glass", "Vad betyder hello på svenska?"]',
  key_concepts = '["ordöversättning", "enkla fraser", "vardagsuttryck"]'
WHERE code = 'EN-TRN-01';

UPDATE curriculum_objectives SET
  extended_description = 'Översättning av meningar och korta texter - eleven ska kunna översätta sammanhängande meningar och korta texter i båda riktningarna. Fokus på att behålla mening och stil, inte bara översätta ord för ord. Eleven ska börja förstå att språk har olika strukturer och uttryckssätt.',
  example_problems = '["Översätt texten till engelska", "Skriv meningen på svenska", "Vilken översättning låter mest naturlig?"]',
  key_concepts = '["meningsöversättning", "behålla mening", "naturligt språk"]'
WHERE code = 'EN-TRN-02';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerad översättning med idiom och nyanser - eleven ska kunna hantera översättning av mer komplexa texter där direktöversättning inte fungerar. Inkluderar idiom, kulturella referenser och stilistiska val. Eleven ska kunna motivera sina översättningsval och förstå att perfekt ekvivalens sällan finns.',
  example_problems = '["Hur översätter man idiomet \"break a leg\"?", "Översätt texten så att den passar målgruppen", "Vilka svårigheter finns med att översätta denna mening?"]',
  key_concepts = '["idiom", "kulturella referenser", "stilistiska val", "anpassning"]'
WHERE code = 'EN-TRN-03';

-- CULTURE (EN-CUL) - Kultur
UPDATE curriculum_objectives SET
  extended_description = 'Vardagsliv i engelskspråkiga länder - eleven ska få grundläggande kunskap om hur barn lever i länder där man talar engelska. Inkluderar enkla jämförelser mellan Sverige och engelskspråkiga länder vad gäller skola, mat, högtider och traditioner. Fokus på likheter och skillnader som är begripliga för yngre barn.',
  example_problems = '["Vad äter barn i England till frukost?", "Hur firar man jul i USA?", "Vad skiljer en brittisk skola från din skola?"]',
  key_concepts = '["vardagsliv", "traditioner", "jämförelser", "engelskspråkiga länder"]'
WHERE code = 'EN-CUL-01';

UPDATE curriculum_objectives SET
  extended_description = 'Traditioner och levnadsvillkor i engelskspråkiga länder - eleven ska kunna beskriva och jämföra traditioner, högtider och vardagsliv i olika engelskspråkiga länder. Inkluderar kunskap om kulturella uttryck som musik, film och litteratur. Eleven ska utveckla förståelse för kulturell mångfald.',
  example_problems = '["Berätta om en högtid som firas i ett engelskspråkigt land", "Jämför skolgången i Sverige och Australien", "Vilka kända personer kommer från detta land?"]',
  key_concepts = '["traditioner", "högtider", "kulturella uttryck", "mångfald"]'
WHERE code = 'EN-CUL-02';

UPDATE curriculum_objectives SET
  extended_description = 'Samhällsfrågor och kulturella perspektiv - eleven ska kunna diskutera samhällsfrågor, historia och aktuella händelser i engelskspråkiga länder. Inkluderar kunskap om engelskans roll som världsspråk, kulturell påverkan och globala perspektiv. Eleven ska kunna reflektera kritiskt över kulturella skillnader och likheter.',
  example_problems = '["Varför är engelska ett världsspråk?", "Diskutera en aktuell samhällsfråga i USA/UK", "Hur påverkar amerikansk kultur Sverige?"]',
  key_concepts = '["samhällsfrågor", "världsspråk", "kulturell påverkan", "kritisk reflektion"]'
WHERE code = 'EN-CUL-03';

-- STRATEGIES (EN-STR) - Strategier
UPDATE curriculum_objectives SET
  extended_description = 'Enkla strategier för att förstå och göra sig förstådd - eleven ska kunna använda grundläggande strategier när språket inte räcker till. Inkluderar att använda gester, bilder, omformuleringar och att våga gissa. Fokus på att kommunikation är viktigare än perfektion.',
  example_problems = '["Hur kan du visa vad du menar utan ord?",  "Vad gör du om du inte förstår ett ord?", "Hur kan du fråga om hjälp på engelska?"]',
  key_concepts = '["gester", "omformulering", "våga gissa", "be om hjälp"]'
WHERE code = 'EN-STR-01';

UPDATE curriculum_objectives SET
  extended_description = 'Strategier för språkinlärning och kommunikation - eleven ska kunna använda medvetna strategier för att lära sig engelska och kommunicera effektivt. Inkluderar att använda ordböcker, gissa betydelse ur sammanhang, och använda kunskap om ordbildning. Eleven ska reflektera över sitt eget lärande.',
  example_problems = '["Hur kan du lista ut vad ett okänt ord betyder?", "Vilka strategier använder du för att lära dig glosor?", "Hur kan du förbättra ditt uttal?"]',
  key_concepts = '["ordbok", "kontext", "ordbildning", "självreflektion"]'
WHERE code = 'EN-STR-02';

UPDATE curriculum_objectives SET
  extended_description = 'Avancerade strategier för språkanvändning - eleven ska kunna använda sofistikerade strategier för att hantera komplexa språksituationer. Inkluderar att anpassa språket efter syfte och mottagare, hantera missförstånd, och använda olika källor kritiskt. Eleven ska kunna reflektera över språkets roll i olika sammanhang.',
  example_problems = '["Hur anpassar du ditt språk i olika situationer?", "Hur hanterar du ett missförstånd i ett samtal?", "Vilka källor är pålitliga för att kontrollera språket?"]',
  key_concepts = '["anpassning", "missförstånd", "källor", "kritiskt tänkande"]'
WHERE code = 'EN-STR-03';
