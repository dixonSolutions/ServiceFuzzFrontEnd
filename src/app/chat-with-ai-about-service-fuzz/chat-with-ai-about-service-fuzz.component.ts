import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { DataSvrService } from '../services/data-svr.service';
import { ChatMessage } from '../models/chat-message';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-chat-with-ai-about-service-fuzz',
  standalone: false,
  templateUrl: './chat-with-ai-about-service-fuzz.component.html',
  styleUrl: './chat-with-ai-about-service-fuzz.component.css'
})
export class ChatWithAiAboutServiceFuzzComponent implements OnInit, AfterViewChecked {
  userMessage: string = '';
  isLoading: boolean = false;
  readonly MAX_WORDS = 3000;
  messages: ChatMessage[] = [];
  showWordLimitError: boolean = false;

  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('messageInput') private messageInput!: ElementRef;

  constructor(
    public data: DataSvrService,
    private snackBar: MatSnackBar
  ) {
  }

  ngOnInit(): void {
    this.data.chatMessages$.subscribe(messages => {
      this.messages = messages;
      this.scrollToBottom();
    });
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    try {
      this.messagesContainer.nativeElement.scrollTop = this.messagesContainer.nativeElement.scrollHeight;
    } catch(err) {}
  }

  get wordCount(): number {
    return this.userMessage.trim() ? this.userMessage.trim().split(/\s+/).length : 0;
  }

  get isWordLimitExceeded(): boolean {
    return this.wordCount > this.MAX_WORDS;
  }

  onInput() {
    if (this.isWordLimitExceeded) {
      // Trim the message to the maximum word limit
      const words = this.userMessage.trim().split(/\s+/);
      this.userMessage = words.slice(0, this.MAX_WORDS).join(' ');
      
      // Show word limit error message
      if (!this.showWordLimitError) {
        this.showWordLimitError = true;
        this.snackBar.open(
          `Maximum ${this.MAX_WORDS} words allowed. Your message has been trimmed.`,
          'OK',
          {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['word-limit-snackbar']
          }
        );
      }
    } else {
      this.showWordLimitError = false;
    }
  }

  onKeyPress(event: KeyboardEvent) {
    if (this.isWordLimitExceeded && event.key !== 'Backspace' && event.key !== 'Delete') {
      event.preventDefault();
    }
  }

  sendMessage() {
    if (!this.userMessage || this.isLoading || this.isWordLimitExceeded) return;
    
    this.isLoading = true;
    this.data.SendGeminiRequest(this.userMessage).subscribe({
      next: () => {
        this.userMessage = ''; // Clear input after sending
        this.showWordLimitError = false;
      },
      error: (error) => {
        console.error('Error getting AI response:', error);
        this.snackBar.open(
          'Error getting AI response. Please try again.',
          'OK',
          {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
            panelClass: ['error-snackbar']
          }
        );
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }

  formatTimestamp(date: Date): string {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  clearConversation() {
    if (confirm('Are you sure you want to clear the entire conversation? This action cannot be undone.')) {
      this.data.clearChatMessages();
    }
  }
}
