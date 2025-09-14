import { Injectable } from '@angular/core';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { WebsiteFilesService } from './website-files.service';
import { WebsiteFile } from '../models/workspace.models';

export interface SearchResult {
  file: WebsiteFile;
  matches: SearchMatch[];
  totalMatches: number;
}

export interface SearchMatch {
  lineNumber: number;
  lineContent: string;
  matchStart: number;
  matchEnd: number;
  contextBefore: string[];
  contextAfter: string[];
}

export interface SearchOptions {
  caseSensitive: boolean;
  wholeWord: boolean;
  useRegex: boolean;
  includeFileTypes: string[];
  excludeFileTypes: string[];
  maxResults: number;
}

@Injectable({
  providedIn: 'root'
})
export class CodebaseSearchService {
  private searchResults$ = new BehaviorSubject<SearchResult[]>([]);
  private isSearching$ = new BehaviorSubject<boolean>(false);
  private searchQuery$ = new BehaviorSubject<string>('');

  constructor(private websiteFilesService: WebsiteFilesService) {}

  /**
   * Get current search results
   */
  getSearchResults(): Observable<SearchResult[]> {
    return this.searchResults$.asObservable();
  }

  /**
   * Get current search state
   */
  getSearchState(): Observable<{ isSearching: boolean; query: string; results: SearchResult[] }> {
    return this.searchResults$.pipe(
      map(results => ({
        isSearching: this.isSearching$.value,
        query: this.searchQuery$.value,
        results
      }))
    );
  }

  /**
   * Search across all files in the workspace
   */
  searchCodebase(workspaceId: string, query: string, options: Partial<SearchOptions> = {}): Observable<SearchResult[]> {
    if (!query.trim()) {
      this.searchResults$.next([]);
      this.searchQuery$.next('');
      return of([]);
    }

    this.isSearching$.next(true);
    this.searchQuery$.next(query);

    const searchOptions: SearchOptions = {
      caseSensitive: false,
      wholeWord: false,
      useRegex: false,
      includeFileTypes: ['html', 'css', 'js', 'json'], // All file types selected by default
      excludeFileTypes: [],
      maxResults: 1000,
      ...options
    };

    return this.websiteFilesService.getFiles(workspaceId).pipe(
      map(files => this.performSearch(files, query, searchOptions)),
      map(results => {
        this.searchResults$.next(results);
        this.isSearching$.next(false);
        return results;
      })
    );
  }

  /**
   * Clear search results
   */
  clearSearch(): void {
    this.searchResults$.next([]);
    this.searchQuery$.next('');
    this.isSearching$.next(false);
  }

  /**
   * Perform the actual search across files
   */
  private performSearch(files: WebsiteFile[], query: string, options: SearchOptions): SearchResult[] {
    const results: SearchResult[] = [];
    let totalResults = 0;

    for (const file of files) {
      if (totalResults >= options.maxResults) break;

      // Filter by file type if specified
      if (options.includeFileTypes.length > 0 && !options.includeFileTypes.includes(file.fileType)) {
        continue;
      }
      if (options.excludeFileTypes.length > 0 && options.excludeFileTypes.includes(file.fileType)) {
        continue;
      }

      // Skip binary files or files without content
      if (!file.content || this.isBinaryFile(file)) {
        continue;
      }

      const matches = this.searchInFile(file.content, query, options);
      if (matches.length > 0) {
        results.push({
          file,
          matches,
          totalMatches: matches.length
        });
        totalResults += matches.length;
      }
    }

    // Sort results by relevance (number of matches, then by file name)
    results.sort((a, b) => {
      if (a.totalMatches !== b.totalMatches) {
        return b.totalMatches - a.totalMatches;
      }
      return a.file.fileName.localeCompare(b.file.fileName);
    });

    return results;
  }

  /**
   * Search within a single file
   */
  private searchInFile(content: string, query: string, options: SearchOptions): SearchMatch[] {
    const lines = content.split('\n');
    const matches: SearchMatch[] = [];

    let searchPattern: RegExp;
    
    try {
      if (options.useRegex) {
        const flags = options.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(query, flags);
      } else {
        const escapedQuery = this.escapeRegExp(query);
        const wordBoundary = options.wholeWord ? '\\b' : '';
        const flags = options.caseSensitive ? 'g' : 'gi';
        searchPattern = new RegExp(`${wordBoundary}${escapedQuery}${wordBoundary}`, flags);
      }
    } catch (error) {
      // Invalid regex, fall back to literal search
      const flags = options.caseSensitive ? 'g' : 'gi';
      searchPattern = new RegExp(this.escapeRegExp(query), flags);
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineMatches = Array.from(line.matchAll(searchPattern));

      for (const match of lineMatches) {
        if (match.index !== undefined) {
          matches.push({
            lineNumber: i + 1,
            lineContent: line,
            matchStart: match.index,
            matchEnd: match.index + match[0].length,
            contextBefore: this.getContextLines(lines, i, -2, 0),
            contextAfter: this.getContextLines(lines, i, 1, 2)
          });
        }
      }
    }

    return matches;
  }

  /**
   * Get context lines around a match
   */
  private getContextLines(lines: string[], currentIndex: number, startOffset: number, endOffset: number): string[] {
    const start = Math.max(0, currentIndex + startOffset);
    const end = Math.min(lines.length - 1, currentIndex + endOffset);
    const context: string[] = [];

    for (let i = start; i <= end; i++) {
      if (i !== currentIndex) {
        context.push(lines[i]);
      }
    }

    return context;
  }

  /**
   * Check if a file is binary (should be skipped in text search)
   */
  private isBinaryFile(file: WebsiteFile): boolean {
    // Check if content starts with data URL (binary assets)
    if (file.content && file.content.startsWith('data:')) {
      return true;
    }

    // Check file extensions that are typically binary
    const binaryExtensions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'bmp', 'tiff', 
                             'mp4', 'webm', 'avi', 'mov', 'wmv', 'flv', 'mkv',
                             'mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a',
                             'woff', 'woff2', 'ttf', 'otf', 'eot'];
    
    const fileName = file.fileName.toLowerCase();
    return binaryExtensions.some(ext => fileName.endsWith(`.${ext}`));
  }

  /**
   * Escape special regex characters
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Get total number of matches across all results
   */
  getTotalMatches(): number {
    return this.searchResults$.value.reduce((total, result) => total + result.totalMatches, 0);
  }

  /**
   * Get number of files with matches
   */
  getMatchingFilesCount(): number {
    return this.searchResults$.value.length;
  }
}
