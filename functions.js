function zeroize(value) {
	value = parseInt(value, 10);
	
	if(value >= 0 && value <= 9) {
		value = '0' + value;
	}
	
	return '' + value;
}

function createDate(string) {
	var split = string.split('-');
	return new Date(parseInt(split[0], 10), parseInt(split[1], 10) - 1, parseInt(split[2], 10), 0, 0, 0, 0);
}

function getNickColor(user) {
	var color = '#000000';
	
	switch(user.getUserStatus()) {
		case UserStatus.Stammi:
		case UserStatus.HonoryMember:
			color = '#009600';
		break;
		case UserStatus.Family:
			color = '#000496';
		break;
		case UserStatus.Sysadmin:
		case UserStatus.SystemBot:
		case UserStatus.Admin:
			color = '#960000';
		break;
	}
	
	return color;
}

function getNickPhoto(user, width, height) {
	if(typeof(user) == 'undefined') {
		return KnuddelsServer.getFullImagePath('/images/nopic_male.jpg');
	}
	
	if(user.hasProfilePhoto()) {
		var photo = user.getProfilePhoto(width, height);
		
		if(photo.substring(0, 7) == 'http://') {
			photo = 'https://chat.knuddels.de/pics/fotos/knuddels.de?n=' + user.getNick();
		}
		
		return photo;
	}
	
	if(user.getGender() == Gender.Female) {
		return KnuddelsServer.getFullImagePath('/images/nopic_female.jpg');
	}
	
	return KnuddelsServer.getFullImagePath('/images/nopic_male.jpg');
}

function getOwners() {
	var owners		= KnuddelsServer.getChannel().getChannelConfiguration().getChannelRights().getChannelOwners();
	var result		= [];
	
	owners.forEach(function(user) {
		result.push(user.getNick());
	});
	
	return JSON.stringify(result);
}

function getEntries(user) {
	var entries = [];

	if(typeof(_page[user.getUserId()]) == 'undefined') {
		_page[user.getUserId()] = 1;
	}
	
	//KnuddelsServer.getDefaultLogger().info('Page: ' + (_page[user.getUserId()] - 1) + ', Entries: ' + _page_entries + ', Count: ' + UserPersistenceNumbers.getCount(_db_state) + ', Calc: ' + parseFloat(UserPersistenceNumbers.getCount(_db_state) / _page_entries));
	UserPersistenceNumbers.getSortedEntries(_db_state, {
		page:				_page[user.getUserId()] - 1,
		ascending:			false,
		count:				_page_entries,
		minimumValue:	1
	}).forEach(function(entrie) {
		entrie				= entrie.getUser();
		var time			= entrie.getPersistence().getString(_db_time, '-');
		var lock_time		= createDate(time);
		
		entries.push({
			nickname:	entrie.getNick(),
			age:			entrie.getAge(),
			gender:		entrie.getGender(),
			photo:		getNickPhoto(entrie, 400, 400),
			color:		getNickColor(entrie),
			time:			(time == '!' ? '°R°_Permanent_°r°' : 'bis ' + zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()) + '.' + zeroize(lock_time.getFullYear())) 
		});
	});
	
	return entries;
}

function getInaccessibleEntries() {
	var entries		= [];
	var access_id	= _server_persistence.getObject('_blacklist_access', []);
	
	if(access_id.length > 0) {
		access_id.forEach(function(id, index) {
			var access_default			= {};
			access_default[_db_time]	= '-';
			var access_data				= _server_persistence.getObject('_blacklist_access_' + id, access_default);
			var time						= access_data[_db_time];
			var lock_time 				= createDate(time);
		
			entries.push({
				nickname:	_user_access.getNick(id),
				age:			0,
				gender:		'',
				photo:		getNickPhoto(undefined, 400, 400),
				color:		'#000000',
				time:			(time == '!' ? '°R°_Permanent_°r°' : 'bis ' + zeroize(lock_time.getDate()) + '.' + zeroize(lock_time.getMonth()) + '.' + zeroize(lock_time.getFullYear())) 
			});
		});
	}
	
	return entries;
}

function openWindow(user, entrie) {
	var file		= 'blacklist.html';
	
	// check if User has already a session
	var session = user.getAppContentSession(AppViewMode.Popup);
	
	/*if(session != null) {
		if(session.getAppContent().getHTMLFile().getAssetPath() == file) {
			send(user, 'multidata', {
				page:						_page[user.getUserId()],
				pages:						Math.ceil(UserPersistenceNumbers.getCount(_db_state) / _page_entries),
				entries:						getEntries(user),
				inaccessible_entries:	getInaccessibleEntries(),
				entrie:						entrie
			});
			return true;
		}
	}*/
	
	var htmlFile = new HTMLFile(file, {
		page:						_page[user.getUserId()],
		pages:						Math.ceil(UserPersistenceNumbers.getCount(_db_state) / _page_entries),
		entries:						getEntries(user),
		inaccessible_entries:	getInaccessibleEntries(),
		entrie:						entrie,
		channelowner:			user.isChannelOwner()
	});

	var content	= AppContent.popupContent(htmlFile, 800, 600);
	var config		= content.getLoadConfiguration();
	config.setEnabled(false);

	if(user.canSendAppContent(content)) {
		user.setAppContent(content);
		return true;
	}

	return false;
}

function send(user, name, value) {
	var session = user.getAppContentSession(AppViewMode.Popup);
	
	if(session != null) {
		session.sendEvent(name, value);
	}
}