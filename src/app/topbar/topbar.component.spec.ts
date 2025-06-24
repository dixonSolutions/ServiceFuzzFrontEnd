import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TopbarComponent } from './topbar.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { DataSvrService } from '../services/data-svr.service';
import { Router } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { RouterTestingModule } from '@angular/router/testing';

describe('TopbarComponent', () => {
  let component: TopbarComponent;
  let fixture: ComponentFixture<TopbarComponent>;
  let breakpointObserver: BreakpointObserver;

  const mockBreakpointObserver = {
    observe: jasmine.createSpy('observe').and.returnValue(of({ matches: false }))
  };

  const mockDataSvrService = {
    currentUser: null,
    hasUserSession: () => false
  };

  const mockRouter = {
    url: '/'
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TopbarComponent ],
      imports: [
        MatSidenavModule,
        MatToolbarModule,
        MatButtonModule,
        MatIconModule,
        MatMenuModule,
        MatListModule,
        MatDividerModule,
        RouterTestingModule
      ],
      providers: [
        { provide: BreakpointObserver, useValue: mockBreakpointObserver },
        { provide: DataSvrService, useValue: mockDataSvrService },
        { provide: Router, useValue: mockRouter }
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopbarComponent);
    component = fixture.componentInstance;
    breakpointObserver = TestBed.inject(BreakpointObserver);
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show sidebar at 700px maximum (700px and below)', (done) => {
    // Mock the breakpoint observer to return true for max-width: 700px
    mockBreakpointObserver.observe.and.returnValue(of({ matches: true }));
    
    component.isSidebarVisible$.subscribe(isVisible => {
      expect(isVisible).toBe(true);
      done();
    });
  });

  it('should show desktop toolbar above 700px', (done) => {
    // Mock the breakpoint observer to return false for max-width: 700px (sidebar not visible)
    mockBreakpointObserver.observe.and.returnValue(of({ matches: false }));
    
    component.isSidebarVisible$.subscribe(isVisible => {
      expect(isVisible).toBe(false);
      done();
    });
  });
}); 