###
@name jquery-select7
@version 1.2.7
@author Se7enSky studio <info@se7ensky.com>
###
###! jquery-select7 1.2.7 http://github.com/Se7enSky/jquery-select7 ###

plugin = ($) ->
	
	"use strict"

	trim = (s) ->
		s.replace(///^\s*///, '').replace(///\s*$///, '')
	readItemsFromSelect = (el) ->
		if placeholderText = $(el).attr "placeholder"
			$(el).find("option:first").prop("disabled", yes).attr("data-is-placeholder", yes).text placeholderText
		readOption = (option) ->
			data = $(option).data()
			data.title = trim $(option).text()
			data.value = $(option).attr("value") or trim $(option).text()
			data.disabled = if $(option).attr "disabled" then yes else no
			data.class = c if c = $(option).attr "class"
			data
		readOptgroup = (optgroup) ->
			data = $(optgroup).data()
			data.isOptgroup = yes
			data.title = trim $(optgroup).attr "label"
			data.class = c if c = $(optgroup).attr "class"
			data.options = readOptionsAndOptgroups optgroup
			data
		readOptionsAndOptgroups = (el) ->
			(for item in $(el).find("> option, > optgroup")
				if $(item).is "option"
					readOption item
				else
					readOptgroup item
			)
		readOptionsAndOptgroups el
	readSelected = (el, items) ->
		selectedValue = $(el).val()
		for item in items
			if item.isOptgroup
				for option in item.options
					if option.value is selectedValue
						return option
			else if item.value is selectedValue
				return item
		if items.length > 0 and items[0].isPlaceholder
			return items[0]

		return null

	class Select7
		defaults:
			nativeDropdown: off
			readonly: off

		constructor: (@el, config) ->
			@$el = $ @el
			@$select7 = null
			@$drop = null
			@config = $.extend {}, @defaults, config
			@config.nativeDropdown = on if @$el.is ".select7_native_dropdown"
			@config.readonly = on if @$el.is ".select7_readonly"
			@config.removeCurrent = on if @$el.is ".select7_remove_current"
			@config.collapseOptgroups = on if @$el.is ".select7_collapse_optgroups"
			@config.sortActive = on if @$el.is ".select7_sort_active"
			{templateOptionFnName, templateOptgroupFnName, templateCurrentFnName} = @$el.data()
			if templateOptionFnName
				@config.optionTemplate = (args...) ->
					window[templateOptionFnName].call @, args...
			if templateOptgroupFnName
				@config.optgroupTemplate = (args...) ->
					window[templateOptgroupFnName].call @, args...
			if templateCurrentFnName
				@config.currentTemplate = (args...) ->
					window[templateCurrentFnName].call @, args...
			@updateItemsAndSelected()
			@opened = no
			@pwnSelect()

		updateItemsAndSelected: ->
			@items = readItemsFromSelect @el
			@selected = readSelected @el, @items

		pwnSelect: ->
			@$el.hide() unless @config.nativeDropdown

			classes = @$el.attr("class").split(" ")
			classes.splice classes.indexOf("select7"), 1

			select7Markup = """
				<div class="select7 #{classes.join ' '}">
					<div class="select7__current">
						<span data-role="value" class="select7__current-value" data-value=""></span><span class="select7__caret"></span>
					</div>
				</div>
			"""
			@$select7 = $ select7Markup
			
			@$el.data "updateCurrentFn", => @updateCurrent()
			@$el.on "change", @$el.data "updateCurrentFn"
			@updateCurrent()
			
			unless @config.nativeDropdown
				@$select7.find(".select7__current").click => @toggle()

			@$el.after @$select7
			if @config.nativeDropdown
				@$el.css
					position: "absolute"
					transformOrigin: "top left"
					zIndex: 1
					opacity: 0
					margin: 0
					padding: 0
				v = ($el, k) -> parseFloat $el.css(k).replace("px", "")
				w = ($el) -> v($el, "width") + v($el, "padding-left") + v($el, "padding-right") + v($el, "border-left-width") + v($el, "border-right-width")
				h = ($el) -> v($el, "height") + v($el, "padding-top") + v($el, "padding-bottom") + v($el, "border-top-width") + v($el, "border-bottom-width")
				@$el.css
					transform: "scaleX(#{ w(@$select7) / w(@$el) }) scaleY(#{ h(@$select7) / h(@$el) })"
		updateCurrent: ->
			@updateItemsAndSelected()
			# @$el.toggleClass "select7_noopts" if @optionsCount  # 2b reviewed
			$value = @$select7.find("[data-role='value']")
			@selected = { isPlaceholder: yes, title: "-" } if @selected is null
			$value.attr "data-value", if @selected.isPlaceholder then "" else @selected.value
			$value.toggleClass "select7__placeholder", !!@selected.isPlaceholder
			if @config.currentTemplate
				$value.html @config.currentTemplate.call @, @selected, @items
			else
				$value.text @selected.title
				$value.find(".select7__icon").remove()
				$value.prepend """<span class="select7__icon"><img src="#{@selected.icon}"></span>""" if @selected.icon
		
		open: ->
			return if @opened
			@items = readItemsFromSelect @el
			return if @items.length is 0
			@$drop = $ """<ul class="select7__drop"></ul>"""
			@$drop = $ """<div class="select7__drop"></div>"""
			$dropList = $ """<ul class="select7__drop-list"></ul>"""
			@$drop.append $dropList
			generate$option = (option) =>
				$option = $ """<li class="select7__option #{option.class or ""}"></li>"""
				if @config.optionTemplate
					$option.html @config.optionTemplate.call @, option, @items
				else
					$option.text option.title
				$option.addClass "select7__option_disabled" if option.disabled
				$option.addClass "select7__option_current" if option is @selected
				$option.prepend """<span class="select7__icon"><img src="#{option.icon}"></span>""" if option.icon
				$option.data "option", option
				$option
			generate$optgroup = (optgroup) =>
				$optgroup = $ """<li class="select7__optgroup #{optgroup.class or ""}"></li>"""
				$optgroup.addClass "select7__optgroup_collapse" if @config.collapseOptgroups
				hasCurrent = no
				$label = $ """<span class="select7__optgroup-label"></span>"""
				if @config.optgroupTemplate
					$label.html @config.optgroupTemplate.call @, optgroup, @items
				else
					$label.text optgroup.title
				$optgroup.append $label
				if item.options
					$ul = $ """<ul class="select7__optgroup-items"></ul>"""
					for option in item.options
						hasCurrent = yes if option is @selected
						continue if @config.removeCurrent and option is @selected
						$ul.append generate$option option
					$optgroup.append $ul
				$optgroup.addClass "select7__optgroup_collapse_open" if @config.collapseOptgroups and hasCurrent
				$optgroup
			if @config.sortActive
				activeArray = []
				disableArray = []
				for item, i in @items
					if item.disabled && !(item.isPlaceholder)
						disableArray.push(item)
					else
						activeArray.push(item)
				@items = activeArray.concat(disableArray)
				
			for item, i in @items
				continue if item.isPlaceholder
				continue if @config.removeCurrent and item is @selected
				$dropList.append if item.isOptgroup
					generate$optgroup item
				else
					generate$option item
			@$drop.on "click", ".select7__option", (e) =>
				unless @config.readonly
					$el = $(e.currentTarget)
					option = $el.data "option"
					return if option.disabled
					if option.href
						window.location.href = option.href
						return
					@$el.val(option.value).trigger("change")
				@close()
			@$drop.on "click", ".select7__optgroup_collapse", (e) =>
				$optgroup = $(e.currentTarget)
				$optgroup.toggleClass "select7__optgroup_collapse_open"
			@$select7.append @$drop
			@$select7.addClass "select7_open"
			@opened = yes
			$("body").trigger "select7Opened"
			setTimeout =>
				@$drop.click (e) -> e.stopPropagation()
				@$drop.data "closeFn", => @close()
				$("body").on "click select7Opened", @$drop.data "closeFn"
			, 1
		close: ->
			return unless @opened
			@$select7.removeClass "select7_open"
			$("body").off "click select7Opened", @$drop.data "closeFn"
			@$drop.remove()
			@$drop = null
			@opened = no
		toggle: ->
			if @opened then @close() else @open()

		destroy: ->
			close() if @opened
			@$select7.remove()
			@$el.off "change", @$el.data "updateCurrentFn"
			@$el.data "updateCurrentFn", null
			@$el.data "select7", null
			@$el.show()

	$.fn.select7 = (method, args...) ->
		@each ->
			select7 = $(@).data 'select7'
			unless select7
				select7 = new Select7 @, if typeof method is 'object' then option else {}
				$(@).data 'select7', select7
			
			select7[method].apply select7, args if typeof method is 'string'

# UMD
if typeof define is 'function' and define.amd # AMD
	define(['jquery'], plugin)
else # browser globals
	plugin(jQuery)