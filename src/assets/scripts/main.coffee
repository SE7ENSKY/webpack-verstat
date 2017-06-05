# unless touch device
unless 'ontouchstart' in window or window.DocumentTouch and document instanceof DocumentTouch
	# replace tel: links to callto:
	$("a[href^='tel:']").each ->
		$(@).attr 'href', $(@).attr('href').replace('tel:', 'callto:')

$ ->
	FastClick.attach(document.body)

	$('.video-modal').fancybox
		openEffect: 'none'
		closeEffect: 'none'
		width: 960
		height: 540
		aspectRatio: true
		padding: 0
		helpers: media: {}

	$('.image-modal').fancybox()

	$('.select7').select7()

	$('[data-toggle="tooltip"]').tooltip()

	initIScroll = ->
		$scrollerWrapper = $('.scroller-wrapper')
		if $scrollerWrapper.length
			$scrollerWrapper.each ->
				new IScroll(
					@,
					mouseWheel: true,
					interactiveScrollbars: true,
					scrollbars: true
				)

	initIScroll()

	$('.modal').on('shown.bs.modal', initIScroll)
