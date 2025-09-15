import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, interval } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { DataSvrService } from '../../../../Other/data-svr.service';
import { WebsiteFilesService } from '../files/website-files.service';

export interface GitFileStatus {
  fileName: string;
  filePath: string;
  fileId?: string;
  status: 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '??' | ' '; // Modified, Added, Deleted, Renamed, Copied, Updated, Untracked, Unchanged
  workingTreeStatus: 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '??' | ' ';
  indexStatus: 'M' | 'A' | 'D' | 'R' | 'C' | 'U' | '??' | ' ';
  hasConflicts: boolean;
  isStaged: boolean;
  lastModified: Date;
}

export interface GitBranch {
  name: string;
  isActive: boolean;
  isRemote: boolean;
  lastCommit?: string;
  lastCommitDate?: Date;
}

export interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: Date;
  filesChanged: number;
}

export interface WorkspaceGitStatus {
  workspaceId: string;
  currentBranch: string;
  hasChanges: boolean;
  stagedFiles: GitFileStatus[];
  unstagedFiles: GitFileStatus[];
  untrackedFiles: GitFileStatus[];
  conflictedFiles: GitFileStatus[];
  totalChanges: number;
  lastSync: Date;
}

@Injectable({
  providedIn: 'root'
})
export class GitStatusService {
  private readonly apiBaseUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  
  private _workspaceGitStatus = new BehaviorSubject<WorkspaceGitStatus | null>(null);
  private _branches = new BehaviorSubject<GitBranch[]>([]);
  private _recentCommits = new BehaviorSubject<GitCommit[]>([]);
  private _isLoading = new BehaviorSubject<boolean>(false);
  
  // Auto-refresh interval (30 seconds)
  private refreshInterval = 30000;
  private refreshSubscription: any;
  
  // Track file modifications locally
  private localFileChanges = new Map<string, GitFileStatus>();
  
  constructor(
    private http: HttpClient,
    private dataSvr: DataSvrService,
    private filesService: WebsiteFilesService
  ) {
    this.startAutoRefresh();
  }

  // ===================== OBSERVABLES =====================

  get workspaceGitStatus$(): Observable<WorkspaceGitStatus | null> {
    return this._workspaceGitStatus.asObservable();
  }

  get branches$(): Observable<GitBranch[]> {
    return this._branches.asObservable();
  }

  get recentCommits$(): Observable<GitCommit[]> {
    return this._recentCommits.asObservable();
  }

  get isLoading$(): Observable<boolean> {
    return this._isLoading.asObservable();
  }

  // ===================== WORKSPACE GIT STATUS =====================

  /**
   * Initialize git status tracking for workspace
   */
  async initializeWorkspaceGitStatus(workspaceId: string): Promise<void> {
    try {
      this._isLoading.next(true);
      
      // Load initial git status
      await this.refreshWorkspaceGitStatus(workspaceId);
      
      // Load branches and recent commits
      await Promise.all([
        this.loadBranches(workspaceId),
        this.loadRecentCommits(workspaceId)
      ]);
      
      console.log(`🔄 Git status initialized for workspace: ${workspaceId}`);
    } catch (error) {
      console.error('Error initializing git status:', error);
      // Create mock git status for development
      this.createMockGitStatus(workspaceId);
    } finally {
      this._isLoading.next(false);
    }
  }

  /**
   * Refresh workspace git status
   */
  async refreshWorkspaceGitStatus(workspaceId: string): Promise<void> {
    try {
      // In a real implementation, this would call a git status API
      // For now, we'll simulate git status based on file modifications
      const files = await this.filesService.getFiles(workspaceId).toPromise();
      
      if (files) {
        const gitStatus = this.simulateGitStatus(workspaceId, files);
        this._workspaceGitStatus.next(gitStatus);
      }
    } catch (error) {
      console.error('Error refreshing git status:', error);
      // Fallback to local tracking
      this.updateLocalGitStatus(workspaceId);
    }
  }

  /**
   * Simulate git status based on file modifications
   */
  private simulateGitStatus(workspaceId: string, files: any[]): WorkspaceGitStatus {
    const now = new Date();
    const stagedFiles: GitFileStatus[] = [];
    const unstagedFiles: GitFileStatus[] = [];
    const untrackedFiles: GitFileStatus[] = [];
    const conflictedFiles: GitFileStatus[] = [];
    
    // Process files and determine their git status
    files.forEach(file => {
      const fileStatus = this.determineFileGitStatus(file);
      
      switch (fileStatus.status) {
        case 'M':
          if (fileStatus.isStaged) {
            stagedFiles.push(fileStatus);
          } else {
            unstagedFiles.push(fileStatus);
          }
          break;
        case 'A':
          stagedFiles.push(fileStatus);
          break;
        case 'D':
          unstagedFiles.push(fileStatus);
          break;
        case '??':
        case 'U':
          untrackedFiles.push(fileStatus);
          break;
      }
    });
    
    // Add locally tracked changes
    this.localFileChanges.forEach(localChange => {
      const existingFile = [...unstagedFiles, ...stagedFiles, ...untrackedFiles]
        .find(f => f.fileId === localChange.fileId);
      
      if (!existingFile) {
        unstagedFiles.push(localChange);
      }
    });
    
    const totalChanges = stagedFiles.length + unstagedFiles.length + untrackedFiles.length + conflictedFiles.length;
    
    return {
      workspaceId,
      currentBranch: 'main',
      hasChanges: totalChanges > 0,
      stagedFiles,
      unstagedFiles,
      untrackedFiles,
      conflictedFiles,
      totalChanges,
      lastSync: now
    };
  }

  /**
   * Determine git status for a file
   */
  private determineFileGitStatus(file: any): GitFileStatus {
    const now = new Date();
    const lastModified = new Date(file.updatedAt || file.createdAt || now);
    
    // Simple heuristic: files modified in the last hour are considered modified
    const isRecentlyModified = (now.getTime() - lastModified.getTime()) < (60 * 60 * 1000);
    
    // Check if file is in local changes
    const localChange = this.localFileChanges.get(file.id);
    if (localChange) {
      return localChange;
    }
    
    let status: GitFileStatus['status'] = ' ';
    let workingTreeStatus: GitFileStatus['workingTreeStatus'] = ' ';
    let indexStatus: GitFileStatus['indexStatus'] = ' ';
    
    if (isRecentlyModified) {
      status = 'M';
      workingTreeStatus = 'M';
    } else if (file.isNew) {
      status = '??';
      workingTreeStatus = '??';
    }
    
    return {
      fileName: file.fileName,
      filePath: file.fileName,
      fileId: file.id,
      status,
      workingTreeStatus,
      indexStatus,
      hasConflicts: false,
      isStaged: false,
      lastModified
    };
  }

  /**
   * Track local file modification
   */
  trackFileModification(fileId: string, fileName: string, filePath: string, isNew: boolean = false): void {
    const status: GitFileStatus = {
      fileName,
      filePath,
      fileId,
      status: isNew ? '??' : 'M',
      workingTreeStatus: isNew ? '??' : 'M',
      indexStatus: ' ',
      hasConflicts: false,
      isStaged: false,
      lastModified: new Date()
    };
    
    this.localFileChanges.set(fileId, status);
    
    // Update workspace git status
    const currentStatus = this._workspaceGitStatus.value;
    if (currentStatus) {
      this.updateLocalGitStatus(currentStatus.workspaceId);
    }
    
    console.log(`📝 File modification tracked: ${fileName} (${status.status})`);
  }

  /**
   * Track file deletion
   */
  trackFileDeletion(fileId: string, fileName: string, filePath: string): void {
    const status: GitFileStatus = {
      fileName,
      filePath,
      fileId,
      status: 'D',
      workingTreeStatus: 'D',
      indexStatus: ' ',
      hasConflicts: false,
      isStaged: false,
      lastModified: new Date()
    };
    
    this.localFileChanges.set(fileId, status);
    
    // Update workspace git status
    const currentStatus = this._workspaceGitStatus.value;
    if (currentStatus) {
      this.updateLocalGitStatus(currentStatus.workspaceId);
    }
    
    console.log(`🗑️ File deletion tracked: ${fileName}`);
  }

  /**
   * Clear file tracking (after save/commit)
   */
  clearFileTracking(fileId: string): void {
    this.localFileChanges.delete(fileId);
    
    // Update workspace git status
    const currentStatus = this._workspaceGitStatus.value;
    if (currentStatus) {
      this.updateLocalGitStatus(currentStatus.workspaceId);
    }
  }

  /**
   * Update local git status
   */
  private updateLocalGitStatus(workspaceId: string): void {
    const currentStatus = this._workspaceGitStatus.value;
    if (!currentStatus || currentStatus.workspaceId !== workspaceId) return;
    
    const unstagedFiles = [...currentStatus.unstagedFiles];
    const untrackedFiles = [...currentStatus.untrackedFiles];
    
    // Add local changes
    this.localFileChanges.forEach(localChange => {
      const existingIndex = unstagedFiles.findIndex(f => f.fileId === localChange.fileId);
      
      if (existingIndex >= 0) {
        unstagedFiles[existingIndex] = localChange;
      } else {
        if (localChange.status === '??') {
          untrackedFiles.push(localChange);
        } else {
          unstagedFiles.push(localChange);
        }
      }
    });
    
    const totalChanges = currentStatus.stagedFiles.length + unstagedFiles.length + untrackedFiles.length + currentStatus.conflictedFiles.length;
    
    const updatedStatus: WorkspaceGitStatus = {
      ...currentStatus,
      unstagedFiles,
      untrackedFiles,
      hasChanges: totalChanges > 0,
      totalChanges,
      lastSync: new Date()
    };
    
    this._workspaceGitStatus.next(updatedStatus);
  }

  // ===================== BRANCH MANAGEMENT =====================

  /**
   * Load branches for workspace
   */
  private async loadBranches(workspaceId: string): Promise<void> {
    try {
      // In a real implementation, this would call a git branches API
      // For now, we'll create mock branches
      const branches: GitBranch[] = [
        {
          name: 'main',
          isActive: true,
          isRemote: false,
          lastCommit: 'abc123',
          lastCommitDate: new Date()
        },
        {
          name: 'origin/main',
          isActive: false,
          isRemote: true,
          lastCommit: 'abc123',
          lastCommitDate: new Date()
        }
      ];
      
      this._branches.next(branches);
    } catch (error) {
      console.error('Error loading branches:', error);
      this._branches.next([]);
    }
  }

  /**
   * Load recent commits for workspace
   */
  private async loadRecentCommits(workspaceId: string): Promise<void> {
    try {
      // In a real implementation, this would call a git log API
      // For now, we'll create mock commits
      const commits: GitCommit[] = [
        {
          hash: 'abc123def',
          message: 'Initial commit',
          author: this.dataSvr.currentUser?.email || 'developer@example.com',
          date: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          filesChanged: 3
        },
        {
          hash: 'def456ghi',
          message: 'Add basic website structure',
          author: this.dataSvr.currentUser?.email || 'developer@example.com',
          date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          filesChanged: 5
        }
      ];
      
      this._recentCommits.next(commits);
    } catch (error) {
      console.error('Error loading recent commits:', error);
      this._recentCommits.next([]);
    }
  }

  // ===================== MOCK DATA FOR DEVELOPMENT =====================

  /**
   * Create mock git status for development
   */
  private createMockGitStatus(workspaceId: string): void {
    const mockStatus: WorkspaceGitStatus = {
      workspaceId,
      currentBranch: 'main',
      hasChanges: true,
      stagedFiles: [],
      unstagedFiles: [
        {
          fileName: 'index.html',
          filePath: 'index.html',
          fileId: 'mock-1',
          status: 'M',
          workingTreeStatus: 'M',
          indexStatus: ' ',
          hasConflicts: false,
          isStaged: false,
          lastModified: new Date()
        }
      ],
      untrackedFiles: [
        {
          fileName: 'new-file.css',
          filePath: 'css/new-file.css',
          fileId: 'mock-2',
          status: '??',
          workingTreeStatus: '??',
          indexStatus: ' ',
          hasConflicts: false,
          isStaged: false,
          lastModified: new Date()
        }
      ],
      conflictedFiles: [],
      totalChanges: 2,
      lastSync: new Date()
    };
    
    this._workspaceGitStatus.next(mockStatus);
    
    const mockBranches: GitBranch[] = [
      {
        name: 'main',
        isActive: true,
        isRemote: false,
        lastCommit: 'abc123',
        lastCommitDate: new Date()
      }
    ];
    
    this._branches.next(mockBranches);
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Get file status by file ID
   */
  getFileStatus(fileId: string): GitFileStatus | null {
    const status = this._workspaceGitStatus.value;
    if (!status) return null;
    
    const allFiles = [
      ...status.stagedFiles,
      ...status.unstagedFiles,
      ...status.untrackedFiles,
      ...status.conflictedFiles
    ];
    
    return allFiles.find(f => f.fileId === fileId) || null;
  }

  /**
   * Get status icon for file
   */
  getStatusIcon(status: GitFileStatus['status']): string {
    switch (status) {
      case 'M':
        return 'pi pi-pencil';
      case 'A':
        return 'pi pi-plus';
      case 'D':
        return 'pi pi-minus';
      case 'R':
        return 'pi pi-arrow-right';
      case 'C':
        return 'pi pi-copy';
      case 'U':
      case '??':
        return 'pi pi-question';
      default:
        return 'pi pi-file';
    }
  }

  /**
   * Get status color for file
   */
  getStatusColor(status: GitFileStatus['status']): string {
    switch (status) {
      case 'M':
        return '#ffa500'; // Orange for modified
      case 'A':
        return '#00ff00'; // Green for added
      case 'D':
        return '#ff0000'; // Red for deleted
      case 'R':
        return '#0000ff'; // Blue for renamed
      case 'C':
        return '#800080'; // Purple for copied
      case 'U':
      case '??':
        return '#808080'; // Gray for untracked
      default:
        return '#000000'; // Black for default
    }
  }

  /**
   * Get status label for file
   */
  getStatusLabel(status: GitFileStatus['status']): string {
    switch (status) {
      case 'M':
        return 'Modified';
      case 'A':
        return 'Added';
      case 'D':
        return 'Deleted';
      case 'R':
        return 'Renamed';
      case 'C':
        return 'Copied';
      case 'U':
        return 'Updated';
      case '??':
        return 'Untracked';
      default:
        return 'Unknown';
    }
  }

  /**
   * Start auto-refresh
   */
  private startAutoRefresh(): void {
    this.refreshSubscription = interval(this.refreshInterval).subscribe(() => {
      const currentStatus = this._workspaceGitStatus.value;
      if (currentStatus) {
        this.refreshWorkspaceGitStatus(currentStatus.workspaceId);
      }
    });
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
      this.refreshSubscription = null;
    }
  }

  /**
   * Cleanup service
   */
  cleanup(): void {
    this.stopAutoRefresh();
    this._workspaceGitStatus.next(null);
    this._branches.next([]);
    this._recentCommits.next([]);
    this.localFileChanges.clear();
  }
}
