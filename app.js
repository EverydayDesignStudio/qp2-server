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

//Initialising the SpotifyAPI node package
var spotifyApi = new SpotifyWebApi({
  clientId: 'd39a184805e14fdeba7d8a784ab2fe4d',
  clientSecret: '15fe109e966b412b88d6bed274650d85',
  redirectUri: 'https://qp2-spotify-server.herokuapp.com/callback'
});

var access_token;
var wot=0;
var ended=false;
var seekNo=0;
var endID="";
var isAuthenticated=false;

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

 //Get all the available devices linked to the autheticated account
 app.get('/getAvailable', async (req, res) => {
   const ava=await spotifyApi.getMyDevices()
   .then(function (data){
     res.send(data.body.devices);
   })
 })
//Play the song in the specified player associated with the device id 
app.post('/playback',async (req, res) => {
  wot=0;
  ended=false;
  res.setHeader('Content-Type', 'application/json');
  const play= await spotifyApi.play({
     "device_id":req.body.player,
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
 console.log(req.body.seek);
 const seek= await spotifyApi.seek(req.body.seek)
 .then(function(){
   console.log("Seeked");
   res.send();
 });
});

// Gets the state of the active player to check if song has ended or playing
// app.get('/getState', async (req, res)=> {
//     const state=await spotifyApi.getMyCurrentPlaybackState()
//     .then(function(data) {
//       if(data.body.is_playing && data.body.item!=null)
//       {
//         if(wot==0 && data.body.progress_ms+2000>data.body.item.duration_ms)
//         // if(wot==0 && data.body.progress_ms+1000>data.body.item.duration_ms)
//         {
//           wot=1;
//           console.log('Finished Playing: ' + data.body.item.name);
//           res.send({song:data.body.item.id,state:"ended", seek:data.body.progress_ms}); 
//         }
//         else
//         {
//           res.send({song:data.body.item.id,state:"playing", seek:data.body.progress_ms});
//         } 
//       }
//       else
//       {
//         res.send({song:null,state:"unknown", seek:0})
//       }
//     }, function(err) {
//       console.log('Something went wrong!', err);
//     });
// })

app.get('/getState', (req, res)=> {
  isAuthenticated=true;
  if(ended==true) {
    console.log("Song has ended: ", endID);
    res.send({song:endID,state:"ended",seek:seekNo})
  }
  else
  {
    res.send({song:endID,state:"unknown", seek:seekNo})
  }
})
 


const stateCheck=setInterval(async () => {
    if(isAuthenticated)
    {
      const state=await spotifyApi.getMyCurrentPlaybackState()
      .then(function(data) {
        if(data.body.is_playing && data.body.item!=null)
        {
          endID=data.body.item.id;
          seekNo=data.body.progress_ms
          console.log(data.body.progress_ms);
          console.log(data.body.item.duration_ms);
          if(wot==0 && data.body.progress_ms+1000>data.body.item.duration_ms)
          {
            wot=1;
            console.log('Finished Playing: ' + data.body.item.name);
            ended=true;
          }
        }
      });
    }
},1000)


//Gets the name of the song playing, just for the website
// app.post('/getTrack', (req, res) => {
//   const track=spotifyApi.getTrack(req.body.id)
//   .then(function(song) {
//     console.log(song.body.name);
//     res.send({songName:song.body.name});
//   })
// })

app.listen(port, () =>
   console.log(
     'HTTP Server up. Now go to http://localhost:${port} in your browser.'
   )
 );