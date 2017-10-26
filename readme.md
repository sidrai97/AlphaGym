# AlphaGym

This is a Facebook Messenger bot which provides you a exercise guide categorized into muscle group, level and equipment. Provides images and videos for a particular exercise. Users can track their workout and generate stats.

## Technologies 

* NodeJS (Webhook handler)
* Python (Scraping)
* PostgreSQL (User Data storage)
* Heroku (Deployment)
* Facebook Messenger API

## Description

* index.js => chatbot wrapper code for handling facebook webhook requests
* scrapper directory => scraper code and dataset for exercises
* views directory => Statistics view template
* Procfile => Declares what commands are run by your application's dynos on the Heroku platform