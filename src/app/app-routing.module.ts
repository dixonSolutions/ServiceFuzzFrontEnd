import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SignInOrSignUpComponent } from './sign-in-or-sign-up/sign-in-or-sign-up.component';
import { BusinessComponent } from './business/business.component';
import { ManagebusinessesComponent } from './managebusinesses/managebusinesses.component';
import { BusinessDetailsComponent } from './business-details/business-details.component';
import { BusinessSettingsComponent } from './business-settings/business-settings.component';
import { ChatWithAiAboutServiceFuzzComponent } from './chat-with-ai-about-service-fuzz/chat-with-ai-about-service-fuzz.component';
import { BusinessEditComponent } from './business-edit/business-edit.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { Settings } from './settings/settings';
import { WebsiteCreatorComponent } from './website-creator/website-creator';
import { AuthCallback } from './auth-callback/auth-callback';
import { OrderForms } from './order-forms/order-forms';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'sign', component: SignInOrSignUpComponent },
  { path: 'auth/callback', component: AuthCallback },
  { path: 'auth/signup-callback', component: AuthCallback },
  { path: 'business/add', component: BusinessComponent },
  { path: 'business/manage', component: ManagebusinessesComponent },
  { path: 'business/edit/:id', component: BusinessEditComponent },
  { path: 'business/details', component: BusinessDetailsComponent },
  { path: 'business/settings', component: BusinessSettingsComponent },
  { path: 'chat', component: ChatWithAiAboutServiceFuzzComponent },
  {path:'analytics', component: AnalyticsComponent},
  {path:'order-forms', component: OrderForms},
  { path: 'settings', component: Settings },
  { path: 'website-creator', component: WebsiteCreatorComponent },
  { path: '**', redirectTo: '', pathMatch: 'full' } // Wildcard route for 404 cases
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { 
    onSameUrlNavigation: 'reload',
    useHash: false,
    enableTracing: false 
  })],
  exports: [RouterModule]
})
export class AppRoutingModule { } 