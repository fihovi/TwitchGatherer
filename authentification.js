// authentification.js
module.exports = {
	getNewToken: function() {
		const fs = require('fs');
		const dotenv = require('dotenv');
		const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
		for (const k in envConfig) {
			process.env[k] = envConfig[k]
		}
		tokenAPI='https://id.twitch.tv/oauth2/token?';
		client_id=process.env.client_id;
		grant_type=client_credentials;
		client_secret=process.env.client_secret;


	}
}
