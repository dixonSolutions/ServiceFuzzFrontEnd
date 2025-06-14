import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SignInOrSignUpComponent } from './sign-in-or-sign-up/sign-in-or-sign-up.component';
import { BusinessComponent } from './business/business.component';
import { ManagebusinessesComponent } from './managebusinesses/managebusinesses.component';
import { BusinessSettingsComponent } from './business-settings/business-settings.component';
import { ChatWithAiAboutServiceFuzzComponent } from './chat-with-ai-about-service-fuzz/chat-with-ai-about-service-fuzz.component';
import { StaffportalComponent } from './staffportal/staffportal.component';

const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'sign', component: SignInOrSignUpComponent },
  { path: 'business/add', component: BusinessComponent },
  { path: 'business/manage', component: ManagebusinessesComponent },
  { path: 'business/settings', component: BusinessSettingsComponent },
  { path: 'chat', component: ChatWithAiAboutServiceFuzzComponent },
  { path: 'staff', component: StaffportalComponent },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { onSameUrlNavigation: 'reload' })],
  exports: [RouterModule]
})
export class AppRoutingModule { } 