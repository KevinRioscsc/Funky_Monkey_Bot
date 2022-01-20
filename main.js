const { Client, Intents } = require('discord.js');
const yts = require('yt-search')
const ytdl = require('ytdl-core')
const {
	AudioPlayerStatus,
  createAudioPlayer,
	AudioResource,
	entersState,
	joinVoiceChannel,
	VoiceConnectionStatus,
  NoSubscriberBehavior,
  createAudioResource,
} =  require('@discordjs/voice');

require('dotenv').config();
const queue = new Map()
// queue(message.guid.id, queue_constructor obj {voice channel, text channel, connections, song[]})
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES, Intents.FLAGS.GUILD_VOICE_STATES] })




client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
  });


 const searching = async(search, message) =>{
   const r = await yts(search)
   const videos = r.videos.slice( 0, 1 )
   return(videos[0])
  

 }
 const checkArgs = (arg) =>{
   var regex = /(http|https):\/\/(\w+:{0,1}\w*)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%!\-\/]))?/
   if(regex.test(arg)){
     return true
   }else{
     return false
   }
 }

 const play_keyWords = async(search) =>{
    const r = await yts(search)
    const videos = r.videos.slice( 0, 1 )
    return {title: videos[0].title, url: videos[0].url}
 }
 
 const play_HTTP = async(arg) =>{
   const songInfo = await ytdl.getInfo(arg)
   return {title: songInfo.videoDetails.title, url:songInfo.videoDetails.video_url}
 }
 

  

  client.on('messageCreate', async(message) => {
    const serverQueue = queue.get(message.guild.id)
    

    if(message.content === '!play') return message.reply('play what!?!? be more specific')
    if(message.content === '!pause') return  message.channel.send(pauseSong(serverQueue))
    if(message.content === '!resume') return  message.channel.send(resumeSong(serverQueue))
    if(message.content === '!queue') return  message.channel.send(lookAtQueue(serverQueue))
    if(message.content === '!skip'){
      const serverQueue = queue.get(message.guild.id)

      serverQueue.songs.shift()
      audioPlay(message.guild.id, serverQueue.songs[0])
    }
    if (message.content.includes('!play')) {
      
      if(!message.member.voice.channel){
        return message.reply('You must be in the voice channel')
      }
       
      let song = {}
      

      if(checkArgs(message.content.replace('!play', ""))){
        song =  await play_HTTP(message.content.replace('!play', "").trim())
      }
      else{
        song = await play_keyWords(message.content.replace('!play', ""), message) 
      }
      
      if(!serverQueue){
        //Majority of music bots have a queue constructor for multiple guild access
        const queueConstructor = {
          voiceChannel : null,
          textChannel: message.channel,
          connection: null,
          songs: []
        }

        queue.set(message.guildId, queueConstructor)
        queueConstructor.songs.push(song)

        try{
            const connection = joinVoiceChannel({
              channelId: message.member.voice.channel.id,
              guildId: message.member.voice.channel.guild.id,
              adapterCreator: message.member.voice.channel.guild.voiceAdapterCreator
          })
          queueConstructor.voiceChannel = connection
          queueConstructor.connection = createAudioPlayer({
            behaviors: {
              noSubscriber: NoSubscriberBehavior.Pause,
            },
          });
          
          connection.subscribe(queueConstructor.connection)
          audioPlay(message.guildId, queueConstructor.songs[0])
        } catch (err) {
          queue.delete(message.guildId)
          message.channel.send('There was an error :(')
          throw err
        }
      } else{
        serverQueue.songs.push(song)
        return message.channel.send(`:thumbsup: ***${song.title}*** added to the queue`)
      }
      
    }
  });
  const resumeSong = (serverQueue) =>{

    serverQueue.connection.unpause()

    return `*** ${serverQueue.songs[0].title} ***  has resumed. Enjoy!!`

  }
  const pauseSong = (serverQueue) =>{
    serverQueue.connection.pause()

    return `***${serverQueue.songs[0].title}***  was paused`

  }
  const lookAtQueue = (serverQueue) =>{
    let message = ''
    message =  'Now Playing: ' + '***' + serverQueue.songs[0].title  + '***' + '\n' 
    for(let i = 0; i < serverQueue.songs.length; i++){
      if(i === 0){
        continue
      } 
      if(i === 1){
        message += '\nNext Up:'  + ' ' + '***' + serverQueue.songs[i].title + '***' + '\n'
        continue
      }
      message += '\nSong ' + i + ' '  + '***' + serverQueue.songs[i].title  + '***' + '\n'
    }
    return message
  }
  const audioPlay =  async (guild, song) =>{
    const songQueue = queue.get(guild)
    if(!song){
     
      queue.delete(guild)
      return
    }
    const stream = ytdl(song.url, {filter: 'audioonly'})
    const resource = createAudioResource(stream)
     songQueue.connection.play(resource)
     songQueue.connection.on(AudioPlayerStatus.Playing, () => {
        console.log("we are playing")
    })

     songQueue.connection.on('error', () => {
      console.log('something went wrong')
    })
    
    songQueue.connection.on(AudioPlayerStatus.Buffering, () => {
      console.log('We are buffering')
      songQueue.songs.shift()
      audioPlay(guild, songQueue.songs[0])
    })
    

    await songQueue.textChannel.send(`:thumbsup: Now Playing ***${song.title}***`)
  }


client.login(process.env.TOKEN);