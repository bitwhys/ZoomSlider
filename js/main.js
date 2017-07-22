/**
 * main.js
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 *
 * Copyright 2015, Codrops
 * http://www.codrops.com
 */
;(function(window) {

	'use strict';

	var bodyEl = document.body,
		docElem = window.document.documentElement,
		support = { transitions: Modernizr.csstransitions },
		// transition end event name
		transEndEventNames = { 'WebkitTransition': 'webkitTransitionEnd', 'MozTransition': 'transitionend', 'OTransition': 'oTransitionEnd', 'msTransition': 'MSTransitionEnd', 'transition': 'transitionend' },
		transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
		onEndTransition = function( el, callback ) {
			var onEndCallbackFn = function( ev ) {
				if( support.transitions ) {
					if( ev.target != this ) return;
					this.removeEventListener( transEndEventName, onEndCallbackFn );
				}
				if( callback && typeof callback === 'function' ) { callback.call(this); }
			};
			if( support.transitions ) {
				el.addEventListener( transEndEventName, onEndCallbackFn );
			}
			else {
				onEndCallbackFn();
			}
		},
		// window sizes
		win = {width: window.innerWidth, height: window.innerHeight},
		// some helper vars to disallow scrolling
		lockScroll = false, xscroll, yscroll,
		scrollContainer = document.querySelector('.container'),
		// the main slider and its items
		sliderEl = document.querySelector('.slider'),
		items = [].slice.call(sliderEl.querySelectorAll('.slide')),
		// total number of items
		itemsTotal = items.length,
		// navigation controls/arrows
		navRightCtrl = sliderEl.querySelector('.button--nav-next'),
		navLeftCtrl = sliderEl.querySelector('.button--nav-prev'),
		zoomCtrl = sliderEl.querySelector('.button--zoom'),
		// the main content element
		contentEl = document.querySelector('.content'),
		// close content control
		closeContentCtrl = contentEl.querySelector('button.button--close'),
		// index of current item
		current = 0,
		// check if an item is "open"
		isOpen = false,
		isFirefox = typeof InstallTrigger !== 'undefined',
		// scale body when zooming into the items, if not Firefox (the performance in Firefox is not very good)
		bodyScale = isFirefox ? false : 3,
		// list of contents id
		contentList = items.map(function(item) {
			return item.getAttribute('data-content');
		}),
		// Does this request matches a page navigation (= true) or insted a direct browser navigation (=false) ?
		naturalRequest = false,
		// current view : 'slider' or 'zoom'
		currentView = 'slider',
		// current content id
		currentContent = contentList[current],
		// index of required item
		required = current,
		// required view : 'slider' or 'zoom'
		requiredView = currentView,
		// required content id
		requiredContent = currentContent,
		// First time page is rendered
		firstRendering = true;

	// some helper functions:
	function scrollX() { return window.pageXOffset || docElem.scrollLeft; }
	function scrollY() { return window.pageYOffset || docElem.scrollTop; }
	// from http://www.sberry.me/articles/javascript-event-throttling-debouncing
	function throttle(fn, delay) {
		var allowSample = true;

		return function(e) {
			if (allowSample) {
				allowSample = false;
				setTimeout(function() { allowSample = true; }, delay);
				fn(e);
			}
		};
	}

	function init() {
		// directly execute router for first rendering
		router();
		initEvents();
	}

	// event binding
	function initEvents() {
		// open items
		zoomCtrl.addEventListener('click', function() {
			window.location.hash = '#zoom/' + currentContent;
		});

		// close content
		closeContentCtrl.addEventListener('click', function() {
			window.location.hash = '#slider/' + currentContent;
		});

		// navigation
		navRightCtrl.addEventListener('click', function() {
			window.location.hash = '#slider/' + contentList[current === itemsTotal - 1 ? 0 : current + 1];
		});
		navLeftCtrl.addEventListener('click', function() {
			window.location.hash = '#slider/' + contentList[current === 0 ? itemsTotal - 1 : current - 1];
		});

		// window resize
		window.addEventListener('resize', throttle(function(ev) {
			// reset window sizes
			win = {width: window.innerWidth, height: window.innerHeight};

			// reset transforms for the items (slider items)
			items.forEach(function(item, pos) {
				if( pos === current ) return;
				var el = item.querySelector('.slide__mover');
				dynamics.css(el, { translateX: el.offsetWidth });
			});
		}, 10));

		// keyboard navigation events
		document.addEventListener( 'keydown', function( ev ) {
			var keyCode = ev.keyCode || ev.which;
			if (!isOpen) {
				switch (keyCode) {
					case 37:
						window.location.hash = '#slider/' + contentList[current === 0 ? itemsTotal - 1 : current - 1];
						break;
					case 39:
						window.location.hash = '#slider/' + contentList[current === itemsTotal - 1 ? 0 : current + 1];
						break;
				}
			} else {
				switch (keyCode) {
					case 27:
						window.location.hash = '#slider/' + currentContent;
						break;
				}
			}
		} );
	}

	// opens one item
	function openItem(item) {
		if( isOpen ) return;
		isOpen = true;

		// the element that will be transformed
		var zoomer = item.querySelector('.zoomer');
		// slide screen preview
		classie.add(zoomer, 'zoomer--active');
		// disallow scroll
		scrollContainer.addEventListener('scroll', noscroll);
		// apply transforms
		applyTransforms(zoomer);
		// also scale the body so it looks the camera moves to the item.
		if( bodyScale ) {
			dynamics.animate(bodyEl, { scale: bodyScale }, { type: dynamics.easeInOut, duration: 500 });
		}
		// after the transition is finished:
		onEndTransition(zoomer, function() {
			// reset body transform
			if( bodyScale ) {
				dynamics.stop(bodyEl);
				dynamics.css(bodyEl, { scale: 1 });

				// fix for safari (allowing fixed children to keep position)
				bodyEl.style.WebkitTransform = 'none';
				bodyEl.style.transform = 'none';
			}
			// no scrolling
			classie.add(bodyEl, 'noscroll');
			classie.add(contentEl, 'content--open');
			var contentItem = document.getElementById(item.getAttribute('data-content'))
			classie.add(contentItem, 'content__item--current');
			classie.add(contentItem, 'content__item--reset');


			// reset zoomer transform - back to its original position/transform without a transition
			classie.add(zoomer, 'zoomer--notrans');
			zoomer.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
			zoomer.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';
		});
	}

	// closes the item/content
	function closeContent() {
		var contentItem = contentEl.querySelector('.content__item--current'),
			zoomer = items[current].querySelector('.zoomer');

		classie.remove(contentEl, 'content--open');
		classie.remove(contentItem, 'content__item--current');
		classie.remove(bodyEl, 'noscroll');

		if( bodyScale ) {
			// reset fix for safari (allowing fixed children to keep position)
			bodyEl.style.WebkitTransform = '';
			bodyEl.style.transform = '';
		}

		/* fix for safari flickering */
		var nobodyscale = true;
		applyTransforms(zoomer, nobodyscale);
		/* fix for safari flickering */

		// wait for the inner content to finish the transition
		onEndTransition(contentItem, function(ev) {
			classie.remove(this, 'content__item--reset');

			// reset scrolling permission
			lockScroll = false;
			scrollContainer.removeEventListener('scroll', noscroll);

			/* fix for safari flickering */
			zoomer.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
			zoomer.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';
			/* fix for safari flickering */

			// scale up - behind the scenes - the item again (without transition)
			applyTransforms(zoomer);

			// animate/scale down the item
			setTimeout(function() {
				classie.remove(zoomer, 'zoomer--notrans');
				classie.remove(zoomer, 'zoomer--active');
				zoomer.style.WebkitTransform = 'translate3d(0,0,0) scale3d(1,1,1)';
				zoomer.style.transform = 'translate3d(0,0,0) scale3d(1,1,1)';
			}, 25);

			if( bodyScale ) {
				dynamics.css(bodyEl, { scale: bodyScale });
				dynamics.animate(bodyEl, { scale: 1 }, {
					type: dynamics.easeInOut,
					duration: 500
				});
			}

			isOpen = false;
		});
	}

	// applies the necessary transform value to scale the item up
	function applyTransforms(el, nobodyscale) {
		// zoomer area and scale value
		var zoomerArea = el.querySelector('.zoomer__area'),
			zoomerAreaSize = {width: zoomerArea.offsetWidth, height: zoomerArea.offsetHeight},
			zoomerOffset = zoomerArea.getBoundingClientRect(),
			scaleVal = zoomerAreaSize.width/zoomerAreaSize.height < win.width/win.height ? win.width/zoomerAreaSize.width : win.height/zoomerAreaSize.height;

		if( bodyScale && !nobodyscale ) {
			scaleVal /= bodyScale;
		}

		// apply transform
		el.style.WebkitTransform = 'translate3d(' + Number(win.width/2 - (zoomerOffset.left+zoomerAreaSize.width/2)) + 'px,' + Number(win.height/2 - (zoomerOffset.top+zoomerAreaSize.height/2)) + 'px,0) scale3d(' + scaleVal + ',' + scaleVal + ',1)';
		el.style.transform = 'translate3d(' + Number(win.width/2 - (zoomerOffset.left+zoomerAreaSize.width/2)) + 'px,' + Number(win.height/2 - (zoomerOffset.top+zoomerAreaSize.height/2)) + 'px,0) scale3d(' + scaleVal + ',' + scaleVal + ',1)';
	}

	// navigate the slider
	function navigate(dir) {
		var itemCurrent = items[current],
			currentEl = itemCurrent.querySelector('.slide__mover'),
			currentTitleEl = itemCurrent.querySelector('.slide__title');

		// update new current value
		if( dir === 'right' ) {
			current = current < itemsTotal-1 ? current + 1 : 0;
		}
		else {
			current = current > 0 ? current - 1 : itemsTotal-1;
		}

		var itemNext = items[current],
			nextEl = itemNext.querySelector('.slide__mover'),
			nextTitleEl = itemNext.querySelector('.slide__title');

		// animate the current element out
		dynamics.animate(currentEl, { opacity: 0, translateX: dir === 'right' ? -1*currentEl.offsetWidth/2 : currentEl.offsetWidth/2, rotateZ: dir === 'right' ? -10 : 10 }, {
			type: dynamics.spring,
			duration: 2000,
			friction: 600,
			complete: function() {
				dynamics.css(itemCurrent, { opacity: 0, visibility: 'hidden' });
			}
		});

		// animate the current title out
		dynamics.animate(currentTitleEl, { translateX: dir === 'right' ? -250 : 250, opacity: 0 }, {
			type: dynamics.bezier,
			points: [{"x":0,"y":0,"cp":[{"x":0.2,"y":1}]},{"x":1,"y":1,"cp":[{"x":0.3,"y":1}]}],
			duration: 450
		});

		// set the right properties for the next element to come in
		dynamics.css(itemNext, { opacity: 1, visibility: 'visible' });
		dynamics.css(nextEl, { opacity: 0, translateX: dir === 'right' ? nextEl.offsetWidth/2 : -1*nextEl.offsetWidth/2, rotateZ: dir === 'right' ? 10 : -10 });

		// animate the next element in
		dynamics.animate(nextEl, { opacity: 1, translateX: 0 }, {
			type: dynamics.spring,
			duration: 2000,
			friction: 600,
			complete: function() {
				items.forEach(function(item) { classie.remove(item, 'slide--current'); });
				classie.add(itemNext, 'slide--current');
			}
		});

		// set the right properties for the next title to come in
		dynamics.css(nextTitleEl, { translateX: dir === 'right' ? 250 : -250, opacity: 0 });
		// animate the next title in
		dynamics.animate(nextTitleEl, { translateX: 0, opacity: 1 }, {
			type: dynamics.bezier,
			points: [{"x":0,"y":0,"cp":[{"x":0.2,"y":1}]},{"x":1,"y":1,"cp":[{"x":0.3,"y":1}]}],
			duration: 650
		});
	}

	// disallow scrolling (on the scrollContainer)
	function noscroll() {
		if(!lockScroll) {
			lockScroll = true;
			xscroll = scrollContainer.scrollLeft;
			yscroll = scrollContainer.scrollTop;
		}
		scrollContainer.scrollTop = yscroll;
		scrollContainer.scrollLeft = xscroll;
	}

	// Router will be executed everytime url changes
	function router() {
		// get request
		var query = decodeURI(window.location.hash).substr(1);
		var params;

		// define a util function that allows to switch from a slide to any other
		var switchSlide = function () {
			items.forEach(function(item) { classie.remove(item, 'slide--current'); });
			items.forEach(function(item) { item.removeAttribute('style'); });
			var children = Array.prototype.slice.call(items[required].children);
			children.forEach(function(child) { child.removeAttribute('style'); });
			classie.add(items[required], 'slide--current');
		}

		// what are the requested view & content ?
		if (query.length > 0) {
			params = query.split('/');
			// is the query relevant ?
			if((params[0] === 'zoom' || params[0] === 'slider') && (contentList.indexOf(params[1]) > -1)) {
				requiredView = params[0];
				requiredContent = params[1];
				required = contentList.indexOf(requiredContent);
			} else {
				// If the query is not relevant, reinit state & go back to default page
				currentView = 'slider';
				current = 0;
				currentContent = contentList[0];
				window.location.hash = currentView + '/' + currentContent;
				return;
			}
		}

		// Identify if request is triggered by supported event or else from a direct browser interaction ?
		if ((requiredView !== currentView && current === required) || // open items or close content action ?
			((requiredView === currentView && requiredView === 'slider') // navigate in slider
				&& (Math.abs(required - current) === 1
					|| (current === itemsTotal - 1 && required === 0)
					|| (required === itemsTotal - 1 && current === 0) ))) {
			naturalRequest = true;
		} else {
			// User manually changed url or used backward / forward navigation
			naturalRequest = false;
		}

		// launch suitable animated transition
		if (requiredView === 'slider') {
			if (firstRendering) {
				classie.add(items[required], 'slide--current');
			} else if (currentView === 'slider') {
				if (naturalRequest) {
					if (required - current === 1 || required - current === -itemsTotal + 1) {
						navigate('right');
					} else {
						navigate('left');
					}
				} else {
					switchSlide();
				}
			} else {
				closeContent();
				if (!naturalRequest) {
					switchSlide();
				}
			}
		} else {
			if (firstRendering) {
				classie.add(items[required], 'slide--current');
				openItem(items[required]);
			} else if (currentView === 'slider') {
				if (!naturalRequest) {
					switchSlide();
				}
				openItem(items[required]);
			} else {
				closeContent();
				// workaround to wait until close animation is done
				setTimeout(function() {
					switchSlide();
					openItem(items[required]);
				}, 400);
			}
		}

		// former required become new current
		current = required;
		currentView = requiredView;
		currentContent = requiredContent;
	}

	// bind hash changes to router function
	window.onhashchange = router;

	init();

	// first rendering has been done.
	firstRendering = false;

})(window);
