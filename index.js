'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const exercises_data = require('./scrapper/exercises_data.json')
const isNumeric = require("isnumeric")

const app = express()
const token = process.env.FB_VERIFY_TOKEN
const access = process.env.FB_ACCESS_TOKEN

app.set('port', (process.env.PORT || 5000))

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
		var range=(muscle_exercises.length>10)?10:muscle_exercises.length;
		var quickReply=[];
		var messageText = capitalizeFirstLetter(payload)+"Exercises\n\nEnter code for the exercise you want to know more about\n\n";
		for(var i=0; i<range; i++){
			var temp = (i+1).toString()+". "+muscle_exercises[i]["name"]+"\n\n";
			messageText += temp;
			quickReply.push({
				"content_type":"text","title":(i+1).toString(),"payload":payload+":pos:"+i.toString()
			})
		}
		var buttonsArray;
		if(range == muscle_exercises.length){
			buttonsArray=[];
			sendTextMessage(senderID, messageText,quickReply);
		}
		else{
			buttonsArray=[{type:"postback",title:"Load More...",payload:payload+":paging:10"}];
			sendButtonMessage(senderID, messageText,buttonsArray, quickReply);
		}
	}
	else if(payload.includes("paging")){
		var muscle=payload.substring(0,payload.indexOf(":"));
		var muscle_exercises = exercises_data['data'][muscle];
		var paging=parseInt(payload.substring(payload.lastIndexOf(":")+1));
		var quickReply=[];
		var range = ((muscle_exercises.length-paging)>10)?10:(muscle_exercises.length-paging);
		
		var messageText = capitalizeFirstLetter(muscle)+"Exercises\n\nSelect code for the exercise you want to know more about\n\n";
		for(var i=paging; i<(paging+range); i++){
			var temp = (i+1).toString()+". "+muscle_exercises[i]["name"]+"\n\n";
			messageText += temp;
			quickReply.push({
				"content_type":"text","title":(i+1).toString(),"payload":muscle+":pos:"+i.toString()
			})
		}
		var buttonsArray;
		if(paging+range === muscle_exercises.length){
			buttonsArray=[];
			sendTextMessage(senderID, messageText, quickReply);
		}
		else{
			buttonsArray=[{type:"postback",title:"Load More...",payload:muscle+":paging:"+(paging+range)}];
			sendButtonMessage(senderID, messageText,buttonsArray, quickReply);
		}
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
				sendTextMessage(senderID,'feature coming soon!')
				break;
			case msg.includes('schedule'):
				sendTextMessage(senderID,'feature coming soon!')
				break;
			case msg.includes('exercise guide'):
				var muscles = Object.keys(exercises_data['data'])	
				sendMuscleGroups(senderID,muscles)
				break;
			case isNumeric(msg):
				if("quick_reply" in message){
					var payload=message["quick_reply"]["payload"]
					var muscle=payload.substring(0,payload.indexOf(":"));
					var pos=parseInt(payload.substring(payload.lastIndexOf(":")+1));
					sendExerciseDetails(senderID,muscle,pos);
				}
				break;
			default:
				console.log(messageText);
				sendTextMessage(senderID,"I'm not sure if I understand you right now!");
				setTimeout(function(){sendDefaultTextMessage(senderID);},1000);
	  	}
	} 
	else if (messageAttachments) {
		sendTextMessage(senderID, "Message with attachment received");
	}
}

function sendGenericMessage(recipientID, title, left_url, right_url) {
	var messageData = {
		recipient: {
			id: recipientID
		},
		messageText={
			attachment:{
				type:"template",
				payload:{
					template_type:"generic",
					elements:[
						{
							title:title,
							subtitle:"Start Position",
							image_url:left_url,      
						},
						{
							title:title,
							subtitle:"End Position",
							image_url:right_url,
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
			"content_type":"text","title":"schedule","payload":"schedule"
		},
		{
			"content_type":"text","title":"stats","payload":"stats"
		}
	];
	sendTextMessage(recipientId,"Say 'exercise guide' to learn weight training execises.",quickReply);
	sendTextMessage(recipientId,"Say 'schedule' to know how you can track your workout.",quickReply);
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

// send muscle groups
function sendMuscleGroups(recipientID,muscles){
	for(var i=0;i<muscles.length;i=i+3){
		var buttonsArray=[];
		for(var j=i;j<i+3;j++){
			var title = capitalizeFirstLetter(muscles[j])
			buttonsArray.push({type:"postback",title:title,payload:muscles[j]})
		}
		sendButtonMessage(recipientID,"Select Target Muscle",buttonsArray)
	}
}

// send Exercise Details
function sendExerciseDetails(recipientID,muscle,pos){
	var exercise = exercises_data["data"][muscle][pos];
	var messageText = "Exercise: 	"+exercise["name"]+"\n\nMuscle: "+exercise["muscle"]
	+"\n\nLevel: "+exercise["level"]+"\n\nEquipment: "+exercise["equipment"]+"\n\nGuide: ";

	for(var i=0; i<exercise["guide"].length; i++){
		if(exercise["guide"][i].length > 0){
			messageText += "\n"+(i+1).toString()+". "+exercise["guide"][i];
		}
	}

	var name=exercise["name"];
	var left_url=exercise["left_img_url"];
	var right_url=exercise["right_img_url"];
	sendTextMessage(recipientID,messageText);
	setTimeout(function(){sendGenericMessage(recipientID,name,left_url,right_url);},1000);
	
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