global.bmoonData = {
    pages: [
        {
            commands: new Array(8).fill("")
        }
    ],
    variables: [
        { name: "", value: "" },
        { name: "", value: "" },
        { name: "", value: "" },
        { name: "", value: "" }
    ],
    currentPage: 0
}

global.bmoonQueue = []
global.bmoonNextTick = 0
global.bmoonCurrentTick = 0
global.bmoonIsExecuting = false
global.bmoonLastAction = 0


LDLibUI.item("bmoon", event => {
    let root = new WidgetGroup()
    root.setSize(280, 360)
    root.setBackground(new ColorRectTexture(0x1A1A2E))

    let titleLabel = new LabelWidget()
    titleLabel.setSelfPosition(85, 8)
    titleLabel.setText("§8BMoon §7Sequencer")
    root.addWidgets(titleLabel)

    let prevButton = new ButtonWidget()
    prevButton.setSelfPosition(10, 30)
    prevButton.setSize(50, 18)
    prevButton.setButtonTexture(
        new ColorRectTexture(0x0F3460),
        new TextTexture("§7Prev")
    )

    let pageLabel = new LabelWidget()
    pageLabel.setSelfPosition(70, 30)
    pageLabel.setText("§7Page " + (global.bmoonData.currentPage + 1) + 
                        "/" + global.bmoonData.pages.length)

    let nextButton = new ButtonWidget()
    nextButton.setSelfPosition(130, 30)
    nextButton.setSize(50, 18)
    nextButton.setButtonTexture(
        new ColorRectTexture(0x0F3460),
        new TextTexture("§7Next")
    )

    root.addWidgets(prevButton, pageLabel, nextButton)

    let commandFields = []
    for (let i = 0; i < 8; i++) {
        let label = new LabelWidget()
        label.setSelfPosition(10, 55 + i * 22)
        label.setText("§8" + (i + 1) + ".")

        let field = new TextFieldWidget()
        field.setSelfPosition(30, 55 + i * 22)
        field.setSize(240, 20)
        field.setBordered(true)
        field.setTextColor(0xFFFFFF)
        field.setMaxStringLength(256)

        let cmdIndex = i
        field.setTextSupplier(() => {
            return global.bmoonData.pages[global.bmoonData.currentPage].commands[cmdIndex] || ""
        })

        field.setTextResponder(function(newText) {
            global.bmoonData.pages[global.bmoonData.currentPage].commands[cmdIndex] = newText
        })

        commandFields.push(field)
        root.addWidgets(label, field)
    }

    let varTitle = new LabelWidget()
    varTitle.setSelfPosition(10, 235)
    varTitle.setText("§8Variables:")
    root.addWidgets(varTitle)

    let varFields = []
    for (let i = 0; i < 4; i++) {
        let nameLabel = new LabelWidget()
        nameLabel.setSelfPosition(10, 255 + i * 22)
        nameLabel.setText("§8Var " + (i + 1) + ":")

        let nameField = new TextFieldWidget()
        nameField.setSelfPosition(50, 255 + i * 22)
        nameField.setSize(100, 20)
        nameField.setBordered(true)
        nameField.setTextColor(0xFFFFFF)
        nameField.setMaxStringLength(32)

        let varIndex = i
        nameField.setTextSupplier(() => {
            return global.bmoonData.variables[varIndex].name || ""
        })

        nameField.setTextResponder(function(newText) {
            global.bmoonData.variables[varIndex].name = newText
        })

        let valueField = new TextFieldWidget()
        valueField.setSelfPosition(160, 255 + i * 22)
        valueField.setSize(110, 20)
        valueField.setBordered(true)
        valueField.setTextColor(0xFFFFFF)
        valueField.setMaxStringLength(128)

        valueField.setTextSupplier(() => {
            return global.bmoonData.variables[varIndex].value || ""
        })

        valueField.setTextResponder(function(newText) {
            global.bmoonData.variables[varIndex].value = newText
        })

        varFields.push({ name: nameField, value: valueField })
        root.addWidgets(nameLabel, nameField, valueField)
    }

    let runButton = new ButtonWidget()
    runButton.setSelfPosition(10, 335)
    runButton.setSize(80, 20)
    runButton.setButtonTexture(
        new ColorRectTexture(0x0F3460),
        new TextTexture("§aRun Page")
    )

    let clearButton = new ButtonWidget()
    clearButton.setSelfPosition(100, 335)
    clearButton.setSize(80, 20)
    clearButton.setButtonTexture(
        new ColorRectTexture(0x0F3460),
        new TextTexture("§cClear")
    )

    let addButton = new ButtonWidget()
    addButton.setSelfPosition(190, 335)
    addButton.setSize(80, 20)
    addButton.setButtonTexture(
        new ColorRectTexture(0x0F3460),
        new TextTexture("§eAdd Page")
    )

    root.addWidgets(runButton, clearButton, addButton)

    function updateUI() {
        pageLabel.setText("§7Page " + (global.bmoonData.currentPage + 1) + 
                        "/" + global.bmoonData.pages.length)
    }

    function canClick() {
        if (global.bmoonCurrentTick - global.bmoonLastAction < 2) {
            return false
        }
        global.bmoonLastAction = global.bmoonCurrentTick
        return true
    }

    prevButton.setOnPressCallback(function(clickData) {
        if (!canClick()) return
        if (global.bmoonData.currentPage > 0) {
            global.bmoonData.currentPage--
            updateUI()
        }
    })

    nextButton.setOnPressCallback(function(clickData) {
        if (!canClick()) return
        if (global.bmoonData.currentPage < global.bmoonData.pages.length - 1) {
            global.bmoonData.currentPage++
            updateUI()
        }
    })

    addButton.setOnPressCallback(function(clickData) {
        if (!canClick()) return
        if (global.bmoonData.pages.length < 10) {
            global.bmoonData.pages.push({
                commands: new Array(8).fill("")
            })
            updateUI()
        }
    })

    clearButton.setOnPressCallback(function(clickData) {
        if (!canClick()) return
        global.bmoonData.pages[global.bmoonData.currentPage].commands = 
            new Array(8).fill("")
    })

    runButton.setOnPressCallback(function(clickData) {
        if (!canClick()) return
        if (global.bmoonIsExecuting) {
            return
        }
        
        global.bmoonQueue = []
        global.bmoonNextTick = 0
        global.bmoonIsExecuting = true

        let totalCommands = 0
        let currentPage = global.bmoonData.currentPage
        let page = global.bmoonData.pages[currentPage]

        for (let c = 0; c < page.commands.length; c++) {
            let cmd = page.commands[c]
            if (cmd && cmd.trim() !== "") {
                let processedCmd = cmd.trim()

                for (let v = 0; v < global.bmoonData.variables.length; v++) {
                    let var_ = global.bmoonData.variables[v]
                    if (var_.name && var_.value) {
                        processedCmd = processedCmd.split("${" + var_.name + "}").join(var_.value)
                        processedCmd = processedCmd.split("%" + var_.name + "%").join(var_.value)
                    }
                }

                if (processedCmd.toLowerCase().startsWith("sleep(") && processedCmd.endsWith(")")) {
                    let secondsStr = processedCmd.substring(6, processedCmd.length - 1)
                    let seconds = parseFloat(secondsStr) || 1
                    let ticks = Math.floor(seconds * 20)
                    global.bmoonQueue.push({ type: 'sleep', ticks: ticks })
                } else {
                    global.bmoonQueue.push({ type: 'command', command: processedCmd })
                    totalCommands++
                }
            }
        }

        if (totalCommands === 0) {
            global.bmoonIsExecuting = false
            return
        }
    })

    event.success(root)
})

ClientEvents.tick(event => {
    global.bmoonCurrentTick++
    
    if (!global.bmoonIsExecuting) return
    if (global.bmoonQueue.length === 0) return
    
    if (global.bmoonCurrentTick >= global.bmoonNextTick) {
        let item = global.bmoonQueue.shift()
        
        if (item && item.type === 'sleep') {
            global.bmoonNextTick = global.bmoonCurrentTick + item.ticks
        } else if (item && item.type === 'command') {
            try {
                Client.runCommand(item.command)
            } catch (e) {
                console.error("BMoon Error: " + e)
            }
            global.bmoonNextTick = global.bmoonCurrentTick + 5
        }
        
        if (global.bmoonQueue.length === 0) {
            global.bmoonIsExecuting = false
        }
    }
})