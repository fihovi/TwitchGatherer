const request = require('request');
let mysql = require('mysql');
let pool = mysql.createPool({
    connectionLimit: 10,
    host: '***REMOVED***',
    user: '***REMOVED***',
    password: '***REMOVED***',
    database: 'F_Videa'
});
let token = 'token';

pool.on('acquire', function(connection){
    console.log('Connection %d acquired', connection.threadId);
});
pool.on('connection', function (connection) {
    connection.query('SET SESSION auto_increment_increment=1');
})
pool.on('enqueue', function () {
    console.log('Waiting for available connection slot');
});


pool.query('SELECT user_name, streamer, user_id, doDownload, downloadPriority FROM F_Videa.Streamers ORDER BY downloadPriority DESC', function (error, results, fields) {
    if(error) throw error;
    let Streamers = results;
    for(let i = 0; i < Streamers.length; i++) {
        let {user_name:username, streamer:displayname, user_id:id} = Streamers[i];
        let a=checkEmptiness(username);
        let b=checkEmptiness(displayname);
        let c=checkEmptiness(id);
        compareThreeVars(a,b,c);
        //checkStreamer(username, displayname, id);
    }
});
let id;
function compareThreeVars(username, displayname, id) {

}
function checkStreamer(username, displayname, id) {

}
function checkEmptiness(string) {
    if (string === "" || (string === null || string === undefined)) return 2;
    else return 1;
}
function updateUserByUsername(username){
    let options = {
        url: `https://api.twitch.tv/helix/users?login=${username}`,
        headers: {
            'User-Agent': 'request',
            'Client-ID': '***REMOVED***',
            'Authorization': `Bearer ${token}`,
        }};
    console.log(options.url);
    request(options, callback);
}
function updateUserByID(id){
    let options = {
        url: `https://api.twitch.tv/helix/users?id=${id}`,
        headers: {
            'User-Agent': 'request',
            'Client-ID': '***REMOVED***',
            'Authorization': `Bearer ${token}`,
        }};
    console.log(options.url);
    request(options, callback);

}
function updateStreamer(username, displayname, id) {
    let sql = 'UPDATE F_Videa.Streamers SET user_id=?, user_name=? WHERE streamer=?';
    let dat = [id, username, displayname];
    pool.query(sql, dat, function (error, results, fields) {
        if (error) throw error;
        console.log(results);
        // pool.release();
    });
    /*pool.query('UPDATE F_Videa.Streamers SET user_id=? WHERE user_name=?', [id, username],function (error, results, fields) {
        if (error) throw error;
        console.log(results);
        pool.release();
    })*/
}
async function callback(error, response, body) {
    if (!error && response.statusCode === 200) {
        let array = JSON.parse(body);
        let username = array.data[0].login;
        let displayname = array.data[0].display_name;
        let id = array.data[0].id;
        console.log(id)
        console.log(username, id, displayname);
        updateStreamer(username, displayname, id);
        // return array.data[0].id;
        /*
                array = JSON.parse(body);
                let lastAfter = '';
                // console.log(array);
                processArray(array);
                after = array.pagination.cursor;
                if (after === lastAfter){
                    console.log("Error");
                    throw new Error("Something went badly wrong!");
                }
                else {
                    nextOptions.url += `&after=${after}`;
                }
                if (array.pagination.cursor === ''){
                    console.log(`All streams from ${array.data[0].user_id}`);
                }
                else{
                    // console.log(`Next pagination is ${array.pagination.cursor} ${array.data.length} from userID ${user_id} => `);
                }
                // console.log(`userid is ${array.data[0].user_id}`);
            }
            if (after !== ''){
                // console.log('after is not empty');
                array = request(nextOptions, isArrayEmpty);
            }
            else{
                console.log(`after === ''`);
            }
            return array;*/
    }
}
