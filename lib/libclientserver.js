var net = require("net");
var events = require("events");

var exports = module.exports = {};

exports.Client = function (path)
{
	this.ID = 0;
	this.path = path;
	this.Sock = undefined;
	this.IsConn = false;
	this.RequestMap = {};
	this.ReadBuffer = "";
	var self = this;

	this.Connect = function(cb) {
		if (this.IsConn == true) {
			cb();
			return;
		}
		var self = this;
		if (path.startsWith("unix:")) {
			this.Sock = new net.Socket();
			this.BindEvents(this.Sock);
			var npath = path.substring(5);
			this.Sock.connect( { "path" : npath}, function(Sock) { if (cb != undefined) { cb(); } });
		} else if (path.startsWith("tcp:")) {
			this.Sock = new net.Socket();
			this.BindEvents(this.Sock);
			var npath = path.substring(4);
			var host = npath.substring(0, npath.indexOf(':')); //HOST:port
			var port = npath.substring(npath.indexOf(':') + 1); //host:PORT
			this.Sock.connect( { "host" : host, "port" : port }, function(Sock) { if (cb != undefined) { cb(); } });
		} else {
			throw("Unknown Protocol");
		}
	};

	this.Disconnect = function() {
		if (this.IsConn == false) {
			this.Sock.Disconnect();
			return;
		}
	};

	this.IsConnected = function() {
		return this.IsConn;
	};

	this.SendRequest = function(args, callback, errback) {
		var self = this;
		if (this.IsConn == false)
		{
			//console.log("SendRequest::Not Connected");
			//Send Error now
			//console.log("Not Connected");
			return;
		}

		this.ID++;
		var ID = self.ID;
		args["_ID"] = ID;
		var str = "REQUEST " + JSON.stringify(args) + "\n";
		self.RequestMap[ID] = { "callback" : callback, "errback" : errback };
		setTimeout(function() {
			if (self.RequestMap[ID] != undefined)
			{
				//console.log("Timeout for Call " + ID);
				var data = "Timeout";
				self.RequestMap[ID]["errback"](data);
				delete self.RequestMap[ID];
				//console.log(self.RequestMap);
			}
		}, 10000);
		self.Sock.write(str);
	};

	this.SendCommand = function(args) {
		if (this.IsConn == false) {
			//console.log("SendCommand::Not Connected");
			return;
		}

		var str = "COMMAND " + JSON.stringify(args) + "\n";
		this.Sock.write(str);
	};

	this.BindEvents = function(args) {
		this.Sock.on('connect', function(e) {
			//console.log("OnConnect");
			self.IsConn = true;
		});
	  
		this.Sock.on('error', function(e) {
			//console.log("Error: " + e);
			self.IsConn = false;
			if (this.Sock != undefined) {
				this.Sock.destroy();
			}
			//FIXME: Fail all current requests
		});
	
		this.Sock.on('data', function(data) {
			try
			{
				self.ReadBuffer += data.toString();
				
				//Process incoming data
				var newline = self.ReadBuffer.indexOf('\n');
				while(newline > 0)
				{
					var line = self.ReadBuffer.substring(0, newline);
					self.ReadBuffer = self.ReadBuffer.substring(newline + 1);
					if (line.substring(0, 9) === "RESPONSE ")
					{
						var args = JSON.parse(line.substring(9));
						if (args["_ID"] != undefined)
						{
							var ID = args["_ID"];
							var error = undefined;
							
							if (args["_ERROR"] != undefined)
							{
								if (args["_ERROR"] != "Success")
								{
									error = args["_ERROR"];
								}
							}
							
							if (args["_EXCEPTION"] != undefined)
							{
								error = args["_EXCEPTION"];
							}
							
							if (self.RequestMap[ID] != undefined)
							{
								delete args["_ERROR"];
								delete args["_ERRNO"];
								delete args["_ID"];
								delete args["_EXCEPTION"];
								var tmp = self.RequestMap[ID];
								delete self.RequestMap[ID];
								if (error == undefined) {
									tmp["callback"](args);
								} else {
									tmp["errback"](error);
								}
							}
							else
							{
								//console.log("Missing _ID in repsonse" + str);
							}
						}
						else
						{
							//console.log("Missing callback");
						}
					}
					else if (line.substring(0, 6) === "EVENT ")
					{
						var args = JSON.parse(line.substring(6));
						//FIXME: Raise event
					}
					else
					{
						//console.log("Unknown Response: " + line);
						//console.log('"' + line.substring(0, 9) + '"');
					}
					
					newline = self.ReadBuffer.indexOf('\n');
				}
			}
			catch(err)
			{
				//console.log("Failed to Parse: ", "" + data, " Err: ", err);
				//console.log("Error: " + err);
			}
		});
	
		this.Sock.on('close', function(Sock) {
			//console.log("Closed .. Reconnecting");
			self.IsConn = false;
			if (this.Sock != undefined)
			{
				this.Sock.destroy();
			}
			setTimeout(function() {
				self.Connect();
			}, 1000);
		});	
	};

};

