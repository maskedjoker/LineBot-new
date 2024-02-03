import express from "express";
import { Client, middleware } from "@line/bot-sdk";

import fs from "fs"
import path from "path";
import process from "process";
import { google } from "googleapis";

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
    console.log(req)
    Promise.all(req.body.events.map(handleEvent)).then((result) =>
        res.json(result)
    );
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

async function handleEvent(event) {
    if (event.message.type == "image") {
        const imageStream = await client.getMessageContent(event.message.id);
        var dayDirectoryId = await uploadFiles(imageStream);
        return client.replyMessage(event.replyToken, {
            type: "text",
            text: "https://drive.google.com/drive/folders/" + dayDirectoryId + "?usp=sharing" + " に画像をアップロードしました"
        });
    }

    const messages = [{
        type: 'text',
        text: 'ごいごいすー'
    }];
    if (event.message.text == '一斉送信') {
        client.broadcast(messages);
    }
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
    var exists = await existsDirectory(rootDirectoryId, directoryName, drive);
    if (exists) {
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

async function uploadFiles(imageFile) {
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
    const imageName = new Date().toISOString() + '.jpg';

    const rootDirectoryId = process.env.ROOT_DIRECTORY;
    const monthDirectoryName = imageName.split('-')[0] + "-" + imageName.split('-')[1];
    const dayDirectoryName = imageName.split('-')[2].split('T')[0];

    var monthDirectoryId = await createDirectory(rootDirectoryId, monthDirectoryName, drive);
    var dayDirectoryId = await createDirectory(monthDirectoryId, dayDirectoryName, drive);

    var fileId = "";
    try {
        const image = await drive.files.create({
            resource: {
                name: imageName, 
                parents: [dayDirectoryId]
            },
            media: {
                mimeType: 'image/jpeg', 
                body: imageFile 
            },
            fields: 'id'
        });
        fileId = image.data.id
    } catch (err) {
        console.log("ログc" + err);
    }
    return dayDirectoryId;
}
