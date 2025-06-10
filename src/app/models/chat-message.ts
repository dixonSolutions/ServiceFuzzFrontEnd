export interface ChatMessage {
  content: string;
  timestamp: Date;
  isUser: boolean;
  isLoading?: boolean;
} 