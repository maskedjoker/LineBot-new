import express from "express";
import { Client, middleware } from "@line/bot-sdk";

import fs from "fs"
import path from "path";
import process from "process";
import { google } from "googleapis";
import { setTimeout } from 'timers/promises';
import ExifReader from 'exifreader';
import sharp from 'sharp';
import exif from 'exif-reader';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.

const config = {
    channelSecret: process.env.CHANNEL_SECRET,
    channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
};
const client = new Client(config);
const PORT = process.env.PORT || 3000;
const app = express();


app.post("/", middleware(config), (req, res) => {

    Promise.all(req.body.events.map(handleEvent)).then((result) =>
        res.json(result)
    );
});

app.get("/", (req, res) => {
    try{
        console.log("ログ定期実行")
    } catch(err){
        console.log(err);
    }
    res.send('get');
});


app.get("/nightNotificaton", (req, res) => {
    try{
        const messages = [{
            type: 'text',
            text: '本日のストレッチの時間です!!どんなに疲れていても眠くても絶対にサボらないでください(´◔‿ゝ◔`)さもないとまた身体いたくなっちゃうぞ。。。😱'
        }];
        client.broadcast(messages);
        console.log("ログ定期実行")
    } catch(err){
        console.log(err);
    }
    res.send('night');
});


app.listen(PORT);

async function send(event, type){
        var index = 100;
        var total = 100;
        if(event.message.imageSet){
            index = event.message.imageSet.index
            total = event.message.imageSet.total
        }
        const credentials = {
            "type": "service_account",
            "project_id": process.env.PROJECT_ID,
            "private_key_id": process.env.PRIVATE_KEY_ID,
            "private_key": process.env.PRIVATE_KEY.split(String.raw`\n`).join('\n'),
            "client_email": process.env.CLIENT_EMAIL,
            "client_id": process.env.CLIENT_ID,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
            "client_x509_cert_url": process.env.CLIENT_X509_CRERT_URL,
            "universe_domain": "googleapis.com"
        };
        const auth = new google.auth.GoogleAuth({
            scopes: SCOPES,
            credentials: credentials,
        });
        const drive = google.drive({ version: 'v3', auth });
        var fileExtension = type == 'image' ? '.jpg' : '.mp4';
        const fileName = new Date().toISOString() + fileExtension;
    
        const rootDirectoryId = process.env.ROOT_DIRECTORY;
        const monthDirectoryName = fileName.split('-')[0] + "-" + fileName.split('-')[1];
        const dayDirectoryName = fileName.split('-')[2].split('T')[0];
    
        var monthDirectoryId = await createDirectory(rootDirectoryId, monthDirectoryName, drive);
        var dayDirectoryId = await createDirectory(monthDirectoryId, dayDirectoryName, drive);

        const stream = await client.getMessageContent(event.message.id);

        var dayDirectoryId = await uploadFiles(stream, drive, dayDirectoryId, fileName, type);

        if(index != total){
            return;
        }
        return client.broadcast({
            type: 'text',
            text: "https://drive.google.com/drive/folders/" + dayDirectoryId + "?usp=sharing" + " にファイルがアップロードされました"
        });
}

async function handleEvent(event) {

    if (event.message.type == "image" || event.message.type == 'video') {
       await send(event, event.message.type) 
       return;
    }

    const credentials = {
        "type": "service_account",
        "project_id": process.env.PROJECT_ID,
        "private_key_id": process.env.PRIVATE_KEY_ID,
        "private_key": process.env.PRIVATE_KEY.split(String.raw`\n`).join('\n'),
        "client_email": process.env.CLIENT_EMAIL,
        "client_id": process.env.CLIENT_ID,
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
        "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
        "client_x509_cert_url": process.env.CLIENT_X509_CRERT_URL,
        "universe_domain": "googleapis.com"
    };
    const SCOPES = ['https://www.googleapis.com/auth/calendar.events'];
    const auth = new google.auth.GoogleAuth({
        scopes: SCOPES,
        credentials: credentials,
    });

    // カレンダー,てすと,2/20
    if(event.message.text.includes("カレンダー")){
        var title = event.message.text.split(',')[1];
        var month = event.message.text.split(',')[2].split('/')[0];
        var date = event.message.text.split(',')[2].split('/')[1];
        await listEvents(addEvents, title, month, date);
    }

    // const messages = [{
    //     type: 'text',
    //     text: 'ごいごいすー'
    // }];
    // if (event.message.text == '一斉送信') {
    //     client.broadcast(messages);
    // }
    return client.replyMessage(event.replyToken, {
        type: "text",
        text: event.message.text,
    });
}

async function existsDirectory(directoryId, directoryName, drive){
    const params = {
        q: `'${directoryId}' in parents and trashed = false`,
    }
    const res = await drive.files.list(params);
    return res.data.files.find(file => file.name === directoryName);
}

async function createDirectory(rootDirectoryId, directoryName, drive){
    var createdDirectoryId = "";
    await setTimeout(2000);
    var exists = await existsDirectory(rootDirectoryId, directoryName, drive);
    if (exists) {
        console.log("ろぐ" + exists.id)
        return exists.id;
    }

    try {
        const file = await drive.files.create({
            resource: {
                name: directoryName,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [rootDirectoryId]
            },
            fields: 'id',
        });
        createdDirectoryId = file.data.id
    } catch (err) {
        console.log("ログf" + err);
    }

    try {
        await drive.permissions.create({
            fileId: createdDirectoryId,
            requestBody: {
                role: "writer",
                type: "user",
                emailAddress: process.env.PREMITTED_EMAIL
            },
            supportsAllDrives: true,
            supportsTeamDrives: true,
        });
    } catch (err) {
        console.log("ログ22222" + err);
    }
    return createdDirectoryId;
}

async function uploadFiles(stream, drive, dayDirectoryId, fileName, type) {

    var fileId = "";
    try {
        const image = await drive.files.create({
            resource: {
                name: fileName, 
                parents: [dayDirectoryId]
            },
            media: {
                mimeType: type == 'image' ? 'image/jpeg' : 'video/mp4',
                body: stream 
            },
            fields: 'id'
        });
        fileId = image.data.id
    } catch (err) {
        console.log("ログc" + err);
    }
    return dayDirectoryId;
}

async function addEvents(auth, title, month, date) {
    var now = new Date();
    var year = now.getFullYear();
    const event = {
        'summary': title,
        // 'location': '800 Howard St., San Francisco, CA 94103',
        // 'description': 'A chance to hear more about Google\'s developer products.',
        'start': {
          'date': year + '-' + month + '-' + date,
          'timeZone': 'Asia/Tokyo',
        },
        'end': {
            'date': year + '-' + month + '-' + date,
          'timeZone': 'Asia/Tokyo',
        },
        // 'recurrence': [
        //   'RRULE:FREQ=DAILY;COUNT=2'
        // ],
        // 'attendees': [
        //   {'email': 'lpage@example.com'},
        //   {'email': 'sbrin@example.com'},
        // ],
        // 'reminders': {
        //   'useDefault': false,
        //   'overrides': [
        //     {'method': 'email', 'minutes': 24 * 60},
        //     {'method': 'popup', 'minutes': 10},
        //   ],
        // },
      };
      const calendar = google.calendar({version: 'v3', auth});
      await calendar.events.insert({
        auth: auth,
        calendarId: process.env.PREMITTED_EMAIL,
        resource: event,
      }, function(err, event) {
        if (err) {
          console.log('There was an error contacting the Calendar service: ' + err);
          return;
        }
        console.log('Event created: %s', event.htmlLink);
      });
  }
  
