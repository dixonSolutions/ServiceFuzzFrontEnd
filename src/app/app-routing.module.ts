import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { SignInOrSignUpComponent } from './sign-in-or-sign-up/sign-in-or-sign-up.component';
import { BusinessComponent } from './business/business.component';
import { ManagebusinessesComponent } from './managebusinesses/managebusinesses.component';
import { BusinessDetailsComponent } from './business-details/business-details.component';
import { BusinessSettingsComponent } from './business-settings/business-settings.component';
import { BusinessEditComponent } from './business-edit/business-edit.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { Settings } from './settings/settings';
import { WebsiteCreatorComponent } from './website-creator/website-creator';
import { OrderForms } from './order-forms/order-forms';
import { FormBuilderComponent } from './form-builder/form-builder';
import { PrivacyPolicy } from './privacy-policy/privacy-policy';
import { TermsOfUse } from './terms-of-use/terms-of-use';
import { Staffmanage } from './staffmanage/staffmanage';
import { About } from './about/about';


const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },
  { path: 'sign', component: SignInOrSignUpComponent },
  { path: 'business/add', component: BusinessComponent },
  { path: 'business/manage', component: ManagebusinessesComponent },
  { path: 'business/edit/:id', component: BusinessEditComponent },
  { path: 'business/details', component: BusinessDetailsComponent },
  { path: 'business/settings', component: BusinessSettingsComponent },
    {path:'analytics', component: AnalyticsComponent},
  {path:'business/forms', component: OrderForms},
  {path:'business/forms/create', component: FormBuilderComponent},
  {path:'business/forms/all', component: OrderForms},
  {path:'business/forms/:id', component: OrderForms},
  {path:'order-forms', redirectTo: 'business/forms', pathMatch: 'full'}, // Legacy redirect
  { path: 'settings', component: Settings },
  // Smart Website Creator routes (specific before generic)
  // Select workspaces for business
  { path: 'website-creator/select/:businessId', component: WebsiteCreatorComponent },
  // New workspace (businessId via query param)
  { path: 'website-creator/new/name/:name', component: WebsiteCreatorComponent },
  { path: 'website-creator/new/name/:name/description/:description', component: WebsiteCreatorComponent },
  // Edit workspace: /website-creator/{businessId}/{workspaceId}
  { path: 'website-creator/:businessId/:workspaceId', component: WebsiteCreatorComponent },
  { path: 'website-creator', component: WebsiteCreatorComponent },
  
  // NEW ENHANCED WEBSITE BUILDER ROUTES
  {
    path: 'workspace/:id/builder',
    component: WebsiteCreatorComponent,
    children: [
      { path: '', redirectTo: 'pages', pathMatch: 'full' },
      { path: 'pages', component: WebsiteCreatorComponent },
      { path: 'pages/:pageId/edit', component: WebsiteCreatorComponent },
      { path: 'files', component: WebsiteCreatorComponent },
      { path: 'assets', component: WebsiteCreatorComponent },
      { path: 'domains', component: WebsiteCreatorComponent },
      { path: 'settings', component: WebsiteCreatorComponent }
    ]
  },
  { path: 'staff/business/:businessId', component: Staffmanage },
  { path: 'privacy-policy', component: PrivacyPolicy },
  { path: 'terms-of-use', component: TermsOfUse },
  { path: 'about', component: About },
  // After Stripe redirect, route back to settings with a result param
  { path: 'billing/:result', component: BusinessSettingsComponent },
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