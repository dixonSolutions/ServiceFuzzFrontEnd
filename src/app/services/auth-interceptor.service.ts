import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class AuthInterceptorService implements HttpInterceptor {

  constructor() {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Get token from sessionStorage directly to avoid circular dependency
    const token = sessionStorage.getItem('sf_auth_token');
    const isApiUrl = req.url.includes('servicefuzzapi');
    
    if (token && isApiUrl) {
      req = this.addTokenHeader(req, token);
    }

    return next.handle(req).pipe(
      catchError(error => {
        if (error instanceof HttpErrorResponse && error.status === 401 && isApiUrl) {
          // Just clear tokens on 401, don't try to refresh to avoid circular dependency
          sessionStorage.removeItem('sf_auth_token');
          // Clear cookie as well
          document.cookie = 'sf_signin_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/';
          console.log('🔒 401 error - cleared authentication tokens');
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

}