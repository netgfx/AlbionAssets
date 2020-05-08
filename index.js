var key = require("./_keys.js");
var credentials = require("./credentials.js");
const Discord = require("discord.js");
const bot = new Discord.Client();
const https = require('https');
const axios = require('axios');
var _ = require('lodash');
const express = require('express');
var moment = require('moment');
var crypto = require('crypto');
const firebase = require('firebase');

const fs = require('fs');
var serveIndex = require('serve-index');
var serveStatic = require('serve-static');
const del = require('del');
// encryption
const algorithm = 'aes-256-cbc';
const iv = crypto.randomBytes(16);

const app = express()
const port = 8000

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

// Admin //
var isLocal = false;
var isMaintenance = false;
var admins = ["MDobs"];
const botName = "AlbionAssets";
var cachedAttachements = {};
var userPass = {};
var _message = {};

console.log("starting bot...");

// init firebase //
initFirebase();


bot.on("message", (message) => {

    _message = message;
    if (message.author.username === botName) {
        return;
    }

    // check if in maintenance mode, if yes only answer to admins //

    if (isMaintenance === true) {
        if (admins.indexOf(message.author.username) !== -1) {
            // continue
        } else {
            message.channel.send(":tools: This Bot is currently in Maintenance mode, we will boost nanites to work faster! :tools:");
            return;
        }
    }

    // read snapshot of user entries //


    if (message.content === "ping") {
        message.channel.send("pong");
    } else if (message.content === "-help") {
        message.channel.send("```Available Commands:\n-help <Help list>\n-ping <test>\nprive <initates PM between you and the bot>\nstore location tab-name <stores the attachment images securely and assigns them to location-tab-name>```");
    } else if (message.content === "prive") {
        if (message.channel.type === "dm") {
            // simply respond
            message.channel.send("we are already pretty private...");
        } else {
            message.author.send("starting private conversation");
        }

    } else if (message.content.indexOf("add") !== -1) {
        var location = message.content.split(" ")[1].toLowerCase() || "caerleon";
        var tab = message.content.split(" ")[2].toLowerCase() || "bank";
        let authorId = { "username": message.author.username, "id": message.author.id };
        if (cachedAttachements[authorId.username] === undefined) {
            readDatabaseSnapshot(message.author.username, function() {
                addAttachments(message, location, tab);
            });
        } else {
            let attachments = [];
            let authorId = { "username": message.author.username, "id": message.author.id };
            _.forEach(message.attachments.array(), o => {
                console.log(location, tab, cachedAttachements);
                console.log(cachedAttachements[authorId.username][location][tab].length);
                attachments.push(JSON.stringify(o));
                cachedAttachements[authorId.username][location][tab].push(o.attachment);
            });

            console.log("on add: ", cachedAttachements);
        }

    } else if (message.content.indexOf("show") !== -1) {
        let location = message.content.split(" ")[1].toLowerCase() || "caerleon";
        let tab = message.content.split(" ")[2].toLowerCase() || "bank";

        readDatabaseSnapshot(message.author.username, function() {
            let obj = cachedAttachements[message.author.username];
            let locationResult = obj[location][tab];
            //const attachment = new Discord.MessageAttachment(obj.attachment);
            // Send the attachment in the message channel
            // message.channel.send(obj.location + " - " + obj.tab, attachment);
            console.log("SHOWING: ", location, tab, locationResult);
            const messageEmbed = new Discord.MessageEmbed().setTitle("Contents of: " + location + " - " + tab).attachFiles(locationResult).setTimestamp().setFooter('Made by Netgfx');

            message.channel.send(messageEmbed).catch(error => {
                console.log(error);
            });

        });



    } else if (message.content.indexOf("upload") !== -1) {
        let password = message.content.split(" ")[1];
        console.log("encrypting with password: ", password); // duh remove this //..

        console.log(cachedAttachements);
        uploadUserData(cachedAttachements[message.author.username], message.author.username, password);
    }

});

/**
 *
 *
 * @param {*} message
 */
function addAttachments(message, location, tab) {

    console.log(message);
    let authorId = { "username": message.author.username, "id": message.author.id };
    let attachments = [];
    //cachedAttachements[authorId.username][location][tab] = [];
    if (cachedAttachements[authorId.username] === undefined) {
        cachedAttachements[authorId.username] = {};
    }

    if (cachedAttachements[authorId.username][location] === undefined) {
        cachedAttachements[authorId.username][location] = {};
        cachedAttachements[authorId.username][location][tab] = [];
    }
    if (cachedAttachements[authorId.username][location][tab] === undefined) {
        cachedAttachements[authorId.username][location][tab] = [];
    }

    _.forEach(message.attachments.array(), o => {
        console.log(cachedAttachements[authorId.username][location][tab].length);
        attachments.push(JSON.stringify(o));
        cachedAttachements[authorId.username][location][tab].push(o.attachment);
    });

    console.log("on add: ", cachedAttachements);
}

function initFirebase() {
    var firebaseConfig = {
        apiKey: key.firebase,
        authDomain: "albionassets.firebaseapp.com",
        databaseURL: "https://albionassets.firebaseio.com",
        projectId: "albionassets",
        storageBucket: "albionassets.appspot.com",
        messagingSenderId: "336005300637",
        appId: "1:336005300637:web:587317d4a13659b7faef74"
    };
    // Initialize Firebase
    firebase.initializeApp(firebaseConfig);

    firebaseLogin();
}

/**
 *
 *
 */
function firebaseLogin() {
    console.log("loging in to firebase...");
    firebase.auth().signInWithEmailAndPassword(credentials.adminMail, credentials.adminPassword).catch(function(error) {
        // Handle Errors here.
        var errorCode = error.code;
        var errorMessage = error.message;
        console.log(errorCode, errorMessage);


    }).then(function(user) {
        var _user = firebase.auth().currentUser;

        if (user || _user) {
            console.log("user is signed in to firebase");
        } else {
            // No user is signed in.
        }
    });
}

function readDatabaseSnapshot(username, callback) {
    var userId = firebase.auth().currentUser.uid;
    console.log("accounts/" + username);
    return firebase.database().ref('accounts/' + username + "/").once('value').then(function(snapshot) {
        //var username = (snapshot.val() && snapshot.val().username) || 'Anonymous';
        let data = snapshot.val();
        //console.log(data.assets);
        if (cachedAttachements[username] === undefined) {
            cachedAttachements[username] = {};
        }
        cachedAttachements[username] = data.assets;
        console.log(">>>> ", cachedAttachements[username]);

        if (callback) {
            callback();
        }
    });
}

/**
 *
 *
 * @param {*} encryptedString
 * @param {*} username
 * @param {*} location
 * @param {*} tab
 */
function uploadUserData(encryptedString, username, password) {

    var obj = {};
    obj = encryptedString;

    console.log("OBJECT TO SAVE: ", obj);

    firebase.database().ref('accounts/' + username + "/assets/").update(obj, function(error) {
        if (error) {
            console.log("error ", error);
        } else {
            console.log("assets saved!");
            readDatabaseSnapshot(username);
        }
    });
}

// ENCRYPTION / DECRYPTION //
/**
 *
 *
 * @param {*} text
 * @param {*} pass
 * @returns
 */
function encrypt(text, pass) {
    let cipher = crypto.createCipheriv(algorithm, pass, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return { iv: iv.toString('hex'), encryptedData: encrypted.toString('hex') };
}

/**
 *
 *
 * @param {*} text
 * @param {*} pass
 * @returns
 */
function decrypt(text, pass) {
    let iv = Buffer.from(text.iv, 'hex');
    let encryptedText = Buffer.from(text.encryptedData, 'hex');
    let decipher = crypto.createDecipheriv(algorithm, pass, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}


// this actually initiates the bot
bot.login(key.key);