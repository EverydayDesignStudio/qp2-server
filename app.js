 //Depedency variables
 const express = require('express')
 var cors = require('cors');
 var querystring = require('querystring');
 var cookieParser = require('cookie-parser');
 var fs= require('fs');
 var bodyParser = require("body-parser");
 var SpotifyWebApi = require('spotify-web-api-node');
 
 //Scope Definition for Spotify WebAPI calls
 const scopes = [
     'ugc-image-upload',
     'user-read-playback-state',
     'user-modify-playback-state',
     'user-read-currently-playing',
     'streaming',
     'app-remote-control',
     'user-read-email',
     'user-read-private',
     'playlist-read-collaborative',
     'playlist-modify-public',
     'playlist-read-private',
     'playlist-modify-private',
     'user-library-modify',
     'user-library-read',
     'user-top-read',
     'user-read-playback-position',
     'user-read-recently-played',
     'user-follow-read',
     'user-follow-modify'
   ];
 
 const port = process.env.PORT || '5000';
//  const port = '8888';

 //Initialising the SpotifyAPI node package
 var spotifyApi = new SpotifyWebApi({
     clientId: 'e5528e5bb8b24755ad89dbc0eae5bea8',
     clientSecret: 'c265137ac990469890c0b7e447d5ca23',
     redirectUri: 'https://qpo-server.herokuapp.com/callback'
 });
 
 var access_token;
 //Initialising the express server
 const app = express();
 app.use(bodyParser.json());
 const { ppid } = require('process');
 
 app.use(cors())
    .use(cookieParser());
 
 //Authorization flow for the Spotify API 
 app.get('/', (req, res) => {
   res.redirect(spotifyApi.createAuthorizeURL(scopes));
 });
   
 app.get('/callback', (req, res) => {
     const error = req.query.error;
     const code = req.query.code;
     const state = req.query.state;
   
     if (error) {
       console.error('Callback Error:', error);
       res.send(`Callback Error: ${error}`);
       return;
     }
   
 spotifyApi
       .authorizationCodeGrant(code)
       .then(data => {
         access_token = data.body['access_token'];
         const refresh_token = data.body['refresh_token'];
         const expires_in = data.body['expires_in'];
   
         spotifyApi.setAccessToken(access_token);
         spotifyApi.setRefreshToken(refresh_token);
   
         // console.log('access_token:', access_token);
         // console.log('refresh_token:', refresh_token);
   
         setInterval(async () => {
           const data = await spotifyApi.refreshAccessToken();
           const access_token = data.body['access_token'];
   
           console.log('The access token has been refreshed!');
           console.log('access_token:', access_token);
           spotifyApi.setAccessToken(access_token);
         }, expires_in / 2 * 1000);
       })
       .catch(error => {
         console.error('Error getting Tokens:', error);
         res.send(`Error getting Tokens: ${error}`);
       });
 
       res.send("Connected with Spotify");
   });
 
 //Play the song , finds the active spotify player if device id not specified
 app.post('/playback',async (req, res) => {
   res.setHeader('Content-Type', 'application/json');
   const play= await spotifyApi.play({
      "uris": req.body.song,
      "position_ms":0,
   }).then(function() {
       console.log('Playback started');
       res.send();
     }, function(err) {
       //if the user making the request is non-premium, a 403 FORBIDDEN response code will be returned
       console.log('Something went wrong!', err);
   });
 });

 app.post('/seek',async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const seek= await spotifyApi.seek({
    "position_ms":req.body.seek
  });
 });
 
 // Gets the state of the active player to check if song has ended or playing
 app.get('/getState', async (req, res)=> {
     const state=await spotifyApi.getMyCurrentPlaybackState()
     .then(function(data) {
       if(data.body.is_playing && data.body.item!=null)
       {
         var wot=0;
         if(wot==0 && data.body.progress_ms+1000>data.body.item.duration_ms)
         {
           wot=1;
           console.log('Finished Playing: ' + data.body.item.name);
           res.send({song:data.body.item.id,state:"ended", seek:data.body.progress_ms}); 
         }
         else
         {
           res.send({song:data.body.item.id,state:"playing", seek:data.body.progress_ms});
         } 
       }
       else
       {
         res.send({song:null,state:"unknown", seek:0})
       }
     }, function(err) {
       console.log('Something went wrong!', err);
     });
 })
 
 //Gets the name of the song playing, just for the website
 app.post('/getTrack', (req, res) => {
   const track=spotifyApi.getTrack(req.body.id)
   .then(function(song) {
     console.log(song.body.name);
     res.send({songName:song.body.name});
   })
 })
 
 app.listen(port, () =>
    console.log(
      'HTTP Server up. Now go to http://localhost:${port} in your browser.'
    )
  );