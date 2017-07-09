import {
	debounce,
	throttle
} from 'lodash';


$(() => {
	const $block = $('.test-class');
	if (!$block.length) return;

	$block.addClass('.test-class_mod');
	function handleResize() {
		console.log('FIRE!');
	}
	$(window).on('resize', debounce(handleResize, 16));
});
