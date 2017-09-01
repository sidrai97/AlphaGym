'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')

const app = express()

app.set('port', (process.env.PORT || 5000))

// Allows us to process the data
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

// ROUTES
app.get('/', function(req, res) {
	res.send("Hi, I am a AlphaBot")
})

let token = "EAAHTevQllzYBAHA1JPGvXhZCPCgfmWRG8puOODqonELRWUozjt2BzslrKq81ZCJFy8MEIbgibz9ZCyAwLDU6YSy7d0FjH1syqZBCS9SphBdYcfIMjqWnt8hAZCBnX4uh8zClq36WJeMFoTyJYWlo0K7xLXQiUZBADJ2iRrAfNopQZDZD"

// Facebook 
app.get('/webhook/', function(req, res) {
	if (req.query['hub.verify_token'] === token) {
		res.send(req.query['hub.challenge'])
	}
	res.send("Wrong token")
})

// run app
app.listen(app.get('port'), function() {
	console.log("running: port")
})