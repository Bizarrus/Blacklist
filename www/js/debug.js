if(typeof(ClientType) == 'undefined') {
	var ClientType = function (name){
		this.name = name;
	};

	ClientType.prototype.toString = function (){
		return this.name;
	};

	ClientType.prototype.toJSON = function (){
		return this.name;
	};

	ClientType.Applet = new ClientType('Applet');
	ClientType.Browser = new ClientType('Browser');
	ClientType.Android = new ClientType('Android');
	ClientType.IOS = new ClientType('IOS');
	ClientType.Offline = new ClientType('Offline');
}

if(typeof(Loader) == 'undefined') {
	var Loader = (new function() {
		this.getBridge = function getBridge() {
			return {
				getAppId: function() { return '0'; },
				getType: function() { return ClientType.Offline; },
				getVersion: function() { return '0.0'; },
				getPageData: function() { return {}; },
				isSystemApp: function() { return false; },
				getAppViewMode: function() { return 'Popup'; },
				getSessionId: function() { return '-'; },
				getCacheId: function() { return '-'; },
				isTrustedEvent: function() { return true; },
				sendChatServerEvent: function() {},
			};
		};
	});
}

if(typeof(Client) == 'undefined') {
	var Client = (function() {
		var includeCSS = function (srcs) {
			for (var i = 0, n = arguments.length; i < n; ++i) {
				document.write('<link rel="stylesheet" href="' + arguments[i] + '">');
			}
		};

		var includeJS = function (srcs) {
			for (var i = 0, n = arguments.length; i < n; ++i) {
				document.write('<script src="' + arguments[i] + '"></script>');
			}
		};
		
		var getClientType = function () {
			return ClientType.Browser;
		};
		
		var getHostFrame = function() {
			return {
				setIcon: function() {},
				setTitle: function() {}
			};
		};

		var sendEvent = function(key, data) {
			Server.onEventReceived(null, key, data);
			console.log(key + ': ' + JSON.stringify(data));
		};
		
		var getAppId  = function() {
			return '1235';
		};
		
		return {
			getAppId: getAppId,
			sendEvent: sendEvent,
			includeCSS: includeCSS,
			includeJS: includeJS,
			getClientType: getClientType,
			getHostFrame: getHostFrame,
			onSendEventReceived: function() {},
			pageData: {
				window: {
					title: 'Debug',
					icon: ''
				}
			}
		};
	})();
}