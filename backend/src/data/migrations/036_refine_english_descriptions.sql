-- Migration 036: Refine English curriculum descriptions to better align with LGR22
-- Based on official LGR22 structure: kommunikationens innehåll, lyssna och läsa (reception),
-- tala/skriva/samtala (produktion och interaktion)

-- =============================================
-- LISTENING (EN-LIS) - Reception: Lyssna
-- LGR22: "Tydligt talad engelska och texter från olika medier"
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Reception - lyssna: Tydligt talad engelska i enkla sammanhang. Eleven ska kunna förstå och tolka innehållet i tydligt talad engelska i långsamt tempo, t.ex. enkla instruktioner, hälsningsfraser och sånger. Enligt LGR22 centralt innehåll årskurs 1-3: "Tydligt talad engelska och texter från olika medier" samt "Enkla instruktioner och beskrivningar". Eleven visar förståelse genom att följa instruktioner eller svara på enkla frågor.',
  example_problems = '["Lyssna och gör rätt: Stand up, sit down", "Vilken bild passar till vad du hör?", "Vad händer i sången?"]',
  key_concepts = '["tydligt talad engelska", "enkla instruktioner", "långsamt tempo", "sånger och ramsor"]'
WHERE code = 'EN-LIS-01';

UPDATE curriculum_objectives SET
  extended_description = 'Reception - lyssna: Tydligt talad engelska och texter från olika medier. Eleven ska kunna förstå det huvudsakliga innehållet och tydliga detaljer i talad engelska i måttligt tempo. Enligt LGR22 centralt innehåll årskurs 4-6: "Tydligt talad engelska och texter från olika medier", "Muntliga och skriftliga meddelanden samt information" och "Olika former av enkla samtal och dialoger". Eleven ska kunna återge huvudinnehåll.',
  example_problems = '["Vad handlar samtalet om?", "Vilken information får du från meddelandet?", "Vad säger personerna i dialogen?"]',
  key_concepts = '["huvudsakligt innehåll", "tydliga detaljer", "dialoger", "meddelanden och information"]'
WHERE code = 'EN-LIS-02';

UPDATE curriculum_objectives SET
  extended_description = 'Reception - lyssna: Talad engelska och texter från olika medier. Eleven ska kunna förstå innehåll och detaljer i talad engelska i varierande tempo och från olika sammanhang. Enligt LGR22 centralt innehåll årskurs 7-9: "Talad engelska och texter från olika medier" med fördjupad förståelse för nyanser, perspektiv och underliggande budskap. Eleven ska kunna förstå olika varieteter av engelska och skilja på fakta och åsikter.',
  example_problems = '["Vad är talarens huvudargument?", "Vilken attityd har talaren till ämnet?", "Skilj på fakta och åsikter i klippet"]',
  key_concepts = '["varierat tempo", "nyanser", "underliggande budskap", "fakta och åsikter", "olika varieteter"]'
WHERE code = 'EN-LIS-03';

-- =============================================
-- READING (EN-REA) - Reception: Läsa
-- LGR22: Ingår i samma receptiva del som lyssna
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Reception - läsa: Enkla texter från olika medier. Eleven ska kunna läsa och förstå enkla ord, fraser och meningar i tydliga texter. Enligt LGR22 centralt innehåll årskurs 1-3: eleverna möter "Tydligt talad engelska och texter" samt "Enkla instruktioner och beskrivningar". Fokus på högfrekventa ord, enkla skyltar, bildtexter och korta meddelanden. Eleven kopplar text till bild och kontext.',
  example_problems = '["Para ihop ordet med rätt bild", "Vad står det på skylten?", "Läs och följ instruktionen"]',
  key_concepts = '["enkla ord och fraser", "skyltar och bildtexter", "högfrekventa ord", "bild-text-koppling"]'
WHERE code = 'EN-REA-01';

UPDATE curriculum_objectives SET
  extended_description = 'Reception - läsa: Texter från olika medier, berättelser och faktatexter. Eleven ska kunna läsa och förstå det huvudsakliga innehållet i åldersanpassade texter av olika slag. Enligt LGR22 centralt innehåll årskurs 4-6: "Berättelser och annan fiktion även i dramatiserad form samt sånger" och "Muntliga och skriftliga meddelanden samt information". Eleven ska kunna hitta explicit information och dra enkla slutsatser.',
  example_problems = '["Vad handlar berättelsen om?", "Hitta tre fakta i texten", "Vad tror du händer sedan? Motivera med texten."]',
  key_concepts = '["huvudsakligt innehåll", "berättelser och fiktion", "faktatexter", "dra slutsatser"]'
WHERE code = 'EN-REA-02';

UPDATE curriculum_objectives SET
  extended_description = 'Reception - läsa: Texter av olika slag från olika medier. Eleven ska kunna läsa och förstå innehåll och detaljer i sakprosa och skönlitteratur. Enligt LGR22 centralt innehåll årskurs 7-9: "Skönlitteratur och annan fiktion även i talad och dramatiserad form" samt "Sakprosa av olika slag". Eleven ska kunna analysera syfte, perspektiv och avsändare samt värdera källors tillförlitlighet.',
  example_problems = '["Vad är författarens syfte med texten?", "Jämför perspektiven i de två texterna", "Hur tillförlitlig är källan? Motivera."]',
  key_concepts = '["sakprosa och skönlitteratur", "syfte och perspektiv", "källkritik", "textanalys"]'
WHERE code = 'EN-REA-03';

-- =============================================
-- SPEAKING (EN-SPE) - Produktion och interaktion: Tala och samtala
-- LGR22: "Tala, skriva och samtala – produktion och interaktion"
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Produktion och interaktion - tala: Enkla presentationer och samtal. Eleven ska kunna presentera sig och delta i enkla samtal om välbekanta ämnen. Enligt LGR22 centralt innehåll årskurs 1-3: "Enkla presentationer" och "Enkla samtal för kontakt och kommunikation". Fokus på att våga använda språket, med stöd av gester och bilder. Kommunikation prioriteras framför korrekthet.',
  example_problems = '["Presentera dig själv: What is your name? How old are you?", "Berätta om något du gillar", "Fråga och svara: Do you like...?"]',
  key_concepts = '["enkla presentationer", "våga tala", "kontakt och kommunikation", "bekanta ämnen"]'
WHERE code = 'EN-SPE-01';

UPDATE curriculum_objectives SET
  extended_description = 'Produktion och interaktion - tala: Presentationer, instruktioner och samtal. Eleven ska kunna berätta, beskriva och ge instruktioner samt delta i samtal om bekanta ämnen. Enligt LGR22 centralt innehåll årskurs 4-6: "Presentationer, instruktioner och beskrivningar" samt "Samtal för kontakt, planering och genomförande av uppgifter". Eleven använder strategier för att lösa språkliga problem.',
  example_problems = '["Beskriv din familj eller en hobby", "Ge instruktioner för hur man gör något", "Diskutera med en klasskamrat och kom överens"]',
  key_concepts = '["beskrivningar och instruktioner", "samtal och diskussion", "lösa språkliga problem", "planering"]'
WHERE code = 'EN-SPE-02';

UPDATE curriculum_objectives SET
  extended_description = 'Produktion och interaktion - tala: Muntliga framställningar och diskussioner. Eleven ska kunna uttrycka, utveckla och argumentera för åsikter samt delta i diskussioner. Enligt LGR22 centralt innehåll årskurs 7-9: "Muntliga framställningar och muntlig interaktion av olika slag" samt "Samtal och diskussion där eleverna uttrycker, utvecklar och argumenterar för åsikter". Eleven anpassar språket efter syfte och mottagare.',
  example_problems = '["Håll en presentation och svara på frågor", "Debattera: Argumentera för din ståndpunkt", "Diskutera ett samhällsproblem och föreslå lösningar"]',
  key_concepts = '["muntliga framställningar", "argumentation", "debatt", "anpassa språket"]'
WHERE code = 'EN-SPE-03';

-- =============================================
-- WRITING (EN-WRI) - Produktion och interaktion: Skriva
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Produktion och interaktion - skriva: Enkla ord och fraser. Eleven ska kunna skriva enkla ord och korta meddelanden. Enligt LGR22 centralt innehåll årskurs 1-3: kopplat till "Enkla presentationer" och kommunikation i skrift. Fokus på att skriva bekanta ord, fylla i enkla formulär och skriva korta meddelanden med stöd av mallar eller modeller. Stavning och grammatik behöver inte vara helt korrekt.',
  example_problems = '["Skriv ditt namn och ålder på engelska", "Fyll i: My favourite colour is ___", "Skriv ett kort meddelande till en vän"]',
  key_concepts = '["enkla ord och fraser", "korta meddelanden", "mallar och stöd", "bekanta ord"]'
WHERE code = 'EN-WRI-01';

UPDATE curriculum_objectives SET
  extended_description = 'Produktion och interaktion - skriva: Sammanhängande texter och meddelanden. Eleven ska kunna skriva sammanhängande texter med tydlig struktur. Enligt LGR22 centralt innehåll årskurs 4-6: texter kopplade till "Presentationer, instruktioner och beskrivningar" samt "kommunikation för kontakt och med anledning av egna och andras behov". Eleven skriver berättelser, brev, instruktioner och beskrivningar med inledning och avslutning.',
  example_problems = '["Skriv ett brev eller e-post till en penvän", "Skriv en kort berättelse med början, mitten och slut", "Beskriv din skola för någon som inte varit där"]',
  key_concepts = '["sammanhängande texter", "tydlig struktur", "brev och berättelser", "beskrivningar"]'
WHERE code = 'EN-WRI-02';

UPDATE curriculum_objectives SET
  extended_description = 'Produktion och interaktion - skriva: Olika slags texter med anpassning till syfte och mottagare. Eleven ska kunna skriva varierade texter med tydlig struktur och sammanhang. Enligt LGR22 centralt innehåll årskurs 7-9: "Skriftlig interaktion och skriftlig framställning av olika slag" där eleven "uttrycker, utvecklar och argumenterar för åsikter". Eleven behärskar styckeindelning, sambandsord och anpassar stil och ton efter texttyp.',
  example_problems = '["Skriv en argumenterande text med tes och argument", "Skriv en recension av en film eller bok", "Skriv en formell ansökan eller ett formellt brev"]',
  key_concepts = '["argumenterande text", "anpassning till syfte", "formell och informell stil", "styckeindelning"]'
WHERE code = 'EN-WRI-03';

-- =============================================
-- VOCABULARY (EN-VOC) - Ordförråd
-- Centralt genomgående i LGR22, kopplat till kommunikationens innehåll
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Ordförråd: Vanliga ord och fraser för vardaglig kommunikation. Eleven ska kunna förstå och använda vanliga ord inom bekanta ämnesområden. Enligt LGR22 kommunikationens innehåll årskurs 1-3: "Ämnen som är välbekanta för eleverna" som vardagsliv, intressen och personer. Inkluderar ord om kroppen, färger, siffror, djur, familj och klassrumsföremål. Eleven kopplar ord till bilder och konkreta situationer.',
  example_problems = '["Vad heter djuret på engelska?", "Säg tre färger på engelska", "Para ihop ordet med bilden"]',
  key_concepts = '["vardagsord", "bekanta ämnen", "kropp och färger", "familj och djur"]'
WHERE code = 'EN-VOC-01';

UPDATE curriculum_objectives SET
  extended_description = 'Ordförråd: Ord och uttryck för utökade ämnesområden. Eleven ska kunna förstå och använda ord och fraser inom fler ämnesområden. Enligt LGR22 kommunikationens innehåll årskurs 4-6: "Vardagsliv och levnadssätt i olika sammanhang och områden där engelska används", intressen, personer och platser. Eleven börjar förstå ordbildning (förstavelser som un-, ändelser som -ful) och kan gissa ords betydelse ur sammanhang.',
  example_problems = '["Vad betyder ordet unhappy?", "Beskriv din hobby med minst 5 engelska ord", "Gissa vad ordet betyder utifrån sammanhanget"]',
  key_concepts = '["utökade ämnesområden", "ordbildning", "gissa ur sammanhang", "intressen och vardagsliv"]'
WHERE code = 'EN-VOC-02';

UPDATE curriculum_objectives SET
  extended_description = 'Ordförråd: Rikt ordförråd inklusive idiom och uttryck. Eleven ska kunna förstå och använda ett varierat ordförråd med nyanser och stilskillnader. Enligt LGR22 kommunikationens innehåll årskurs 7-9: "Aktuella och för eleven bekanta ämnesområden" samt "Åsikter, erfarenheter och känslor". Inkluderar idiom, fasta uttryck, ämnesspecifika ord och akademiskt språk. Eleven väljer ord medvetet efter sammanhang och stilnivå.',
  example_problems = '["Förklara idiomet \"a piece of cake\"", "Välj det mest passande ordet: big/large/huge/enormous", "Vilket ord passar i formellt vs informellt sammanhang?"]',
  key_concepts = '["idiom och fasta uttryck", "nyanser och stilnivåer", "akademiskt språk", "medvetet ordval"]'
WHERE code = 'EN-VOC-03';

-- =============================================
-- GRAMMAR (EN-GRM) - Grammatik
-- I LGR22 integrerat i produktion, inte separat kategori
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Språkliga strukturer: Grundläggande grammatik för enkel kommunikation. Eleven ska kunna använda enkla språkliga strukturer för att kommunicera. Fokus på enkel ordföljd (subjekt-verb-objekt), presens av vanliga verb (be, have, like, can), personliga pronomen (I, you, he/she/it) och enkla frågor (Do you...? Is it...?). Grammatiken tjänar kommunikationen - fokus på begriplighet snarare än perfektion.',
  example_problems = '["Välj rätt: He like/likes football", "Gör om till fråga: She is happy", "Fyll i: I ___ (be) happy"]',
  key_concepts = '["enkel ordföljd", "presens", "personliga pronomen", "enkla frågor"]'
WHERE code = 'EN-GRM-01';

UPDATE curriculum_objectives SET
  extended_description = 'Språkliga strukturer: Utökad grammatik för varierad kommunikation. Eleven ska behärska fler grammatiska strukturer för att uttrycka sig mer varierat. Inkluderar tempus (presens, preteritum, perfekt, futurum), oregelbundna verb (went, saw, made), adjektivets komparation (big-bigger-biggest), prepositioner och sammandragningar. Eleven ska kunna variera sitt språk och rätta uppenbara fel.',
  example_problems = '["Skriv i rätt tempus: Yesterday I ___ (go) to school", "Jämför: good, better, ___", "Rätta felen i meningen"]',
  key_concepts = '["tempus och tidsuttryck", "oregelbundna verb", "komparation", "prepositioner"]'
WHERE code = 'EN-GRM-02';

UPDATE curriculum_objectives SET
  extended_description = 'Språkliga strukturer: Avancerad grammatik för nyanserad kommunikation. Eleven ska kunna använda komplexa grammatiska strukturer för att uttrycka nyanser. Inkluderar passiv form (The book was written by...), konditionalis (If I were..., would have...), indirekt tal (He said that...), relativa bisatser och sambandsord för textbindning. Eleven varierar medvetet sin meningsbyggnad efter syfte.',
  example_problems = '["Skriv om till passiv form", "Omformulera till indirekt tal: She said, \"I am tired\"", "Kombinera meningarna med lämpligt sambandsord"]',
  key_concepts = '["passiv form", "konditionalis", "indirekt tal", "bisatser och sambandsord"]'
WHERE code = 'EN-GRM-03';

-- =============================================
-- COMPREHENSION (EN-CMP) - Läsförståelse (övergripande)
-- Kombinerar reception med förståelsestrategier
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Läsförståelse: Hitta information och förstå huvudinnehåll i enkla texter. Eleven ska kunna förstå det mest väsentliga i korta, enkla texter om bekanta ämnen. Enligt LGR22: reception och förståelse av "enkla instruktioner och beskrivningar". Eleven ska kunna svara på explicita frågor (vad, vem, var) och visa förståelse genom att följa instruktioner eller välja rätt bild/alternativ.',
  example_problems = '["Vad handlar texten om?", "Vem är texten om?", "Vilket alternativ stämmer enligt texten?"]',
  key_concepts = '["huvudinnehåll", "explicita frågor", "bekanta ämnen", "enkla texter"]'
WHERE code = 'EN-CMP-01';

UPDATE curriculum_objectives SET
  extended_description = 'Läsförståelse: Förstå huvudinnehåll och detaljer samt dra enkla slutsatser. Eleven ska kunna förstå olika typer av åldersanpassade texter och svara på frågor som kräver viss tolkning. Enligt LGR22: förståelse av "berättelser och annan fiktion" samt "muntliga och skriftliga meddelanden". Eleven ska kunna hitta både explicit och implicit information samt förstå händelseförlopp.',
  example_problems = '["Vad händer först, sedan och sist i berättelsen?", "Varför tror du karaktären gör så? Motivera.", "Vad kan vi förstå trots att det inte sägs rakt ut?"]',
  key_concepts = '["explicit och implicit information", "händelseförlopp", "dra slutsatser", "tolkning"]'
WHERE code = 'EN-CMP-02';

UPDATE curriculum_objectives SET
  extended_description = 'Läsförståelse: Analysera, tolka och kritiskt granska texter. Eleven ska kunna läsa mellan raderna, förstå perspektiv och värdera innehåll. Enligt LGR22 årskurs 7-9: fördjupad förståelse av "skönlitteratur och annan fiktion" samt "sakprosa av olika slag" med fokus på "Språkliga strategier för att förstå och göra sig förstådd". Eleven analyserar syfte, ton, avsändare och kan jämföra olika texters perspektiv.',
  example_problems = '["Vad vill författaren att läsaren ska tycka eller känna?", "Jämför hur ämnet framställs i de två texterna", "Hur påverkar ordvalen läsarens uppfattning?"]',
  key_concepts = '["textanalys", "perspektiv och ton", "kritisk granskning", "jämföra texter"]'
WHERE code = 'EN-CMP-03';

-- =============================================
-- TRANSLATION (EN-TRN) - Översättning
-- Ej explicit i LGR22 men kopplat till språkjämförelse
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Översättning: Enkla ord och uttryck mellan svenska och engelska. Eleven ska kunna koppla vanliga engelska ord till svenska motsvarigheter och vice versa. Kopplat till LGR22:s fokus på ordförråd och "språkliga företeelser i det språk eleverna möter" samt jämförelser med svenska. Eleven förstår att vissa ord har direkta motsvarigheter medan andra kräver förklaring.',
  example_problems = '["Vad heter hund på engelska?", "Vad betyder cat på svenska?", "Översätt: I like ice cream"]',
  key_concepts = '["ordöversättning", "enkla fraser", "svenska-engelska", "direkta motsvarigheter"]'
WHERE code = 'EN-TRN-01';

UPDATE curriculum_objectives SET
  extended_description = 'Översättning: Meningar och korta texter med hänsyn till språkskillnader. Eleven ska kunna översätta sammanhängande meningar och korta texter i båda riktningarna. Enligt LGR22: kopplat till "Språkliga företeelser som stavning, uttal och grammatik i det språk eleverna möter" och jämförelser med svenska. Eleven förstår att ordföljd och uttryckssätt skiljer sig mellan språken.',
  example_problems = '["Översätt meningen till engelska", "Varför kan man inte översätta ord för ord?", "Vilken översättning låter mest naturlig?"]',
  key_concepts = '["meningsöversättning", "ordföljdsskillnader", "naturligt språk", "språkjämförelse"]'
WHERE code = 'EN-TRN-02';

UPDATE curriculum_objectives SET
  extended_description = 'Översättning: Komplexa texter med idiom och kulturella uttryck. Eleven ska kunna hantera översättning där direkt ordöversättning inte fungerar. Enligt LGR22 årskurs 7-9: djupare förståelse för "Språkliga strategier" och kulturella aspekter. Eleven förstår att idiom, metaforer och kulturspecifika uttryck kräver anpassning snarare än direkt översättning och kan motivera översättningsval.',
  example_problems = '["Hur översätter man break a leg till svenska?", "Förklara varför direktöversättning inte fungerar här", "Översätt så att det passar svenska mottagare"]',
  key_concepts = '["idiom och metaforer", "kulturella uttryck", "anpassning", "motivera översättningsval"]'
WHERE code = 'EN-TRN-03';

-- =============================================
-- CULTURE (EN-CUL) - Kultur och samhälle
-- LGR22: Del av kommunikationens innehåll
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Kultur: Vardagsliv och levnadssätt där engelska används. Eleven ska få grundläggande kunskap om hur barn och unga lever i engelskspråkiga länder. Enligt LGR22 kommunikationens innehåll årskurs 1-3: kopplat till "Ämnen som är välbekanta för eleverna" med internationell utblick. Enkla jämförelser mellan Sverige och engelskspråkiga länder vad gäller skola, högtider, mat och familjeliv.',
  example_problems = '["Hur firar barn i England jul?", "Vad äter man ofta till frukost i USA?", "Vad är likt och olikt jämfört med Sverige?"]',
  key_concepts = '["vardagsliv", "engelskspråkiga länder", "högtider", "jämförelser med Sverige"]'
WHERE code = 'EN-CUL-01';

UPDATE curriculum_objectives SET
  extended_description = 'Kultur: Traditioner, levnadsvillkor och kulturella uttryck. Eleven ska kunna beskriva och jämföra traditioner och vardagsliv i olika engelskspråkiga länder. Enligt LGR22 kommunikationens innehåll årskurs 4-6: "Vardagsliv och levnadssätt i olika sammanhang och områden där engelska används". Inkluderar kunskap om kulturella uttryck som musik, film, sport och litteratur.',
  example_problems = '["Berätta om en högtid i ett engelskspråkigt land", "Vilka skillnader finns mellan skolor i UK och Sverige?", "Vilken musik/film kommer från detta land?"]',
  key_concepts = '["traditioner och högtider", "levnadsvillkor", "kulturella uttryck", "mångfald"]'
WHERE code = 'EN-CUL-02';

UPDATE curriculum_objectives SET
  extended_description = 'Kultur: Samhällsfrågor, historia och engelskans roll som världsspråk. Eleven ska kunna diskutera aktuella händelser och samhällsfrågor i engelskspråkiga länder. Enligt LGR22 kommunikationens innehåll årskurs 7-9: "Levnadsvillkor, traditioner, sociala relationer och kulturella företeelser" samt engelskans globala spridning. Eleven reflekterar kritiskt över kulturella likheter och skillnader.',
  example_problems = '["Varför talas engelska i så många länder?", "Diskutera en aktuell samhällsfråga i USA eller UK", "Hur påverkar engelskspråkig kultur Sverige?"]',
  key_concepts = '["samhällsfrågor", "engelska som världsspråk", "kulturell påverkan", "kritisk reflektion"]'
WHERE code = 'EN-CUL-03';

-- =============================================
-- STRATEGIES (EN-STR) - Språkliga strategier
-- LGR22: Explicit del av centralt innehåll
-- =============================================

UPDATE curriculum_objectives SET
  extended_description = 'Språkliga strategier: Enkla strategier för att förstå och göra sig förstådd. Eleven ska kunna använda grundläggande strategier när språket inte räcker till. Enligt LGR22 centralt innehåll årskurs 1-3: "Språkliga strategier för att förstå och göra sig förstådd när språket inte räcker till, till exempel gester och frågor". Eleven vågar gissa, använda kroppsspråk och be om hjälp.',
  example_problems = '["Hur kan du visa vad du menar utan ord?", "Vad säger du om du inte förstår?", "How do you say... in English?"]',
  key_concepts = '["gester och kroppsspråk", "våga gissa", "be om hjälp", "fråga om förtydligande"]'
WHERE code = 'EN-STR-01';

UPDATE curriculum_objectives SET
  extended_description = 'Språkliga strategier: Strategier för att lära och kommunicera. Eleven ska kunna använda medvetna strategier för språkinlärning och kommunikation. Enligt LGR22 centralt innehåll årskurs 4-6: "Språkliga strategier för att förstå och göra sig förstådd, till exempel frågor, omformuleringar och stödjande fraser". Eleven använder ordböcker, gissar betydelse ur sammanhang och reflekterar över sitt lärande.',
  example_problems = '["Hur listar du ut vad ett okänt ord betyder?", "Hur kan du omformulera om du inte kan rätt ord?", "Vilka strategier hjälper dig lära glosor?"]',
  key_concepts = '["omformulering", "ordbok och hjälpmedel", "gissa ur sammanhang", "lärstrategier"]'
WHERE code = 'EN-STR-02';

UPDATE curriculum_objectives SET
  extended_description = 'Språkliga strategier: Avancerade strategier för varierande kommunikationssituationer. Eleven ska kunna anpassa strategi efter situation och syfte. Enligt LGR22 centralt innehåll årskurs 7-9: "Språkliga strategier för att bidra till och aktivt delta i samtal och skriftlig interaktion, även digital" samt strategier för att "förstå detaljer och sammanhang". Eleven använder olika källor kritiskt och hanterar missförstånd konstruktivt.',
  example_problems = '["Hur anpassar du språket i formella vs informella situationer?", "Hur hanterar du ett missförstånd i samtal?", "Vilka källor är pålitliga för att kolla språkfrågor?"]',
  key_concepts = '["anpassning efter situation", "digital kommunikation", "källkritik", "hantera missförstånd"]'
WHERE code = 'EN-STR-03';
