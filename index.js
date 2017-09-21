'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const exercises_data = require('./scrapper/exercises_data.json')
const isNumeric = require("isnumeric")
const sqlite3 = require('sqlite3').verbose();

const app = express()
const token = process.env.FB_VERIFY_TOKEN
const access = process.env.FB_ACCESS_TOKEN

app.set('port', (process.env.PORT || 5000))
app.set('view engine', 'pug')
// Allows us to process the data
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// ROUTES
app.get('/', function(req, res) {
	res.send("Hi, I am a AlphaBot")
})

// Facebook 
app.get('/webhook', function(req, res) {
	if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token'] === token){
		console.log("Validating webhook");
		res.status(200).send(req.query['hub.challenge']);
	} 
	else{
	  console.error("Failed validation. Make sure the validation tokens match.");
	  res.sendStatus(403);          
	}  
});

app.post('/webhook', function (req, res) {
	var data = req.body;  

	// Make sure this is a page subscription
	if (data.object === 'page') {
		// Iterate over each entry - there may be multiple if batched
		data.entry.forEach(function(entry) {
			var pageID = entry.id;
			var timeOfEvent = entry.time;
  
			// Iterate over each messaging event
			entry.messaging.forEach(function(event) {
			if (event.message) {
				receivedMessage(event);
				console.log("Webhook received message event: ", event);
			}
			else if (event.postback){
				receivedPostback(event);
				console.log("Webhook received postback event: ", event);
			} 
			else {
				console.log("Webhook received unknown event: ", event);
			}
			});
		});
		res.sendStatus(200);
	}
});

function receivedPostback(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfPostback = event.timestamp;
  
	// The 'payload' param is a developer-defined field which is set in a postback 
	// button for Structured Messages. 
	var payload = event.postback.payload;
	var muscles = Object.keys(exercises_data['data'])

	console.log("Received postback for user %d and page %d with payload '%s' " + 
	"at %d", senderID, recipientID, payload, timeOfPostback);

	if(muscles.includes(payload)){
		var muscle_exercises = exercises_data['data'][payload];
		var range=(muscle_exercises.length>4)?4:muscle_exercises.length;
		var elementsArray=[];
		for(var i=0; i<range; i++){
			var title = (i+1).toString()+". "+muscle_exercises[i]["name"];
			var buttons=[{type:"postback",title:"View",payload:payload+":pos:"+i.toString()}];
			elementsArray.push({title:title,buttons:buttons})
		}
		var buttonsArray;
		if(range == muscle_exercises.length){
			buttonsArray=[];
			sendListMessage(senderID, elementsArray);
		}
		else{
			buttonsArray=[{type:"postback",title:"Load More...",payload:payload+":paging:4"}];
			sendListMessage(senderID, elementsArray, buttonsArray);
		}
	}
	else if(payload.includes("paging")){
		var muscle=payload.substring(0,payload.indexOf(":"));
		var muscle_exercises = exercises_data['data'][muscle];
		var paging=parseInt(payload.substring(payload.lastIndexOf(":")+1));
		var range = ((muscle_exercises.length-paging)>4)?4:(muscle_exercises.length-paging);
		
		var elementsArray=[];
		for(var i=paging; i<(paging+range); i++){
			var title = (i+1).toString()+". "+muscle_exercises[i]["name"];
			var buttons=[{type:"postback",title:"View",payload:muscle+":pos:"+i.toString()}];
			elementsArray.push({title:title,buttons:buttons})
		}
		var buttonsArray;
		if(paging+range === muscle_exercises.length){
			buttonsArray=[];
			sendListMessage(senderID, elementsArray);
		}
		else{
			buttonsArray=[{type:"postback",title:"Load More...",payload:muscle+":paging:"+(paging+range)}];
			sendListMessage(senderID, elementsArray, buttonsArray);
		}
	}
	else if(payload.includes("pos")){
		var muscle=payload.substring(0,payload.indexOf(":"));
		var pos=parseInt(payload.substring(payload.lastIndexOf(":")+1));
		sendExerciseDetails(senderID,muscle,pos);
	}
	else{
		sendTextMessage(senderID,payload);
	}
}

function receivedMessage(event) {
	var senderID = event.sender.id;
	var recipientID = event.recipient.id;
	var timeOfMessage = event.timestamp;
	var message = event.message;

	console.log("Received message for user %d and page %d at %d with message:", senderID, recipientID, timeOfMessage);
	console.log(JSON.stringify(message));
	
	var messageId = message.mid;
	var messageText = message.text;
	var messageAttachments = message.attachments;
  
	if (messageText) {
	  	// If we receive a text message, check to see if it matches a keyword
	  	// and send back the example. Otherwise, just echo the text we received.
		var msg=messageText.toLowerCase();
		switch (true) {
			case msg.includes('hi') || msg.includes('hey') || msg.includes('yo') || msg.includes('hy'):
				sendTextMessage(senderID,"Hi Alpha! You can use the following commands to know more.");
				setTimeout(function(){sendDefaultTextMessage(senderID);},1000);
				break;
			case msg.includes('help'):
				sendDefaultTextMessage(senderID);
				break;
			case msg.includes('stats'):
				sendStatsMessage(senderID);
				break;
			case msg.includes('schedule') || msg.includes('track workout'):
				var msg="Send workout details in one of the following format";
				var msg1="For Weighted exercises:\nexercise_name/weights(in lbs)/sets/reps";
				var msg2="For Bodyweight exercises:\nexercise_name/sets/reps";
				sendTextMessage(senderID,msg)				
				setTimeout(function(){sendTextMessage(senderID,msg1);},1000);
				setTimeout(function(){sendTextMessage(senderID,msg2);},1000);
				break;
			case msg.includes('exercise guide') || msg.includes('guide'):
				var muscles = Object.keys(exercises_data['data'])	
				sendMuscleGroups(senderID,muscles)
				break;
			case (msg.split('/').length-1)==2:
				var msgData=msg.split('/')
				var exerciseName=msgData[0];
				var sets=msgData[1];
				var reps=msgData[2];
				trackWorkout(senderID,exerciseName,sets,reps);
				break;
			case (msg.split('/').length-1)==3:
				var msgData=msg.split('/')
				var exerciseName=msgData[0];
				var weights=msgData[1];
				var sets=msgData[2];
				var reps=msgData[3];
				trackWorkout(senderID,exerciseName,sets,reps,weights);
				break;
			case msg.includes('testdb'):
				testDB(senderID);
				break;
			default:
				console.log(messageText);
				sendTextMessage(senderID,"I'm not sure if I understand you right now!");
				//setTimeout(function(){sendDefaultTextMessage(senderID);},1000);
	  	}
	} 
	else if (messageAttachments) {
		//sendTextMessage(senderID, "Message with attachment received");
	}
}

//handle stats get request
app.get('/stats', function(req, res) {
    var userid=req.query.userid
    var message=[]
    var db = new sqlite3.Database('//145.14.145.227/userData.db',function(err){
		if(err){
			return console.log('Error connecting to database :',err);
		}
		console.log('Database connected');
	});
	
	db.each("select * from userWorkout where userId="+userid+" order by rowid desc", function(err, row) {
        var temp={
            "date":row.dateTime,
            "exerciseName":row.exerciseName,
            "weighted":row.weighted,
            "weight":row.weight,
            "sets":row.sets,
            "reps":row.reps
        }
        message.push(temp)
	});

	//closing database connection
	db.close(function(err){
		if(err){
			return console.log('Error closing database : ',err);
		}
        console.log('Closing database connection');
        res.render('stats',{userid:userid,message:message})
    });
})

//send generic stats msg
function sendStatsMessage(recipientId){
	var messageData = {
		recipient: {
			id: recipientId
		},
		message:{
			attachment:{
				type:"template",
				payload:{
					template_type:"generic",
					elements:[
						{
							title:"Nice Training!",
							subtitle:"Click on the button to get to your personal statistics page.",
							image_url:"https://static-s.aa-cdn.net/img/ios/536049508/c9ea5d4ddbf05639d46e31d729cbfbba",     
							buttons:[{
								type:"web_url",
								url:"https://sleepy-bayou-84695.herokuapp.com/stats?userid="+recipientId,
								title:"View statistics",
								webview_height_ratio:"full"
							}] 
						}
					]
				}
			}
		}
	};
	callSendAPI(messageData);
}

function sendGenericMessage(recipientID, title, left_url, right_url) {
	var messageData = {
		recipient: {
			id: recipientID
		},
		message:{
			attachment:{
				type:"template",
				payload:{
					template_type:"generic",
					elements:[
						{
							title:title,
							subtitle:"Start Position",
							image_url:left_url,     
							default_action:{
								type:"web_url",
								url:left_url,
								webview_height_ratio:"tall"
							} 
						},
						{
							title:title,
							subtitle:"End Position",
							image_url:right_url,
							default_action:{
								type:"web_url",
								url:right_url,
								webview_height_ratio:"tall"
							}
						}
					]
				}
			}
		}
	};
	callSendAPI(messageData);
}

// For default and help message
function sendDefaultTextMessage(recipientId)
{
	var quickReply=[
		{
			"content_type":"text","title":"exercise guide","payload":"exercise guide"
		},
		{
			"content_type":"text","title":"track workout","payload":"track workout"
		},
		{
			"content_type":"text","title":"stats","payload":"stats"
		}
	];
	sendTextMessage(recipientId,"Say 'exercise guide' to learn weight training execises.",quickReply);
	sendTextMessage(recipientId,"Say 'track workout' to know how you can track your workout schedule.",quickReply);
	sendTextMessage(recipientId,"You can see your workout statistics with the 'stats' command.",quickReply);
	sendTextMessage(recipientId,"Say 'help' for this help reminder.", quickReply);
}

// text message and 3 buttons as options
function sendButtonMessage(recipientID,messageText,buttonsArray,quickReply){
	var messageData;
	if(quickReply === undefined){
		messageData = {
			recipient: {
				id: recipientID
			},
			message:{
				attachment:{
					type:"template",
					payload:{
						template_type:"button",
						text:messageText,
						buttons:buttonsArray
					}
				}
			}
		};
	}
	else{
		messageData = {
			recipient: {
				id: recipientID
			},
			message:{
				attachment:{
					type:"template",
					payload:{
						template_type:"button",
						text:messageText,
						buttons:buttonsArray
					}
				},
				quick_replies:quickReply
			}
		};
	}
	callSendAPI(messageData);
}

// text message and quick reply
function sendTextMessage(recipientId, messageText, quickReply) {
	var messageData;
	if (quickReply === undefined){
		messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				text: messageText
			}
		};
	}
	else{
		messageData = {
			recipient: {
				id: recipientId
			},
			message: {
				text: messageText,
				quick_replies: quickReply
			}
		};
	}
	callSendAPI(messageData);
}

function sendListMessage(recipientId,elementsArray,buttonsArray){
	var messageData={
		recipient: {
			id: recipientId
		},
		message: {
			attachment: {
				type: "template",
				payload: {
				  template_type: "list",
				  top_element_style: "compact",
				  elements: elementsArray				     
				}
			}
		}
	};
	if(buttonsArray !== undefined){
		messageData.message.attachment.payload.buttons=buttonsArray;
	}
	callSendAPI(messageData);
}

// send muscle groups
function sendMuscleGroups(recipientID,muscles){
	for(var i=0;i<muscles.length;i=i+3){
		var elementsArray=[];
		for(var j=i;j<i+3;j++){
			var title = capitalizeFirstLetter(muscles[j])
			var subtitle = (exercises_data["data"][muscles[j]].length).toString()+" exercises in database"
			elementsArray.push({title:title,subtitle:subtitle,buttons:[{type:"postback",title:"View",payload:muscles[j]}]})
			//elementsArray.push({type:"postback",title:title,payload:muscles[j]})
		}
		sendListMessage(recipientID,elementsArray)
	}
}

// send Exercise Details
function sendExerciseDetails(recipientID,muscle,pos){
	var exercise = exercises_data["data"][muscle][pos];
	var messageText = "Exercise: 	"+exercise["name"]+"\n\nMuscle: "+exercise["muscle"]
	+"\n\nLevel: "+exercise["level"]+"\n\nEquipment: "+exercise["equipment"];

	var name=exercise["name"];
	var left_url=exercise["left_img_url"];
	var right_url=exercise["right_img_url"];
	var video=exercise["video_url"];
	var buttonsArray=[{
    	type:"web_url",
        url:video,
        title:"View Exercise Video",
		webview_height_ratio: "full"
    }];
	sendButtonMessage(recipientID,messageText,buttonsArray);
	setTimeout(function(){sendGenericMessage(recipientID,name,left_url,right_url);},700);
	/*
	setTimeout(function(){sendTextMessage(recipientID,"Guide:");},1000);
	for(var i=0; i<exercise["guide"].length-1; i++){
		if(exercise["guide"][i].length > 0){
			var temp=(i+1).toString()+". "+exercise["guide"][i];
			setTimeout(function(){sendTextMessage(recipientID,temp);},1000);
		}
	}
	var temp2=(exercise["guide"].length).toString()+". "+exercise["guide"][exercise["guide"].length];
	
	setTimeout(function(){sendButtonMessage(recipientID,temp2,buttonsArray);},1000);
	*/
}

//track exercise details
function trackWorkout(recipientId,exerciseName,sets,reps,weights){
	var db = new sqlite3.Database('//145.14.145.227/userData.db',function(err){
		if(err){
			return console.log('Error connecting to database :',err);
		}
		console.log('Database connected');
	});
	var date=new Date();
	date=date.toLocaleString();
	var stmt = db.prepare("INSERT INTO userWorkout VALUES (?,?,?,?,?,?,?)");
	if(weights==undefined){
		stmt.run(recipientId,date,exerciseName,"no","0",sets,reps);
	}
	else{
		stmt.run(recipientId,date,exerciseName,"yes",weights,sets,reps);
	}
	stmt.finalize();
	//closing database connection
	db.close(function(err){
		if(err){
			return console.log('Error closing database : ',err);
		}
		console.log('Closing database connection');
	});
	var coolMsgs=["No Pain,No Gain!","Alright! keep going","Cool! what's next?","Good Job!"]
	sendTextMessage(recipientId,coolMsgs[Math.floor(Math.random() * coolMsgs.length)]);
}
//
function testDB(recipientId){
	var db = new sqlite3.Database('//145.14.145.227/userData.db',function(err){
		if(err){
			return console.log('Error connecting to database :',err);
		}
		console.log('Database connected');
	});
	
	db.each("SELECT * FROM userWorkout where userId="+recipientId, function(err, row) {
		console.log(row.exerciseName);
	});

	//closing database connection
	db.close(function(err){
		if(err){
			return console.log('Error closing database : ',err);
		}
		console.log('Closing database connection');
	});
}

// Send Message to Facebook
function callSendAPI(messageData) {
	request({
		uri: 'https://graph.facebook.com/v2.6/me/messages',
		qs: { access_token: access },
		method: 'POST',
		json: messageData
	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			var recipientId = body.recipient_id;
			var messageId = body.message_id;

			console.log("Successfully sent the message with id %s to recipient %s", messageId, recipientId);
		} 
		else {
			console.error("Unable to send message.");
			console.error(response);
			console.error(error);
		}
	});  
}

// get user data from facebook
function userProfileAPI(user_page_id){
	request({
		uri: 'https://graph.facebook.com/v2.6/'+user_page_id,
		qs: { access_token: access },
		method: 'GET'
	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
			console.log("user profile body:", body);
		} 
		else {
			console.error("Unable to send message.");
			console.error(response);
			console.error(error);
		}
	});
}

// capitalize string
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

// run app
app.listen(app.get('port'), function() {
	console.log("running: "+app.get('port'))
})