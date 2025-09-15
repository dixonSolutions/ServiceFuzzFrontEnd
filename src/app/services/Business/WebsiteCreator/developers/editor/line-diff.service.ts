import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface DiffLine {
  lineNumber: number;
  originalLineNumber?: number;
  newLineNumber?: number;
  content: string;
  type: 'unchanged' | 'added' | 'deleted' | 'modified';
  isHighlighted?: boolean;
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
  header: string;
}

export interface FileDiff {
  fileName: string;
  fileId: string;
  oldContent: string;
  newContent: string;
  hunks: DiffHunk[];
  totalAdditions: number;
  totalDeletions: number;
  totalModifications: number;
  isNewFile: boolean;
  isDeletedFile: boolean;
}

export interface LineHighlight {
  lineNumber: number;
  type: 'added' | 'deleted' | 'modified';
  className: string;
  tooltip?: string;
}

@Injectable({
  providedIn: 'root'
})
export class LineDiffService {
  private _activeDiffs = new BehaviorSubject<Map<string, FileDiff>>(new Map());
  private _highlightedLines = new BehaviorSubject<Map<string, LineHighlight[]>>(new Map());
  
  constructor() {}

  // ===================== OBSERVABLES =====================

  get activeDiffs$(): Observable<Map<string, FileDiff>> {
    return this._activeDiffs.asObservable();
  }

  get highlightedLines$(): Observable<Map<string, LineHighlight[]>> {
    return this._highlightedLines.asObservable();
  }

  // ===================== DIFF CALCULATION =====================

  /**
   * Calculate diff between original and current content
   */
  calculateFileDiff(fileId: string, fileName: string, originalContent: string, currentContent: string, isNewFile: boolean = false): FileDiff {
    const oldLines = originalContent.split('\n');
    const newLines = currentContent.split('\n');
    
    const hunks = this.calculateDiffHunks(oldLines, newLines);
    const stats = this.calculateDiffStats(hunks);
    
    const fileDiff: FileDiff = {
      fileName,
      fileId,
      oldContent: originalContent,
      newContent: currentContent,
      hunks,
      totalAdditions: stats.additions,
      totalDeletions: stats.deletions,
      totalModifications: stats.modifications,
      isNewFile,
      isDeletedFile: currentContent.trim() === '' && originalContent.trim() !== ''
    };
    
    // Store the diff
    const currentDiffs = this._activeDiffs.value;
    currentDiffs.set(fileId, fileDiff);
    this._activeDiffs.next(new Map(currentDiffs));
    
    // Update line highlights
    this.updateLineHighlights(fileId, fileDiff);
    
    return fileDiff;
  }

  /**
   * Calculate diff hunks using a simple line-by-line comparison
   */
  private calculateDiffHunks(oldLines: string[], newLines: string[]): DiffHunk[] {
    const hunks: DiffHunk[] = [];
    const maxLines = Math.max(oldLines.length, newLines.length);
    
    let currentHunk: DiffHunk | null = null;
    let oldLineNumber = 1;
    let newLineNumber = 1;
    
    for (let i = 0; i < maxLines; i++) {
      const oldLine = oldLines[i];
      const newLine = newLines[i];
      
      let diffLine: DiffLine;
      
      if (oldLine === undefined && newLine !== undefined) {
        // Line added
        diffLine = {
          lineNumber: i + 1,
          newLineNumber: newLineNumber++,
          content: newLine,
          type: 'added'
        };
      } else if (oldLine !== undefined && newLine === undefined) {
        // Line deleted
        diffLine = {
          lineNumber: i + 1,
          originalLineNumber: oldLineNumber++,
          content: oldLine,
          type: 'deleted'
        };
      } else if (oldLine !== newLine) {
        // Line modified - create two lines (deleted old, added new)
        if (!currentHunk) {
          currentHunk = this.createNewHunk(oldLineNumber, newLineNumber);
        }
        
        // Add deleted line
        currentHunk.lines.push({
          lineNumber: i + 1,
          originalLineNumber: oldLineNumber++,
          content: oldLine,
          type: 'deleted'
        });
        
        // Add added line
        currentHunk.lines.push({
          lineNumber: i + 1,
          newLineNumber: newLineNumber++,
          content: newLine,
          type: 'added'
        });
        
        continue;
      } else {
        // Line unchanged
        diffLine = {
          lineNumber: i + 1,
          originalLineNumber: oldLineNumber++,
          newLineNumber: newLineNumber++,
          content: oldLine || newLine,
          type: 'unchanged'
        };
      }
      
      // Start new hunk if this is a changed line
      if (diffLine.type !== 'unchanged') {
        if (!currentHunk) {
          currentHunk = this.createNewHunk(
            diffLine.originalLineNumber || oldLineNumber,
            diffLine.newLineNumber || newLineNumber
          );
        }
        currentHunk.lines.push(diffLine);
      } else {
        // End current hunk if we have one
        if (currentHunk && currentHunk.lines.length > 0) {
          this.finalizeHunk(currentHunk);
          hunks.push(currentHunk);
          currentHunk = null;
        }
      }
    }
    
    // Add final hunk if exists
    if (currentHunk && currentHunk.lines.length > 0) {
      this.finalizeHunk(currentHunk);
      hunks.push(currentHunk);
    }
    
    return hunks;
  }

  /**
   * Create a new diff hunk
   */
  private createNewHunk(oldStart: number, newStart: number): DiffHunk {
    return {
      oldStart,
      oldLines: 0,
      newStart,
      newLines: 0,
      lines: [],
      header: ''
    };
  }

  /**
   * Finalize a diff hunk by calculating stats and header
   */
  private finalizeHunk(hunk: DiffHunk): void {
    const deletedLines = hunk.lines.filter(l => l.type === 'deleted').length;
    const addedLines = hunk.lines.filter(l => l.type === 'added').length;
    
    hunk.oldLines = deletedLines;
    hunk.newLines = addedLines;
    hunk.header = `@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`;
  }

  /**
   * Calculate diff statistics
   */
  private calculateDiffStats(hunks: DiffHunk[]): { additions: number; deletions: number; modifications: number } {
    let additions = 0;
    let deletions = 0;
    let modifications = 0;
    
    hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        switch (line.type) {
          case 'added':
            additions++;
            break;
          case 'deleted':
            deletions++;
            break;
          case 'modified':
            modifications++;
            break;
        }
      });
    });
    
    return { additions, deletions, modifications };
  }

  // ===================== LINE HIGHLIGHTING =====================

  /**
   * Update line highlights for a file
   */
  private updateLineHighlights(fileId: string, fileDiff: FileDiff): void {
    const highlights: LineHighlight[] = [];
    
    fileDiff.hunks.forEach(hunk => {
      hunk.lines.forEach(line => {
        if (line.type !== 'unchanged') {
          const highlight: LineHighlight = {
            lineNumber: line.newLineNumber || line.originalLineNumber || line.lineNumber,
            type: line.type as 'added' | 'deleted' | 'modified',
            className: this.getLineHighlightClass(line.type),
            tooltip: this.getLineTooltip(line.type, line.content)
          };
          highlights.push(highlight);
        }
      });
    });
    
    const currentHighlights = this._highlightedLines.value;
    currentHighlights.set(fileId, highlights);
    this._highlightedLines.next(new Map(currentHighlights));
  }

  /**
   * Get CSS class for line highlight
   */
  private getLineHighlightClass(type: string): string {
    switch (type) {
      case 'added':
        return 'diff-line-added';
      case 'deleted':
        return 'diff-line-deleted';
      case 'modified':
        return 'diff-line-modified';
      default:
        return '';
    }
  }

  /**
   * Get tooltip text for line
   */
  private getLineTooltip(type: string, content: string): string {
    const truncatedContent = content.length > 50 ? content.substring(0, 50) + '...' : content;
    
    switch (type) {
      case 'added':
        return `Added: ${truncatedContent}`;
      case 'deleted':
        return `Deleted: ${truncatedContent}`;
      case 'modified':
        return `Modified: ${truncatedContent}`;
      default:
        return truncatedContent;
    }
  }

  // ===================== PUBLIC METHODS =====================

  /**
   * Get diff for a specific file
   */
  getFileDiff(fileId: string): FileDiff | null {
    return this._activeDiffs.value.get(fileId) || null;
  }

  /**
   * Get line highlights for a specific file
   */
  getLineHighlights(fileId: string): LineHighlight[] {
    return this._highlightedLines.value.get(fileId) || [];
  }

  /**
   * Check if a line is highlighted
   */
  isLineHighlighted(fileId: string, lineNumber: number): LineHighlight | null {
    const highlights = this.getLineHighlights(fileId);
    return highlights.find(h => h.lineNumber === lineNumber) || null;
  }

  /**
   * Get diff summary for a file
   */
  getDiffSummary(fileId: string): { additions: number; deletions: number; modifications: number } | null {
    const diff = this.getFileDiff(fileId);
    if (!diff) return null;
    
    return {
      additions: diff.totalAdditions,
      deletions: diff.totalDeletions,
      modifications: diff.totalModifications
    };
  }

  /**
   * Generate unified diff string
   */
  generateUnifiedDiff(fileId: string): string {
    const diff = this.getFileDiff(fileId);
    if (!diff) return '';
    
    let unifiedDiff = `--- a/${diff.fileName}\n+++ b/${diff.fileName}\n`;
    
    diff.hunks.forEach(hunk => {
      unifiedDiff += `${hunk.header}\n`;
      
      hunk.lines.forEach(line => {
        let prefix = ' ';
        if (line.type === 'added') prefix = '+';
        else if (line.type === 'deleted') prefix = '-';
        
        unifiedDiff += `${prefix}${line.content}\n`;
      });
    });
    
    return unifiedDiff;
  }

  /**
   * Apply syntax highlighting to diff lines
   */
  applySyntaxHighlighting(content: string, fileType: string): string {
    // Basic syntax highlighting - in a real implementation, you might use a library like Prism.js
    switch (fileType.toLowerCase()) {
      case 'html':
        return this.highlightHtml(content);
      case 'css':
        return this.highlightCss(content);
      case 'js':
      case 'javascript':
        return this.highlightJavaScript(content);
      default:
        return this.escapeHtml(content);
    }
  }

  /**
   * Basic HTML syntax highlighting
   */
  private highlightHtml(content: string): string {
    return this.escapeHtml(content)
      .replace(/(&lt;\/?[^&gt;]+&gt;)/g, '<span class="html-tag">$1</span>')
      .replace(/(\w+)=/g, '<span class="html-attr">$1</span>=')
      .replace(/"([^"]*)"/g, '"<span class="html-string">$1</span>"');
  }

  /**
   * Basic CSS syntax highlighting
   */
  private highlightCss(content: string): string {
    return this.escapeHtml(content)
      .replace(/([.#]?[\w-]+)\s*{/g, '<span class="css-selector">$1</span> {')
      .replace(/([\w-]+)\s*:/g, '<span class="css-property">$1</span>:')
      .replace(/:\s*([^;]+);/g, ': <span class="css-value">$1</span>;');
  }

  /**
   * Basic JavaScript syntax highlighting
   */
  private highlightJavaScript(content: string): string {
    const keywords = ['function', 'var', 'let', 'const', 'if', 'else', 'for', 'while', 'return', 'class', 'extends'];
    let highlighted = this.escapeHtml(content);
    
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g');
      highlighted = highlighted.replace(regex, `<span class="js-keyword">${keyword}</span>`);
    });
    
    return highlighted
      .replace(/"([^"]*)"/g, '"<span class="js-string">$1</span>"')
      .replace(/'([^']*)'/g, "'<span class=\"js-string\">$1</span>'")
      .replace(/\/\/(.*)$/gm, '<span class="js-comment">//$1</span>');
  }

  /**
   * Escape HTML entities
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear diff for a file
   */
  clearFileDiff(fileId: string): void {
    const currentDiffs = this._activeDiffs.value;
    const currentHighlights = this._highlightedLines.value;
    
    currentDiffs.delete(fileId);
    currentHighlights.delete(fileId);
    
    this._activeDiffs.next(new Map(currentDiffs));
    this._highlightedLines.next(new Map(currentHighlights));
  }

  /**
   * Clear all diffs
   */
  clearAllDiffs(): void {
    this._activeDiffs.next(new Map());
    this._highlightedLines.next(new Map());
  }

  /**
   * Export diff as patch file
   */
  exportDiffAsPatch(fileId: string): Blob | null {
    const unifiedDiff = this.generateUnifiedDiff(fileId);
    if (!unifiedDiff) return null;
    
    return new Blob([unifiedDiff], { type: 'text/plain' });
  }

  /**
   * Get diff statistics for all files
   */
  getAllDiffStats(): { totalFiles: number; totalAdditions: number; totalDeletions: number; totalModifications: number } {
    const diffs = Array.from(this._activeDiffs.value.values());
    
    return {
      totalFiles: diffs.length,
      totalAdditions: diffs.reduce((sum, diff) => sum + diff.totalAdditions, 0),
      totalDeletions: diffs.reduce((sum, diff) => sum + diff.totalDeletions, 0),
      totalModifications: diffs.reduce((sum, diff) => sum + diff.totalModifications, 0)
    };
  }

  /**
   * Navigate to next/previous change in file
   */
  navigateToChange(fileId: string, currentLine: number, direction: 'next' | 'previous'): number | null {
    const highlights = this.getLineHighlights(fileId);
    if (highlights.length === 0) return null;
    
    const sortedHighlights = highlights.sort((a, b) => a.lineNumber - b.lineNumber);
    
    if (direction === 'next') {
      const nextHighlight = sortedHighlights.find(h => h.lineNumber > currentLine);
      return nextHighlight ? nextHighlight.lineNumber : sortedHighlights[0].lineNumber;
    } else {
      const prevHighlight = sortedHighlights.reverse().find(h => h.lineNumber < currentLine);
      return prevHighlight ? prevHighlight.lineNumber : sortedHighlights[0].lineNumber;
    }
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.clearAllDiffs();
  }
}
