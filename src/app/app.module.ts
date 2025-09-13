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
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatStepperModule } from '@angular/material/stepper';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { CookieService } from 'ngx-cookie-service';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { LayoutModule } from '@angular/cdk/layout';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeng/themes/lara';
import { ButtonModule } from 'primeng/button';
import { ColorPickerModule } from 'primeng/colorpicker';
import { ToolbarModule } from 'primeng/toolbar';
import { CardModule } from 'primeng/card';
import { InputSwitchModule } from 'primeng/inputswitch';
import { DropdownModule } from 'primeng/dropdown';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TabViewModule } from 'primeng/tabview';
import { SelectButtonModule } from 'primeng/selectbutton';
import { SliderModule } from 'primeng/slider';
import { CarouselModule } from 'primeng/carousel';
import { AnimateOnScrollModule } from 'primeng/animateonscroll';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { AvatarModule } from 'primeng/avatar';
import { AvatarGroupModule } from 'primeng/avatargroup';
import { BadgeModule } from 'primeng/badge';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { MessageModule } from 'primeng/message';
import { GalleriaModule } from 'primeng/galleria';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TextareaModule } from 'primeng/textarea';
import { MenuModule } from 'primeng/menu';
import { AccordionModule } from 'primeng/accordion';
import { TableModule } from 'primeng/table';
import { StepsModule } from 'primeng/steps';
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { MultiSelectModule } from 'primeng/multiselect';
import { MegaMenuModule } from 'primeng/megamenu';
import { RadioButtonModule } from 'primeng/radiobutton';
import { RatingModule } from 'primeng/rating';
import { AIWebsiteChatComponent } from './ai-website-chat/ai-website-chat';




import { AppComponent } from './app.component';
import { HomeComponent } from './home/home.component';
import { TopbarComponent } from './topbar/topbar.component';
import { SignInOrSignUpComponent } from './sign-in-or-sign-up/sign-in-or-sign-up.component';
import { AppRoutingModule } from './app-routing.module';
import { BusinessComponent } from './business/business.component';
import { ManagebusinessesComponent } from './managebusinesses/managebusinesses.component';
import { BusinessDetailsComponent } from './business-details/business-details.component';
import { BusinessSettingsComponent } from './business-settings/business-settings.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { BusinessEditComponent } from './business-edit/business-edit.component';

import { Settings } from './settings/settings';
import { WebsiteCreatorComponent } from './website-creator/website-creator';
import { JsonEditorComponent } from './website-creator/json-editor.component';
import { WorkspaceSelectionComponent } from './website-creator/workspace-selection.component';
import { LeftSidebar } from './website-creator/left-sidebar/left-sidebar';
import { Canvas } from './website-creator/canvas/canvas';
import { AssetManagerComponent } from './website-creator/asset-manager/asset-manager';
import { GoogleMapsPickerComponent } from './components/google-maps-picker/google-maps-picker.component';
import { StripeAccountSetupComponent } from './stripe-account-setup/stripe-account-setup.component';
import { OrderForms } from './order-forms/order-forms';
import { AuthBusinessDialogComponent } from './auth-business-dialog/auth-business-dialog';
import { PrivacyPolicy } from './privacy-policy/privacy-policy';
import { TermsOfUse } from './terms-of-use/terms-of-use';
import { FormBuilderComponent } from './form-builder/form-builder';
import { AuthInterceptorService } from './services/auth-interceptor.service';
import { Staffmanage } from './staffmanage/staffmanage';
import { About } from './about/about';


const GOOGLE_CLIENT_ID = '81721436395-8jqa7b3brs76k6c1731m1ja74c1ok2b4.apps.googleusercontent.com';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    TopbarComponent,
    SignInOrSignUpComponent,
    BusinessComponent,
    ManagebusinessesComponent,
    BusinessDetailsComponent,
    BusinessSettingsComponent,
    AnalyticsComponent,
    Settings,
    WebsiteCreatorComponent,
    JsonEditorComponent,
    WorkspaceSelectionComponent,
    LeftSidebar,
    Canvas,
    AssetManagerComponent,
    StripeAccountSetupComponent,
    OrderForms,
    AuthBusinessDialogComponent,
    PrivacyPolicy,
    TermsOfUse,
    FormBuilderComponent,
    Staffmanage,
    About,

  ],
  imports: [
    BrowserModule,
    CommonModule,
    ButtonModule,
    AIWebsiteChatComponent,
    ToolbarModule,
    BrowserAnimationsModule,
    ColorPickerModule,
    FormsModule,
    GalleriaModule,
    ReactiveFormsModule,
    MatDatepickerModule,
    MatInputModule,
    MatFormFieldModule,
    ProgressBarModule,
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
    MatDividerModule,
    MatSidenavModule,
    MatButtonToggleModule,
    MatTooltipModule,
    MatRadioModule,
    MatCheckboxModule,
    LayoutModule,
    CardModule,
    InputSwitchModule,
    DropdownModule,
    InputTextModule,
    FloatLabelModule,
    TabViewModule,
    SelectButtonModule,
    SliderModule,
    CarouselModule,
    AnimateOnScrollModule,
    TagModule,
    TimelineModule,
    ChipModule,
    DividerModule,
    ProgressBarModule,
    AvatarModule,
    AvatarGroupModule,
    BadgeModule,
    TooltipModule,
    DialogModule,
    MessageModule,
    InputNumberModule,
    CheckboxModule,
    SplitButtonModule,
    ConfirmDialogModule,
    TextareaModule,
    MenuModule,
    AccordionModule,
    TableModule,
    StepsModule,
    DatePickerModule,
    ProgressSpinnerModule,
    ToastModule,
    MultiSelectModule,
    MegaMenuModule,
    RadioButtonModule,
    RatingModule,
    BusinessEditComponent,
    GoogleMapsPickerComponent
  ],
  providers: [
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          prefix: 'p',
          darkModeSelector: '.dark-mode',
          cssLayer: {
            name: 'primeng',
            order: 'tailwind-base, primeng, tailwind-utilities'
          }
        }
      }
    }),
    CookieService,
    ConfirmationService,
    MessageService,
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
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptorService,
      multi: true
    }
  ],
  bootstrap: [AppComponent],
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class AppModule { } 