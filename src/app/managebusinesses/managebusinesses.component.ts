import { Component } from '@angular/core';
import { DataSvrService } from '../services/data-svr.service';

@Component({
  selector: 'app-managebusinesses',
  standalone: false,
  templateUrl: './managebusinesses.component.html',
  styleUrl: './managebusinesses.component.css'
})
export class ManagebusinessesComponent {
  constructor(public data: DataSvrService) {
    if(this.data.currentUser?.email){
      this.data.getBusinessesForUser(this.data.currentUser.email).subscribe((businesses) => {
        this.data.businesses = businesses;
      });
    }
  }


}
