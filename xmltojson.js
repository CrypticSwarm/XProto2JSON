var xml = require('node-xml')
  , writeFile = require('fs').writeFileSync
  , write = function(file, obj) { writeFile(file, JSON.stringify(obj, null, 2)) }
  , parser = new xml.SaxParser(parse)
  , ret = {}
  , contexts = {}

function parse(cb) {
  var cur = ret
    , stack = []
    , curList = []
    , getCurContext = function() {
      return stack[stack.length - 1] ? stack[stack.length - 1] : [function(){}, function(){}]
    }
  cb.onStartElementNS(function(elem, attrs){
    if (contexts[elem]) stack.push(contexts[elem])
    cur = getCurContext()[0](elem, attrsToHash(attrs), cur, ret)
    curList.push(cur)
  })

  cb.onEndElementNS(function(elem) {
    curList.pop()
    cur = curList[curList.length - 1]
    getCurContext()[1](elem)
    if (contexts[elem]) stack.pop(contexts[elem])
  })

  cb.onCharacters(function(chars){
    if (chars = chars.trim()) text.give(chars, cur)
  })

  cb.onEndDocument(function() {
    write('xRequests.json', ret.request)
//    write('xEvents.json', ret.event)
 //   write('xStructs.json', ret.struct)
  })
}

function asHash(obj, attr) {
  if (!obj[attr]) obj[attr] = {}
  return obj[attr]
}

function asArray(obj, attr) {
  if (!obj[attr]) obj[attr] = [] 
  return obj[attr]
}

function attrsToHash(attrs) {
  var ret = {}
  attrs.forEach(function(val) {
    ret[val[0]] = val[1]
  })
  return ret
}

function doFieldType(elem, attrs, cur, ret) {
  var field = asArray(cur, 'field')
  attrs.fieldType = elem
  field.push(attrs)
  return attrs
}

var text = (function(){
  var obj, k
  return { receive: function recieveText(cur, key) {
    obj = cur
    k = key
    return cur
  }
  , give: function giveText(str, cur) {
    if (!obj || cur != obj) return //should still be on the field that is accepting text
    if (obj[k]) {
      if (Array.isArray(obj[k])) return obj[k].push(str)
      if (typeof obj[k] == 'string') return obj[k] = [obj[k], str]
      else return console.log('oh no this isn\'t correct this field already has an object set.', obj, k)
    }
    obj[k] = str
  }}

})()

function doSubField(elem, attrs, cur, ret, c) {
  if (elem == 'fieldref' || elem == 'value') return text.receive(cur, elem)
  if (cur[elem]) console.log('overwriting?', elem, c, 'currently:', cur[elem])
  cur[elem] = attrs
  if (elem == 'op') {
    attrs.operation = attrs.op
    delete attrs.op
  }
  return cur[elem]
}

contexts.request = (function() {
var state = []

return [function request(elem, attrs, cur, ret) {
  var last = state[state.length - 1]
  state.push(elem)
  if (elem == 'request') {
    var reqs = asHash(ret, 'request')
      , name = attrs.name
    delete attrs.name
    reqs[name] = attrs
    return reqs[name]
  }
  if (elem == 'reply') {
    return asHash(cur, 'reply')
  }
  else {
    return (last == 'request' || last == 'reply') ? doFieldType(elem, attrs, cur, ret) : doSubField(elem, attrs, cur, ret, state)
  }
}, function endReq(elem) {
  state.pop()
}]
})()

contexts.struct = [function struct() {
}, function(){}]

contexts.event = [function event() {

}, function(){}]

parser.parseFile('xproto.xml')
