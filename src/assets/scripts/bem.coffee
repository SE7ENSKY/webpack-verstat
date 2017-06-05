$.fn.mod = (name, value = on) ->
	@each ->
		$el = $(@)
		classAttr = $el.attr "class"
		blockName = classAttr.split(" ")[0]
		toRemove = classAttr.match new RegExp "#{blockName}_#{name}\\S*", "g"
		toAdd = null
		if value
			toAdd = "#{blockName}_#{name}"
			toAdd += "_#{value}" if value isnt on
			toRemove.splice toRemove.indexOf(toAdd), 1 if toRemove and toAdd in toRemove
		$el.removeClass toRemove.join " " if toRemove and toRemove.length > 0
		$el.addClass toAdd if toAdd
		$el.trigger "mod", [name, value]

$.block = (name) ->
	$(".#{name}")

$.fn.block = (name) ->
	@find ".#{name}"

$.fn.element = (name) ->
	classAttr = @attr "class"
	blockName = classAttr.split(" ")[0]
	@find ".#{blockName}__#{name}"