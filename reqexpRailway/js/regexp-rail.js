let parsePattern = (function () {

  var str = '(a(a(a)?)+)*(p|d|(?<testname>ccc|ddd|eee|fff))(?!foo)(hufa|((a{2,4}b{0,99}c{1,99}d{3}e{4}f{4,})*)*(?:[^aeiwu]*)*(cd|ef|(fo[odc]+)+dd)+c[def]|def|abc)'
  var str = '(a(a(a)?)+)*(p|d|(?<testname>ccc|ddd|eee|fff))(?:foo)(hufa|((a{2,4}b{0,99}c{1,99}d{3}e{4}f{4,})*)*(?:[^aeiwu]*)*(cd|ef|(fo[odc]+)+dd)+c[def]|def|abc)'
  var str = '(a(a(a)?)+)*(p|d|(ccc|ddd|eee|fff))(?!foo)(hufa|((a{2,4}b{0,99}c{1,99}d{3}e{4}f{4,})*)*(?:[^a-ceiwu0-9]*)*(cd|ef|(fo[odc]+)+dd)+c[def]|def|abc)'

  var i = 0
  var groupIndex = 1

  // 路由函数，根据遇到的字符，解析出对应的元素个体，如一个字符，一个字符集合，一个量词，一个捕获组等。
  function parseOneElement() {
    if (str[i] == '[') { // 解析一个字符集合
      return parseCharacterClass()
    }
    if (str[i] == '(') { // 解析一个捕获组
      return parseCaptureGroup()
    }
    if (str[i] == '\\') { // 解析一个转义字符
      return parseEscape()
    }
    if (str[i] == '?' || str[i] == '*' || str[i] == '+' || str[i] == '{') { // 解析一个量词
      return parseQuantifier()
    }
    return parseCharacter() // 解析一个字符
  }

  // 解析一个单独的字符，形如 a
  function parseCharacter() {
    var node = {
      type: 'Character',
      start: i,
      end: 0,
      raw: '',
      value: str[i],
      ascii: str.charCodeAt(i),
    }
    i++
    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  // 解析一个字符集合，形如 [abc]，[0-9]
  function parseCharacterClass() {
    var node = {
      type: 'CharacterClass',
      start: i,
      end: 0,
      raw: '',
      elements: [],
      revert: false, // 字符集是否取反
    }
    i++ // skip [
    if (str[i] == '^') {
      node.revert = true
      i++ // skip ^
    }

    while (str[i] !== ']') {
      var charNode = parseCharacter()
      if (charNode.value == '-') { // 简写字符集，形如 0-9
        var prevChar = node.elements.pop()
        var nextChar = parseCharacter()
        var shortClassNode = {
          type: 'CharacterShortClass',
          start: prevChar.start,
          end: nextChar.end,
          raw: '',
          startChar: prevChar,
          endChar: nextChar,
        }
        shortClassNode.raw = str.slice(shortClassNode.start, shortClassNode.end)
        node.elements.push(shortClassNode)
      } else { // 单个字符
        node.elements.push(charNode)
      }
    }
    i++ // skip ]
    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  // 解析一个量词，形如 A*、A+、A?、A{3}
  function parseQuantifier() {
    var node = {
      type: 'Quantifier',
      start: i,
      end: 0,
      raw: '',
      element: null, // 重复的模式
      greedy: true, // 是否贪婪匹配
      min: 0,
      max: Infinity,
    }
    if (str[i] == '*') {
      i++ // skip *
    } else if (str[i] == '?') {
      node.max = 1
      i++ // skip ?
    } else if (str[i] == '+') {
      node.min = 1
      i++ // skip +
    } else if (str[i] == '{') { // 形如 {111,222}、{222,}、{333}
      i++ // skip {
      var min = parseNumber()
      node.min = min
      if (str[i] == '}') { // {333}
        node.max = min
        i++ // skip }
      } else { // {111,222}、{222,}
        i++ // skip ,
        if (str[i] == '}') { // {222,}
          i++ // skip } 
        } else { // {111,222}
          var max = parseNumber()
          node.max = max
          i++ // skip }
        }
      }
    }
    if (str[i] == '?') { // 非贪婪匹配
      node.greedy = false
      i++ // skip ?
    }
    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  // 解析一个数字
  function parseNumber() {
    var numStr = ''
    while (str[i] >= '0' && str[i] <= '9') {
      numStr += str[i]
      i++
    }
    return Number(numStr)
  }

  // 解析出单个分支，形如 ab?c[def]*(ghi) 
  function parseAlternative() {
    var node = {
      type: 'Alternative',
      start: i,
      end: 0,
      raw: '',
      elements: [],
    }

    // 当遇到 | 或 ) 或解析到末尾时，停止解析
    while (str[i] !== '|' && str[i] !== ')' && i < str.length) {
      var element = parseOneElement() // 解析出单个分支中的一个独立元素
      if (element.type == 'Quantifier') { // 如果解析出了量词，就把之前 push 的单个元素取出，和量词组成新的个体
        var quantifierElement = element
        var prevElement = node.elements.pop()
        if (prevElement.type == 'Quantifier') {
          throw new SyntaxError('unexpected quantifier at pos: ' + i)
        }
        quantifierElement.element = prevElement
        quantifierElement.start = prevElement.start
        quantifierElement.raw = str.slice(quantifierElement.start, quantifierElement.end)
        node.elements.push(quantifierElement)
      } else {
        node.elements.push(element)
      }
    }

    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  // 解析出所有的分支，形如 aaa|bbb|c?d[def]|(ghi)
  function parseAlternatives() {
    var alternatives = []
    do {
      var alt = parseAlternative()
      alternatives.push(alt)
      if (str[i] == '|') {
        i++ // skip |
      } else if (str[i] == ')') {
        break
      } else if (i >= str.length) {
        break
      }
    } while (true)
    return alternatives
  }

  // 解析捕获组，形如 (abc|def)、(?:abc)、(?=abc)、(?!abc)、(?<=abc)、(?<!abc)、(?<name>abc)
  function parseCaptureGroup() {
    var node = {
      type: 'CaptureGroup',
      start: i,
      end: 0,
      raw: '',
      capture: true, // 是否是捕获组，如果形如 (?:abc)，则不是捕获组
      assertion: false, // 是否是零宽断言
      lookahead: true, // 是否是预测断言，false 为回顾断言
      positive: true, // 是否是正向断言，false 为负向断言
      index: groupIndex++, // 分组编号
      name: null, // 分组名称
    }
    i++ // skip (
    if (str[i] == '?') { // (?:abc)、(?=abc)、(?!abc)、(?<=abc)、(?<!abc)、(?<name>abc)
      i++ // skip ?
      if (str[i] == ':') { // (?:abc)
        node.index = 0
        groupIndex--
        node.capture = false
        i++ // skip : 
      } else if (str[i] == '=') { // (?=abc)
        node.index = 0
        groupIndex--
        node.assertion = true
        i++ // skip =
      } else if (str[i] == '!') { // (?!abc)
        node.index = 0
        groupIndex--
        node.assertion = true
        node.positive = false
        i++ // skip !
      } else if (str[i] == '<') { // (?<=abc)、(?<!abc)、(?<name>abc)
        i++ // skip <
        if (str[i] == '=') { // (?<=abc)
          node.index = 0
          groupIndex--
          node.assertion = true
          node.lookahead = false
          i++ // skip =
        } else if (str[i] == '!') { // (?<!abc)
          node.index = 0
          groupIndex--
          node.assertion = true
          node.lookahead = false
          node.positive = false
          i++ // skip !
        } else { // (?<name>abc)
          var name = parseGroupName()
          node.name = name
          i++ // skip >
        }
      }
    }
    node.alternatives = parseAlternatives()
    i++ // skip )

    node.end = i
    node.raw = str.slice(node.start, node.end)
    return node
  }

  // 解析具名分组字符串
  function parseGroupName() {
    var simStr = ''
    while (str[i] !== '>') {
      simStr += str[i]
      i++
    }
    return simStr.trim()
  }

  // 解析一个正则表达式模式
  function parsePattern(input) {
    str = input
    i = 0
    groupIndex = 1

    return {
      type: 'Pattern',
      alternatives: parseAlternatives(),
      raw: input,
    }
  }

  return parsePattern
})()


let createRegExpGraph = (function () {

  var svg = document.querySelector('svg')
  var padding = 10

  // 路由函数，根据遇到的节点类型，绘制出不同的 svg 节点
  function createGraph(node) {
    if (node.type === 'Character') { // 绘制一个字符
      return createCharacterGraph(node)
    }
    if (node.type === 'CharacterClass') { // 绘制一个字符集合
      return createCharacterClassGraph(node)
    }
    if (node.type === 'CharacterShortClass') { // 绘制一个字符缩写集合
      return createCharacterShortClassGraph(node)
    }
    if (node.type === 'Quantifier') { // 绘制一个量词
      return createQuantifierGraph(node)
    }
    if (node.type === 'Alternative') { // 绘制一条路径
      return createAlternativeGraph(node)
    }
    if (node.type === 'Alternatives') { // 绘制所有的路径
      return createAlternativesGraph(node)
    }
    if (node.type === 'CaptureGroup') { // 绘制一个捕获组
      return createCaptureGroupGraph(node)
    }
    if (node.type === 'Pattern') { // 绘制一个模式
      return createPatternGraph(node)
    }
  }

  // 绘制一个单独的字符，形如 a
  function createCharacterGraph(node) {
    var text = svgElt('text', {
      y: 25,
      x: padding,
    })
    text.textContent = node.value
    var textBox = text.getBBox()
    var g = svgElt('g')
    var rect = svgElt('rect', {
      width: textBox.width + 2 * padding,
      height: textBox.height + 2 * padding,
      fill: '#dae9e5',
      rx: padding / 4,
      ry: padding / 4,
    })
    g.append(rect)
    g.append(text)

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 绘制一个字符缩写集合，形如 [0-9]
  function createCharacterShortClassGraph(node) {
    var text = svgElt('text', {
      y: 25,
      x: padding,
    })
    text.textContent = `${node.startChar.value} - ${node.endChar.value}`

    var textBox = text.getBBox()
    var g = svgElt('g')
    var rect = svgElt('rect', {
      width: textBox.width + 2 * padding,
      height: textBox.height + 2 * padding,
      fill: '#dae9e5',
      rx: padding / 4,
      ry: padding / 4,
    })
    g.append(rect)
    g.append(text)

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 绘制一个字符集合，形如 [abc]，将字符集合中的每一个部分的字符纵向拼接起来
  function createCharacterClassGraph(node) {
    var subGraphs = node.elements.map(createGraph)

    // 创建字符集合的文案
    var str = ''
    if (node.revert == false) {
      str += 'One of : '
    } else {
      str += 'None of : '
    }
    var text = createTextGraph(str)

    var width = subGraphs.map(it => it.box.width).reduce(max) + 2 * padding
    var height = subGraphs.map(it => it.box.height).reduce(add) + (subGraphs.length + 1) * padding
    width = Math.max(width, text.box.width)

    var g = svgElt('g')
    var rect = svgElt('rect', {
      width: width,
      height: height + 4 * padding,
      fill: 'none',
    })
    var bgRect = svgElt('rect', {
      width: width,
      height: height,
      rx: padding / 2,
      ry: padding / 2,
      fill: '#cbcbba',
    })
    g.append(rect)
    g.append(bgRect)
    g.append(text.g)

    bgRect.style.transform = `translate(0px, ${2 * padding}px)`

    var offset = 3 * padding
    for (var graph of subGraphs) { // 将每一个子图偏移到正确的位置
      graph.g.style.transform = `translate(${(width - graph.box.width) / 2}px, ${offset}px)`
      g.append(graph.g)
      offset = offset + graph.box.height + padding // 更新偏移量
    }

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 绘制出单个分支，形如 ab?c[def]*(ghi)，将内部每个独立元素的 svg 图横向拼接起来
  function createAlternativeGraph(node) {
    var subGraphs = node.elements.map(createGraph) // 由每个独立元素，创建出它对应的 svg 图，并返回对应的 g 标签
    var width = subGraphs.map(it => it.box.width).reduce(add) + (subGraphs.length + 1) * padding // 底图的宽度为所有元素宽度和间隙之和
    var height = subGraphs.map(it => it.box.height).reduce(max) + 2 * padding // 底图的高度为最高的元素的高度和间隙之和
    var g = svgElt('g')
    var rect = svgElt('rect', {
      width: width,
      height: height,
      fill: 'none',
    })
    g.append(rect)

    var line = svgElt('path', {
      stroke: 'black',
      'stroke-width': '2',
      fill: 'none',
    })
    var d = '' // 线的路径指令
    g.append(line)

    var offset = padding
    for (var graph of subGraphs) { // 将每一个子图偏移到正确的位置
      graph.g.style.transform = `translate(${offset}px,${(height - graph.box.height) / 2}px)`
      g.append(graph.g)

      d += `M ${offset} ${height / 2} h -${padding}` // 增加线的路径指令

      offset = offset + graph.box.width + padding // 更新偏移量
    }
    d += `M ${offset} ${height / 2} h -${padding}`
    line.setAttribute('d', d)

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 绘制出所有的分支，形如 aaa|bbb|c?d[def]|(ghi)，将每一条分支纵向拼接起来
  function createAlternativesGraph(nodes) {
    var subGraphs = nodes.map(createGraph)
    var width = subGraphs.map(it => it.box.width).reduce(max) + 6 * padding
    var height = subGraphs.map(it => it.box.height).reduce(add) + (subGraphs.length + 1) * padding

    // 如果只有一条分支，不需要增加额外的宽度
    if (nodes.length == 1) {
      width = subGraphs.map(it => it.box.width).reduce(max)
    }

    var g = svgElt('g')
    var rect = svgElt('rect', {
      width: width,
      height: height,
      fill: 'none',
    })
    g.append(rect)

    var path = svgElt('path', {
      stroke: 'black',
      'stroke-width': '2',
      fill: 'none',
    })
    g.append(path)
    var d = '' // path 的路径指令

    var offset = padding
    for (var graph of subGraphs) { // 将每一个子图偏移到正确的位置
      graph.g.style.transform = `translate(${(width - graph.box.width) / 2}px, ${offset}px)`
      g.append(graph.g)

      // 绘制连接线
      d += `M ${0} ${height / 2} h ${padding / 2} 
    C ${padding * 1.5} ${height / 2} ${padding * 1.5} ${offset + graph.box.height / 2} ${padding * 2.5} ${offset + graph.box.height / 2} 
    L ${(width - graph.box.width) / 2} ${offset + graph.box.height / 2} `

      d += `M ${width} ${height / 2} h ${- padding / 2} 
    C ${width - padding * 1.5} ${height / 2} ${width - padding * 1.5} ${offset + graph.box.height / 2} ${width - padding * 2.5} ${offset + graph.box.height / 2} 
    L ${width - (width - graph.box.width) / 2} ${offset + graph.box.height / 2} `

      offset = offset + graph.box.height + padding // 更新偏移量
    }
    path.setAttribute('d', d)

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 绘制一个正则表达式模式
  function createPatternGraph(node) {
    var graph = createAlternativesGraph(node.alternatives)
    var width = graph.box.width + 6 * padding
    var height = graph.box.height + 2 * padding

    var g = svgElt('g')
    var rect = svgElt('rect', {
      width: width,
      height: height,
      fill: 'none',
    })
    g.append(rect)

    // 绘制正则表达式的起点和终点
    var path = svgElt('path', {
      stroke: 'black',
      'stroke-width': '2',
      fill: 'black',
    })
    g.append(path)
    var d = '' // path 的路径指令

    d += `M ${padding / 2} ${height / 2} h ${3 * padding} 
  M ${padding / 2} ${height / 2} 
  a ${padding} ${padding} 0 1 1 ${2 * padding} ${0} 
  a ${padding} ${padding} 0 1 1 ${-2 * padding} ${0} 
  M ${width - padding / 2} ${height / 2} h ${-3 * padding} 
  M ${width - padding / 2} ${height / 2} 
  a ${padding} ${padding} 0 1 1 ${-2 * padding} ${0} 
  a ${padding} ${padding} 0 1 1 ${2 * padding} ${0} `
    path.setAttribute('d', d)

    graph.g.style.transform = `translate(${3 * padding}px, ${padding}px)`
    g.append(graph.g)

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 绘制一个捕获组
  function createCaptureGroupGraph(node) {
    var graph = createAlternativesGraph(node.alternatives)

    // 如果是一个空的捕获组 (?:foo) ，直接返回
    if (node.capture == false) {
      return graph
    }

    // 创建捕获组的文案
    if (node.index > 0) {
      var str = ''
      str += `Group #${node.index} `

      if (node.name) {
        str += '#' + node.name
      }
      var text = createTextGraph(str)

    } else if (node.assertion == true) {
      var str = ''
      if (node.positive == true) {
        str += 'positive '
      } else {
        str += 'negative '
      }

      if (node.lookahead == true) {
        str += 'lookahead'
      } else {
        str += 'lookbehand'
      }
      var text = createTextGraph(str)
    }

    var width = Math.max(graph.box.width + 2 * padding, text.box.width)
    var height = graph.box.height + 4 * padding

    var g = svgElt('g')
    var rect = svgElt('rect', {
      width: width,
      height: height,
      fill: 'none',
    })
    g.append(rect)

    // 添加捕获组文案
    if (node.index >= 0) {
      g.append(text.g)
    }

    // 捕获组连线
    var path = svgElt('path', {
      stroke: 'black',
      'stroke-width': '2',
      fill: 'none',
    })
    g.append(path)
    var d = '' // path 的路径指令
    d += `M ${0} ${height / 2} h ${(width - graph.box.width) / 2} 
  M ${width} ${height / 2} h ${-(width - graph.box.width) / 2}`
    path.setAttribute('d', d)

    // 捕获组虚线边框
    var border = svgElt('rect', {
      width: width,
      height: graph.box.height,
      rx: padding / 2,
      ry: padding / 2,
      fill: 'none',
      stroke: 'grey',
      'stroke-width': '2',
      'stroke-dasharray': '4 5',
    })
    border.style.transform = `translate(0px, ${2 * padding}px)`
    g.append(border)

    graph.g.style.transform = `translate(${(width - graph.box.width) / 2}px, ${2 * padding}px)`
    g.append(graph.g)

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 绘制一个量词
  function createQuantifierGraph(node) {
    var subGraph = createGraph(node.element)

    // 创建量词的文案
    var str = ''
    if (node.max == Infinity) { // {2,} {12,}
      if (node.min >= 2) {
        str += `at least ${node.min - 1} times`
      }
    } else {
      if (node.min <= 1) { // {0,55} {1,55}
        if (node.max >= 2) {
          str += `at most ${node.max - 1} times`
        }
      } else if (node.min == node.max) { // {2} {25} {11,11}
        str += `${node.min - 1} times`
      } else { // {2,5}
        str += `${node.min - 1}~${node.max - 1} times`
      }
    }
    var text = createTextGraph(str)

    var height = subGraph.box.height + 6 * padding
    var width = node.min == 0 ? subGraph.box.width + 4 * padding : subGraph.box.width + 2 * padding

    if (str !== '') {
      width = Math.max(width, text.box.width)
    }

    var g = svgElt('g')
    var rect = svgElt('rect', {
      width: width,
      height: height,
      fill: 'none',
    })
    g.append(rect)

    // 添加文案
    text.g.style.transform = `translate(0px, ${height - text.box.height}px)`
    g.append(text.g)

    subGraph.g.style.transform = `translate(${(width - subGraph.box.width) / 2}px, ${3 * padding}px)`
    g.append(subGraph.g)

    var path = svgElt('path', {
      stroke: 'black',
      'stroke-width': '2',
      fill: 'none',
    })
    g.append(path)
    var d = '' // path 的路径指令
    d += `M ${0} ${height / 2} h ${(width - subGraph.box.width) / 2} 
  M ${width} ${height / 2} h ${-(width - subGraph.box.width) / 2}`

    if (node.min == 0) {
      d += `M ${(width - subGraph.box.width) / 2 - 2 * padding} ${height / 2} 
    a ${padding} ${padding} 0 0 0 ${padding} ${-padding} 
    V 32 
    a ${padding} ${padding} 0 0 1 ${padding} ${-padding} 
    h ${subGraph.box.width} 
    a ${padding} ${padding} 0 0 1 ${padding} ${padding} 
    V ${height / 2 - padding} 
    a ${padding} ${padding} 0 0 0 ${padding} ${padding} `
    }
    if (node.max > 1) {
      d += `M ${(width - subGraph.box.width) / 2} ${height / 2} 
    a ${padding} ${padding} 0 0 0 ${-padding} ${padding} 
    V ${height - 32} 
    a ${padding} ${padding} 0 0 0 ${padding} ${padding} 
    h ${subGraph.box.width} 
    a ${padding} ${padding} 0 0 0 ${padding} ${-padding} 
    V ${height / 2 + padding} 
    a ${padding} ${padding} 0 0 0 ${-padding} ${-padding} `
    }
    path.setAttribute('d', d)

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 绘制一段文本
  function createTextGraph(textStr) {
    var text = svgElt('text', {
      'dominant-baseline': 'text-before-edge'
    })
    text.textContent = textStr
    var textBox = text.getBBox()
    var rect = svgElt('rect', {
      width: textBox.width,
      height: textBox.height,
      fill: 'none',
    })

    var g = svgElt('g')
    g.append(rect)
    g.append(text)

    return {
      g: g,
      box: g.getBBox(),
    }
  }

  // 创建一个 svg 元素
  function svgElt(tagName, attrs) {
    var el = document.createElementNS('http://www.w3.org/2000/svg', tagName)
    for (var key in attrs) {
      var val = attrs[key]
      el.setAttribute(key, val)
    }
    svg.append(el)
    return el
  }

  function add(a, b) {
    return a + b
  }

  function max(a, b) {
    return Math.max(a, b)
  }

  return createPatternGraph
})()


// var str = '(a(a(a)?)+)*(p|d|(ccc|ddd|eee|fff))(?!foo)(hufa|((a{2,4}b{0,99}c{1,99}d{3}e{4}f{4,})*)*(?:[^a-ceiwu0-9]*)*(cd|ef|(fo[odc]+)+dd)+c[def]|def|abc)'
// var node = parsePattern(str)
// createRegExpGraph(node)

var regexpInput = document.querySelector('.regexpInput')
var createGraph = document.querySelector('#createGraph')
var downloadsvg = document.querySelector('#downloadsvg')
var downloadpng = document.querySelector('#downloadpng')
var svg = document.querySelector('svg')

createGraph.addEventListener('click', function () {
  svg.innerHTML = ''
  var str = regexpInput.value
  var node = parsePattern(str)
  var graph = createRegExpGraph(node)
  svg.setAttribute('width', `${graph.box.width}`)
  svg.setAttribute('height', `${graph.box.height}`)
})

downloadsvg.addEventListener('click', function () {
  let svgSource = svg.innerHTML // 获取 svg 内部的 html 内容

  // 获取 svg 元素的布局宽高
  let svgStyle = getComputedStyle(svg)
  let width = parseFloat(svgStyle.width)
  let height = parseFloat(svgStyle.height)

  // 创建 svg 文件头
  let headStr = `<?xml version="1.0" encoding="utf-8"?> <svg version="1.1" width="${width}" height="${height}" 
  viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">`

  // 创建 svg 文件尾
  let tailStr = `</svg>`

  // 使用 svg 文件头、文件内容、文件尾，拼接并创建 svg 文件
  let blob = new Blob([headStr, svgSource, tailStr], {
    type: 'image/xml+svg'
  })

  // 生成该 svg 文件的地址，创建 a 标签指向这个地址，并为其添加 download 属性，并模拟点击 a 标签，触发下载
  let url = URL.createObjectURL(blob)
  let anchor = document.createElement('a')
  anchor.href = url
  anchor.download = 'undefined.svg'
  anchor.click()
})

downloadpng.addEventListener('click', function () {
  var serializer = new XMLSerializer()
  var toExport = svg.cloneNode(true)
  var box = svg.getBBox()
  toExport.setAttribute('viewBox', `${box.x} ${box.y} ${box.width} ${box.height}`)
  toExport.setAttribute('width', box.width)
  toExport.setAttribute('height', box.height)

  var source = '<?xml version="1.0" standalone="no"?>\r\n' + serializer.serializeToString(toExport)
  var image = new Image
  image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(source)

  var canvas = document.createElement('canvas')
  canvas.width = box.width
  canvas.height = box.height

  var context = canvas.getContext("2d")
  context.fillStyle = '#fff' // 设置保存后的 PNG 是白色的
  context.fillRect(0, 0, 10000, 10000)

  image.onload = function () {
    context.drawImage(image, 0, 0)
    var a = document.createElement('a')
    a.href = canvas.toDataURL("image/png")
    a.download = 'undefined.png'
    a.click()
  }
})
