import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { BusinessRegistrationDto } from '../models/business-registration-dto';

export interface WorkspaceProject {
  id: string;
  name: string;
  businessName: string;
  businessId: string;
  description: string;
  createdAt: Date;
  lastModified: Date;
  thumbnail?: string;
}

export interface BusinessInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  email: string;
  phone: string;
}

@Component({
  selector: 'app-workspace-selection',
  standalone: false,
  templateUrl: './workspace-selection.component.html',
  styleUrls: ['./workspace-selection.component.css']
})
export class WorkspaceSelectionComponent implements OnInit {
  @Output() projectSelected = new EventEmitter<WorkspaceProject>();
  @Output() newProjectCreated = new EventEmitter<WorkspaceProject>();

  showNewProjectDialog = false;
  selectedBusiness: BusinessInfo | null = null;
  newProjectName = '';
  newProjectDescription = '';
  isLoading = false;
  errorMessage = '';

  // Real business data from service
  businesses: BusinessInfo[] = [];

  // Existing projects (initially empty - could be loaded from a projects service)
  existingProjects: WorkspaceProject[] = [];

  constructor(private manageBusinessesService: ManageBusinessesService) {}

  ngOnInit(): void {
    this.loadBusinesses();
  }

  loadBusinesses(): void {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // First check if businesses are already in the service instance
      if (this.manageBusinessesService.hasBusinessesInstance()) {
        const businessDtos = this.manageBusinessesService.getBusinessesInstance();
        this.businesses = this.convertBusinessDtosToBusinessInfo(businessDtos);
        this.isLoading = false;
        console.log('Loaded businesses from instance:', this.businesses.length);
        return;
      }

      // Otherwise fetch from API
      this.manageBusinessesService.getAllBusinessesForUser().subscribe({
        next: (businessDtos: BusinessRegistrationDto[]) => {
          this.businesses = this.convertBusinessDtosToBusinessInfo(businessDtos);
          this.manageBusinessesService.setBusinessesInstance(businessDtos);
          this.isLoading = false;
          console.log('Loaded businesses from API:', this.businesses.length);
        },
        error: (error) => {
          console.error('Error loading businesses:', error);
          this.errorMessage = 'Failed to load businesses. Please try again.';
          this.isLoading = false;
          // Show some example businesses if API fails
          this.businesses = this.getExampleBusinesses();
        }
      });
    } catch (error) {
      console.error('Error in loadBusinesses:', error);
      this.errorMessage = 'Failed to load businesses. Please try again.';
      this.isLoading = false;
      // Show some example businesses if there's an error
      this.businesses = this.getExampleBusinesses();
    }
  }

  private convertBusinessDtosToBusinessInfo(businessDtos: BusinessRegistrationDto[]): BusinessInfo[] {
    return businessDtos.map(dto => ({
      id: dto.basicInfo.businessID || this.generateId(),
      name: dto.basicInfo.businessName,
      type: this.inferBusinessType(dto.basicInfo.businessDescription, dto.services),
      description: dto.basicInfo.businessDescription,
      email: dto.basicInfo.email,
      phone: dto.basicInfo.phone
    }));
  }

  private inferBusinessType(description: string, services: any[]): string {
    const desc = description.toLowerCase();
    const serviceNames = services?.map(s => s.serviceName?.toLowerCase()).join(' ') || '';
    const combined = `${desc} ${serviceNames}`;

    if (combined.includes('hair') || combined.includes('beauty') || combined.includes('salon') || 
        combined.includes('spa') || combined.includes('massage') || combined.includes('nail')) {
      return 'Beauty & Wellness';
    }
    if (combined.includes('fitness') || combined.includes('gym') || combined.includes('workout') || 
        combined.includes('training') || combined.includes('exercise')) {
      return 'Fitness & Health';
    }
    if (combined.includes('tech') || combined.includes('software') || combined.includes('it') || 
        combined.includes('web') || combined.includes('app')) {
      return 'Technology';
    }
    if (combined.includes('food') || combined.includes('restaurant') || combined.includes('cafe') || 
        combined.includes('bakery') || combined.includes('catering')) {
      return 'Food & Beverage';
    }
    if (combined.includes('auto') || combined.includes('car') || combined.includes('mechanic') || 
        combined.includes('repair')) {
      return 'Automotive';
    }
    if (combined.includes('clean') || combined.includes('maintenance') || combined.includes('home')) {
      return 'Home Services';
    }
    
    return 'Professional Services';
  }

  private getExampleBusinesses(): BusinessInfo[] {
    return [
      {
        id: 'example-1',
        name: 'My Business',
        type: 'Professional Services',
        description: 'Your business description will appear here',
        email: 'contact@mybusiness.com',
        phone: '(555) 123-4567'
      }
    ];
  }

  onBusinessSelect(business: BusinessInfo): void {
    this.selectedBusiness = business;
  }

  onAddNewBusiness(): void {
    // Redirect to business registration page
    // In a real app, you might use Router to navigate
    alert('This will redirect to business registration. For demo purposes, please register a business first in the Manage Businesses section.');
  }

  onCreateNewProject(): void {
    if (!this.selectedBusiness) {
      alert('Please select a business first');
      return;
    }
    
    this.showNewProjectDialog = true;
  }

  onConfirmCreateProject(): void {
    if (!this.selectedBusiness || !this.newProjectName.trim()) {
      return;
    }

    const newProject: WorkspaceProject = {
      id: this.generateId(),
      name: this.newProjectName.trim(),
      businessName: this.selectedBusiness.name,
      businessId: this.selectedBusiness.id,
      description: this.newProjectDescription.trim(),
      createdAt: new Date(),
      lastModified: new Date()
    };

    this.existingProjects.unshift(newProject);
    this.newProjectCreated.emit(newProject);
    this.closeNewProjectDialog();
  }

  onSelectExistingProject(project: WorkspaceProject): void {
    this.projectSelected.emit(project);
  }

  closeNewProjectDialog(): void {
    this.showNewProjectDialog = false;
    this.newProjectName = '';
    this.newProjectDescription = '';
  }

  getProjectsByBusiness(businessName: string): WorkspaceProject[] {
    return this.existingProjects.filter(p => p.businessName === businessName);
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getBusinessTypeIcon(type: string): string {
    const iconMap: { [key: string]: string } = {
      'Beauty & Wellness': 'pi pi-heart',
      'Fitness & Health': 'pi pi-bolt',
      'Technology': 'pi pi-desktop',
      'Food & Beverage': 'pi pi-shopping-bag',
      'Automotive': 'pi pi-car',
      'Home Services': 'pi pi-home',
      'Professional Services': 'pi pi-briefcase'
    };
    return iconMap[type] || 'pi pi-building';
  }

  private generateId(): string {
    return 'project-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }
} 