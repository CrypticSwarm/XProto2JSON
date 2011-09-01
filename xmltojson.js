var xml = require('node-xml')
  , writeFile = require('fs').writeFileSync
  , write = function(file, obj) { writeFile(file, JSON.stringify(obj, null, 2)) }
  , ret = {}
  , parser = new xml.SaxParser(parse)
  , state = []
  , acceptText = ['fieldref', 'bit', 'value', 'type']
  , namedFields = ['request', 'reply', 'struct', 'event', 'enum', 'error', 'errorcopy', 'eventcopy', 'xidunion', 'union', 'xidtype', 'typedef']
  , acceptFields = ['request', 'reply', 'struct', 'event', 'enum', 'error', 'errorcopy', 'eventcopy', 'union']

function parse(cb) {
  var cur = ret
    , curList = []

  cb.onStartElementNS(function(elem, attrs){
    var parent = state[state.length - 1]
    attrs = attrsToHash(attrs)
    state.push(elem)
    cur = namedFields.indexOf(elem) != -1 ? doPrimaryField(elem, attrs, cur, ret)
    : acceptFields.indexOf(parent) != -1    ? doFieldType(elem, attrs, cur, ret)
    : doSubField(elem, attrs, cur, ret)
    curList.push(cur)
  })

  cb.onEndElementNS(function(elem) {
    curList.pop()
    cur = curList[curList.length - 1]
    state.pop()
  })

  cb.onCharacters(function(chars){
    if (chars = chars.trim()) text.give(chars, cur)
  })

  cb.onEndDocument(function() {
    ret = ret.xcb
    write('xRequests.json', ret.request)
    write('xEvents.json', ret.event)
    write('xStructs.json', ret.struct)
  })
}

function attrsToHash(attrs) {
  var ret = {}
  attrs.forEach(function(val) {
    ret[val[0]] = val[1]
  })
  return ret
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

function doFieldType(elem, attrs, cur, ret) {
  var field = !cur.field ? cur.field = [] : cur.field
  attrs.fieldType = elem
  field.push(attrs)
  return attrs
}

function doSubField(elem, attrs, cur, ret) {
  if (acceptText.indexOf(elem) != -1) return text.receive(cur, elem)
  if (cur[elem]) console.log('overwriting?', elem, 'currently:', cur[elem], state)
  cur[elem] = attrs
  if (elem == 'op') {
    attrs.operation = attrs.op
    delete attrs.op
  }
  return cur[elem]
}

function doPrimaryField(elem, attrs, cur, ret) {
  var obj = !cur[elem] ? cur[elem] = {} : cur[elem]
    , name = elem == 'typedef' ? attrs.newname : attrs.name
  delete attrs.name
  return name ? (obj[name] = attrs) : obj
}

parser.parseFile('xproto.xml')
