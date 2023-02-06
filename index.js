var canvas = document.querySelector("canvas");

canvas.width = window.innerWidth*2;
canvas.height = window.innerHeight*2;

var selected_object = null
var connection_select = null

var MouseX = 0
var MouseY = 0
var MouseButtons = 0

var objectClickOffsetX = null
var objectClickOffsetY = null

var node_list = []
var connection_list = []

var color_pallet = {
    "text":"#e6c677",
    "background":"#1e1e1e",
    "grid_lines":"#303030",
    "nodes":"#2d2d30",
    "lines":"#e6c677",
    "select":"#e6c677",
    "connector":"#0e0c0c"
}

canvas.addEventListener('mousemove', function (event) {
    MouseX = event.pageX
    MouseY = event.pageY
    MouseButtons = event.buttons
    canvas.style.cursor = "default"
    if(MouseButtons == 1){
        if(selected_object == null){
            window.scrollBy(-event.movementX, -event.movementY);
            canvas.style.cursor = "move"
        }
    }
});

canvas.addEventListener('mouseup', function (event) {
    MouseButtons = event.buttons
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
    ctx.rect(low-(x_control/2)*prog, 0, (high-low)*prog+(x_control)*prog, canvas.height);
    ctx.clip();

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
        ctx.roundRect(this.x-3, this.y-3, this.width+6, this.height+6, 17.5)
        if(this == selected_object){
            ctx.fillStyle = color_pallet.select;
        }else{
            ctx.fillStyle = color_pallet.background;
        }
        ctx.fill();

        ctx.beginPath();
        ctx.roundRect(this.x, this.y, this.width, this.height, 15)
        if(this.color == null){
            ctx.fillStyle = color_pallet.nodes;
        }
        ctx.fill();
        
        this.node_connectors.forEach(element => {
            element.draw()
        });
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
        ctx.roundRect(this.x, this.y, 10, 10, 15)
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
            ctx.fillText(this.name, this.x+14, this.y+9);
        }else{
            ctx.textAlign = "right"
            ctx.fillText(this.name, this.x-4, this.y+9);
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
        draw_curve(this.con1.x, this.con1.y, this.con2.x, this.con2.y, prog=this.prog)
    }
}

node_list.push(new Node(100, 100, 150, 100, null, ["input1", "input1"], ["output1", "output2", "output3"]))
node_list.push(new Node(500, 200, 150, 100, null, ["input1", "input1"], ["output1", "output2", "output3"]))
node_list.push(new Node(700, 200, 150, 100, null, ["output1", "output2", "output3"], ["input1", "input1"]))
node_list.push(new Node(100, 500, 150, 100, null, ["input1", "input2", "input3"], ["output1", "output2"]))

function master_draw(){
    ctx.fillStyle = color_pallet.background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fill()

    grid_spacing = 80
    ctx.lineWidth = 1
    for(var xl = 0; xl < canvas.width/grid_spacing; xl++){
        ctx.beginPath()
        ctx.moveTo(xl*grid_spacing, -5)
        ctx.setLineDash([10, 10]);
        ctx.lineTo(xl*grid_spacing, canvas.height)
        ctx.strokeStyle = color_pallet.grid_lines
        ctx.stroke()
    }
    for(var yl = 0; yl < canvas.height/grid_spacing; yl++){
        ctx.beginPath()
        ctx.moveTo(-5, yl*grid_spacing)
        ctx.setLineDash([10, 10]);
        ctx.lineTo(canvas.width, yl*grid_spacing)
        ctx.strokeStyle = color_pallet.grid_lines
        ctx.stroke()
    }

    node_list.forEach(element => {
        element.draw()
    });

    connection_list.forEach(element => {
        //element.prog = Math.min(1, element.prog+0.05)
        element.prog = lerp(element.prog, 1, 0.05)
        element.draw()
    });

    if(MouseButtons == 0){
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
        objectClickOffsetX = null
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

    if(MouseButtons == 1){
        if(selected_object != null){
            if(selected_object.constructor == NodeConnector){
                if(selected_object.input){
                    draw_curve(selected_object.x, selected_object.y, MouseX-5, MouseY-5, prog=0)
                }else{
                    draw_curve(MouseX-5, MouseY-5, selected_object.x, selected_object.y, prog=0)
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
                if(objectClickOffsetX == null){
                    objectClickOffsetX = selected_object.x - MouseX
                    objectClickOffsetY = selected_object.y - MouseY
                }
                selected_object.move(MouseX+objectClickOffsetX, MouseY+objectClickOffsetY)
            }
        }
    }
    
    window.requestAnimationFrame(master_draw);
}

master_draw()