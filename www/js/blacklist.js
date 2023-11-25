(new function Frame($) {
	var _instance					= this;
	var _body						= $('body');
	var _parser					= null;
	var _page						= 1;
	var _pages					= 1;
	var _entries					= [];
	var _inaccessible_entries	= [];
	
	var _table_linking_actions = [];
	var _info_linking_actions = [];
	
	var container					= $('#add.modal');
	var nickname 				= $('input[name="nickname"]', container);
	var search_nickname 		= $('#search.modal input[name="search_nickname"]');
	var unlock_nickname 		= $('#unlock.modal input[name="unlock_nickname"]');
	var unlock_comment 		= $('#unlock.modal textarea[name="unlock_comment"]');
	var comment_nickname 	= $('#comment.modal input[name="comment_nickname"]');
	var comment_comment 	= $('#comment.modal textarea[name="comment_comment"]');
	var comment					= $('textarea[name="comment"]', container);
	var reason						= $('textarea[name="reason"]', container);
	var days						= $('input[name="days"]', container);
	
	this.init = function init() {
		_parser = window.KCode ? new KCode.Parser() : null;
		
		document.addEventListener('eventReceived', _instance.onReceive);
		
		if(_parser) {
			console.log('Init KCode Parser v' + KCode.version);
			
			_parser.allowBold 					= true;
			_parser.allowItalic					= true;
			_parser.allowFontSize				= true;
			_parser.allowColor					= true;
			_parser.allowImages				= true;
			_parser.allowLinks					= true;
			_parser.allowAlignment			= true;
			_parser.allowBreaklines			= true;
			_parser.allowIndentation			= true;
			_parser.defaultFontSize			= 12;
			_parser.defaultTextColor			= '0,0,0';
			_parser.defaultLinkHoverColor	= '255,0,0';
			_parser.channelBlue				= '0,0,255';
			_parser.channelRed					= '255,0,0';
			_parser.channelGreen				= '0,255,0';
		}
		
		if(Client.pageData != undefined) {
			for(var index in Client.pageData) {
				var key		= index;
				var value	= Client.pageData[index];
				Client.onSendEventReceived(key, JSON.stringify(value));
			}
		}
		
		$(document.body).on('submit', 'form', function(event) {
			$(this).find('button.btn-primary').click();
			event.preventDefault();
			return false;
		});
		
		$(document.body).on('contextmenu', '[data-leftmouse],[data-rightmouse]', function(event) {
			event.preventDefault();
			return false;
		});
		
		$(document.body).on('mousedown', '[data-leftmouse],[data-rightmouse]', function(event) {
			switch(event.which) {
				case 1:
					var command = $(this).data('leftmouse');
					
					if(command.substring(0, 1) == '/') {
						Client.executeSlashCommand(command);
						return;
					}
					
					Client.sendEvent('command', command);
				break;
				case 3:
					var command = $(this).data('rightmouse');
					
					if(command.substring(0, 1) == '/') {
						Client.executeSlashCommand(command);
						return;
					}
					
					Client.sendEvent('command', command);
				break;
			}
		});
		
		$(document.body).on('click', '[data-view]', function(event) {
			var element = $(this);
			
			element.closest('ul').find('li').removeClass('active');
			element.parent().addClass('active');
			
			element.addClass('active');
			
			$('div#acessible, div#inacessible').removeClass('show').addClass('hide');
			$('div#' + element.data('view')).removeClass('hide').addClass('show');
		});
		
		$(document.body).on('click', '[data-page]', function(event) {
			Client.sendEvent('page', $(this).data('page'));
			event.preventDefault();
		});
		
		$(document.body).on('click', '[data-action]', function(event) {
			var element	= $(this);
			var action		= element.data('action');
			
			switch(action) {
				case 'cancel':
					$('.modal').modal('hide');
				break;
				case 'refresh':
					Client.sendEvent('command', action);
					element.addClass('rotate');
				break;
				case 'shownick':
					Client.sendEvent('blacklist', search_nickname.val());
					$('.modal').modal('hide');
				break;
				case 'unblacklist':
					Client.sendEvent('blacklist', '!' + unlock_nickname.val() + ':' + unlock_comment.val());
					$('.modal').modal('hide');
				break;
				case 'addcomment':
					Client.sendEvent('blacklist', '+' + comment_nickname.val() + ':' + comment_comment.val());
					$('.modal').modal('hide');
				break;
				case 'blacklist':
					Client.sendEvent('blacklist', nickname.val() + ':' + comment.val() + ':' + reason.val() + ':' + days.val());
					$('.modal').modal('hide');
				break;
				case 'lock':
					nickname.val($(this).data('nickname'));
					container.modal('show');
				break;
				case 'unlock':
					var modal		= $('#unlock.modal');
					var nick			= element.data('nickname');
					
					$('label[for="unlock_nickname"]', modal).text(nick + ' entsperren');
					$('input[name="unlock_nickname"]', modal).val(nick);
					modal.modal('show');
				break;
				case 'comment':
					var modal		= $('#comment.modal');
					var nick			= element.data('nickname');
					
					$('label[for="comment_nickname"]', modal).text('Kommentar bei ' + nick + ' setzen');
					$('input[name="comment_nickname"]', modal).val(nick);
					modal.modal('show');
				break;
				case 'savesettings':
					var settings = $('#settings.modal');
					
					Client.sendEvent('savesettings', {
						view:		{
							cm:	$('input[name="view[cm]"]', settings).prop('checked'),
							am:	$('input[name="view[am]"]', settings).prop('checked')
						},
						lock:		{
							cm:	$('input[name="lock[cm]"]', settings).prop('checked'),
							am:	$('input[name="lock[am]"]', settings).prop('checked'),
							rank:	$('input[name="lock_rank"]:checked', settings).val(),
							time:	$('input[name="lock_time"]:checked', settings).val()
						},
						unlock:	{
							cm:	$('input[name="unlock[cm]"]', settings).prop('checked'),
							am:	$('input[name="unlock[am]"]', settings).prop('checked'),
							type:	$('input[name="unlock_type"]:checked', settings).val()
						},
						comments: {
							cm:	$('input[name="comments[cm]"]', settings).prop('checked'),
							am:	$('input[name="comments[am]"]', settings).prop('checked')
						}
					});
					
					settings.modal('hide');
				break;
				default:
					Client.sendEvent('command', action);
				break;
			}
			
			event.preventDefault();
		});
		
		$('[data-textlength]').each(function() {
			var conatiner	= $(this);
			var target		= conatiner.data('textlength');
			var limit		= conatiner.data('textlength-max');
			var element	= $('[name="' + target + '"]');
			
			conatiner.text('0 / ' + limit);
			
			element.on('change keyup', function(event) {
				conatiner.removeClass('warn');
				
				conatiner.text(element.val().length + ' / ' + limit);
				
				if(element.val().length > limit) {
					conatiner.addClass('warn');
				}
			});
		});
		
		$('.modal').on('show.bs.modal', function() {
			$('nav a[data-action]').hide();
			$('nav a[data-action="cancel"]').css('display', 'block');
		});
		
		$('.modal').on('hide.bs.modal', function() {
			$('nav a[data-action]').show();
			$('nav a[data-action="cancel"]').hide();
			
			if(!_body.data('channelowner')) {
				$('nav a[data-action="settings"]').hide();
			}
		});
		
		_instance.setData(_body, 'client', Client.getClientType());
		Client.sendEvent('init', true);
		
		/*setInterval(function() {
			Client.sendEvent('ping', true);
		}, 1000);*/
	};
	
	this.linkKCode = function linkKCode(linkingActions) {
		linkingActions.forEach(function(action) {
			switch(action.type) {
				case KCode.LinkingAction.LINK:
					$('#' + action.elemID).on('click', function(event) {					
						if(action.linkHref.indexOf('/') === 0) {
							Client.executeSlashCommand(action.linkHref);
						} else {
							window.open(action.linkHref);
						}
					});
				break;
				case KCode.LinkingAction.PLAY_SOUND:
					Client.playSound(action.linkHref);
				break;
				default:
					/* Do Nothing */
				break;
			}
		});
	};
	
	this.redrawPagination = function redrawPagination() {
		var html_previous	= '<li><a data-page="previous" aria-label="Zurück"><span aria-hidden="true">&laquo;</span></a></li>';
		var html_next		= '<li><a data-page="next" aria-label="Weiter"><span aria-hidden="true">&raquo;</span></a></li>';
		var pages				= _pages;
		var html				= '';
		
		for(var index = 1; index <= _pages; ++index) {
			html += '<li><a data-page="' + index + '">' + (index == _page ? '<strong>' + index + '</strong>' : index) + '</a></li>';
		}
		
		if(_pages <= 1) {
			$('footer ul.pagination').html('<li style="height: 25px; display: inline-block;"></li>');
			pages = 1;
		} else {
			$('footer ul.pagination').html(html_previous + html + html_next);
		}
		
		$('footer .page').html('Seite ' + _page + ' / ' + pages);
	};
	
	this.drawTableRow = function drawTableRow(table, entrie) {
		var html = '<tr data-leftmouse="blacklist:' + entrie.nickname + '"><td>';
			
		html += '<img class="photo" src="' + entrie.photo + '" alt="" />';
		html += '<strong style="color: ' + entrie.color + ';">';
		
		html += entrie.nickname;
		
		if(entrie.age > 0) {
			html += ' (' + entrie.age + ')';
		}
		
		html += '</strong>';
		
		switch(entrie.gender) {
			case 'Male':							
				html += '<img class="gender" src="images/male.png" alt="" />';
			break;
			case 'Female':
				html += '<img class="gender" src="images/female.png alt="" />';
			break;
		}
		
		if(_parser) {
			var parseResult		= _parser.parse(entrie.time);
			entrie.time				= parseResult.htmlString;
			_table_linking_actions.push(parseResult.linkingActions);
		}
		
		html += '</td>';
		html += '<td>' + entrie.time + '</td>';
		html += '</tr>';
		
		table.append(html);
	};
	
	this.onReceive = function onReceive(event) {
		try {
			var key		= event.eventKey;
			var data	= event.eventData;
			
			//console.log(key + ' >>> ' + JSON.stringify(data));
			
			switch(key) {
				case 'multidata':
					Object.keys(data).forEach(function(name) {
						_instance.onReceive({
							eventKey:		name,
							eventData:		data[name]
						});
					});
				break;
				case 'channelowner':
					_instance.setData(_body, 'channelowner', data);
				break;
				case 'settings':
					var settings = $('#settings.modal');
					
					$('input[name="view[cm]"]', settings).prop('checked', data.view.cm);
					$('input[name="view[am]"]', settings).prop('checked', data.view.am);
					$('input[name="lock[cm]"]', settings).prop('checked', data.lock.cm);
					$('input[name="lock[am]"]', settings).prop('checked', data.lock.am);
					$('input[name="lock_rank"][value="' + data.lock.rank + '"]', settings).prop('checked', true);
					$('input[name="lock_time"][value="' + data.lock.time + '"]', settings).prop('checked', true);
					$('input[name="unlock[cm]"]', settings).prop('checked', data.unlock.cm);
					$('input[name="unlock[am]"]', settings).prop('checked', data.unlock.am);
					$('input[name="unlock_type"][value="' + data.unlock.type + '"]', settings).prop('checked', true);
					$('input[name="comments[cm]"]', settings).prop('checked', data.comments.cm);
					$('input[name="comments[am]"]', settings).prop('checked', data.comments.am);
					
					settings.modal('show');
				break;
				case 'message':
					var message = $('div#message');
					
					if(_parser) {
						var parseResult		= _parser.parse(data.message);
						data.message			= parseResult.htmlString;
					}
					
					if(typeof(data.modal) != 'undefined') {
						if(data.modal == 'hide') {
							$('.modal').modal('hide');
						} else {
							setTimeout(function() {
								$('#' + data.modal + '.modal').modal('show');
							}, 2500);
						}
					}
					
					message.removeClass('error').removeClass('success').addClass(data.type);
					message.html(data.message);
					message.show();
					
					if(_parser && typeof(parseResult.linkingActions) != 'undefined') {
						_instance.linkKCode(parseResult.linkingActions);
					}
					
					setTimeout(function() {
						message.hide();
					}, 3000);
				break;
				case 'page':
					_page = parseInt(data, 10);
					_instance.redrawPagination();
				break;
				case 'pages':
					_pages = parseInt(data, 10);
					_instance.redrawPagination();					
				break;
				case 'entries':
					_entries						= data;
					_table_linking_actions	= [];
					var table					= $('table#entries');
					
					$('a[data-view="acessible"] span').text(_entries.length);
					table.html('');
					
					if(_entries.length == 0) {
						$('div#acessible p.error').show();
					} else {
						$('div#acessible p.error').attr('style', '');
						
						_entries.forEach(function(data) {
							_instance.drawTableRow(table, data);
						});
						
						for(var index in _table_linking_actions) {
							if(_parser) {
								_instance.linkKCode(_table_linking_actions[index]);
							}
						}
					}
					
					$('a[data-action="refresh"]').removeClass('rotate');
				break;
				case 'inaccessible_entries':
					_inaccessible_entries	= data;
					_table_linking_actions	= [];
					var table					= $('table#inacessible_entries');
					
					$('a[data-view="inacessible"] span').text(_inaccessible_entries.length);
					table.html('');
					
					if(_inaccessible_entries.length == 0) {
						$('div#inacessible p.error').show();
					} else {
						$('div#inacessible p.error').attr('style', '');
						_inaccessible_entries.forEach(function(data) {
							_instance.drawTableRow(table, data);
						});
						
						for(var index in _table_linking_actions) {
							if(_parser) {
								_instance.linkKCode(_table_linking_actions[index]);
							}
						}
					}
					
					$('a[data-action="refresh"]').removeClass('rotate');
				break;
				case 'entrie':
					if(typeof(data) == 'undefined') {
						return;
					}
					_info_linking_actions = [];
					var info		= $('#info.modal');
					var title		= data.user.nickname;
					
					if(data.user.age > 0) {
						title += ' (' + data.user.age + ')';
					}
					
					switch(data.user.gender) {
						case 'Male':							
							title += '<img class="gender" src="images/male.png" alt="" />';
						break;
						case 'Female':
							title += '<img class="gender" src="images/female.png alt="" />';
						break;
					}
					
					var status = (!data.status ? '"°R°_Gesperrt_°r°" (' + data.time + ')' : 'Nicht gesperrt.');
					
					if(_parser) {
						var parseResult	= _parser.parse(status);
						status				= parseResult.htmlString;
					}
					
					var comments = '';
					
					for(var index in data.comments) {
						var comment = data.comments[index];
						
						if(_parser) {
							var parseResult		= _parser.parse(comment.user);
							comment.user			= parseResult.htmlString;
							_info_linking_actions.push(parseResult.linkingActions);
							
							parseResult			= _parser.parse(comment.comment);
							comment.comment	= parseResult.htmlString;
							_info_linking_actions.push(parseResult.linkingActions);
						}
						
						comments += '<li>' + comment.user + ' (' + comment.time + ')<br />' + comment.comment + '</li>';
					}
					
					$('h1', info).html(title);
					$('img.photo', info).attr('src', data.user.photo);
					$('span.status', info).html(status);
					$('ul.comments', info).html(comments);
					
					$('button[data-action="comment"]', info).data('nickname', data.user.nickname)
					
					if(!data.status) {
						$('button[data-action="unlock"]', info).data('nickname', data.user.nickname).show();
						$('button[data-action="lock"]', info).data('nickname', data.user.nickname).hide();
					} else {
						$('button[data-action="unlock"]', info).data('nickname', data.user.nickname).hide();
						$('button[data-action="lock"]', info).data('nickname', data.user.nickname).show();
					}
					
					for(var index in _info_linking_actions) {
						if(_parser) {
							_instance.linkKCode(_info_linking_actions[index]);
						}
					}
					
					$('#info.modal').modal('show');
				break;
			}
		} catch(e) {
			Client.sendEvent('exception', {
				message:	e.message,
				stack:		e.stack
			});
		}
	};
	
	this.setData = function setData(element, name, data) {
		try {
			element.data(name, data);
		
			if(typeof(data) == 'boolean') {
				element.attr('data-' + name, data ? 'true' : 'false');
				return;
			}
			
			element.attr('data-' + name, data);
		} catch(e) {
			Client.sendEvent('exception', e);
		}
	};
	
	window.onload = this.init;
}(jQuery));