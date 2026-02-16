// 120 Unique Italian Brainrot Characters with ASCII Art
// Organized by theme and rarity

export interface CollectibleSeed {
  name: string;
  ascii_art: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  pronunciation?: string; // Optional: text to speak instead of name (for correct pronunciation)
}

export const collectibles: CollectibleSeed[] = [
  // ==========================================
  // FOOD THEME (30 characters)
  // ==========================================

  // Common Food (12)
  {
    name: "Spaghettino Jumpero",
    ascii_art: `    ~~~~~
   ( o  o )
    \\____/
   /|    |\\
    |    |
   _|    |_`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Pizzarello Dancino",
    ascii_art: `    /^^^^\\
   /      \\
  | o    o |
  |   <>   |
   \\______/
    \\    /`,
    price: 110,
    rarity: 'common'
  },
  {
    name: "Gelato Spinnerino",
    ascii_art: `     ,--,
    /    \\
   | ^  ^ |
   |  \\/  |
    \\____/
     |__|`,
    price: 105,
    rarity: 'common'
  },
  {
    name: "Panino Bouncero",
    ascii_art: `   ========
  /        \\
 |  =    =  |
 |    __    |
  \\________/
   ~~~~~~~~`,
    price: 115,
    rarity: 'common'
  },
  {
    name: "Biscottini Rollero",
    ascii_art: `    .---.
   /     \\
  |  O O  |
  |  ---  |
   \\_____/
     \\_/`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Focaccino Hoppero",
    ascii_art: `  ,-------,
 /  o   o  \\
|    ___    |
|   |   |   |
 \\_________/`,
    price: 120,
    rarity: 'common'
  },
  {
    name: "Patatino Fritto",
    ascii_art: `    | | |
    |_|_|
   /     \\
  | o   o |
  |  ___  |
   \\_____/`,
    price: 110,
    rarity: 'common'
  },
  {
    name: "Granita Freezino",
    ascii_art: `    *  *
   ******
  |      |
  | ^  ^ |
  |  \\/  |
  |______|`,
    price: 125,
    rarity: 'common'
  },
  {
    name: "Cioccolato Meltino",
    ascii_art: `   ~~~~~
  |     |
  | @ @ |
  |  o  |
  |_____|
   drip`,
    price: 130,
    rarity: 'common'
  },
  {
    name: "Cornetto Twirlo",
    ascii_art: `     /\\
    /  \\
   / oo \\
  /  \\/  \\
 /________\\`,
    price: 115,
    rarity: 'common'
  },
  {
    name: "Bruschetta Crunchino",
    ascii_art: `  .======.
 /   o o  \\
|    ---   |
|  ~~~~~~  |
 \\________/`,
    price: 120,
    rarity: 'common'
  },
  {
    name: "Arancino Ballero",
    ascii_art: `    ,---.
   /  o  \\
  |   o   |
  |  \\_/  |
   \\_____/
     \\_/`,
    price: 125,
    rarity: 'common'
  },

  // Rare Food (10)
  {
    name: "Lasagnator Supremo",
    ascii_art: `   =========
  |  layer  |
  |=========|
  |  o   o  |
  |   ___   |
  |=========|
  |  layer  |
   =========`,
    price: 200,
    rarity: 'rare'
  },
  {
    name: "Cannolini Blastero",
    ascii_art: `     _____
   //     \\\\
  ||  @ @  ||
  ||   o   ||
  || \\___/ ||
   \\\\     //
     -----`,
    price: 220,
    rarity: 'rare'
  },
  {
    name: "Tiramisudo Flipperino",
    ascii_art: `   .-------.
  |  ~~~~~  |
  | /     \\ |
  || o   o ||
  ||  ---  ||
  | \\_____/ |
   '-------'`,
    price: 250,
    rarity: 'rare'
  },
  {
    name: "Espressino Zoomero",
    ascii_art: `     ___
    |   |
   /|   |\\
  | | * | |
  | | o | |
   \\|___|/
    |___|
     ^^^`,
    price: 280,
    rarity: 'rare'
  },
  {
    name: "Raviolino Pocketino",
    ascii_art: `    /\\  /\\
   /  \\/  \\
  |  o  o  |
  |   __   |
   \\______/
    \\_  _/
      \\/`,
    price: 230,
    rarity: 'rare'
  },
  {
    name: "Gnocchetto Squishino",
    ascii_art: `     ___
   _/   \\_
  |  *  *  |
  |   ()   |
  |  \\__/  |
   \\_____/
     bump`,
    price: 240,
    rarity: 'rare'
  },
  {
    name: "Cappuccino Foamero",
    ascii_art: `    ~~~~~
   ( ~~~ )
  |       |
  | O   O |
  |  ---  |
  |_______|
    |   |`,
    price: 260,
    rarity: 'rare'
  },
  {
    name: "Proscuittino Slicero",
    ascii_art: `   ~~~~~~
  /      \\
 | \\    / |
 |  oooo  |
 |  \\__/  |
  \\______/
   ~~~~~~`,
    price: 270,
    rarity: 'rare'
  },
  {
    name: "Mozzarellino Stretchero",
    ascii_art: `    .---.
   /     \\
  |  o o  |
  |  ~~~  |
   \\     /
    |   |
    |___|`,
    price: 290,
    rarity: 'rare'
  },
  {
    name: "Risottino Creamero",
    ascii_art: `    ,---.
   /~~~~~\\
  | o   o |
  | ~~~~~ |
  |  \\_/  |
   \\_____/
    \\___/`,
    price: 300,
    rarity: 'rare'
  },

  // Epic Food (5)
  {
    name: "Gnocchinator Maximus",
    ascii_art: `      ___
    _/   \\_
   / * * * \\
  |  ^   ^  |
  |    o    |
  |  \\___/  |
  |_________|
   \\_______/
     POWER`,
    price: 450,
    rarity: 'epic'
  },
  {
    name: "Prosciuttino Legendaro",
    ascii_art: `   ~~~~~~~~
  /   ****   \\
 |  \\      / |
 |   \\    /  |
 |    oooo   |
 |    \\__/   |
  \\__________/
    SUPREME`,
    price: 480,
    rarity: 'epic'
  },
  {
    name: "Risottimus Powerino",
    ascii_art: `     .---.
    /~*~*~\\
   /~~~~~~~\\
  |  O   O  |
  | ~~~~~~~ |
  |  \\___/  |
   \\_______/
    \\_____/
     CREAM`,
    price: 500,
    rarity: 'epic'
  },
  {
    name: "Bruschettador Ultimato",
    ascii_art: `    ========
   /  ****  \\
  / o      o \\
 |    ----    |
 |  ~~~~~~~~  |
  \\__________/
    CRUNCH
     \\__/`,
    price: 520,
    rarity: 'epic'
  },
  {
    name: "Tortellinator Magnus",
    ascii_art: `     _____
   _/ *** \\_
  /  \\   /  \\
 | o  \\ /  o |
 |     V     |
 |   \\___/   |
  \\_________/
    FILLED`,
    price: 550,
    rarity: 'epic'
  },

  // Legendary Food (3)
  {
    name: "Carbonarion Eternalis",
    ascii_art: `      *****
     /     \\
    /  ***  \\
   /=========\\
  |   O   O   |
  |   ~~~~~   |
  |   \\___/   |
  |===========|
   \\  pasta  /
    \\_______/
     ETERNAL
      \\___/`,
    price: 1200,
    rarity: 'legendary'
  },
  {
    name: "Raviolissimo Cosmico",
    ascii_art: `    *  *  *
     \\ | /
   ___\\|/___
  /   ***   \\
 |  O     O  |
 |    ***    |
 |   \\___/   |
  \\_________/
   /       \\
  *  COSMIC  *`,
    price: 1500,
    rarity: 'legendary'
  },
  {
    name: "Fettuccinator Infinitus",
    ascii_art: `     ~~~~~~
    /      \\
   / ****** \\
  |  ~~~~~~  |
  | O      O |
  |  ~~~~~~  |
  |  \\____/  |
  |  ~~~~~~  |
   \\________/
    INFINITY
     ~~~~~~`,
    price: 1800,
    rarity: 'legendary'
  },

  // ==========================================
  // ANIMAL THEME (25 characters)
  // ==========================================

  // Common Animals (10)
  {
    name: "Gattino Purrero",
    ascii_art: `   /\\_/\\
  ( o.o )
   > ^ <
  /|   |\\
   |   |`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Cagnolino Barkero",
    ascii_art: `    /\\__
   (o  o )
   /    |
  / |  ||
 /__|  ||_`,
    price: 110,
    rarity: 'common'
  },
  {
    name: "Pesciolino Swimmo",
    ascii_art: `    ><>
   >o o<
  ><   ><
   >___<
    ><>`,
    price: 105,
    rarity: 'common'
  },
  {
    name: "Uccellino Chirpo",
    ascii_art: `    ___
   (o o)
  <(   )>
    | |
   _|_|_`,
    price: 115,
    rarity: 'common'
  },
  {
    name: "Coniglietto Hoppino",
    ascii_art: `   (\\__/)
   (o o )
   (>  <)
    |  |
   _|__|_`,
    price: 120,
    rarity: 'common'
  },
  {
    name: "Ranocchio Ribbito",
    ascii_art: `   @..@
  (----)
 ( >  < )
  \\----/
   |__|`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Topolino Squeako",
    ascii_art: `   ()_()
  (o . o)
   (> <)
   / | \\
  /_|_|_\\`,
    price: 110,
    rarity: 'common'
  },
  {
    name: "Tartarughino Slowmo",
    ascii_art: `    _____
   /     \\
  | o   o |
  |__   __|
 /______\\`,
    price: 125,
    rarity: 'common'
  },
  {
    name: "Apetto Buzzino",
    ascii_art: `   \\_  _/
   (o  o)
  <|~~~~|>
   |    |
   /\\  /\\`,
    price: 130,
    rarity: 'common'
  },
  {
    name: "Farfallino Fluttero",
    ascii_art: `  \\ | /
   \\|/
   (o)
   /|\\
  / | \\`,
    price: 115,
    rarity: 'common'
  },

  // Rare Animals (8)
  {
    name: "Polpetto Tentaclino",
    ascii_art: `     ___
    /   \\
   | o o |
   |  o  |
   /|||||\\
  / ||||| \\
    |||||`,
    price: 220,
    rarity: 'rare'
  },
  {
    name: "Draghetto Flamero",
    ascii_art: `      /\\
     /  \\
    / oo \\
   <  \\/  >
    \\ -- /
   / |  | \\
  /__|  |__\\`,
    price: 280,
    rarity: 'rare'
  },
  {
    name: "Unicornino Sparklo",
    ascii_art: `      /\\
     /  |
    /   |
   / oo  \\
  (  \\/   )
   \\____/
    |  |`,
    price: 300,
    rarity: 'rare'
  },
  {
    name: "Fenicotto Pinkino",
    ascii_art: `      __
     /  \\
    / oo |
   |  /  |
    \\|   |
     |   |
     |___|`,
    price: 260,
    rarity: 'rare'
  },
  {
    name: "Coccodrillo Snappero",
    ascii_art: `    ______
   /      \\
  | o    o |
   \\VVVVVV/
    \\____/
     |__|`,
    price: 240,
    rarity: 'rare'
  },
  {
    name: "Pinguino Waddelino",
    ascii_art: `     ___
    /   \\
   | o o |
   |  o  |
   /\\___/\\
  |  |_|  |
   \\_____/`,
    price: 270,
    rarity: 'rare'
  },
  {
    name: "Gufo Hootino",
    ascii_art: `    ,___,
   (O   O)
   |  ^  |
   | /|\\ |
    \\___/
    _|_|_`,
    price: 250,
    rarity: 'rare'
  },
  {
    name: "Elefantino Trumpetto",
    ascii_art: `     ___
    /   \\
   | o o |
   |  ___|
   | /
   |/____
    \\____\\`,
    price: 290,
    rarity: 'rare'
  },

  // Epic Animals (5)
  {
    name: "Leoncino Roarimus",
    ascii_art: `     *****
    * o o *
   *   ^   *
   *  ---  *
    * ___ *
     *****
    /     \\
   |  ROAR |`,
    price: 420,
    rarity: 'epic'
  },
  {
    name: "Aquilador Soarino",
    ascii_art: `     ,  ,
    /|  |\\
   / | o| \\
  /  |  |  \\
 /   |--|   \\
      ||
     _||_
    SOAR`,
    price: 480,
    rarity: 'epic'
  },
  {
    name: "Tigretto Stripimus",
    ascii_art: `    _____
   / === \\
  | o = o |
  | === |
   \\= = /
   /|===|\\
  / |===| \\
    STRIPE`,
    price: 500,
    rarity: 'epic'
  },
  {
    name: "Squalo Bitero Maximus",
    ascii_art: `      __
     /  \\__
    / o    \\
   |   ___  |
    \\/VVV\\/
      \\__/
     /    \\
    CHOMP`,
    price: 550,
    rarity: 'epic'
  },
  {
    name: "Delfino Flipperus",
    ascii_art: `       __
      /  \\
     / oo \\
    |   /  |
     \\__|  |
        |  /
       _|_/
      SPLASH`,
    price: 460,
    rarity: 'epic'
  },

  // Legendary Animals (2)
  {
    name: "Phoenixino Eternaflame",
    ascii_art: `      ***
     *****
    ** O **
   **  ^  **
   * \\___/ *
    *******
   /   |   \\
  /  FIRE   \\
 *   BIRD   *
  ***********`,
    price: 1400,
    rarity: 'legendary'
  },
  {
    name: "Dragonissimo Cosmicus",
    ascii_art: `       /\\
      /**\\
     / ** \\
    /  OO  \\
   <   \\/   >
    \\  --  /
   / |    | \\
  /__| ** |__\\
     |    |
    LEGEND`,
    price: 2000,
    rarity: 'legendary'
  },

  // ==========================================
  // OBJECT THEME (25 characters)
  // ==========================================

  // Common Objects (10)
  {
    name: "Lampino Glowero",
    ascii_art: `    ___
   /   \\
  |  *  |
  |_____|
    | |
   _|_|_`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Sedietto Sittino",
    ascii_art: `   _____
  |     |
  | o o |
  |_____|
  |  |  |
  |__|__|`,
    price: 110,
    rarity: 'common'
  },
  {
    name: "Libretto Readero",
    ascii_art: `  _______
 /       \\
| o     o |
|   ---   |
|_________|
  \\___/`,
    price: 105,
    rarity: 'common'
  },
  {
    name: "Pennino Writero",
    ascii_art: `     /\\
    /  \\
   /    \\
  | o  o |
   \\____/
    |__|`,
    price: 115,
    rarity: 'common'
  },
  {
    name: "Orologino Ticko",
    ascii_art: `   .---.
  /     \\
 | 12 o  |
 |9   o3 |
 |   6   |
  \\_____/`,
    price: 120,
    rarity: 'common'
  },
  {
    name: "Telefono Ringero",
    ascii_art: `  _______
 |   _   |
 |  |o|  |
 |  |o|  |
 |  |_|  |
 |_______|`,
    price: 130,
    rarity: 'common'
  },
  {
    name: "Ombrellino Rainero",
    ascii_art: `    ___
  _/   \\_
 /  o o  \\
|   ---   |
 \\_______/
    | |`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Tazzino Sippero",
    ascii_art: `   _____
  |     |_
  | o o | |
  |  u  | |
  |_____|/`,
    price: 110,
    rarity: 'common'
  },
  {
    name: "Chiavino Unlockero",
    ascii_art: `    ___
   |   |
   | o |
   |___|
     |
    ooo`,
    price: 115,
    rarity: 'common'
  },
  {
    name: "Stellino Twinklo",
    ascii_art: `     *
    /|\\
   / | \\
  *--o--*
   \\ | /
    \\|/
     *`,
    price: 125,
    rarity: 'common'
  },

  // Rare Objects (8)
  {
    name: "Pianoforte Melodino",
    ascii_art: `   ________
  |  ||||  |
  | o    o |
  |  \\__/  |
  |________|
   ||    ||
   ||    ||`,
    price: 240,
    rarity: 'rare'
  },
  {
    name: "Violino Stringero",
    ascii_art: `      __
     /  \\
    / oo \\
   |  \\/  |
    \\    /
     |  |
    /|  |\\
   / |__| \\`,
    price: 260,
    rarity: 'rare'
  },
  {
    name: "Rocketino Blastero",
    ascii_art: `     /\\
    /  \\
   / oo \\
  |  \\/  |
  |______|
  | |  | |
   \\|  |/
    ^^^^`,
    price: 300,
    rarity: 'rare'
  },
  {
    name: "Robotino Beepero",
    ascii_art: `   _____
  |[o o]|
  |  _  |
  | |=| |
  |_|_|_|
   || ||`,
    price: 280,
    rarity: 'rare'
  },
  {
    name: "Televisionino Screenero",
    ascii_art: `   _______
  |   _   |
  |  |o|  |
  |  |_|  |
  |_______|
    || ||`,
    price: 250,
    rarity: 'rare'
  },
  {
    name: "Machinina Vroomero",
    ascii_art: `    ____
   /    \\
  | o  o |
  |______|
  O-|  |-O
    \\__/`,
    price: 270,
    rarity: 'rare'
  },
  {
    name: "Trombetta Tootero",
    ascii_art: `        __
   ____/  \\
  | o o    |
  |  \\/   /
   \\____  \\
        \\__/`,
    price: 220,
    rarity: 'rare'
  },
  {
    name: "Tamburo Boomero",
    ascii_art: `   _____
  /     \\
 |  o o  |
 |  ---  |
 |_______|
  \\_____/
    ||`,
    price: 230,
    rarity: 'rare'
  },

  // Epic Objects (5)
  {
    name: "Computerino Processimus",
    ascii_art: `   _________
  |  _____  |
  | | o o | |
  | | --- | |
  | |_____| |
  |_________|
    ||   ||
   CPU PWR`,
    price: 450,
    rarity: 'epic'
  },
  {
    name: "Diamantino Sparklemax",
    ascii_art: `      /\\
     /  \\
    /****\\
   / O  O \\
  /   \\/   \\
  \\________/
    SHINE`,
    price: 550,
    rarity: 'epic'
  },
  {
    name: "Coronino Royalus",
    ascii_art: `   ^ ^ ^
  |*|*|*|
  |o   o|
  | --- |
   \\___/
   KING`,
    price: 500,
    rarity: 'epic'
  },
  {
    name: "Astronavino Spacerus",
    ascii_art: `       /\\
      /  \\
     / ** \\
    / o  o \\
   |   \\/   |
   |________|
   /| |  | |\\
    | |  | |
   LAUNCH`,
    price: 580,
    rarity: 'epic'
  },
  {
    name: "Castelloforte Guardino",
    ascii_art: `  |~|  |~|
  | |  | |
  |o|__|o|
  |  --  |
  |______|
  CASTLE`,
    price: 520,
    rarity: 'epic'
  },

  // Legendary Objects (2)
  {
    name: "Galaxiano Infinitus",
    ascii_art: `    * * *
   *     *
  *  ***  *
 *  * O *  *
 *  * ^ *  *
  *  ***  *
   *     *
    * * *
   GALAXY
  *********`,
    price: 1600,
    rarity: 'legendary'
  },
  {
    name: "Portalerium Dimensius",
    ascii_art: `     ****
   **    **
  *  ****  *
 *  * OO *  *
 *  * \\/ *  *
  *  ****  *
   **    **
     ****
    PORTAL
   INFINITY`,
    price: 1900,
    rarity: 'legendary'
  },

  // ==========================================
  // ABSTRACT THEME (20 characters)
  // ==========================================

  // Common Abstract (8)
  {
    name: "Cuoricino Lovero",
    ascii_art: `   /\\ /\\
  /  V  \\
 | o   o |
  \\  ^  /
   \\___/`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Nuvolarino Floato",
    ascii_art: `    ___
  _/   \\_
 /  o o  \\
(   ---   )
 \\_______/`,
    price: 110,
    rarity: 'common'
  },
  {
    name: "Fiammino Burnero",
    ascii_art: `    /\\
   /  \\
  / oo \\
 |  \\/  |
  \\____/
    ^^`,
    price: 115,
    rarity: 'common'
  },
  {
    name: "Gocciolino Drippero",
    ascii_art: `     __
    /  \\
   / oo \\
  |  \\/  |
   \\_  _/
     \\/`,
    price: 105,
    rarity: 'common'
  },
  {
    name: "Fulmino Zappero",
    ascii_art: `    /\\
   /  \\
  / oo/
 |   /
  \\_/`,
    price: 120,
    rarity: 'common'
  },
  {
    name: "Spiralino Twirlo",
    ascii_art: `    @
   @ @
  @ o @
 @  ^  @
  @ @ @
   @@@`,
    price: 125,
    rarity: 'common'
  },
  {
    name: "Bubblino Poppero",
    ascii_art: `   O o O
  o     o
 O  o o  O
  o  ^  o
   O o O`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Smileyno Happero",
    ascii_art: `    ___
   /   \\
  | ^ ^ |
  |  o  |
   \\___/
    \\_/`,
    price: 110,
    rarity: 'common'
  },

  // Rare Abstract (7)
  {
    name: "Arcobaleno Rainbowus",
    ascii_art: `     ___
   _/   \\_
  / o   o \\
 | ------- |
 | ~~~~~~~ |
  \\_______/
   COLORS`,
    price: 280,
    rarity: 'rare'
  },
  {
    name: "Cristallino Shinero",
    ascii_art: `     /\\
    /  \\
   / ** \\
  / o  o \\
 |   \\/   |
  \\_____/
    GEM`,
    price: 300,
    rarity: 'rare'
  },
  {
    name: "Temporino Ticktocko",
    ascii_art: `    _____
   /  |  \\
  / o | o \\
 |   -|-   |
  \\___|___/
    TIME`,
    price: 250,
    rarity: 'rare'
  },
  {
    name: "Magnetino Attracto",
    ascii_art: `   N   S
   |   |
   | o |
   | ^ |
   |___|
  MAGNET`,
    price: 240,
    rarity: 'rare'
  },
  {
    name: "Energino Powerus",
    ascii_art: `    ****
   * OO *
  *  \\/  *
   *    *
    ****
   ENERGY`,
    price: 270,
    rarity: 'rare'
  },
  {
    name: "Illusionino Trickero",
    ascii_art: `    ???
   ?   ?
  ? o o ?
  ?  ^  ?
   ?   ?
    ???`,
    price: 290,
    rarity: 'rare'
  },
  {
    name: "Fantasmino Spookero",
    ascii_art: `    ___
   /   \\
  | o o |
  |  o  |
   \\   /
    ~~~`,
    price: 260,
    rarity: 'rare'
  },

  // Epic Abstract (3)
  {
    name: "Cosmicino Universalis",
    ascii_art: `   * * *
  *  *  *
 * O   O *
 *   ^   *
  *  *  *
   * * *
  COSMIC
  WONDER`,
    price: 480,
    rarity: 'epic'
  },
  {
    name: "Infinitino Loopus",
    ascii_art: `    ____
   /    \\
  | o  o |__
  |  \\/  |  |
   \\____/__/
    LOOP
   FOREVER`,
    price: 520,
    rarity: 'epic'
  },
  {
    name: "Quantumino Probabilis",
    ascii_art: `    ?/?
   / | \\
  | O|O |
  |  |  |
   \\ | /
    ?\\?
  QUANTUM`,
    price: 560,
    rarity: 'epic'
  },

  // Legendary Abstract (2)
  {
    name: "Eternitino Timeflux",
    ascii_art: `     ***
    *   *
   * *** *
  * * O * *
  * * ^ * *
   * *** *
    *   *
     ***
   ETERNAL
    FLUX`,
    price: 1700,
    rarity: 'legendary'
  },
  {
    name: "Voidius Absolutus",
    ascii_art: `    .....
   .     .
  .  . .  .
 .  . O .  .
 .  . ^ .  .
  .  . .  .
   .     .
    .....
    VOID
   ITSELF`,
    price: 1850,
    rarity: 'legendary'
  },

  // ==========================================
  // FANTASY THEME (20 characters)
  // ==========================================

  // Common Fantasy (10)
  {
    name: "Maghetto Spellino",
    ascii_art: `    /\\
   /  \\
  | oo |
  | \\/ |
   \\__/
    ||`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Fatino Wishero",
    ascii_art: `   \\*/
   (o o)
   | ^ |
   /| |\\
  / | | \\`,
    price: 115,
    rarity: 'common'
  },
  {
    name: "Elfino Pointyero",
    ascii_art: `    /|
   / |
  | oo |
  | \\/ |
   \\__/`,
    price: 110,
    rarity: 'common'
  },
  {
    name: "Goblinetto Sneako",
    ascii_art: `    ___
   /   \\
  |>o o<|
  |  v  |
   \\___/
    |||`,
    price: 105,
    rarity: 'common'
  },
  {
    name: "Stregonino Potiono",
    ascii_art: `    /\\
   /  \\
  | oo |
  | ~~ |
   \\__/
   /~~\\`,
    price: 120,
    rarity: 'common'
  },
  {
    name: "Trollino Grumpero",
    ascii_art: `    ___
   /   \\
  | >< |
  | -- |
   \\__/
   / \\`,
    price: 100,
    rarity: 'common'
  },
  {
    name: "Gnometto Diggero",
    ascii_art: `    /\\
   /  \\
  |o  o|
  | -- |
   \\__/
    ||`,
    price: 125,
    rarity: 'common'
  },
  {
    name: "Spiritino Ghostero",
    ascii_art: `   ___
  /   \\
 | o o |
 |  ~  |
  \\_._/`,
    price: 130,
    rarity: 'common'
  },
  {
    name: "Pixelino Glitcho",
    ascii_art: `  [][][]
 []o  o[]
 []    []
  [][][]
   [][]`,
    price: 115,
    rarity: 'common'
  },
  {
    name: "Sireno Singo",
    ascii_art: `    ~~~
   (o o)
  >(   )<
   >~~~<
    ><>`,
    price: 110,
    rarity: 'common'
  },

  // Rare Fantasy (5)
  {
    name: "Centauro Gallopino",
    ascii_art: `      /|
     / |
    | oo |
    | -- |
   /|____|\\
  / |    | \\
    ||  ||`,
    price: 280,
    rarity: 'rare'
  },
  {
    name: "Minotauro Hornero",
    ascii_art: `    / \\
   |   |
   | O O |
   | --- |
    \\___/
    /   \\
   |     |`,
    price: 300,
    rarity: 'rare'
  },
  {
    name: "Griffino Clawero",
    ascii_art: `     /\\
    /  \\
   / OO \\
  <  \\/  >
   \\____/
   /|  |\\
    |__|`,
    price: 260,
    rarity: 'rare'
  },
  {
    name: "Meduserino Snakero",
    ascii_art: `   ~~~~
  ~~~~~~
 |  O O  |
 |   o   |
  \\_____/
    ~~~`,
    price: 290,
    rarity: 'rare'
  },
  {
    name: "Cerberetto Triheado",
    ascii_art: `   /\\ /\\ /\\
  |oo|oo|oo|
   \\/|\\/|\\/
     |||
    /|||\\`,
    price: 320,
    rarity: 'rare'
  },

  // Epic Fantasy (3)
  {
    name: "Demoniaco Infernus",
    ascii_art: `    /| |\\
   / | | \\
  | O   O |
  |  \\_/  |
   \\_____/
    /   \\
   DEMON`,
    price: 480,
    rarity: 'epic'
  },
  {
    name: "Angelicus Divinero",
    ascii_art: `     __
    /  \\
   / OO \\
  |  \\/  |
  |______|
  \\  /\\  /
   \\/  \\/
   ANGEL`,
    price: 550,
    rarity: 'epic'
  },
  {
    name: "Titanicus Colossus",
    ascii_art: `    _____
   |     |
   | O O |
   | === |
   |_____|
   /|   |\\
  / |   | \\
    TITAN`,
    price: 520,
    rarity: 'epic'
  },

  // Legendary Fantasy (2)
  {
    name: "Olympicus Godissimo",
    ascii_art: `      ***
     * O *
    *  ^  *
   *  ---  *
    *     *
     *****
    /     \\
   / DIVINE\\
  ***********`,
    price: 1750,
    rarity: 'legendary'
  },
  {
    name: "Primordius Ancientus",
    ascii_art: `    .....
   . *** .
  . *   * .
 .  * O *  .
 .  * ^ *  .
  . *   * .
   . *** .
    .....
   ANCIENT
    POWER`,
    price: 1950,
    rarity: 'legendary'
  },
  {
    name: "Ariana Velocissima",
    ascii_art: `    *** *** ***
     \\  |  /
   ___\\ | /___
  /   \\|/   \\
 /   >>O>>   \\
|    /   \\    |
|   /     \\   |
 \\  ~SPEED~  /
  \\_________/
   ~~~||||~~~
    11 GOLD
     ITALIA`,
    price: 1888,
    rarity: 'legendary',
    pronunciation: 'Ariána Velotchíssima'
  },

  // ==========================================
  // SECRET (1 character) - Ultimate rarity
  // ==========================================
  {
    name: "Bajsalero Bajsala",
    ascii_art: `    @@@@@@
   @  ~~  @
  @  @@@@  @
  @ @@  @@ @
   @ ~~~~ @
    \\    /
     \\  /
      \\/
    ~~~~~~`,
    price: 2000,
    rarity: 'mythic', // Note: Migration 022 changes this to 'secret' in DB
    pronunciation: 'Bajaléro Bajsalà' // Phonetic spelling for Italian TTS
  },
  {
    name: "Pruttalero Pruttala",
    ascii_art: `   ~~~***~~~
  ~ PRRRRT ~
 ~  *****  ~
  ~ ~~~~~ ~
   ~~~ ~~~
    ( O )
    / | \\
   /  |  \\
  TORNADO
   POWER`,
    price: 2500,
    rarity: 'secret',
    pronunciation: 'Pruttàlero Pruttàla'
  },
  {
    name: "Sittalero Sittala",
    ascii_art: `   _______
  |  ZzZ  |
  | /---\\ |
  ||  O  ||
  || /|\\ ||
  ||_/ \\_||
 _|_________|_
 ULTIMATE
   SITTING
   MASTER`,
    price: 2200,
    rarity: 'secret',
    pronunciation: 'Sittàlero Sittàla'
  },
  {
    name: "Glassalero Glassala",
    ascii_art: `    @@@@@@
   @@@**@@@
  @@@@**@@@@
   @@@**@@@
    @@**@@
     \\**/ 
      \\/
      ||
    ======
   MAXIMUM
    GLASS`,
    price: 2300,
    rarity: 'secret',
    pronunciation: 'Glassàlero Glassàla'
  },
  {
    name: "Bockalero Bockala",
    ascii_art: `   /\\   /\\
  (  \\_/  )
  |  O O  |
  |   ^   |
   \\ === /
    |||||
   /| | |\\
  / | | | \\
 LEGENDARY
   GOAT`,
    price: 2400,
    rarity: 'secret',
    pronunciation: 'Bockàlero Bockàla'
  },
  {
    name: "Fiscilera Ficlila",
    ascii_art: `    *NYPP*
   /  ||  \\
  |   ||   |
   \\  **  /
    \\ ** /
     \\**/
    TRICKY
    FINGER
   MASTER`,
    price: 2600,
    rarity: 'secret',
    pronunciation: 'Fitchilèra Fitchlìla'
  }
];

// Function to seed collectibles into database
export function seedCollectibles(db: {
  run: (sql: string, params?: unknown[]) => void;
  get: <T>(sql: string, params?: unknown[]) => T | undefined;
}) {
  // Check if we already have 120 collectibles
  const count = db.get<{ count: number }>('SELECT COUNT(*) as count FROM collectibles');
  if (count && count.count >= 120) {
    console.log('Collectibles already seeded (120+ found)');
    return;
  }

  // Clear existing collectibles and child_collectibles for fresh seed
  db.run('DELETE FROM child_collectibles');
  db.run('DELETE FROM collectibles');

  // Insert all collectibles with generated IDs
  for (const collectible of collectibles) {
    // Generate ID from name: lowercase, replace spaces with underscores
    const id = collectible.name.toLowerCase().replace(/ /g, '_').replace(/'/g, '');
    db.run(
      'INSERT INTO collectibles (id, name, ascii_art, price, rarity, pronunciation) VALUES (?, ?, ?, ?, ?, ?)',
      [id, collectible.name, collectible.ascii_art, collectible.price, collectible.rarity, collectible.pronunciation || null]
    );
  }

  console.log(`Seeded ${collectibles.length} collectibles`);
}
