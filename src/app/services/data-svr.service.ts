import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ServiceFuzzAccount } from '../models/ServiceFuzzAccounts';
import { map, Observable, BehaviorSubject } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BusinessBasicInfo } from '../models/businessbasicinfo';
import confetti from 'canvas-confetti';
import { ServiceFuzzFreeTrialSubscriptions } from '../models/FreeTrialDetails';
import JSConfetti from 'js-confetti'; // Import the JSConfetti class


@Injectable({
  providedIn: 'root'
})
export class DataSvrService {
  private static instance: DataSvrService;
  private readonly instanceId = Math.random();
  private apiUrl = 'https://localhost:44327';
  private _currentUser = new BehaviorSubject<ServiceFuzzAccount | undefined>(undefined);
  private _jwtToken = new BehaviorSubject<string | undefined>(undefined);
  public businesses: BusinessBasicInfo[] = [];
  public freeTrialDetails: ServiceFuzzFreeTrialSubscriptions | undefined;
  public jsConfetti: JSConfetti = new JSConfetti();


  constructor(private http: HttpClient, private snackBar: MatSnackBar) {
    if (DataSvrService.instance) {
      console.warn('Attempting to create a second instance of DataSvrService');
      return DataSvrService.instance;
    }
    console.log('Creating DataSvrService instance with ID:', this.instanceId);
    DataSvrService.instance = this;
  }

  // Public getters and setters for state management
  get currentUser(): ServiceFuzzAccount | undefined {
    return this._currentUser.value;
  }

  set currentUser(user: ServiceFuzzAccount | undefined) {
    console.log('Setting user in service instance:', this.instanceId);
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
  
  verifyGoogleUser(googleToken: string): Observable<{ user: ServiceFuzzAccount; token: string }> {
    console.log('Verifying user in service instance:', this.instanceId);
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
        console.log('User verified in service instance:', this.instanceId);
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

  openSnackBar(message: string, action: string, duration: number) {
    this.snackBar.open(message, action, {
      duration: duration,
    });
  }

  clearState(): void {
    console.log('Clearing state in service instance:', this.instanceId);
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