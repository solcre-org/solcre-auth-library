export interface AuthConfigInterface {
	// Urls
	apiURL?: string;
	oauthMeUri?: string;

	// Oauth
	oauthUri?: string;
	grantType?: string;
	grantTypeRefresh?: string;
	clientId?: string;

	// Local storage
	accessTokenLsKey?: string
}