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
    Promise.all(req.body.events.map(handleEvent)).then((result) =>
      res.json(result)
    );
  });
  
  app.listen(PORT);
  
  async function handleEvent(event) {
    console.log("ログ0 " + event.message.id + event.type);
    if(event.message.type == "image"){
        console.log("ログ1 " + event.message.id);
        const imageStream = await client.getMessageContent(event.message.id);
        console.log("ログあ");
        await uploadFiles(imageStream);
        console.log("ログい");
    }
    console.log("ログ2");

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
    console.log("ログ3");
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: event.message.text,
    });
  }



async function uploadFiles(imageFile){
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
    console.log("ログb");
const auth = new google.auth.GoogleAuth({
      scopes: SCOPES,
      credentials: credentials,
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
      console.log("ログえ" + imageFile);
      await drive.files.create({
          resource: fileMetadata,
          media: media,
          fields: 'id'
        }, function (err, file) {
            console.log("ログa")
      if (err) {
        console.log("ログお" + err);
          console.error(err);
          
      } else {
        console.log("ログか" + file.data.id);
          console.log('File Id: ', file.data.id);  
          
      }
      });
      console.log("ログc");
    }
