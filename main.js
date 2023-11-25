var _db_state				= '_blacklist_state';
var _db_time					= '_blacklist_time';
var _db_comments			= '_blacklist_comments';
var _db_comment_string	= '_blacklist_comment_string_';
var _db_comment_time	= '_blacklist_comment_time_';
var _db_comment_user	= '_blacklist_comment_user_';
var _db_comment_days	= '_blacklist_comment_days_';
var _db_reason				= '_blacklist_reason_';
var _statistics_domain	= 'stats.user-app.de';
var _debug					= false;
var _user_access			= KnuddelsServer.getUserAccess();
var _server_access			= KnuddelsServer.getExternalServerAccess();
var _server_persistence	= KnuddelsServer.getPersistence();
var _page						= {};
var _page_entries			= 12;
var _ping						= {};
var _settings					= {
	view:		{
		cm:	true,
		am:	true
	},
	lock:		{
		cm:	true,
		am:	true,
		rank:	'all',
		time:	'all'
	},
	unlock:	{
		cm:	true,
		am:	true,
		type:	'user'
	},
	comments: {
		cm:	true,
		am:	true
	}
};

require('functions.js');

var App = (new function AppContainer() {	
	this.onAppStart = function onAppStart() {
		_settings = _server_persistence.getObject('_settings', _settings);
		
		if(KnuddelsServer.getChannel().getChannelName() == '/ChannelApp') {
			_debug = true;
		}
		
		// send statistics
		if(_server_access.canAccessURL('http://' + _statistics_domain + '/')) {
			_server_access.postURL('http://' + _statistics_domain + '/', {
				data: {
					version:		KnuddelsServer.getAppAccess().getOwnInstance().getAppInfo().getAppVersion(),
					bot:			KnuddelsServer.getDefaultBotUser().getNick(),
					owners:		getOwners()
				},
				onSuccess: function(data, response) {
					/* Do Nothing */
				},
				onFailure: function(data, response) {
					/* Do Nothing */
				}
			});
		}
		
		setInterval(function checkUnlock() {
			// check autounlocks
			UserPersistenceNumbers.each(_db_state, function(user, value, index, totalCount, key) {
				var time			= new Date(new Date().getTime() + 1 * 24 * 60 * 60 * 1000);
				var persistence	= user.getPersistence();
				var lock_until		= persistence.getString(_db_time, '-');
				
				if(lock_until == '-' || time.getFullYear() + '-' + (time.getMonth() + 1) + '-' + time.getDate() == lock_until) {
					persistence.addNumber(_db_comments, 1);
					var comments = persistence.getNumber(_db_comments, 1);
					persistence.setString(_db_comment_string + comments, 'Automatisch "_entsperrt!_"');
					persistence.setString(_db_comment_time + comments, time);
					persistence.setString(_db_comment_user + comments, KnuddelsServer.getDefaultBotUser().getNick());
					
					persistence.setNumber(_db_state, 0);
					persistence.setString(_db_time, '-');
				}
				return true;
			}, {
				ascending:			false,
				minimumValue:	1
			});
			
			// update statistics
			if(_server_access.canAccessURL('http://' + _statistics_domain + '/')) {
				_server_access.postURL('http://' + _statistics_domain + '/', {
					data: {
						version:		KnuddelsServer.getAppAccess().getOwnInstance().getAppInfo().getAppVersion(),
						bot:			KnuddelsServer.getDefaultBotUser().getNick(),
						owners:		getOwners(),
						uptime:		'true'
					},
					onSuccess: function(data, response) {
						/* Do Nothing */
					},
					onFailure: function(data, response) {
						/* Do Nothing */
					}
				});
			}
		}, 60000);
		
		setInterval(function checkOnlineUsers() {
			KnuddelsServer.getChannel().getOnlineUsers(UserType.Human).forEach(function(user) {
				var persistence		= user.getPersistence();
				var comments		= persistence.getNumber(_db_comments, 1);
				var reason				= persistence.getString(_db_reason + comments, '');
				
				if(persistence.getNumber(_db_state, 0) == 1) {
					KnuddelsServer.getChannel().getChannelConfiguration().getChannelRights().getChannelModerators().forEach(function(cm) {
						if(cm.isOnlineInChannel()) {
							cm.sendPrivateMessage('_°BB>_h' + user.getNick().escapeKCode() + '|/blacklist "<r°_ befindet sich im Channel, obwohl dieser auf der _Blackliste_ steht. °##10>CENTER<°°>{button}Nutzer kicken!||call|/cl ' + user.getNick().escapeKCode() + ':' + reason.escapeKCode() + '|color|clearWhite|height|18<° °>{button}UserInfo einsehen||call|/blacklist ' + user.getNick().escapeKCode() + '|color|clearWhite|height|18<°°#r>LEFT<°');
						}
					});
				}
			});
		}, 5000);
	};
	
	this.mayJoinChannel = function mayJoinChannel(user) {
		var persistence		= user.getPersistence();
		
		// Migrate data
		var access_default				= {
			comments:		[]
		};
		access_default[_db_state]	= 0;
		access_default[_db_time]		= '-';
		var access_data					= _server_persistence.getObject('_blacklist_access_' + user.getUserId(), access_default);
		
		if(access_data[_db_state] == 1) {
			for(var index in access_data.comments) {
				var comment		= access_data.comments[index];
				
				persistence.addNumber(_db_comments, 1);
				var comments	= persistence.getNumber(_db_comments, 1);
				
				persistence.setString(_db_comment_string + comments, comment.text);
				persistence.setString(_db_comment_time + comments, comment.time);
				persistence.setString(_db_comment_user + comments, comment.user);
				persistence.setString(_db_reason + comments, comment.reason);
			}
			
			persistence.setNumber(_db_state, 1);
			persistence.setString(_db_time, access_data[_db_time]);
			
			_server_persistence.deleteObject('_blacklist_access_' + user.getUserId());
		}
		
		var access_id		= _server_persistence.getObject('_blacklist_access', []);
		access_id.splice(access_id.indexOf(user.getUserId()), 1);
		_server_persistence.setObject('_blacklist_access', access_id);
						
		if(persistence.getNumber(_db_state, 0) == 1) {
			var comments	= persistence.getNumber(_db_comments, 1);
			var time			= persistence.getString(_db_time, '-');
			var locker			= persistence.getString(_db_comment_user + comments, '???');
			var reason			= persistence.getString(_db_reason + comments, '');
			var text				= 'Dein Nick ' + user.getNick() + ' wurde ';
			
			if(time == '!') {
				text += '_permanent aus dem Channel gesperrt_.';
			} else {
				time = createDate(time);
				text += '_bis zum ' + zeroize(time.getDate()) + '.' + zeroize(time.getMonth()) + '.' + zeroize(time.getFullYear()) + ' aus dem Channel gesperrt_.';
			}
			
			text += '°##°_Begründung:_°#°' + reason;
			text += '°##°Bei Rückfragen zu dieser Channelsperre bitte an den Nutzer _°BB>_h' + locker + '|/m "<r°_ als Ansprechpartner per /m im Chat wenden.';
			
			return ChannelJoinPermission.denied(text);
		}
		
		return ChannelJoinPermission.accepted();
	};
	
	this.onEventReceived = function onEventReceived(user, name, data) {
		switch(name) {
			case 'exception':
				if(_debug) {
					KnuddelsServer.getDefaultLogger().info(JSON.stringify(data, 1, 0));
				}
			break;
			case 'init':
				_page[user.getUserId()] = 1; 
			break;
			case 'page':
				if(typeof(_page[user.getUserId()]) == 'undefined') {
					_page[user.getUserId()] = 1;
				}
				
				if(data == 'previous') {
					--_page[user.getUserId()];
					
					if(_page[user.getUserId()] <= 1) {
						_page[user.getUserId()] = 1;
					}
				} else if(data == 'next') {
					++_page[user.getUserId()];
					
					if(_page[user.getUserId()] >= UserPersistenceNumbers.getCount(_db_state) / _page_entries) {
						_page[user.getUserId()] = UserPersistenceNumbers.getCount(_db_state) / _page_entries;
					}
				} else {
					_page[user.getUserId()] = parseInt(data, 10);
				}
				
				App.onEventReceived(user, 'command', 'refresh');
			break;
			case 'command':
				switch(data) {
					case 'refresh':
						send(user, 'entries', getEntries(user));
						send(user, 'page', _page[user.getUserId()]);
					break;
					case 'settings':
						if(!user.isChannelOwner()) {
							user.sendPrivateMessage('Dir fehlen die notwendigen Rechte um diese Aktion auszuführen!');
							send(user, 'message', {
								type:			'error',
								modal:		'hide',
								message:	'Dir fehlen die notwendigen Rechte um diese Aktion auszuführen!'
							});
							return;
						}
						
						send(user, 'settings', _settings);
					break;
					default:
						if(data.substring(0, 10) == 'blacklist:') {
							data = data.substring(10, data.length);
							App.chatCommands.Blacklist(user, data);
						}
					break;
				}
			break;
			case 'savesettings':
				if(typeof(data.view) != 'undefined') {
					if(typeof(data.view.cm) == 'boolean') {
						_settings.view.cm = data.view.cm;
					}
					
					if(typeof(data.view.am) == 'boolean') {
						_settings.view.am = data.view.am;
					}
				}
				
				if(typeof(data.lock) != 'undefined') {
					if(typeof(data.lock.cm) == 'boolean') {
						_settings.lock.cm = data.lock.cm;
					}
					
					if(typeof(data.lock.am) == 'boolean') {
						_settings.lock.am = data.lock.am;
					}
					
					if(typeof(data.lock.rank) == 'string' && [ 'co', 'all', 'none' ].indexOf(data.lock.rank) > -1) {
						_settings.lock.rank = data.lock.rank;
					}
					
					if(typeof(data.lock.time) == 'string' && [ 'co', 'all' ].indexOf(data.lock.time) > -1) {
						_settings.lock.time = data.lock.time;
					}
				}
				
				if(typeof(data.unlock) != 'undefined') {
					if(typeof(data.unlock.cm) == 'boolean') {
						_settings.unlock.cm = data.unlock.cm;
					}
					
					if(typeof(data.unlock.am) == 'boolean') {
						_settings.unlock.am = data.unlock.am;
					}
					
					if(typeof(data.unlock.type) == 'string' && [ 'co', 'user', 'all' ].indexOf(data.unlock.type) > -1) {
						_settings.unlock.type = data.unlock.type;
					}
				}
				
				if(typeof(data.comments) != 'undefined') {
					if(typeof(data.comments.cm) == 'boolean') {
						_settings.comments.cm = data.comments.cm;
					}
					
					if(typeof(data.comments.am) == 'boolean') {
						_settings.comments.am = data.comments.am;
					}
				}
				
				_server_persistence.setObject('_settings', _settings);
				user.sendPrivateMessage('Die Einstellungen wurden _erfolgreich gespeichert_.');
				send(user, 'message', {
					type:			'success',
					modal:		'hide',
					message:	'Die Einstellungen wurden _erfolgreich gespeichert_.'
				});
			break;
			case 'blacklist':
				App.chatCommands.Blacklist(user, data);
			break;
		}
	};
	
	this.chatCommands = {
		Blacklist: function Blacklist(user, arguments) {
			var action			= '';
			var time			= new Date();
			
			// permissions to execute
			if(!user.isAppDeveloper() && !user.isAppManager() && !user.isChannelModerator()) {
				user.sendPrivateMessage('Dir fehlen die notwendigen Rechte um diese Aktion auszuführen!');
				send(user, 'message', {
					type:			'error',
					modal:		'hide',
					message:	'Dir fehlen die notwendigen Rechte um diese Aktion auszuführen!'
				});
				return;
			}
			
			// List all available entries
			if(arguments.length == 0) {
				if(!openWindow(user)) {
					var users = [];
					
					UserPersistenceNumbers.each(_db_state, function(entry, value, index, totalCount, key) {
						users.push(entry);
					}, {
						ascending:			false,
						minimumValue:	1,
						onEnd:				function onEnd() {
							if(users.length == 0) {
								user.sendPrivateMessage('Momentan steht niemand auf der Blackliste.');
								return;
							}
							
							var text = '';
							
							users.forEach(function(entry, index) {
								var time		= entry.getPersistence().getString(_db_time, '-');
								var lock_time = createDate(time);
								
								text += '°>' + entry.getNick().escapeKCode() + '|/blacklist "<° (' + (time == '!' ? '_°R°Permanent°r°_' : zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()) + '.' + zeroize(lock_time.getFullYear())) + ')';
								
								if(users.length - 1 > index) {
									text += ', ';
								}
							});
							
							var access_id = _server_persistence.getObject('_blacklist_access', []);
							if(access_id.length > 0) {
								access_id.forEach(function(id, index) {
									if(text != '') {
										text += ', ';
									}
									
									var access_default			= {};
									access_default[_db_time]	= '-';
									var access_data				= _server_persistence.getObject('_blacklist_access_' + id, access_default);
									var time						= access_data[_db_time];
									var lock_time 				= createDate(time);
								
									text += '°>' + _user_access.getNick(id).escapeKCode() + '|/blacklist "<° (' + (time == '!' ? '_°R°Permanent°r°_' : zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()) + '.' + zeroize(lock_time.getFullYear())) + ')';
								});
							}
							
							user.sendPrivateMessage('Derzeit stehen folgende Nutzer auf der Blackliste:°#°' + text);
						}
					});
				}
				return;
			}
			
			// check if nickname forcing to unlock
			if(arguments.substring(0, 1) == '!') {
				action			= 'unlock';
				arguments		= arguments.substring(1, arguments.length);
			} else if(arguments.substring(0, 1) == '+') {
				action			= 'comment';
				arguments		= arguments.substring(1, arguments.length);
			}
			
			// check if command has arguments
			if(arguments.contains(':')) {
				var index	= -1;
				
				// split arguments for nickname, comment, reason and days
				arguments	= arguments.replace(/\\?:/g, function(character, index) {
					return character == '\:' ? '\u000B' : ':';
				}).split('\u000B');
				
				nickname	= arguments[++index] || undefined;
				comment	= arguments[++index] || undefined;
				reason		= arguments[++index] || undefined;
				days			= arguments[++index] || 3;
				
				// check if arguments are valid
				if(((action == 'unlock' || action == 'comment') && (typeof(nickname) == 'undefined' || typeof(comment) == 'undefined')) || ((action != 'unlock' && action != 'comment') && (typeof(nickname) == 'undefined' || typeof(comment) == 'undefined' || typeof(reason) == 'undefined'))) {
					user.sendPrivateMessage('Bitte die Funktion folgendermaßen benutzen:°#°/blacklist oder +NICK:COMMENT, !NICK:COMMENT oder NICK:COMMENT:INFO:TAGE°#°(Zeigt eine Liste aller gesperrten Nicks. !NICK:COMMENT entsperrt NICK wieder und setzt COMMENT als Kommentar bei NICK. +NICK:COMMENT setzt manuell ein COMMENT. Letzteres sperrt NICK TAGE Tage für den Channel. Ist keine Angabe bei TAG gemacht worden, wird NICK automatisch für 3 Tage gesperrt. ! als TAG sperrt NICK permanent.)');
					send(user, 'message', {
						type:			'error',
						modal:		'add',
						message:	'Bitte fülle alle notwendigen Felder aus um jemanden zu sperren!'
					});
					return;
				}
				
				// check if comment has valid length
				if(comment.length < 8 || comment.length > 115) {
					user.sendPrivateMessage('Das Comment muss mindestens 8 und darf maximal 115 Zeichen lang sein.');
					send(user, 'message', {
						type:			'error',
						modal:		'add',
						message:	'Das Comment muss mindestens 8 und darf maximal 115 Zeichen lang sein.'
					});
					return;
				}
				
				// check if nickname exists
				if(_user_access.exists(nickname)) {
					var id = _user_access.getUserId(nickname);

					if(_user_access.mayAccess(id)) {
						var target = _user_access.getUserById(id);
						
						switch(action) {
							case 'unlock':
								// check if nickname is currently locked
								if(target.getPersistence().getNumber(_db_state, 0) == 0) {
									user.sendPrivateMessage('°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° ist _bereits entsperrt_.');
									send(user, 'message', {
										type:			'error',
										modal:		'hide',
										message:	'°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° ist _bereits entsperrt_.'
									});
									return;
								}
								
								user.sendPrivateMessage('°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° wurde _entsperrt_.');
								
								send(user, 'message', {
									type:			'success',
									modal:		'hide',
									message:	'°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° wurde _entsperrt_.'
								});
								
								var persistence = target.getPersistence();
								persistence.addNumber(_db_comments, 1);
								var comments = persistence.getNumber(_db_comments, 1);
								persistence.setString(_db_comment_string + comments, '"_Entsperrt!_" ' + comment);
								persistence.setString(_db_comment_time + comments, time);
								persistence.setString(_db_comment_user + comments, user.getNick());
								
								persistence.setNumber(_db_state, 0);
								persistence.setString(_db_time, '-');
								
								App.onEventReceived(user, 'command', 'refresh');
								return;
							break;
							case 'comment':
								user.sendPrivateMessage('Das Kommentar wurde bei °>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° _hinzugefügt_.');
								send(user, 'message', {
									type:			'success',
									modal:		'hide',
									message:	'Das Kommentar wurde bei °>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° _hinzugefügt_.'
								});
								
								var persistence = target.getPersistence();
								persistence.addNumber(_db_comments, 1);
								var comments = persistence.getNumber(_db_comments, 1);
								persistence.setString(_db_comment_string + comments, comment);
								persistence.setString(_db_comment_time + comments, time);
								persistence.setString(_db_comment_user + comments, user.getNick());
								App.onEventReceived(user, 'command', 'refresh');
								return;
							break;
						}
						
						// check if nickname is currently locked
						if(target.getPersistence().getNumber(_db_state, 0) == 1) {
							user.sendPrivateMessage('°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° ist _bereits gesperrt_.');
							send(user, 'message', {
								type:			'error',
								message:	'°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° ist _bereits gesperrt_.'
							});
							return;
						}
						
						// check if reason are valid
						if(reason.length < 20 || reason.length > 2000) {
							user.sendPrivateMessage('Die Info muss mindestens 20 und darf maximal 2000 Zeichen lang sein.');
							send(user, 'message', {
								type:			'error',
								modal:		'add',
								message:	'Die Info muss mindestens 20 und darf maximal 2000 Zeichen lang sein.'
							});
							return;
						}
						
						// check if days are valid
						if(days != '!' && !(!isNaN(days) && parseInt(Number(days)) == days && !isNaN(parseInt(days, 10)))) {
							user.sendPrivateMessage('Du musst eine Zahl angeben.');
							send(user, 'message', {
								type:			'error',
								modal:		'add',
								message:	'Die Sperrtage dürfen nur die Anzahl der Tage oder ein Ausrufezeichen für eine permanente Sperre enthalten!'
							});
							return;
						}
						
						if(days < 1) {
							user.sendPrivateMessage('Du musst eine Zahl >= 1 angeben.');
							send(user, 'message', {
								type:			'error',
								modal:		'add',
								message:	'Die Sperrtage müssen mehr als einen Tag betragen!'
							});
						}
						
						// create autocomment
						var comment_text	= '';
						var persistence		= target.getPersistence();
						persistence.addNumber(_db_comments, 1);
						var comments		= persistence.getNumber(_db_comments, 1);
						var lock_time			= new Date(time.getTime() + parseInt(days, 10) * 24 * 60 * 60 * 1000);
						
						if(days == '!') {
							comment_text	= '°R°"Permanent"°r° gesperrt!';
						} else {
							comment_text	= '"_Bis ' + zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()  + 1) + '.' + zeroize(lock_time.getFullYear()) + ' (_°R°' + days + ' Tag' + (days == 1 ? '' : 'e') + '°r°_)_" gesperrt!';							
						}
						
						persistence.setString(_db_comment_string + comments, comment_text + '°#°' + comment);
						persistence.setString(_db_comment_time + comments, time);
						persistence.setString(_db_comment_user + comments, user.getNick());
						persistence.setString(_db_reason + comments, reason);
						
						persistence.setNumber(_db_state, 1);
						persistence.setString(_db_time, days == '!' ? days : zeroize(lock_time.getFullYear()) + '-' + zeroize(lock_time.getMonth() + 1) + '-' + zeroize(lock_time.getDate()));
						user.sendPrivateMessage('°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° wurde _gesperrt_.');
						send(user, 'message', {
							type:			'success',
							modal:		'hide',
							message:	'°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<° wurde _gesperrt_.'
						});
						
						setTimeout(function() {
							App.onEventReceived(user, 'command', 'refresh');
						}, 1000);
						return;
					}
					
					switch(action) {
						case 'unlock':
							user.sendPrivateMessage('Entsperrungen für Nutzer die den Channel noch nie betreten haben sind derzeit nicht Möglich.');
							return;
						break;
						case 'comment':
							user.sendPrivateMessage('Comments für Nutzer die den Channel noch nie betreten haben sind derzeit nicht Möglich.');
							return;
						break;
					}
					
					var access_default				= {
						comments:		[]
					};
					access_default[_db_state]	= 0;
					access_default[_db_time]		= '-';
					var access_object				= _server_persistence.getObject('_blacklist_access_' + id, access_default);
					
					// check if nickname is currently locked
					if(access_object[_db_state] == 1) {
						user.sendPrivateMessage('°>_h' + _user_access.getNick(id).escapeKCode()  + '|/serverpp "|/w "<° ist _bereits gesperrt_.');
						send(user, 'message', {
							type:			'error',
							message:	'°>_h' + _user_access.getNick(id).escapeKCode()  + '|/serverpp "|/w "<° ist _bereits gesperrt_.'
						});
						return;
					}
					
					// check if days are valid
					if(days != '!' && !(!isNaN(days) && parseInt(Number(days)) == days && !isNaN(parseInt(days, 10)))) {
						user.sendPrivateMessage('Du musst eine Zahl angeben.');
						send(user, 'message', {
							type:			'error',
							modal:		'add',
							message:	'Die Sperrtage dürfen nur die Anzahl der Tage oder ein Ausrufezeichen für eine permanente Sperre enthalten!'
						});
						return;
					}
					
					if(days < 1) {
						user.sendPrivateMessage('Du musst eine Zahl >= 1 angeben.');
						send(user, 'message', {
							type:			'error',
							modal:		'add',
							message:	'Die Sperrtage müssen mehr als einen Tag betragen!'
						});
					}
					
					// check if reason are valid
					if(reason.length < 20 || reason.length > 2000) {
						user.sendPrivateMessage('Die Info muss mindestens 20 und darf maximal 2000 Zeichen lang sein.');
						send(user, 'message', {
							type:			'error',
							modal:		'add',
							message:	'Die Info muss mindestens 20 und darf maximal 2000 Zeichen lang sein.'
						});
						return;
					}
					
					// create autocomment
					var comment_text	= '';
					var comments		= access_default.comments.length + 1;
					var lock_time			= new Date(time.getTime() + parseInt(days, 10) * 24 * 60 * 60 * 1000);
					
					if(days == '!') {
						comment_text	= '°R°"Permanent"°r° gesperrt!';
					} else {
						comment_text	= '"_Bis ' + zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()  + 1) + '.' + zeroize(lock_time.getFullYear()) + ' (_°R°' + days + ' Tag' + (days == 1 ? '' : 'e') + '°r°_)_" gesperrt!';							
					}
					
					if(typeof(access_object.comments) == 'undefined') {
						access_object.comments = [];
					}
					
					access_object.comments.push({
						text:		comment_text + '°#°' + comment,
						time:		time,
						user:		user.getNick(),
						reason:	reason
					});
					
					access_object[_db_state]	= 1;
					access_object[_db_time]	= days == '!' ? days : zeroize(lock_time.getFullYear()) + '-' + zeroize(lock_time.getMonth() + 1) + '-' + zeroize(lock_time.getDate());
					_server_persistence.setObject('_blacklist_access_' + id, access_object);
					
					var access_id = _server_persistence.getObject('_blacklist_access', []);
					access_id.push(id);
					_server_persistence.setObject('_blacklist_access', access_id);
					
					user.sendPrivateMessage('°>_h' + _user_access.getNick(id).escapeKCode()  + '|/serverpp "|/w "<° wurde _gesperrt_.');
					send(user, 'message', {
						type:			'success',
						modal:		'hide',
						message:	'°>_h' + _user_access.getNick(id).escapeKCode()  + '|/serverpp "|/w "<° wurde _gesperrt_.'
					});
					
					setTimeout(function() {
						App.onEventReceived(user, 'command', 'refresh');
					}, 1000);
					return;
				}
				
				if(typeof(nickname) == 'undefined') {
					nickname = arguments;
				}
				
				user.sendPrivateMessage('Der Nickname _' + nickname.escapeKCode() + '_ existiert nicht.');
				send(user, 'message', {
					type:			'error',
					modal:		'add',
					message:	'Der Nickname _' + nickname.escapeKCode() + '_ existiert nicht.'
				});
				return;
			
			// if only Nickname
			} else {
				if(action == 'unlock') {
					user.sendPrivateMessage('Bitte gebe ein Comment für die Entsperrung an!');
					send(user, 'message', {
						type:			'error',
						modal:		'unlock',
						message:	'Bitte gebe ein Comment für die Entsperrung an!'
					});
					return;
				}
				
				if(_user_access.exists(arguments)) {
					var id = _user_access.getUserId(arguments);

					if(_user_access.mayAccess(id)) {
						var target					= _user_access.getUserById(id);
						var persistence			= target.getPersistence();
						var comments			= persistence.getNumber(_db_comments, 0);
						var time					= persistence.getString(_db_time, '-');
						var text						= 'BlacklistInfo von _°>_h' + target.getNick().escapeKCode()  + '|/serverpp "|/w "<°:_';
						var lock_time				= createDate(time);
						var comments_array	= [];
						
						text += '°#°_Status:_ °+0010°' + (persistence.getNumber(_db_state, 0) == 0 ? 'Nicht gesperrt.' : '"°R°_Gesperrt_°r°" (' + (time == '!' ? 'Permanent' : 'bis ' + zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()) + '.' + zeroize(lock_time.getFullYear())) + ')');
						text += '°#°_Comments (' + comments + '):_';
						
						if(comments == 0) {
							text += '°#°" - keine vorhanden - "';
						} else {
							for(var index = comments; index >= 1; --index) {
								var comment_time = new Date(persistence.getString(_db_comment_time + index, '???'));
								
								text += '°#°°+0010°_°BB>_h' + persistence.getString(_db_comment_user + index, '???').escapeKCode() + '|/serverpp "|/w "<r°_ (' + zeroize(comment_time.getDate()) + '.' + zeroize(comment_time.getMonth()  + 1) + '.' + zeroize(comment_time.getFullYear())  + ' - ' + zeroize(comment_time.getHours()) + ':' + zeroize(comment_time.getMinutes()) + ':' + zeroize(comment_time.getSeconds()) + ')';
								text += '°#°°+0020°' + persistence.getString(_db_comment_string + index, '');
								
								comments_array.push({
									user:			'_°BB>_h' + persistence.getString(_db_comment_user + index, '???').escapeKCode() + '|/serverpp "|/w "<r°_',
									time:			zeroize(comment_time.getDate()) + '.' + zeroize(comment_time.getMonth()  + 1) + '.' + zeroize(comment_time.getFullYear())  + ' - ' + zeroize(comment_time.getHours()) + ':' + zeroize(comment_time.getMinutes()) + ':' + zeroize(comment_time.getSeconds()),
									comment:	persistence.getString(_db_comment_string + index, '')
								});
							}
						}
						
						if(!openWindow(user, {
							status:		persistence.getNumber(_db_state, 0) == 0,
							time:			(time == '!' ? 'Permanent' : 'bis ' + zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()) + '.' + zeroize(lock_time.getFullYear())),
							comments:	comments_array,
							user:			{
								nickname:	target.getNick(),
								age:			target.getAge(),
								gender:		target.getGender(),
								photo:		getNickPhoto(target, 500, 500),
								color:		getNickColor(target)
							}
						})) {
							user.sendPrivateMessage(text);
						}
						return;
					}
					
					var access_default				= {
						comments:		[]
					};
					access_default[_db_state]	= 0;
					access_default[_db_time]		= '-';
					var access_data					= _server_persistence.getObject('_blacklist_access_' + id, access_default);
					var time							= access_data[_db_time];
					var text								= 'BlacklistInfo von _°>_h' + _user_access.getNick(id).escapeKCode()  + '|/serverpp "|/w "<°:_';
					var lock_time						= createDate(time);
					var comments					= access_data.comments.length;
					var comments_array			= [];
					
					text += '°#°_Status:_ °+0010°' + (access_data[_db_state] == 0 ? 'Nicht gesperrt.' : '"°R°_Gesperrt_°r°" (' + (time == '!' ? 'Permanent' : 'bis ' + zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()) + '.' + zeroize(lock_time.getFullYear())) + ')');
					text += '°#°_Comments (' + comments + '):_';
					
					if(comments == 0) {
						text += '°#°" - keine vorhanden - "';
					} else {
						for(var index = comments; index >= 1; --index) {
							var comment_time = new Date(access_data.comments[index - 1].time);
							
							text += '°#°°+0010°_°BB>_h' + access_data.comments[index - 1].user + '|/serverpp "|/w "<r°_ (' + zeroize(comment_time.getDate()) + '.' + zeroize(comment_time.getMonth()  + 1) + '.' + zeroize(comment_time.getFullYear())  + ' - ' + zeroize(comment_time.getHours()) + ':' + zeroize(comment_time.getMinutes()) + ':' + zeroize(comment_time.getSeconds()) + ')';
							text += '°#°°+0020°' + access_data.comments[index - 1].text;
							
							comments_array.push({
								user:			'_°BB>_h' + access_data.comments[index - 1].user + '|/serverpp "|/w "<r°_',
								time:			zeroize(comment_time.getDate()) + '.' + zeroize(comment_time.getMonth()  + 1) + '.' + zeroize(comment_time.getFullYear())  + ' - ' + zeroize(comment_time.getHours()) + ':' + zeroize(comment_time.getMinutes()) + ':' + zeroize(comment_time.getSeconds()),
								comment:	access_data.comments[index - 1].text
							});
						}
					}
					
					if(!openWindow(user, {
						status:		access_data[_db_state] == 0,
						time:			(time == '!' ? 'Permanent' : 'bis ' + zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth() + 1) + '.' + zeroize(lock_time.getFullYear())),
						comments:	comments_array,
						user:			{
							nickname:	_user_access.getNick(id),
							age:			'',
							gender:		'',
							photo:		getNickPhoto(target, 500, 500),
							color:		'#000000'
						}
					})) {
						user.sendPrivateMessage(text);
					}
					return;
				}
				
				if(typeof(nickname) == 'undefined') {
					nickname = arguments;
				}
				
				user.sendPrivateMessage('Der Nickname _' + nickname.escapeKCode() + '_ existiert nicht.');
				send(user, 'message', {
					type:			'error',
					modal:		'unlock',
					message:	'Der Nickname _' + nickname.escapeKCode() + '_ existiert nicht.'
				});
				return;
			}
		},
	};
	
	this.toString = function toString() {
		return '[AppContainer]';
	};
}());
