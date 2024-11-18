# Twitch Video Gatherer
The Twitch Video Gatherer is a tool that gathers videos from a Twitch channel and stores them in a database.

## Setup
1. Install dependencies: `npm install`
2. Create a `.env` file and add your Twitch API key: `client_id=<your_client_id>
client_secret=<your_client_secret>`
3. Run the script: `npm start`

# TODO
- [ ] Add Dockerfile and docker-compose.yaml
- [ ] Add database structure and create automatically on initialization of the project
- [ ] Add tests
- [ ] Add logging
- [ ] Add error handling
- [ ] Add more comments
- [ ] Add more documentation
- [ ] Rewrite mysql to use mysql2, knex or other library
