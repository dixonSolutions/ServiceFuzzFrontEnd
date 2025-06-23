import { Component, OnInit, ViewChild } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import { DataSvrService } from '../services/data-svr.service';
import {MatMenuModule} from '@angular/material/menu'; 
import { Router } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';
import { MatSidenav } from '@angular/material/sidenav';

@Component({
  selector: 'app-topbar',
  standalone: false,
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit {
  @ViewChild('mobileDrawer') mobileDrawer!: MatSidenav;

  // Window reference for debug info
  window = window;

  // Sidebar appears below 700px
  isSidebarVisible$: Observable<boolean> = this.breakpointObserver.observe('(max-width: 700px)')
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  // Content disappears below 400px
  isContentHidden$: Observable<boolean> = this.breakpointObserver.observe('(max-width: 400px)')
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  // Legacy breakpoints for existing functionality
  isSmallScreen$: Observable<boolean> = this.breakpointObserver.observe('(max-width: 768px)')
    .pipe(
      map(result => result.matches),
      shareReplay()
    );

  constructor(
    public data: DataSvrService,
    private router: Router,
    private breakpointObserver: BreakpointObserver
  ) {}

  ngOnInit(): void {
    // Check if user session exists in cookie and restore if needed
    if (!this.data.currentUser && this.data.hasUserSession()) {
      console.log('Topbar: User not in memory but session exists in cookie, attempting to restore...');
      // The restoration is handled automatically by the DataSvrService constructor
    }
  }

  isRouteActive(route: string): boolean {
    if (route === '/') {
      // For home route, check both '/' and '/home'
      return this.router.url === '/' || this.router.url === '/home';
    }
    return this.router.url === route || this.router.url.startsWith(route + '/');
  }

  getUserInitials(): string {
    const user = this.data.currentUser;
    if (!user || !user.name) {
      return '?';
    }
    
    const nameParts = user.name.trim().split(' ');
    if (nameParts.length === 1) {
      // Single name, return first letter
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      // Multiple names, return first letter of first and last name
      const firstInitial = nameParts[0].charAt(0).toUpperCase();
      const lastInitial = nameParts[nameParts.length - 1].charAt(0).toUpperCase();
      return firstInitial + lastInitial;
    }
  }

  // Method to close mobile drawer when navigating
  closeMobileDrawer(): void {
    if (this.mobileDrawer) {
      this.mobileDrawer.close();
    }
  }
}
