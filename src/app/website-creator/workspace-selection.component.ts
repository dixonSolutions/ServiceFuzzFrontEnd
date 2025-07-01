import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { ManageBusinessesService } from '../services/manage-businesses.service';
import { BusinessRegistrationDto } from '../models/business-registration-dto';
import { WebsiteBuilderService } from '../services/website-builder';
import { DataSvrService } from '../services/data-svr.service';
import { 
  WorkspaceResponseDto, 
  CreateWorkspaceDto, 
  WorkspaceListResponse 
} from '../models/workspace.models';

export interface WorkspaceProject {
  id: string;
  name: string;
  businessName: string;
  businessId: string;
  userId: string;
  description: string;
  createdAt: Date;
  lastModified: Date;
  thumbnail?: string;
  websiteJson?: string;
  deploymentStatus?: string;
  deploymentUrl?: string;
  deployedAt?: Date;
  isNew?: boolean; // Flag to indicate if this is a new workspace not yet saved
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

  constructor(
    private manageBusinessesService: ManageBusinessesService,
    private websiteBuilderService: WebsiteBuilderService,
    private dataSvrService: DataSvrService
  ) {}

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
    this.loadWorkspacesForBusiness(business.id);
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

    // Get user ID from DataSvrService
    const currentUserId = this.dataSvrService.currentUser?.userID;
    if (!currentUserId) {
      this.errorMessage = 'User not authenticated. Please log in again.';
      return;
    }

    const newProject: WorkspaceProject = {
      id: this.generateId(),
      name: this.newProjectName.trim(),
      businessName: this.selectedBusiness.name,
      businessId: this.selectedBusiness.id,
      userId: currentUserId,
      description: this.newProjectDescription.trim(),
      createdAt: new Date(),
      lastModified: new Date(),
      isNew: true, // Mark as new workspace not yet saved to API
      deploymentStatus: 'Not Deployed'
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

  // ===================== WORKSPACE API INTEGRATION =====================

  /**
   * Load workspaces for the selected business from API
   */
  loadWorkspacesForBusiness(businessId: string): void {
    if (!businessId) return;

    this.isLoading = true;
    this.errorMessage = '';

    // Use string businessId directly for API
    if (!businessId.trim()) {
      this.errorMessage = 'Invalid business ID';
      this.isLoading = false;
      return;
    }

    this.websiteBuilderService.getWorkspacesByBusiness(businessId).subscribe({
      next: (response: WorkspaceListResponse) => {
        console.log('Loaded workspaces from API:', response);
        
        // Convert API workspaces to local format and merge with new projects
        const apiWorkspaces = response.workspaces.map(w => this.convertWorkspaceResponseToProject(w));
        
        // Keep only new (unsaved) projects for this business
        const newProjects = this.existingProjects.filter(p => 
          p.businessId === businessId && p.isNew
        );
        
        // Merge API workspaces with new projects
        this.existingProjects = [...newProjects, ...apiWorkspaces];
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading workspaces:', error);
        this.errorMessage = 'Failed to load website projects. Please try again.';
        this.isLoading = false;
        
        // Keep only new projects on error
        this.existingProjects = this.existingProjects.filter(p => 
          p.businessId === businessId && p.isNew
        );
      }
    });
  }

  /**
   * Convert WorkspaceResponseDto to WorkspaceProject
   */
  private convertWorkspaceResponseToProject(workspace: WorkspaceResponseDto): WorkspaceProject {
    const business = this.businesses.find(b => b.id === workspace.businessId);
    
    return {
      id: workspace.id,
      name: workspace.name,
      businessName: business?.name || 'Unknown Business',
      businessId: workspace.businessId,
      userId: workspace.userId,
      description: workspace.description || '',
      createdAt: new Date(workspace.createdAt),
      lastModified: new Date(workspace.lastModified),
      thumbnail: workspace.thumbnailUrl,
      websiteJson: workspace.websiteJson,
      deploymentStatus: workspace.deploymentStatus,
      deploymentUrl: workspace.deploymentUrl,
      deployedAt: workspace.deployedAt ? new Date(workspace.deployedAt) : undefined,
      isNew: false
    };
  }

  /**
   * Convert WorkspaceProject to CreateWorkspaceDto
   */
  createWorkspaceDto(project: WorkspaceProject): CreateWorkspaceDto {
    console.log('Creating workspace DTO for project:', project);
    const dto = {
      UserId: project.userId,
      BusinessId: project.businessId,
      Name: project.name,
      Description: project.description,
      ThumbnailUrl: project.thumbnail,
      WebsiteJson: project.websiteJson
    };
    console.log('Created workspace DTO:', dto);
    return dto;
  }

  /**
   * Save a new workspace to the API
   */
  saveWorkspaceToAPI(project: WorkspaceProject): Promise<string> {
    const workspaceDto = this.createWorkspaceDto(project);
    
    return new Promise((resolve, reject) => {
      this.websiteBuilderService.createWorkspace(workspaceDto).subscribe({
        next: (response) => {
          console.log('Workspace saved to API:', response);
          // Update the project with the API-assigned ID
          project.id = response.workspaceId;
          project.isNew = false;
          resolve(response.workspaceId);
        },
        error: (error) => {
          console.error('Error saving workspace:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Update an existing workspace in the API
   */
  updateWorkspaceInAPI(project: WorkspaceProject): Promise<void> {
    if (project.isNew) {
      // If it's new, save it instead
      return this.saveWorkspaceToAPI(project).then(() => {});
    }

    const workspaceId = project.id;
    const updates = {
      Name: project.name,
      Description: project.description,
      ThumbnailUrl: project.thumbnail,
      WebsiteJson: project.websiteJson
    };

    return new Promise((resolve, reject) => {
      this.websiteBuilderService.updateWorkspace(workspaceId, updates).subscribe({
        next: (response) => {
          console.log('Workspace updated in API:', response);
          project.lastModified = new Date();
          resolve();
        },
        error: (error) => {
          console.error('Error updating workspace:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Check if there are unsaved changes
   */
  hasUnsavedChanges(): boolean {
    return this.existingProjects.some(p => p.isNew);
  }

  /**
   * Get all new (unsaved) projects
   */
  getUnsavedProjects(): WorkspaceProject[] {
    return this.existingProjects.filter(p => p.isNew);
  }
} 