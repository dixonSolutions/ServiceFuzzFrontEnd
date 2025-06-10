import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StaffportalComponent } from './staffportal.component';

describe('StaffportalComponent', () => {
  let component: StaffportalComponent;
  let fixture: ComponentFixture<StaffportalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [StaffportalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StaffportalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
