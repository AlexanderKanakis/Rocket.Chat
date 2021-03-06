import { HTTP } from 'meteor/http';


import { getRedirectUri } from './getRedirectUri';
import { retrieveRegistrationStatus } from './retrieveRegistrationStatus';
import { unregisterWorkspace } from './unregisterWorkspace';
import { settings } from '../../../settings';

export function getWorkspaceAccessTokenWithScope(scope = '') {
	const { connectToCloud, workspaceRegistered } = retrieveRegistrationStatus();

	const tokenResponse = { token: '', expiresAt: new Date() };

	if (!connectToCloud || !workspaceRegistered) {
		return tokenResponse;
	}

	const client_id = settings.get('Cloud_Workspace_Client_Id');
	if (!client_id) {
		return tokenResponse;
	}

	if (scope === '') {
		return tokenResponse;
	}

	const cloudUrl = settings.get('Cloud_Url');
	const client_secret = settings.get('Cloud_Workspace_Client_Secret');
	const redirectUri = getRedirectUri();

	let authTokenResult;
	try {
		authTokenResult = HTTP.post(`${ cloudUrl }/api/oauth/token`, {
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			params: {
				client_id,
				client_secret,
				scope,
				grant_type: 'client_credentials',
				redirect_uri: redirectUri,
			},
		});
	} catch (e) {
		if (e.response && e.response.data && e.response.data.error) {
			console.error(`Failed to get AccessToken from Rocket.Chat Cloud.  Error: ${ e.response.data.error }`);

			if (e.response.data.error === 'oauth_invalid_client_credentials') {
				console.error('Server has been unregistered from cloud');
				unregisterWorkspace();
			}
		} else {
			console.error(e);
		}

		return tokenResponse;
	}

	const expiresAt = new Date();
	expiresAt.setSeconds(expiresAt.getSeconds() + authTokenResult.data.expires_in);

	tokenResponse.expiresAt = expiresAt;

	return tokenResponse;
}
