
import { HttpErrorResponse, HttpClient, HttpHeaders } from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Injectable } from '@angular/core';
import { LocalStorageService } from 'angular-2-local-storage';

import { AccessTokenModel } from './access-token.model';
import { AuthConfigInterface } from './auth-config.interface';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

//import { environment } from './environment';

@Injectable({ //duda
	providedIn: 'root'
})
export class AuthService {
	// Models
	private me: any;
	private config: AuthConfigInterface;
	private accessToken: AccessTokenModel;

	// User session events emitters
	private onSessionStateChange: EventEmitter<boolean>;
	private onMeChanged: EventEmitter<any>;

	// Service constructure
	constructor(
		private httpClient: HttpClient,
		private storageService: LocalStorageService) {
		// Create event emitters
		this.onSessionStateChange = new EventEmitter<boolean>();
		this.onMeChanged = new EventEmitter<any>();

		// Default values
		this.config = {};
	}

	// Methods
	public setConfig(config: AuthConfigInterface): void {
		this.config = config;
	}

	public getAccessToken(): AccessTokenModel {
		return this.accessToken;
	}

	public getMe(): any {
		return this.me;
	}

	public isLogged(): boolean {
		return !!this.accessToken;
	}

	public getOnSessionStateChange(): Observable<boolean> {
		return this.onSessionStateChange;
	}

	public getOnMeChanged(): Observable<any> {
		return this.onMeChanged;
	}

	// Generate a access token
	public login(loginUsername: string, loginPassword: string): Observable<boolean> {
		// Create an observable
		const obs = new Observable<boolean>((observer: any) => {
			// Main login obj
			const params: any = {
				username: loginUsername,
				password: loginPassword,
				grant_type: this.config.grantType,
				client_id: this.config.clientId
			};

			// Oauth type has configured?
			if (this.config.oauthType) {
				params['oauth_type'] = this.config.oauthType;
			}

			// Request token
			this.httpClient.post(this.config.apiURL + this.config.oauthUri, params).pipe(
				map((response: any) => {
					// Save token to Local storage
					this.saveToken(response);

					return this.accessToken;
				})
			).subscribe((response: AccessTokenModel) => {
				// Check meUrl
				if (this.config.oauthMeUri) {
					// Request me info
					this.requestMe().subscribe(
						() => {
							// Notify user state
							this.checkAndNotifyMeState();

							// Load response
							observer.next(true);
							observer.complete();
						},
						() => {
							// Rise error
							observer.error(response);
						}
					);
				} else {
					// Notify user state
					this.checkAndNotifyMeState();

					// Complete subscribe
					observer.next(true);
					observer.complete();
				}
			}, (response: HttpErrorResponse) => {
				// Rise error
				observer.error(response);
			});
		});
		return obs;
	}

	// Generate a access token
	public requestMe(): Observable<any> {
		//Header json
		const headers: any = {}

		//Check access token to add access token header
		if (this.accessToken) {
			headers['Authorization'] = 'Bearer ' + this.accessToken.token;
		}

		//Get options
		const httpOptions = {
			headers: new HttpHeaders(headers)
		};
		// Do request
		return this.httpClient.get(this.config.apiURL + this.config.oauthMeUri, httpOptions).pipe(
			map((response: any) => {
				// Load userLogged
				this.me = response

				// Emit parsed and changed
				this.onMeChanged.emit(this.me);
				return this.me;
			})
		);
	}

	public refreshToken(): Observable<AccessTokenModel> {
		// Get refresh token
		const refreshToken: string = this.accessToken instanceof AccessTokenModel ? this.accessToken.refreshToken : '';

		// Request token
		return this.httpClient.post(this.config.apiURL + this.config.oauthUri, {
			refresh_token: refreshToken,
			grant_type: this.config.grantTypeRefresh,
			client_id: this.config.clientId
		}).pipe(
			map((response: any) => {
				// Check response
				if (response) {
					// Load the refresh token
					response.refresh_token = refreshToken;

					// Save to LS
					this.storageService.set(this.config.accessTokenLsKey, response);
				}

				// Creates the access token model
				this.accessToken = this.parseAccessToken(response);
				return this.accessToken;
			})
		);
	}

	public saveToken(tokenJson: any): void {
		if (!tokenJson) {
			return;
		}

		// Save token to Local storage
		this.storageService.set(this.config.accessTokenLsKey, tokenJson);

		//Parse it and load to memory
		this.accessToken = this.parseAccessToken(tokenJson);
	}

	public loadSession(): Observable<boolean> {
		// Create an observable
		const obs = new Observable<boolean>((observer: any) => {
			const accessTokenLs: any = this.storageService.get(this.config.accessTokenLsKey);
			const completeObservable: Function = (result: boolean) => {
				observer.next(result);
				observer.complete();
			};

			// Check access token getted from ls
			if (accessTokenLs) {
				// Creat access token
				this.accessToken = this.parseAccessToken(accessTokenLs);

				// Check token
				if (this.accessToken instanceof AccessTokenModel) {
					// Has configured me
					if (this.config.oauthMeUri) {
						// Request me info
						this.requestMe().subscribe(
							() => {
								// Notify user state
								this.checkAndNotifyMeState();

								// Finish load
								completeObservable(true);
							},
							() => {
								// Finish load
								completeObservable(false);
							}
						);
					} else {
						// Load success without me
						completeObservable(true);
					}
				} else {
					// Finish load
					completeObservable(false);
				}
			} else {
				// Finish load
				completeObservable(false);
			}
		});
		return obs;
	}

	public logout(): void {
		// Clear Local storage
		this.storageService.remove(this.config.accessTokenLsKey);

		// Clear data in memory
		this.me = null;
		this.accessToken = null;

		// Emit state change
		this.checkAndNotifyMeState();
	}

	public checkAndNotifyMeState(): void {
		if (this.me && this.accessToken instanceof AccessTokenModel) {
			// Emit login event
			this.onSessionStateChange.emit(true);
		} else {
			// Emit login event
			this.onSessionStateChange.emit(false);
		}
	}

	public updateMe(me: any): void {
		this.me = me;

		// Emit change
		this.onMeChanged.emit(me);
	}

	// Private methods
	private parseAccessToken(json: any): AccessTokenModel {
		let accessToken: AccessTokenModel = null;

		// Check access token
		if (json && json.access_token) {
			// parse expiration date
			const expiration: Date = new Date();
			const expiresIn: number = json.expires_in / 60;
			expiration.setMinutes(expiration.getMinutes() + expiresIn);

			// Creates the access token model
			accessToken = new AccessTokenModel(
				json.access_token,
				json.refresh_token,
				expiration
			);
		}
		return accessToken;
	}
}