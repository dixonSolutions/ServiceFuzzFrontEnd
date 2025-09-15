import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of, debounceTime, distinctUntilChanged, switchMap, catchError } from 'rxjs';
import { CookieService } from 'ngx-cookie-service';
import { DataSvrService } from '../../../Other/data-svr.service';
import { BusinessBasicInfo } from '../../../../models/businessbasicinfo';
import { ManageBusinessesService } from '../manage-businesses.service';
import { BusinessRegistrationDto } from '../../../../models/business-registration-dto';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'business' | 'website' | 'resource' | 'page' | 'section' | 'location' | 'contact' | 'service';
  url?: string;
  icon?: string;
  metadata?: any;
  score?: number;
  category?: string;
}

export interface RecentSearch {
  query: string;
  timestamp: Date;
  results?: SearchResult[];
}

@Injectable({
  providedIn: 'root'
})
export class UniversalSearchService {
  private readonly RECENT_SEARCHES_KEY = 'sf_recent_searches';
  private readonly MAX_RECENT_SEARCHES = 10;
  
  private _isSearchVisible = new BehaviorSubject<boolean>(false);
  private _searchResults = new BehaviorSubject<SearchResult[]>([]);
  private _recentSearches = new BehaviorSubject<RecentSearch[]>([]);
  private _isLoading = new BehaviorSubject<boolean>(false);
  
  public isSearchVisible$ = this._isSearchVisible.asObservable();
  public searchResults$ = this._searchResults.asObservable();
  public recentSearches$ = this._recentSearches.asObservable();
  public isLoading$ = this._isLoading.asObservable();

  constructor(
    private http: HttpClient,
    private cookieService: CookieService,
    private dataSvr: DataSvrService,
    private manageBusinessesService: ManageBusinessesService
  ) {
    this.loadRecentSearches();
  }

  toggleSearchVisibility(): void {
    this._isSearchVisible.next(!this._isSearchVisible.value);
  }

  showSearch(): void {
    this._isSearchVisible.next(true);
  }

  hideSearch(): void {
    this._isSearchVisible.next(false);
    this._searchResults.next([]);
  }

  search(query: string): Observable<SearchResult[]> {
    if (!query || query.trim().length < 2) {
      this._searchResults.next([]);
      return of([]);
    }

    this._isLoading.next(true);
    
    return this.performSearch(query).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(results => {
        this._searchResults.next(results);
        this._isLoading.next(false);
        return of(results);
      }),
      catchError(error => {
        console.error('Search error:', error);
        this._isLoading.next(false);
        this._searchResults.next([]);
        return of([]);
      })
    );
  }

  private performSearch(query: string): Observable<SearchResult[]> {
    // Get businesses from the manage businesses service
    return this.manageBusinessesService.getAllBusinessesForUser().pipe(
      switchMap(businesses => {
        console.log('Universal Search: Loaded businesses for search:', businesses);
        const results: SearchResult[] = [];
        
        // Search businesses (names, descriptions, locations, contacts)
        const businessResults = this.searchBusinesses(query, businesses);
        console.log('Universal Search: Business search results:', businessResults);
        results.push(...businessResults);
        
        // Search business locations and addresses
        const locationResults = this.searchBusinessLocations(query, businesses);
        results.push(...locationResults);
        
        // Search business contacts and services
        const contactResults = this.searchBusinessContacts(query, businesses);
        results.push(...contactResults);
        
        // Search pages/routes
        const pageResults = this.searchPages(query);
        results.push(...pageResults);
        
        // Search page sections and content
        const sectionResults = this.searchPageSections(query);
        results.push(...sectionResults);
        
        // Search resources
        const resourceResults = this.searchResources(query);
        results.push(...resourceResults);
        
        // Search website-related content
        const websiteResults = this.searchWebsiteContent(query);
        results.push(...websiteResults);

        // Calculate fuzzy match scores and filter out very low scores
        const scoredResults = results.map(result => {
          const score = this.calculateFuzzyScore(result, query);
          return { ...result, score };
        }).filter(result => result.score! > 0.1); // Only show results with some relevance

        // Sort by relevance score
        const sortedResults = scoredResults.sort((a, b) => b.score! - a.score!);

        return of(sortedResults.slice(0, 20)); // Limit to top 20 results
      }),
      catchError(error => {
        console.error('Error fetching businesses for search:', error);
        // Fallback to searching without businesses
        const results: SearchResult[] = [];
        
        const pageResults = this.searchPages(query);
        results.push(...pageResults);
        
        const sectionResults = this.searchPageSections(query);
        results.push(...sectionResults);
        
        const resourceResults = this.searchResources(query);
        results.push(...resourceResults);
        
        const websiteResults = this.searchWebsiteContent(query);
        results.push(...websiteResults);

        const scoredResults = results.map(result => {
          const score = this.calculateFuzzyScore(result, query);
          return { ...result, score };
        }).filter(result => result.score! > 0.1);

        const sortedResults = scoredResults.sort((a, b) => b.score! - a.score!);
        return of(sortedResults.slice(0, 20));
      })
    );
  }

  private searchBusinesses(query: string, businesses: BusinessRegistrationDto[]): SearchResult[] {
    return businesses.map(business => ({
      id: business.basicInfo?.businessID || '',
      title: business.basicInfo?.businessName || 'Unnamed Business',
      description: business.basicInfo?.businessDescription || 'Business',
      type: 'business' as const,
      url: `/business/${business.basicInfo?.businessID}`,
      icon: 'pi pi-building',
      category: 'Business',
      metadata: business
    }));
  }

  private searchBusinessLocations(query: string, businesses: BusinessRegistrationDto[]): SearchResult[] {
    const locationResults: SearchResult[] = [];
    
    businesses.forEach(business => {
      const businessName = business.basicInfo?.businessName || 'Business';
      const businessId = business.basicInfo?.businessID || '';
      
      locationResults.push({
        id: `location-${businessId}`,
        title: `${businessName} - Location`,
        description: `Find the location and get directions to ${businessName}`,
        type: 'location' as const,
        url: `/business/${businessId}`,
        icon: 'pi pi-map-marker',
        category: 'Location',
        metadata: { business, searchType: 'location' }
      });
    });
    
    return locationResults;
  }

  private searchBusinessContacts(query: string, businesses: BusinessRegistrationDto[]): SearchResult[] {
    const contactResults: SearchResult[] = [];
    
    businesses.forEach(business => {
      const businessName = business.basicInfo?.businessName || 'Business';
      const businessId = business.basicInfo?.businessID || '';
      const email = business.basicInfo?.email || '';
      const phone = business.basicInfo?.phone || '';
      
      // Contact information
      if (email || phone) {
        contactResults.push({
          id: `contact-${businessId}`,
          title: `${businessName} - Contact`,
          description: `Contact information: ${email} ${phone}`,
          type: 'contact' as const,
          url: `/business/${businessId}`,
          icon: 'pi pi-phone',
          category: 'Contact',
          metadata: { business, searchType: 'contact' }
        });
      }
    });
    
    return contactResults;
  }

  private searchPages(query: string): SearchResult[] {
    const pages = [
      { title: 'Dashboard', url: '/home', description: 'Main dashboard and overview', icon: 'pi pi-home', keywords: ['home', 'main', 'overview', 'start'] },
      { title: 'Businesses', url: '/managebusinesses', description: 'Manage your businesses', icon: 'pi pi-building', keywords: ['manage', 'business', 'companies', 'organizations'] },
      { title: 'Analytics', url: '/analytics', description: 'View business analytics and reports', icon: 'pi pi-chart-line', keywords: ['stats', 'reports', 'data', 'metrics', 'insights'] },
      { title: 'Settings', url: '/settings', description: 'Account and app settings', icon: 'pi pi-cog', keywords: ['preferences', 'configuration', 'account', 'profile'] },
      { title: 'Website Creator', url: '/website-creator', description: 'Create and edit websites', icon: 'pi pi-globe', keywords: ['build', 'design', 'create', 'website', 'web', 'site'] },
      { title: 'Order Forms', url: '/order-forms', description: 'Manage order forms and requests', icon: 'pi pi-file-edit', keywords: ['forms', 'orders', 'requests', 'submissions'] },
      { title: 'Staff Management', url: '/staffmanage', description: 'Manage staff members and permissions', icon: 'pi pi-users', keywords: ['employees', 'team', 'staff', 'users', 'permissions'] },
      { title: 'Form Builder', url: '/form-builder', description: 'Build custom forms and surveys', icon: 'pi pi-list', keywords: ['forms', 'builder', 'custom', 'surveys', 'fields'] },
      { title: 'About', url: '/about', description: 'About ServiceFuzz platform', icon: 'pi pi-info-circle', keywords: ['info', 'information', 'company', 'platform'] },
      { title: 'Sign In', url: '/sign', description: 'Sign in or create account', icon: 'pi pi-sign-in', keywords: ['login', 'register', 'account', 'auth', 'authentication'] }
    ];

    return pages.map(page => ({
      id: page.url,
      title: page.title,
      description: page.description,
      type: 'page' as const,
      url: page.url,
      icon: page.icon,
      category: 'Page',
      metadata: { keywords: page.keywords }
    }));
  }

  private searchPageSections(query: string): SearchResult[] {
    const sections: SearchResult[] = [
      // Home page sections
      {
        id: 'home-hero',
        title: 'ServiceFuzz Platform Overview',
        description: 'Main platform introduction and features',
        type: 'section' as const,
        url: '/home',
        icon: 'pi pi-star',
        category: 'Home Section',
        metadata: { page: 'home', section: 'hero', keywords: ['platform', 'features', 'introduction', 'overview'] }
      },
      {
        id: 'home-features',
        title: 'Platform Features',
        description: 'Key features and capabilities of ServiceFuzz',
        type: 'section' as const,
        url: '/home',
        icon: 'pi pi-list',
        category: 'Home Section',
        metadata: { page: 'home', section: 'features', keywords: ['features', 'capabilities', 'tools', 'functionality'] }
      },
      
      // About page sections
      {
        id: 'about-company',
        title: 'About Our Company',
        description: 'Company information and mission',
        type: 'section' as const,
        url: '/about',
        icon: 'pi pi-info-circle',
        category: 'About Section',
        metadata: { page: 'about', section: 'company', keywords: ['company', 'mission', 'vision', 'team'] }
      },
      {
        id: 'about-services',
        title: 'Our Services',
        description: 'Services and solutions we provide',
        type: 'section' as const,
        url: '/about',
        icon: 'pi pi-briefcase',
        category: 'About Section',
        metadata: { page: 'about', section: 'services', keywords: ['services', 'solutions', 'offerings', 'products'] }
      },
      {
        id: 'about-contact',
        title: 'Contact Information',
        description: 'How to get in touch with us',
        type: 'section' as const,
        url: '/about',
        icon: 'pi pi-envelope',
        category: 'About Section',
        metadata: { page: 'about', section: 'contact', keywords: ['contact', 'reach', 'support', 'help'] }
      },
      
      // Business management sections
      {
        id: 'business-create',
        title: 'Create New Business',
        description: 'Add a new business to your account',
        type: 'section' as const,
        url: '/managebusinesses',
        icon: 'pi pi-plus',
        category: 'Business Section',
        metadata: { page: 'business', section: 'create', keywords: ['create', 'add', 'new', 'business', 'register'] }
      },
      {
        id: 'business-edit',
        title: 'Edit Business Details',
        description: 'Modify business information and settings',
        type: 'section' as const,
        url: '/managebusinesses',
        icon: 'pi pi-pencil',
        category: 'Business Section',
        metadata: { page: 'business', section: 'edit', keywords: ['edit', 'modify', 'update', 'change', 'settings'] }
      }
    ];

    return sections;
  }

  private searchWebsiteContent(query: string): SearchResult[] {
    const websiteContent: SearchResult[] = [
      {
        id: 'website-templates',
        title: 'Website Templates',
        description: 'Pre-built website templates and designs',
        type: 'website' as const,
        url: '/website-creator',
        icon: 'pi pi-clone',
        category: 'Website',
        metadata: { keywords: ['templates', 'designs', 'themes', 'layouts', 'prebuilt'] }
      },
      {
        id: 'website-editor',
        title: 'Website Editor',
        description: 'Visual website editor and builder',
        type: 'website' as const,
        url: '/website-creator',
        icon: 'pi pi-palette',
        category: 'Website',
        metadata: { keywords: ['editor', 'builder', 'visual', 'design', 'customize'] }
      },
      {
        id: 'website-publish',
        title: 'Publish Website',
        description: 'Publish and deploy your website',
        type: 'website' as const,
        url: '/website-creator',
        icon: 'pi pi-upload',
        category: 'Website',
        metadata: { keywords: ['publish', 'deploy', 'live', 'online', 'launch'] }
      }
    ];

    return websiteContent;
  }

  private searchResources(query: string): SearchResult[] {
    const resources = [
      { title: 'Documentation', description: 'ServiceFuzz documentation and guides', icon: 'pi pi-book' },
      { title: 'Support', description: 'Get help and support', icon: 'pi pi-question-circle' },
      { title: 'API Reference', description: 'API documentation and reference', icon: 'pi pi-code' },
      { title: 'Templates', description: 'Website and form templates', icon: 'pi pi-clone' },
      { title: 'Integrations', description: 'Third-party integrations', icon: 'pi pi-link' }
    ];

    return resources
      .filter(resource => 
        resource.title.toLowerCase().includes(query.toLowerCase()) ||
        resource.description.toLowerCase().includes(query.toLowerCase())
      )
      .map(resource => ({
        id: resource.title.toLowerCase().replace(/\s+/g, '-'),
        title: resource.title,
        description: resource.description,
        type: 'resource' as const,
        icon: resource.icon
      }));
  }

  private calculateFuzzyScore(result: SearchResult, query: string): number {
    const queryLower = query.toLowerCase().trim();
    const titleLower = result.title.toLowerCase();
    const descriptionLower = result.description.toLowerCase();
    const categoryLower = (result.category || '').toLowerCase();
    
    let score = 0;
    
    // Exact matches get highest scores
    if (titleLower === queryLower) score += 100;
    if (descriptionLower === queryLower) score += 80;
    
    // Starts with query
    if (titleLower.startsWith(queryLower)) score += 70;
    if (descriptionLower.startsWith(queryLower)) score += 50;
    
    // Contains query
    if (titleLower.includes(queryLower)) score += 40;
    if (descriptionLower.includes(queryLower)) score += 20;
    if (categoryLower.includes(queryLower)) score += 15;
    
    // Fuzzy matching for individual words
    const queryWords = queryLower.split(/\s+/).filter(word => word.length > 1);
    const titleWords = titleLower.split(/\s+/);
    const descWords = descriptionLower.split(/\s+/);
    
    queryWords.forEach(queryWord => {
      // Check title words
      titleWords.forEach(titleWord => {
        const similarity = this.calculateStringSimilarity(queryWord, titleWord);
        if (similarity > 0.7) score += 30 * similarity;
        else if (similarity > 0.5) score += 15 * similarity;
        else if (titleWord.includes(queryWord) || queryWord.includes(titleWord)) score += 10;
      });
      
      // Check description words
      descWords.forEach(descWord => {
        const similarity = this.calculateStringSimilarity(queryWord, descWord);
        if (similarity > 0.7) score += 15 * similarity;
        else if (similarity > 0.5) score += 8 * similarity;
        else if (descWord.includes(queryWord) || queryWord.includes(descWord)) score += 5;
      });
    });
    
    // Check keywords if available
    if (result.metadata?.keywords) {
      const keywords = result.metadata.keywords as string[];
      keywords.forEach(keyword => {
        const keywordLower = keyword.toLowerCase();
        if (keywordLower === queryLower) score += 60;
        else if (keywordLower.includes(queryLower)) score += 25;
        else {
          queryWords.forEach(queryWord => {
            const similarity = this.calculateStringSimilarity(queryWord, keywordLower);
            if (similarity > 0.6) score += 20 * similarity;
          });
        }
      });
    }
    
    // Boost certain types
    switch (result.type) {
      case 'business': score *= 1.2; break;
      case 'page': score *= 1.1; break;
      case 'location': 
        if (this.isLocationQuery(queryLower)) score *= 1.5;
        break;
      case 'contact':
        if (this.isContactQuery(queryLower)) score *= 1.5;
        break;
    }
    
    // Normalize score to 0-1 range
    return Math.min(score / 100, 1);
  }
  
  private calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length < 2 || str2.length < 2) return 0;
    
    // Levenshtein distance based similarity
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }
  
  private levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  private isLocationQuery(query: string): boolean {
    const locationKeywords = ['address', 'location', 'where', 'find', 'visit', 'directions', 'map', 'place', 'near', 'area'];
    return locationKeywords.some(keyword => query.includes(keyword));
  }
  
  private isContactQuery(query: string): boolean {
    const contactKeywords = ['contact', 'phone', 'email', 'call', 'reach', 'support', 'help', 'number'];
    return contactKeywords.some(keyword => query.includes(keyword));
  }

  addRecentSearch(query: string, results?: SearchResult[]): void {
    const recentSearches = this._recentSearches.value;
    const newSearch: RecentSearch = {
      query: query.trim(),
      timestamp: new Date(),
      results
    };
    
    // Remove existing search with same query
    const filteredSearches = recentSearches.filter(search => 
      search.query.toLowerCase() !== query.toLowerCase()
    );
    
    // Add new search at the beginning
    const updatedSearches = [newSearch, ...filteredSearches].slice(0, this.MAX_RECENT_SEARCHES);
    
    this._recentSearches.next(updatedSearches);
    this.saveRecentSearches(updatedSearches);
  }

  clearRecentSearches(): void {
    this._recentSearches.next([]);
    this.cookieService.delete(this.RECENT_SEARCHES_KEY);
  }

  private loadRecentSearches(): void {
    try {
      const saved = this.cookieService.get(this.RECENT_SEARCHES_KEY);
      if (saved) {
        const searches: RecentSearch[] = JSON.parse(saved).map((search: any) => ({
          ...search,
          timestamp: new Date(search.timestamp)
        }));
        this._recentSearches.next(searches);
      }
    } catch (error) {
      console.error('Error loading recent searches:', error);
    }
  }

  private saveRecentSearches(searches: RecentSearch[]): void {
    try {
      this.cookieService.set(
        this.RECENT_SEARCHES_KEY,
        JSON.stringify(searches),
        { expires: 30, path: '/' } // 30 days
      );
    } catch (error) {
      console.error('Error saving recent searches:', error);
    }
  }

  getSearchSuggestions(query: string): string[] {
    const recentSearches = this._recentSearches.value;
    return recentSearches
      .filter(search => search.query.toLowerCase().includes(query.toLowerCase()))
      .map(search => search.query)
      .slice(0, 5);
  }
}
