import State from './State'
import {Rect,Circle} from './shape/index'
import { Shape } from './types/index'
console.log('shape',Rect,Circle)
// console.log('shape',shape)
export default class Canvas{
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  imageData!: ImageData
  state: State
  constructor(state: State,parent = document.body, width = 1000, height = 1000) {
    this.canvas = document.createElement('canvas')
    this.canvas.width = width
    this.canvas.height = height
    this.state = state
    parent.appendChild(this.canvas)
    // ctx 可能是 null ,这里将他断言为 CanvasRenderingContext2D 类型
    this.ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D
    this.getImageData()
    this.listen()
  }
  // 存储初始化的 canvas 图像
  getImageData() {
    this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
  }
  listen() {
    this.mouseDown()
    this.mouseMove()
    this.mouseUp()
  }
  mouseDown() {
    const canvas = this.canvas
    canvas.addEventListener('mousedown',e=>{
      const loc = this.windowLocToCanvas(e)
    })
  }
  mouseMove() {
    const canvas = this.canvas
    canvas.addEventListener('mousemove',e=>{
      const loc = this.windowLocToCanvas(e)
    })
  }
  mouseUp() {
    const canvas = this.canvas
    canvas.addEventListener('mouseover',e=>{
      const loc = this.windowLocToCanvas(e)
    })
  }
  adaptShape(shape: Shape) {
    if(shape.type === 'rect'){
      return new Rect(shape)
    }else{
      return new Circle(shape)
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
  initDraw() {
    const { ctx, imageData } = this
    // 将画面首次的图形重新填充到 canvas 上，由于后面绘制会产生很多 path ，但是在重置画面的时候不像绘制这些 path
    this.ctx.putImageData(imageData, 0, 0)
    for (const [index,shape] of this.state.shapeList.entries()) {
      this.adaptShape(shape).drawShape(ctx)
    }
  }
}