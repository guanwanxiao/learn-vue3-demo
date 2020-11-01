import { Shape, RectShape, CircleShape } from './scaleConfig'
const shapeList: Shape[] = [
  {
    type: 'rect',
    x: 50,
    y: 50,
    w: 100,
    h: 100,
    fillStyle: 'green',
    // 表示当前图形的层级，用于重叠时候判断哪个在上面
    zIndex: 0
  },
  {
    type: 'circle',
    x: 250,
    y: 100,
    r: 50,
    fillStyle: 'red',
    zIndex: 1
  }
]
let pathIndex = -1
let pointInPathList: Shape[] = []
const ctrolPoint = {
  w: 20,
  h: 20
}
let isDragging = false
let cursorPointer = ''
// 当前拖动点距离中心点的距离
let mouseDown = {
  diffX:0,
  diffY:0
}
// 是否触发 mousemove 事件，只有mousedown 后才会触发
let canMove=false
class Canvas {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  imageData!: ImageData
  constructor(parent = document.body, width = 500, height = 500) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    parent.appendChild(this.canvas)
    // ctx 可能是 null ,这里将他断言为 CanvasRenderingContext2D 类型
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D
    this.getImageData()
    this.listen()
  }
  // 返回是否存在选中的图形
  get hasPathIndex() {
    return pathIndex !== -1
  }
  initDraw() {
    const { ctx, imageData } = this
    // 将画面首次的图形重新填充到 canvas 上，由于后面绘制会产生很多 path ，但是在重置画面的时候不像绘制这些 path
    this.ctx.putImageData(imageData, 0, 0)
    for (const shape of shapeList) {
      this.drawShap(shape)
    }
  }
  // 存储初始化的 canvas 图像
  getImageData() {
    this.imageData = this.ctx!.getImageData(0, 0, this.canvas.width, this.canvas.height)
  }
  /***** 添加事件监听 */
  listen() {
    this.mouseDown()
    this.mouseMove()
    this.mouseUp()
  }
  mouseDown() {
    const canvas = this.canvas
    canvas.addEventListener('mousedown',e=>{
      // 将之前选中图形的序号保留
      let oldIndex = pathIndex
      const { x, y } = this.windowLocToCanvas(e)
      // 重新判断当前选中的图形
      this.judgeIsPointInPath(x, y)
      // 选中图形，并且和之前绘制的图形不同就绘制控制框
      if (pathIndex !== -1 && oldIndex !== pathIndex) {
        this.drawControls()
      }

      /**
       * 在拖拽状态下通过鼠标位置来判断是拖动还是缩放
       * 1. 如果不在四个控制点上就是拖拽
       * 2. 如果在四个控制点上就是缩放
       */
      if(this.hasPathIndex) {
        const {x,y} = shapeList[pathIndex]
        let loc = this.windowLocToCanvas(e)
        // 计算拖动点距离中心点的距离，这样当 onmousemove 事件触发的时候要去通过这个来计算当前的中心点在哪里。
        mouseDown = { diffX:loc.x - x,diffY:loc.y-y }
        const isInRect = this.draggingPosition(loc)
        // 当点击了矩形选择框将 canMove 标记为 true
        if(isInRect) {
          canvas.style.cursor = 'move'
          canMove = true
        }else{
          canvas.style.cursor = cursorPointer
        }
      }else{
        canvas.style.cursor = 'default'
      }
    })
  }
  mouseMove() {
    const canvas = this.canvas
    canvas.addEventListener('mousemove',e =>{
      if(this.hasPathIndex && canMove) {
        const loc = this.windowLocToCanvas(e)
        const isInRect = this.draggingPosition(loc)
        // move
        if(isInRect) {
          const {x,y} = this.windowLocToCanvas(e)
          const { diffX,diffY } = mouseDown
          const shape = shapeList[pathIndex]
          console.log('diffy',y,y - diffY,y)
          console.log('diffx',x,x - diffX,x)
          if(shape.type === 'rect'){
            const { w,h } = shape
            shape.x = x - diffX
            shape.y = y - diffY
          }else if(shape.type === 'circle'){
            shapeList[pathIndex].x = x - diffX 
            shapeList[pathIndex].y = y - diffY
          }
          this.initDraw()
          // 由于 initDraw 绘制的时候是按 shapeList 中图形的排序来绘制的，后面绘制的层级会高于前面绘制的，显示在其上，为了让选中的显示在最上面，这里将选中的重新绘制一遍
          // onmouseup 中同理
          this.drawShap(shapeList[pathIndex])
          this.drawControls()
        }
      }
    })
  }
  mouseUp() {
    const canvas = this.canvas
    window.addEventListener('mouseup',e=>{
      // 鼠标抬起后，只需要将 canMove 设置为 false ，只有当 canvas 只触发了 mousemove，在此之前未触发 mousedown 选中图形是不会跟随的。
      canMove = false
      this.drawShap(shapeList[pathIndex])
      this.drawControls()
    })
  }
  resetConfig() {
    pathIndex = -1
    isDragging = false
    pointInPathList = []
  }
  // 判断鼠标落在四个控制点上还是，矩形上,只支持按比例缩放，这样能保证图形不变。
  draggingPosition(loc:{x:number,y:number}) {
    const { x,y } = loc
    const shape = shapeList[pathIndex]
    const fourPoint = this.getFourPointPos(shape)
    // 这里可以通过另外一个 canvas 绘制 path来判断的是否在路径中，也可以通过数学计算判断
    const isInRectLeftTop = x > fourPoint[0][0] && y>fourPoint[0][1]  
    const isInRectRightTop = x < fourPoint[1][0] && y> fourPoint[1][1]
    const isInRectRightBottom = x < fourPoint[2][0] && y< fourPoint[2][1]
    const isInRectLeftBottom = x> fourPoint[3][0] && y< fourPoint[3][1]
    const { w,h } = ctrolPoint
    // 判断当前点击点是否在四个控制点中
    const pointerMap = [
      {
        isIn:x < fourPoint[0][0] && y<(fourPoint[0][1]+h/2) || y<fourPoint[0][1] && x< (fourPoint[0][0] + w/2)   ,
        pointer:'nw-resize'
      },
      {
        isIn:x > fourPoint[1][0] && y<(fourPoint[1][1]+h/2) || y<fourPoint[1][1] && x > (fourPoint[1][0] - w/2),
        pointer:'ne-resize'
      },
      {
        isIn:x > fourPoint[2][0] && y>(fourPoint[2][1]-h/2) || y>fourPoint[2][1] && x> (fourPoint[2][0] - w/2),
        pointer:'se-resize'
      },
      {
        isIn:x < fourPoint[3][0] && y>(fourPoint[3][1]-h/2) || y>fourPoint[3][1] && x< (fourPoint[0][0] + w/2),
        pointer:'sw-resize'
      }
    ]
    for(let item of pointerMap){
      const { isIn,pointer } = item
      if(isIn) {
        cursorPointer = pointer
        break
      }
    }
    return isInRectLeftTop && isInRectRightTop && isInRectRightBottom && isInRectLeftBottom
  }
  // 获取绘制控制框的四个点,返回的点是从 左上角->右上角逆时针旋转的。
  getFourPointPos(shape:Shape):[number,number][]{
    const { type, x, y } = shape
    if(shape.type === 'rect'){
      const { w,h } = shape
      return [
        [x,y],[x+w,y],[x+w,y+h],[x,y+h]
      ]
    }else if(shape.type === 'circle'){
      const { r } = shape
      return [
        [x-r,y-r],
        [x+r,y-r],
        [x+r,y+r],
        [x-r,y+r]
      ]
    }else{
      return [
        [0,0]
      ]
    }
  }
  // 绘制控制点
  drawControls() {
    const shape = shapeList[pathIndex]
    const { type, x, y } = shape
    const { ctx } = this
    const { w: pw, h: ph } = ctrolPoint
    const fourPoint = this.getFourPointPos(shape)
    const four = fourPoint.map((list)=>{
      // 这里需要给一个变量赋值，定义好这个变量，不然直接返回 return [1,2] ts无法识别返回值
      list = [list[0]-pw/2,list[1]-ph/2]
      return list
    })
    if (shape.type === 'rect') {
      const { w, h } = shape
      // 矩形的四个点 (x- pw/2,y-ph/2) (x+w-pw/2,y-ph/2) (x+w-pw/2,y+h-ph/2)(x-pw/2,y+h-ph/2)]
      this.drawFourPoint(four)
      this.connectFourPoint(fourPoint[0],fourPoint.slice(1))
    } else {
      const { r } = shape
      // (x-r,y-r) (x+r,y-r) (x+r,y+r) (x-r,y+r)
      this.drawFourPoint(four)
      this.connectFourPoint(fourPoint[0],fourPoint.slice(1))
    }
  }
  // 绘制四个点
  drawFourPoint(list: [number,number][]) {
    const ctx = this.ctx
    ctx.beginPath()
    const { w: pw, h: ph } = ctrolPoint
    list.forEach(([x,y])=>{
      ctx.rect(x,y,pw,ph)
    })
  }
  // 连线四个点
  connectFourPoint(start: [number,number],list: [number,number][]) {
    const ctx = this.ctx
    ctx.moveTo(start[0], start[1])
    list.forEach(([x,y])=>{
      ctx.lineTo(x,y)
    })
    ctx.closePath()
    ctx.strokeStyle = 'blue'
    ctx.stroke()
  }
  // 找出点击的图像
  judgeIsPointInPath(x: number, y: number) {
    // 如果当前有图形被选中，判断点击的是不是当前选中的图形
    if(this.hasPathIndex){
      // 如果点击时候选中的还是上一次绘制的，就不需要进行后面的判断
      if(this.ctx.isPointInPath(x,y)){
        return 
      }
    }
    this.findPath(x, y)
    this.findCoverOne()
    // 重新绘制图形
    this.initDraw()
    // 如果有图形被选中，那么绘制控制框，否则就不用绘制控制框了
    if(this.hasPathIndex){
      this.drawControls()
    }
  }
  findPath(x: number, y: number) {
    pointInPathList = []
    // 遍历图形列表，找出点所在的所有图形
    shapeList.forEach((ele, index) => {
      this.drawShap(ele)
      if (this.ctx.isPointInPath(x, y)) {
        // 给图像添加上在列表位置的标记
        ele.pathIndex = index
        pointInPathList.push(ele)
      }
    })
  }
  findCoverOne() {
    if (pointInPathList.length === 0) {
      pathIndex = -1
    } else {
      pointInPathList.sort((a, b) => b.zIndex - a.zIndex)
      pathIndex = pointInPathList[0].pathIndex as number
      // pointInPathList[pathIndex].isDragging = true
    }
  }
  windowLocToCanvas(e: MouseEvent) {
    const { clientX, clientY } = e
    const { top, left } = this.canvas.getBoundingClientRect()
    return {
      x: clientX - top,
      y: clientY - left
    }
  }
  // 绘制图像
  drawShap(shape: Shape) {
    const { ctx } = this
    const { type } = shape
    // 在 interface 中使用了字面量定义类型，判断的时候可以借助字面量判断
    if (shape.type === 'rect') {
      this.drawRect(shape)
    }
    if (shape.type === 'circle') {
      this.drawCircle(shape)
    }
  }
  drawRect(shape: RectShape) {
    const ctx = this!.ctx
    const { x, y, fillStyle, w, h } = shape
    ctx.beginPath()
    ctx.rect(x, y, w, h)
    ctx.fillStyle = fillStyle
    ctx.fill()
  }
  drawCircle(shape: CircleShape) {
    const { x, y, fillStyle, r } = shape
    const { ctx } = this
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fillStyle = fillStyle
    ctx.fill()
  }
}

const instance = new Canvas()

instance.initDraw()