"use strict";

const express = require("express");
const bodyParser = require("body-parser");
const GoogleMapsAPI = require("googlemaps");
const request = require("request");
const event = require("search-eventbrite");
var moment = require("moment-timezone");

var publicConfig = {
    key: "AIzaSyCKzerWst-Rwanyum59N3J60yruUsIUe-k",
    stagger_time:       100, // for elevationPath
    encode_polylines:   false,
    secure:             true, // use https
};
var gmAPI = new GoogleMapsAPI(publicConfig);

const restService = express();
restService.use(bodyParser.json());

var cityName = "";
var eType = "";
var cardsSend = [];
var altPrevType = "event";

restService.get("/p", function (req, res) {
  console.log("hook request");
  try {
      if (req) {
          getNearbyEventsBrite(req, function(result) {
            //callback is ultimately to return Messenger appropriate responses formatted correctly
            var result;
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
  eType = "";
  cardsSend = [];
  console.log("req: " + req);
  cityName = req.query.location;
  if(req.query.serq){
    eType = req.query.serq;
  }
  console.log("cityName: "+cityName);
  console.log("eType: "+eType);
  console.log("altPrevType: "+altPrevType);
  EventbriteCall(callback);
}

function EventbriteCall(callback) {
  var params = {};
  params["q"] = eType != undefined ? eType : altPrevType;
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
              var obj = {
                title: "",
                image_url: "",
                subtitle: "",
                buttons: [{
                  type: "web_url",
                  url: "",
                  title: "View Event"
                }]
              };
              obj.title = events[i].name;
              obj.image_url = events[i].thumbnail;
              obj.subtitle = moment(events[i].start).format("MMMM Do YYYY");
              obj.buttons[0].url = events[i].url;
              cardsSend[i] = obj;
            }
          }
        }
        callback();
      }
  });
}

restService.listen((process.env.PORT || 8000), function () {
  console.log("Server listening");
});
