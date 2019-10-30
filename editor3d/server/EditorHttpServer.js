
var http = require('http');
var HttpDispatcher = require('httpdispatcher');
var fs = require('fs');
var path = require('path');
var dispatcher = new HttpDispatcher();
//Lets define a port we want to listen to
const PORT = 8888;

var resourceRoot = "../res/config/";

//Lets use our dispatcher
function handleRequest(request, response){
    try {
        //log the request on console
        console.log(request.url);

        response.setHeader("Access-Control-Allow-Origin", "*");
        response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
        response.setHeader("Access-Control-Allow-Headers", "Content-Type");

        //Disptach
        dispatcher.dispatch(request, response);
    } catch(err) {
        console.log(err);
    }
}

function saveJsonFile(jsonString, filePath, res){
    fs.open(filePath, 'w', function(err, fd) {
        if (err) {
            return console.error(err);
        }
        fs.write(fd, jsonString, 0, 'utf8', function(e){
            if(e) throw e;
            fs.closeSync(fd);
            if (typeof res != "undefined") {
                writeJson(res, jsonString);
            }
        })
    });
}

function writeJson(response, content) {
    response.writeHead(200, {
        "content-type": "application/json"
    });
    response.write(content);
    response.end();
}

//Create a server
var server = http.createServer(handleRequest);

//Lets start our server
server.listen(PORT, function(){
    console.log("Server listening on: http://localhost:%s", PORT);
});

dispatcher.onPost("/save_level_configs", function(req, res) {
    console.log("save level configs data");
    saveJsonFile(req.body, resourceRoot + "LevelConfigs.json");
    write(res, "save level configs succeed!");
});

function write(response, content) {
    response.writeHead(200, {
        "content-type": "text/html"
    });
    response.write(content);
    response.end();
}
