/**
 * Expanded theme library - 500 themes per grade level
 * Auto-generated comprehensive list
 */

const baseAnimals = ["katter", "hundar", "hästar", "grisar", "får", "kor", "kaniner", "hamstrar", "fiskar", "fåglar", "lejon", "tigrar", "elefanter", "giraffer", "zebror", "apor", "björnar", "vargar", "rävar", "igelkottar", "ekorrar", "möss", "råttor", "ormar", "ödlor", "sköldpaddor", "grodor", "fjärilar", "bin", "myror", "spindlar", "sniglar", "maskar", "hajar", "valar", "delfiner", "pingviner", "ugglor", "örnar", "papegojor", "pappersmöss", "älgar", "renar", "dovhjortar", "vildsvin", "grävlingar", "illrar", "hermelin"];
const baseFood = ["pizza", "hamburgare", "korv", "glass", "godis", "choklad", "tårta", "kakor", "bullar", "bröd", "ost", "smörgåsar", "pasta", "ris", "potatis", "pommes frites", "chicken nuggets", "fiskpinnar", "köttbullar", "tacos", "sushi", "pannkakor", "våfflor", "yoghurt", "frukt", "grönsaker", "juice", "läsk", "vatten", "mjölk", "smoothies", "popcorn", "chips", "ostbågar", "marshmallows", "donuts", "muffins", "brownies", "cupcakes"];
const baseToys = ["lego", "dockor", "bilar", "tåg", "pussel", "bollar", "spel", "gosedjur", "klossar", "byggset", "robotar", "drönare", "rc-bilar", "action figures", "barbiedockor", "leksaksvapen", "vattenpistol", "hoppborg", "studsmatta", "gungor", "rutschkanor", "sandlåda", "cyklar", "sparkcyklar", "skateboard", "rullskridskor"];
const baseActivities = ["fotboll", "basket", "simning", "åka skidor", "åka skridskor", "cykling", "löpning", "hoppa", "klättra", "dansa", "sjunga", "måla", "rita", "bygga", "leka", "läsa", "skriva", "räkna", "baka", "laga mat"];
const baseSeasons = ["vår", "sommar", "höst", "vinter", "regn", "snö", "sol", "vind", "åska", "is", "värme", "kyla"];
const baseSchool = ["klassrummet", "läraren", "eleverna", "boken", "pennan", "radergummit", "linjalen", "saxen", "limmet", "kritor", "färger", "papper", "häftet", "ryggsäcken", "matsäcken", "rasten", "lektionen", "läxan"];

function generateThemes(grade: number): string[] {
  const themes: string[] = [];
  const complexity = Math.min(grade, 9);
  
  // Base themes - only the good ones
  themes.push(...baseToys.slice(0, 10).map(t => `leka med ${t}`));
  
  // Popular culture (100)
  if (grade >= 2) {
    const games = ["minecraft", "roblox", "fortnite", "among us", "pokemon", "mario", "zelda", "sonic", "pac-man", "tetris"];
    const anime = ["demon slayer", "naruto", "one piece", "dragon ball", "my hero academia", "attack on titan", "pokemon", "digimon", "yu-gi-oh", "beyblade"];
    const movies = ["disney", "pixar", "marvel", "star wars", "harry potter", "frozen", "moana", "encanto", "toy story", "cars"];
    
    themes.push(...games.map(g => `${g} äventyr`));
    themes.push(...games.map(g => `bygga i ${g}`));
    if (grade >= 4) themes.push(...anime.map(a => `${a} karaktärer`));
    themes.push(...movies.map(m => `${m} filmerna`));
    themes.push(...movies.map(m => `${m} världen`));
  }
  
  // Sports (50)
  const sports = ["fotboll", "hockey", "basket", "tennis", "badminton", "golf", "bowling", "friidrott", "simning", "gymnastik"];
  themes.push(...sports.map(s => `spela ${s}`));
  themes.push(...sports.map(s => `${s}turneringar`));
  themes.push(...sports.map(s => `${s}lag och poäng`));
  
  // Science & Nature (80)
  if (grade >= 3) {
    const science = ["rymden", "planeter", "stjärnor", "galaxer", "astronauter", "raketer", "satelliter", "svarta hål", "månen", "mars"];
    const nature = ["vulkaner", "jordbävningar", "tsunamier", "tornador", "orkaner", "blixt", "åska", "regnbågar", "norrsken", "solar"];
    
    themes.push(...science.map(s => `${s} och universum`));
    themes.push(...nature.map(n => `${n} och naturkrafter`));
  }
  
  // Technology (60)
  if (grade >= 4) {
    const tech = ["datorer", "mobiler", "surfplattor", "robotar", "AI", "VR", "drönare", "spelkonsoler", "streamers", "youtubers"];
    themes.push(...tech.map(t => `${t} och teknik`));
    themes.push(...tech.map(t => `framtidens ${t}`));
  }
  
  // Quirky themes inspired by previous (60)
  if (grade >= 3) {
    const quirky = [
      "toaletter och badrum", "Kjell-Gunbritt bygger", "fängelse och fångar", "sopor och skräp",
      "trasiga saker", "konstiga maskiner", "udda jobb", "märkliga djur", "tokiga experiment",
      "snor och slem", "bajs och prutt", "ruttna saker", "äcklig mat", "konstig lukt",
      "klibbiga händer", "fuktig", "seg", "hal", "kladdig", "grumlig",
      "rostig", "möglig", "dammig", "grumlig vätska", "läckande rör"
    ];
    themes.push(...quirky);
    themes.push(...quirky.map(q => `${q} överallt`));
  }
  
  // Music & Entertainment (40)
  const music = ["pop", "rock", "rap", "elektronisk musik", "klassisk musik", "jazz", "blues", "country", "reggae", "metal"];
  themes.push(...music.map(m => `${m} och konserter`));
  
  // Countries & Travel (40)
  const countries = ["Sverige", "Norge", "Danmark", "Finland", "Island", "Tyskland", "Frankrike", "Spanien", "Italien", "England", "USA", "Japan", "Kina", "Australien", "Brasilien"];
  themes.push(...countries.slice(0, 10).map(c => `resa till ${c}`));
  
  // Skip boring everyday scenarios - use creative themes instead

  // More creative combinations (100)
  const creative = [
    "superhjältar", "dinosaurier", "drakar", "prinsessor", "riddare", "pirater", "ninja", "cowboys",
    "astronauter", "utomjordingar", "monster", "spöken", "vampyrer", "trollkarlar", "häxor",
    "feér", "enhörningar", "zombies", "robotar", "cyborgs", "mutanter", "jättar", "dvärgar",
    "magiska djur", "mytologiska varelser", "sjörövare", "ninjakrigare", "samurajer", "vikingar",
    "karatekämpar", "boxare", "wrestlers", "fotbollsstjärnor", "basketspelare", "racerförare",
    "skateboard", "BMX-cykel", "snowboard", "surfing", "parkour", "freerunning", "breakdance",
    "graffiti", "streetart", "skateparker", "lekplatser", "äventyrsparker", "tivoli",
    "godisfabriken", "chokladfabriken", "leksaksfabriken", "robotfabriken", "bilverkstad",
    "rymdstationen", "månbasen", "marskolonier", "utforskare", "äventyrare", "upptäcktsresande",
    "forskare", "uppfinnare", "ingenjörer", "arkitekter", "designers", "konstnärer",
    "musiker", "dansare", "akrobater", "cirkus", "magiker", "illusionister",
    "detektiver", "spioner", "agenter", "poliser", "brandmän", "läkare", "veterinärer",
    "djurskötare", "djurtränare", "hästskötare", "hunddagis", "kattkafé",
    "under vattnet", "i djuphavet", "bland korallrev", "tropiska öar", "öknen",
    "djungeln", "regnskogen", "savann", "arktis", "antarktis", "bergen", "vulkaner",
    "grottor", "skattjakt", "mysterier", "hemligheter", "gåtor", "utmaningar",
    "tävlingar", "olympiader", "mästerskap", "turneringar", "matcher"
  ];
  themes.push(...creative.slice(0, Math.min(creative.length, 500 - themes.length)));

  // Advanced tech & gaming (50 more if space)
  if (themes.length < 500) {
    const advanced = [
      "esport", "gaming", "streaming", "content creators", "influencers",
      "VR-världar", "AR-spel", "metaverse", "digital konst", "NFT",
      "kryptovaluta", "blockchain", "AI-robotar", "smarta hem", "elbilar",
      "solpaneler", "vindkraft", "miljö", "återvinning", "hållbarhet",
      "3D-printing", "hologram", "jetpack", "svävande brädor", "teleportering"
    ];
    themes.push(...advanced.slice(0, Math.min(advanced.length, 500 - themes.length)));
  }

  // Fill any remaining slots with creative combinations
  let combinationIndex = 0;
  const moreAnimals = ["drakar", "dinosaurier", "enhörningar", "monster", "robotar"];
  const coolPlaces = ["rymden", "månen", "djungeln", "öknen", "havet", "vulkanen", "slottet"];
  const coolActivities = ["äventyr", "skattkarta", "mysterium", "uppdrag", "tävling", "utmaning"];

  while (themes.length < 500) {
    const animal = combinationIndex % 2 === 0
      ? baseAnimals[combinationIndex % baseAnimals.length]
      : moreAnimals[combinationIndex % moreAnimals.length];
    const place = coolPlaces[combinationIndex % coolPlaces.length];
    const activity = coolActivities[combinationIndex % coolActivities.length];
    const game = ["minecraft", "roblox", "fortnite", "pokemon"][combinationIndex % 4];

    const combinations = [
      `${animal} i ${place}`,
      `${place}s${activity}`,
      `${game} ${place}`,
      `bygga i ${game}`,
      `jaga ${animal}`,
      `rädda ${animal}`,
      `tävla med ${animal}`,
      `utforska ${place}`,
      `${animal} och magi`,
      `${animal} och teknik`
    ];

    themes.push(combinations[combinationIndex % combinations.length]);
    combinationIndex++;
  }
  
  return themes.slice(0, 500);
}

export const themesByGrade: Record<number, string[]> = {
  1: generateThemes(1),
  2: generateThemes(2),
  3: generateThemes(3),
  4: generateThemes(4),
  5: generateThemes(5),
  6: generateThemes(6),
  7: generateThemes(7),
  8: generateThemes(8),
  9: generateThemes(9),
};

export function getRandomThemes(gradeLevel: number, count: number = 12): string[] {
  const themes = themesByGrade[gradeLevel] || themesByGrade[6];
  const shuffled = [...themes].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getThemesForGrade(gradeLevel: number): string[] {
  return themesByGrade[gradeLevel] || themesByGrade[6];
}
