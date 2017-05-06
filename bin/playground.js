const objA = { 'someText': 'A' };
const objB = { 'someText': 'B' };
const arr = [{ objA: JSON.parse(objA) }, { objB: JSON.parse(objB) }];
const obj = Object.assign({}, ...arr);

console.log(obj);
