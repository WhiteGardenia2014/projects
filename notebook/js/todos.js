window.addEventListener('DOMContentLoaded', function () {
  let storage = {} // 存储页面信息的对象
  let todosInfo = [] // 存储笔记信息的数组
  let todoId = 1 // 笔记的 id

  // 保存页面信息
  function saveToStorage() {
    localStorage.setItem('page', JSON.stringify(storage))
  }


  let todoList = document.querySelector('.todo-list') // todos 列表
  let countNum = document.querySelector('.count-num') // 未完成 todo 的数量
  let footer = document.querySelector('.todoapp .footer') // footer 菜单栏

  let clearButton = document.querySelector('.clear-completed') // 清除已完成 todo 按钮
  clearButton.addEventListener('click', clearCompleted) // 绑定清除已完成 todo 事件

  let toggleAll = document.querySelector('#toggleAll') // 全选按钮
  toggleAll.checked = false
  toggleAll.addEventListener('change', toggleAllTodos) // 绑定切换所有 todo 状态事件

  let newTodo = document.querySelector('.new-todo')
  newTodo.addEventListener('keyup', createNewTodo)

  // 创建一个新的 todo 
  function createNewTodo(e) {
    if (e.key == "Enter") {
      if (this.value == '') { // 如果输入内容为空，直接返回
        return
      }

      let text = this.value
      this.value = ''
      createtodo(todoId++, text, 'false')
      update()
    }
  }

  function createtodo(id, title, completed) {
    let li = document.createElement('li')
    li.classList.add('todo')
    li.dataset.id = id
    if (completed == 'true') {
      // li.classList.add('completed')
      li.dataset.completed = 'true'
    } else {
      li.dataset.completed = 'false'
    }
    li.addEventListener('dblclick', editing)

    let view = document.createElement('div')
    view.classList.add('view')

    let toggle = document.createElement('input')
    toggle.type = 'checkbox'
    toggle.classList.add('toggle')
    toggle.addEventListener('change', changeStatus)

    let label = document.createElement('label')
    label.textContent = title

    let button = document.createElement('button')
    button.classList.add('destroy')
    button.addEventListener('click', deleteTodo)

    view.append(toggle)
    view.append(label)
    view.append(button)

    let edit = document.createElement('input')
    edit.type = 'text'
    edit.classList.add('edit')
    edit.addEventListener('blur', finishEdit)
    edit.addEventListener('keyup', finishEditByEnter)

    li.append(view)
    li.append(edit)
    todoList.append(li)
  }

  function init() {
    todoList.textContent = ''
    let initInfo = {
      todoId: 1,
      todosInfo: [],
    }
    storage = JSON.parse(localStorage.getItem('page')) || initInfo

    todoId = storage.todoId
    todosInfo = storage.todosInfo

    for (let todoInfo of todosInfo) {
      createtodo(todoInfo.id, todoInfo.title, todoInfo.completed)
    }



    update()
  }
  init()

  // 编辑一条 todo
  function editing(e) {
    let box = this.getBoundingClientRect()
    // 如果双击的位置为左侧 toggle 框，直接返回
    if (e.pageX - box.left < 41) {
      return
    }

    if (!this.classList.contains('editing')) { // 如果选中的 todo 没有正在编辑
      let text = this.querySelector('label').textContent
      this.classList.add('editing')

      let edit = this.querySelector('.edit')
      edit.value = text
      edit.style.display = 'block'
      setTimeout(() => {
        edit.focus()
      }, 20)
    }
  }

  // 完成编辑一条 todo
  function finishEdit(e) {
    let edit = this
    let todo = this.parentElement

    todo.classList.remove('editing')
    let text = edit.value
    edit.style.display = 'none'
    todo.querySelector('label').textContent = text
    update()
  }

  // 通过按下 Enter 键完成编辑一条 todo
  function finishEditByEnter(e) {
    if (e.key == "Enter") {
      finishEdit.call(this)
    }
  }

  // 点击 toggle 按钮，切换 todo 状态
  function changeStatus() {
    let todo = this.parentElement.parentElement
    if (todo.dataset.completed == 'true') {
      todo.dataset.completed = 'false'
    } else {
      todo.dataset.completed = 'true'
    }
    update()
  }

  // 更新 todos 列表的各个状态参数
  function update() {
    let todos = Array.from(todoList.querySelectorAll('.todo'))
    let completedTodos = todos.filter(it => {
      return it.dataset.completed == 'true'
    })
    let unCompletedTodos = todos.filter(it => {
      return it.dataset.completed == 'false'
    })

    completedTodos.forEach(it => {
      it.querySelector('.toggle').checked = true
    })

    unCompletedTodos.forEach(it => {
      it.querySelector('.toggle').checked = false
    })

    let totalCounts = todos.length
    let completedCounts = completedTodos.length
    let unCompletedCounts = totalCounts - completedCounts

    countNum.textContent = unCompletedCounts // 更新剩余的 todo 的数量

    // 如果没有未完成的 todo，全选按钮切换为选中状态
    if (unCompletedCounts == 0) {
      toggleAll.checked = true
    } else {
      toggleAll.checked = false
    }

    // 如果 todoList 中没有 todo，则隐藏全选按钮和 footer 菜单栏，并将 todoId 重置为 1
    if (totalCounts == 0) {
      document.querySelector('[for="toggleAll"]').style.display = 'none'
      footer.style.display = 'none'
      todoId = 1
    } else {
      document.querySelector('[for="toggleAll"]').style.display = 'block'
      footer.style.display = 'block'
    }

    // 如果有已经完成的 todo，显示 clear completed 按钮
    if (completedCounts > 0) {
      clearButton.style.display = 'block'
    } else {
      clearButton.style.display = 'none'
    }

    // 更新页面的信息并保存
    updateInfo()
  }

  // 更新页面的信息并保存
  function updateInfo() {
    let todos = Array.from(todoList.querySelectorAll('.todo'))
    todosInfo = []
    for (let todo of todos) {
      todosInfo.push(getTodoInfo(todo))
    }
    storage = {
      todoId: todoId,
      todosInfo: todosInfo,
    }
    saveToStorage()
  }

  // 返回一个 todo 的 info 对象
  function getTodoInfo(todo) {
    return {
      id: todo.dataset.id,
      title: todo.querySelector('label').textContent,
      completed: todo.dataset.completed,
    }
  }

  // 切换所有 todo 的状态
  function toggleAllTodos() {
    let todos = Array.from(todoList.querySelectorAll('.todo'))
    if (this.checked == true) {
      todos.forEach(it => {
        it.dataset.completed = 'true'
        it.querySelector('.toggle').checked = true
      })
    } else {
      todos.forEach(it => {
        it.dataset.completed = 'false'
        it.querySelector('.toggle').checked = false
      })
    }
    update()
  }

  // 移除一个 todo
  function deleteTodo() {
    let todo = this.parentElement.parentElement
    todoList.removeChild(todo)
    update()
  }

  // 移除所有已完成 todo
  function clearCompleted() {
    let todos = Array.from(todoList.querySelectorAll('.todo'))
    for (let todo of todos) {
      if (todo.dataset.completed == 'true') {
        todoList.removeChild(todo)
      }
    }
    update()
  }

  // 当本网站的其他页面修改 localStorage 时，触发 storage 事件
  window.addEventListener('storage', function () {
    init()
  })
})
