// LOTR Italian Expansion Pack - 50 Characters
// Lord of the Rings characters with Italian brainrot names

export interface LotrCollectibleSeed {
  name: string;
  ascii_art: string;
  svg_path: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  expansion_pack: string;
  pronunciation: string;
}

export const lotrCollectibles: LotrCollectibleSeed[] = [
  // ==========================================
  // THE FELLOWSHIP (9 characters)
  // ==========================================
  {
    name: "Frodino Bagolini",
    ascii_art: `    .---.
   /     \\
  | o   o |
  |   ^   |
   \\_____/
    /   \\
   RING`,
    svg_path: "/portraits/lotr/frodo.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Frodino Bagolini"
  },
  {
    name: "Samuccio Ortolano",
    ascii_art: `    .---.
   / ~~~ \\
  | o   o |
  |  ___  |
   \\_____/
    TATERS`,
    svg_path: "/portraits/lotr/sam.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Samuccio Ortolano"
  },
  {
    name: "Merrino Festoso",
    ascii_art: `    .---.
   /     \\
  | ^   ^ |
  |  \\_/  |
   \\_____/
    MERRY`,
    svg_path: "/portraits/lotr/merry.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Merrino Festoso"
  },
  {
    name: "Pippino Birichino",
    ascii_art: `    .---.
   /     \\
  | o   o |
  |  \\_/  |
   \\_____/
   SECOND
  BREAKFAST`,
    svg_path: "/portraits/lotr/pippin.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Pippino Birichino"
  },
  {
    name: "Gandalfo Grigiastro",
    ascii_art: `      /\\
     /  \\
    / OO \\
   |  \\/  |
   | ~~~~ |
    \\____/
     |  |
    WIZARD`,
    svg_path: "/portraits/lotr/gandalf.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Gandalfo Grigiastro"
  },
  {
    name: "Aragornello Saltimbocca",
    ascii_art: `    .---.
   /  ~  \\
  | O   O |
  |  ---  |
   \\_____/
    /| |\\
   KING`,
    svg_path: "/portraits/lotr/aragorn.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Aragornello Saltimbocca"
  },
  {
    name: "Legolasso Verdino",
    ascii_art: `    /| |\\
   / | | \\
  | O   O |
  |   ^   |
   \\_____/
     BOW`,
    svg_path: "/portraits/lotr/legolas.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Legolasso Verdino"
  },
  {
    name: "Gimlino Barbone",
    ascii_art: `    .---.
   /~~~~~\\
  | O   O |
  | ~~~~~ |
  | ~~~~~ |
   \\_____/
     AXE`,
    svg_path: "/portraits/lotr/gimli.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Gimlino Barbone"
  },
  {
    name: "Boromiro Mortadellone",
    ascii_art: `    .---.
   /     \\
  | O   O |
  |  ---  |
   \\_____/
    HORN
   OF GONDOR`,
    svg_path: "/portraits/lotr/boromir.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Boromiro Mortadellone"
  },

  // ==========================================
  // ELVES (5 characters)
  // ==========================================
  {
    name: "Galadrielina Luminosa",
    ascii_art: `      ***
     *   *
    * O O *
   *   ^   *
    *  ~  *
     *****
    LIGHT`,
    svg_path: "/portraits/lotr/galadriel.svg",
    price: 3000,
    rarity: 'mythic',
    expansion_pack: "lotr-italian",
    pronunciation: "Galadrielina Luminosa"
  },
  {
    name: "Elrondino Rigatoni",
    ascii_art: `    /| |\\
   / | | \\
  | O   O |
  |  ---  |
   \\_____/
   RIVENDELL`,
    svg_path: "/portraits/lotr/elrond.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Elrondino Rigatoni"
  },
  {
    name: "Arwenella Tramontina",
    ascii_art: `    .---.
   /  ~  \\
  | O   O |
  |   ^   |
   \\_____/
   EVENSTAR`,
    svg_path: "/portraits/lotr/arwen.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Arwenella Tramontina"
  },
  {
    name: "Glorfindelino Aureo",
    ascii_art: `    /| |\\
   / *** \\
  | O   O |
  |  \\_/  |
   \\_____/
    GOLDEN`,
    svg_path: "/portraits/lotr/glorfindel.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Glorfindelino Aureo"
  },
  {
    name: "Haldirino Sentinella",
    ascii_art: `    /| |\\
   /     \\
  | o   o |
  |  ---  |
   \\_____/
    LORIEN`,
    svg_path: "/portraits/lotr/haldir.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Haldirino Sentinella"
  },

  // ==========================================
  // ROHAN (4 characters)
  // ==========================================
  {
    name: "Eowynetta Scudiera",
    ascii_art: `    .---.
   /  ~  \\
  | O   O |
  |  ---  |
   \\_____/
   SHIELDMAIDEN`,
    svg_path: "/portraits/lotr/eowyn.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Eowynetta Scudiera"
  },
  {
    name: "Eomerello Cavalcatore",
    ascii_art: `    .---.
   / ~~~ \\
  | O   O |
  |  ---  |
   \\_____/
    HORSE
    LORD`,
    svg_path: "/portraits/lotr/eomer.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Eomerello Cavalcatore"
  },
  {
    name: "Teodenio Regaletto",
    ascii_art: `    .---.
   / *** \\
  | O   O |
  | ~~~~~ |
   \\_____/
    KING
   OF ROHAN`,
    svg_path: "/portraits/lotr/theoden.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Teodenio Regaletto"
  },
  {
    name: "Grimaccio Viscido",
    ascii_art: `    .---.
   / ~~~ \\
  |>o   o<|
  |  ---  |
   \\_____/
  WORMTONGUE`,
    svg_path: "/portraits/lotr/grima.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Grimaccio Viscido"
  },

  // ==========================================
  // GONDOR (3 characters)
  // ==========================================
  {
    name: "Faramiro Pecorino",
    ascii_art: `    .---.
   /     \\
  | O   O |
  |  ---  |
   \\_____/
   CAPTAIN
   QUALITY`,
    svg_path: "/portraits/lotr/faramir.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Faramiro Pecorino"
  },
  {
    name: "Denethorino Pazzo",
    ascii_art: `    .---.
   / *** \\
  |>O   O<|
  |  ---  |
   \\_____/
   STEWARD
    MAD`,
    svg_path: "/portraits/lotr/denethor.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Denethorino Pazzo"
  },
  {
    name: "Celebornino Argentino",
    ascii_art: `    /| |\\
   / ~~~ \\
  | O   O |
  |   ^   |
   \\_____/
    SILVER`,
    svg_path: "/portraits/lotr/celeborn.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Celebornino Argentino"
  },

  // ==========================================
  // VILLAINS (8 characters)
  // ==========================================
  {
    name: "Sauronaccio Fiammeggiante",
    ascii_art: `      ***
     *****
    ** O **
   **  ^  **
    *******
     *****
      ***
    DARK LORD`,
    svg_path: "/portraits/lotr/sauron.svg",
    price: 3000,
    rarity: 'mythic',
    expansion_pack: "lotr-italian",
    pronunciation: "Sauronaccio Fiammeggiante"
  },
  {
    name: "Sarumanno Biancaccio",
    ascii_art: `      /\\
     /  \\
    / OO \\
   |  ---  |
   | ~~~~ |
    \\____/
    WHITE
    HAND`,
    svg_path: "/portraits/lotr/saruman.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Sarumanno Biancaccio"
  },
  {
    name: "Stregonaccio Angmarino",
    ascii_art: `    .---.
   /XXXXX\\
  |       |
  |  \\_/  |
   \\_____/
   WITCH
    KING`,
    svg_path: "/portraits/lotr/witch-king.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Stregonaccio Angmarino"
  },
  {
    name: "Gollumaccio Squamoso",
    ascii_art: `    .---.
   /     \\
  |O     O|
  |   o   |
   \\_____/
   PRECIOUS`,
    svg_path: "/portraits/lotr/gollum.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Gollumaccio Squamoso"
  },
  {
    name: "Shelobba Velenosa",
    ascii_art: `   /|   |\\
  / |   | \\
 /  |ooo|  \\
    |   |
   /|   |\\
  SPIDER`,
    svg_path: "/portraits/lotr/shelob.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Shelobba Velenosa"
  },
  {
    name: "Lurtzaccio Brutalone",
    ascii_art: `    .---.
   /XXXXX\\
  | O   O |
  | VVVVV |
   \\_____/
    URUK`,
    svg_path: "/portraits/lotr/lurtz.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Lurtzaccio Brutalone"
  },
  {
    name: "Balrogaccio Fuocoso",
    ascii_art: `    /| |\\
   / *** \\
  |** O **|
  | ~~~~~ |
   \\_____/
    FLAME
   OF UDUN`,
    svg_path: "/portraits/lotr/balrog.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Balrogaccio Fuocoso"
  },
  {
    name: "Boccalone Sauroniano",
    ascii_art: `    .---.
   /XXXXX\\
  |       |
  | OOOOO |
   \\_____/
   MOUTH OF
    SAURON`,
    svg_path: "/portraits/lotr/mouth-of-sauron.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Boccalone Sauroniano"
  },

  // ==========================================
  // ORCS (5 characters)
  // ==========================================
  {
    name: "Nazgulino Ombreggiante",
    ascii_art: `    .---.
   /XXXXX\\
  |       |
  |  ---  |
   \\_____/
   WRAITH`,
    svg_path: "/portraits/lotr/nazgul.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Nazgulino Ombreggiante"
  },
  {
    name: "Gothmoggo Orcolaccio",
    ascii_art: `    .---.
   /XXXXX\\
  |>O   O<|
  | VVVVV |
   \\_____/
    ORC
   CAPTAIN`,
    svg_path: "/portraits/lotr/gothmog.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Gothmoggo Orcolaccio"
  },
  {
    name: "Grishnacchio Fetido",
    ascii_art: `    .---.
   /     \\
  |>o   o<|
  | vvvvv |
   \\_____/
    ORC`,
    svg_path: "/portraits/lotr/grishnakh.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Grishnacchio Fetido"
  },
  {
    name: "Ugluccio Capitano",
    ascii_art: `    .---.
   / XXX \\
  | O   O |
  | VVVVV |
   \\_____/
    URUK
    HAI`,
    svg_path: "/portraits/lotr/ugluk.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Ugluccio Capitano"
  },
  {
    name: "Shagratino Guardiano",
    ascii_art: `    .---.
   /     \\
  |>o   o<|
  | ~~~~ |
   \\_____/
   TOWER
   GUARD`,
    svg_path: "/portraits/lotr/shagrat.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Shagratino Guardiano"
  },

  // ==========================================
  // ENTS & NATURE (4 characters)
  // ==========================================
  {
    name: "Barbalbero Frondoso",
    ascii_art: `    /\\  /\\
   /  \\/  \\
  | O    O |
  |  ~~~~  |
   \\______/
    |    |
   TREEBEARD`,
    svg_path: "/portraits/lotr/treebeard.svg",
    price: 3000,
    rarity: 'mythic',
    expansion_pack: "lotr-italian",
    pronunciation: "Barbalbero Frondoso"
  },
  {
    name: "Frassinello Veloce",
    ascii_art: `    /\\  /\\
   /  \\/  \\
  | o    o |
  |  ~~~~  |
   \\______/
   QUICKBEAM`,
    svg_path: "/portraits/lotr/quickbeam.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Frassinello Veloce"
  },
  {
    name: "Salicone Malvagio",
    ascii_art: `    /\\~~~/\\
   /  ~~~  \\
  | >o   o< |
  |  ~~~~~  |
   \\______/
    OLD MAN
    WILLOW`,
    svg_path: "/portraits/lotr/old-man-willow.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Salicone Malvagio"
  },
  {
    name: "Gorbagaccio Traditore",
    ascii_art: `    .---.
   /     \\
  |>o   o<|
  | ~~~~ |
   \\_____/
   TRAITOR
    ORC`,
    svg_path: "/portraits/lotr/gorbag.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Gorbagaccio Traditore"
  },

  // ==========================================
  // WIZARDS & SPECIAL (4 characters)
  // ==========================================
  {
    name: "Radagastino Selvaggio",
    ascii_art: `      /\\
     /  \\
    / OO \\
   |  \\/  |
   | ~~~~ |
    \\____/
    BROWN
    WIZARD`,
    svg_path: "/portraits/lotr/radagast.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Radagastino Selvaggio"
  },
  {
    name: "Tommasino Cantarello",
    ascii_art: `    .---.
   / ~~~ \\
  | ^   ^ |
  |  \\_/  |
   \\_____/
    TOM
   BOMBADIL`,
    svg_path: "/portraits/lotr/tom-bombadil.svg",
    price: 3000,
    rarity: 'mythic',
    expansion_pack: "lotr-italian",
    pronunciation: "Tommasino Cantarello"
  },
  {
    name: "Bacchetta Dorina",
    ascii_art: `    .---.
   / ~~~ \\
  | O   O |
  |   ^   |
   \\_____/
   GOLDBERRY`,
    svg_path: "/portraits/lotr/goldberry.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Bacchetta Dorina"
  },
  {
    name: "Smeagolino Pescatore",
    ascii_art: `    .---.
   /     \\
  |O     O|
  |  \\_/  |
   \\_____/
   SMEAGOL
    FISH`,
    svg_path: "/portraits/lotr/smeagol.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Smeagolino Pescatore"
  },

  // ==========================================
  // HOBBITS & SHIRE (3 characters)
  // ==========================================
  {
    name: "Bilbino Borsaiolo",
    ascii_art: `    .---.
   /     \\
  | o   o |
  |  \\_/  |
   \\_____/
    THERE
   AND BACK`,
    svg_path: "/portraits/lotr/bilbo.svg",
    price: 500,
    rarity: 'epic',
    expansion_pack: "lotr-italian",
    pronunciation: "Bilbino Borsaiolo"
  },
  {
    name: "Rosinella Fiorita",
    ascii_art: `    .---.
   / ~~~ \\
  | O   O |
  |  \\_/  |
   \\_____/
    ROSIE
    COTTON`,
    svg_path: "/portraits/lotr/rosie-cotton.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Rosinella Fiorita"
  },
  {
    name: "Contadinello Fungoso",
    ascii_art: `    .---.
   / ~~~ \\
  | o   o |
  |  ---  |
   \\_____/
    FARMER
    MAGGOT`,
    svg_path: "/portraits/lotr/farmer-maggot.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Contadinello Fungoso"
  },

  // ==========================================
  // HORSES & CREATURES (3 characters)
  // ==========================================
  {
    name: "Ombrafulmine Bianchino",
    ascii_art: `      /\\
     /  \\
    / oo \\
   |  \\/  |
    \\____/
    /|  |\\
   SHADOWFAX`,
    svg_path: "/portraits/lotr/shadowfax.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Ombrafulmine Bianchino"
  },
  {
    name: "Billuccio Asinetto",
    ascii_art: `     /\\
    /  \\
   / oo \\
  |  --  |
   \\____/
    BILL
   THE PONY`,
    svg_path: "/portraits/lotr/bill-the-pony.svg",
    price: 150,
    rarity: 'common',
    expansion_pack: "lotr-italian",
    pronunciation: "Billuccio Asinetto"
  },
  {
    name: "Trollone Cavernoso",
    ascii_art: `    .---.
   /     \\
  | O   O |
  | VVVVV |
  |_______|
   /     \\
   CAVE
   TROLL`,
    svg_path: "/portraits/lotr/cave-troll.svg",
    price: 300,
    rarity: 'rare',
    expansion_pack: "lotr-italian",
    pronunciation: "Trollone Cavernoso"
  },

  // ==========================================
  // ANCIENT KINGS (2 characters)
  // ==========================================
  {
    name: "Elendilino Fondatore",
    ascii_art: `    .---.
   / *** \\
  | O   O |
  |  ---  |
   \\_____/
   ELENDIL
   FOUNDER`,
    svg_path: "/portraits/lotr/elendil.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Elendilino Fondatore"
  },
  {
    name: "Isilduraccio Maledetto",
    ascii_art: `    .---.
   / *** \\
  | O   O |
  |  ---  |
   \\_____/
   ISILDUR
    CURSED`,
    svg_path: "/portraits/lotr/isildur.svg",
    price: 1500,
    rarity: 'legendary',
    expansion_pack: "lotr-italian",
    pronunciation: "Isilduraccio Maledetto"
  }
];

// Function to seed LOTR collectibles into database
export function seedLotrCollectibles(db: {
  run: (sql: string, params?: unknown[]) => { changes: number };
  get: <T>(sql: string, params?: unknown[]) => T | undefined;
}) {
  // Check if we already have LOTR expansion collectibles
  const count = db.get<{ count: number }>(
    "SELECT COUNT(*) as count FROM collectibles WHERE expansion_pack = 'lotr-italian'"
  );
  if (count && count.count >= 50) {
    console.log('LOTR expansion collectibles already seeded (50 found)');
    return;
  }

  // Insert all LOTR collectibles with generated IDs
  let inserted = 0;
  for (const collectible of lotrCollectibles) {
    // Generate ID from name: lowercase, replace spaces with underscores
    const id = 'lotr_' + collectible.name.toLowerCase().replace(/ /g, '_').replace(/'/g, '');

    // Check if this collectible already exists
    const existing = db.get<{ id: string }>(
      'SELECT id FROM collectibles WHERE id = ?',
      [id]
    );

    if (!existing) {
      db.run(
        `INSERT INTO collectibles (id, name, ascii_art, price, rarity, pronunciation, svg_path, expansion_pack)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          collectible.name,
          collectible.ascii_art,
          collectible.price,
          collectible.rarity,
          collectible.pronunciation,
          collectible.svg_path,
          collectible.expansion_pack
        ]
      );
      inserted++;
    }
  }

  console.log(`Seeded ${inserted} LOTR expansion collectibles`);
}
