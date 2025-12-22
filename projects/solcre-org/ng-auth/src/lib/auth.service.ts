import { HttpErrorResponse, HttpClient, HttpHeaders } from '@angular/common/http';
import { EventEmitter } from '@angular/core';
import { Injectable } from '@angular/core';
import { StorageService } from './storage.service';

import { AccessTokenModel } from './access-token.model';
import { AuthConfigInterface } from './auth-config.interface';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class AuthService {
	// Models
	private me: unknown;
	private config: AuthConfigInterface = {};
	private accessToken: AccessTokenModel | null = null;

	// User session events emitters
	private onSessionStateChange: EventEmitter<boolean>;
	private onMeChanged: EventEmitter<unknown>;

	// Service constructor
	constructor(
		private httpClient: HttpClient,
		private storageService: StorageService) {
		// Create event emitters
		this.onSessionStateChange = new EventEmitter<boolean>();
		this.onMeChanged = new EventEmitter<unknown>();
	}

	// Methods
	public setConfig(config: AuthConfigInterface): void {
		this.config = config;
	}

	public updateConfig(config: AuthConfigInterface): void {
		this.config = { ...this.config, ...config };
	}

	public getAccessToken(): AccessTokenModel | null {
		return this.accessToken;
	}

	public getMe(): unknown {
		return this.me;
	}

	public isLogged(): boolean {
		return !!this.accessToken;
	}

	public getOnSessionStateChange(): Observable<boolean> {
		return this.onSessionStateChange;
	}

	public getOnMeChanged(): Observable<unknown> {
		return this.onMeChanged;
	}

	// Generate an access token
	public login(loginUsername: string, loginPassword: string): Observable<boolean> {
		// Create an observable
		const obs = new Observable<boolean>((observer) => {
			// Main login obj
			const params: Record<string, string> = {
				username: loginUsername,
				password: loginPassword,
				grant_type: this.config.grantType || '',
				client_id: this.config.clientId || ''
			};

			// Oauth type has configured?
			if (this.config.oauthType) {
				params['oauth_type'] = this.config.oauthType;
			}

			const url = (this.config.apiURL || '') + (this.config.oauthUri || '');

			// Request token
			this.httpClient.post(url, params).pipe(
				map((response: unknown) => {
					// Save token to Local storage
					this.saveToken(response);
					return this.accessToken;
				})
			).subscribe({
				next: () => {
					// Check meUrl
					if (this.config.oauthMeUri) {
						// Request me info
						this.requestMe().subscribe({
							next: () => {
								// Notify user state
								this.checkAndNotifyMeState();

								// Load response
								observer.next(true);
								observer.complete();
							},
							error: () => {
								// Rise error
								observer.error(this.accessToken);
							}
						});
					} else {
						// Notify user state
						this.checkAndNotifyMeState();

						// Complete subscribe
						observer.next(true);
						observer.complete();
					}
				},
				error: (response: HttpErrorResponse) => {
					// Rise error
					observer.error(response);
				}
			});
		});
		return obs;
	}

	// Generate an access token
	public requestMe(): Observable<unknown> {
		//Header json
		const headers: Record<string, string> = {};

		//Check access token to add access token header
		if (this.accessToken) {
			headers['Authorization'] = 'Bearer ' + this.accessToken.token;
		}

		//Get options
		const httpOptions = {
			headers: new HttpHeaders(headers)
		};

		const url = (this.config.apiURL || '') + (this.config.oauthMeUri || '');

		// Do request
		return this.httpClient.get(url, httpOptions).pipe(
			map((response: unknown) => {
				// Load userLogged
				this.me = response;

				// Emit parsed and changed
				this.onMeChanged.emit(this.me);
				return this.me;
			})
		);
	}

	public refreshToken(): Observable<AccessTokenModel | null> {
		// Get refresh token
		const refreshToken: string = this.accessToken instanceof AccessTokenModel ? this.accessToken.refreshToken : '';

		const url = (this.config.apiURL || '') + (this.config.oauthUri || '');

		// Request token
		return this.httpClient.post(url, {
			refresh_token: refreshToken,
			grant_type: this.config.grantTypeRefresh,
			client_id: this.config.clientId
		}).pipe(
			map((response: unknown) => {
				const tokenResponse = response as Record<string, unknown>;
				// Check response
				if (tokenResponse) {
					// Load the refresh token
					tokenResponse['refresh_token'] = refreshToken;

					// Save to LS
					if (this.config.accessTokenLsKey) {
						this.storageService.set(this.config.accessTokenLsKey, tokenResponse);
					}
				}

				// Creates the access token model
				this.accessToken = this.parseAccessToken(tokenResponse);
				return this.accessToken;
			})
		);
	}

	public saveToken(tokenJson: unknown): void {
		if (!tokenJson) {
			return;
		}

		// Save token to Local storage
		if (this.config.accessTokenLsKey) {
			this.storageService.set(this.config.accessTokenLsKey, tokenJson);
		}

		//Parse it and load to memory
		this.accessToken = this.parseAccessToken(tokenJson);
	}

	public loadSession(): Observable<boolean> {
		// Create an observable
		const obs = new Observable<boolean>((observer) => {
			const accessTokenLs = this.config.accessTokenLsKey 
				? this.storageService.get<Record<string, unknown>>(this.config.accessTokenLsKey)
				: null;
			
			const completeObservable = (result: boolean) => {
				observer.next(result);
				observer.complete();
			};

			// Check access token getted from ls
			if (accessTokenLs) {
				// Create access token
				this.accessToken = this.parseAccessToken(accessTokenLs);

				// Check token
				if (this.accessToken instanceof AccessTokenModel) {
					// Has configured me
					if (this.config.oauthMeUri) {
						// Request me info
						this.requestMe().subscribe({
							next: () => {
								// Notify user state
								this.checkAndNotifyMeState();

								// Finish load
								completeObservable(true);
							},
							error: () => {
								// Finish load
								completeObservable(false);
							}
						});
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
		if (this.config.accessTokenLsKey) {
			this.storageService.remove(this.config.accessTokenLsKey);
		}

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

	public updateMe(me: unknown): void {
		this.me = me;

		// Emit change
		this.onMeChanged.emit(me);
	}

	// Private methods
	private parseAccessToken(json: unknown): AccessTokenModel | null {
		let accessToken: AccessTokenModel | null = null;

		const tokenData = json as Record<string, unknown> | null;

		// Check access token
		if (tokenData && tokenData['access_token']) {
			// parse expiration date
			const expiration: Date = new Date();
			const expiresIn: number = (tokenData['expires_in'] as number) / 60;
			expiration.setMinutes(expiration.getMinutes() + expiresIn);

			// Creates the access token model
			accessToken = new AccessTokenModel(
				tokenData['access_token'] as string,
				tokenData['refresh_token'] as string,
				expiration
			);
		}
		return accessToken;
	}
}