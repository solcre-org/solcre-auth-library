import { LocalStorageService } from 'angular-2-local-storage';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Router } from '@angular/router';
import { EventEmitter } from '@angular/core';
import { AccessTokenModel } from './access-token.model';
import { Injectable } from '@angular/core';
import { environment } from './environment';

@Injectable({ //duda
  providedIn: 'root'
})
export class AuthService {

    codeDomain: string;
    public searchingCode: EventEmitter<boolean> = new EventEmitter();
    public codeNotFound: EventEmitter<boolean> = new EventEmitter();

    private accessToken: AccessTokenModel;

    constructor(
        private router: Router,
        private httpClient: HttpClient,
        private localStorageService: LocalStorageService
    ) { }

    public isAuthenticated() {
        let currentUser = this.localStorageService.get('access_token');
        if (currentUser) {
            return true;
        };
        return false;
    }

    public login(email: string, password: string) {
        let username = email.split("@");

        this.httpClient.post(environment.apiURL + this.codeDomain + environment.oauthURI, {
            "client_id": "columnis_manager",
            "grant_type": "password",
            "username": username[0],
            "password": password
        }).subscribe(
            (response: any) => {
                this.localStorageService.set('code', this.codeDomain);
                this.localStorageService.set('access_token', response['access_token']);

                // this.localStorageService.set('refresh_token', response['refresh_token']);
                console.log("Logged in", response);
                this.router.navigate(['/']);
                this.accessToken = this.parseAccessToken(response);
            },
            (error: HttpErrorResponse) => {
                let message: string;
                // this.translateService.get('share.dialog.errorPassword').subscribe(response => {
                //     message = response;
                // });
                console.log(message);
                console.log(error.error.detail);
            }


        );
    }

    public logout() {
        // this.localStorageService.clearAll();
        this.localStorageService.remove('access_token');
        this.localStorageService.remove('code');
        this.router.navigate(['/oauth']);
    }

    public getAccessToken(): string {
        return this.localStorageService.get('access_token');
    }


    public setCode(domain: string) {
        this.searchingCode.emit(true);
        if (this.localStorageService.get(domain)) {
            console.log("desde ls");
            this.codeNotFound.emit(false);
            this.searchingCode.emit(false);
            this.codeDomain = this.localStorageService.get(domain);
        } else {
            let params = new HttpParams().set('domain', domain);
            this.httpClient.get(environment.apiURL + environment.codeURI, { params }).subscribe((response: any) => {
                this.codeDomain = response.code;
                if (!((this.codeDomain) == '000')) {
                    this.localStorageService.set(domain, this.codeDomain);
                    this.searchingCode.emit(false); //si encuentra un codigo
                } else {
                    this.searchingCode.emit(false); //si no encuentra
                    this.codeNotFound.emit(true);
                }
            }, (error: HttpErrorResponse) => {
                this.searchingCode.emit(false); //si no encuentra
                this.codeNotFound.emit(true);
                console.log(error);
            });
        }
    }

    public getCode(): string {
        return this.localStorageService.get('code');
    }

    private parseAccessToken(obj: any): AccessTokenModel {
        let accessToken: AccessTokenModel = null;

        //Check access token
        if (obj && obj.access_token) {
            //parse expiration date
            let expiration = new Date();
            expiration.setMinutes(expiration.getMinutes() + (obj.expires_in / 60));

            //Creates the access token model
            accessToken = new AccessTokenModel(
                obj.access_token,
                obj.refresh_token,
                expiration
            );
        }
        console.log(accessToken);
        return accessToken;
    }

}