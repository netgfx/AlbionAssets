var key = require("./keys.js");
const Discord = require("discord.js");
const bot = new Discord.Client();
const https = require('https');
const axios = require('axios');
var _ = require('lodash');
const express = require('express');
var moment = require('moment');
var crypto = require('crypto');

const fs = require('fs');
var serveIndex = require('serve-index');
var serveStatic = require('serve-static');
const del = require('del');

const app = express()
const port = 8080

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))

// Admin //
var isLocal = false;
var isMaintenance = false;
var admins = ["MDobs"];
const botName = "AlbionAssets";
var cachedAttachements = [];


console.log("starting bot...");

var _message = {};

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
    } else if (message.content.indexOf("store") !== -1) {
        var location = message.content.split(" ")[1] || "Caerleon";
        var tab = message.content.split(" ")[2] || "Bank";
        //console.log(message.attachments, message.attachments.array());
        let attachments = [];
        cachedAttachements = [];
        _.forEach(message.attachments.array(), o => {
            o.location = location;
            o.tab = tab;
            attachments.push(JSON.stringify(o));
            cachedAttachements.push(JSON.stringify(o));
        });

        console.log(attachments);
    } else if (message.content.indexOf("fetch") !== -1) {
        let location = message.content.split(" ")[1] || "Caerleon";
        let tab = message.content.split(" ")[2] || "Bank";

        let obj = JSON.parse(cachedAttachements[0]);
        const attachment = new Discord.MessageAttachment(obj.attachment);
        // Send the attachment in the message channel
        message.channel.send(obj.location + " - " + obj.tab, attachment);
    }

});


// this actually initiates the bot
bot.login(key.key);