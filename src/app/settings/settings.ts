import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { DividerModule } from 'primeng/divider';
import { TabViewModule } from 'primeng/tabview';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ColorPickerModule } from 'primeng/colorpicker';
import { SliderModule } from 'primeng/slider';
import { CheckboxModule } from 'primeng/checkbox';
import { RadioButtonModule } from 'primeng/radiobutton';
import { InputTextarea } from 'primeng/inputtextarea';
import { AvatarModule } from 'primeng/avatar';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-settings',
  standalone: false,
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings {
  // General Settings
  notifications = true;
  emailNotifications = true;
  smsNotifications = false;
  language = 'English';
  timezone = 'UTC';
  theme = 'light';
  autoSave = true;

  // Business Settings
  businessName = 'ServiceFuzz Business';
  businessEmail = 'contact@servicefuzz.com';
  businessPhone = '+1 (555) 123-4567';
  businessAddress = '123 Business St, City, State 12345';
  businessHours = '9:00 AM - 5:00 PM';
  businessDescription = 'Professional service management platform';

  // Appearance Settings
  primaryColor = '#1976d2';
  secondaryColor = '#ff4081';
  fontSize = 14;
  compactMode = false;
  showAnimations = true;

  // Privacy Settings
  dataSharing = false;
  analyticsTracking = true;
  marketingEmails = false;
  locationServices = true;

  // Language options
  languages = [
    { label: 'English', value: 'English' },
    { label: 'Spanish', value: 'Spanish' },
    { label: 'French', value: 'French' },
    { label: 'German', value: 'German' },
    { label: 'Chinese', value: 'Chinese' }
  ];

  // Timezone options
  timezones = [
    { label: 'UTC', value: 'UTC' },
    { label: 'EST (UTC-5)', value: 'EST' },
    { label: 'PST (UTC-8)', value: 'PST' },
    { label: 'GMT (UTC+0)', value: 'GMT' },
    { label: 'CET (UTC+1)', value: 'CET' }
  ];

  // Theme options
  themes = [
    { label: 'Light', value: 'light' },
    { label: 'Dark', value: 'dark' },
    { label: 'Auto', value: 'auto' }
  ];

  saveSettings() {
    console.log('Settings saved!');
  }

  resetSettings() {
    console.log('Settings reset');
  }

  exportSettings() {
    // Export settings logic
    console.log('Settings exported');
  }
}
