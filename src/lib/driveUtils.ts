
export const NOTES_ROOT_FOLDERS = [
  {
    id: '1TUL5IYTnipICLSvu4bzpPGuU97z15FfC',
    name: 'Notes Library 1',
    url: 'https://drive.google.com/drive/folders/1TUL5IYTnipICLSvu4bzpPGuU97z15FfC?usp=sharing'
  },
  {
    id: '1Z4tBts_Y55n4m8yRSyV7WzKocVHpi9yC',
    name: 'Notes Library 2',
    url: 'https://drive.google.com/drive/folders/1Z4tBts_Y55n4m8yRSyV7WzKocVHpi9yC?usp=sharing'
  }
];

/**
 * Generates a search URL for a specific subject within the known root folders.
 * This helps the user find the specific subfolder if we can't resolve the subfolder ID.
 */
export function getDriveSearchUrl(subjectName: string, subjectCode?: string): string {
  const query = encodeURIComponent(`"${subjectName}"${subjectCode ? ' OR "' + subjectCode + '"' : ''} type:folder`);
  
  // Note: Searching inside a specific folder via URL params is complex for standard Drive UI
  // but we can provide the search query that the user can use.
  return `https://drive.google.com/drive/search?q=${query}`;
}

/**
 * Checks if a name looks like it might match our Drive folder naming convention: "Subject Name (Subject Code)"
 */
export function isPotentialNoteFolder(fileName: string, subjectName: string, subjectCode?: string): boolean {
  const normalizedFile = fileName.toLowerCase();
  const normalizedSubject = subjectName.toLowerCase();
  const normalizedCode = subjectCode?.toLowerCase();

  return normalizedFile.includes(normalizedSubject) || (!!normalizedCode && normalizedFile.includes(normalizedCode));
}
