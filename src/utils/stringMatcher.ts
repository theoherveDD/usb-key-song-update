/**
 * String matching utilities for comparing track titles
 * Ensures we download the correct track from Beatport
 */

/**
 * Calculate Levenshtein distance between two strings
 * Returns number of edits needed to transform one string into another
 */
function levenshteinDistance(str1: string, str2: string): number {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix: number[][] = [];

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Normalize a string for comparison:
 * - Convert to lowercase
 * - Remove special characters
 * - Remove extra whitespace
 * - Remove common suffixes like (Extended Mix), [feat. Artist], etc.
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .replace(/[\(\[].*?[\)\]]/g, '') // Remove content in parentheses/brackets
    .replace(/[^\w\s]/g, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract mix type from title (Extended Mix, Radio Edit, etc.)
 */
export function extractMixType(title: string): string | null {
  const mixPatterns = [
    /\(extended mix\)/i,
    /\(original mix\)/i,
    /\(radio edit\)/i,
    /\(club mix\)/i,
    /\(dub mix\)/i,
    /\(instrumental\)/i,
    /\[extended mix\]/i,
    /\[original mix\]/i,
    /\[radio edit\]/i,
    /- extended mix/i,
    /- original mix/i,
    /- radio edit/i
  ];

  for (const pattern of mixPatterns) {
    const match = title.match(pattern);
    if (match) {
      return match[0].replace(/[\(\)\[\]\-]/g, '').trim();
    }
  }

  return null;
}

/**
 * Calculate similarity score between two strings (0-1, where 1 is identical)
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const normalized1 = normalizeString(str1);
  const normalized2 = normalizeString(str2);

  // Exact match after normalization
  if (normalized1 === normalized2) {
    return 1.0;
  }

  // Calculate Levenshtein distance
  const distance = levenshteinDistance(normalized1, normalized2);
  const maxLength = Math.max(normalized1.length, normalized2.length);

  // Convert distance to similarity score
  return 1 - (distance / maxLength);
}

/**
 * Check if two tracks match based on artist and title
 * Returns true if similarity is above threshold
 */
export function isTrackMatch(
  spotifyArtist: string,
  spotifyTitle: string,
  beatportArtist: string,
  beatportTitle: string,
  minSimilarity: number = 0.75 // 75% similarity required
): boolean {
  const artistSimilarity = calculateSimilarity(spotifyArtist, beatportArtist);
  const titleSimilarity = calculateSimilarity(spotifyTitle, beatportTitle);

  // Both artist and title must meet minimum similarity
  return artistSimilarity >= minSimilarity && titleSimilarity >= minSimilarity;
}

/**
 * Find best match from a list of search results
 * Returns the index of the best match, or -1 if no good match found
 * Now uses result.number to return the actual track number from search results
 */
export function findBestMatch(
  spotifyArtist: string,
  spotifyTitle: string,
  searchResults: Array<{ artist: string; title: string; number?: number }>,
  minSimilarity: number = 0.75
): number {
  let bestMatchIndex = -1;
  let bestScore = 0;

  searchResults.forEach((result, index) => {
    const artistSimilarity = calculateSimilarity(spotifyArtist, result.artist);
    const titleSimilarity = calculateSimilarity(spotifyTitle, result.title);
    
    // Combined score (weighted: title is MORE important than artist for electronic music)
    // Title: 70%, Artist: 30% - because remixes/versions are critical
    const combinedScore = (titleSimilarity * 0.7) + (artistSimilarity * 0.3);

    if (combinedScore > bestScore && 
        artistSimilarity >= minSimilarity && 
        titleSimilarity >= minSimilarity) {
      bestScore = combinedScore;
      bestMatchIndex = index;
    }
  });

  return bestMatchIndex;
}

/**
 * Check if title contains "Extended Mix" or similar variations
 */
export function isExtendedMix(title: string): boolean {
  const extendedPatterns = [
    /extended\s*mix/i,
    /ext\s*mix/i,
    /extended\s*version/i,
    /club\s*mix/i
  ];

  return extendedPatterns.some(pattern => pattern.test(title));
}

/**
 * Check if title is an Original Mix
 */
export function isOriginalMix(title: string): boolean {
  const originalPatterns = [
    /original\s*mix/i,
    /original\s*version/i
  ];

  return originalPatterns.some(pattern => pattern.test(title));
}

/**
 * Check if title is a Radio Edit
 */
export function isRadioEdit(title: string): boolean {
  const radioPatterns = [
    /radio\s*edit/i,
    /radio\s*version/i,
    /radio\s*mix/i
  ];

  return radioPatterns.some(pattern => pattern.test(title));
}

/**
 * Determine mix type priority (lower = better)
 * Extended Mix = 1, Original Mix = 2, Radio Edit = 3, Unknown = 4
 */
export function getMixTypePriority(title: string): number {
  if (isExtendedMix(title)) return 1;
  if (isOriginalMix(title)) return 2;
  if (isRadioEdit(title)) return 3;
  return 4; // Unknown/other
}

/**
 * Find best match with mix type priority: Extended Mix > Original Mix > Radio Edit
 * Returns the index of the best match, considering both similarity AND mix type preference
 */
export function findBestMatchWithMixPriority(
  spotifyArtist: string,
  spotifyTitle: string,
  searchResults: Array<{ artist: string; title: string; number?: number }>,
  minSimilarity: number = 0.75
): number {
  // First, filter only matching tracks
  const matchingResults = searchResults
    .map((result, index) => ({ ...result, originalIndex: index }))
    .filter(result => {
      const artistSimilarity = calculateSimilarity(spotifyArtist, result.artist);
      const titleSimilarity = calculateSimilarity(spotifyTitle, result.title);
      const combinedScore = (titleSimilarity * 0.7) + (artistSimilarity * 0.3);
      return combinedScore >= minSimilarity && artistSimilarity >= minSimilarity && titleSimilarity >= minSimilarity;
    });

  if (matchingResults.length === 0) {
    return -1;
  }

  // Sort by mix type priority (Extended > Original > Radio Edit)
  matchingResults.sort((a, b) => {
    const priorityA = getMixTypePriority(a.title);
    const priorityB = getMixTypePriority(b.title);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB; // Lower priority number = better
    }
    
    // If same priority, prefer higher similarity
    const similarityA = (calculateSimilarity(spotifyArtist, a.artist) * 0.3) + 
                        (calculateSimilarity(spotifyTitle, a.title) * 0.7);
    const similarityB = (calculateSimilarity(spotifyArtist, b.artist) * 0.3) + 
                        (calculateSimilarity(spotifyTitle, b.title) * 0.7);
    
    return similarityB - similarityA; // Higher similarity = better
  });

  return matchingResults[0].originalIndex;
}

/**
 * Prefer extended mix if available in search results (DEPRECATED - use findBestMatchWithMixPriority)
 */
export function preferExtendedMix(
  searchResults: Array<{ title: string; artist: string }>,
  spotifyArtist: string,
  spotifyTitle: string,
  minSimilarity: number = 0.75
): number {
  return findBestMatchWithMixPriority(spotifyArtist, spotifyTitle, searchResults, minSimilarity);
}

/**
 * Advanced matching with remix/version detection
 * Returns true if tracks match, considering remixes and versions
 */
export function isRemixOrVersionMatch(
  originalTitle: string,
  searchResultTitle: string
): boolean {
  // Normalize both titles
  const normalized1 = normalizeString(originalTitle);
  const normalized2 = normalizeString(searchResultTitle);
  
  // Check if one title contains the other (handles "Track" vs "Track (Extended Mix)")
  return normalized1.includes(normalized2) || normalized2.includes(normalized1);
}

/**
 * Calculate match confidence score (0-100)
 * Returns detailed scoring information
 */
export function getMatchConfidence(
  spotifyArtist: string,
  spotifyTitle: string,
  beatportArtist: string,
  beatportTitle: string
): {
  score: number;
  artistScore: number;
  titleScore: number;
  isConfident: boolean;
  warnings: string[];
} {
  const artistSimilarity = calculateSimilarity(spotifyArtist, beatportArtist);
  const titleSimilarity = calculateSimilarity(spotifyTitle, beatportTitle);
  const remixMatch = isRemixOrVersionMatch(spotifyTitle, beatportTitle);
  
  // Boost title score if it's a remix/version match
  const adjustedTitleScore = remixMatch ? Math.max(titleSimilarity, 0.85) : titleSimilarity;
  
  // Combined score (title weighted more heavily)
  const combinedScore = (adjustedTitleScore * 0.7) + (artistSimilarity * 0.3);
  
  const warnings: string[] = [];
  
  if (artistSimilarity < 0.80) {
    warnings.push(`Artist similarity low (${(artistSimilarity * 100).toFixed(1)}%)`);
  }
  if (titleSimilarity < 0.80 && !remixMatch) {
    warnings.push(`Title similarity low (${(titleSimilarity * 100).toFixed(1)}%)`);
  }
  if (!remixMatch && titleSimilarity < 0.90) {
    warnings.push('Possible different version or remix');
  }
  
  return {
    score: Math.round(combinedScore * 100),
    artistScore: Math.round(artistSimilarity * 100),
    titleScore: Math.round(adjustedTitleScore * 100),
    isConfident: combinedScore >= 0.75 && warnings.length === 0,
    warnings
  };
}

export default {
  calculateSimilarity,
  isTrackMatch,
  findBestMatch,
  findBestMatchWithMixPriority,
  extractMixType,
  isExtendedMix,
  isOriginalMix,
  isRadioEdit,
  getMixTypePriority,
  preferExtendedMix,
  isRemixOrVersionMatch,
  getMatchConfidence
};
