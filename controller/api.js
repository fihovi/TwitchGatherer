// api.js
module.exports={
	baseUrl: 'https://api.twitch.tv/helix/';
	scope: 'users/';
	var options = {
		url: `${baseUrl}${scope}${data}=${value}`,
		headers: {
			'User-Agent': 'request',
			'Client-ID': `${clientId}`,
			'Authorization': `${token}`,
		}};

}
