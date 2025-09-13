import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { DataSvrService } from './data-svr.service';

@Injectable()
export class AuthInterceptorService implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

  constructor(private dataService: DataSvrService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Add auth header if token exists and request is to our API
    const token = this.dataService.jwtToken;
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

      // Use DataSvrService refresh token method
      return this.dataService.refreshToken().pipe(
        switchMap((response) => {
          this.isRefreshing = false;
          this.refreshTokenSubject.next(response.token);
          
          // Retry the original request with new token
          return next.handle(this.addTokenHeader(request, response.token));
        }),
        catchError((error) => {
          this.isRefreshing = false;
          // Refresh failed, clear auth state
          this.dataService.clearState();
          return throwError(() => error);
        })
      );
    } else {
      // Wait for the refresh to complete and retry with new token
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        switchMap(token => next.handle(this.addTokenHeader(request, token)))
      );
    }
  }

}