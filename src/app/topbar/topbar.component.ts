import { Component, OnInit } from '@angular/core';
import {MatIconModule} from '@angular/material/icon';
import {MatButtonModule} from '@angular/material/button';
import {MatToolbarModule} from '@angular/material/toolbar';
import { DataSvrService } from '../services/data-svr.service';
import {MatMenuModule} from '@angular/material/menu'; 
import { Router } from '@angular/router';

@Component({
  selector: 'app-topbar',
  standalone: false,
  templateUrl: './topbar.component.html',
  styleUrls: ['./topbar.component.css']
})
export class TopbarComponent implements OnInit {
  constructor(
    public data: DataSvrService,
    private router: Router
  ) {}

  ngOnInit(): void {
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
}
