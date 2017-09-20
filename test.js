'use strict'
const express = require('express')
const bodyParser = require('body-parser')
const request = require('request')
const sqlite3 = require('sqlite3').verbose();

const app = express()

app.set('port', (process.env.PORT || 5000))
app.set('view engine', 'pug')
app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())

app.get('/', function(req, res) {
    var userid=req.query.userid
    var username;
    var message=[]
    var db = new sqlite3.Database('userData1.db',function(err){
		if(err){
			return console.log('Error connecting to database :',err);
		}
		console.log('Database connected');
	});
	
	db.each("select * from user inner join userWorkout where userWorkout.userId="+userid+" order by userWorkout.rowid desc", function(err, row) {
        var temp={
            "date":row.dateTime,
            "exerciseName":row.exerciseName,
            "weighted":row.weighted,
            "weight":row.weight,
            "sets":row.sets,
            "reps":row.reps
        }
        message.push(temp)
        username=row.userName
	});

	//closing database connection
	db.close(function(err){
		if(err){
			return console.log('Error closing database : ',err);
		}
        console.log('Closing database connection');
        res.render('stats',{userid:userid,username:username,message:message})
    });
})

app.listen(app.get('port'), function() {
	console.log("running: "+app.get('port'))
})