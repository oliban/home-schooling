/**
 * Theme suggestions for math and reading problems by grade level
 * Inspired by popular culture, everyday life, and student interests
 */

export const themesByGrade: Record<number, string[]> = {
  1: [
    // Animals & Nature (100 themes)
    "katter och hundar", "bondgårdsdjur", "djur i skogen", "husdjur", "fåglar i trädgården",
    "fjärilar och bin", "fiskar i dammen", "sniglar och maskar", "får och lamm", "kaniner",
    "höns och tuppar", "grisar", "kor och kalvar", "hästar och ponnyar", "getter",
    "ankor och gäss", "ekorrar", "igelkottar", "möss och råttor", "fåglar som sjunger",
    "spindlar", "myror", "daggmaskar", "nyckelpigор", "bin som samlar honung",
    "kattungar", "valpar", "fåglar som bygger bon", "fiskar i akvariet", "sköldpaddor",
    "hamstrar", "marsvin", "papegojor", "duvor", "korpar och kråkor",
    "älgar i skogen", "rådjur", "rävar", "harar", "grävlingar",
    "ugglor", "rovfåglar", "änder", "svanar", "talgoxar",
    "blommor i trädgården", "träd", "buskar", "gräs", "löv",
    "blad", "grenar", "rötter", "frön", "plantor",
    "äppelträd", "körsbärsträd", "björkar", "granar", "tallar",
    "blåbär", "lingon", "jordgubbar", "hallon", "björnbär",
    "tulpaner", "rosor", "solrosor", "maskrosor", "vildblommor",
    "moln", "regnbågar", "sol", "måne", "stjärnor på himlen",
    "snöflingor", "is", "frost", "dagg på gräset", "regndroppar",
    "vind", "åska", "blixt", "dimma", "hagel",
    "berg", "kullar", "dalar", "sjöar", "bäckar",
    "floder", "hav", "strand", "sand", "stenar",
    "lera", "jord", "grus", "klippor", "grottor",
    "skog", "ängar", "fält", "parker", "trädgårdar",

    // Food & Treats (100 themes)
    "glass och godis", "äpplen och bananer", "kakor och bullar", "juice och frukt",
    "smörgåsar", "pannkakor", "popcorn", "fruktgröt", "smoothies", "muffins",
    "choklad", "kex", "chips", "fruktgummin", "lakritsar",
    "sockerbitar", "honung", "sylt", "marmelad", "nutella",
    "mjölk", "yoghurt", "fil", "ost", "smör",
    "bröd", "knäckebröd", "fralla", "sirapslimpa", "kavring",
    "ägg", "bacon", "korv", "köttbullar", "fisk",
    "kyckling", "hamburgare", "pizza", "pasta", "ris",
    "potatis", "morötter", "gurka", "tomat", "paprika",
    "broccoli", "blomkål", "majs", "ärtor", "bönor",
    "päron", "apelsiner", "druvor", "kiwi", "melon",
    "vattenmelon", "persikor", "plommon", "körsbär", "nektariner",
    "chokladbollar", "mazariner", "wienerbröd", "kanelbullar", "sockerkaka",
    "tårta", "cupcakes", "cookies", "brownies", "maränger",
    "glass med strö", "mjukglass", "glasspinnar", "sorbet", "frozen yoghurt",
    "saft", "vatten", "läsk", "kakao", "te",
    "kaffe (till vuxna)", "milkshakes", "bubbelte", "lemonad", "apelsinjuice",
    "havregrynsgröt", "ris-à-la-malta", "filmjölk", "kvarg", "kesella",
    "pizza med ost", "pizza med skinka", "sallad", "sås", "ketchup",

    // Toys & Play (100 themes)
    "lego och klossar", "bilar och traktorer", "dockor och gosedjur", "bollar och ballonger",
    "gungor och rutschkanor", "sandlådan", "pussel", "tåg och räls", "bygga koja", "bubblor",
    "leksaksbilar", "polisbilar", "brandbilar", "ambulanser", "racerbilar",
    "lastbilar", "grävmaskiner", "blandare", "dumprar", "kranar",
    "traktorer", "bussar", "motorcyklar", "cyklar", "sparkcyklar",
    "dockor", "dockklänningar", "dockvagnar", "dockhus", "dockfamiljer",
    "gosedjur", "nalle", "kaniner", "björnar", "hundar",
    "katter (gosedjur)", "drakar (leksak)", "enhörningar (leksak)", "dinosaurier (leksak)", "lejon",
    "pussel 10 bitar", "pussel 20 bitar", "pussel 50 bitar", "pussel djur", "pussel fordon",
    "klossar", "duplo", "lego city", "lego friends", "byggklossar",
    "träklossar", "magnetklossar", "pappklossar", "stapeltorn", "bygga torn",
    "bollar", "studsbollar", "fotbollar", "basketbollar", "tennisbollar",
    "ballonger", "såpbubblor", "bubbelblåsare", "jättebubblor", "bubbelmaskin",
    "hopprep", "studsmatta", "gungbräda", "karusell", "klätterställning",
    "sandleksaker", "sandformar", "hinkar", "spadar", "räfsor",
    "vattenlekar", "vattenpistol", "pooldamm", "badleksaker", "fiskespö",
    "tåg", "tågset", "räls", "stationer", "tågtunnel",
    "modelljärnväg", "elektriska tåg", "träntåg", "tågvagnar", "lok",
    "ritpapper", "kritor", "färgpennor", "tuschpennor", "akvarellfärger",

    // Everyday Life (100 themes)
    "morgonrutiner", "packa skolväskan", "borsta tänderna", "klä på sig", "städa rummet",
    "laga mat med mamma", "baka med pappa", "duka bordet", "vattna blommor", "plocka upp leksaker",
    "äta frukost", "äta lunch", "äta middag", "äta mellanmål", "dricka vatten",
    "tvätta händerna", "tvätta ansiktet", "kamma håret", "byta kläder", "ta på jacka",
    "ta på skor", "knyta skosnören", "ta på mössa", "ta på vantar", "ta på halsduk",
    "tvätta tänderna på kvällen", "läsa godnattsaga", "gå och lägga sig", "sova gott", "vakna på morgonen",
    "gå till dagis", "gå till skolan", "möta kompisar", "leka rast", "äta skolmat",
    "gå hem från skolan", "göra läxor", "läsa böcker", "rita", "måla",
    "leka inne", "leka ute", "gå på promenad", "åka buss", "åka bil",
    "handla mat", "åka till affären", "betala i kassan", "packa matkassar", "bära kassar",
    "laga matsäck", "stoppa matlåda", "packa ryggsäck", "ta med vatten", "ta med frukt",
    "hjälpa till hemma", "lägga disk", "torka golv", "dammsuga", "plocka undan",
    "sortera tvätt", "hänga upp kläder", "vika kläder", "stoppa i lådor", "hänga i garderob",
    "mata husdjur", "rasta hund", "byta kattlåda", "byta vatten till djur", "kela med katt",
    "vattna växter", "plocka döda blad", "sätta frön", "plantera blommor", "kapa gräs",
    "sopa golv", "torka bord", "slänga skräp", "återvinna", "tömma papperskorg",
    "diska tallrikar", "tvätta glas", "torka bestick", "ställa in disk", "torka disk",
    "laga macka", "bre smör", "lägga på pålägg", "skära frukt", "hälla mjölk",

    // Seasons & Weather (50 themes)
    "snö och åka pulka", "våren och blommor", "sommaren och badstranden", "hösten och löv",
    "regn och pölar", "sol och solglasögon", "vind och drakar", "snögubbar", "isglass på sommaren",
    "snöbollskrig", "bygga snöborg", "åka skidor", "åka skridskor", "släda",
    "vinterkläder", "vinterhandskar", "snöoverall", "vinterstövlar", "varm mössa",
    "vårblommor", "fåglar som kommer tillbaka", "buskar som blommar", "gräs som växer", "vårregn",
    "sommarlov", "bada", "sola", "bygga sandslott", "plocka blommor",
    "picknick", "grilla", "äta utomhus", "leka ute länge", "ljusa kvällar",
    "höstlöv", "plocka kastanjer", "höstfärger", "höststormar", "regn på hösten",
    "halloween", "höstlov", "höstmarknad", "plocka äpplen", "göra must",
    "vintermörker", "tänd ljus", "mysa inne", "dricka varm choklad", "värma sig",

    // Transportation (30 themes)
    "bussar och bilar", "cyklar", "tåg och tunnelbana", "flygplan", "båtar",
    "lastbilar", "polisbilar och brandbilar", "traktorer", "sparkcyklar", "gående",
    "skolbuss", "stadsbuss", "turistbuss", "färja", "kryssningsfartyg",
    "motorcykel", "moped", "elcykel", "skateboard", "rullskridskor",
    "helikopter", "jetplan", "segelflygplan", "luftballong", "raket",
    "ubåt", "segelbåt", "motorbåt", "kanot", "kajak",

    // Family & Friends (30 themes)
    "syskon", "mormor och morfar", "kompisar på dagis", "födelsedagskalas", "leka med grannen",
    "familjen äter middag", "helg med familjen", "kusiner", "bästa vänner", "kompisar",
    "mamma och pappa", "storebror", "lillasyster", "farmor och farfar", "mostrar och farbröder",
    "leka med kompis", "bjuda hem kompis", "hälsa på mormor", "åka till morfar", "träffa kusiner",
    "familjemiddag", "familjeutflykt", "familjesemester", "familjefest", "familjespel",
    "dela leksaker", "dela godis", "vara snäll", "hjälpa varandra", "krama",

    // Colors & Shapes (30 themes)
    "färgglada klossar", "regnbågar", "runda och fyrkantiga saker", "mönster överallt",
    "stjärnor och månar", "hjärtan och cirklar", "trianglar", "randiga saker", "prickiga saker",
    "röda saker", "blå saker", "gula saker", "gröna saker", "orange saker",
    "lila saker", "rosa saker", "vita saker", "svarta saker", "färgglad",
    "runda bollar", "fyrkantiga klossar", "triangulära tak", "rektanglar", "ovaler",
    "stjärnor", "hjärtan", "kvadrater", "hexagoner", "cirklar",

    // Holidays & Celebrations (30 themes)
    "jul och tomten", "påsk och ägg", "midsommar", "lucia", "halloween och pumpor",
    "födelsedag", "nyår", "valborg", "skolavslutning", "första skoldagen",
    "julklappar", "julgran", "pepparkakshus", "adventskalender", "tomtenissar",
    "påskägg", "påskhare", "påskkärringar", "måla ägg", "gömma godis",
    "midsommarstång", "blomsterkrans", "dansa runt stången", "midsommarmiddag", "jordgubbar",
    "lucia med ljus", "lussekatter", "lucia i skolan", "luciatåg", "pepparkakor",
    "halloween mask", "pumpor", "spöken", "godis eller bus", "halloween fest",

    // Fantasy & Imagination (30 themes)
    "sagor och prinsessor", "drakar och riddare", "troll i skogen", "älvor", "enhörningar",
    "dinosaurier", "pirater och skatter", "astronauter", "superhjältar", "trollkarlar",
    "slott", "kungar och drottningar", "prinsessor", "prinsar", "tornrum",
    "drakar som sprutar eld", "flygande drakar", "snälla drakar", "stora drakar", "små drakar",
    "riddare med svärd", "rustning", "hästar", "turneringar", "slåss mot draken",
    "älvor i skogen", "vingar", "magiska älvor", "älvdans", "älvdrottning"
  ],

  2: [
    // Animals & Nature
    "husdjur och vilda djur", "djurparken", "havsdjur", "djur på savannen", "insekter",
    "fåglar som flyger", "reptiler", "djur på bondgården", "skogens djur", "exotiska djur",

    // Food Adventures
    "godisbutiken", "mataffären", "frukt och grönsaker", "pizza", "hamburgare",
    "tacos", "pasta", "frukost, lunch och middag", "mellanmål", "bakning",

    // Sports & Activities
    "fotboll", "simning", "åka skidor", "åka skridskor", "cykling",
    "klättra i träd", "hopprep", "löpning", "basket", "bordtennis",

    // School Life
    "klassrummet", "skolgården", "matsal och skolmat", "biblioteket", "fritids",
    "lärare och elever", "skolväskan", "pennor och sudd", "läxor", "raster",

    // Technology & Modern Life
    "surfplattor och datorer", "robotar", "mobiltelefoner", "spel", "filmer",
    "fotografering", "inspelning", "appar", "youtube", "tv-program",

    // Transportation & Travel
    "resa med tåg", "flyga till utlandet", "bilturer", "campingvagn", "semester",
    "åka tunnelbana", "cykla i stan", "gå till skolan", "bussen", "färjan",

    // Minecraft & Gaming
    "minecraft byggen", "roblox äventyr", "pokemon", "super mario", "fortnite",
    "among us", "minecraft mobs", "bygga i creative mode", "överlevnad", "gaming kompisar",

    // Popular Characters
    "spiderman", "frost och elsa", "paw patrol", "peppa pig", "lego ninjago",
    "harry potter magi", "star wars", "disney prinsessor", "superhjältar", "pokemon tränare",

    // Science & Discovery
    "rymden och planeter", "dinosaurier", "vulkaner", "experiment", "magneter",
    "växter som växer", "vädret", "kroppen", "djurens liv", "uppfinningar",

    // Creative Arts
    "måla tavlor", "skulptera", "hantverk", "origami", "pärlplattor",
    "slöjd", "musik och instrument", "sjunga", "teater", "dansa",

    // Additional themes
    "detektiver och mysterier", "skattkartsor", "hemliga klubbar", "cirkus", "zoo",
    "nöjesparker", "akvarier", "museer", "kalas", "utflykter", "camping",
    "fiske", "bär och svamp", "pyssel", "bygga lego", "leka krig",
    "prinsessor och slott", "riddare", "pirater", "cowboys", "ninjas"
  ],

  3: [
    // Pop Culture & Entertainment
    "minecraft", "roblox", "among us", "fortnite", "pokemon",
    "lego och bygga", "harry potter", "star wars", "marvel superhjältar", "disney",

    // Sports & Competitions
    "fotboll-VM", "fotbollslag", "OS och idrott", "simtävlingar", "skidåkning",
    "skateboard", "gymnastik", "friidrott", "ishockey", "innebandy",

    // Animals & Nature
    "dinosaurier", "hajar och havsdjur", "djungeldjur", "arktiska djur", "husdjur",
    "farliga djur", "utrotningshotade djur", "insekter", "fåglar", "reptiler",

    // Food & Cooking
    "godisfabrik", "chokladtillverkning", "bageri och bakning", "restaurang", "foodtrucks",
    "pizza", "tacos", "sushi", "glass", "smoothies och juicer",

    // Technology & Innovation
    "robotar", "rymdresor", "datorer och programmering", "appar och spel", "drönare",
    "elbilar", "smarta hem", "youtube-stjärnor", "influencers", "livestreaming",

    // Adventure & Exploration
    "skattsökande", "äventyr i skogen", "camping", "bergsklättring", "höghöjdsbanor",
    "geocaching", "överlevnad i vildmarken", "expeditioner", "upptäckare", "kartläsning",

    // Fantasy & Magic
    "trollkarlar", "drakar", "enhörningar", "älvor och troll", "superhjältar",
    "ninjas", "pirater", "riddare och slott", "sagofigurer", "magiska varelser",

    // Everyday Heroes
    "brandmän", "poliser", "läkare och sjuksköterskor", "veterinärer", "piloter",
    "astronauter", "forskare", "uppfinnare", "lärare", "räddningstjänsten",

    // Seasonal & Holiday
    "jul och julklappar", "påsk", "halloween", "midsommar", "lucia",
    "födelsedagar", "skolavslutning", "sommarlov", "nyår", "sportlov",

    // Creative & Arts
    "måla och rita", "musik och instrument", "dansa", "teater", "film",
    "fotografering", "designa kläder", "modeskapare", "arkitektur", "skulptering",

    // Kjell-Gunbritt & Quirky Themes
    "toaletter och badrum", "Kjell-Gunbritt bygger lego", "fängelse", "sopor och återvinning", "trasiga saker",
    "konstiga maskiner", "udda jobb", "märkliga djur", "fula tävlingar", "grötiga saker",

    // Additional themes
    "busresor", "tågstationer", "flygplatser", "hamnar", "bibliotek",
    "simhallar", "ishallar", "sporthallar", "nöjesparker", "zoo",
    "akvarier", "museer", "slott", "sevärdheter", "parker",
    "kaféer", "affärer", "marknader", "fabriker", "byggen"
  ],

  4: [
    // Gaming & Esports
    "minecraft server", "roblox studio", "fortnite turneringar", "among us strategier", "pokemon tävlingar",
    "gaming setup", "twitch streaming", "youtube gaming", "esports", "speedrunning",

    // Popular Media
    "marvel universum", "star wars galaxer", "harry potter trollformler", "disney äventyr", "pixar filmer",
    "netflix serier", "tiktok trender", "youtube creators", "spotify listor", "instagram",

    // Sports & Athletics
    "fotbolls-VM", "premier league", "NHL hockey", "NBA basket", "tennis grand slam",
    "OS tävlingar", "X-games", "skate", "snowboard", "parkour",

    // Science & Space
    "rymdfärder till mars", "black holes", "solsystemet", "ISS rymdstation", "aliens",
    "astronauter", "raketer", "planeter", "månen", "teleskop",

    // Animals & Wildlife
    "rovdjur", "hajar", "dinosaurier", "djungeldjur", "arktis och antarktis",
    "utrotningshotade arter", "djurliv på savannen", "havsdjup", "giftiga djur", "nattdjur",

    // Technology & Future
    "AI och robotar", "virtual reality", "drönare", "3D-printing", "smarta prylar",
    "elbilar och tesla", "smartphones", "kryptovaluta", "metaverse", "framtidsstäder",

    // Food & Restaurants
    "restauranger", "street food", "sushi", "pizza", "hamburgare",
    "tacos", "bageri", "konditori", "cafés", "foodtrucks",

    // Adventure & Survival
    "överlevnad i vildmarken", "klättring", "kayak och kanot", "camping", "vandring",
    "geocaching", "orientering", "bergsklättring", "höghöjdsbanor", "zipline",

    // Mythology & Fantasy
    "nordisk mytologi", "grekisk mytologi", "drakar", "trollkarlar", "superhjältar",
    "tidsresor", "parallella universum", "magi", "monster", "legender",

    // Creative Industries
    "musik och band", "dans och koreografi", "film och regi", "game design", "app utveckling",
    "mode och design", "graffiti konst", "fotografi", "arkitektur", "inredning",

    // Demon Slayer & Anime
    "demon slayer träning", "anime karaktärer", "manga", "cosplay", "anime konvent",
    "japansk kultur", "sushi och ramen", "samurai", "ninja", "japanska festivaler",

    // Quirky & Unusual
    "Kjell-Gunbritts uppfinningar", "konstiga rekord", "märkliga jobb", "tokiga experiment", "udda samlingar",
    "världens största", "världens minsta", "bisarra djur", "konstig mat", "udda traditioner",

    // Environment & Nature
    "klimatet", "återvinning", "miljöhjältar", "skogar", "hav och koraller",
    "djurskydd", "nationalparker", "vulkaner", "jordbävningar", "väder",

    // Additional themes
    "detektiver", "mysterier", "spioner", "agenter", "hackers",
    "tidsmaskiner", "uppfinningar", "experiment", "laboratorier", "forskare",
    "pirater", "cowboys", "riddare", "kungar", "prinsessor"
  ],

  5: [
    // Gaming Culture
    "minecraft redstone", "roblox scripting", "fortnite competitive", "league of legends", "valorant",
    "counter strike", "rocket league", "minecraft mods", "gaming clans", "discord servers",

    // Social Media & Internet
    "youtube algoritmer", "tiktok viralvideos", "instagram reels", "snapchat streaks", "twitter trends",
    "twitch streaming", "content creators", "memes", "online communities", "digital identitet",

    // Sports & Competitions
    "champions league", "premier league", "la liga", "NBA playoffs", "NFL superbowl",
    "formel 1", "motocross", "BMX", "skateboard tricks", "surfing",

    // Science & Technology
    "AI och machine learning", "programmering i python", "webb development", "cybersäkerhet", "kryptering",
    "kvantdatorer", "nanoteknologi", "bioteknologi", "genetik", "CRISPR",

    // Space & Astronomy
    "SpaceX och mars", "james webb teleskop", "exoplaneter", "svarta hål", "rymdstationer",
    "astronauter på månen", "satelliter", "meteoriter", "galaxer", "big bang",

    // Environmental Issues
    "klimatförändringar", "förnybar energi", "vindkraft och solceller", "elbilar", "hållbarhet",
    "återvinning och cirkulär ekonomi", "plast i haven", "regnskogarnas utrotning", "artutrotning", "greta thunberg",

    // Popular Culture
    "marvel cinematic universe", "star wars mandalorian", "stranger things", "squid game", "wednesday addams",
    "harry potter wizarding world", "pokemon generationer", "avatar", "one piece", "demon slayer hashira",

    // Music & Entertainment
    "spotify wrapped", "concert tours", "musikfestivaler", "taylor swift eras", "bad bunny",
    "k-pop grupper", "billie eilish", "the weeknd", "hip hop kultur", "elektronisk musik",

    // Food Trends
    "street food världen runt", "michelin restauranger", "vegetarisk mat", "vegansk mat", "sushi konst",
    "molekylär gastronomi", "food trucks", "matinfluencers", "tiktok recept", "internationella kök",

    // Adventure Sports
    "parkour", "freerunning", "klippklättring", "mountainbiking", "skateboard halfpipe",
    "snowboard tricks", "wakeboard", "kitesurfing", "bungyjump", "fallskärmshoppning",

    // Mythology & Lore
    "nordiska gudar", "grekiska hjältar", "egyptiska faraoner", "samurai kod", "riddare och turneringar",
    "vikingar", "azteker", "inkas", "kinesiska drakar", "japanska yokai",

    // Technology Careers
    "youtubers", "streamers", "game developers", "app makers", "web designers",
    "influencers", "podcasters", "fotografer", "video editors", "social media managers",

    // Mysteries & Paranormal
    "ufo och aliens", "bermudatriangeln", "spöken", "konspirationsteorier", "mysterier",
    "kryptozoologi", "tidsgåtor", "olösta brott", "arkeologiska fynd", "forntida civilisationer",

    // Economics & Business
    "företag starta", "aktier och börsen", "kryptovalutor", "nfts", "entrepreneurs",
    "tech startups", "elon musk", "jeff bezos", "apple", "google",

    // Additional themes
    "anime genrer", "manga art", "cosplay competitions", "comic con", "escape rooms",
    "laser tag", "paintball", "arkadspel", "retro gaming", "speedcubing"
  ],

  6: [
    // Anime & Manga
    "demon slayer andningstekniker", "one piece pirater", "naruto jutsu", "attack on titan", "my hero academia quirks",
    "jujutsu kaisen", "spy x family", "chainsaw man", "bleach", "dragon ball",

    // Advanced Gaming
    "minecraft command blocks", "roblox utveckling", "valorant ranks", "apex legends", "overwatch",
    "call of duty warzone", "fifa ultimate team", "pokemon competitive", "smash bros", "rocket league ranks",

    // Social Media Trends
    "tiktok algoritmer", "youtube shorts", "instagram growth", "snapchat stories", "discord nitro",
    "reddit communities", "twitter viral", "streaming på twitch", "podcast hosting", "content creation",

    // Sports Analytics
    "fotbollsstatistik", "fantasy premier league", "NBA fantasy", "sports betting odds", "esports turneringar",
    "champions league dragning", "världscupen", "transfer market", "player ratings", "match analytics",

    // Science & Innovation
    "kvantfysik", "relativitetsteori", "genetisk manipulation", "CRISPR teknologi", "artificiell intelligens",
    "neural nätverk", "kryptografi", "cybersäkerhet", "blockchain", "virtual reality",

    // Space Exploration
    "mars kolonisering", "james webb bilder", "svarta håls kollision", "interstellär resa", "wormholes",
    "dark matter", "multiverse teorier", "alien liv", "exoplaneter", "rymdturism",

    // Environmental Science
    "global uppvärmning", "klimatmodeller", "förnybar energi", "kärnkraft", "vätgasbränsle",
    "elektrifiering", "koldioxidavtryck", "hållbar utveckling", "cirkulär ekonomi", "biodiversitet",

    // Economics & Finance
    "aktiehandel", "kryptovalutor", "bitcoin", "ethereum", "NFT marknaden",
    "inflation", "räntor", "företagsekonomi", "startup finansiering", "börsindex",

    // Technology Giants
    "apple produkter", "tesla innovation", "spacex raketer", "google AI", "meta metaverse",
    "microsoft", "amazon", "nvidia grafikkort", "openai chatgpt", "tech billionaires",

    // Music Industry
    "spotify streams", "musikproduktion", "autotune", "music videos", "tiktok hits",
    "billboard charts", "grammy awards", "konsertturner", "musikfestivaler", "vinyl records",

    // Film & Series
    "marvel phase 5", "star wars series", "netflix originals", "hbo serier", "disney plus",
    "special effects", "cinematografi", "directors cut", "plot twists", "cinematic universe",

    // Fashion & Style
    "streetwear", "sneaker culture", "designer brands", "vintage kläder", "thrift shopping",
    "sustainable fashion", "fashion week", "influencer style", "y2k fashion", "haute couture",

    // Health & Fitness
    "gym träning", "crossfit", "yoga", "mental hälsa", "näringslära",
    "protein shakes", "kalorier", "träningsscheman", "personliga rekord", "fitness influencers",

    // Quirky Science
    "Kjell-Gunbritts laboratorium", "tokiga experiment", "explosioner", "kemiska reaktioner", "fysiklagar",
    "optiska illusioner", "paradoxer", "tankenötter", "vetenskapliga mysterier", "rekord",

    // Additional themes
    "esports lag", "game streaming", "speedrun rekord", "mod development", "server hosting",
    "competitive gaming", "lan parties", "gaming peripherals", "rgb setup", "dual monitors"
  ],

  7: [
    // Advanced Technology
    "AI språkmodeller", "machine learning algoritmer", "deep learning", "quantum computing", "blockchain teknologi",
    "cybersecurity threats", "ethical hacking", "cloud computing", "big data", "IoT devices",

    // Programming & Development
    "python programmering", "javascript frameworks", "app development", "game engines", "web3",
    "version control git", "API integration", "databases", "agile development", "open source",

    // Climate & Sustainability
    "klimatkrisen", "parisavtalet", "net zero emissions", "renewable energy", "carbon capture",
    "sustainable cities", "green technology", "circular economy", "biodiversity loss", "ocean acidification",

    // Space Science
    "james webb discoveries", "mars missions", "exoplanet hunting", "gravitational waves", "cosmic microwave background",
    "dark energy", "supernova explosions", "neutron stars", "interstellar travel", "dyson spheres",

    // Economics & Society
    "global ekonomi", "inflation och räntor", "arbetslöshet", "GDP", "ekonomiska kriser",
    "supply chain", "handelsavtal", "valutamarknaden", "central banker", "ekonomisk ojämlikhet",

    // Politics & Current Events
    "demokrati", "val och röstning", "FN", "EU", "geopolitik",
    "mänskliga rättigheter", "migration", "internationella konflikter", "fred och säkerhet", "diplomati",

    // Health & Medicine
    "vacciner och immunologi", "genetiska sjukdomar", "cancerforskning", "hjärnforskning", "mental hälsa",
    "antibiotika resistens", "pandemier", "medicinsk teknologi", "stamceller", "organ donation",

    // Social Media Impact
    "algorithm bias", "fake news", "social media påverkan", "privacy online", "digital wellbeing",
    "influencer ekonomi", "viral content", "echo chambers", "cancel culture", "online activism",

    // Entertainment Industry
    "streaming platforms", "box office", "film produktion", "special effects CGI", "music streaming ekonomi",
    "gaming industry", "esports salaries", "content creator ekonomi", "netflix algoritmer", "binge watching",

    // Sports Science
    "sports analytics", "player statistics", "tactical analysis", "VAR teknologi", "sports medicine",
    "performance optimization", "sports psychology", "doping", "sports ekonomi", "transfer market",

    // Philosophy & Ethics
    "AI etik", "bioetik", "miljöetik", "social justice", "fri vilja",
    "medvetande", "existentialism", "utilitarianism", "rättviseteorier", "moraliska dilemman",

    // Entrepreneurship
    "startup ecosystems", "venture capital", "business models", "disruption", "innovation",
    "pitch decks", "market fit", "scaling", "exits och IPO", "unicorn companies",

    // Digital Culture
    "meme ekonomi", "nft artwork", "metaverse platforms", "crypto gaming", "dao organisationer",
    "web3 revolution", "digital identity", "online communities", "virtual events", "e-sports betting",

    // Historical Analysis
    "historiska paralleller", "civilisationers uppgång och fall", "ekonomiska depressioner", "revolutioner", "världskrig",
    "kalla kriget", "imperialism", "kolonialism", "industriella revolutionen", "digitala revolutionen",

    // Additional themes
    "matematiska bevis", "statistisk analys", "probability theory", "game theory", "optimization problems",
    "linear algebra", "calculus applications", "mathematical modeling", "cryptography math", "number theory"
  ],

  8: [
    // Advanced Mathematics
    "differential equations", "integral calculus", "linear algebra applications", "matrix operations", "probability distributions",
    "statistical inference", "regression analysis", "optimization theory", "graph theory", "number theory",

    // Physics & Engineering
    "klassisk mekanik", "elektromagnetism", "termodynamik", "kvantmekanik", "relativitetsteori",
    "engineering design", "robotics", "aerospace", "renewable energy systems", "nanotechnology",

    // Computer Science
    "algorithms complexity", "data structures", "artificial neural networks", "computer vision", "natural language processing",
    "cybersecurity protocols", "distributed systems", "compiler design", "operating systems", "database theory",

    // Chemistry & Biology
    "organic chemistry", "biochemical pathways", "molecular biology", "genetics och DNA", "evolutionary biology",
    "ecology systems", "climate chemistry", "pharmaceutical development", "protein folding", "cellular processes",

    // Economics & Finance
    "makroekonomi", "mikroekonomi", "game theory applications", "market mechanisms", "financial derivatives",
    "risk management", "portfolio optimization", "economic models", "behavioral economics", "monetary policy",

    // Social Sciences
    "sociologi teorier", "psychology research", "cognitive science", "neuroscience", "linguistics",
    "political systems", "economic systems", "social structures", "cultural evolution", "demographic trends",

    // Global Issues
    "klimatförändringar data", "population growth", "resource scarcity", "energy transitions", "food security",
    "water crisis", "pandemic modeling", "inequality metrics", "migration patterns", "urbanization",

    // Technology & Innovation
    "quantum computers", "fusion energy", "gene editing", "brain-computer interfaces", "autonomous vehicles",
    "space colonization", "artificial general intelligence", "biotechnology", "materials science", "6G networks",

    // Philosophy & Logic
    "formal logic", "epistemology", "ontology", "ethics frameworks", "philosophy of mind",
    "philosophy of science", "metaphysics", "political philosophy", "aesthetics", "existentialism",

    // Research & Scientific Method
    "experimental design", "statistical significance", "peer review process", "research ethics", "data analysis",
    "hypothesis testing", "scientific models", "literature review", "meta-analysis", "reproducibility",

    // Environmental Systems
    "ecosystem modeling", "carbon cycles", "ocean currents", "atmospheric chemistry", "geological processes",
    "biodiversity indices", "conservation biology", "sustainable agriculture", "renewable resources", "pollution control",

    // Medical Science
    "epidemiology", "pharmacology", "immunology", "neuroscience research", "medical imaging",
    "clinical trials", "public health", "disease modeling", "drug development", "genetic medicine",

    // Business & Strategy
    "business analytics", "market analysis", "competitive strategy", "supply chain optimization", "operations research",
    "financial modeling", "risk assessment", "organizational behavior", "innovation management", "strategic planning",

    // Historical & Cultural Analysis
    "historical data analysis", "economic history", "scientific revolutions", "technological progress", "social movements",
    "cultural evolution", "civilization metrics", "war economics", "industrial development", "information age",

    // Additional themes
    "mathematical proofs", "algorithm optimization", "cryptographic systems", "network theory", "chaos theory",
    "fractal geometry", "topology", "combinatorics", "numerical methods", "computational modeling",
    "sports statistics", "gaming theory", "music mathematics", "architectural geometry", "art and mathematics"
  ],

  9: [
    // Advanced STEM
    "calculus of variations", "partial differential equations", "complex analysis", "abstract algebra", "real analysis",
    "topology theory", "measure theory", "functional analysis", "numerical analysis", "discrete mathematics",

    // Physics Research
    "quantum field theory", "general relativity", "particle physics", "string theory", "cosmology",
    "condensed matter physics", "plasma physics", "astrophysics", "nuclear physics", "statistical mechanics",

    // Engineering Systems
    "control systems", "signal processing", "fluid dynamics", "structural analysis", "materials engineering",
    "electrical circuits", "thermodynamics applications", "mechanical systems", "chemical engineering", "civil engineering",

    // Computer Science Theory
    "computational complexity", "automata theory", "formal languages", "computability theory", "algorithm design",
    "machine learning theory", "information theory", "cryptography theory", "parallel computing", "quantum algorithms",

    // Economics & Game Theory
    "microeconomic theory", "macroeconomic models", "econometrics", "game theory equilibria", "auction theory",
    "mechanism design", "contract theory", "market design", "behavioral game theory", "evolutionary game theory",

    // Research Mathematics
    "proof techniques", "mathematical logic", "set theory", "category theory", "algebraic geometry",
    "differential geometry", "lie groups", "representation theory", "homological algebra", "mathematical physics",

    // Advanced Chemistry
    "quantum chemistry", "chemical kinetics", "thermochemistry", "spectroscopy", "electrochemistry",
    "polymer chemistry", "catalysis", "coordination chemistry", "organic synthesis", "analytical chemistry",

    // Biology & Medicine
    "systems biology", "computational biology", "molecular genetics", "cell signaling", "developmental biology",
    "neurobiology", "microbiology", "virology", "cancer biology", "immunology",

    // Environmental Science
    "climate modeling", "atmospheric physics", "ocean dynamics", "ecosystem dynamics", "biogeochemical cycles",
    "environmental chemistry", "sustainability science", "conservation science", "pollution modeling", "renewable energy physics",

    // Philosophy & Logic
    "modal logic", "predicate logic", "proof theory", "model theory", "philosophy of mathematics",
    "philosophy of physics", "ethics and AI", "epistemology advanced", "metaphysics debates", "logic paradoxes",

    // Social Science Research
    "statistical methods", "causal inference", "experimental design", "survey methodology", "network analysis",
    "sociological theory", "psychological research", "political science", "anthropology", "cognitive science",

    // Finance & Economics
    "derivatives pricing", "portfolio theory", "risk management", "stochastic processes", "time series analysis",
    "financial econometrics", "asset pricing", "market microstructure", "behavioral finance", "corporate finance",

    // Technology Frontiers
    "quantum computing algorithms", "AI alignment", "brain-computer interfaces", "synthetic biology", "nanotechnology",
    "fusion reactor design", "space propulsion", "genetic engineering", "neuromorphic computing", "photonics",

    // Historical & Cultural Studies
    "economic history analysis", "historical demographics", "technological diffusion", "social network history", "cultural evolution",
    "scientific revolutions", "industrial transformations", "global trade patterns", "institutional development", "innovation systems",

    // Additional themes
    "olympiad mathematics", "university research", "thesis projects", "academic papers", "scientific conferences",
    "peer review", "research grants", "laboratory work", "field studies", "data collection",
    "statistical software", "programming in R", "matlab simulations", "python data science", "latex typesetting",
    "competitive programming", "hackathons", "science fairs", "research internships", "university applications"
  ]
};

// Get random themes for a grade level
export function getRandomThemes(gradeLevel: number, count: number = 12): string[] {
  const themes = themesByGrade[gradeLevel] || themesByGrade[6];
  const shuffled = [...themes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

// Get all themes for a grade level
export function getThemesForGrade(gradeLevel: number): string[] {
  return themesByGrade[gradeLevel] || themesByGrade[6];
}
