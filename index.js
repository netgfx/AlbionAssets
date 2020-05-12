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
var CryptoJS = require("crypto-js");
// encryption


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
    } else if (message.content === "assets-help") {
        message.channel.send("```Available Commands:\nassets-help <Help list>\nping <test>\nprive <initates PM between you and the bot>\nadd location tab-name password(optional) <stores the attachment images securely and assigns them to location-tab-name>\nshow location tab-name password(optional) <Retrieves all saved screens from server>\nupload <to upload the last attachments>```");
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
        var password = message.content.split(" ")[3];

        let authorId = { "username": message.author.username, "id": message.author.id };
        if (cachedAttachements[authorId.username] === undefined) {
            readDatabaseSnapshot(message.author.username, function() {

                addAttachments(message, location, tab, password);
            });
        } else {
            let attachments = [];
            let authorId = { "username": message.author.username, "id": message.author.id };
            _.forEach(message.attachments.array(), o => {
                console.log(location, tab, cachedAttachements);
                console.log(cachedAttachements[authorId.username][location][tab].length);

                // check if user has provided a password //
                if (password !== undefined) {
                    let encrypted = encrypt(o.attachment, password);
                    console.log("ENCRYPTED: ", encrypted);
                    cachedAttachements[authorId.username][location][tab].push(encrypted);
                } else {
                    cachedAttachements[authorId.username][location][tab].push(o.attachment);
                }
                attachments.push(JSON.stringify(o));

            });

            console.log("on add: ", cachedAttachements);
        }

    } else if (message.content.indexOf("show") !== -1) {
        let location = message.content.split(" ")[1].toLowerCase() || "caerleon";
        let tab = message.content.split(" ")[2].toLowerCase() || "bank";
        var password = message.content.split(" ")[3];
        message.channel.startTyping();
        readDatabaseSnapshot(message.author.username, function() {
            let obj = cachedAttachements[message.author.username];
            var locationResult = obj[location][tab];

            console.log("length of result: ", locationResult, locationResult.length, location, tab);
            if (locationResult.length === 1) {
                if (password !== undefined) {
                    locationResult = decrypt(locationResult[0], password);
                }
                console.log("SHOWING: ", location, tab, locationResult);
                const messageEmbed = new Discord.MessageEmbed().setTitle("Contents of: " + location + " - " + tab).attachFiles(locationResult).setTimestamp().setFooter('Made by Netgfx');

                message.channel.send(messageEmbed).catch(error => {
                    console.log(error);
                    message.channel.stopTyping();
                }).then(result => {
                    message.channel.stopTyping();
                });
            } else if (locationResult.length > 1) {
                let messageEmbed;
                _.forEach(locationResult, o => {
                    var _image = o;
                    if (password !== undefined) {
                        _image = decrypt(_image, password);
                    }
                    messageEmbed = new Discord.MessageEmbed().setTitle("Contents of: " + location + " - " + tab).attachFiles(_image).setTimestamp().setFooter('Made by Netgfx');

                    message.channel.send(messageEmbed).catch(error => {
                        console.log(error);
                        message.channel.stopTyping();
                    }).then(result => {
                        message.channel.stopTyping();
                    });
                });
            } else if (locationResult.length === 0) {
                message.channel.send("No data found for this city or location");
                message.channel.stopTyping();
            }

        });



    } else if (message.content.indexOf("upload") !== -1) {

        console.log(cachedAttachements);
        message.channel.startTyping();
        uploadUserData(cachedAttachements[message.author.username], message.author.username, () => {
            message.channel.send("Assets uploaded successfully");
            message.channel.stopTyping();
        });
    }

});

/**
 *
 *
 * @param {*} message
 */
function addAttachments(message, location, tab, password) {

    console.log("adding attachment: ", location, tab, password);
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

        // check if user has provided a password //
        if (password !== undefined) {
            let encrypted = encrypt(o.attachment, password);
            console.log("ENCRYPTED: ", encrypted);
            cachedAttachements[authorId.username][location][tab].push(encrypted);
        } else {
            cachedAttachements[authorId.username][location][tab].push(o.attachment);
        }
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
        console.log(data);

        if (data === null) {
            // account doesn't exist so we must create it first //
            createAccount(username, () => {
                // recursive action //
                readDatabaseSnapshot(username, callback);
            });
        } else {
            if (cachedAttachements[username] === undefined) {
                cachedAttachements[username] = {};
            }
            cachedAttachements[username] = data.assets;
            console.log(">>>> ", cachedAttachements[username]);

            if (callback) {
                callback();
            }
        }
    }).catch(error => {
        console.log(error);
        _message.channel.stopTyping();
    });
}

function createAccount(username, callback) {
    var obj = {};
    obj[username] = { "assets": { "stub": "" } };

    firebase.database().ref('accounts/').update(obj, function(error) {
        if (error) {
            console.log("error ", error);
            _message.channel.send("ERROR creating account ", error.message);
        } else {
            console.log("account created");
            if (callback) {
                callback();
            }
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
function uploadUserData(encryptedString, username, callback) {

    var obj = {};
    obj = encryptedString;

    console.log("OBJECT TO SAVE: ", obj);

    firebase.database().ref('accounts/' + username + "/assets/").update(obj, function(error) {
        if (error) {
            console.log("error ", error);
            _message.channel.stopTyping();
            _message.channel.send("There was an error uploading your assets: ", error.message);
        } else {
            console.log("assets saved!");
            readDatabaseSnapshot(username);
            if (callback) {
                callback();
            }
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
    var ciphertext = CryptoJS.AES.encrypt(text, pass).toString();

    return ciphertext;
}

/**
 *
 *
 * @param {*} text
 * @param {*} pass
 * @returns
 */
function decrypt(text, pass) {

    console.log("decrypting: ", text, pass);
    var bytes = CryptoJS.AES.decrypt(text, pass);
    var originalText = bytes.toString(CryptoJS.enc.Utf8);

    console.log("decrypted: ", originalText);
    return originalText;
}


// this actually initiates the bot
bot.login(key.key);