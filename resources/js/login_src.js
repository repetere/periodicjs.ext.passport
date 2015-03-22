'use strict';
var ajaxlinks,
	navlinks,
	PushMenu = require('stylie.pushmenu'),
	Pushie = require('pushie'),
	asyncAdminPushie,
	async = require('async'),
	classie = require('classie'),
	StylieNotification = require('stylie.notifications'),
	StylieTable = require('stylie.tables'),
	StyliePushMenu,
	asyncHTMLWrapper,
	asyncHTMLContentContainer,
	asyncContentSelector = '#ts-asyncadmin-content-container',
	flashMessageArray = [],
	asyncFlashFunctions = [],
	request = require('superagent'),
	mtpms,
	menuElement,
	menuTriggerElement,
	nav_header,
	preloaderElement;

window.createAdminTable = function (options) {
	return new StylieTable(options);
};

var preventDefaultClick = function (e) {
	e.preventDefault();
	return;
};

var initFlashMessage = function () {
	window.showFlashNotifications({
		flash_messages: window.periodic_flash_messages,
		ttl: 7000,
		wrapper: document.querySelector('.ts-pushmenu-scroller-inner')
	});
};

var showPreloader = function (element) {
	var plElement = element || preloaderElement;
	classie.remove(plElement, 'hide');
	classie.remove(plElement, 'hide-preloading');
};
window.showPreloader = showPreloader;

var endPreloader = function (element) {
	var plElement = element || preloaderElement;
	classie.add(plElement, 'hide-preloading');
	var t = setTimeout(function () {
		clearTimeout(t);
		classie.add(plElement, 'hide');
	}, 400);
};
window.endPreloader = endPreloader;

var loadAjaxPage = function (options) {
	var htmlDivElement = document.createElement('div'),
		newPageTitle,
		newPageContent,
		newJavascripts;
	showPreloader();
	request
		.get(options.datahref)
		.set('Accept', 'text/html')
		.end(function (error, res) {
			// console.log('error', error);
			// console.log('res', res);
			if (error) {
				window.showErrorNotificaton({
					message: error.message
				});
			}
			else if (res.error) {
				window.showErrorNotificaton({
					message: 'Status [' + res.error.status + ']: ' + res.error.message
				});
			}
			else {
				htmlDivElement.innerHTML = res.text;
				newPageContent = htmlDivElement.querySelector('#ts-asyncadmin-content-wrapper');
				newPageTitle = htmlDivElement.querySelector('#menu-header-stylie').innerHTML;
				asyncHTMLWrapper.removeChild(document.querySelector(asyncContentSelector));
				document.querySelector('#menu-header-stylie').innerHTML = newPageTitle;
				asyncHTMLWrapper.innerHTML = newPageContent.innerHTML;

				// console.log('htmlDivElement', htmlDivElement);
				newJavascripts = htmlDivElement.querySelectorAll('script');
				for (var j = 0; j < newJavascripts.length; j++) {
					if (!newJavascripts[j].src.match('/extensions/periodicjs.ext.asyncadmin/js/asyncadmin.min.js')) {
						var newJSScript = document.createElement('script');
						if (newJavascripts[j].src) {
							newJSScript.src = newJavascripts[j].src;
						}
						if (newJavascripts[j].id) {
							newJSScript.id = newJavascripts[j].id;
						}
						if (newJavascripts[j].type) {
							newJSScript.type = newJavascripts[j].type;
						}
						// newJSScript.class = newJavascripts[j].class;
						newJSScript.innerHTML = newJavascripts[j].innerHTML;
						asyncHTMLWrapper.appendChild(newJSScript);
					}
				}
				initFlashMessage();
				if (options.pushState) {
					asyncAdminPushie.pushHistory({
						data: {
							datahref: options.datahref
						},
						title: 'Title:' + options.datahref,
						href: options.datahref
					});
				}
				endPreloader();
			}
		});
};

var navlinkclickhandler = function (e) {
	var etarget = e.target,
		etargethref = etarget.href;

	if (classie.has(etarget, 'async-admin-ajax-link')) {
		e.preventDefault();
		// console.log('etargethref', etargethref);
		loadAjaxPage({
			datahref: etargethref,
			pushState: true
		});
		StyliePushMenu._resetMenu();
		return false;
	}
};

var statecallback = function (data) {
	// console.log('data', data);
	loadAjaxPage({
		datahref: data.datahref,
		pushState: false
	});
};
var pushstatecallback = function ( /*data*/ ) {
	// console.log('data', data);
};


window.getAsyncCallback = function (functiondata) {
	return function (asyncCB) {
		new StylieNotification({
			message: functiondata.message,
			ttl: functiondata.ttl,
			wrapper: functiondata.wrapper,
			layout: 'growl',
			effect: 'jelly',
			type: functiondata.type, // notice, warning, error or success
			onClose: function () {
				asyncCB(null, 'shown notification');
			}
		}).show();
	};
};

window.showFlashNotifications = function (options) {
	if (options.flash_messages) {
		for (var x in options.flash_messages) {
			if (options.flash_messages[x]) {
				for (var y in options.flash_messages[x]) {
					flashMessageArray.push({
						type: x,
						message: options.flash_messages[x][y]
					});
					asyncFlashFunctions.push(window.getAsyncCallback({
						type: x,
						ttl: options.ttl,
						message: options.flash_messages[x][y],
						wrapper: options.wrapper
					}));
				}
			}
		}
		if (asyncFlashFunctions.length > 0) {
			async.series(asyncFlashFunctions, function (err /*,result*/ ) {
				if (err) {
					console.error(err);
				}
				else if (options.callback) {
					options.callback();
				}
				// else {
				// 	console.log(result);
				// }
			});
		}
	}
};

window.showErrorNotificaton = function (options) {
	options.layout = 'growl';
	options.effect = 'jelly';
	options.ttl = false;
	options.type = 'error';
	window.showStylieNotification(options);
};

window.showStylieNotification = function (options) {
	new StylieNotification({
		message: options.message,
		ttl: (typeof options.ttl === 'boolean') ? options.ttl : 7000,
		wrapper: options.wrapper || document.querySelector('main'),
		layout: options.layout || 'growl',
		effect: options.effect || 'jelly',
		type: options.type, // notice, warning, error or success
		onClose: options.onClose || function () {}
	}).show();
};


window.addEventListener('load', function () {
	asyncHTMLWrapper = document.querySelector('#ts-asyncadmin-content-wrapper');
	asyncHTMLContentContainer = document.querySelector(asyncContentSelector);
	navlinks = document.querySelector('#ts-pushmenu-mp-menu');
	menuElement = document.getElementById('ts-pushmenu-mp-menu');
	menuTriggerElement = document.getElementById('trigger');
	nav_header = document.querySelector('#nav-header');
	mtpms = document.querySelector('main.ts-pushmenu-scroller');
	ajaxlinks = document.querySelectorAll('.async-admin-ajax-link');
	preloaderElement = document.querySelector('#ts-preloading');

	for (var u = 0; u < ajaxlinks.length; u++) {
		ajaxlinks[u].addEventListener('click', preventDefaultClick, false);
	}

	if (navlinks) {
		navlinks.addEventListener('mousedown', navlinkclickhandler, false);
	}
	StyliePushMenu = new PushMenu({
		el: menuElement,
		trigger: menuTriggerElement,
		type: 'overlap', // 'overlap', // 'cover',
		// position: 'right'
	});
	asyncAdminPushie = new Pushie({
		replacecallback: pushstatecallback,
		pushcallback: pushstatecallback,
		popcallback: statecallback
	});
	window.asyncHTMLWrapper = asyncHTMLWrapper;
	initFlashMessage();
	window.StyliePushMenu = StyliePushMenu;
});
