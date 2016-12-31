"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const GoogleMapsAPI = require("googlemaps");
const request = require("request");
const event = require("search-eventbrite");
const moment = require("moment-timezone");
const yelp = require("yelp-fusion");

var publicConfig = {
    key: "AIzaSyCKzerWst-Rwanyum59N3J60yruUsIUe-k",
    stagger_time:       100, // for elevationPath
    encode_polylines:   false,
    secure:             true, // use https
};
var gmAPI = new GoogleMapsAPI(publicConfig);

var clientId = "g4GGJOk6feS7HoSDAfzJtw";
var secret = "tIJAG3oWzXTA9YJUJunB4DrDqwFtYbrGR6BrICG2U0lWk05ucvT8gvlesvrhZElt";

const restService = express();
restService.use(bodyParser.json());

function clbk(result) {
 //callback is ultimately to return Messenger appropriate responses formatted correctly
 var result;
 console.log("results w/ getNearbyEventsBrite or getYelpEvents: ", cardsSend);
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
}

var cityName = "";
var eType = "";
var yType = "";
var cardsSend = [];

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

restService.get("/p", function (req, res) {
  console.log("hook request");
  try {
      if (req) {
        if(req.query.serq){
          getNearbyEventsBrite(req,clbk);
        }
        else if(req.query.yerq){
          getYelpEvents(req,clbk);
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

function getNearbyEventsBrite(req, callback) {
  cityName = "";
  yType = "";
  cardsSend = [];
  console.log("req: " + req);
  cityName = req.query.location;
  yType = req.query.yerq;
  console.log("cityName: "+cityName);
  console.log("yType: "+yType);
  YelpCall(callback);
}

// title: "",
// image_url: "",
// subtitle: "",
// buttons: [{
//   type: "web_url",
//   url: "",
//   title: "View Event"
// }]
function YelpCall(callback){
  yelp.accessToken(clientId, clientSecret).then(response => {
    const client = yelp.client(response.jsonBody.access_token);

    client.search({
      term: yerq,
      location: cityName
    }).then(response => {
      var res = response.jsonBody;
      console.log(res);
      if(res.total >= 5){
        for(var i = 0; i < 5; i++){
          if(res.businesses[i]){
            cardObj.title = res.businesses[i].name;
            cardObj.image_url = res.businesses[i].image_url;
            cardObj.subtitle = res.businesses[i].location.address1;
            cardObj.buttons[0].url = res.businesses[i].url;
            cardsSend[i] = cardObj;
          }
        }
      }
      callback();
    });
  }).catch(e => {
    console.log(e);
  });
}

function getNearbyEventsBrite(req, callback) {
  cityName = "";
  eType = "";
  cardsSend = [];
  console.log("req: " + req);
  cityName = req.query.location;
  eType = req.query.serq;
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
          for(var i = 0; i < 5; i++){
            if(events[i]){
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

restService.listen((process.env.PORT || 8000), function () {
  console.log("Server listening");
});
