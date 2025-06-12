import { NgModule, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatListModule } from '@angular/material/list';
import { SocialLoginModule, SocialAuthServiceConfig, GoogleLoginProvider } from '@abacritt/angularx-social-login';
import { HttpClientModule } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';

import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { TopbarComponent } from './topbar/topbar.component';
import { SignInOrSignUpComponent } from './sign-in-or-sign-up/sign-in-or-sign-up.component';
import { AppRoutingModule } from './app-routing.module';
import { BusinessComponent } from './business/business.component';
import { MatMenuModule } from '@angular/material/menu';
import { ManagebusinessesComponent } from './managebusinesses/managebusinesses.component';
import { BusinessSettingsComponent } from './business-settings/business-settings.component';
import { ChatWithAiAboutServiceFuzzComponent } from './chat-with-ai-about-service-fuzz/chat-with-ai-about-service-fuzz.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { StaffportalComponent } from './staffportal/staffportal.component';
import { MatDividerModule } from '@angular/material/divider';

const GOOGLE_CLIENT_ID = '763839777363-2tclimqvmlkkagk6j5d14me4ec4iq2hl.apps.googleusercontent.com';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    TopbarComponent,
    SignInOrSignUpComponent,
    BusinessComponent,
    ManagebusinessesComponent,
    BusinessSettingsComponent,
    ChatWithAiAboutServiceFuzzComponent,
    AnalyticsComponent,
    StaffportalComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    MatNativeDateModule,
    MatIconModule,
    MatButtonModule,
    MatToolbarModule,
    MatCardModule,
    MatTabsModule,
    MatListModule,
    SocialLoginModule,
    HttpClientModule,
    AppRoutingModule,
    MatSnackBarModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatExpansionModule,
    MatStepperModule,
    DragDropModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule
  ],
  providers: [
    {
      provide: 'SocialAuthServiceConfig',
      useValue: {
        autoLogin: false,
        providers: [
          {
            id: GoogleLoginProvider.PROVIDER_ID,
            provider: new GoogleLoginProvider(GOOGLE_CLIENT_ID)
          }
        ],
        onError: (err) => {
          console.error(err);
        }
      } as SocialAuthServiceConfig
    }
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { } 