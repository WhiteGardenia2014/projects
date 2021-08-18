window.addEventListener('load', function () {
  var svgContainer = document.querySelector('.svgcontainer')
  var svg = document.querySelector('svg')
  var fill = document.querySelector('#fillInput') // 是否填充按钮
  var borderColorInput = document.querySelector('#borderColorInput') // 边框颜色
  var fillColorInput = document.querySelector('#fillColorInput') // 填充颜色
  var widthInput = document.querySelector('#widthInput') // 线条粗细
  var widthSpan = document.querySelector('.line-width-value') // 线条粗细显示文字
  var clearButton = document.querySelector('.clear') // 清空按钮
  var reset = document.querySelector('.reset') // 重置按钮
  var save = document.querySelector('.save') // 保存按钮
  var openFile = document.querySelector('.open') // 打开按钮
  var fileInput = document.querySelector('#fileInput') // 上传文件按钮
  var tools = document.querySelector('.tools') // 工具栏

  var radioLine = document.querySelector('#tool-line') // 画线工具 radio
  var currentTool = 'tool-line' // 设置默认为画线工具
  var drawandnosave = false // 是否是未保存的状态

  // 更新宽度输入框的显示值
  widthInput.addEventListener('input', function (e) {
    widthSpan.textContent = widthInput.value
  })

  // 在 svg 上监听鼠标按下事件，鼠标按下后触发鼠标移动事件
  svgContainer.addEventListener('mousedown', function (e) {

    if (e.buttons == 1) { // 如果在 svg 内按下了左键，就添加鼠标移动监听器
      drawandnosave = true

      if (currentTool == 'tool-line') { // 如果是铅笔工具的情况
        // 注意 draw 函数定义在 if 语句内部，在 if 语句外部（ if 语句之前），draw = undefined

        document.addEventListener('mousemove', drawLine) // 添加鼠标移动监听器
        e.preventDefault()

        let pos = mousePos(svg) // 按下左键时，记录第一个点的位置
        let polyline = document.createElementNS('http://www.w3.org/2000/svg', 'polyline') // 创建折线节点
        let start = true

        polyline.setAttribute('fill', 'none') // 设置折线不填充
        polyline.setAttribute('stroke', borderColorInput.value) // 设置折线颜色
        polyline.setAttribute('stroke-width', widthInput.value) // 设置折线粗细
        polyline.setAttribute('stroke-linecap', 'round') // 设置折线两端为圆角
        polyline.setAttribute('stroke-linejoin', 'round') // 设置折线折点处为圆角

        let points = `${pos.x} ${pos.y} `
        polyline.setAttribute('points', points) // 将第一个点的位置添加到 polyline 上


        // 鼠标移动时触发的画线程序
        function drawLine(e) {
          if (e.buttons !== 1) { // 如果松开了左键，就移除鼠标移动监听器
            document.removeEventListener('mousemove', drawLine)
            return
          } else {
            if (start) { // 只有鼠标第一次移动后，才把折线添加进 svg 中，避免 svg 中出现无意义的点
              start = false
              svg.append(polyline)
            }
            let pos = mousePos(svg) // 每次鼠标移动，获取当前鼠标位置
            points += `${pos.x} ${pos.y} ` // 并将当前位置拼接到 points 上
            polyline.setAttribute('points', points) // 用 points 更新 polyline 的内容
          }
        }
      }

      if (currentTool == 'tool-straight-line') { // 如果是直线工具的情况
        document.addEventListener('mousemove', drawStraightLine)
        e.preventDefault()

        let startPos = mousePos(svg)
        let line = document.createElementNS('http://www.w3.org/2000/svg', 'line') // 创建直线节点
        let start = true

        line.setAttribute('stroke', borderColorInput.value)
        line.setAttribute('stroke-width', widthInput.value)
        line.setAttribute('stroke-linecap', 'round') // 设置直线两端为圆角

        // 画直线程序
        function drawStraightLine(e) {
          if (e.buttons !== 1) {
            document.removeEventListener('mousemove', drawStraightLine)
            return
          } else {
            if (start) {
              start = false
              svg.append(line)
            }
            let currPos = mousePos(svg)
            let x1 = startPos.x
            let y1 = startPos.y
            let x2 = currPos.x
            let y2 = currPos.y

            line.setAttribute('x1', x1)
            line.setAttribute('y1', y1)
            line.setAttribute('x2', x2)
            line.setAttribute('y2', y2)
          }
        }
      }

      if (currentTool == 'tool-ellipse') { // 如果是椭圆工具的情况
        document.addEventListener('mousemove', drawEllipse)
        e.preventDefault()

        let startPos = mousePos(svg)
        let ellipse = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse') // 创建椭圆节点
        let start = true

        if (fill.checked === false) { // 如果是空心椭圆，填充色置为 none
          ellipse.setAttribute('fill', 'none')
        }
        if (fill.checked === true) { // 如果是填充椭圆，填充色取输入的值
          ellipse.setAttribute('fill', fillColorInput.value)
        }
        ellipse.setAttribute('stroke', borderColorInput.value)
        ellipse.setAttribute('stroke-width', widthInput.value)

        // 画椭圆程序
        function drawEllipse(e) {
          if (e.buttons !== 1) {
            document.removeEventListener('mousemove', drawEllipse)
            return
          } else {
            if (start) {
              start = false
              svg.append(ellipse)
            }
            let currPos = mousePos(svg)
            let cx = (startPos.x + currPos.x) / 2
            let cy = (startPos.y + currPos.y) / 2
            let rx = Math.abs(startPos.x - currPos.x) / 2
            let ry = Math.abs(startPos.y - currPos.y) / 2

            ellipse.setAttribute('cx', cx)
            ellipse.setAttribute('cy', cy)
            ellipse.setAttribute('rx', rx)
            ellipse.setAttribute('ry', ry)
          }
        }
      }

      if (currentTool == 'tool-rect' || currentTool == 'tool-round-rect') { // 如果是矩形工具的情况
        document.addEventListener('mousemove', drawRect)
        e.preventDefault()

        let startPos = mousePos(svg)
        let rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect') // 创建矩形节点
        let start = true

        if (fill.checked === false) {
          rect.setAttribute('fill', 'none')
        }
        if (fill.checked === true) {
          rect.setAttribute('fill', fillColorInput.value)
        }
        rect.setAttribute('stroke', borderColorInput.value)
        rect.setAttribute('stroke-width', widthInput.value)

        // 画矩形程序
        function drawRect(e) {
          if (e.buttons !== 1) {
            document.removeEventListener('mousemove', drawRect)
            return
          } else {
            if (start) {
              start = false
              svg.append(rect)
            }
            let currPos = mousePos(svg)
            let x = startPos.x
            let y = startPos.y

            // 处理从右下向左上画矩形的情况
            if (currPos.x < startPos.x) {
              x = currPos.x
            }
            if (currPos.y < startPos.y) {
              y = currPos.y
            }
            let width = Math.abs(startPos.x - currPos.x)
            let height = Math.abs(startPos.y - currPos.y)

            let rx = 0
            let ry = 0

            if (currentTool == 'tool-round-rect') { // 处理圆角矩形的情况
              if (width < 50 && height < 50) {
                rx = (width + height) / 10
                ry = (width + height) / 10
              } else {
                rx = (Math.min(width, height) - 50) / 50 + 10
                ry = (Math.min(width, height) - 50) / 50 + 10
              }
            }

            rect.setAttribute('x', x)
            rect.setAttribute('y', y)
            rect.setAttribute('width', width)
            rect.setAttribute('height', height)
            rect.setAttribute('rx', rx)
            rect.setAttribute('ry', ry)
          }
        }
      }
    }
  })

  // Ctrl + Z 键撤销上一步操作
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key == 'z') {
      svg.lastElementChild && svg.removeChild(svg.lastElementChild) // 如果 svg 存在子元素，就移除最后一个子元素
    }
  })

  // 为清空按钮绑定点击事件，清空画板
  clearButton.addEventListener('click', function (e) {
    svg.textContent = ''
  })

  // 为重置按钮绑定点击事件，重置画板
  reset.addEventListener('click', function (e) {
    drawandnosave = false
    svg.textContent = ''
    radioLine.checked = true
    fill.checked = false
    borderColorInput.value = '#000000'
    fillColorInput.value = '#000000'
    widthInput.value = 5
    widthSpan.textContent = 5
    currentTool = 'tool-line'
    svgContainer.innerHTML = '<svg width="100%" height="600"></svg>'
    svg = svgContainer.querySelector('svg')
  })

  // 为保存按钮绑定点击事件，保存并下载画板
  save.addEventListener('click', function (e) {
    drawandnosave = false
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

  // 工具栏作为事件代理，为工具栏绑定 input 事件，并将当前点击工具的 id 记录在 currentTool 中
  // 注意 input 事件触发的对象，并不是关联 input 的 label。e.target 指向的是 input 元素的 id
  tools.addEventListener('input', function (e) {
    currentTool = e.target.id
  })

  // 为 window 绑定关闭窗口前确认功能
  this.window.addEventListener('beforeunload', function (e) {
    if (drawandnosave) {
      return e.returnValue = '还未保存，是否要退出?'
    }
  })

  // 获取鼠标和 node 元素的相对位置
  function mousePos(node) {
    let box = node.getBoundingClientRect()

    return {
      x: window.event.clientX - box.x,
      y: window.event.clientY - box.y,
    }
  }

  // 为打开按钮绑定点击事件
  openFile.addEventListener('click', function (e) {
    if (drawandnosave) {
      let answer = confirm('当前绘画未保存，是否要打开新文件？')
      if (answer == false) {
        return
      }
    }
    fileInput.click()
  })

  // 打开新文件
  fileInput.addEventListener('change', function (e) {
    let svgFile = fileInput.files[0] // 获取输入的第一个文件
    let fr = new FileReader() // 创建一个文件读取器
    fr.addEventListener('load', function () {
      let svgFileContent = fr.result // 获取文件内容
      svgContainer.innerHTML = svgFileContent // 将 svgContainer 内的旧 svg 对象替换为新的 svg 对象。
      svg = svgContainer.querySelector('svg') // 更新 svg 变量为最新的 svg 对象
      fileInput.value = null // 载入新文件后清空 fileInput 的内容
    })
    fr.readAsText(svgFile) // 以文本文件的方式读取 svgFile
  })
})
