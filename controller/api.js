// api.js
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('../.env.local'))
for (const k in envConfig) {
	process.env[k] = envConfig[k]
}
class Api{
	constructor(uri, scrope, opts) {
		this.token = null;
		this.value = null;
		this.cliendId = process.env.client_id;
		this.data = null;
		this.uri = uri | 'https://api.twitch.tv/helix/';
		this.scope = scrope | 'users/';
		this.opts = opts | {
			url: `${this.uri}${this.scope}${this.data}=${this.value}`,
					headers:{
						'User-Agent': 'request',
						'Client-ID': `${this.clientId}`,
						'Authorization': `${this.token}`,
					}}
	}
	getOauthToken(){
		this.token =
		return this.token;
	}


}
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
