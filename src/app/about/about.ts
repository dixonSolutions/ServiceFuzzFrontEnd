import { Component } from '@angular/core';

@Component({
  selector: 'app-about',
  standalone: false,
  templateUrl: './about.html',
  styleUrls: ['./about.css']
})
export class About {
  founder = {
    name: 'Amara Khan',
    title: 'Founder & CEO',
  };

  journeyEvents = [
    {
      status: 'Prototype sparks the idea',
      date: '2023',
      icon: 'pi pi-bolt',
      detail: 'Built the first prototype to automate bookings and payments for a local fitness studio. The results were immediate: fewer no-shows, faster payments.'
    },
    {
      status: 'Private beta with early partners',
      date: '2024',
      icon: 'pi pi-users',
      detail: 'Partnered with 50+ service businesses to refine the product and launched the built-in website builder for SEO and online bookings.'
    },
    {
      status: 'Public launch',
      date: '2025',
      icon: 'pi pi-rocket',
      detail: 'Released ServiceFuzz publicly with analytics, staff scheduling, and inventory capabilities—all in one connected platform.'
    },
    {
      status: "What's next",
      date: 'Roadmap',
      icon: 'pi pi-mobile',
      detail: 'Native mobile apps and open APIs to connect ServiceFuzz with the tools you already use.'
    }
  ];

  get founderInitials(): string {
    const parts = this.founder.name.trim().split(' ');
    const first = parts[0]?.charAt(0) || '';
    const last = parts.length > 1 ? parts[parts.length - 1].charAt(0) : '';
    return (first + last).toUpperCase();
  }
}
