import { Component } from '@angular/core';
import { DataSvrService } from './services/data-svr.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: false
})
export class AppComponent {
  title = 'servicefuzz';
  constructor(public data: DataSvrService) {}
}
