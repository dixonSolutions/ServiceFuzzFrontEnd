import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { WebsiteFilesService } from '../files/website-files.service';
import { MessageService } from 'primeng/api';

export interface FileEditState {
  fileId: string;
  fileName: string;
  fileType: string;
  originalContent: string;
  currentContent: string;
  isModified: boolean;
  isNew: boolean;
  lastSaved: Date | null;
  lastChangeStart?: number; // Track where the last change started
  lastChangeEnd?: number;   // Track where the last change ended
  lastOldString?: string;   // Track what was replaced
  lastNewString?: string;   // Track what it was replaced with
}

export interface LineChange {
  lineNumber: number;
  type: 'added' | 'modified' | 'deleted';
  originalLine?: string;
  newLine?: string;
}

export interface FileStatus {
  fileId: string;
  fileName: string;
  status: 'M' | 'U' | 'D' | 'A'; // Modified, Untracked, Deleted, Added
  hasUnsavedChanges: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FileEditorService {
  private _openFiles = new BehaviorSubject<FileEditState[]>([]);
  private _activeFileId = new BehaviorSubject<string | null>(null);
  private _fileStatuses = new BehaviorSubject<FileStatus[]>([]);
  
  // Track original file contents for diff comparison
  private originalFileContents = new Map<string, string>();
  
  constructor(
    private filesService: WebsiteFilesService,
    private messageService: MessageService
  ) {}

  // ===================== OBSERVABLES =====================

  get openFiles$(): Observable<FileEditState[]> {
    return this._openFiles.asObservable();
  }

  get activeFileId$(): Observable<string | null> {
    return this._activeFileId.asObservable();
  }

  get fileStatuses$(): Observable<FileStatus[]> {
    return this._fileStatuses.asObservable();
  }

  // ===================== FILE OPERATIONS =====================

  /**
   * Open a file for editing
   */
  async openFile(fileId: string, fileName: string, fileType: string, workspaceId: string): Promise<void> {
    try {
      // Check if file is already open
      const openFiles = this._openFiles.value;
      const existingFile = openFiles.find(f => f.fileId === fileId);
      
      if (existingFile) {
        this._activeFileId.next(fileId);
        return;
      }

      // Fetch file content by getting all files and finding the specific one
      const allFiles = await this.filesService.getFiles(workspaceId).toPromise();
      const fileData = allFiles?.find(f => f.id === fileId);
      
      if (!fileData) {
        throw new Error('File not found');
      }
      
      const fileState: FileEditState = {
        fileId,
        fileName,
        fileType,
        originalContent: fileData.content,
        currentContent: fileData.content,
        isModified: false,
        isNew: false,
        lastSaved: new Date(fileData.updatedAt)
      };

      // Store original content for diff comparison
      this.originalFileContents.set(fileId, fileData.content);

      // Add to open files
      this._openFiles.next([...openFiles, fileState]);
      this._activeFileId.next(fileId);
      
      // Update file status
      this.updateFileStatus(fileId, fileName, 'M', false);
      
      console.log(`📝 File opened for editing: ${fileName}`, {
        fileId,
        contentLength: fileState.currentContent.length,
        firstChars: fileState.currentContent.substring(0, 100)
      });
    } catch (error) {
      console.error('Error opening file:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to open file: ${fileName}`
      });
    }
  }

  /**
   * Create a new file
   */
  createNewFile(fileName: string, fileType: string): void {
    const fileId = this.generateTempId();
    const openFiles = this._openFiles.value;
    
    const fileState: FileEditState = {
      fileId,
      fileName,
      fileType,
      originalContent: '',
      currentContent: this.getDefaultContent(fileType),
      isModified: true,
      isNew: true,
      lastSaved: null
    };

    this._openFiles.next([...openFiles, fileState]);
    this._activeFileId.next(fileId);
    
    // Update file status as untracked (new)
    this.updateFileStatus(fileId, fileName, 'U', true);
    
    console.log(`📄 New file created: ${fileName}`);
  }

  /**
   * Update file content and track changes for light saving
   */
  updateFileContent(fileId: string, newContent: string, changeStart?: number, changeEnd?: number): void {
    const openFiles = this._openFiles.value;
    const updatedFiles = openFiles.map(file => {
      if (file.fileId === fileId) {
        const isModified = newContent !== file.originalContent;
        
        // Detect the change if not provided
        let oldString = '';
        let newString = '';
        let actualStart = changeStart;
        let actualEnd = changeEnd;
        
        if (changeStart !== undefined && changeEnd !== undefined) {
          // Use provided change boundaries
          oldString = file.currentContent.substring(changeStart, changeEnd);
          newString = newContent.substring(changeStart, changeStart + (newContent.length - file.currentContent.length) + (changeEnd - changeStart));
        } else {
          // Auto-detect changes using simple diff
          const changes = this.detectChanges(file.currentContent, newContent);
          if (changes) {
            oldString = changes.oldString;
            newString = changes.newString;
            actualStart = changes.start;
            actualEnd = changes.end;
          }
        }
        
        const updatedFile = {
          ...file,
          currentContent: newContent,
          isModified,
          lastChangeStart: actualStart,
          lastChangeEnd: actualEnd,
          lastOldString: oldString,
          lastNewString: newString
        };
        
        // Update file status
        const status = file.isNew ? 'U' : (isModified ? 'M' : 'M');
        this.updateFileStatus(fileId, file.fileName, status, isModified);
        
        console.log(`📝 Content updated for ${file.fileName}:`, {
          oldLength: file.currentContent.length,
          newLength: newContent.length,
          changeDetected: !!oldString,
          oldString: oldString.substring(0, 50) + (oldString.length > 50 ? '...' : ''),
          newString: newString.substring(0, 50) + (newString.length > 50 ? '...' : '')
        });
        
        return updatedFile;
      }
      return file;
    });
    
    this._openFiles.next(updatedFiles);
  }

  /**
   * Simple change detection between old and new content
   */
  private detectChanges(oldContent: string, newContent: string): { oldString: string; newString: string; start: number; end: number } | null {
    // Find the first difference
    let start = 0;
    while (start < oldContent.length && start < newContent.length && oldContent[start] === newContent[start]) {
      start++;
    }
    
    // If no differences found
    if (start === oldContent.length && start === newContent.length) {
      return null;
    }
    
    // Find the last difference
    let oldEnd = oldContent.length;
    let newEnd = newContent.length;
    
    while (oldEnd > start && newEnd > start && 
           oldContent[oldEnd - 1] === newContent[newEnd - 1]) {
      oldEnd--;
      newEnd--;
    }
    
    const oldString = oldContent.substring(start, oldEnd);
    const newString = newContent.substring(start, newEnd);
    
    return {
      oldString,
      newString,
      start,
      end: oldEnd
    };
  }

  /**
   * Save a file
   */
  async saveFile(fileId: string, workspaceId: string): Promise<boolean> {
    try {
      const openFiles = this._openFiles.value;
      const fileToSave = openFiles.find(f => f.fileId === fileId);
      
      if (!fileToSave) {
        throw new Error('File not found in open files');
      }

      let savedFile;
      
      if (fileToSave.isNew) {
        // Create new file - map fileType to allowed values
        const allowedFileTypes = ['html', 'css', 'js', 'json'];
        const mappedFileType = allowedFileTypes.includes(fileToSave.fileType) 
          ? fileToSave.fileType as 'html' | 'css' | 'js' | 'json'
          : 'html'; // default to html for unknown types
          
        savedFile = await this.filesService.createFile(workspaceId, {
          fileName: fileToSave.fileName,
          fileType: mappedFileType,
          content: fileToSave.currentContent
        }).toPromise();
      } else {
        // Use LIGHT UPDATE for existing files - much faster!
        if (fileToSave.lastOldString && fileToSave.lastNewString) {
          console.log(`⚡ Using light update for ${fileToSave.fileName}`);
          
          const lightResponse = await this.filesService.updateFileLight({
            fileId: fileId,
            oldString: fileToSave.lastOldString,
            newString: fileToSave.lastNewString,
            lineNumber: fileToSave.lastChangeStart ? this.getLineNumber(fileToSave.originalContent, fileToSave.lastChangeStart) : undefined
          }).toPromise();
          
          if (lightResponse?.success) {
            // Create a mock saved file response for compatibility
            savedFile = {
              id: fileId,
              fileName: fileToSave.fileName,
              fileType: fileToSave.fileType,
              content: fileToSave.currentContent,
              updatedAt: new Date(lightResponse.updatedAt),
              createdAt: new Date(),
              workspaceId: workspaceId
            };
          }
        } else {
          // Fallback to full update if no light changes detected
          console.log(`📄 Fallback to full update for ${fileToSave.fileName}`);
          savedFile = await this.filesService.updateFile(fileId, fileToSave.currentContent).toPromise();
        }
      }

      if (savedFile) {
        // Update file state
        const updatedFiles = openFiles.map(file => {
          if (file.fileId === fileId) {
            const updatedFile = {
              ...file,
              fileId: savedFile.id, // Update with real ID for new files
              originalContent: fileToSave.currentContent,
              isModified: false,
              isNew: false,
              lastSaved: new Date(),
              // Clear light change tracking after successful save
              lastChangeStart: undefined,
              lastChangeEnd: undefined,
              lastOldString: undefined,
              lastNewString: undefined
            };
            
            // Update original content for diff comparison
            this.originalFileContents.set(savedFile.id, fileToSave.currentContent);
            
            return updatedFile;
          }
          return file;
        });
        
        this._openFiles.next(updatedFiles);
        
        // Update active file ID if it was a new file
        if (fileToSave.isNew && this._activeFileId.value === fileId) {
          this._activeFileId.next(savedFile.id);
        }
        
        // Update file status - no longer modified
        this.updateFileStatus(savedFile.id, fileToSave.fileName, 'M', false);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `File saved: ${fileToSave.fileName} ⚡`
        });
        
        console.log(`💾 File saved: ${fileToSave.fileName}`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error saving file:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Failed to save file: ${error}`
      });
      return false;
    }
  }

  /**
   * Get line number from character position
   */
  private getLineNumber(content: string, position: number): number {
    return content.substring(0, position).split('\n').length;
  }

  /**
   * Save all modified files
   */
  async saveAllFiles(workspaceId: string): Promise<boolean> {
    const openFiles = this._openFiles.value;
    const modifiedFiles = openFiles.filter(f => f.isModified);
    
    if (modifiedFiles.length === 0) {
      this.messageService.add({
        severity: 'info',
        summary: 'Info',
        detail: 'No files to save'
      });
      return true;
    }

    try {
      const savePromises = modifiedFiles.map(file => this.saveFile(file.fileId, workspaceId));
      const results = await Promise.all(savePromises);
      
      const allSaved = results.every(result => result);
      
      if (allSaved) {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Saved ${modifiedFiles.length} files`
        });
      } else {
        this.messageService.add({
          severity: 'warn',
          summary: 'Warning',
          detail: 'Some files failed to save'
        });
      }
      
      return allSaved;
    } catch (error) {
      console.error('Error saving all files:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to save files'
      });
      return false;
    }
  }

  /**
   * Close a file
   */
  closeFile(fileId: string): void {
    const openFiles = this._openFiles.value;
    const fileToClose = openFiles.find(f => f.fileId === fileId);
    
    if (fileToClose?.isModified) {
      const confirmClose = confirm(`File "${fileToClose.fileName}" has unsaved changes. Close anyway?`);
      if (!confirmClose) {
        return;
      }
    }
    
    const updatedFiles = openFiles.filter(f => f.fileId !== fileId);
    this._openFiles.next(updatedFiles);
    
    // Remove from file statuses if it was a new file
    if (fileToClose?.isNew) {
      const statuses = this._fileStatuses.value;
      const updatedStatuses = statuses.filter(s => s.fileId !== fileId);
      this._fileStatuses.next(updatedStatuses);
    }
    
    // Update active file
    if (this._activeFileId.value === fileId) {
      const newActiveFile = updatedFiles.length > 0 ? updatedFiles[updatedFiles.length - 1].fileId : null;
      this._activeFileId.next(newActiveFile);
    }
    
    // Remove from original contents
    this.originalFileContents.delete(fileId);
    
    console.log(`❌ File closed: ${fileToClose?.fileName}`);
  }

  /**
   * Set active file
   */
  setActiveFile(fileId: string): void {
    const openFiles = this._openFiles.value;
    const fileExists = openFiles.some(f => f.fileId === fileId);
    
    if (fileExists) {
      this._activeFileId.next(fileId);
    }
  }

  /**
   * Get active file
   */
  getActiveFile(): FileEditState | null {
    const activeFileId = this._activeFileId.value;
    if (!activeFileId) return null;
    
    const openFiles = this._openFiles.value;
    return openFiles.find(f => f.fileId === activeFileId) || null;
  }

  /**
   * Check if file has unsaved changes
   */
  hasUnsavedChanges(fileId?: string): boolean {
    const openFiles = this._openFiles.value;
    
    if (fileId) {
      const file = openFiles.find(f => f.fileId === fileId);
      return file?.isModified || false;
    }
    
    return openFiles.some(f => f.isModified);
  }

  // ===================== DIFF AND LINE TRACKING =====================

  /**
   * Get line changes for a file
   */
  getLineChanges(fileId: string): LineChange[] {
    const openFiles = this._openFiles.value;
    const file = openFiles.find(f => f.fileId === fileId);
    
    if (!file) return [];
    
    const originalLines = file.originalContent.split('\n');
    const currentLines = file.currentContent.split('\n');
    
    return this.calculateLineDiff(originalLines, currentLines);
  }

  /**
   * Calculate line differences between original and current content
   */
  private calculateLineDiff(originalLines: string[], currentLines: string[]): LineChange[] {
    const changes: LineChange[] = [];
    const maxLines = Math.max(originalLines.length, currentLines.length);
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i];
      const currentLine = currentLines[i];
      
      if (originalLine === undefined && currentLine !== undefined) {
        // Line added
        changes.push({
          lineNumber: i + 1,
          type: 'added',
          newLine: currentLine
        });
      } else if (originalLine !== undefined && currentLine === undefined) {
        // Line deleted
        changes.push({
          lineNumber: i + 1,
          type: 'deleted',
          originalLine: originalLine
        });
      } else if (originalLine !== currentLine) {
        // Line modified
        changes.push({
          lineNumber: i + 1,
          type: 'modified',
          originalLine: originalLine,
          newLine: currentLine
        });
      }
    }
    
    return changes;
  }

  // ===================== FILE STATUS MANAGEMENT =====================

  /**
   * Update file status
   */
  private updateFileStatus(fileId: string, fileName: string, status: 'M' | 'U' | 'D' | 'A', hasUnsavedChanges: boolean): void {
    const statuses = this._fileStatuses.value;
    const existingIndex = statuses.findIndex(s => s.fileId === fileId);
    
    const fileStatus: FileStatus = {
      fileId,
      fileName,
      status,
      hasUnsavedChanges
    };
    
    if (existingIndex >= 0) {
      statuses[existingIndex] = fileStatus;
    } else {
      statuses.push(fileStatus);
    }
    
    this._fileStatuses.next([...statuses]);
  }

  /**
   * Get file status
   */
  getFileStatus(fileId: string): FileStatus | null {
    const statuses = this._fileStatuses.value;
    return statuses.find(s => s.fileId === fileId) || null;
  }

  /**
   * Get all file statuses
   */
  getAllFileStatuses(): FileStatus[] {
    return this._fileStatuses.value;
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Generate temporary ID for new files
   */
  private generateTempId(): string {
    return 'temp_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get default content for file type
   */
  private getDefaultContent(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'html':
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Page</title>
</head>
<body>
    <h1>New Page</h1>
    <p>Start editing this page...</p>
</body>
</html>`;
      case 'css':
        return `/* New CSS File */
body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 20px;
}

h1 {
    color: #333;
}`;
      case 'js':
        return `// New JavaScript File
document.addEventListener('DOMContentLoaded', function() {
    console.log('Page loaded');
});`;
      case 'json':
        return `{
    "name": "New JSON File",
    "version": "1.0.0"
}`;
      default:
        return '';
    }
  }

  /**
   * Get syntax highlighting mode for file type
   */
  getSyntaxMode(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'html':
      case 'htm':
        return 'html';
      case 'css':
        return 'css';
      case 'js':
      case 'javascript':
        return 'javascript';
      case 'json':
        return 'json';
      case 'xml':
        return 'xml';
      case 'md':
      case 'markdown':
        return 'markdown';
      default:
        return 'text';
    }
  }

  /**
   * Get file icon class
   */
  getFileIcon(fileType: string): string {
    switch (fileType.toLowerCase()) {
      case 'html':
      case 'htm':
        return 'pi pi-code';
      case 'css':
        return 'pi pi-palette';
      case 'js':
      case 'javascript':
        return 'pi pi-cog';
      case 'json':
        return 'pi pi-database';
      case 'md':
      case 'markdown':
        return 'pi pi-file-edit';
      case 'txt':
        return 'pi pi-file';
      default:
        return 'pi pi-file-o';
    }
  }

  /**
   * Clean up service
   */
  cleanup(): void {
    this._openFiles.next([]);
    this._activeFileId.next(null);
    this._fileStatuses.next([]);
    this.originalFileContents.clear();
  }
}
