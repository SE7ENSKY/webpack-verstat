import FastClick from 'fastclick';

$ ->
	unless Modernizr.touchevents
		# replace tel: links to callto:
		$("a[href^='tel:']").each ->
			$(@).attr 'href', $(@).attr('href').replace('tel:', 'callto:')
		window.touchDevice = false
	else
		window.touchDevice = true

	FastClick.attach(document.body)