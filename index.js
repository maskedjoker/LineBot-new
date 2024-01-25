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
        return client.replyMessage(event.replyToken, {
            type: "text",
            text: "画像をアップロードしました"
          });
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
      const imageName = new Date().toISOString()+ '.jpg';
      console.log("ログe" + imageName)
      
      const folderName = imageName.split('-')[0] + "-" + imageName.split('-')[1];
      const folderMetaData = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: ['1Yzr-s6gi-bSQ1LWE6EpgjK87C9Q7A8dU']
      };

      console.log(folderName);
      var folderId = "";
      try {
        const file = await drive.files.create({
            resource: folderMetaData,
            fields: 'id',
          });
          folderId = file.data.id
          console.log('ログg', folderId);
      } catch (err){
        console.log("ログf" + err);
      }

      var media = {
          mimeType: 'image/jpeg', //アップロードファイル形式
          body: imageFile //アップロードファイル名(img配下のtest.jpg)
      };
      console.log("ログえ" + imageFile);

     try{
        await drive.permissions.create({
            fileId: folderId,
            requestBody: {
              role: "owner",
              type: "user",
              emailAddress: 'k.maezmac@gmail.com',
            },
            supportsAllDrives: true,
            supportsTeamDrives: true,
          });
          console.log("ログ11111");
        } catch (err) {
            console.log("ログ22222" + err);
          }


      var fileMetadata = {
        name: imageName, //アップロード後のファイル名
        parents: [folderId] //アップロードしたいディレクトリID
    };

    var fileId = "";
      try {
        const image = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id'
          });
          fileId = image.data.id;
          console.log("ログd" + fileId);
      } catch (err) {
        console.log("ログc" + err);
      }

      
    //   try{
    //     await drive.permissions.create({
    //         fileId: fileId,
    //         requestBody: {
    //           role: "reader",
    //           type: "anyone",
    //         },
    //         supportsAllDrives: true,
    //         supportsTeamDrives: true,
    //       });
    //       console.log("ログ333333");
    //     } catch (err) {
    //         console.log("ログ44444" + err);
    //       }
      
    }
