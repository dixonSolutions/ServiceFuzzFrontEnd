import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';
import { map, Observable, BehaviorSubject, of } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BusinessBasicInfo } from '../models/businessbasicinfo';
import confetti from 'canvas-confetti';
import { ServiceFuzzFreeTrialSubscriptions } from '../models/FreeTrialDetails';
import JSConfetti from 'js-confetti'; // Import the JSConfetti class
import { ChatMessage } from '../models/chat-message';


@Injectable({
  providedIn: 'root'
})
export class DataSvrService {
  private static instance: DataSvrService;
  public geminiResponse: string = '';
  private readonly instanceId = Math.random();
  private apiUrl = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';
  private _currentUser = new BehaviorSubject<ServiceFuzzAccount | undefined>(undefined);
  private _jwtToken = new BehaviorSubject<string | undefined>(undefined);
  public businesses: BusinessBasicInfo[] = [];
  public freeTrialDetails: ServiceFuzzFreeTrialSubscriptions | undefined;
  public jsConfetti: JSConfetti = new JSConfetti();

  // Chat related properties
  private _chatMessages = new BehaviorSubject<ChatMessage[]>([]);
  public chatMessages$ = this._chatMessages.asObservable();

  constructor(private http: HttpClient, private snackBar: MatSnackBar) {
    if (DataSvrService.instance) {
      console.warn('Attempting to create a second instance of DataSvrService');
      return DataSvrService.instance;
    }
    DataSvrService.instance = this;
  }

  // Public getters and setters for state management
  get currentUser(): ServiceFuzzAccount | undefined {
    return this._currentUser.value;
  }

  set currentUser(user: ServiceFuzzAccount | undefined) {
    this._currentUser.next(user);
  }

  get jwtToken(): string | undefined {
    return this._jwtToken.value;
  }

  set jwtToken(token: string | undefined) {
    this._jwtToken.next(token);
  }

  // Method to verify instance
  getInstanceId(): number {
    return this.instanceId;
  }
  getUserByID(id: string): Observable<ServiceFuzzAccount> {
    return this.http.get<{ user: ServiceFuzzAccount; token: any }>(
      `${this.apiUrl}/api/User/GetUserById/${id}`,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        console.log("response", response);
        
        // Extract the user object from the response
        const user = response.user;
        
        // Trim whitespace from user fields
        const cleanUser: ServiceFuzzAccount = {
          ...user,
          email: user.email?.trim() || '',
          name: user.name?.trim() || '',
          userID: user.userID?.trim() || ''
        };
        
        // Extract and set the JWT token
        if (response.token && response.token.result) {
          this.jwtToken = response.token.result;
        }
        
        // Set the cleaned user as current user
        this.currentUser = cleanUser;
        
        console.log("cleaned user", cleanUser);
        console.log("extracted token", this.jwtToken);
        
        return cleanUser;
      })
    );
  }
  GenerateAndSendMagicLinkForLogIn(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
        `${this.apiUrl}/api/UserVerification/generate-magic-link`,
        JSON.stringify(email),
        {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        return response;
      })
    );
  }
  GenerateAndSendMagicLinkForSignUp(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
        `${this.apiUrl}/api/UserVerification/generate-signup-magic-link`,
        { email: email },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      ).pipe(
        map(response => {
          return response;
        })
      );
  }
  
  verifyGoogleUser(googleToken: string): Observable<{ user: ServiceFuzzAccount; token: string }> {
    return this.http.post<{ user: ServiceFuzzAccount; token: string }>(
      `${this.apiUrl}/api/User/VerifyUserViaGoogle/verify-google`,
      JSON.stringify(googleToken), 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        this.jwtToken = response.token;
        this.currentUser = response.user;
        return response;
      })
    );
  }

  CreateUserWithGoogleToken(googleToken: string): Observable<{ user: ServiceFuzzAccount; token: string }> {
    return this.http.post<{ user: ServiceFuzzAccount; token: string }>(
      `${this.apiUrl}/api/User/CreateUserViaGoogle/create-google`,
      JSON.stringify(googleToken), 
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    ).pipe(
      map(response => {
        this.jwtToken = response.token;
        this.currentUser = response.user;
        return response;
      })
    );
  }

  getFreeTrialDetailsForUserByEmail(): Observable<ServiceFuzzFreeTrialSubscriptions> {
    if (!this.currentUser?.email) {
      throw new Error('User email is required');
    }
    
    return this.http.get<ServiceFuzzFreeTrialSubscriptions>(
      `${this.apiUrl}/api/User/GetFreeTrialDetails/${this.currentUser.email}`,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.jwtToken}`
        }
      }
    );
  }

  getBusinessesForUser(ownerEmail: string): Observable<BusinessBasicInfo[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.jwtToken}`
    });

    return this.http.get<BusinessBasicInfo[]>(
      `${this.apiUrl}/api/Business/GetBusinessForUser?ownerEmail=${ownerEmail}`,
      { headers }
    );
  }

  // Chat methods
  get messages(): ChatMessage[] {
    return this._chatMessages.value;
  }

  private addMessage(message: ChatMessage) {
    const currentMessages = this._chatMessages.value;
    this._chatMessages.next([...currentMessages, message]);
  }

  clearChatMessages() {
    this._chatMessages.next([]);
    this.openSnackBar('Conversation cleared successfully', 'Close', 3000);
  }

  SendGeminiRequest(request: string): Observable<string> {
    // Add user message to history
    this.addMessage({
      content: request,
      timestamp: new Date(),
      isUser: true
    });

    // Add placeholder for AI response
    const loadingMessage: ChatMessage = {
      content: '',
      timestamp: new Date(),
      isUser: false,
      isLoading: true
    };
    this.addMessage(loadingMessage);

    // Format conversation history
    const conversationHistory = this.messages
      .filter(m => !m.isLoading)
      .map(m => `${m.isUser ? 'User' : 'Assistant'} (${new Date(m.timestamp).toLocaleTimeString()}): ${m.content}`)
      .join('\n');

    // ServiceFuzz context for the AI
    const serviceFuzzContext = `You are a helpful assistant that can answer questions about ServiceFuzz. You must follow these rules strictly:
1. Only answer questions related to ServiceFuzz
2. If a user asks about something unrelated to ServiceFuzz, politely remind them that you can only help with ServiceFuzz-related questions
3. If asked about conversation history or context, provide specific details from the conversation history below
4. Be accurate about the conversation history - if you're not sure about previous messages, say so
5. Never make up or assume previous messages that aren't in the history
6. If the user asks about you name or who you are, your name is Tilda, you are an AI assistant that can answer questions about ServiceFuzz.
7.If the user asks about you model, you cna answer them that it is gemini 2.0 flash.
Here is the background information about ServiceFuzz:
8. You don't have to be so strict with the rules and being on topic, you can be more friendly and helpful and prvide additional information that is not related to servicefuzz!

ServiceFuzz: Revolutionizing Service-Based Businesses

ServiceFuzz is a cutting-edge, comprehensive platform that transforms how service-based businesses operate and connect with their customers. Whether you're running a fitness studio, managing a spa, operating an IT service company, or handling any service-based business, ServiceFuzz provides the complete toolkit you need to succeed in today's digital marketplace.

Our Platform at a Glance:
- Business Management Portal: Streamline your operations with our intuitive dashboard
- Professional Website Builder: Create stunning, mobile-responsive websites in minutes
- Smart Booking System: Handle appointments, memberships, and recurring bookings effortlessly
- Staff Management Suite: Manage your team, track performance, and optimize scheduling
- Integrated Payment Processing: Secure, flexible payment options for all business types
- Comprehensive Analytics: Make data-driven decisions with real-time insights
- Customer Engagement Tools: Build lasting relationships with automated communications
- Mobile-First Design: Manage your business from anywhere, on any device

Built with modern technologies and following industry best practices, ServiceFuzz is constantly evolving to meet the changing needs of service-based businesses. Our platform combines power with simplicity, allowing you to focus on what matters most - delivering exceptional service to your customers.

Join thousands of successful businesses already using ServiceFuzz to streamline their operations, boost customer satisfaction, and drive growth in their service-based businesses.

Previous Conversation History:
${conversationHistory}

Current User Question: ${request}`;
    if(this.messages.length > 50) {
      this.openSnackBar('You have ran out of messages for this conversation, please start a new conversation.', 'Close', 3000);
      throw new Error('I am sorry, I can only answer questions about ServiceFuzz.');
    }
    return this.http.post<any>(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDLtw7CI2uBYCgJqgiBdnFYV4FJ8uQQemo`, {
      "contents": [
        {
          "parts": [
            {
              "text": serviceFuzzContext
            }
          ]
        }
      ]
    }, {}).pipe(
      map(response => {
        // Remove loading message and update messages array
        const messages = this._chatMessages.value.filter(m => !m.isLoading);
        this._chatMessages.next(messages);
        
        // Extract the text from the response structure
        const text = response.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated';
        
        // Add AI response to history
        this.addMessage({
          content: text,
          timestamp: new Date(),
          isUser: false
        });

        return text;
      })
    );
  }

  openSnackBar(message: string, action: string, duration: number) {
    this.snackBar.open(message, action, {
      duration: duration,
    });
  }

  clearState(): void {
    this.currentUser = undefined;
    this.jwtToken = undefined;
    this.freeTrialDetails = undefined;
  }

  // Confetti Methods
  triggerBasicConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });
  }
  triggerEmojiConfetti(
    customEmojis?: string[],
    confettiNumber: number = 70,
    emojiSize: number = 2
  ) {
    const defaultEmojis = ['🌈', '⚡️', '💥', '✨', '💫', '🎉', '🥳'];
    const emojisToUse = customEmojis && customEmojis.length > 0
                         ? customEmojis
                         : defaultEmojis;

    this.jsConfetti.addConfetti({
      emojis: emojisToUse,
      confettiNumber: confettiNumber, // Total number of confetti particles
      emojiSize: emojiSize,         // Size of each emoji in pixels
    });
  }

  triggerSuccessConfetti() {
    const end = Date.now() + 1000;

    const colors = ['#00ff00', '#4CAF50', '#45D1FD'];

    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    }());
  }

  triggerCelebrationConfetti() {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      }));
      confetti(Object.assign({}, defaults, {
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      }));
    }, 250);
  }
 

  triggerFireworks() {
    const duration = 5 * 1000;
    const animationEnd = Date.now() + duration;
    let skew = 1;

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    (function frame() {
      const timeLeft = animationEnd - Date.now();
      const ticks = Math.max(200, 500 * (timeLeft / duration));
      skew = Math.max(0.8, skew - 0.001);

      confetti({
        particleCount: 1,
        startVelocity: 0,
        ticks: ticks,
        origin: {
          x: Math.random(),
          y: (Math.random() * skew) - 0.2
        },
        colors: ['#FF0000', '#FFA500', '#FFFF00', '#00FF00', '#0000FF', '#4B0082', '#EE82EE'],
        shapes: ['circle'],
        gravity: randomInRange(0.4, 0.6),
        scalar: randomInRange(0.8, 1.2),
        drift: randomInRange(-0.4, 0.4)
      });

      if (timeLeft > 0) {
        requestAnimationFrame(frame);
      }
    }());
  }
} 