// Database.js
const fs = require('fs');	
const dotenv = require('dotenv');
const envConfig = dotenv.parse(fs.readFileSync(__dirname + '/.env.local'));
for (const k in envConfig) {
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
                if (err) { reject(err); return; }
                    connection.query('SELECT broadcaster_id, broadcaster_login, broadcaster_name FROM F_Videa.broadcasters', (error, results) => {
                    connection.release();
                    if (error) { reject(error); return; }
                    resolve(results);
                });
            });
        });
    }
    // Modify insertData to filter out invalid user_ids
    async insertData(data) {
        console.log('Starting data insertion process...');

        // Get all user_ids from the data
        // const userIds = data.map(row => row[1]);

        // Verify which user_ids exist in Streamers table
        // const validUserIds = await this.verifyStreamers(userIds);

        // Add missing streamers to the Streamers table
        // await this.addMissingStreamers(data, validUserIds);


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

module.exports = Database;