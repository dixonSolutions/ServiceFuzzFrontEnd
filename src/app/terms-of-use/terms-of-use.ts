import { Component } from '@angular/core';

@Component({
  selector: 'app-terms-of-use',
  standalone: false,
  templateUrl: './terms-of-use.html',
  styleUrl: './terms-of-use.css'
})
export class TermsOfUse {

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

}
