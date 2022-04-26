const request = require('request');
//require('dotenv').config();
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig){
	process.env[k] = envConfig[k];
//	console.log(process.env[k]);
}
