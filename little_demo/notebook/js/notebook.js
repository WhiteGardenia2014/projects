window.addEventListener('load', function () {
  let container = this.document.querySelector('.container')
  let noteContainer = this.document.querySelector('.noteContainer')
  let newNoteButton = this.document.querySelector('#newNote') // 创建笔记按钮
  let search = this.document.querySelector('#search') // 搜索栏

  let clearPage = this.document.querySelector('.clearPage') // 清除笔记窗口
  let noButton = this.document.querySelector('.button-no')
  let yesButton = this.document.querySelector('.button-yes')

  let idPrefix = Math.random().toString(16).slice(2) // 笔记 id 前缀
  let idIndex = 0 // 笔记 id 索引
  let id = idPrefix + idIndex // 笔记 id
  let zIndex = 100

  // 颜色数组
  let colorAry = ['blue', 'green', 'pink', 'purple', 'yellow', 'white']
  let colorIndex = 0
  let color = colorAry[colorIndex]

  let notes = {} // 存储笔记信息的对象
  let hasNote = false // 文件中是否有笔记

  // 时钟相关
  let hour = this.document.querySelector('.hour')
  let ampm = this.document.querySelector('.ampm')
  let day = this.document.querySelector('.day')
  let msToNextSec = 0 // 到下一个整秒的毫秒数
  let hour24 = true // 是否是24小时制

  // 切换背景图片相关
  let background = this.document.querySelector('.background')
  let selectBgButton = this.document.querySelector('#selectBackground')
  let backgroundPage = this.document.querySelector('.backgroundPage')
  let backgroundBox = this.document.querySelector('.backgroundBox')

  // 初始化函数
  function init() {
    notes = JSON.parse(localStorage.getItem('notes')) || {}

    for (let id in notes) {
      // 用 localStorage 中的信息，创建笔记
      let note = notes[id]
      createNote(note.id, note.width, note.height, note.left, note.top, note.color, note.zIndex, note.text)

      // 每创建一个笔记，colorIndex 加一，zIndex 更新为所有笔记的最大值，idIndex 更新为所有笔记的最大值
      colorIndex = (colorIndex + 1) % 6
      color = colorAry[colorIndex]
      zIndex = Math.max(zIndex, note.zIndex)
      idIndex = Math.max(idIndex, Number(note.id.slice(13)))
    }
    idIndex++
    id = idPrefix + idIndex
    zIndex++

    getNoteCount()
    setTimeout(function () {
      search.focus()
    }, 20)
  }
  init()

  // 随机初始化一张背景图片
  function randomBg(){
    let index = (Math.random() * 30 | 0) + 1
    if (index < 10) {
      index = '0' + String(index)
    } else {
      index = String(index)
    }
    background.style.opacity = '0'
    setTimeout(() => {
      background.style.backgroundImage = `url(./images/bg-${index}.jpg)`
      background.style.opacity = '1'
    }, 50);
  }
  randomBg()

  // 获取笔记信息，返回笔记信息对象
  function getNoteInfo(note) {
    let value = note.querySelector('textarea').value
    let width = note.getBoundingClientRect().width
    let height = note.getBoundingClientRect().height

    return {
      id: note.id,
      text: value,
      left: parseFloat(note.style.left),
      top: parseFloat(note.style.top),
      width: width,
      height: height,
      zIndex: note.style.zIndex,
      color: note.dataset.color,
    }
  }

  // 保存笔记信息
  function saveToStorage() {
    localStorage.setItem('notes', JSON.stringify(notes))
  }

  // 点击创建笔记按钮，创建一个新笔记
  newNoteButton.addEventListener('click', function (e) {

    // 如果页面内没有笔记，就创建一个新笔记，并将按钮文本改为清除笔记。
    if (!hasNote) {
      createNote(id, 200, 150, 50, 100, 'blue', 100, '')
      hasNote = true
      newNoteButton.textContent = '🗑 Clear Notes'

      idIndex++
      id = idPrefix + idIndex
      colorIndex++
      color = colorAry[colorIndex]
    } else {
      clearPage.style.opacity = '1'
      clearPage.style.zIndex = '999999'
    }
  })

  // 创建一个笔记
  function createNote(id, width = 200, height = 150, left = 50, top = 100, color = 'blue', zIndex = 100, text = '') {
    let note = document.createElement('div')
    note.id = id
    note.classList.add('note', color)
    note.style.left = left + 'px'
    note.style.top = top + 'px'
    note.style.width = width + 'px'
    note.style.height = height + 'px'
    note.style.zIndex = zIndex

    note.tabIndex = '0'
    note.dataset.focus = 'false'
    note.dataset.color = color

    // 在 note 上绑定聚焦和失焦事件，鼠标进入和离开事件，改变内部按钮显示
    note.addEventListener('focusin', focusinNote)
    note.addEventListener('focusout', focusoutNote)
    note.addEventListener('mouseenter', mouseenterNote)
    note.addEventListener('mouseleave', mouseleaveNote)

    // 绑定点击事件，提升 note 层级
    // 绑定鼠标抬起和 change 事件，更新 note 信息
    note.addEventListener('click', moveBefore)
    note.addEventListener('mouseup', updateNoteInfo)
    note.addEventListener('change', updateNoteInfo)

    let inner = document.createElement('div')
    inner.classList.add('inner')

    let titleBar = document.createElement('div')
    titleBar.classList.add('title-bar')

    let btn1 = document.createElement('div')
    btn1.classList.add('btn')
    btn1.dataset.type = 'create'
    btn1.title = 'Create a new note'
    btn1.innerHTML = '&#10010;'

    let btn2 = document.createElement('div')
    btn2.classList.add('btn')
    btn2.dataset.type = 'delete'
    btn2.title = 'Close'
    btn2.innerHTML = '&#10006;'

    let textarea = document.createElement('textarea')
    textarea.textContent = text

    titleBar.append(btn1)
    titleBar.append(btn2)
    inner.append(titleBar, textarea)
    note.append(inner)
    noteContainer.append(note)

    // 创建并存储 note 的信息
    let noteInfo = getNoteInfo(note)
    notes[note.id] = noteInfo
    saveToStorage()

    // 创建 note 时使其内部的 textarea 获取焦点，注意要通过异步的方式（在浏览器绘制出 textarea 后，调用 focus() 方法）
    setTimeout(function () {
      textarea.focus()
    }, 20)
  }

  // 在 window 上监听鼠标按下事件
  this.addEventListener('mousedown', function (e) {

    // 如果鼠标按下的目标是 note 的 title
    if (e.target.classList.contains('title-bar')) {
      let note = e.target.parentElement.parentElement

      if (e.buttons == 1) {
        e.preventDefault()
        note.style.zIndex = (zIndex++)
        var pos = mousePos(note)

        this.addEventListener('mousemove', move)
        this.addEventListener('mouseup', removeBind)
      }

      function removeBind() {
        removeEventListener('mousemove', move)
        removeEventListener('mouseup', removeBind)
      }

      function move(e) {
        if (e.buttons !== 1) {
          removeEventListener('mousemove', move)
          return
        }

        // 用鼠标实时位置更新元素位置
        var left = e.pageX - pos.x
        var top = e.pageY - pos.y

        // 不允许元素移出视口边界，并实现磁吸效果
        pageWidth = container.clientWidth
        pageHeight = container.clientHeight

        if (left <= 20) {
          left = 0
        }
        if (left >= pageWidth - note.offsetWidth - 20) {
          left = pageWidth - note.offsetWidth
        }
        if (top <= 100) {
          top = 100
        }
        if (top >= pageHeight - note.offsetHeight - 50) {
          top = pageHeight - note.offsetHeight - 50
        }

        // 更新元素的位置
        note.style.left = left + 'px'
        note.style.top = top + 'px'
      }

    }

  })

  // 在 window 上监听鼠标点击事件
  this.addEventListener('click', function (e) {

    // 如果鼠标按下的目标是 create 按钮
    if (e.target.dataset.type === 'create') {
      let note = e.target.parentElement.parentElement.parentElement
      let currentLeft = parseFloat(note.style.left)
      let currentTop = parseFloat(note.style.top)

      createNote(id, 200, 150, currentLeft + 50, currentTop + 50, color, zIndex, '')
      idIndex++
      id = idPrefix + idIndex
      colorIndex = (colorIndex + 1) % 6
      color = colorAry[colorIndex]
    }

    // 如果鼠标按下的目标是 delete 按钮
    if (e.target.dataset.type === 'delete') {
      let note = e.target.parentElement.parentElement.parentElement
      noteContainer.removeChild(note)

      // 在 notes 对象中删除该 note，并更新 LocalStorage
      delete notes[note.id]
      saveToStorage()

      getNoteCount()
    }

    // 如果鼠标按下的目标是 selectBackground 按钮，就显示 backgroundPage 窗口
    if (e.target.id === 'selectBackground') {
      backgroundPage.style.visibility = 'visible'
      backgroundPage.style.opacity = '1'
    } else if (!backgroundPage.contains(e.target)) {
      // 如果鼠标按下的目标不在 backgroundPage 的内部，就隐藏 backgroundPage 窗口
      backgroundPage.style.visibility = 'hidden'
      backgroundPage.style.opacity = '0'
    }

    // 如果鼠标按下的目标是 imgbox，就更换背景图片
    if (e.target.classList.contains('imgbox')) {
      let src = e.target.dataset.src
      let url = './images/' + src 
      background.style.backgroundImage = `url(${url})`
      background.style.opacity = '0'
      setTimeout(() => {
        background.style.opacity = '1'
      }, 20);
    }

  })

  // note 向前移动到最顶层
  function moveBefore() {
    this.style.zIndex = (zIndex++)
    this.querySelector('textarea').focus()
    updateNoteInfo.call(this)
  }

  // note 聚焦事件
  function focusinNote() {
    this.dataset.focus = 'true'
    this.style.resize = 'both'
    let btns = Array.from(this.querySelectorAll('.btn'))
    btns.forEach(btn => {
      btn.style.display = 'initial'
    })
  }

  // note 失焦事件
  function focusoutNote() {
    this.dataset.focus = 'false'
    this.style.resize = 'none'
    let btns = Array.from(this.querySelectorAll('.btn'))
    btns.forEach(btn => {
      btn.style.display = 'none'
    })
  }

  // 鼠标进入 note 事件
  function mouseenterNote() {
    let btns = Array.from(this.querySelectorAll('.btn'))
    btns.forEach(btn => {
      btn.style.display = 'initial'
    })
  }

  // 鼠标离开 note 事件
  function mouseleaveNote() {
    if (this.dataset.focus === 'false') {
      let btns = Array.from(this.querySelectorAll('.btn'))
      btns.forEach(btn => {
        btn.style.display = 'none'
      })
    }
  }

  // 获取鼠标和 node 元素的相对位置
  function mousePos(node) {
    var box = node.getBoundingClientRect()

    return {
      x: window.event.pageX - box.x,
      y: window.event.pageY - box.y,
    }
  }

  // 更新 note 信息，并保存
  function updateNoteInfo() {
    let note = this
    let noteInfo = getNoteInfo(note)
    notes[note.id] = noteInfo
    saveToStorage()
  }

  // 检查页面中是否存在笔记
  function getNoteCount() {
    let length = noteContainer.children.length
    if (length == 0) {
      hasNote = false
    } else {
      hasNote = true
    }

    if (hasNote == false) {
      newNoteButton.textContent = '+ New note'
    } else {
      newNoteButton.textContent = '🗑 Clear Notes'
    }
  }

  // 当本网站的其他页面修改 localStorage 时，触发 storage 事件
  this.addEventListener('storage', function () {

    noteContainer.innerHTML = ''

    notes = JSON.parse(localStorage.getItem('notes')) || {}
    for (let id in notes) {
      // 用 localStorage 中的信息，创建笔记
      let note = notes[id]
      createNoteNoSave(note.id, note.width, note.height, note.left, note.top, note.color, note.zIndex, note.text)

      // 每创建一个笔记，colorIndex 加一，zIndex 更新为所有笔记的最大值，idIndex 更新为所有笔记的最大值
      colorIndex = (colorIndex + 1) % 6
      color = colorAry[colorIndex]
      zIndex = Math.max(zIndex, note.zIndex)
      idIndex = Math.max(idIndex, Number(note.id.slice(13)))
    }
    idIndex++
    id = idPrefix + idIndex
    zIndex++
    getNoteCount()
  })

  // 创建 note 但并不保存到 localStorage 中，也不自动获取焦点
  function createNoteNoSave(id, width = 200, height = 150, left = 50, top = 50, color = 'blue', zIndex = 100, text = '') {
    let note = document.createElement('div')
    note.id = id
    note.classList.add('note', color)
    note.style.left = left + 'px'
    note.style.top = top + 'px'
    note.style.width = width + 'px'
    note.style.height = height + 'px'
    note.style.zIndex = zIndex

    note.tabIndex = '0'
    note.dataset.focus = 'false'
    note.dataset.color = color

    // 在 note 上绑定聚焦和失焦事件，鼠标进入和离开事件，改变内部按钮显示
    note.addEventListener('focusin', focusinNote)
    note.addEventListener('focusout', focusoutNote)
    note.addEventListener('mouseenter', mouseenterNote)
    note.addEventListener('mouseleave', mouseleaveNote)

    // 绑定点击事件，提升 note 层级
    // 绑定鼠标抬起和 change 事件，更新 note 信息
    note.addEventListener('click', moveBefore)
    note.addEventListener('mouseup', updateNoteInfo)
    note.addEventListener('change', updateNoteInfo)

    let inner = document.createElement('div')
    inner.classList.add('inner')

    let titleBar = document.createElement('div')
    titleBar.classList.add('title-bar')

    let btn1 = document.createElement('div')
    btn1.classList.add('btn')
    btn1.dataset.type = 'create'
    btn1.title = 'Create a new note'
    btn1.innerHTML = '&#10010;'

    let btn2 = document.createElement('div')
    btn2.classList.add('btn')
    btn2.dataset.type = 'delete'
    btn2.title = 'Close'
    btn2.innerHTML = '&#10006;'

    let textarea = document.createElement('textarea')
    textarea.textContent = text

    titleBar.append(btn1)
    titleBar.append(btn2)
    inner.append(titleBar, textarea)
    note.append(inner)
    noteContainer.append(note)
  }

  // 取消按钮绑定点击事件
  noButton.addEventListener('click', function (e) {
    clearPage.style.opacity = '0'
    clearPage.style.zIndex = '-1'
  })

  // 确认按钮绑定点击事件
  yesButton.addEventListener('click', function (e) {
    noteContainer.innerHTML = ''
    notes = {}
    saveToStorage()
    clearPage.style.opacity = '0'
    clearPage.style.zIndex = '-1'
    getNoteCount()
  })

  // 时钟定时器
  msToNextSec = 1000 - Date.now() % 1000
  updateTime()
  setTimeout(() => {
    setInterval(() => {
      updateTime()
    }, 1000);
  }, msToNextSec);

  // 更新显示时间
  function updateTime() {
    if (hour24 === true) {
      hour.textContent = moment().format('HH:mm')
    } else {
      hour.textContent = moment().format('h:mm')
    }
    ampm.textContent = moment().format('A')
    day.textContent = moment().format('dddd  M.D.YYYY')
  }

  // 切换 24 小时制和 12 小时制
  hour.addEventListener('click', function (e) {
    if (hour24 === true) {
      hour24 = false
      updateTime()
      ampm.style.display = 'block'
    } else {
      hour24 = true
      updateTime()
      ampm.style.display = 'none'
    }
  })

  // 生成背景图片 box
  function createBgBox() {
    for (let i = 1; i <= 30; i++) {
      if (i < 10) {
        i = '0' + String(i)
      } else {
        i = String(i)
      }
      let box = document.createElement('div')
      box.classList.add('imgbox')
      box.dataset.src = `bg-${i}.jpg`
      box.style.backgroundImage = `url(./images/bg-${i}.jpg)`
      backgroundBox.append(box)
    }
  }
  createBgBox()
})
