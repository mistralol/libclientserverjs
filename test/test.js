
var libclientserver = require("../lib/libclientserver.js");

var Cli = new libclientserver.Client("/tmp/SimpleServer");

function Test2(data)
{
	if (data["_ID"] == undefined)
	{
		console.log("Sending First Request");
	}
	else
	{
		console.log("Request " + data["_ID"] + " Complete Sending Another Request");
	}
	var args = { "Test" : "Yes" };
	args["action"] = "PING";
	Cli.SendRequest(args, Test2);
}

function Test()
{
	console.log("Sending Command");
	var args = { "Test" : "Yes" };
	args["action"] = "PING";
	//Cli.SendCommand(args);
	Cli.SendRequest(args, function(data) {
		console.log("Request Complete:" + JSON.stringify(data));
	});
	setTimeout(Test, 500);
}

function Run()
{
	console.log("Run");
	console.log("Connected: " + Cli.IsConnected());
	//console.log(Cli);
	if (Cli.IsConnected() == true)
	{
		console.log("Really Connected");
//		Test();
		Test2({});
	}
	else
	{
		setTimeout(Run, 1000);
	}
}

Cli.Connect(function() {
	Run();
});

console.log("Started!");
