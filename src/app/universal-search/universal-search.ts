import { Component, OnInit, OnDestroy, HostListener, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { UniversalSearchService, SearchResult, RecentSearch } from '../services/Business/Manage/ViewSearchEdit/universal-search.service';
import { DataSvrService } from '../services/Other/data-svr.service';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-universal-search',
  standalone: false,
  templateUrl: './universal-search.html',
  styleUrls: ['./universal-search.css']
})
export class UniversalSearch implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('searchInput') searchInput!: ElementRef<HTMLInputElement>;
  
  private destroy$ = new Subject<void>();
  private searchSubject = new Subject<string>();
  
  isVisible = false;
  searchQuery = '';
  searchResults: SearchResult[] = [];
  recentSearches: RecentSearch[] = [];
  isLoading = false;
  selectedIndex = -1;
  showRecentSearches = true;
  isUserSignedIn = false;

  constructor(
    private universalSearchService: UniversalSearchService,
    private dataSvr: DataSvrService,
    private router: Router,
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    // Subscribe to search service observables
    this.universalSearchService.isSearchVisible$
      .pipe(takeUntil(this.destroy$))
      .subscribe(visible => {
        this.isVisible = visible;
        if (visible) {
          setTimeout(() => this.focusSearchInput(), 100);
        } else {
          this.resetSearch();
        }
      });

    this.universalSearchService.searchResults$
      .pipe(takeUntil(this.destroy$))
      .subscribe(results => {
        this.searchResults = results;
        this.selectedIndex = -1;
      });

    this.universalSearchService.recentSearches$
      .pipe(takeUntil(this.destroy$))
      .subscribe(searches => {
        this.recentSearches = searches;
      });

    this.universalSearchService.isLoading$
      .pipe(takeUntil(this.destroy$))
      .subscribe(loading => {
        this.isLoading = loading;
      });

    // Check if user is signed in
    this.dataSvr.currentUser$
      .pipe(takeUntil(this.destroy$))
      .subscribe(user => {
        this.isUserSignedIn = !!user;
      });

    // Setup search debouncing
    this.searchSubject
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        if (query.trim()) {
          this.universalSearchService.search(query).subscribe();
          this.showRecentSearches = false;
        } else {
          this.searchResults = [];
          this.showRecentSearches = true;
        }
      });
  }

  ngAfterViewInit(): void {
    // Focus input when dialog opens
    if (this.isVisible) {
      this.focusSearchInput();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent): void {
    // Ctrl+K or Cmd+K to open search
    if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
      event.preventDefault();
      this.openSearch();
    }

    // Escape to close search
    if (event.key === 'Escape' && this.isVisible) {
      this.closeSearch();
    }

    // Arrow navigation
    if (this.isVisible && this.getDisplayResults().length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.getDisplayResults().length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
      } else if (event.key === 'Enter' && this.selectedIndex >= 0) {
        event.preventDefault();
        const results = this.getDisplayResults();
        this.selectResult(results[this.selectedIndex]);
      }
    }
  }

  openSearch(): void {
    this.universalSearchService.showSearch();
  }

  closeSearch(): void {
    this.universalSearchService.hideSearch();
  }

  onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery = target.value;
    this.searchSubject.next(this.searchQuery);
  }

  selectResult(result: SearchResult | RecentSearch): void {
    if ('query' in result) {
      // It's a recent search
      this.searchQuery = result.query;
      this.searchSubject.next(result.query);
      this.focusSearchInput();
    } else {
      // It's a search result
      this.universalSearchService.addRecentSearch(this.searchQuery, [result]);
      
      if (result.url) {
        this.router.navigate([result.url]);
        this.closeSearch();
        this.messageService.add({
          severity: 'success',
          summary: 'Navigation',
          detail: `Navigated to ${result.title}`,
          life: 3000
        });
      } else {
        this.messageService.add({
          severity: 'info',
          summary: 'Resource',
          detail: `Selected ${result.title}`,
          life: 3000
        });
        this.closeSearch();
      }
    }
  }

  clearRecentSearches(): void {
    this.universalSearchService.clearRecentSearches();
    this.messageService.add({
      severity: 'info',
      summary: 'Cleared',
      detail: 'Recent searches cleared',
      life: 2000
    });
  }

  getDisplayResults(): (SearchResult | RecentSearch)[] {
    if (this.showRecentSearches && this.recentSearches.length > 0) {
      return this.recentSearches;
    }
    return this.searchResults;
  }

  getResultIcon(result: SearchResult | RecentSearch): string {
    if ('query' in result) {
      return 'pi pi-history';
    }
    return result.icon || this.getDefaultIcon(result.type);
  }

  getResultTitle(result: SearchResult | RecentSearch): string {
    if ('query' in result) {
      return result.query;
    }
    return result.title;
  }

  getResultDescription(result: SearchResult | RecentSearch): string {
    if ('query' in result) {
      return `Recent search • ${this.formatDate(result.timestamp)}`;
    }
    return result.description;
  }

  private getDefaultIcon(type: string): string {
    switch (type) {
      case 'business': return 'pi pi-building';
      case 'website': return 'pi pi-globe';
      case 'resource': return 'pi pi-book';
      case 'page': return 'pi pi-file';
      case 'section': return 'pi pi-bookmark';
      case 'location': return 'pi pi-map-marker';
      case 'contact': return 'pi pi-phone';
      case 'service': return 'pi pi-cog';
      default: return 'pi pi-search';
    }
  }

  private formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  private focusSearchInput(): void {
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.focus();
    }
  }

  private resetSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.selectedIndex = -1;
    this.showRecentSearches = true;
  }

  getResultTypeLabel(type: string): string {
    switch (type) {
      case 'business': return 'Business';
      case 'website': return 'Website';
      case 'resource': return 'Resource';
      case 'page': return 'Page';
      case 'section': return 'Section';
      case 'location': return 'Location';
      case 'contact': return 'Contact';
      case 'service': return 'Service';
      default: return 'Result';
    }
  }

  getResultTypeClass(type: string): string {
    switch (type) {
      case 'business': return 'result-type-business';
      case 'website': return 'result-type-website';
      case 'resource': return 'result-type-resource';
      case 'page': return 'result-type-page';
      case 'section': return 'result-type-section';
      case 'location': return 'result-type-location';
      case 'contact': return 'result-type-contact';
      case 'service': return 'result-type-service';
      default: return 'result-type-default';
    }
  }

  getTagSeverity(type: string): 'success' | 'info' | 'warning' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (type) {
      case 'business': return 'info';
      case 'website': return 'success';
      case 'resource': return 'info';
      case 'page': return 'secondary';
      case 'section': return 'secondary';
      case 'location': return 'success';
      case 'contact': return 'info';
      case 'service': return 'info';
      default: return 'secondary';
    }
  }
}
