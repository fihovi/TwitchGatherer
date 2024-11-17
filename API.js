// API.js
const fs = require('fs');
const axios = require('axios');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync(__dirname + '/.env.local'));
for (const k in envConfig){
	process.env[k] = envConfig[k];
}
class API {
    static baseURL = "https://api.twitch.tv/helix/";
    static authURL = "https://id.twitch.tv/oauth2/";
    static clientID = process.env.client_id;
    static secret = process.env.client_secret;
    static token = process.env.token;
    static tokenURL = `?client_id=${this.clientID}&client_secret=${this.secret}&grant_type=client_credentials`;
    static async getNewToken() {
        try {
            const response = await axios.post(`${this.authURL}token${this.tokenURL}`);
            this.token = `Bearer ${response.data?.access_token}`;
            axios.defaults.headers.common['Authorization'] = this.token;
            await this.validateToken();
            return this.token;
        } catch (error) {
            console.error('Error getting new token:', error.response);
            throw error;
        }
    }
    static async validateToken() {
        try {
            axios.defaults.headers.common['Authorization'] = this.token;
            const response = await axios.get(`${this.authURL}validate`);
            console.log('Token validation:', response.data);
            return response.data;
        } catch (error) {
            console.error("Validate token error:", error.response?.data);
            throw error;
        }
    }
    static async isTokenValid() {
        try {
            axios.defaults.headers.common['Authorization'] = this.token;
            await this.validateToken();
            return true;
        } catch (error) {
            console.log("Token validation failed:", error.response?.data);
            return false;
        }
    }
}

module.exports = API;