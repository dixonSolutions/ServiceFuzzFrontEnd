import { Injectable, Inject } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse, HttpClient } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, map } from 'rxjs/operators';
import { CookieService } from 'ngx-cookie-service';

@Injectable()
export class AuthInterceptorService implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);
  private readonly REGULAR_TOKEN_KEY = 'sf_auth_token';
  private readonly SIGNIN_TOKEN_COOKIE = 'sf_signin_token';
  private readonly API_URL = 'https://servicefuzzapi-atf8b4dqawc8dsa9.australiaeast-01.azurewebsites.net';

  constructor(
    @Inject(HttpClient) private http: HttpClient,
    private cookieService: CookieService
  ) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add auth header if token exists and request is to our API
    const token = sessionStorage.getItem(this.REGULAR_TOKEN_KEY);
    const isApiUrl = req.url.includes('servicefuzzapi');
    
    if (token && isApiUrl) {
      req = this.addTokenHeader(req, token);
    }

    return next.handle(req).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401 && isApiUrl) {
          return this.handle401Error(req, next);
        }
        return throwError(() => error);
      })
    );
  }

  private addTokenHeader(request: HttpRequest<any>, token: string): HttpRequest<any> {
    return request.clone({
      headers: request.headers.set('Authorization', `Bearer ${token}`)
    });
  }

  private handle401Error(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);

      const signInToken = this.cookieService.get(this.SIGNIN_TOKEN_COOKIE);
      if (signInToken) {
        return this.authenticateWithSignInToken(signInToken).pipe(
          switchMap((response) => {
            this.isRefreshing = false;
            this.refreshTokenSubject.next(response.token);
            
            // Store the new regular token
            sessionStorage.setItem(this.REGULAR_TOKEN_KEY, response.token);
            
            // Retry the original request with new token
            return next.handle(this.addTokenHeader(request, response.token));
          }),
          catchError((error) => {
            this.isRefreshing = false;
            // Sign-in token has expired, clear auth state
            this.clearAuthState();
            return throwError(() => error);
          })
        );
      } else {
        this.isRefreshing = false;
        // No sign-in token available, clear auth state
        this.clearAuthState();
        return throwError(() => new HttpErrorResponse({ 
          status: 401, 
          statusText: 'Unauthorized - No refresh token available' 
        }));
      }
    } else {
      // Wait for the refresh to complete and retry with new token
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.addTokenHeader(request, token)))
      );
    }
  }

  private authenticateWithSignInToken(signInToken: string): Observable<{ user: any; token: string; message: string; tokenExpires: string }> {
    return this.http.post<{ user: any; token: string; message: string; tokenExpires: string }>(
      `${this.API_URL}/api/auth/authenticate-signin-token`,
      { SignInToken: signInToken },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
  }

  private clearAuthState(): void {
    this.cookieService.delete(this.SIGNIN_TOKEN_COOKIE, '/');
    sessionStorage.removeItem(this.REGULAR_TOKEN_KEY);
    console.log('Auth state cleared due to token refresh failure');
  }
}