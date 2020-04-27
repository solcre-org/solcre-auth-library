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
​
@Injectable()
export class AuthInterceptor implements HttpInterceptor {
    isRefreshingToken: boolean = false;
    tokenSubject: BehaviorSubject<string> = new BehaviorSubject<string>(null);
​
    constructor(
        private authService: AuthService) { }
​
    
    //Intercep method
    public intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        // Pass on the cloned request instead of the original request.
        return next.handle(req)
            .pipe(
				catchError((error, caught) => {
					//Check error type
					if (error instanceof HttpErrorResponse) {
                        console.log(error);
                        switch (error.status) {
							case 400:
								return this.handle400Error(error);
							case 401:
								return this.handle401Error(error, req, next);
							case 403:
								return this.handle403Error(error);
						}
					}
					return new Observable<HttpEvent<any>>();
				})
			) as any;
    }
​
    //Add authorization header to requests
    private addToken(req: HttpRequest<any>, token: string): HttpRequest<any> {
        return req.clone({ 
            setHeaders: { 
                Authorization: 'Bearer ' + token 
            }
        });
    }
​
    //Helper function when the refresh token doesnt work
    private logout(error: string){
        //logout users, redirect to login page
        this.authService.logout();
        return throwError(error);
    }
​
    //Handle 403 error
    private handle403Error(error: HttpErrorResponse) {
        return this.logout(error.message);
    }
​
    //Hanfle 401 error
    private handle401Error(error: HttpErrorResponse, req: HttpRequest<any>, next: HttpHandler) {
        //@@TODO: find a way to configure it
        //Ignore 401 status when the url are Oauth
        if(req.url.indexOf('/oauth') > -1){
            return throwError(error);
        }
        return this.logout(error.message);
​       
    }
​
    //Handle 400 error
    private handle400Error(error:HttpErrorResponse) {
        if (error 
            && error.status === 400 
            && error.error 
            && error.error.error === 'invalid_grant') {
            // If we get a 400 and the error message is 'invalid_grant', the token is no longer valid so logout.
            return this.logout(error.message);
        }
        
        //Normal flow
        return throwError(error);
    }
}