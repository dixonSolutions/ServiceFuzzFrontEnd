import { Component, OnInit, OnDestroy, OnChanges, SimpleChanges, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { FileEditorService, FileEditState } from '../../services/Business/WebsiteCreator/developers/editor/file-editor.service';
import { GitStatusService, GitFileStatus } from '../../services/Business/WebsiteCreator/developers/editor/git-status.service';
import { LineDiffService, LineHighlight } from '../../services/Business/WebsiteCreator/developers/editor/line-diff.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-file-editor',
  standalone: false,
  templateUrl: './file-editor.component.html',
  styleUrls: ['./file-editor.component.css']
})
export class FileEditorComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() workspaceId: string = '';
  @Input() fileId: string = '';
  @Input() fileName: string = '';
  @Input() fileType: string = '';
  @Input() initialContent: string = '';
  @Input() readOnly: boolean = false;
  @Input() showLineNumbers: boolean = true;
  @Input() showDiffHighlights: boolean = true;
  @Input() theme: 'light' | 'dark' = 'light';
  
  @Output() contentChanged = new EventEmitter<string>();
  @Output() fileSaved = new EventEmitter<void>();
  @Output() fileModified = new EventEmitter<boolean>();
  
  @ViewChild('codeEditor', { static: false }) codeEditor!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('lineNumbers', { static: false }) lineNumbers!: ElementRef<HTMLDivElement>;
  @ViewChild('diffGutter', { static: false }) diffGutter!: ElementRef<HTMLDivElement>;
  
  private destroy$ = new Subject<void>();
  private contentChangeSubject$ = new Subject<string>();
  
  // Editor state
  currentFile: FileEditState | null = null;
  editorContent: string = '';
  lineCount: number = 0;
  currentLineNumber: number = 1;
  currentColumnNumber: number = 1;
  
  // Diff and highlighting
  lineHighlights: LineHighlight[] = [];
  diffStats = { additions: 0, deletions: 0, modifications: 0 };
  
  // Git status
  gitStatus: GitFileStatus | null = null;
  
  // Editor features
  isLoading: boolean = false;
  isSaving: boolean = false;
  hasUnsavedChanges: boolean = false;
  showFindReplace: boolean = false;
  findText: string = '';
  replaceText: string = '';
  
  // Syntax highlighting
  syntaxMode: string = 'text';
  
  constructor(
    private fileEditorService: FileEditorService,
    private gitStatusService: GitStatusService,
    private lineDiffService: LineDiffService,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.initializeEditor();
    this.setupSubscriptions();
    this.setupContentChangeDebounce();
  }

  ngOnChanges(changes: SimpleChanges): void {
    // React to changes in file inputs
    if (changes['fileId'] || changes['fileName'] || changes['fileType'] || changes['workspaceId'] || changes['initialContent']) {
      
      // If we have initial content, use it directly
      if (changes['initialContent']) {
        console.log('📝 Initial content changed:', {
          fileName: this.fileName,
          hasContent: !!this.initialContent,
          contentLength: this.initialContent?.length || 0,
          firstChars: this.initialContent?.substring(0, 100) || 'No content'
        });
        
        if (this.initialContent) {
          this.setupEditorWithContent(this.initialContent);
          return;
        }
      }
      
      // Only load from service if we have all required inputs and no initial content
      if (this.fileId && this.fileName && this.fileType && this.workspaceId && !this.initialContent) {
        console.log('🔄 File inputs changed, loading file from service:', this.fileName);
        this.loadFile();
      }
    }
  }
  
  private setupEditorWithContent(content: string): void {
    console.log('🔧 Setting up editor with content:', content.length, 'characters');
    
    this.editorContent = content;
    this.lineCount = content.split('\n').length;
    this.hasUnsavedChanges = false;
    
    // Update the editor immediately if it's ready
    if (this.codeEditor) {
      console.log('📝 Editor ready, updating content');
      this.updateEditor();
    } else {
      console.log('⏳ Editor not ready yet, will update after view init');
    }
    
    // Don't create a new file in the service, just set the content
    // The service will be handled by the parent component
  }

  ngAfterViewInit(): void {
    this.setupEditorEventListeners();
    
    // If we have content, update the editor now that the view is ready
    if (this.editorContent && this.codeEditor) {
      console.log('🔄 Editor view ready, updating with existing content:', this.editorContent.length, 'characters');
      this.updateEditor();
    } else {
      console.log('📝 Editor view ready but no content yet');
      this.updateLineNumbers();
      this.applySyntaxHighlighting();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===================== INITIALIZATION =====================

  private initializeEditor(): void {
    // If we have initial content, use it
    if (this.initialContent) {
      console.log('🚀 Initializing editor with initial content:', this.initialContent.length, 'characters');
      this.setupEditorWithContent(this.initialContent);
    } else if (this.fileId && this.fileName && this.fileType) {
      console.log('🚀 Initializing editor, loading file from service');
      this.loadFile();
    }
    
    this.syntaxMode = this.fileEditorService.getSyntaxMode(this.fileType);
  }

  private setupSubscriptions(): void {
    // Subscribe to file editor service
    this.fileEditorService.openFiles$
      .pipe(takeUntil(this.destroy$))
      .subscribe(files => {
        console.log('📁 Open files updated:', files.length, 'files');
        this.currentFile = files.find(f => f.fileId === this.fileId) || null;
        if (this.currentFile) {
          console.log('📝 Found current file:', this.currentFile.fileName, 'content length:', this.currentFile.currentContent.length);
          this.editorContent = this.currentFile.currentContent;
          this.hasUnsavedChanges = this.currentFile.isModified;
          this.updateEditor();
        } else {
          console.log('❌ Current file not found in open files for fileId:', this.fileId);
        }
      });

    // Subscribe to git status service
    this.gitStatusService.workspaceGitStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        if (status) {
          this.gitStatus = this.gitStatusService.getFileStatus(this.fileId);
        }
      });

    // Subscribe to line diff service
    this.lineDiffService.highlightedLines$
      .pipe(takeUntil(this.destroy$))
      .subscribe(highlightsMap => {
        this.lineHighlights = highlightsMap.get(this.fileId) || [];
        this.updateDiffHighlights();
      });

    // Subscribe to diff stats
    this.lineDiffService.activeDiffs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(diffsMap => {
        const diff = diffsMap.get(this.fileId);
        if (diff) {
          this.diffStats = {
            additions: diff.totalAdditions,
            deletions: diff.totalDeletions,
            modifications: diff.totalModifications
          };
        }
      });
  }

  private setupContentChangeDebounce(): void {
    this.contentChangeSubject$
      .pipe(
        debounceTime(300),
        takeUntil(this.destroy$)
      )
      .subscribe(content => {
        this.handleContentChange(content);
      });
  }

  private setupEditorEventListeners(): void {
    if (!this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;

    // Content change
    textarea.addEventListener('input', (event) => {
      const content = (event.target as HTMLTextAreaElement).value;
      this.contentChangeSubject$.next(content);
    });

    // Cursor position tracking
    textarea.addEventListener('selectionchange', () => {
      this.updateCursorPosition();
    });

    textarea.addEventListener('click', () => {
      this.updateCursorPosition();
    });

    textarea.addEventListener('keyup', () => {
      this.updateCursorPosition();
    });

    // Scroll synchronization
    textarea.addEventListener('scroll', () => {
      this.synchronizeScroll();
    });

    // Keyboard shortcuts
    textarea.addEventListener('keydown', (event) => {
      this.handleKeyboardShortcuts(event);
    });
  }

  // ===================== FILE OPERATIONS =====================

  async loadFile(): Promise<void> {
    if (!this.fileId || !this.fileName || !this.fileType || !this.workspaceId) return;

    try {
      this.isLoading = true;
      await this.fileEditorService.openFile(this.fileId, this.fileName, this.fileType, this.workspaceId);
    } catch (error) {
      console.error('Error loading file:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Failed to load file'
      });
    } finally {
      this.isLoading = false;
    }
  }

  async saveFile(): Promise<void> {
    if (!this.currentFile || !this.workspaceId) return;

    try {
      this.isSaving = true;
      const success = await this.fileEditorService.saveFile(this.currentFile.fileId, this.workspaceId);
      
      if (success) {
        this.fileSaved.emit();
        this.hasUnsavedChanges = false;
        this.fileModified.emit(false);
        
        // Clear diff highlights after save
        this.lineDiffService.clearFileDiff(this.fileId);
        
        // Update git status
        this.gitStatusService.clearFileTracking(this.fileId);
      }
    } catch (error) {
      console.error('Error saving file:', error);
    } finally {
      this.isSaving = false;
    }
  }

  // ===================== CONTENT HANDLING =====================

  private handleContentChange(content: string): void {
    if (!this.currentFile) return;

    this.editorContent = content;
    this.fileEditorService.updateFileContent(this.fileId, content);
    
    // Calculate diff
    this.lineDiffService.calculateFileDiff(
      this.fileId,
      this.fileName,
      this.currentFile.originalContent,
      content,
      this.currentFile.isNew
    );
    
    // Track git status
    this.gitStatusService.trackFileModification(
      this.fileId,
      this.fileName,
      this.fileName,
      this.currentFile.isNew
    );
    
    // Update UI
    this.updateLineNumbers();
    this.applySyntaxHighlighting();
    
    // Emit events
    this.contentChanged.emit(content);
    this.hasUnsavedChanges = true;
    this.fileModified.emit(true);
  }

  private updateEditor(): void {
    if (!this.codeEditor) {
      console.log('⚠️ Code editor not available, deferring update');
      // Defer update until after view init
      setTimeout(() => this.updateEditor(), 100);
      return;
    }

    const textarea = this.codeEditor.nativeElement;
    const cursorPosition = textarea.selectionStart || 0;
    
    console.log('📝 Updating editor with content:', this.editorContent.length, 'characters');
    textarea.value = this.editorContent;
    
    // Restore cursor position
    textarea.setSelectionRange(cursorPosition, cursorPosition);
    
    this.updateLineNumbers();
    this.applySyntaxHighlighting();
    this.updateDiffHighlights();
  }

  // ===================== LINE NUMBERS AND HIGHLIGHTING =====================

  private updateLineNumbers(): void {
    if (!this.showLineNumbers || !this.lineNumbers) return;

    const lines = this.editorContent.split('\n');
    this.lineCount = lines.length;
    
    // For very large files (>1000 lines), optimize rendering
    if (this.lineCount > 1000) {
      this.updateLineNumbersOptimized(lines);
    } else {
      this.updateLineNumbersStandard(lines);
    }
  }
  
  private updateLineNumbersStandard(lines: string[]): void {
    const lineNumbersHtml = lines.map((_, index) => {
      const lineNumber = index + 1;
      const highlight = this.lineHighlights.find(h => h.lineNumber === lineNumber);
      const cssClass = highlight ? highlight.className : '';
      const gitStatusIcon = this.getGitStatusIconForLine(lineNumber);
      
      return `<div class="line-number ${cssClass}" data-line="${lineNumber}">
        ${gitStatusIcon}
        <span class="line-num">${lineNumber}</span>
      </div>`;
    }).join('');
    
    this.lineNumbers.nativeElement.innerHTML = lineNumbersHtml;
  }
  
  private updateLineNumbersOptimized(lines: string[]): void {
    // For large files, only render visible line numbers + buffer
    const container = this.lineNumbers.nativeElement;
    const lineHeight = 20;
    const containerHeight = container.clientHeight || 400;
    const visibleLines = Math.ceil(containerHeight / lineHeight);
    const buffer = 50; // Extra lines to render above/below visible area
    
    // Calculate which lines are currently visible
    const scrollTop = this.codeEditor?.nativeElement.scrollTop || 0;
    const startLine = Math.max(1, Math.floor(scrollTop / lineHeight) - buffer);
    const endLine = Math.min(lines.length, startLine + visibleLines + (buffer * 2));
    
    // Create a container with proper height and render only visible lines
    const totalHeight = lines.length * lineHeight;
    const visibleStartOffset = (startLine - 1) * lineHeight;
    
    let html = `<div style="height: ${visibleStartOffset}px;"></div>`;
    
    for (let i = startLine; i <= endLine; i++) {
      const highlight = this.lineHighlights.find(h => h.lineNumber === i);
      const cssClass = highlight ? highlight.className : '';
      const gitStatusIcon = this.getGitStatusIconForLine(i);
      
      html += `<div class="line-number ${cssClass}" data-line="${i}">
        ${gitStatusIcon}
        <span class="line-num">${i}</span>
      </div>`;
    }
    
    const remainingHeight = totalHeight - visibleStartOffset - ((endLine - startLine + 1) * lineHeight);
    if (remainingHeight > 0) {
      html += `<div style="height: ${remainingHeight}px;"></div>`;
    }
    
    container.innerHTML = html;
  }

  private updateDiffHighlights(): void {
    if (!this.showDiffHighlights || !this.diffGutter) return;

    const lines = this.editorContent.split('\n');
    
    const gutterHtml = lines.map((_, index) => {
      const lineNumber = index + 1;
      const highlight = this.lineHighlights.find(h => h.lineNumber === lineNumber);
      
      if (highlight) {
        const icon = this.getDiffIcon(highlight.type);
        const color = this.getDiffColor(highlight.type);
        
        return `<div class="diff-indicator ${highlight.className}" 
                     style="color: ${color}" 
                     title="${highlight.tooltip || ''}">
          ${icon}
        </div>`;
      }
      
      return '<div class="diff-indicator"></div>';
    }).join('');
    
    this.diffGutter.nativeElement.innerHTML = gutterHtml;
  }

  private applySyntaxHighlighting(): void {
    // Basic syntax highlighting - in a production app, you might use Monaco Editor or CodeMirror
    if (!this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const highlightedContent = this.lineDiffService.applySyntaxHighlighting(
      this.editorContent,
      this.fileType
    );
    
    // Apply highlighting to a background div (pseudo-highlighting)
    // This is a simplified approach - for full syntax highlighting, use a proper code editor
  }

  // ===================== CURSOR AND SCROLL HANDLING =====================

  private updateCursorPosition(): void {
    if (!this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const cursorPosition = textarea.selectionStart;
    const textBeforeCursor = this.editorContent.substring(0, cursorPosition);
    const lines = textBeforeCursor.split('\n');
    
    this.currentLineNumber = lines.length;
    this.currentColumnNumber = lines[lines.length - 1].length + 1;
  }

  private synchronizeScroll(): void {
    if (!this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const scrollTop = textarea.scrollTop;
    const scrollLeft = textarea.scrollLeft;
    
    // Synchronize vertical scroll for line numbers and diff gutter
    if (this.lineNumbers) {
      this.lineNumbers.nativeElement.scrollTop = scrollTop;
    }
    
    if (this.diffGutter) {
      this.diffGutter.nativeElement.scrollTop = scrollTop;
    }
    
    // Update scroll position indicator in status bar
    this.updateScrollPosition(scrollTop, scrollLeft);
  }
  
  private updateScrollPosition(scrollTop: number, scrollLeft: number): void {
    // Calculate scroll percentage for potential scroll indicator
    if (this.codeEditor) {
      const textarea = this.codeEditor.nativeElement;
      const maxScrollTop = textarea.scrollHeight - textarea.clientHeight;
      const maxScrollLeft = textarea.scrollWidth - textarea.clientWidth;
      
      const verticalPercent = maxScrollTop > 0 ? Math.round((scrollTop / maxScrollTop) * 100) : 0;
      const horizontalPercent = maxScrollLeft > 0 ? Math.round((scrollLeft / maxScrollLeft) * 100) : 0;
      
      // You can use these percentages to show scroll indicators if needed
      console.log(`📊 Scroll position: ${verticalPercent}% vertical, ${horizontalPercent}% horizontal`);
    }
  }

  // ===================== KEYBOARD SHORTCUTS =====================

  private handleKeyboardShortcuts(event: KeyboardEvent): void {
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 's':
          event.preventDefault();
          this.saveFile();
          break;
        case 'f':
          event.preventDefault();
          this.toggleFindReplace();
          break;
        case 'g':
          event.preventDefault();
          const lineNumber = prompt('Go to line number:');
          if (lineNumber) {
            this.goToLine(parseInt(lineNumber));
          }
          break;
        case 'z':
          if (event.shiftKey) {
            event.preventDefault();
            this.redo();
          } else {
            event.preventDefault();
            this.undo();
          }
          break;
      }
    }
    
    if (event.key === 'Escape') {
      this.showFindReplace = false;
    }
  }

  // ===================== FIND AND REPLACE =====================

  toggleFindReplace(): void {
    this.showFindReplace = !this.showFindReplace;
  }

  findNext(): void {
    if (!this.findText || !this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const content = textarea.value;
    const currentPosition = textarea.selectionStart;
    
    const index = content.indexOf(this.findText, currentPosition + 1);
    if (index !== -1) {
      textarea.setSelectionRange(index, index + this.findText.length);
      textarea.focus();
    } else {
      // Wrap around to beginning
      const firstIndex = content.indexOf(this.findText);
      if (firstIndex !== -1) {
        textarea.setSelectionRange(firstIndex, firstIndex + this.findText.length);
        textarea.focus();
      }
    }
  }

  findPrevious(): void {
    if (!this.findText || !this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const content = textarea.value;
    const currentPosition = textarea.selectionStart;
    
    const index = content.lastIndexOf(this.findText, currentPosition - 1);
    if (index !== -1) {
      textarea.setSelectionRange(index, index + this.findText.length);
      textarea.focus();
    } else {
      // Wrap around to end
      const lastIndex = content.lastIndexOf(this.findText);
      if (lastIndex !== -1) {
        textarea.setSelectionRange(lastIndex, lastIndex + this.findText.length);
        textarea.focus();
      }
    }
  }

  replaceNext(): void {
    if (!this.findText || !this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    
    if (selectedText === this.findText) {
      // Replace current selection
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = textarea.value.substring(0, start) + this.replaceText + textarea.value.substring(end);
      
      textarea.value = newContent;
      textarea.setSelectionRange(start + this.replaceText.length, start + this.replaceText.length);
      
      this.contentChangeSubject$.next(newContent);
    }
    
    // Find next occurrence
    this.findNext();
  }

  replaceAll(): void {
    if (!this.findText || !this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const newContent = textarea.value.replace(new RegExp(this.escapeRegExp(this.findText), 'g'), this.replaceText);
    
    textarea.value = newContent;
    this.contentChangeSubject$.next(newContent);
    
    this.messageService.add({
      severity: 'success',
      summary: 'Replace Complete',
      detail: `Replaced all occurrences of "${this.findText}"`
    });
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  // ===================== UNDO/REDO =====================

  undo(): void {
    if (this.codeEditor) {
      document.execCommand('undo');
    }
  }

  redo(): void {
    if (this.codeEditor) {
      document.execCommand('redo');
    }
  }

  // ===================== UTILITY METHODS =====================

  private getGitStatusIconForLine(lineNumber: number): string {
    const highlight = this.lineHighlights.find(h => h.lineNumber === lineNumber);
    if (!highlight) return '';
    
    const icon = this.getDiffIcon(highlight.type);
    const color = this.getDiffColor(highlight.type);
    
    return `<span class="git-status-icon" style="color: ${color}">${icon}</span>`;
  }

  private getDiffIcon(type: string): string {
    switch (type) {
      case 'added':
        return '+';
      case 'deleted':
        return '-';
      case 'modified':
        return '●';
      default:
        return '';
    }
  }

  private getDiffColor(type: string): string {
    switch (type) {
      case 'added':
        return '#00ff00'; // Green
      case 'deleted':
        return '#ff0000'; // Red
      case 'modified':
        return '#ffa500'; // Orange/Yellow
      default:
        return '#000000';
    }
  }

  getFileIcon(): string {
    return this.fileEditorService.getFileIcon(this.fileType);
  }

  getGitStatusIcon(): string {
    if (!this.gitStatus) return '';
    return this.gitStatusService.getStatusIcon(this.gitStatus.status);
  }

  getGitStatusColor(): string {
    if (!this.gitStatus) return '';
    return this.gitStatusService.getStatusColor(this.gitStatus.status);
  }

  getGitStatusLabel(): string {
    if (!this.gitStatus) return '';
    return this.gitStatusService.getStatusLabel(this.gitStatus.status);
  }

  getScrollPercentage(): number {
    if (this.lineCount === 0) return 0;
    return Math.round((this.currentLineNumber / this.lineCount) * 100);
  }

  getPlaceholderText(): string {
    if (this.isLoading) {
      return 'Loading file content...';
    }
    if (this.readOnly) {
      return 'File is read-only';
    }
    if (!this.fileName) {
      return 'No file selected';
    }
    if (!this.editorContent) {
      return `Start editing ${this.fileName}...`;
    }
    return 'Start typing...';
  }

  // ===================== PUBLIC METHODS =====================

  goToLine(lineNumber: number): void {
    if (!this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const lines = this.editorContent.split('\n');
    
    if (lineNumber < 1 || lineNumber > lines.length) return;
    
    let position = 0;
    for (let i = 0; i < lineNumber - 1; i++) {
      position += lines[i].length + 1; // +1 for newline
    }
    
    textarea.setSelectionRange(position, position);
    textarea.focus();
    
    // Smooth scroll to line
    this.scrollToLine(lineNumber);
  }
  
  private scrollToLine(lineNumber: number): void {
    if (!this.codeEditor) return;
    
    const textarea = this.codeEditor.nativeElement;
    const lineHeight = 20; // Line height from CSS
    const targetScrollTop = (lineNumber - 1) * lineHeight;
    
    // Center the line in the viewport
    const viewportHeight = textarea.clientHeight;
    const centeredScrollTop = targetScrollTop - (viewportHeight / 2) + (lineHeight / 2);
    
    // Smooth scroll animation
    textarea.scrollTo({
      top: Math.max(0, centeredScrollTop),
      behavior: 'smooth'
    });
  }
  
  // Navigate to next/previous change
  navigateToNextChange(): void {
    const highlights = this.lineHighlights;
    if (highlights.length === 0) return;
    
    const currentLine = this.currentLineNumber;
    const nextHighlight = highlights.find(h => h.lineNumber > currentLine);
    
    if (nextHighlight) {
      this.goToLine(nextHighlight.lineNumber);
    } else {
      // Wrap to first change
      this.goToLine(highlights[0].lineNumber);
    }
  }
  
  navigateToPreviousChange(): void {
    const highlights = this.lineHighlights;
    if (highlights.length === 0) return;
    
    const currentLine = this.currentLineNumber;
    const sortedHighlights = highlights.sort((a, b) => b.lineNumber - a.lineNumber);
    const prevHighlight = sortedHighlights.find(h => h.lineNumber < currentLine);
    
    if (prevHighlight) {
      this.goToLine(prevHighlight.lineNumber);
    } else {
      // Wrap to last change
      this.goToLine(sortedHighlights[0].lineNumber);
    }
  }

  insertText(text: string): void {
    if (!this.codeEditor) return;

    const textarea = this.codeEditor.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    
    const newContent = textarea.value.substring(0, start) + text + textarea.value.substring(end);
    textarea.value = newContent;
    
    const newPosition = start + text.length;
    textarea.setSelectionRange(newPosition, newPosition);
    
    this.contentChangeSubject$.next(newContent);
  }

  getSelectedText(): string {
    if (!this.codeEditor) return '';

    const textarea = this.codeEditor.nativeElement;
    return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  }

  formatCode(): void {
    // Basic code formatting - in a production app, you might use prettier or similar
    if (!this.codeEditor) return;

    let formatted = this.editorContent;
    
    switch (this.fileType.toLowerCase()) {
      case 'html':
        formatted = this.formatHtml(formatted);
        break;
      case 'css':
        formatted = this.formatCss(formatted);
        break;
      case 'js':
      case 'javascript':
        formatted = this.formatJavaScript(formatted);
        break;
      case 'json':
        try {
          formatted = JSON.stringify(JSON.parse(formatted), null, 2);
        } catch (e) {
          // Invalid JSON, skip formatting
        }
        break;
    }
    
    if (formatted !== this.editorContent) {
      this.codeEditor.nativeElement.value = formatted;
      this.contentChangeSubject$.next(formatted);
    }
  }

  private formatHtml(html: string): string {
    // Basic HTML formatting
    return html
      .replace(/></g, '>\n<')
      .replace(/^\s+|\s+$/g, '')
      .split('\n')
      .map(line => line.trim())
      .join('\n');
  }

  private formatCss(css: string): string {
    // Basic CSS formatting
    return css
      .replace(/\{/g, ' {\n  ')
      .replace(/\}/g, '\n}\n')
      .replace(/;/g, ';\n  ')
      .replace(/,/g, ',\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }

  private formatJavaScript(js: string): string {
    // Basic JavaScript formatting
    return js
      .replace(/\{/g, ' {\n  ')
      .replace(/\}/g, '\n}\n')
      .replace(/;/g, ';\n')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n');
  }
}
