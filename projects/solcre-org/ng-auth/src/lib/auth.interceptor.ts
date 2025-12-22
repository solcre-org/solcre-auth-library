import { Injectable } from '@angular/core';
import { 
    HttpEvent, 
    HttpInterceptor, 
    HttpHandler, 
    HttpRequest,
    HttpErrorResponse
} from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from './auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    isRefreshingToken = false;
    tokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

    constructor(
        private authService: AuthService) { }

    
    //Intercept method
    public intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
        // Pass on the cloned request instead of the original request.
        return next.handle(req)
            .pipe(
                catchError((error) => {
                    //Check error type
                    if (error instanceof HttpErrorResponse) {
                        switch (error.status) {
                            case 400:
                                return this.handle400Error(error);
                            case 401:
                                return this.handle401Error(error, req);
                            case 403:
                                return this.handle403Error(error);
                            default:
                                return throwError(() => error);
                        }
                    }
                    return throwError(() => error);
                })
            );
    }

    //Add authorization header to requests
    private addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
        return req.clone({ 
            setHeaders: { 
                Authorization: 'Bearer ' + token 
            }
        });
    }

    //Helper function when the refresh token doesnt work
    private logout(error: string) {
        //logout users, redirect to login page
        this.authService.logout();
        return throwError(() => error);
    }

    //Handle 403 error
    private handle403Error(error: HttpErrorResponse) {
        return this.logout(error.message);
    }

    //Handle 401 error
    private handle401Error(error: HttpErrorResponse, req: HttpRequest<unknown>) {
        //@@TODO: find a way to configure it
        //Ignore 401 status when the url are Oauth
        if(req.url.indexOf('/oauth') > -1){
            return throwError(() => error);
        }
        return this.logout(error.message);
       
    }

    //Handle 400 error
    private handle400Error(error: HttpErrorResponse) {
        if (error 
            && error.status === 400 
            && error.error 
            && error.error.error === 'invalid_grant') {
            // If we get a 400 and the error message is 'invalid_grant', the token is no longer valid so logout.
            return this.logout(error.message);
        }
        
        //Normal flow
        return throwError(() => error);
    }
}