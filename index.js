//-------------------------------------------------------------------------------------------------------------------------------------------|
// |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Starting ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
//-------------------------------------------------------------------------------------------------------------------------------------------|

const { Client,MessageFlags,ActivityType,GatewayIntentBits,AttachmentBuilder,AuditLogEvent,ChannelType,PermissionsBitField,EmbedBuilder,ActionRowBuilder,ButtonStyle,ButtonBuilder,UserSelectMenuBuilder,TextInputBuilder,TextInputStyle,ModalBuilder} = require('discord.js');
const client = new Client(
   { intents: [GatewayIntentBits.Guilds,GatewayIntentBits.GuildMessages,GatewayIntentBits.GuildMembers,GatewayIntentBits.GuildPresences,GatewayIntentBits.GuildVoiceStates,GatewayIntentBits.GuildInvites,GatewayIntentBits.GuildWebhooks,GatewayIntentBits.GuildScheduledEvents,GatewayIntentBits.GuildMessageReactions,GatewayIntentBits.DirectMessages,GatewayIntentBits.DirectMessageTyping,GatewayIntentBits.DirectMessageReactions,GatewayIntentBits.GuildMessageTyping,GatewayIntentBits.MessageContent] ,
     partials: ['GUILD_MEMBER','USER','MESSAGE', 'CHANNEL','REACTION'], });
const {clientTOKEN,clientID,serverID} = require("./config"); 
client.login(clientTOKEN);

//-------------------------------------------------------------------------------------------------------------------------------------------|
// |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Packages ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
//-------------------------------------------------------------------------------------------------------------------------------------------|

const botVersion = require("./package.json").version; 
const {name,infoChannel,devs,welcomeChannel,leftChannel,memberRole} = require("./config"); 
const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const moment = require("moment"); 
const db = require('./models/database');
const { joinVoiceChannel } = require('@discordjs/voice'); 
const {loadImage,createCanvas } = require('canvas');

//-------------------------------------------------------------------------------------------------------------------------------------------|
// |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Constants ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
//-------------------------------------------------------------------------------------------------------------------------------------------|

const guildInvites = new Map();

//-------------------------------------------------------------------------------------------------------------------------------------------|
// |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Informations ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
//-------------------------------------------------------------------------------------------------------------------------------------------|

client.on("ready", async (app) => {
    console.log("╔════════════════════════════════════╗");
    console.log("");
    console.log("             ╔════════════╗");
    console.log("              Bot Is Online");
    console.log("             ╚════════════╝");
    console.log("");
    console.log(`Logged in as     : [ ${app.user.tag} ]`);
    console.log(`Servers          : [ ${app.guilds.cache.size} ]`);
    console.log(`Channels         : [ ${app.channels.cache.size} ]`);
    console.log(`Users            : [ ${app.users.cache.size} ]`);
    console.log(`Version          : [ ${botVersion} ]`);
    console.log("");
    console.log("╚════════════════════════════════════╝");

    try {
        await reloadFetchingInvite();
        await updateVoiceChannelName();
        await connectToInfoChannel();
    } catch (err) {
        console.error("Error during bot initialization:", err);
    }

    app.user.setPresence({activities: [{ name: `Tarin Bot Restarting`, type: ActivityType.Custom }],status: 'online',});

    const intervalMs = 10000;
    let i = -1;
    let j = 1;

    setInterval(async () => {
        try {
            const statuses = [`Powered By Tarin`, `Version : ${botVersion}`];
            
            if (i === -1 || i === 0) j = 1;
            else if (i >= statuses.length - 1) j = 1 - statuses.length;
            i += j;

            app.user.setPresence({activities: [{ name: statuses[i], type: ActivityType.Custom }],status: 'online',});
        } catch (err) {console.error("❌ Error updating presence:", err);}
    }, intervalMs);
});


//-------------------------------------------------------------------------------------------------------------------------------------------|
// |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Reloading Fonctions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
//-------------------------------------------------------------------------------------------------------------------------------------------|

async function updateVoiceChannelName() {
    const guild = await client.guilds.cache.get(serverID);
    if(!guild) return console.error('Guild not found!');

    const voiceChannel = await guild.channels.cache.get(infoChannel);
    if(!voiceChannel) return console.error('Voice channel not found!');

    const members = await guild.members.fetch()
    if(!members) return console.error('There is no Members!');

    const memberCount = await members.filter((user) => user.user.bot === false).size;
    await voiceChannel.setName(`・CMT : ${memberCount}`);
    console.log(`Updated voice channel name to: Members: ${memberCount}`);
}

async function reloadFetchingInvite() {
    await guildInvites.set(serverID, []);
    client.guilds.cache.get(serverID).invites.fetch().then(invites => {
        console.log(`Invite Fetching System : All Invites Creations Backed Up `);
        invites.each(inv => guildInvites.get(serverID).push({"URL":`${inv.code}`,"Inviter":`${inv.inviter.id}`,"Uses":`${inv.uses}`}));
    }).catch(err => {console.log("Invite Fetching System : I Can't Backup Invitations")})
}

async function connectToInfoChannel() {
    client.guilds.cache.get(serverID).channels.fetch(infoChannel).then((channel) => {joinVoiceChannel({channelId: channel.id,guildId: channel.guild.id,adapterCreator: channel.guild.voiceAdapterCreator})})
}

//-------------------------------------------------------------------------------------------------------------------------------------------|
// |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Production Fonctions ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
//-------------------------------------------------------------------------------------------------------------------------------------------|

const sendCanvasMessage = async (type, channel, member, titleText="") => {
    const dimensions = type === 'kick' ? [500, 296] : [1160, 361];
    const canvas = createCanvas(...dimensions);
    const ctx = canvas.getContext('2d');
    const background = await loadImage(`./${type}.png`);
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    const name = member.user.globalName || member.user.username;
    const maxWidth = 350;
    let fontSize = 60;
    ctx.font = `bold ${fontSize}px sans-serif`;

    while (ctx.measureText(name).width > maxWidth && fontSize > 10) {fontSize -= 1; ctx.font = `bold ${fontSize}px sans-serif`;}

    ctx.fillStyle = '#fff';
    const textWidth = ctx.measureText(name).width;
    const centerX = canvas.width / 2 + 180;
    const nameY = type === 'kick' ? 160 : 120;
    ctx.fillText(name, centerX - textWidth / 2, nameY);

    ctx.font = 'bold 30px sans-serif';
    const idText = `${member.id}`;
    const idWidth = ctx.measureText(idText).width;
    const idX = canvas.width / 2 - idWidth / 2 - 10;
    const idY = type === 'kick' ? 220 : 250;
    ctx.fillText(idText, idX, idY);

    const avatar = await loadImage(member.user.displayAvatarURL({ extension: 'png', size: 256 }));
    const avatarSize = type === 'kick' ? 218 : 340;
    const radius = type === 'kick' ? 109 : 170;
    const avatarX = type === 'kick' ? 20 : 11;
    const avatarY = type === 'kick' ? 73 : 10;

    ctx.beginPath();
    ctx.arc(avatarX + radius, avatarY + radius, radius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);

    const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: `${type}-image.png` });
    await channel.send({ content: `${titleText}`, files: [attachment] }).catch(err => console.log(`Canvas Msg Error [${type}]`));
}

//-------------------------------------------------------------------------------------------------------------------------------------------|
// |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Fetch Invites ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
//-------------------------------------------------------------------------------------------------------------------------------------------|

client.on('inviteCreate', async (invite) => {
    if (invite.guild.id !== serverID) return;

    try {
        const guildId = invite.guild.id;
        const invites = await invite.guild.invites.fetch();

        if (!guildInvites.has(guildId)) {
            guildInvites.set(guildId, []);
        }

        const updatedInvites = invites.map(inv => ({ URL: inv.code,Inviter: inv.inviter?.id || "Unknown",Uses: inv.uses}));

        guildInvites.set(guildId, updatedInvites);

        console.log(`Invite Fetching System : ${invite.inviter?.tag || "Unknown"} created invite link ${invite.code} in ${invite.guild.name}`);
    } catch (error) {console.error(`Error handling inviteCreate in ${invite.guild.name}:`, error);}
});


//-------------------------------------------------------------------------------------------------------------------------------------------|
// |~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~ Join And Left ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~|
//-------------------------------------------------------------------------------------------------------------------------------------------|

client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== serverID) return;

    const guild = member.guild;
    const welcomeCh = guild.channels.cache.get(welcomeChannel);
    const inviterLog = [];
    const oldInvites = guildInvites.get(serverID) || [];

    try {
        updateVoiceChannelName();

        await db.saveUser(member.user.id,member.user.username);
        await db.updateServerState(member.user.id, "IN");

        await member.roles.add(memberRole).catch(error => {console.log(`Welcome System : : Couldn't assign role to ${member.user.tag} [Error: ${error.message}]`);});

        const newInvitesRaw = await guild.invites.fetch();
        const newInvites = Array.from(newInvitesRaw.values()).map(inv => ({URL: inv.code,Inviter: inv.inviter?.id,Uses: inv.uses}));

        for (const oldInv of oldInvites) {
            const matched = newInvites.find(newInv => 
                newInv.URL === oldInv.URL &&
                newInv.Inviter === oldInv.Inviter &&
                newInv.Uses !== oldInv.Uses
            );
            if (matched) {
                inviterLog.push(matched);
                oldInv.Uses = matched.Uses;
            }
        }

        if (inviterLog.length > 0) {
            const inviterID = inviterLog[0].Inviter;
            const currentInvites = (await db.getInvites(inviterID))?.Invites || 0;
            await db.updateinvites(inviterID, currentInvites + 1);
            await db.updateInviterUser(member.user.id, inviterID);
        }

        reloadFetchingInvite();

        await sendCanvasMessage('welcome', welcomeCh, member);

        if (inviterLog.length > 0) {
            const inviterID = inviterLog[0].Inviter;
            const totalInvites = (await db.getInvites(inviterID))?.Invites || 1;
            await welcomeCh.send(`**Welcome To __${guild.name}__ **\n` +`**User : ${member} **\n` +`**Invited By <@${inviterID}>  Total Invites \`${totalInvites}\` **`);
        }
        else{
            await welcomeCh.send(`**Welcome To __${guild.name}__ **\n` +`**User : ${member} **`);
        }
        let backupRoles = (await db.getRoles(member.user.id))?.Roles;
        if (backupRoles) {
            const roleIDs = backupRoles.split(',').filter(Boolean);
            for (const roleId of roleIDs) {
                const role = guild.roles.cache.get(roleId);
                if (role) {
                    try {await member.roles.add(role);} 
                    catch (err) {console.log(`Role Backup System : Failed to add role ${role.name} to ${member.user.tag}`);}
                }
            }
            await db.updateBackupRoles(member.user.id, null);
        }
    } catch (err) {console.error(`Welcome Message System : Error handling new guild member ${member.user.tag}:`, err);}
});

client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== serverID) return;

    const guild = member.guild;
    const leaveCh = guild.channels.cache.get(leftChannel);
    const userId = member.user.id;

    try {
        updateVoiceChannelName();

        const backupRolesArr = member.roles.cache.filter(role => role.id !== guild.id && role.id !== memberRole).map(role => role.id);

        const backupRoles = backupRolesArr.length > 0 ? backupRolesArr.join(',') : null;
        await db.updateBackupRoles(userId, backupRoles);

        const userData = await db.getUser(userId);
        if (userData) {
            await db.updateServerState(userId, "Left");

            if (userData.By && userData.By !== "0") {
                const inviterData = await db.getInvites(userData.By);
                const updatedCount = (inviterData?.Invites || 1) - 1;
                await db.updateinvites(userData.By, Math.max(updatedCount, 0));
            }
        }

        await sendCanvasMessage('left', leaveCh, member,`** ${member.user.globalName || member.user.username} Left The Server**`);
    } catch (err) {console.error(`Error on member leave for ${member.user.tag}:`, err);}
});
