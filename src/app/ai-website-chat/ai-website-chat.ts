import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewChecked, HostListener } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { AIWebsiteService } from '../services/Business/WebsiteCreator/Ai/ai-website.service';
import { AIWebsiteUtils } from '../utils/ai-website.utils';

import { 
  AIWebsiteGenerationRequest, 
  AIWebsiteGenerationResponse, 
  AIWebsiteChatMessage,
  WebsiteComponent 
} from '../models/ai-website.models';

@Component({
  selector: 'app-ai-website-chat',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    DialogModule,
    TooltipModule,
    TextareaModule
    ],
  templateUrl: './ai-website-chat.html',
  styleUrls: ['./ai-website-chat.css']
})
export class AIWebsiteChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('chatMessages') chatMessagesRef!: ElementRef;
  
  @Input() businessId: string = '';
  @Input() workspaceId: string = '';
  @Input() currentWebsiteJson: string = '';
  @Output() websiteUpdated = new EventEmitter<string>();
  @Output() generationStateChange = new EventEmitter<{isGenerating: boolean, error?: string}>();

  private destroy$ = new Subject<void>();

  // Chat state
  messages: AIWebsiteChatMessage[] = [];
  userInput: string = '';
  isGenerating: boolean = false;
  isLoadingComponents: boolean = false;

  // UI state
  showMenu: boolean = false;

  // JSON preview dialog
  showJsonDialog: boolean = false;
  previewJson: string = '';
  
  private shouldScrollToBottom = false;

  constructor(private aiWebsiteService: AIWebsiteService) {}

  ngOnInit(): void {
    // Component initialization
  }

  ngAfterViewChecked(): void {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      this.shouldScrollToBottom = false;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }


  /**
   * Add system message to chat
   */
  private addSystemMessage(content: string): void {
    const message: AIWebsiteChatMessage = {
      id: AIWebsiteUtils.generateMessageId(),
      content,
      timestamp: new Date(),
      isUser: false
    };
    this.messages.push(message);
    this.shouldScrollToBottom = true;
  }

  /**
   * Send user message and generate website
   */
  sendMessage(): void {
    if (!this.userInput.trim() || this.isGenerating) {
      return;
    }

    // Add user message
    const userMessage: AIWebsiteChatMessage = {
      id: AIWebsiteUtils.generateMessageId(),
      content: this.userInput,
      timestamp: new Date(),
      isUser: true
    };
    this.messages.push(userMessage);

    // Add loading message
    const loadingMessage: AIWebsiteChatMessage = {
      id: AIWebsiteUtils.generateMessageId(),
      content: 'Generating...',
      timestamp: new Date(),
      isUser: false,
      isLoading: true
    };
    this.messages.push(loadingMessage);

    // Trigger scroll to bottom
    this.shouldScrollToBottom = true;

    // Generate website
    this.generateWebsite();

    // Clear input
    this.userInput = '';
  }

  /**
   * Generate website using AI
   */
  private generateWebsite(): void {
    this.isGenerating = true;
    
    // Emit loading state to parent components
    this.generationStateChange.emit({ isGenerating: true });

    // Create enhanced prompt with business context
    const userPrompt = this.messages[this.messages.length - 2].content;
    const enhancedPrompt = `Business ID: ${this.businessId || 'default'}
Workspace ID: ${this.workspaceId || 'default'}

User Request: ${userPrompt}

Please generate or modify the website based on the user's request above.`;

    const request: AIWebsiteGenerationRequest = {
      businessId: this.businessId || 'default',
      workspaceId: this.workspaceId || 'default', 
      userPrompt: enhancedPrompt,
      currentWebsiteJson: this.currentWebsiteJson || undefined
    };

    // Validate request
    const errors = AIWebsiteUtils.validateRequest(request);
    if (errors.length > 0) {
      this.handleGenerationError(errors.join(', '));
      return;
    }

    this.aiWebsiteService.generateWebsite(request)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.handleGenerationSuccess(response);
        },
        error: (error) => {
          this.handleGenerationError(error.message || 'Failed to generate website');
        }
      });
  }

  /**
   * Handle successful website generation
   */
  private handleGenerationSuccess(response: AIWebsiteGenerationResponse): void {
    this.isGenerating = false;

    // Remove loading message
    this.messages = this.messages.filter(m => !m.isLoading);

    if (response.success && response.revisedWebsiteJson) {
      // Add AI response message
      const aiMessage: AIWebsiteChatMessage = {
        id: AIWebsiteUtils.generateMessageId(),
        content: this.formatAIResponse(response),
        timestamp: new Date(),
        isUser: false,
        websiteJson: response.revisedWebsiteJson,
        changesApplied: response.changesApplied
      };
      this.messages.push(aiMessage);

      // Trigger scroll to bottom
      this.shouldScrollToBottom = true;

      // Emit website update
      this.websiteUpdated.emit(response.revisedWebsiteJson);
      
      // Emit generation completion
      this.generationStateChange.emit({ isGenerating: false });

      // Success is shown in the message status
    } else {
      this.addSystemMessage(`❌ ${response.message || 'Failed to generate website'}`);
      // Emit generation completion with error
      this.generationStateChange.emit({ 
        isGenerating: false, 
        error: response.message || 'Failed to generate website' 
      });
    }
  }

  /**
   * Handle website generation error
   */
  private handleGenerationError(errorMessage: string): void {
    this.isGenerating = false;

    // Remove loading message
    this.messages = this.messages.filter(m => !m.isLoading);

    // Add error message
    this.addSystemMessage(`❌ Error: ${errorMessage}`);
    
    // Trigger scroll to bottom
    this.shouldScrollToBottom = true;
    
    // Emit generation completion with error
    this.generationStateChange.emit({ 
      isGenerating: false, 
      error: errorMessage 
    });
  }

  /**
   * Format AI response for display
   */
  private formatAIResponse(response: AIWebsiteGenerationResponse): string {
    if (response.concludingMessage) {
      return response.concludingMessage;
    }
    
    if (response.message) {
      return response.message;
    }

    return 'Website updated successfully!';
  }

  /**
   * Format message content for display (handles markdown-like formatting)
   */
  formatMessageContent(content: string): string {
    if (!content) return '';
    
    // Convert **text** to <strong>text</strong>
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Convert • to bullet points
    content = content.replace(/•/g, '• ');
    
    // Convert newlines to <br> tags
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }

  /**
   * Show JSON preview dialog
   */
  showJsonPreview(websiteJson: string): void {
    this.previewJson = websiteJson;
    this.showJsonDialog = true;
  }

  /**
   * Copy JSON to clipboard
   */
  copyJsonToClipboard(): void {
    navigator.clipboard.writeText(this.previewJson).then(() => {
      // Could add a toast notification here
      console.log('JSON copied to clipboard');
    }).catch(err => {
      console.error('Failed to copy JSON:', err);
    });
  }

  /**
   * Apply JSON changes from preview
   */
  applyJsonChanges(): void {
    this.applyWebsiteChanges(this.previewJson);
    this.showJsonDialog = false;
  }

  /**
   * Toggle menu dropdown
   */
  toggleMenu(): void {
    this.showMenu = !this.showMenu;
  }

  /**
   * Handle click outside to close menu
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    const menuButton = document.querySelector('.menu-button');
    const dropdownMenu = document.querySelector('.dropdown-menu');
    
    if (menuButton && dropdownMenu && 
        !menuButton.contains(target) && 
        !dropdownMenu.contains(target)) {
      this.showMenu = false;
    }
  }

  /**
   * Clear chat history
   */
  clearChat(): void {
    this.messages = [];
    this.showMenu = false; // Close menu after clearing
  }

  /**
   * Apply website changes manually
   */
  applyWebsiteChanges(websiteJson: string): void {
    if (AIWebsiteUtils.isValidWebsiteJson(websiteJson)) {
      this.websiteUpdated.emit(websiteJson);
      this.addSystemMessage('✅ Website changes applied manually!');
    } else {
      this.addSystemMessage('❌ Invalid website JSON format');
    }
  }

  /**
   * Track message input for Enter key
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * Scroll to bottom of chat
   */
  scrollToBottom(): void {
    if (this.chatMessagesRef && this.chatMessagesRef.nativeElement) {
      setTimeout(() => {
        const element = this.chatMessagesRef.nativeElement;
        element.scrollTop = element.scrollHeight;
      }, 50);
    }
  }

  /**
   * Track by function for ngFor
   */
  trackByMessageId(index: number, message: AIWebsiteChatMessage): string {
    return message.id;
  }
}
