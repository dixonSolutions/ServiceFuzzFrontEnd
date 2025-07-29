import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TermsOfUse } from './terms-of-use';

describe('TermsOfUse', () => {
  let component: TermsOfUse;
  let fixture: ComponentFixture<TermsOfUse>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [TermsOfUse]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TermsOfUse);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
