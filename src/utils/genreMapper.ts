/**
 * Genre mapping and organization utilities
 * Maps Spotify genres to specific sub-genre folders for DJ organization
 */

/**
 * Specific sub-genre categories for organizing music
 * These are the actual folder names that will be created
 */
export enum MainGenre {
  // Techno sub-genres
  HARD_TECHNO = 'Hard Techno',
  MELODIC_TECHNO = 'Melodic Techno',
  PEAK_TIME_TECHNO = 'Peak Time Techno',
  INDUSTRIAL_TECHNO = 'Industrial Techno',
  ACID_TECHNO = 'Acid Techno',
  TECHNO = 'Techno',
  
  // House sub-genres
  TECH_HOUSE = 'Tech House',
  DEEP_HOUSE = 'Deep House',
  PROGRESSIVE_HOUSE = 'Progressive House',
  BASS_HOUSE = 'Bass House',
  FUTURE_HOUSE = 'Future House',
  G_HOUSE = 'G-House',
  ELECTRO_HOUSE = 'Electro House',
  SLAP_HOUSE = 'Slap House',
  TROPICAL_HOUSE = 'Tropical House',
  STUTTER_HOUSE = 'Stutter House',
  HOUSE = 'House',
  
  // Minimal & Deep Tech
  MINIMAL_DEEP_TECH = 'Minimal / Deep Tech',
  MICROHOUSE = 'Microhouse',
  
  // Electro & Breaks
  ELECTRO = 'Electro',
  BREAKBEAT = 'Breakbeat / Breaks',
  UK_GARAGE = 'UK Garage',
  BASSLINE = 'Bassline',
  
  // Drum & Bass sub-genres
  LIQUID_DNB = 'Liquid Drum & Bass',
  NEUROFUNK = 'Neurofunk',
  JUNGLE = 'Jungle',
  DRUM_AND_BASS = 'Drum & Bass',
  
  // Bass Music sub-genres
  DUBSTEP = 'Dubstep',
  RIDDIM = 'Riddim',
  DEATHSTEP = 'Deathstep',
  FUTURE_BASS = 'Future Bass',
  MELODIC_BASS = 'Melodic Bass',
  TRAP = 'Trap',
  BASS_MUSIC = 'Bass Music',
  
  // Trance
  PROGRESSIVE_TRANCE = 'Progressive Trance',
  PSYTRANCE = 'Psytrance',
  TECH_TRANCE = 'Tech Trance',
  TRANCE = 'Trance',
  
  // Hardcore & Hardstyle
  HARDSTYLE = 'Hardstyle',
  HARDCORE = 'Hardcore',
  
  // Downtempo & Chill
  DOWNTEMPO = 'Downtempo',
  CHILLSTEP = 'Chillstep',
  AMBIENT = 'Ambient',
  LOFI = 'Lo-Fi',
  
  // Disco & Funk
  DISCO = 'Disco',
  FRENCH_HOUSE = 'French House',
  FUNK = 'Funk',
  NU_DISCO = 'Nu Disco',
  
  // Hip Hop & Urban
  HIP_HOP = 'Hip Hop',
  TRAP_HIP_HOP = 'Trap (Hip Hop)',
  
  // Afro & Latin
  AFRO_HOUSE = 'Afro House',
  AMAPIANO = 'Amapiano',
  LATIN_HOUSE = 'Latin House',
  REGGAETON = 'Reggaeton',
  
  // Indie & Alternative
  INDIE_DANCE = 'Indie Dance',
  ALTERNATIVE = 'Alternative',
  
  OTHER = 'Other'
}

/**
 * Genre mapping from Spotify genres to specific sub-genre categories
 * PRIORITY ORDER: More specific genres first, then general ones
 */
const GENRE_MAPPINGS: Record<string, MainGenre> = {
  // TECHNO - Most specific first
  'hard techno': MainGenre.HARD_TECHNO,
  'hypertechno': MainGenre.HARD_TECHNO,
  'melodic techno': MainGenre.MELODIC_TECHNO,
  'peak time techno': MainGenre.PEAK_TIME_TECHNO,
  'industrial techno': MainGenre.INDUSTRIAL_TECHNO,
  'acid techno': MainGenre.ACID_TECHNO,
  'minimal techno': MainGenre.MINIMAL_DEEP_TECH,
  'techno': MainGenre.TECHNO,
  
  // HOUSE - Most specific first
  'tech house': MainGenre.TECH_HOUSE,
  'deep house': MainGenre.DEEP_HOUSE,
  'progressive house': MainGenre.PROGRESSIVE_HOUSE,
  'bass house': MainGenre.BASS_HOUSE,
  'future house': MainGenre.FUTURE_HOUSE,
  'g-house': MainGenre.G_HOUSE,
  'g house': MainGenre.G_HOUSE,
  'electro house': MainGenre.ELECTRO_HOUSE,
  'slap house': MainGenre.SLAP_HOUSE,
  'tropical house': MainGenre.TROPICAL_HOUSE,
  'stutter house': MainGenre.STUTTER_HOUSE,
  'french house': MainGenre.FRENCH_HOUSE,
  'disco house': MainGenre.FRENCH_HOUSE,
  'filter house': MainGenre.FRENCH_HOUSE,
  'afro house': MainGenre.AFRO_HOUSE,
  'latin house': MainGenre.LATIN_HOUSE,
  'house': MainGenre.HOUSE,
  
  // MINIMAL & DEEP TECH
  'minimal': MainGenre.MINIMAL_DEEP_TECH,
  'minimal tech house': MainGenre.MINIMAL_DEEP_TECH,
  'deep tech': MainGenre.MINIMAL_DEEP_TECH,
  'microhouse': MainGenre.MICROHOUSE,
  'micro house': MainGenre.MICROHOUSE,
  
  // ELECTRO & BREAKS
  'electro': MainGenre.ELECTRO,
  'electroclash': MainGenre.ELECTRO,
  'breakbeat': MainGenre.BREAKBEAT,
  'breaks': MainGenre.BREAKBEAT,
  'uk garage': MainGenre.UK_GARAGE,
  'speed garage': MainGenre.UK_GARAGE,
  'garage': MainGenre.UK_GARAGE,
  'uk funky': MainGenre.UK_GARAGE,
  'rally house': MainGenre.UK_GARAGE,
  'bassline': MainGenre.BASSLINE,
  
  // DRUM & BASS - Most specific first
  'liquid funk': MainGenre.LIQUID_DNB,
  'liquid dnb': MainGenre.LIQUID_DNB,
  'liquid drum and bass': MainGenre.LIQUID_DNB,
  'neurofunk': MainGenre.NEUROFUNK,
  'neuro': MainGenre.NEUROFUNK,
  'jungle': MainGenre.JUNGLE,
  'drum and bass': MainGenre.DRUM_AND_BASS,
  'dnb': MainGenre.DRUM_AND_BASS,
  'drumstep': MainGenre.DRUM_AND_BASS,
  
  // BASS MUSIC - Most specific first
  'riddim': MainGenre.RIDDIM,
  'deathstep': MainGenre.DEATHSTEP,
  'dubstep': MainGenre.DUBSTEP,
  'brostep': MainGenre.DUBSTEP,
  'future bass': MainGenre.FUTURE_BASS,
  'melodic bass': MainGenre.MELODIC_BASS,
  'trap': MainGenre.TRAP,
  'edm trap': MainGenre.TRAP,
  'bass music': MainGenre.BASS_MUSIC,
  'wave': MainGenre.BASS_MUSIC,
  
  // TRANCE
  'progressive trance': MainGenre.PROGRESSIVE_TRANCE,
  'uplifting trance': MainGenre.TRANCE,
  'psytrance': MainGenre.PSYTRANCE,
  'psy trance': MainGenre.PSYTRANCE,
  'tech trance': MainGenre.TECH_TRANCE,
  'trance': MainGenre.TRANCE,
  
  // HARDCORE & HARDSTYLE
  'hardstyle': MainGenre.HARDSTYLE,
  'hardcore': MainGenre.HARDCORE,
  'gabber': MainGenre.HARDCORE,
  'uk hardcore': MainGenre.HARDCORE,
  'uptempo hardcore': MainGenre.HARDCORE,
  
  // DOWNTEMPO & CHILL
  'downtempo': MainGenre.DOWNTEMPO,
  'chillout': MainGenre.DOWNTEMPO,
  'chill': MainGenre.DOWNTEMPO,
  'chillstep': MainGenre.CHILLSTEP,
  'ambient': MainGenre.AMBIENT,
  'trip hop': MainGenre.DOWNTEMPO,
  'lofi': MainGenre.LOFI,
  'lo-fi': MainGenre.LOFI,
  'witch house': MainGenre.DOWNTEMPO,
  
  // DISCO & FUNK
  'disco': MainGenre.DISCO,
  'nu disco': MainGenre.NU_DISCO,
  'funk': MainGenre.FUNK,
  'boogie': MainGenre.FUNK,
  
  // HIP HOP & URBAN
  'hip hop': MainGenre.HIP_HOP,
  'rap': MainGenre.HIP_HOP,
  'trap latino': MainGenre.TRAP_HIP_HOP,
  'urbano latino': MainGenre.TRAP_HIP_HOP,
  'french rap': MainGenre.HIP_HOP,
  
  // AFRO & LATIN
  'amapiano': MainGenre.AMAPIANO,
  'gqom': MainGenre.AMAPIANO,
  'afropiano': MainGenre.AMAPIANO,
  'reggaeton': MainGenre.REGGAETON,
  'moombahton': MainGenre.LATIN_HOUSE,
  'baile funk': MainGenre.LATIN_HOUSE,
  'brazilian bass': MainGenre.LATIN_HOUSE,
  'techengue': MainGenre.LATIN_HOUSE,
  
  // INDIE & ALTERNATIVE
  'indie dance': MainGenre.INDIE_DANCE,
  'alternative dance': MainGenre.INDIE_DANCE,
  'indie': MainGenre.ALTERNATIVE,
  'indie rock': MainGenre.ALTERNATIVE,
  
  // ELECTRONIC MISC
  'hyperpop': MainGenre.ALTERNATIVE,
  'big room': MainGenre.ELECTRO_HOUSE,
  'edm': MainGenre.OTHER,
  'electronic': MainGenre.OTHER,
  'melbourne bounce': MainGenre.ELECTRO_HOUSE,
  'bounce': MainGenre.ELECTRO_HOUSE,
};

/**
 * Map Spotify genres to the MOST SPECIFIC sub-genre category
 * Prioritizes exact matches and specific sub-genres over general ones
 */
export function mapGenresToMainGenre(spotifyGenres: string[]): MainGenre {
  if (!spotifyGenres || spotifyGenres.length === 0) {
    return MainGenre.OTHER;
  }

  let bestMatch: MainGenre = MainGenre.OTHER;
  let bestMatchSpecificity = 0;

  // Try each Spotify genre
  for (const genre of spotifyGenres) {
    const normalized = genre.toLowerCase().trim();
    
    // 1. Try EXACT match first (highest priority)
    if (GENRE_MAPPINGS[normalized]) {
      const matchedGenre = GENRE_MAPPINGS[normalized];
      const specificity = getGenreSpecificity(matchedGenre);
      
      if (specificity > bestMatchSpecificity) {
        bestMatch = matchedGenre;
        bestMatchSpecificity = specificity;
      }
    }
    
    // 2. Try partial matches (e.g., "melodic techno remix" contains "melodic techno")
    for (const [key, value] of Object.entries(GENRE_MAPPINGS)) {
      if (normalized.includes(key)) {
        const specificity = getGenreSpecificity(value);
        
        if (specificity > bestMatchSpecificity) {
          bestMatch = value;
          bestMatchSpecificity = specificity;
        }
      }
    }
  }

  return bestMatch;
}

/**
 * Determine specificity of a genre (higher = more specific)
 * More specific genres should be preferred over general ones
 */
function getGenreSpecificity(genre: MainGenre): number {
  // Most specific sub-genres (score 100+)
  const highlySpecific = [
    MainGenre.HARD_TECHNO, MainGenre.MELODIC_TECHNO, MainGenre.INDUSTRIAL_TECHNO,
    MainGenre.STUTTER_HOUSE, MainGenre.G_HOUSE, MainGenre.BASS_HOUSE,
    MainGenre.LIQUID_DNB, MainGenre.NEUROFUNK, MainGenre.RIDDIM, MainGenre.DEATHSTEP,
    MainGenre.AMAPIANO, MainGenre.PSYTRANCE
  ];
  
  // Moderately specific (score 50-99)
  const moderatelySpecific = [
    MainGenre.TECH_HOUSE, MainGenre.DEEP_HOUSE, MainGenre.PROGRESSIVE_HOUSE,
    MainGenre.UK_GARAGE, MainGenre.JUNGLE, MainGenre.DUBSTEP, MainGenre.FUTURE_BASS,
    MainGenre.BREAKBEAT, MainGenre.HARDSTYLE, MainGenre.AFRO_HOUSE
  ];
  
  // General categories (score 10-49)
  const general = [
    MainGenre.TECHNO, MainGenre.HOUSE, MainGenre.DRUM_AND_BASS, 
    MainGenre.TRANCE, MainGenre.ELECTRO, MainGenre.BASS_MUSIC
  ];
  
  if (highlySpecific.includes(genre)) return 100;
  if (moderatelySpecific.includes(genre)) return 50;
  if (general.includes(genre)) return 25;
  if (genre === MainGenre.OTHER) return 0;
  
  return 10; // Default for other genres
}

/**
 * Get all genres from array and pick the MOST SPECIFIC one
 * Prioritizes specific electronic sub-genres
 */
export function selectBestGenre(genres: string[]): MainGenre {
  if (!genres || genres.length === 0) {
    return MainGenre.OTHER;
  }

  return mapGenresToMainGenre(genres);
}

/**
 * Generate folder path based on genre
 * Example: /Volumes/DRIVE/MUSIC LIBRARY/Techno
 */
export function getGenreFolderPath(basePath: string, genres?: string[]): string {
  const mainGenre = genres ? selectBestGenre(genres) : MainGenre.OTHER;
  return `${basePath}/${mainGenre}`;
}

/**
 * Get all main genres (for UI/display purposes)
 */
export function getAllMainGenres(): MainGenre[] {
  return Object.values(MainGenre);
}

export default {
  mapGenresToMainGenre,
  selectBestGenre,
  getGenreFolderPath,
  getAllMainGenres,
  MainGenre
};
