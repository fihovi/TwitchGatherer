"use strict";
const axios = require('axios');
const fs = require('fs');
const dotenv = require('dotenv');
const Database = require('./Database');
const API = require('./API');
const envConfig = dotenv.parse(fs.readFileSync(__dirname + '/.env.local'));
for (const k in envConfig){
	process.env[k] = envConfig[k];
}

let mysql = require('mysql');
global.sql = 'INSERT IGNORE INTO F_Videa.streams3 (id, user_id, user_name, title, description, created_at, published_at, url, thumbnail_url, viewable, view_count, language, type, duration, stream_id) VALUES ? ON DUPLICATE KEY UPDATE view_count=VALUES(view_count), updatedAt=CURRENT_TIMESTAMP();'

let urls = [];

// Progress tracking system
const progressTracker = {
	currentBatch: 0,
	totalBatches: 0,
	currentUrl: 0,
	totalUrls: 0,
	lastUpdateTime: Date.now(),
	isRunning: false,
	status: 'idle',
	
	startMonitoring() {
		this.isRunning = true;
		this.lastUpdateTime = Date.now();
		
		// Start watchdog
		const watchdogInterval = setInterval(() => {
			const timeSinceLastUpdate = Date.now() - this.lastUpdateTime;
			
			if (this.isRunning && timeSinceLastUpdate > 60000) { // 1 minute timeout
				console.warn('\n=== WATCHDOG WARNING ===');
				console.warn('Process appears to be hanging:');
				console.warn(`Current Status: ${this.status}`);
				console.warn(`Batch Progress: ${this.currentBatch}/${this.totalBatches}`);
				console.warn(`URL Progress: ${this.currentUrl}/${this.totalUrls}`);
				console.warn(`Time since last update: ${Math.round(timeSinceLastUpdate/1000)}s`);
				console.warn('========================\n');
			}
		}, 30000); // Check every 30 seconds

		return watchdogInterval;
	},

	update(status, batch = null, url = null) {
		this.status = status;
		if (batch !== null) this.currentBatch = batch;
		if (url !== null) this.currentUrl = url;
		this.lastUpdateTime = Date.now();
	},

	stop(watchdogInterval) {
		this.isRunning = false;
		clearInterval(watchdogInterval);
	}
};

(async () => {
	try {
		axios.defaults.headers.common['Authorization'] = API.token;
		const isValid = await API.isTokenValid();
		console.log('Token valid:', isValid);

		if (isValid) {
			urls = await createBatchedUrls();
			await fetchDataAndSave();
		} else {
			await API.getNewToken(); // Wait for the new token
			urls = await createBatchedUrls(); // Then proceed
			await fetchDataAndSave();
		}
	} catch (error) {
		console.error('Initialization error:', error);
	}
})();

async function fetchDataAndSave() {
	const watchdogInterval = progressTracker.startMonitoring();
	
	try {
		console.log('Setting up axios headers...');
		axios.defaults.headers.common['Authorization'] = API.token;
		axios.defaults.headers.common['Client-ID'] = API.clientID;

		let allStreamData = [];
		let totalApiCalls = 0;
		const batchSize = 20;
		const responseMax = 100;
		const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

		console.log(`Starting to process ${urls.length} batched URLs`);
		
		// Initialize progress tracker
		progressTracker.totalBatches = Math.ceil(urls.length/batchSize);
		progressTracker.totalUrls = urls.length;

		for (let i = 0; i < urls.length; i += batchSize) {
			const currentBatchNum = Math.floor(i/batchSize) + 1;
			progressTracker.update('Starting new batch', currentBatchNum);
			
			const batch = urls.slice(i, i + batchSize);
			
			const promises = batch.map(async (baseUrl, index) => {
				progressTracker.update('Processing URL', currentBatchNum, i + index + 1);
				
				let hasNextPage = true;
				let cursor = null;
				let batchData = [];

				const urlWithLimit = baseUrl.includes('?')
					? `${baseUrl}&first=${responseMax}`
					: `${baseUrl}?first=${responseMax}`;

				while (hasNextPage) {
					try {
						progressTracker.update('Making API request', currentBatchNum, i + index + 1);
						
						const url = cursor 
							? `${urlWithLimit}&after=${cursor}`
							: urlWithLimit;
							
						const response = await makeApiRequest(url);
						totalApiCalls++;

						const streams = response.data.data;
						// console.log(`[Batch ${Math.floor(i/batchSize) + 1}][URL ${index + 1}] Got ${streams.length} streams`);

						if (streams.length > 0) {
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
							batchData = batchData.concat(pageData);
						}

						cursor = response.data.pagination?.cursor;
						hasNextPage = !!cursor;

						if (hasNextPage && streams.length === responseMax) {
							// console.log(`[Batch ${Math.floor(i/batchSize) + 1}][URL ${index + 1}] Waiting before next page...`);
							await new Promise(resolve => setTimeout(resolve, 50));
						}
					} catch (error) {
						console.error(`Error processing URL: ${error.message}`);
						hasNextPage = false;
					}
				}
				return batchData;
			});

			progressTracker.update('Waiting for batch completion', currentBatchNum);
			const batchResults = await Promise.all(promises);
			
			// Database insertion
			if (batchResults.flat().length > 0) {
				progressTracker.update('Inserting into database', currentBatchNum);
				let db = new Database();
				await db.insertData(batchResults.flat());
			}
		}

		console.log('\nAll batches completed');
		progressTracker.stop(watchdogInterval);
		
	} catch (error) {
		console.error('Fatal error in fetchDataAndSave:', error);
		progressTracker.stop(watchdogInterval);
	}
}

// In fetchDataAndSave, add this function:
function writeErrorToLog(error, url) {
	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const errorFileName = `sql_errors_${timestamp}.log`;

	const errorLog = [
		'\n=== SQL Error ===',
		`Timestamp: ${new Date().toISOString()}`,
		`URL: ${url}`,
		`Error Code: ${error.code}`,
		`Error Number: ${error.errno}`,
		`SQL State: ${error.sqlState}`,
		`SQL Message: ${error.sqlMessage}`,
		`Full Error: ${JSON.stringify(error, null, 2)}`,
		'================\n'
	].join('\n');

	fs.appendFileSync(errorFileName, errorLog);
	console.log(`SQL error written to ${errorFileName}`);
}

async function createBatchedUrls() {
	try {
		const db = new Database();
		const users = await db.getUsers();
		console.log(`Total users from database: ${users.length}`);

		const batchSize = 1;

		for (let i = 0; i < users.length; i += batchSize) {
			const batch = users.slice(i, i + batchSize);
			const userParams = batch
				.map(user => user.broadcaster_id)
				.filter(user_id => user_id) // Remove any null/undefined values
				.join('&user_id=');
			if (userParams) {
				const url = `${API.baseURL}videos?user_id=${userParams}`;
				urls.push(url);
			}
		}
		return urls;
	} catch (error) {
		console.error('Error creating batched URLs:', error);
		throw error;
	}
}

function deEmoji(string) {
	// Return empty string if input is null/undefined
	if (!string) return '';

	let regex = /(?:[\u2700-\u27bf]|(?:\ud83c[\udde6-\uddff]){2}|[\ud800-\udbff][\udc00-\udfff]|[\u0023-\u0039]\ufe0f?\u20e3|\u3299|\u3297|\u303d|\u3030|\u24c2|\ud83c[\udd70-\udd71]|\ud83c[\udd7e-\udd7f]|\ud83c\udd8e|\ud83c[\udd91-\udd9a]|\ud83c[\udde6-\uddff]|\ud83c[\ude01-\ude02]|\ud83c\ude1a|\ud83c\ude2f|\ud83c[\ude32-\ude3a]|\ud83c[\ude50-\ude51]|\u203c|\u2049|[\u25aa-\u25ab]|\u25b6|\u25c0|[\u25fb-\u25fe]|\u00a9|\u00ae|\u2122|\u2139|\ud83c\udc04|[\u2600-\u26FF]|\u2b05|\u2b06|\u2b07|\u2b1b|\u2b1c|\u2b50|\u2b55|\u231a|\u231b|\u2328|\u23cf|[\u23e9-\u23f3]|[\u23f8-\u23fa]|\ud83c\udccf|\u2934|\u2935|[\u2190-\u21ff])/g;
	return string.replace(regex, '');
}

function turnTimeIntoTimeStamp(time) {

	if (time == null) {}
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
	return totalSeconds;
}

async function makeApiRequest(url, retries = 3) {
	for (let i = 0; i < retries; i++) {
		try {
			return await axios.get(url);
		} catch (error) {
			if (i === retries - 1) throw error; // Last retry
			if (error.response?.status === 429) { // Rate limit
				await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
				continue;
			}
			if (error.code === 'ECONNABORTED') {
				console.warn(`Timeout on attempt ${i + 1}, retrying...`);
				await new Promise(resolve => setTimeout(resolve, 1000));
				continue;
			}
			throw error;
		}
	}
}

