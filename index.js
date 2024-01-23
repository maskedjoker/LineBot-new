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
const CREDENTIALS_PATH = process.env.CREDENTIALS;

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
  
  async function handleEvent(event) {

    if(event.type == "image"){
        const imageStream = await client.getMessageContent(event.message.id);
        console.log("ログあ");
        await uploadFiles(imageStream);
        console.log("ログい");
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



async function uploadFiles(imageFile){
const auth = await new google.auth.GoogleAuth({
      scopes: SCOPES,
      keyFile: CREDENTIALS_PATH,
    });
    console.log("ログう");
      const drive = google.drive({version: 'v3', auth});  
      var fileMetadata = {
          name: 'mae.jpg', //アップロード後のファイル名
          parents: ['1Yzr-s6gi-bSQ1LWE6EpgjK87C9Q7A8dU'] //アップロードしたいディレクトリID
      };

      var media = {
          mimeType: 'image/jpeg', //アップロードファイル形式
          body: imageFile //アップロードファイル名(img配下のtest.jpg)
      };
      console.log("ログえ");
      await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id'
        }, function (err, file) {
      if (err) {
          console.error(err);
          console.log("ログお");
      } else {
          console.log('File Id: ', file.data.id);  
          console.log("ログか");
      }
      });
    }
