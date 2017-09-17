'use strict'

const sqlite3 = require('sqlite3').verbose();

//database connection
var db = new sqlite3.Database('userData.db',function(err){
    if(err){
        return console.log('Error connecting to database :',err);
    }
    console.log('Database connected');
});

db.serialize(function(){
    
    var stmt = db.prepare("INSERT INTO user VALUES (?,?)");
    stmt.run();
});

//closing database connection
db.close(function(err){
    if(err){
        return console.log('Error closing database : ',err);
    }
    console.log('Closing database connection');
});