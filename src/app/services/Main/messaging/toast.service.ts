import { Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';

export type ToastPosition = 'top-left' | 'top-center' | 'top-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'center';
export type ToastSeverity = 'success' | 'info' | 'warn' | 'error' | 'secondary' | 'contrast';

export interface ToastOptions {
  title?: string;
  message: string;
  severity?: ToastSeverity;
  position?: ToastPosition;
  life?: number; // Duration in milliseconds
  sticky?: boolean; // If true, toast won't auto-close
  closable?: boolean; // Show close button
  key?: string; // For positioning multiple toasts
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  constructor(private messageService: MessageService) {}

  /**
   * Show a toast message with full customization
   */
  show(options: ToastOptions): void {
    this.messageService.add({
      key: options.key || options.position || 'default',
      severity: options.severity || 'info',
      summary: options.title || this.getDefaultTitle(options.severity || 'info'),
      detail: options.message,
      life: options.sticky ? 0 : (options.life || 5000),
      closable: options.closable !== false
    });
  }

  /**
   * Show a success toast
   */
  success(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.show({
      message,
      title: title || 'Success',
      severity: 'success',
      position: 'top-right',
      life: 3000,
      ...options
    });
  }

  /**
   * Show an error toast
   */
  error(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.show({
      message,
      title: title || 'Error',
      severity: 'error',
      position: 'top-right',
      life: 5000,
      ...options
    });
  }

  /**
   * Show a warning toast
   */
  warning(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.show({
      message,
      title: title || 'Warning',
      severity: 'warn',
      position: 'top-right',
      life: 4000,
      ...options
    });
  }

  /**
   * Show an info toast
   */
  info(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.show({
      message,
      title: title || 'Information',
      severity: 'info',
      position: 'top-right',
      life: 4000,
      ...options
    });
  }

  /**
   * Show a secondary toast (neutral)
   */
  secondary(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.show({
      message,
      title: title || 'Notice',
      severity: 'secondary',
      position: 'top-right',
      life: 4000,
      ...options
    });
  }

  /**
   * Show a contrast toast (high contrast)
   */
  contrast(message: string, title?: string, options?: Partial<ToastOptions>): void {
    this.show({
      message,
      title: title || 'Alert',
      severity: 'contrast',
      position: 'top-right',
      life: 4000,
      ...options
    });
  }

  /**
   * Show a sticky toast that doesn't auto-close
   */
  sticky(message: string, title?: string, severity: ToastSeverity = 'info', position: ToastPosition = 'top-right'): void {
    this.show({
      message,
      title,
      severity,
      position,
      sticky: true,
      closable: true
    });
  }

  /**
   * Show a toast at a specific position
   */
  showAt(position: ToastPosition, message: string, title?: string, severity: ToastSeverity = 'info', life: number = 4000): void {
    this.show({
      message,
      title,
      severity,
      position,
      life
    });
  }

  /**
   * Clear all toasts
   */
  clear(key?: string): void {
    this.messageService.clear(key);
  }

  /**
   * Clear all toasts
   */
  clearAll(): void {
    this.messageService.clear();
  }

  /**
   * Compatibility method for existing openSnackBar calls
   * @deprecated Use the new toast methods instead
   */
  openSnackBar(message: string, action: string, duration: number): void {
    // Convert action to severity
    let severity: ToastSeverity = 'info';
    if (action.toLowerCase().includes('error') || message.toLowerCase().includes('error')) {
      severity = 'error';
    } else if (action.toLowerCase().includes('success') || message.toLowerCase().includes('success')) {
      severity = 'success';
    } else if (action.toLowerCase().includes('warn') || message.toLowerCase().includes('warn')) {
      severity = 'warn';
    }

    this.show({
      message,
      severity,
      position: 'top-right',
      life: duration
    });
  }

  /**
   * Get default title based on severity
   */
  private getDefaultTitle(severity: ToastSeverity): string {
    switch (severity) {
      case 'success': return 'Success';
      case 'error': return 'Error';
      case 'warn': return 'Warning';
      case 'info': return 'Information';
      case 'secondary': return 'Notice';
      case 'contrast': return 'Alert';
      default: return 'Notification';
    }
  }
}
