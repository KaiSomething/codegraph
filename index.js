var canvas = document.querySelector("canvas");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

var selected_object = null
var area_select_objects = []
var connection_select = null

var MouseX = 0
var MouseY = 0
var MouseButtons = 0

var PageOffsetX = 0;
var PageOffsetY = 0;

var KeyboardKeysDown = []
var ShiftSelect = false
var ShiftOriginX = null
var ShiftOriginY = null

var MouseXPrev = null
var MouseYPrev = null

var node_list = []
var connection_list = []

var color_pallet = {
    "text":"#e6c677",
    "background":"#1e1e1e",
    "grid_lines":"#303030",
    "nodes":"#2d2d30",
    "lines":"#e6c677",
    "select":"#e6c677",
    "group_select":"#0078d7",
    "connector":"#0e0c0c"
}

canvas.addEventListener('mousemove', function (event) {
    MouseX = event.pageX - PageOffsetX
    MouseY = event.pageY - PageOffsetY
    MouseButtons = event.buttons
    canvas.style.cursor = "default"
    ShiftSelect = false
    if(MouseButtons == 1){
        if(selected_object == null && !KeyboardKeysDown.includes("ControlLeft") && !KeyboardKeysDown.includes("AltLeft")){
            ShiftSelect = true
        }
    }else if(MouseButtons == 2 || (MouseButtons == 1 && 
        if(selected_object == null && !KeyboardKeysDown.includes("ControlLeft") && !KeyboardKeysDown.includes("AltLeft"))){
        //window.scrollBy(-event.movementX, -event.movementY);
        PageOffsetX += event.movementX
        PageOffsetY += event.movementY
        canvas.style.cursor = "move"
    }
});

canvas.addEventListener('mouseup', function (event) {
    MouseX = event.pageX - PageOffsetX
    MouseY = event.pageY - PageOffsetY
    MouseButtons = event.buttons
    if(selected_object != null && selected_object.constructor == Node && (KeyboardKeysDown.includes("ControlLeft") || KeyboardKeysDown.includes("ShiftLeft"))){
        if(!area_select_objects.includes(selected_object)){
            area_select_objects.push(selected_object)
        }else if(KeyboardKeysDown.includes("ControlLeft")){
            var index = area_select_objects.indexOf(selected_object);
            if (index !== -1) {
                area_select_objects.splice(index, 1);
            }
        }
    }
})

canvas.addEventListener('mousedown', function (event) {
    MouseX = event.pageX - PageOffsetX
    MouseY = event.pageY - PageOffsetY
    MouseButtons = event.buttons
    if(event.buttons == 1 && selected_object == null && !KeyboardKeysDown.includes("ShiftLeft") && !KeyboardKeysDown.includes("ControlLeft")){
        area_select_objects = []
    }
})

document.addEventListener('keydown', function (event) {
    //console.log(event.code)
    if(!KeyboardKeysDown.includes(event.code)){
        KeyboardKeysDown.push(event.code)
    }
    event.preventDefault()
})

document.addEventListener('keyup', function (event) {
    //console.log(event.key)
    if(KeyboardKeysDown.includes(event.code)){
        var index = KeyboardKeysDown.indexOf(event.code);
        if (index !== -1) {
            KeyboardKeysDown.splice(index, 1);
        }
    }
})

canvas.addEventListener('contextmenu', event => event.preventDefault());

var ctx = canvas.getContext("2d");

function lerp( a, b, alpha ) {
    return a + alpha * (b - a)
}

function distance(x1, y1, x2, y2){
    return Math.sqrt((x1-x2)*(x1-x2) + (y1-y2)*(y1-y2))
}

function draw_curve(x2, y2, x1, y1, prog=0.5){
    ctx.setLineDash([1, 0]);

    //outline
    ctx.beginPath()
    ctx.moveTo(x1+5, y1+5)
    //x_control = Math.min(Math.abs(Math.min((x2+5 - x1+5)/4*3, 100)), 300)
    x_control = Math.abs((x2+5 - x1+5)/3)
    ctx.bezierCurveTo(x1+5 + (Math.abs(x_control)), y1+5, x2+5-(Math.abs(x_control)), y2+5, x2+5, y2+5)
    ctx.lineWidth = 8
    ctx.strokeStyle = color_pallet.background;
    ctx.stroke()

    ctx.setLineDash([15, 15]);
    ctx.beginPath()
    ctx.moveTo(x1+5, y1+5)
    ctx.bezierCurveTo(x1+5 + x_control, y1+5, x2+5-x_control, y2+5, x2+5, y2+5)
    ctx.lineWidth = 2
    ctx.strokeStyle = color_pallet.lines;
    ctx.stroke()

    //balls
    ctx.beginPath();
    ctx.roundRect(x1+2, y1+2, 6, 6, 15)
    ctx.fillStyle = color_pallet.lines;
    ctx.fill();

    ctx.beginPath();
    ctx.roundRect(x2+2, y2+2, 6, 6, 15)
    ctx.fillStyle = color_pallet.lines;
    ctx.fill();

    //main line
    low = Math.min(x1, x2)
    high = Math.max(x1, x2)
    ctx.save();
    if(prog < 0.9){
        ctx.rect(low-(x_control/2)*prog, 0, (high-low)*prog+(x_control)*prog, canvas.height);
        ctx.clip();
    }

    ctx.setLineDash([1, 0]);
    ctx.beginPath()
    ctx.moveTo(x1+5, y1+5)
    ctx.bezierCurveTo(x1+5 + x_control, y1+5, x2+5-x_control, y2+5, x2+5, y2+5)
    ctx.lineWidth = 3
    ctx.strokeStyle = color_pallet.lines;
    ctx.stroke()

    ctx.restore();
}

class Node{
    constructor(x, y, width, height, color, inputs, outputs){
        this.x = x
        this.y = y
        this.width = width
        this.height = height
        this.color = color
        this.node_connectors = []

        for(var i = 0; i < outputs.length; i++){
            this.node_connectors.push(new NodeConnector(this.x+this.width-20, (this.y+this.height/2-5) + (i*20) - ((outputs.length-1)/2*20), 0, this, outputs[i]));
        }

        for(var i = 0; i < inputs.length; i++){
            this.node_connectors.push(new NodeConnector(this.x+10, (this.y+this.height/2-5) + (i*20) - ((inputs.length-1)/2*20), 1, this, inputs[i]));
        }
    }

    move(x, y){
        this.move_relative(x-this.x, y-this.y)
    }

    move_relative(x, y){
        this.node_connectors.forEach(element => {
            element.x += x
            element.y += y
        })
        this.x += x
        this.y += y
    }

    draw(){
        ctx.beginPath();
        ctx.roundRect(this.x+PageOffsetX, this.y+PageOffsetY, this.width, this.height, 15)
        ctx.setLineDash([1, 0])
        ctx.lineWidth = 5;
        if(this == selected_object){
            ctx.strokeStyle = color_pallet.select;
        }else if (area_select_objects.includes(this)){
            ctx.strokeStyle = color_pallet.group_select;
            var p = (this.width*2 + this.height*2 - 15*4 + Math.PI*(15/2))/80
            ctx.setLineDash([p, p])
        }else{
            ctx.strokeStyle = color_pallet.background;
        }
        ctx.stroke()

        //ctx.beginPath();
        //ctx.roundRect(this.x-3, this.y-3, this.width+6, this.height+6, 17.5)
        //if(this == selected_object){
        //    ctx.fillStyle = color_pallet.select;
        //}else if (area_select_objects.includes(this)){
        //    ctx.fillStyle = color_pallet.group_select;
        //    ctx.
        //}else{
        //    ctx.fillStyle = color_pallet.background;
        //}
        //ctx.fill();

        ctx.beginPath();
        ctx.roundRect(this.x+PageOffsetX, this.y+PageOffsetY, this.width, this.height, 15)
        if(this.color == null){
            ctx.fillStyle = color_pallet.nodes;
        }
        ctx.fill();
    }
}

class NodeConnector{
    constructor(x, y, input, parent, name){
        this.x = x
        this.y = y
        this.input = input
        this.selected = false
        this.parent = parent
        this.name = name
    }

    draw(){
        ctx.beginPath();
        ctx.roundRect(this.x+PageOffsetX, this.y+PageOffsetY, 10, 10, 15)
        if(this == selected_object || this.selected){
            ctx.fillStyle = color_pallet.select;
        }else{
            ctx.fillStyle = color_pallet.connector;
        }
        ctx.fill();
        this.selected = false

        ctx.font = "13px consolas";
        ctx.fillStyle = color_pallet.text
        if(this.input){
            ctx.textAlign = "left"
            ctx.fillText(this.name, this.x+14+PageOffsetX, this.y+9+PageOffsetY);
        }else{
            ctx.textAlign = "right"
            ctx.fillText(this.name, this.x-4+PageOffsetX, this.y+9+PageOffsetY);
        }
    }
}

class NodeConnection{
    constructor(con1, con2){
        if(con1.input){
            this.con1 = con1
            this.con2 = con2
        }else{
            this.con1 = con2
            this.con2 = con1
        }
        this.prog = 0
    }

    draw(){
        draw_curve(this.con1.x+PageOffsetX, this.con1.y+PageOffsetY, this.con2.x+PageOffsetX, this.con2.y+PageOffsetY, prog=this.prog)
    }
}

for(var i = 0; i < 10; i++){
    node_list.push(new Node(Math.random()*canvas.width*2, Math.random()*canvas.height*2, 150, 100, null, ["input1", "input2", "input3"], ["output1", "output2", "output3"]))
}

function master_draw(){
    ctx.fillStyle = color_pallet.background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fill()

    grid_spacing = 80
    ctx.lineWidth = 1
    for(var xl = -grid_spacing*2; xl < window.innerWidth/grid_spacing; xl++){
        ctx.beginPath()
        ctx.moveTo(xl*grid_spacing + (PageOffsetX%grid_spacing), -5 + (PageOffsetY%grid_spacing))
        ctx.setLineDash([10, 10]);
        ctx.lineTo(xl*grid_spacing + (PageOffsetX%grid_spacing), window.innerHeight + (PageOffsetY%grid_spacing))
        ctx.strokeStyle = color_pallet.grid_lines
        ctx.stroke()
    }
    for(var yl = 0; yl < window.innerHeight/grid_spacing; yl++){
        ctx.beginPath()
        ctx.moveTo(-5 + (PageOffsetX%grid_spacing), (yl-1)*grid_spacing + (PageOffsetY%grid_spacing))
        ctx.setLineDash([10, 10]);
        ctx.lineTo(window.innerWidth + (PageOffsetX%grid_spacing), (yl-1)*grid_spacing + (PageOffsetY%grid_spacing))
        ctx.strokeStyle = color_pallet.grid_lines
        ctx.stroke()
    }

    node_list.forEach(node => {
        node.draw()
        node.node_connectors.forEach(element => {
            element.draw()
        });
    });

    connection_list.forEach(element => {
        //element.prog = Math.min(1, element.prog+0.05)
        element.prog = lerp(element.prog, 1, 0.05)
        element.draw()
    });

    if(MouseButtons == 0){
        ShiftOriginX = null
        ShiftOriginY = null
        if(selected_object != null){
            if(selected_object.constructor == NodeConnector && connection_select != null){
                var inp
                var oup
                if(selected_object.input){inp = selected_object; oup = connection_select;}else{inp = connection_select; oup = selected_object;}

                exists = false

                for(var i = 0; i < connection_list.length; i++){
                    if((connection_list[i].con1 == inp && connection_list[i].con2 == oup) || (connection_list[i].con1 == oup && connection_list[i].con2 == inp)){
                        exists = true
                    }else if(connection_list[i].con1 == inp || connection_list[i].con2 == inp){
                        connection_list.splice(i, 1)
                    }
                }

                if(!exists){connection_list.push(new NodeConnection(selected_object, connection_select))}
            }
        }
        selected_object = null
        connection_select = null
        node_list.forEach(node => {
            if(MouseX > node.x && MouseX < node.x+node.width && MouseY > node.y && MouseY < node.y+node.height){
                selected_object = node
            }
            node.node_connectors.forEach(element => {
                //if(distance(MouseX, MouseY, element.x+5, element.y+5) <= 10){
                if(MouseX >= element.x-5 && MouseX <= element.x+15 && MouseY >= element.y-5 && MouseY <= element.y+15){
                    selected_object = element
                }
            });
        });
    }

    if(ShiftSelect && MouseButtons == 1){
        if(ShiftOriginX == null){
            ShiftOriginX = MouseX
            ShiftOriginY = MouseY
        }

        ctx.beginPath()
        ctx.strokeStyle = color_pallet.lines
        ctx.setLineDash([1, 0])
        ctx.lineWidth = 3
        ctx.roundRect(ShiftOriginX+PageOffsetX, ShiftOriginY+PageOffsetY, MouseX-ShiftOriginX, MouseY-ShiftOriginY, 10)
        ctx.stroke()

        if(!KeyboardKeysDown.includes("ShiftLeft")){
            area_select_objects = []
        }
        node_list.forEach(node => {
            x_c = node.x + node.width/2
            y_c = node.y + node.height/2
            if(x_c >= Math.min(ShiftOriginX, MouseX) && x_c <= Math.max(ShiftOriginX, MouseX) && y_c >= Math.min(ShiftOriginY, MouseY) && y_c <= Math.max(ShiftOriginY, MouseY)){
                if(!area_select_objects.includes(node)){
                    area_select_objects.push(node)
                }
            }
        });
    }

    if(MouseButtons == 1 && !ShiftSelect && !KeyboardKeysDown.includes("ControlLeft") && !KeyboardKeysDown.includes("ShiftLeft")){
        if(selected_object != null){
            if(selected_object.constructor == NodeConnector){
                if(selected_object.input){
                    draw_curve(selected_object.x+PageOffsetX, selected_object.y+PageOffsetY, MouseX-5+PageOffsetX, MouseY-5+PageOffsetY, prog=0)
                }else{
                    draw_curve(MouseX-5+PageOffsetX, MouseY-5+PageOffsetY, selected_object.x+PageOffsetX, selected_object.y+PageOffsetY, prog=0)
                }

                connection_select = null
                node_list.forEach(node => {
                    node.node_connectors.forEach(element => {
                        if(distance(MouseX, MouseY, element.x+5, element.y+5) <= 10 && element.input != selected_object.input && element.parent != selected_object.parent){
                            element.selected = true
                            connection_select = element
                        }
                    });
                });
            }
            if(selected_object.constructor == Node){
                moveX = MouseX - MouseXPrev
                moveY = MouseY - MouseYPrev
                if(area_select_objects.includes(selected_object)){
                    area_select_objects.forEach(node => {
                        node.move_relative(moveX, moveY)
                    });
                }else{
                    selected_object.move_relative(moveX, moveY)
                    area_select_objects = []
                }
            }
        }
    }
    MouseXPrev = MouseX
    MouseYPrev = MouseY
    
    window.requestAnimationFrame(master_draw);
}

master_draw()