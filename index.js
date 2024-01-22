import express from "express";
import { Client, middleware } from "@line/bot-sdk";

const fs = require('fs').promises;
const path = require('path');
const process = require('process');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

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
  
  app.listen(PORT);

  function handleEvent(event) {

    if(event.type == "image"){
        const downloadPath = './image.png';
        uploadFiles(downloadContent(event.message.id, downloadPath));
    }

    //if (event.type !== "message" || event.message.type !== "text") {
    //    return Promise.resolve(null);
    //  }
    const messages =  [{
        type: 'text',
        text: 'ごいごいすー'
    }];
    if (event.message.text == '一斉送信'){
        client.broadcast(messages);
    }
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: event.message.text,
    });
  }

  function downloadContent(messageId, downloadPath) {
    return client.getMessageContent(messageId)
      .then((stream) => new Promise((resolve, reject) => {
        const writable = fs.createWriteStream(downloadPath);
        stream.pipe(writable);
        stream.on('end', () => resolve(downloadPath));
        stream.on('error', reject);
      }));
  }

async function uploadFiles(imageFile){
const auth = await new google.auth.GoogleAuth({
      scopes: SCOPES,
      keyFile: CREDENTIALS_PATH,
    });

      const drive = google.drive({version: 'v3', auth});  
      var fileMetadata = {
          name: 'mae.jpg', //アップロード後のファイル名
          parents: ['1Yzr-s6gi-bSQ1LWE6EpgjK87C9Q7A8dU'] //アップロードしたいディレクトリID
      };
      const fs = require('fs');
      var media = {
          mimeType: 'image/jpeg', //アップロードファイル形式
          body: fs.createReadStream(imageFile) //アップロードファイル名(img配下のtest.jpg)
      };
  
      drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id'
        }, function (err, file) {
      if (err) {
          console.error(err);
      } else {
          console.log('File Id: ', file.data.id);  
      }
      });
    }
