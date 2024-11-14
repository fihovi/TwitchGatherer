//use 'strict';
const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');
const path = require('path');
const envConfig = dotenv.parse(fs.readFileSync(__dirname + '/.env.local'));
//const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
for (const k in envConfig){
	process.env[k] = envConfig[k];
}

// FIXME: check token
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
// FIXME:
global.sql = 'INSERT IGNORE INTO F_Videa.streams3 (id, user_id, user_name, title, description, created_at, published_at, url, thumbnail_url, viewable, view_count, language, type, duration, stream_id) VALUES ? ON DUPLICATE KEY UPDATE view_count=VALUES(view_count), updatedAt=CURRENT_TIMESTAMP();'
/*pool.on('acquire', function(connection){
	console.log('Connection %d acquired', connection.threadId);
});
pool.on('connection', function (connection) {
	connection.query('SET SESSION auto_increment_increment=1');
})*/
pool.on('enqueue', function () {
	//console.log('Waiting for available connection slot');
});
pool.query('SELECT user_name, user_id, doDownload, streamer, downloadPriority FROM F_Videa.Streamers ORDER BY downloadPriority DESC', function (error, results) {
	if (error != null)	console.log(error)
	readVariables(results);
});

let options;
let nextOptions;
let array = [];
let after = null;
let user_id = null;
let timeToSleep = 35;
const promises = []
global.aff0 = 0;
global.lastUser = null;
global.curUser = null;

function checkUser(user, uid, dname){ //Username, User_id, Display Name
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
		//TODO set username to displayname --> take user to mysql DB as streamer
		//MySQL Query UPDATE F_Videa.streams SET streamer=xxx WHERE 
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
function getUserData(data, type){}
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
		.catch(error => console.error('Error fetching user data: ', error));
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
		//FIXME Setup OOP getNewToken()
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
			.catch(error => console.error('Error: ', error));
		if (i+1 === downloadUser.length){
			sleep(timeToSleep)
			//FIXME
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
function deEmoji(string){
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

function turnTextIntoSeconds(time){
	let seconds = time.split(/[dhms]/g);
	let realSeconds = 0;
	seconds.pop();
	for (let i = 0; i < seconds.length-1; i++){
		realSeconds += parseInt(seconds[i]);
		realSeconds *= 60;
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
