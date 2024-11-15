"use strict";
const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync(__dirname + '/.env.local'));
//const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig){
	process.env[k] = envConfig[k];
}

let mysql = require('mysql');
let pool = mysql.createPool({
	connectionLimit: 50,
	host: process.env.mysql_host,
	port: process.env.mysql_port,
	user: process.env.mysql_user,
	password: process.env.mysql_pwd,
	database: process.env.mysql_db
});
let clientId = process.env.client_id
let token = process.env.token
global.sql = 'INSERT IGNORE INTO F_Videa.streams3 (id, user_id, user_name, title, description, created_at, published_at, url, thumbnail_url, viewable, view_count, language, type, duration, stream_id) VALUES ? ON DUPLICATE KEY UPDATE view_count=VALUES(view_count), updatedAt=CURRENT_TIMESTAMP();'
/*pool.on('acquire', function(connection){
	console.log('Connection %d acquired', connection.threadId);
});
pool.on('connection', function (connection) {
	connection.query('SET SESSION auto_increment_increment=1');
})*/
// pool.on('enqueue', function () {
// 	console.log('Waiting for available connection slot');
// });
//pool.query('SELECT user_name, user_id, doDownload, streamer, downloadPriority FROM F_Videa.Streamers ORDER BY downloadPriority DESC', function (error, results) {
//	if (error != null)	console.log(error)
//	readVariables(results);
//});

class API {
	constructor(BaseURL, AuthURL){
		this.BaseURL = BaseURL
		this.AuthURL = AuthURL
	}
	BaseURL
	#AuthURL
	#ClientID
	#Secret
	#Token

	loadEnv() {
		throw new Error("Not implemented")
	}
	validateToken() {
		console.log("Get New Token")
		throw new Error("Not implemented")
	}
	getNewToken(){
		console.log("Get New Token")
		throw new Error("Not implemented")
	}

}
console.log(API.BaseURL)

function APIProto() {
	this.baseURL = "https://api.twitch.tv/helix/",
	this.authURL = "https://id.twitch.tv/oauth2/",
	this.clientID = process.env.client_id,
	this.secret = process.env.client_secret,
	this.token = process.env.token,
	this.tokenURL = `?client_id=${this.clientID}&client_secret=${this.secret}&grant_type=client_credentials`,
	this.getNewToken = function() {
		axios.post(`${this.authURL}token${this.tokenURL}`)
		.then(response => {console.log(response.data?.access_token)
			this.token = `Bearer ` + response.data?.access_token;
			axios.defaults.headers.common['Authorization'] = this.token;
			this.validateToken();
		})
		.catch(error => {console.error(error.response)})
	}
	this.validateToken = function () {
		axios.defaults.headers.common['Authorization'] = this.token;
		axios.get(`${this.authURL}validate`)
			.then(response => {console.log(response.data)})
			.catch(error => {console.log("Validate token: "); console.dir(error.response.data)
		});
	}
	this.isTokenValid = async function () {
		try {
			axios.defaults.headers.common['Authorization'] = this.token;
			const response = await axios.get(`${this.authURL}validate`);
			console.log(response.data);
			return true;
		} catch (error) {
			console.log("Validate token error: ", error.response);
			return false;
		}
	}
}
let urls = [];
const test = new APIProto();

(async () => {
	try {
		axios.defaults.headers.common['Authorization'] = test.token;
		const isValid = await test.isTokenValid();
		console.log(isValid)

		if (isValid) {
			urls = await createBatchedUrls();
			await fetchDataAndSave();
		} else {
			test.getNewToken();
		}
	} catch (error) {
		console.error('Initialization error:', error);
	}
})();

// function Database() {
// 	this.verifyStreamers = function(userIds) {
// 		return new Promise((resolve, reject) => {
// 			pool.getConnection((err, connection) => {
// 				if (err) { reject(err); return; }
// 				connection.query(
// 					'SELECT user_id FROM F_Videa.Streamers WHERE user_id IN (?)',
// 					[userIds],
// 					(error, results) => {
// 						connection.release();
// 						if (error) { reject(error); return; }
// 						// Convert results to a Set of valid user_ids
// 						const validUserIds = new Set(results.map(row => row.user_id));
// 						resolve(validUserIds);
// 					}
// 				);
// 			});
// 		});
// 	}
// 	this.insertData = async function (data) {
// 		return new Promise((resolve, reject) => {
// 			pool.getConnection((err, connection) => {
// 				if (err) {reject(err);return;}
// 				connection.query('INSERT INTO F_Videa.streams3 (id, user_id, user_name, title, description, created_at, published_at, url, thumbnail_url, viewable, view_count, language, type, duration, stream_id) VALUES ? ON DUPLICATE KEY UPDATE view_count=VALUES(view_count), updatedAt=CURRENT_TIMESTAMP();', [data], (error, results) => {
// 					connection.release();
// 					if (error) { reject(error); return; }
// 					console.log(results.affectedRows);
// 					resolve(results);
// 				});
// 			});
// 		});
// 	}
// 	this.getUsers = async function() {
// 		return new Promise((resolve, reject) => {
// 			pool.getConnection((err, connection) => {
// 				if (err) {reject(err);return;}
// 				connection.query('SELECT broadcaster_id, broadcaster_login, broadcaster_name FROM F_Videa.broadcasters', (error, results) => {
// 					connection.release();
// 					if (error) {reject(error);return;}
// 					resolve(results);
// 				});
// 			});
// 		});
// 	}
// }

class Database {
	// Add new method to verify users exist
	async verifyStreamers(userIds) {
		console.log(`Verifying ${userIds.length} unique user IDs`);
		return new Promise((resolve, reject) => {
			pool.getConnection((err, connection) => {
				if (err) { reject(err); return; }
				connection.query(
					'SELECT user_id FROM F_Videa.Streamers WHERE user_id IN (?)',
					[userIds],
					(error, results) => {
						connection.release();
						if (error) { reject(error); return; }
						const validUserIds = new Set(results.map(row => row.user_id));
						console.log(`Found ${validUserIds.size} existing streamers`);
						resolve(validUserIds);
					}
				);
			});
		});
	}
	async getUsers() {
		return new Promise((resolve, reject) => {
			pool.getConnection((err, connection) => {
				if (err) {reject(err);return;}
				connection.query('SELECT broadcaster_id, broadcaster_login, broadcaster_name FROM F_Videa.broadcasters', (error, results) => {
					connection.release();
					if (error) {reject(error);return;}
					resolve(results);
				});
			});
		});
	}
	// Modify insertData to filter out invalid user_ids
	async insertData(data) {
		console.log('Starting data insertion process...');

		// Get all user_ids from the data
		const userIds = data.map(row => row[1]);

		// Verify which user_ids exist in Streamers table
		const validUserIds = await this.verifyStreamers(userIds);

		// Add missing streamers to the Streamers table
		await this.addMissingStreamers(data, validUserIds);


		console.log('Inserting stream data...');
		return new Promise((resolve, reject) => {
			pool.getConnection((err, connection) => {
				if (err) { reject(err); return; }
				connection.query(
					'INSERT INTO F_Videa.streams3 (id, user_id, user_name, title, description, created_at, published_at, url, thumbnail_url, viewable, view_count, language, type, duration, stream_id) VALUES ? ON DUPLICATE KEY UPDATE view_count=VALUES(view_count), updatedAt=CURRENT_TIMESTAMP();',
					[data],
					(error, results) => {
						connection.release();
						if (error) {
							console.error('Error inserting streams:', error);
							reject(error);
							return;
						}
						console.log(`Successfully inserted/updated ${results.affectedRows} streams`);
						resolve(results);
					}
				);
			});
		});
	}
	async addMissingStreamers(data, validUserIds) {
		const currentTimestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
		const missingStreamers = data
			.filter(row => !validUserIds.has(row[1]))
			.map(row => [
				null,               // streamers_id (auto_increment)
				row[1],            // user_id
				row[2],            // streamer (using user_name)
				row[2],            // login (using user_name)
				row[2],            // user_name
				'user',            // type (default)
				'',                // broadcaster_type
				'',                // description
				'',                // profile_image_url
				'',                // offline_image_url
				0,                 // view_count
				currentTimestamp,  // created_at
				currentTimestamp,  // updated_at
				'',                // nationality
				'',                // liveAt
				0,                 // doDownload
				0,                 // downloadPriority
				'',                // idrivePath
				'',                // linuxPath
				''                 // awsPath
			]);
		
		console.log(`Found ${missingStreamers.length} new streamers to add`);
		if (missingStreamers.length === 0) return;

		return new Promise((resolve, reject) => {
			pool.getConnection((err, connection) => {
				if (err) { reject(err); return; }

				const sql = `
                    INSERT INTO F_Videa.Streamers (
                        streamers_id, user_id, streamer, login, user_name, 
                        type, broadcaster_type, description, profile_image_url, 
                        offline_image_url, view_count, created_at, updated_at, 
                        nationality, liveAt, doDownload, downloadPriority, 
                        idrivePath, linuxPath, awsPath
                    ) VALUES ? 
                    ON DUPLICATE KEY UPDATE 
                        updated_at = VALUES(updated_at)
                `;

				connection.query(sql, [missingStreamers], (error, results) => {
					connection.release();
					if (error) {
						console.error('Error adding streamers:', error);
						reject(error);
						return;
					}
					console.log(`Successfully added ${results.affectedRows} new streamers`);
					resolve(results);
				});
			});
		});
	}

	async archiveStreamerChanges(streamer, existingData, currentTimestamp) {
		return new Promise((resolve, reject) => {
			pool.getConnection((err, connection) => {
				if (err) { reject(err); return; }

				const archiveData = [
					null,                           // archive_id (auto_increment)
					existingData.streamers_id,      // streamers_id
					existingData.user_id,           // user_id
					existingData.streamer,          // streamer
					existingData.login,             // login
					existingData.user_name,         // user_name
					existingData.type,              // type
					existingData.broadcaster_type,   // broadcaster_type
					existingData.description,       // description
					existingData.profile_image_url, // profile_image_url
					existingData.offline_image_url, // offline_image_url
					existingData.view_count,        // view_count
					existingData.created_at,        // created_at
					currentTimestamp,               // archived_at (using updated_at)
					existingData.nationality,       // nationality
					existingData.liveAt,           // liveAt
					existingData.doDownload,        // doDownload
					existingData.downloadPriority,  // downloadPriority
					existingData.idrivePath,        // idrivePath
					existingData.linuxPath,         // linuxPath
					existingData.awsPath,           // awsPath
					JSON.stringify({                // change_details
						changed_from: {
							user_name: existingData.user_name,
							profile_image_url: existingData.profile_image_url,
							description: existingData.description,
							broadcaster_type: existingData.broadcaster_type
						},
						changed_to: {
							user_name: streamer.display_name,
							profile_image_url: streamer.profile_image_url,
							description: streamer.description,
							broadcaster_type: streamer.broadcaster_type
						}
					})
				];

				const sql = `
					INSERT INTO F_Videa.Streamers_Archive (
						archive_id, streamers_id, user_id, streamer, login, 
						user_name, type, broadcaster_type, description, 
						profile_image_url, offline_image_url, view_count, 
						created_at, archived_at, nationality, liveAt, 
						doDownload, downloadPriority, idrivePath, linuxPath, 
						awsPath, change_details
					) VALUES ?
				`;

				connection.query(sql, [[archiveData]], (error, results) => {
					connection.release();
					if (error) {
						console.error('Error archiving streamer data:', error);
						reject(error);
						return;
					}
					console.log(results)
					console.log(`Archived changes for streamer ${existingData.user_name}`);
					resolve(results);
				});
			});
		});
	}
}

async function fetchDataAndSave() {
	axios.defaults.headers.common['Authorization'] = test.token;
	axios.defaults.headers.common['Client-ID'] = test.clientID;
	try {
		let allStreamData = [];
		let totalApiCalls = 0;
		let totalPagesProcessed = 0;

		console.log(`Starting to process ${urls.length} batched URLs`);

		// Process each URL and handle pagination
		for (const baseUrl of urls) {
			let hasNextPage = true;
			let cursor = null;
			let pagesForThisUrl = 0;

			// Add first parameter to base URL
			const urlWithLimit = baseUrl.includes('?')
				? `${baseUrl}&first=100`
				: `${baseUrl}?first=100`;

			while (hasNextPage) {
				// Add pagination cursor if it exists
				const url = cursor
					? `${urlWithLimit}&after=${cursor}`
					: urlWithLimit;

				totalApiCalls++;
				pagesForThisUrl++;
				// console.log(`Fetching: ${url}`);

				const response = await axios.get(url);
				const streams = response.data.data;
				console.log(`URL ${urls.indexOf(baseUrl) + 1}/${urls.length}, Page ${pagesForThisUrl}: Got ${streams.length} streams`);
				// console.log(`Got ${streams.length} streams from current page`);


				// Process current page of results
				const pageData = streams.map(stream => [
					stream.id,
					stream.user_id,
					stream.user_login,
					deEmoji(stream.title),
					deEmoji(stream.description) || '',
					turnTimeIntoTimeStamp(stream.created_at),
					turnTimeIntoTimeStamp(stream.started_at),
					`https://twitch.tv/${stream.user_login}`,
					stream.thumbnail_url,
					stream.viewable === 'public' ? 'public' : 'private',
					stream.viewer_count,
					stream.language,
					stream.type,
					turnTextIntoSeconds(stream.duration),
					stream.id
				]);

				allStreamData = allStreamData.concat(pageData);
				console.log(`Total streams collected: ${allStreamData.length}`);

				// Check if there's another page
				cursor = response.data.pagination?.cursor;
				hasNextPage = !!cursor && streams.length === 100; // Only continue if we got a full page

				if (hasNextPage) {
					// Add a small delay to avoid rate limits
					await new Promise(resolve => setTimeout(resolve, 100));
				}
			}
			totalPagesProcessed += pagesForThisUrl;
			console.log(`Finished URL ${urls.indexOf(baseUrl) + 1}/${urls.length}. Pages: ${pagesForThisUrl}, Total streams so far: ${allStreamData.length}`);
		}

		console.log(`Total streams fetched: ${allStreamData.length}`);
		console.log(`API Call Stats:
            Total API Calls: ${totalApiCalls}
            Total Pages Processed: ${totalPagesProcessed}
            Total URLs Processed: ${urls.length}
            Total Streams Fetched: ${allStreamData.length}
        `);

		if (allStreamData.length > 0) {
			console.log(allStreamData.length)
			const db = new Database();
			await db.insertData(allStreamData);
			console.log(`Processed all stream data`);
		} else {
			console.log('No live streams found');
		}

	} catch (error) {
		console.error('Error fetching or inserting data:', error);
		if (error.response) {
			console.error('Response error:', error.response.data);
			console.error('Failed URL:', error.config.url);
		}
	} finally {
		pool.end();
	}
}

async function createBatchedUrls() {
	try {
		const db = new Database();
		const users = await db.getUsers();
		console.log(`Total users from database: ${users.length}`);


		const batchSize = 70;

		for (let i = 0; i < users.length; i += batchSize) {
			const batch = users.slice(i, i + batchSize);
			const loginParams = batch
				.map(user => user.broadcaster_login)
				.filter(login => login) // Remove any null/undefined values
				.join('&login=');

			if (loginParams) {
				const url = `${test.baseURL}streams?login=${loginParams}`;
				urls.push(url);
			}
		}

		console.log(`Created ${urls.length} batched URLs`);
		return urls;
	} catch (error) {
		console.error('Error creating batched URLs:', error);
		throw error;
	}
}

let options;
let array = [];
let after = null;
let user_id = null;
let timeToSleep = 35;
const promises = []
global.aff0 = 0;
global.lastUser = null;
global.curUser = null;

function checkUser(user, uid, dname){ // Username, User_id, Display Name
	const oneOfIsTrue = (currentValue) => currentValue === true ;
	const oneOfIsFalse = (currentValue) => currentValue === false ;
	let response = [];
	if (user === null || user === '') {
		response['user'] = false;
	}
	else{response['user'] = true;}
	if (uid === null || uid === '') {
		response['uid'] = false;
	}
	else{response['uid'] = true;}
	if (dname === null || dname === ''){ 
		response['dname'] = false;
	}
	else{response['dname'] = true;}

	if (response.user === true && response.uid === true && response.dname === true) {
		return true;
	}
	else if (response.user === true && response.uid === true && response.dname === false) {
		// TODO: set username to displayname --> take user to mysql DB as streamer
		// MySQL Query UPDATE F_Videa.streams SET streamer=xxx WHERE 
	}
	else if (response.user === true && response.uid === false) {
		getIdByUsername(user);
	}
	else if (response.user === false && response.uid === true) {
		getUsernameById(uid);
	}
	else if (response.user === false && response.uid === false && response.dname === true) {
		getIdByUsername(dname);
	}
	else{
		console.log(`User ${user}, UserID ${uid}, Displayname ${dname} does not have set username or UID or neither?`);
		return false;
	}
}
function getIdByUsername(username) {
	// FIXME: 
	//Normalize options, to only pass username and get response (function)
	let options = {
		url: `https://api.twitch.tv/helix/users?login=${username}`,
		headers: {
			'User-Agent': 'request',
			'Client-ID': `${clientId}`,
			'Authorization': `${token}`,
	}}
	console.log(`Getting data for username ${username}`);
	//TODO
	//Get data and alter database
	//let response = request(options, processGetUserData);
	axios(options)
		.then(response => processGetUserData(response))
		.catch(error => {
			if (error.data.data.status== 401) {
				console.log('Unauthorized, run new token')
				process.exit(4)
			} else {
				console.error('Error fetching user data: ', error.data.status)
			}
	});
	console.dir(array);
	//console.log("Got data ", username, response);
}
function getUsernameById(id) {
	let options = {
		url: `https://api.twitch.tv/helix/users?id=${id}`,
		headers: {
			'User-Agent': 'request',
			'Client-ID': `${clientId}`,
			'Authorization': `${token}`,
	}}
	console.log(`Getting data for id ${id}`);
	//TODO
	//Get data and alter database
	//let response = '';
	axios(options)
		.then(response => processGetUserData(response))
		.catch(error => console.error('Error fetching user data: ', error));
}
function updateUserData(data) {
	let id, login, display_name = '';
	let {id:uid, login:user_name, display_name:streamer} = data[0];
	//console.log(id, login, display_name);
	console.log(uid, user_name, streamer);
	//process.exit(1);
}
function processGetUserData(error, response) {
	// console.log(response.statusCode, response.statusMessage, response.statusText)
	if (!error && response.statusCode === 200) {
		console.log('Array data: ', response.data);
		updateUserData(response.data);
		console.log("Processing ", response.data[0]?.id, response.data[0]?.user_name)
	}
	else if (response.statusCode === 401){
		console.log('User is not authorized, try renewing OAUTH2 Token');
		//FIXME: Setup OOP getNewToken()
	getNewToken();
	}
	else{
		console.log('API Erorr, something is wrong', response.statusCode, response.statusMessage);
		//console.log(response);
	}
	return;
}
function done(data) {
	if (data.length !== 0){
		console.log("Adding data for", data[0][2], data.length)
		pool.query(global.sql, [data],function (err, result) {
			if (!err) {
				if (result.affectedRows !== 0){console.log(data[0][2], result.message);}
			} else{global.aff0++;}
			if (err !== null) {
			if (err.errno != 1213) {
					//console.log("SQL Error: ", err.sqlMessage)
					console.warn(err, err.code)
				}
		}})
	}
	else {console.warn("done function got empty data");}
}
function readVariables(streamers){
	let downloadUser = [];
	for (let i = 0; i < streamers.length; i++){
		let {user_name:user, streamer:displayname, user_id:uid} = streamers[i];
		checkUser(user,uid,displayname);
		downloadUser.push(streamers[i].user_id);
	}
	for(let i = 0; i < downloadUser.length; i++){
		user_id = downloadUser[i];
		options = {
			url: `https://api.twitch.tv/helix/videos?user_id=${user_id}&first=100`,
			headers: {
				'User-Agent': 'request',
				'Client-ID': `${clientId}`,
				'Authorization': `${token}`,
		}};
		nextOptions = options;
		axios(options)
			.then(response => callback(null, response))
			.catch(error => {
			if (error.response.status == 401) {
				console.log('Unauthorized, run new token')
				process.exit(401)
			} else {
				console.error('Error: ', error.response.status)
		}});
		if (i+1 === downloadUser.length){
			sleep(timeToSleep)
			//FIXME:
		}
	}
	const data = Promise.all(promises)
	.then((data) => {done(data)})
	.catch((error) => console.log(`Error in executing ${error}`))
}

async function fetchData() {
	const results = await Promise.all(promises);
	console.dir("fetchdata thing: ", results);
	return results;
}
async function sleep(seconds){
	await timeout(seconds);
	console.log("aff0 is: ", global.aff0)
	console.log("Job should be done, exiting")
	pool.end()
}
async function timeout(seconds){
	return new Promise(resolve => setTimeout(resolve, seconds*1000));
}
function callback(error, response) {
	array = null;
	if (response.status != 200) {
		console.warn("Callback: ", response.statusText, response.status)
	}
	if (error != null) {console.log("Callback2 error" ,error)}
	if (!error || response.status === 200) {
		array = response.data;
		if (array.data.length == 0) {
			return;
		}
		else {
			// console.log("233", array.data.length);
			let lastAfter = '';
			lastAfter = after;
			after = '';
			if (array.pagination.cursor != null && after != array.pagination.cursor){
				// console.log("Should have pagination", array.pagination.cursor, array.data[0]?.user_name);
				after = array.pagination;
				processArray(array);
				// axios(nextOptions)
				// 	.then(console.log(response.data.length, response.data[0]?.user_name))
				// 	.then(response => {
				// 		// console.log(response.data)
				// 		if (!isEmptyArray(response.data)) {
				// 			isArrayEmpty(null, response)
				// 		}
				// 	})
				//	.catch(error => console.error('(after) Error: ', error, nextOptions));
			}
			else {
				console.log("Shouldn't have pagination", array.pagination)
				// after = array.pagination.cursor;
			}
			// const fs = require('fs');
			//fs.appendFile('out_3.json', JSON.stringify(response.data)+"\n", function (err) {
			//if (err) throw err;});
			//console.log("233, length", array.data.length, "for user", array.data[0].user_name)
			// if (after === lastAfter) {
			// 	//throw new Error("Something went badly wrong!");
			// }
			// else {
			// 	let baseUrl = nextOptions.url.split("&after", 1)[0];
			// 	nextOptions.url = `${baseUrl}&after=${after}`;
			// 	console.log(nextOptions.url);
			// }

			// if (after === ''){
			// 	console.log(`All streams from ${array.data} ${array}`);
			// 	// console.log(array.data[0]?.user_id);
			// }
			// else{
			// 	console.log(`Next pagination is ${after} ${array.data.length} /100 from ${array.data[0].user_name} ${array.data[99]?.user_name} userID ${array.data[0].user_id} => `);
			// }

			//console.log(`userid is ${array.data[0].user_id}`);
		}
	}
	else if(response.statusCode === 401){
		console.error("Unauthorized: Get new Oauth2 Token");
		process.exit();
	}
	else {
		console.warn(error)
		// console.warn("callback3:", response.statusCode, response.status, "statustext", response.statusText, array.data)
	}

	// if (after !== ''){
	// 	//console.log('after is not empty');
	// 	console.log(nextOptions);
	// 	//axios(nextOptions)
	// 	// 	.then(response => isArrayEmpty(null, response))
	// 	// 	.catch(error => console.error('(after) Error: ', error, nextOptions));
	// }
	// else{
	// 	console.log(`after === '' ${after} for user ${array.data[0]?.user_name}`);
	// }
	return array;
}

function processArray(array) {
	let tempValues = [];
	if (array.data != undefined) {
		if (array.data.length > 0) {
			console.log("ProcessArray", array.data.length, array.data[0]?.user_name);
			for (let i = 0; i < array.data.length; i++) {
				// if streamer is online, skip
				//if (array.data[i].thumbnail_url == '') {
				tempValues[i] = [];
				tempValues[i][0] = array.data[i].id;
				tempValues[i][1] = array.data[i].user_id;
				tempValues[i][2] = array.data[i].user_name;
				tempValues[i][3] = deEmoji(array.data[i].title);
				tempValues[i][4] = deEmoji(array.data[i].description);
				tempValues[i][5] = turnTimeIntoTimeStamp(array.data[i].created_at, array.data[i].id, array.data[i].user_id);
				tempValues[i][6] = turnTimeIntoTimeStamp(array.data[i].published_at, array.data[i].id);
				tempValues[i][7] = array.data[i].url;
				tempValues[i][8] = array.data[i].thumbnail_url;
				tempValues[i][9] = array.data[i].viewable;
				tempValues[i][10] = array.data[i].view_count;
				tempValues[i][11] = array.data[i].language;
				tempValues[i][12] = array.data[i].type;
				tempValues[i][13] = turnTextIntoSeconds(array.data[i].duration);
				tempValues[i][14] = array.data[i].stream_id;
				//	    console.log(array.data[i].stream_id);
				//console.log(tempValues[i][14]);
				//if (array.data[i].user_name == "2147483647")
				//} else {
				//    console.log(`User ${array.data[i].user_id}, ${array.data[i].user_name} is streaming`);
				//}
			}
			let tempValues2 = tempValues.filter(Boolean);
			if (tempValues2.length !== 0) {
				if (tempValues2[0][2] != null) {
					curUser = tempValues2[0][2];
					if (curUser !== lastUser || lastUser == null) {
						//console.log(curUser);
						lastUser = curUser;
						promises.push(done(tempValues2));
					}
				}
			}
		}
	}
	//TODO Stackup and then quit
}

function deEmoji(string) {
	// Return empty string if input is null/undefined
	if (!string) return '';

	let regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
	return string.replace(regex, '');
}

function turnTimeIntoTimeStamp(time){
	if (time == null){
		// console.log("error lol");
	}
	else if (time !== '') {
		time = time.substr(0, time.length - 1).split('T');
		return `${time[0]} ${time[1]}`;
	}
	else {
		console.log(`time before ${time} for ${id} for user ${user_id}`);
	}
}

function turnTextIntoSeconds(time) {
	if (!time) return 0;


	const parts = time.match(/(\d+[dhms])/g) || [];
	let totalSeconds = 0;

	for (const part of parts) {
		const value = parseInt(part);
		const unit = part.slice(-1);

		switch (unit) {
			case 'h':
				totalSeconds += value * 3600;
				break;
			case 'm':
				totalSeconds += value * 60;
				break;
			case 's':
				totalSeconds += value;
				break;
		}
	}
	let s = seconds.length;
	seconds.reverse();
	realSeconds += parseInt(seconds[0]);
	return realSeconds;
}

function isArrayEmpty(error, response){
	if (response.data.length > 0) {
		console.log("isArrayEmpty, pagination check in isArrayEmpty", response.data.pagination.cursor, "for user", response.data[0].user_name);
	}
	const transformedData = response.data;
	if (transformedData.data.length === 0){
		return;
	}
	else{
		processArray(transformedData);
	}
	if (!error && response.statusCode === 200) {
		// console.log('ArrayEmptiness check');
		if (transformedData.data.length === 0){
			//console.log('Array is empty');
			return true;
		}
		else{
			// console.log('Array is not empty');
			// console.log('pagination Array is being processed');
			processArray(transformedData);
			return 'Array was processed';
		}
	}
	return false;
}

function isEmptyArray(response) {
	// This function can be simplified as it doesn't use null as the first argument
	// You can remove the null argument and directly access response.data
	return !Array.isArray(response.data) || response.data.length === 0;
}
