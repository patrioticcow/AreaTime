'use strict';

// initialize some stuff
var geocodeUrl = 'http://maps.googleapis.com/maps/api/geocode/json?address=';
var timezoneUrl = 'https://maps.googleapis.com/maps/api/timezone/json?location=';
var timestamp = Math.round(new Date().getTime() / 1000);

window.addEventListener('load', function (evt) {
    var existent = document.getElementById('existent');

    document.getElementById('form').addEventListener('submit', sendForm);

    // get existing times fom localstorage
    chrome.storage.local.get(null, function (items) {
        for (var k in items) {
            var item = items[k];

            if (!isNaN(parseInt(k))) {
                var timezone = httpGet(item.lat + ',' + item.lng + '&timestamp=' + timestamp, timezoneUrl);
                timezone = JSON.parse(timezone);

                var time = calcTime(timezone.rawOffset);

                existent.innerHTML += '<tr><td><a href="#" id="existent_link" data-key="' + k + '"><span class="glyphicon glyphicon-remove-circle"></span></a></td><td>' + time + '</td><td>' + item.address + '</td></tr>';
            }
        }
    });

    // get latest searched term
    chrome.storage.local.get('term', function (items) {
        document.getElementById('from').value = items.term !== undefined ? items.term : 'Enter a city, state or zip code';
    });

    // add the results to localstorage
    live('click', 'link', function () {
        var dataTime = this.getAttribute("data-time");
        var dataAddress = this.getAttribute("data-address");
        var dataLat = this.getAttribute("data-lat");
        var dataLng = this.getAttribute("data-lng");
        var dataKey = this.getAttribute("data-key");

        var random = Math.floor(Math.random() * 90000) + 10000;
        var obj = {};
        obj[random] = {'lng': dataLng, 'lat': dataLat, 'time': dataTime, 'address': dataAddress};
        chrome.storage.local.set(obj, function () {
            console.log('Settings saved');
        });
        existent.innerHTML += '<tr><td><a href="#" id="existent_link" data-key="' + random + '"><span class="glyphicon glyphicon-remove-circle"></span></a></td><td>' + dataTime + '</td><td>' + dataAddress + '</td></tr>';
    });

    // remove saved times from localhost
    live('click', 'existent_link', function () {
        var key = this.getAttribute("data-key");

        chrome.storage.local.remove(key.toString(), function (items) {
            chrome.storage.local.get(null, function (items) {
                console.log(items);
            });
            console.log('removed');
        });
        this.parentElement.parentElement.remove()
    });
});

function sendForm() {
    event.preventDefault();

    var container = document.getElementById("container");
    var from = document.getElementById("from");

    var response = httpGet(from.value, geocodeUrl);
    var resp = JSON.parse(response);

    chrome.storage.local.set({'term': from.value}, function () {
        console.log('Settings saved');
    });

    var string = '<tr><td colspan="2"><h3>No results. Try another search</h3></td></tr>';
    if (resp.results.length) {
        string = '<tr><td colspan="2"><span class="alert alert-info" style="padding: 2px;">Select one or more results to save them</span></td></tr>';
        resp.results.forEach(function (value, key) {
            var lat = value.geometry.location.lat;
            var lng = value.geometry.location.lng;
            var timezone = httpGet(lat + ',' + lng + '&timestamp=' + timestamp, timezoneUrl);
            timezone = JSON.parse(timezone);

            var time = calcTime(timezone.rawOffset);
            var zone = (timezone.rawOffset + timezone.dstOffset) / 3600; // no used, maybe in the feature

            string += '<tr><td>' + time + '</td><td><a href="#" id="link" data-key="' + key + '" data-lng="' + lng + '" data-lat="' + lat + '" data-time="' + time + '" data-address="' + value.formatted_address + '">' + value.formatted_address + '</a></td></tr>';
        });
    }

    container.innerHTML = string;
}

function calcTime(offset) {
    var d = new Date();
    var utc = d.getTime() + (d.getTimezoneOffset() * 60000);
    var nd = new Date(utc + (1000 * offset));

    return nd.toLocaleString();
}

function live(eventType, elementId, cb) {
    document.addEventListener(eventType, function (event) {
        var el = event.target
            , found;

        while (el && !(found = el.id === elementId)) {
            el = el.parentElement;
        }

        if (found) {
            cb.call(el, event);
        }
    });
}

function httpGet(params, url) {

    url = url + params + '&sensor=false';
    var xmlHttp = null;

    xmlHttp = new XMLHttpRequest();
    xmlHttp.open("GET", url, false);
    xmlHttp.send(null);
    return xmlHttp.responseText;
}

function isEmpty(obj) {
    if (obj == null) return true;
    if (obj.length > 0)    return false;
    if (obj.length === 0)  return true;

    for (var key in obj) {
        if (hasOwnProperty.call(obj, key)) return false;
    }

    return true;
}