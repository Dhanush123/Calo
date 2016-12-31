"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const GoogleMapsAPI = require("googlemaps");
const request = require("request");
const event = require("search-eventbrite");
const moment = require("moment-timezone");
const Yelp = require('yelp-api-v3');
const EventSearch = require("facebook-events-by-location-core");

var yelp = new Yelp({
  app_id: "g4GGJOk6feS7HoSDAfzJtw",
  app_secret: "tIJAG3oWzXTA9YJUJunB4DrDqwFtYbrGR6BrICG2U0lWk05ucvT8gvlesvrhZElt"
});

var publicConfig = {
    key: 'AIzaSyCKzerWst-Rwanyum59N3J60yruUsIUe-k',
    stagger_time:       100, // for elevationPath
    encode_polylines:   false,
    secure:             true, // use https
};
var gmAPI = new GoogleMapsAPI(publicConfig);

const restService = express();
restService.use(bodyParser.json());

var cityName = "";
var eType = "";
var yType = "";
var cardsSend = [];

restService.get("/p", function (req, res) {
  console.log("hook request");
  try {
      if (req) {
        if(req.query.serq == "true"){
          getFBEvents(req, function(result) {
                     //callback is ultimately to return Messenger appropriate responses formatted correctly
                     console.log("results w/ getFBEvents: ", cardsSend);
                     if(cardsSend){
                       return res.json({
                         results: cardsSend,
                       });
                     }
                     else{
                       return res.json({
                         err: "NOCARDSFOUND"
                       });
                     }
                   });
        }
        else if(req.query.serq){
          getNearbyEventsBrite(req, function(result) {
                     //callback is ultimately to return Messenger appropriate responses formatted correctly
                     console.log("results w/ getNearbyEventsBrite: ", cardsSend);
                     if(cardsSend){
                       return res.json({
                         results: cardsSend,
                       });
                     }
                     else{
                       return res.json({
                         err: "NOCARDSFOUND"
                       });
                     }
                   });
        }
        else if(req.query.yerq){
          getYelpEvents(req, function(result) {
                     //callback is ultimately to return Messenger appropriate responses formatted correctly
                     console.log("results w/ getYelpEvents: ", cardsSend);
                     if(cardsSend){
                       return res.json({
                         results: cardsSend,
                       });
                     }
                     else{
                       return res.json({
                         err: "NOCARDSFOUND"
                       });
                     }
                   });
        }
      }
  }
  catch (err) {
    console.error("Cannot process request", err);
    return res.status(400).json({
        status: {
            code: 400,
            errorType: err.message
        }
    });
  }
});

function getYelpEvents(req,callback) {
  cityName = "";
  yType = "";
  cardsSend = [];
  console.log("req: " + req);
  console.log("req.query.location: "+req.query.location);
  cityName = req.query.location;
  console.log("cityName: "+cityName);
  console.log("req.query.location: "+req.query.yerq);
  yType = (req.query.yerq != "undefined" && req.query.yerq != "null") ? req.query.yerq : "American";
  console.log("set yType: "+yType);
  YelpCall(callback);
}

function YelpCall(callback){
  console.log("yelp call entered");
  console.log("yelpCall yType: "+yType);

  yelp.search({term: yType, location: cityName, limit: 10, categories: "food"})
  .then(function (data) {
    console.log("got yelp response");
    console.log("data pre-JSONparse: "+data);
    var data = JSON.parse(data);
    console.log("data: "+data);
    if(data.total > 0){
      var lim = data.total >= 5 ? 5 : data.total;
      for(var i = 0; i < lim; i++){
        if(data.businesses[i]){
          var cardObj = {
            title: "",
            image_url: "",
            subtitle: "",
            buttons: [{
              type: "web_url",
              url: "",
              title: "View Place"
            }]
          };
          cardObj.title = data.businesses[i].name;
          cardObj.image_url = data.businesses[i].image_url;
          cardObj.subtitle = data.businesses[i].location.address1;
          cardObj.buttons[0].url = data.businesses[i].url;
          cardsSend[i] = cardObj;
        }
      }
    }
    callback();
  })
  .catch(function (err) {
      console.error("yelp err: "+err);
  });
}

function getNearbyEventsBrite(req, callback) {
  cityName = "";
  eType = "";
  cardsSend = [];
  console.log("req: " + req);
  cityName = req.query.location;
  eType = (req.query.serq != "undefined" && req.query.serq != "null") ? req.query.serq : "Conference";
  console.log("cityName: "+cityName);
  console.log("eType: "+eType);
  EventbriteCall(callback);
}

function EventbriteCall(callback) {
  var params = {};
  params["q"] = eType;
  params["location.address"] = cityName;
  params["location.within"] = "30mi";
  params["sort_by"] =  "date";
  params["include_all_series_instances"] = "false";
  console.log("params: ",params);
  event.getAll(params, function(err, res, events){
      if(err){
        return console.log("err: ", err);
      }
      else{
        console.log("events: ", events);
        if(events.length > 0){
          var lim = events.length >= 5 ? 5 : events.length;
          for(var i = 0; i < lim; i++){
            if(events[i]){
              var cardObj = {
                title: "",
                image_url: "",
                subtitle: "",
                buttons: [{
                  type: "web_url",
                  url: "",
                  title: "View Event"
                }]
              };
              cardObj.title = events[i].name;
              cardObj.image_url = events[i].thumbnail;
              cardObj.subtitle = moment(events[i].start).format("MMMM Do YYYY");
              cardObj.buttons[0].url = events[i].url;
              cardsSend[i] = cardObj;
            }
          }
          events.push(events.shift());
        }
        callback();
      }
  });
}

function getFBEvents(req, callback) {
  cityName = "";
  cardsSend = [];
  eType = "";
  yType = "";
  console.log("req: " + req);
  cityName = req.query.location;
  console.log("cityName: "+cityName);
  FBCall(callback);
}

function FBCall(callback){
  var params = {
    'address': cityName,
    'components': 'components=country:US',
    'language':   'en',
    'region':     'us'
  };

  gmAPI.geocode(params, function(err, result) {
    console.log('err: '+err);
    console.log('result: '+result);
    var propValue;
    for(var propName in result) {
        propValue = result[propName]
        console.log(propName,propValue);
    }
    if(err == null && result.status == 'OK'){
      if(result.results[0].geometry.location != undefined) {
        console.log('result.results[0]: ' + result.results[0]);
        console.log('result.results[0].geometry.location: ' + result.results[0].geometry.location);
        var lat = result.results[0].geometry.location.lat
        var long = result.results[0].geometry.location.lng;
        console.log('result.results[0].geometry.location.lat: ' + lat);
        console.log('result.results[0].geometry.location.lng: ' + long);
        var es = new EventSearch({
            "lat": lat,
            "lng": long
        });
        es.search().then(function (eventss) {
            console.log(JSON.stringify(eventss));
            var res = eventss;
            console.log("res.metadata.events: "+res.metadata.events);
              for(var i = 0; i < 5; i++){
                if(res.events[i]){
                  var cardObj = {
                    title: "",
                    image_url: "",
                    subtitle: "",
                  };
                  cardObj.title = res.events[i].name;
                  console.log("cardObj.title: "+cardObj.title);
                  cardObj.image_url = res.events[i].coverPicture;
                  console.log("cardObj.image_url: "+cardObj.image_url);
                  cardObj.subtitle = moment(res.events[i].startTime).format("MMMM Do YYYY");
                  console.log("cardObj.subtitle: "+cardObj.subtitle);
                  cardsSend[i] = cardObj;
                }
                else{
                  break;
                }
               }
               callback();
        }).catch(function (error) {
            console.error("err: "+JSON.stringify(error));
        });
      }
    }
  });
}

function createGreetingApi(data) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
    qs: { access_token: 'EAAB1HAFG2bEBAKWYE494YBJOg9m2q0C29IVcwO1EITvvLR6C2S5mZB2vOuB5UKBW0AJgKRYBTWEtxId5qZBOPEyk5ZCyxQlllgccSFbrLeGVdsRntfaOZAvbNhHObtNs61FRIkSG44uHWZC6UvYig6vHIO7VYj1pwCGMOLlnEggZDZD' },
    method: 'POST',
    json: data

    }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      console.log("Greeting set successfully!");
    } else {
      console.error("Failed calling Thread Reference API", response.statusCode, response.statusMessage, body.error);
    }
  });
}

function setGreetingText() {
  var greetingData = {
    setting_type: "greeting",
    greeting:{
      text:"Hi {{user_first_name}}, welcome! You can ask about events or food places in any city. For US cities, specify the state if possible."
    }
  };
  createGreetingApi(greetingData);
}

restService.listen((process.env.PORT || 8000), function () {
  setGreetingText();
  console.log("Server listening");
});
