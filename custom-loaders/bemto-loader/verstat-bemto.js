const path = require('path');
const fs = require('fs');

const BEMTO = `${path.dirname(__filename)}/bemto.pug`;
const VERSTAT =
`mixin i(data1, data2, data3)
  - var data = {}
  - var redefines = []
  - if (typeof data1 === 'object') redefines.push(data1)
  - if (typeof data2 === 'object') redefines.push(data2)
  - if (typeof data3 === 'object') redefines.push(data3)
  - for (var i in redefines)
    - for (var k in redefines[i])
      - if (redefines[i].hasOwnProperty(k))
        - data[k] = redefines[i][k]

  - data._bemto_chain = bemto_chain.slice()
  - data._bemto_chain_contexts = bemto_chain_contexts.slice()
  - data._bemto_regex_element = bemto_regex_element
  - var blockName = bemto_chain[bemto_chain.length-1]
  != renderBlock(blockName, data)

if _bemto_chain
  - bemto_chain = _bemto_chain
  - bemto_chain_contexts = _bemto_chain_contexts
  - bemto_regex_element = _bemto_regex_element
`;

const readFile = fileName => fs.readFileSync(fileName, { encoding: 'utf8' });

module.exports = `${readFile(BEMTO)}\n${VERSTAT}`;
