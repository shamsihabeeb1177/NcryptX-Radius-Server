var radius = require('radius');
var dgram = require("dgram");
const axios = require('axios');
var https = require("https");
const con = require('./settings');


creds =[];

function runapi(){

const URL = url;
console.log(url + "::::"+ pass)
const instance = axios.create({
    httpsAgent: new https.Agent({  
      rejectUnauthorized: false
    })
  });
instance.get(URL)
  .then(response => {
   
    for ( var i=0;i<response.data.length;i++){
        user = response.data[i]["clientName"];
        pass = response.data[i]["secret"]
        creds.push({user,pass });
    }

   
  })
  .catch(error => {
    console.log(error);
  });
}

  function RadiusServer(settings) {
    
    runapi();
    console.log(creds[0]);
    this.config = settings || {};
    this.port = this.config.port || 1645;
    this.secret = this.config.secret  ;
    this.server = null;
    this.radiusUser = null;
    this.ACCESS_REQUEST = 'Access-Request';
    this.ACCESS_DENIED = 'Access-Reject';
    this.ACCESS_ACCEPT = 'Access-Accept';
   
    
};

RadiusServer.prototype.start = function () {
    var self = this;
     runapi();
    // create the UDP server
    self.server = dgram.createSocket("udp4");
     
    self.server.on('message', function (msg, rinfo) {
        if (msg && rinfo) {
 
            // decode the radius packet
            var packet;
            try {
                packet = radius.decode({ packet: msg, secret: self.secret });
            }
            catch (err) {
                console.log('Unable to decode packet.');
                return;
            }
   
            // if we have an access request, then
            if (packet && packet.code == self.ACCESS_REQUEST) {
                 
                // get user/password from attributes
                var username = packet.attributes['User-Name'];
                var password = packet.attributes['User-Password'];
 
                // verify credentials, make calls to 3rd party services, then set RADIUS response
                var responseCode = self.ACCESS_DENIED;
                for ( var i=0;i<creds.length;i++){
                    if( creds[i]["user"] != null &&  creds[i]["pass"] != null){
                        if (username == creds[i]["user"] && password == creds[i]["pass"]) {
                            responseCode = self.ACCESS_ACCEPT;
                        }
                    }
                    
                }
                 
                console.log('Access-Request for "' + username + '" (' + responseCode + ').');
                 
                // build the radius response
                var response = radius.encode_response({
                    packet: packet,
                    code: responseCode,
                    secret: self.secret
                });
 
                // send the radius response
                self.server.send(response, 0, response.length, rinfo.port, rinfo.address, function (err, bytes) {
                    if (err) {
                        console.log('Error sending response to ', rinfo);
                        console.log(err);
                    }
                });
            }
        }
    });
     
    self.server.on('listening', function () {
        var address = self.server.address();
        console.log('Radius server listening on port ' + address.port);
    });
     
    self.server.bind(self.port);
};



var rServer = new RadiusServer({ port: 1812, secret: pass, radiusUser: "test" });
rServer.start();