// Auth.js
const dotenv = require("dotenv");
const request = require("request");

class Auth {
    constructor(){
    }
    async getNewToken() {
        const fs = require('fs');
        const request = require('request');
        const dotenv = require('dotenv');
        const envConfig = dotenv.parse(fs.readFileSync('.env.local'))
        for (const k in envConfig) {
            process.env[k] = envConfig[k]
        }
        let apiEndpoint = `token?`;
        let tokenAPI = `https://id.twitch.tv/oauth2/${apiEndpoint}`;
        let grant_type = `client_credentials`;
        let client_id = process.env.client_id;
        let client_secret = process.env.client_secret;
        let url = `${tokenAPI}client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`;
        console.log(`${tokenAPI}client_id=${client_id}&client_secret=${client_secret}&grant_type=${grant_type}`)
        let options = {
            url: `${url}`,
            method: 'POST',
            headers: {
                'User-Agent': 'Cli',
                'Client-ID': `${client_id}`,
                'Accept': `*/*`,
                'Accept-Encoding': `gzip`,
            }}
        let response = '';
        request(options, (error, response, body) => {
            console.log(response);
            if (!error && response.statusCode === 200){
                console.log(response.body);
            }
            else if (response.statusCode === 401){
                console.log('User is not authorized');
            }
            else {
                console.log(`API Error: ${response.statusMessage}`);
            }
        });
    }
}


module.exports = new Auth();
