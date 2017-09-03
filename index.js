'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')

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
  
	console.log("Received postback for user %d and page %d with payload '%s' " + 
	"at %d", senderID, recipientID, payload, timeOfPostback);
  
	// When a postback is called, we'll send a message back to the sender to 
	// let them know it was successful
	sendTextMessage(senderID, payload);
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
		switch (messageText.toLowerCase()) {
			case 'generic':
				sendGenericMessage(senderID);
				break;
			case 'help':
				sendDefaultTextMessage(senderID);
				break;
			case 'schedule':
				sendTextMessage(senderID,'feature coming soon!')
				break;
			case 'stats':
				sendTextMessage(senderID,'feature coming soon!')
				break;
			case 'exercise guide':
				sendTextMessage(senderID,'feature coming soon!')
				break;
			default:
				sendTextMessage(senderID,"I'm not sure if I understand you right now!");
				sendDefaultTextMessage(senderID);
	  	}
	} 
	else if (messageAttachments) {
		sendTextMessage(senderID, "Message with attachment received");
	}
}

function sendGenericMessage(recipientId, messageText) {
	// To be expanded in later sections
}

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
	sendTextMessage(recipientId,"Try using from the given commands.");
	sendTextMessage(recipientId,"Say 'exercise guide' to learn weight training execises.");
	sendTextMessage(recipientId,"Say 'schedule' to know how you can track your workout.");
	sendTextMessage(recipientId,"You can see your workout statistics with the 'stats' command.");
	sendTextMessage(recipientId,"Say 'help' for this help reminder.", quickReply);
}

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

// run app
app.listen(app.get('port'), function() {
	console.log("running: "+app.get('port'))
})