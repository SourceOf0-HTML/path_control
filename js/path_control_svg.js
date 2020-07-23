
/**
 * PathCtr
 * Singleton
 */
var PathCtr = {
  isOutputDebugPrint: false,
  debugPrint: function() {
    if(!this.isOutputDebugPrint) return;
    //console.log("Func : " + this.debugPrint.caller.name);
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
  
  isOutputLoadState: true,
  loadState: function() {
    if(!this.isOutputLoadState) return;
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
  
  defaultCanvasContainerID: "path-container",  // default canvas container element name
  defaultActionName: "base",
  defaultBoneName: "bone",
  initTarget: null,  // instance to be initialized
  binDataPosRange: 20000, // correction value of coordinates when saving to binary data
  
  pathContainer: null,
  context: null,
  subContext: null,
  viewWidth: 0,
  viewHeight: 0,
  
  requestAnimationIDs: [],
  setTimeoutIDs: [],
  
  cancelRequestAnimation: function() {
    if(this.requestAnimationIDs.length > 1 || this.setTimeoutIDs.length > 1) {
      PathCtr.debugPrint("requestAnimationIDs:" + this.requestAnimationIDs.length + ", " + setTimeoutIDs.length);
    }
    this.requestAnimationIDs.forEach(window.cancelAnimationFrame);
    this.requestAnimationIDs.length = 0;
    this.setTimeoutIDs.forEach(window.clearTimeout);
    this.setTimeoutIDs.length = 0;
  },
  
  loadComplete: function(pathContainer) {
    this.pathContainer = pathContainer;
    this.pathContainer.context = this.subContext;
    this.pathContainer.setSize(this.viewWidth, this.viewHeight);
  },
  
  init: function() {
    let container = document.getElementById(this.defaultCanvasContainerID);
    if(!container) {
      console.error("CanvasContainer is not found.");
      return;
    }
    
    let canvas = document.createElement("canvas");
    canvas.className = "main-canvas";
    container.appendChild(canvas);
    
    let subCanvas = document.createElement("canvas");
    subCanvas.className = "sub-canvas";
    subCanvas.style.cssText = "display:none;";
    container.appendChild(subCanvas);
    
    this.context = canvas.getContext("2d");
    this.subContext = subCanvas.getContext("2d");
    if(!this.context || !this.subContext) {
      console.error("context is not found.");
      return;
    }
    
    let requestAnimationFrame = window.requestAnimationFrame ||
                                window.mozRequestAnimationFrame ||
                                window.webkitRequestAnimationFrame ||
                                window.msRequestAnimationFrame;
    let cancelAnimationFrame = window.cancelAnimationFrame ||
                                window.mozCancelAnimationFrame;
    
    this.viewWidth = document.documentElement.clientWidth;
    this.viewHeight = document.documentElement.clientHeight;
    
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + this.viewWidth + "px;height:" + this.viewHeight + "px;");
    canvas.width = subCanvas.width = this.viewWidth;
    canvas.height = subCanvas.height = this.viewHeight;
    
    window.addEventListener("resize", ()=> {
      this.viewWidth = document.documentElement.clientWidth;
      this.viewHeight = document.documentElement.clientHeight;
      canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + this.viewWidth + "px;height:" + this.viewHeight + "px;");
      if(!!this.pathContainer) this.pathContainer.setSize(this.viewWidth, this.viewHeight);
    });
    
    
    let frameTime = 1 / 24;
    let fixFrameTime = frameTime;
    let totalFrames = 260;
    let frameNumber = 0;
    let prevTimestamp = 0;
    let average = 0;
    
    let draw =(timestamp)=> {
      if(typeof DebugPath !== "undefined" && DebugPath.isStop) {
        if(!DebugPath.isStep) return;
        DebugPath.isStep = false;
        console.log("--STEP--");
      }
      if(!canvas.parentNode) {
        this.cancelRequestAnimation();
        return;
      }
      
      if(typeof timestamp === "undefined") return;
      
      let elapsed = (timestamp - prevTimestamp) / 1000;
      average = (average + elapsed) / 2;
      prevTimestamp = timestamp;
      this.debugPrint((average * 100000)^0);
      
      if(!this.pathContainer) return;
      
      canvas.width = subCanvas.width = this.viewWidth;
      canvas.height = subCanvas.height = this.viewHeight;
      
      this.pathContainer.update(frameNumber, "walk");
      
      this.subContext.clearRect(0, 0, this.viewWidth, this.viewHeight);
      this.pathContainer.draw();
      frameNumber = frameNumber % totalFrames + 1;
      
      this.context.clearRect(0, 0, this.viewWidth, this.viewHeight);
      let imagedata = this.subContext.getImageData(0, 0, this.viewWidth, this.viewHeight);
      this.context.putImageData(imagedata, 0, 0);
      imagedata = null;
      
      if(average > frameTime * 2) {
        fixFrameTime *= 0.99;
        this.debugPrint("up");
      } else if(average < frameTime * 0.5) {
        fixFrameTime *= 1.01;
        this.debugPrint("down");
      } else {
        fixFrameTime = (frameTime + fixFrameTime) / 2;
      }
    };
    
    let timer =()=> {
      this.cancelRequestAnimation();
      this.requestAnimationIDs.push(window.requestAnimationFrame(draw));
      this.setTimeoutIDs.push(window.setTimeout(timer, fixFrameTime*1000));
    };
    
    //this.debugPrint("base : ", frameTime, frameTime * 10, frameTime * 0.1);
    this.setTimeoutIDs.push(window.setTimeout(timer, fixFrameTime*1000));
  },
};


class Matrix {
  constructor() {
    this.a = 1;  // scale x
    this.b = 0;  // skew y
    this.c = 0;  // skew x
    this.d = 1;  // scale y
    this.e = 0;  // translate x
    this.f = 0;  // translate y
  };
  
  reset() {
    this.a = this.d = 1;
    this.b = this.c = this.e = this.f = 0;
    return this;
  };
  
  /**
   * @param {Array} point
   * @param {Integer} index
   */
  applyToPoint(point, index = 0) {
    let x = point[index];
    let y = point[index+1];
    point[index] = x * this.a + y * this.c + this.e;
    point[index+1] = x * this.b + y * this.d + this.f;
  };
  
  /**
   * @param {Array} points
   * @param {Integer} index
   */
  applyToArray(points, index = 0) {
    let pointsNum = points.length;
    for(let i = index; i < pointsNum; i += 2) {
      this.applyToPoint(points, i);
    }
  };
  
  /**
   * @param {Matrix} m
   * @return {Matrix}
   */
  setMatrix(m) {
    this.a = m.a;
    this.b = m.b;
    this.c = m.c;
    this.d = m.d;
    this.e = m.e;
    this.f = m.f;
    return this;
  };
  
  /**
   * @param {Matrix} m2
   * @param {Number} t - interpolation [0.0, 1.0]
   * @return {Matrix} - new Matrix
   */
  interpolate(m2, t) {
    let m = new Matrix();
    m.a = this.a + (m2.a - this.a) * t;
    m.b = this.b + (m2.b - this.b) * t;
    m.c = this.c + (m2.c - this.c) * t;
    m.d = this.d + (m2.d - this.d) * t;
    m.e = this.e + (m2.e - this.e) * t;
    m.f = this.f + (m2.f - this.f) * t;
    return m;
  };
  
  /**
   * @param {Number} t
   * @return {Matrix} - new Matrix
   */
  mult(t) {
    let m = new Matrix();
    m.a = this.a * t;
    m.b = this.b * t;
    m.c = this.c * t;
    m.d = this.d * t;
    m.e = this.e * t;
    m.f = this.f * t;
    return m;
  };
  
  /**
   * @param {Number} t
   * @param {Number} x
   * @param {Number} y
   * @param {Array} point
   * @param {Integer} index
   */
  multAndAddPoint(t, x, y, point, index) {
    point[index] += (x * this.a + y * this.c + this.e) * t;
    point[index+1] += (x * this.b + y * this.d + this.f) * t;
  };
  
  /**
   * @param {Number} a - scale x
   * @param {Number} b - skew y
   * @param {Number} c - skew x
   * @param {Number} d - scale y
   * @param {Number} e - translate x
   * @param {Number} f - translate y
   * @return {Matrix}
   */
  setTransform(a, b, c, d, e, f) {
    this.a = a;
    this.b = b;
    this.c = c;
    this.d = d;
    this.e = e;
    this.f = f;
    return this;
  };
  
  /**
   * @param {Number} a2 - scale x
   * @param {Number} b2 - skew y
   * @param {Number} c2 - skew x
   * @param {Number} d2 - scale y
   * @param {Number} e2 - translate x
   * @param {Number} f2 - translate y
   * @return {Matrix}
   */
  transform(a2, b2, c2, d2, e2, f2) {
    let a1 = this.a,
        b1 = this.b,
        c1 = this.c,
        d1 = this.d,
        e1 = this.e,
        f1 = this.f;
    this.a = a1 * a2 + c1 * b2;
    this.b = b1 * a2 + d1 * b2;
    this.c = a1 * c2 + c1 * d2;
    this.d = b1 * c2 + d1 * d2;
    this.e = a1 * e2 + c1 * f2 + e1;
    this.f = b1 * e2 + d1 * f2 + f1;
    return this;
  };
  
  rotate(angle) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    return this.transform(cos, sin, -sin, cos, 0, 0);
  };
  
  scale(sx, sy = sx) { return this.transform(sx, 0, 0, sy, 0, 0) };
  scaleX(sx) { return this.transform(sx, 0, 0, 1, 0, 0) };
  scaleY(sy) { return this.transform(1, 0, 0, sy, 0, 0) };
  
  skew(sx, sy) { return this.transform(1, sy, sx, 1, 0, 0) };
  skewX(sx) { return this.transform(1, 0, sx, 1, 0, 0) };
  skewY(sy) { return this.transform(1, sy, 0, 1, 0, 0) };
  
  translate(tx, ty) { return this.transform(1, 0, 0, 1, tx, ty) };
  translateX(tx) { return this.transform(1, 0, 0, 1, tx, 0) };
  translateY(ty) { return this.transform(1, 0, 0, 1, 0, ty) };
};


class Sprite {
  constructor() {
    this.m = new Matrix();
    this.x = 0;
    this.y = 0;
    this.anchorX = 0;
    this.anchorY = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
  };
  
  reset() {
    this.x = 0;
    this.y = 0;
    this.anchorX = 0;
    this.anchorY = 0;
    this.scaleX = 1;
    this.scaleY = 1;
    this.rotation = 0;
  };
  
  /**
   * @return {Sprite}
   */
  clone() {
    let sprite = new Sprite();
    sprite.x = this.x;
    sprite.y = this.y;
    sprite.anchorX = this.anchorX;
    sprite.anchorY = this.anchorY;
    sprite.scaleX = this.scaleX;
    sprite.scaleY = this.scaleY;
    sprite.rotation = this.rotation;
    return sprite;
  };
  
  /**
   * @param {Sprite} s
   * @return {Sprite}
   */
  setSprite(sprite) {
    this.x = sprite.x;
    this.y = sprite.y;
    this.anchorX = sprite.anchorX;
    this.anchorY = sprite.anchorY;
    this.scaleX = sprite.scaleX;
    this.scaleY = sprite.scaleY;
    this.rotation = sprite.rotation;
    return this;
  };
  
  /**
   * @param {Sprite} s
   * @return {Sprite}
   */
  addSprite(sprite) {
    this.x +=sprite.x;
    this.y += sprite.y;
    this.anchorX += sprite.anchorX;
    this.anchorY += sprite.anchorY;
    this.scaleX *= sprite.scaleX;
    this.scaleY *= sprite.scaleY;
    this.rotation = sprite.rotation;
    return this;
  };
  
  /**
   * @param {Sprite} s
   * @return {Sprite} - new Sprite
   */
  compSprite(sprite) {
    let ret = new Sprite();
    ret.x = this.x + sprite.x;
    ret.y = this.y + sprite.y;
    ret.anchorX = this.anchorX + sprite.anchorX;
    ret.anchorY = this.anchorY + sprite.anchorY;
    ret.scaleX = this.scaleX * sprite.scaleX;
    ret.scaleY = this.scaleY * sprite.scaleY;
    ret.rotation = this.rotation + sprite.rotation;
    return ret;
  };
  
  /**
   * @param {Number} offsetX
   * @param {Number} offsetY
   * @return {Matrix}
   */
  getMatrix(offsetX = 0, offsetY = 0) {
    return this.m.reset().translate(this.x + offsetX, this.y + offsetY).rotate(this.rotation).scale(this.scaleX, this.scaleY).translate(- this.anchorX - offsetX, - this.anchorY -  + offsetY);
  };
};


class PathObj {
  constructor(maskIdToUse, pathDataList, pathDiffList, fillRule, fillStyle, lineWidth, strokeStyle) {
    this.maskIdToUse = maskIdToUse;    // ID of the mask to use
    this.pathDiffList = pathDiffList;  // diff pos data array
    this.fillRule = fillRule;          // "nonzero" or "evenodd"
    this.fillStyle = fillStyle;        // fillColor ( context2D.fillStyle )
    this.lineWidth = lineWidth;        // strokeWidth ( context2D.lineWidth )
    this.strokeStyle = strokeStyle;    // strokeColor ( context2D.strokeStyle )
    this.hasActionList = [];           // if true, have action
    this.resultPath = {                // path data for drawing
      pathDataList,
      fillStyle,
      lineWidth,
      strokeStyle,
    };
    
    this.defPath = {                   // default path data
      pathDataList,
      fillStyle,
      lineWidth,
      strokeStyle,
    };
  };
  
  addAction(pathDataList, fillStyle, lineWidth, strokeStyle, frame, actionID) {
    if(!pathDataList) {
      pathDataList = this.defPath.pathDataList.slice();
    } else if(this.defPath.pathDataList.length != pathDataList.length) {
      console.error("The number of paths does not match.");
      console.log(this.defPath.pathDataList);
      console.log(pathDataList);
      pathDataList = this.defPath.pathDataList.slice();
    }
    
    let pathDiffList = [];
    this.defPath.pathDataList.forEach((d, i)=>{
      if(d.type != pathDataList[i].type) {
        console.error("type does not match.");
        console.log(this.defPath.pathDataList);
        console.log(pathDataList);
        return;
      }
      if(!d.pos) return;
      pathDiffList[i] = [];
      d.pos.forEach((val, j)=>{
        pathDiffList[i].push(pathDataList[i].pos[j] - val);
      });
    });
    
    if( this.hasActionList.length == 0 ) {
      // init action data
      this.pathDiffList = [[this.pathDiffList]];  // path data array
      this.fillStyle = [[this.fillStyle]];        // fillColor ( context2D.fillStyle )
      this.lineWidth = [[this.lineWidth]];        // strokeWidth ( context2D.lineWidth )
      this.strokeStyle = [[this.strokeStyle]];    // strokeColor ( context2D.strokeStyle )
      this.hasActionList[0] = true;
    }
    if( !this.hasActionList[actionID] ) {
      this.pathDiffList[actionID] = [this.pathDiffList[0][0]];
      this.fillStyle[actionID] = [this.fillStyle[0][0]];
      this.lineWidth[actionID] = [this.lineWidth[0][0]];
      this.strokeStyle[actionID] = [this.strokeStyle[0][0]];
      this.hasActionList[actionID] = true;
    }
    
    this.pathDiffList[actionID][frame] = pathDiffList;
    
    let isEmpty = true;
    for(let i = this.lineWidth[actionID].length - 1; i >= 0; --i) {
      if(typeof this.lineWidth[actionID][i] === "undefined") continue;
      if(this.lineWidth[actionID][i] == lineWidth) break;
      this.lineWidth[actionID][frame] = lineWidth;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.lineWidth[actionID][frame] = undefined;
    } else {
      isEmpty = true;
    }
    
    for(let i = this.strokeStyle[actionID].length - 1; i >= 0; --i) {
      if(typeof this.strokeStyle[actionID][i] === "undefined") continue;
      if(this.strokeStyle[actionID][i] == strokeStyle) break;
      this.strokeStyle[actionID][frame] = strokeStyle;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.strokeStyle[actionID][frame] = undefined;
    } else {
      isEmpty = true;
    }
    
    for(let i = this.fillStyle[actionID].length - 1; i >= 0; --i) {
      if(typeof this.fillStyle[actionID][i] === "undefined") continue;
      if(this.fillStyle[actionID][i] == fillStyle) break;
      this.fillStyle[actionID][frame] = fillStyle;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.fillStyle[actionID][frame] = undefined;
    } else {
      isEmpty = true;
    }
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getPathDataList(frame = 0, actionID = 0) {
    let ret = [];
    
    let makeData =(pathDiffList)=> {
      this.defPath.pathDataList.forEach((d, i)=>{
        ret.push({
          type: d.type,
          pos: (!d.pos)? undefined : d.pos.map((val, j)=>val+pathDiffList[i][j]),
        });
      });
      return ret;
    }
    
    if( this.hasActionList.length == 0 ) {
      return makeData(this.pathDiffList);
    }
    if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    return makeData(this.pathDiffList[actionID][Math.min(frame, this.pathDiffList[actionID].length-1)]);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getMergePathDataList(pathContainer, frame = 0, actionID = 0) {
    let ret = [];
    
    let makeData =(pathDiffList)=> {
      this.defPath.pathDataList.forEach((d, i)=>{
        ret.push({
          type: d.type,
          pos: (!d.pos)? undefined : d.pos.map((val, j)=>val+pathDiffList[i][j]),
        });
      });
      return ret;
    }
    
    if( this.hasActionList.length == 0 ) {
      return makeData(this.pathDiffList);
    }
    
    if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    let pathDataList = makeData(this.pathDiffList[actionID][Math.min(frame, this.pathDiffList[actionID].length-1)]);
    
    if(pathContainer.actionList.length == 1) return pathDataList;
    
    pathContainer.actionList.forEach(action=>{
      if(actionID == action.id) return;
      if( !this.hasActionList[action.id] ) return;
      frame = action.currentFrame;
      
      this.pathDiffList[action.id][Math.min(frame, this.pathDiffList[action.id].length-1)].forEach((list, i)=>{
        if(!list) return;
        list.forEach((val, j)=>{
          if(!val) return;
          pathDataList[i].pos[j] += val;
        });
      });
    });
    return pathDataList;
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   */
  update(frame, actionID, pathContainer, matrix) {
    let updatePath =d=>{
      if(!!d.pos) matrix.applyToArray(d.pos);
    };
    
    let pathDataList = this.getMergePathDataList(pathContainer, frame, actionID);
    pathDataList.forEach(updatePath);
    this.resultPath.pathDataList = pathDataList;
    
    if( this.hasActionList.length == 0) {
      this.resultPath.lineWidth = this.lineWidth;
      this.resultPath.strokeStyle = this.strokeStyle;
      this.resultPath.fillStyle = this.fillStyle;
      return;
    } else if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    
    let lineWidth, strokeStyle, fillStyle;
    
    pathContainer.actionList.forEach(action=>{
      if(action.pastFrame == action.currentFrame) return;
      
      let targetActionID = action.id;
      if( actionID != 0 && targetActionID == 0) return;
      if( !this.hasActionList[targetActionID] ) return;
      
      let targetLineWidth = this.lineWidth[targetActionID];
      let targetStrokeStyle = this.strokeStyle[targetActionID];
      let targetFillStyle = this.fillStyle[targetActionID];
      
      let setData=()=>{
        if(typeof lineWidth === "undefined") lineWidth = targetLineWidth[Math.min(frame, targetLineWidth.length-1)];
        if(!strokeStyle) strokeStyle = targetStrokeStyle[Math.min(frame, targetStrokeStyle.length-1)];
        if(!fillStyle) fillStyle = targetFillStyle[Math.min(frame, targetFillStyle.length-1)];
      };
      
      if(action.pastFrame <= action.currentFrame) {
        for(frame = action.currentFrame; frame >= action.pastFrame; --frame) setData();
      } else {
        for(frame = action.pastFrame; frame >= action.currentFrame; --frame) setData();
        if(typeof lineWidth !== "undefined") {
          lineWidth = null;
          for(frame = action.currentFrame; frame >= 0; --frame) {
            lineWidth = targetLineWidth[Math.min(frame, targetLineWidth.length-1)];
            if(typeof lineWidth !== "undefined") break;
          }
        }
        if(!!strokeStyle) {
          strokeStyle = null;
          for(frame = action.currentFrame; frame >= 0; --frame) {
            strokeStyle = targetStrokeStyle[Math.min(frame, targetStrokeStyle.length-1)];
            if(!!strokeStyle) break;
          }
        }
        if(!!fillStyle) {
          fillStyle = null;
          for(frame = action.currentFrame; frame >= 0; --frame) {
            fillStyle = targetFillStyle[Math.min(frame, targetFillStyle.length-1)];
            if(!!fillStyle) break;
          }
        }
      }
    });
    if(!!lineWidth) this.resultPath.lineWidth = lineWidth;
    if(!!strokeStyle) this.resultPath.strokeStyle = strokeStyle;
    if(!!fillStyle) this.resultPath.fillStyle = fillStyle;
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, path2D, isMask) {
    this.resultPath.pathDataList.forEach(d=>{
      let pos = d.pos;
      let ratio = pathContainer.pathRatio;
      switch(d.type) {
        case "M":
          path2D.moveTo(pos[0]*ratio, pos[1]*ratio);
          break;
        case "L":
          path2D.lineTo(pos[0]*ratio, pos[1]*ratio);
          break;
        case "C":
          path2D.bezierCurveTo(pos[0]*ratio, pos[1]*ratio, pos[2]*ratio, pos[3]*ratio, pos[4]*ratio, pos[5]*ratio);
          break;
        case "Z":
          path2D.closePath();
          break;
        default:
          console.error("unknown type");
          break;
      }
    });
    if(isMask) return;
    if(!!this.resultPath.lineWidth) {
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = this.resultPath.lineWidth;
      context.strokeStyle = this.resultPath.strokeStyle;
      context.stroke(path2D);
    }
    context.fillStyle = this.resultPath.fillStyle;
    context.fill(path2D, this.fillRule);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   */
  debugDraw(pathContainer, context) {
    let tau = Math.PI*2;
    
    let showPos =(x, y)=> {
      if(!DebugPath.isShowPoints) return;
      let path2D = new Path2D();
      path2D.arc(x, y, DebugPath.pointSize, 0, tau);
      context.fillStyle = DebugPath.pointColor;
      context.fill(path2D, "nonzero");
    };
    
    let showControl =(x0, y0, x1, y1)=> {
      if(!DebugPath.isShowControls) return;
      let path2D = new Path2D();
      path2D.arc(x0, y0, DebugPath.controlSize, 0, tau);
      path2D.arc(x1, y1, DebugPath.controlSize, 0, tau);
      context.fillStyle = DebugPath.controlColor;
      context.fill(path2D, "nonzero");
    };
    
    this.resultPath.pathDataList.forEach(d=>{
      let pos = d.pos;
      let ratio = pathContainer.pathRatio;
      switch(d.type) {
        case "M":
          showPos(pos[0]*ratio, pos[1]*ratio);
          break;
        case "L":
          showPos(pos[0]*ratio, pos[1]*ratio);
          break;
        case "C":
          showControl(pos[0]*ratio, pos[1]*ratio, pos[2]*ratio, pos[3]*ratio);
          showPos(pos[4]*ratio, pos[5]*ratio);
          break;
        case "Z":
          break;
        default:
          console.error("unknown type");
          break;
      }
    });
  };
};


class GroupObj extends Sprite {
  constructor(uid, id, paths, childGroups, hasAction, maskIdToUse) {
    super();
    this.visible = true;              // display when true
    this.uid = uid;                   // uniq id
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.hasActionList = [];          // if true, have action
    this.flexi = [];                  // ID of a flexi-bonded target
    
    if(hasAction) {
      this.childGroups.forEach((val, i)=>(this.hasActionList[i] = true));
      this.resultGroups = childGroups[0][0];
    } else {
      this.resultGroups = childGroups;
    }
  };
  
  addAction(childGroups, frame, actionID) {
    if( childGroups.length == 0 ) return;
    if( this.hasActionList.length == 0 ) {
      if( JSON.stringify(this.childGroups) == JSON.stringify(childGroups) ) return;
      
      // init action data
      this.childGroups = [[this.childGroups]];   // list of group id
      this.hasActionList[0] = true;
    }
    if( !this.hasActionList[actionID] ) {
      this.childGroups[actionID] = [this.childGroups[0][0].concat()];
      this.hasActionList[actionID] = true;
    }
    
    let isEmpty = true;
    for(let i = this.childGroups[actionID].length - 1; i >= 0; --i) {
      if(typeof this.childGroups[actionID][i] === "undefined") continue;
      if(JSON.stringify(childGroups) == JSON.stringify(this.childGroups[actionID][i])) break;
      this.childGroups[actionID][frame] = childGroups;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.childGroups[actionID][frame] = undefined;
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Array} nameList - bone name list
   */
  setFlexiBones(pathContainer, nameList) {
    if(!nameList || !Array.isArray(nameList) || nameList.length == 0) return;
    PathCtr.loadState("GROUP:" + this.id);
    
    this.flexi.length = 0;
    
    nameList.forEach(name=> {
      let bone = pathContainer.getBone(name);
      if(!!bone) {
        PathCtr.loadState("  flexi:");
        this.flexi.push(bone.uid);
        PathCtr.loadState("    " + name);
      }
    });
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  preprocessing(pathContainer) {
    this.reset();
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Sprite} sprite - used to transform the path
   */
  update(pathContainer, sprite, flexiIDList = []) {
    let actionID = pathContainer.currentActionID;
    let frame = pathContainer.actionList[actionID].currentFrame;
    let groupSprite = sprite.compSprite(this);
    let flexi = flexiIDList.concat(this.flexi);
    let groupMatrix = groupSprite.getMatrix();
    
    let getChildGroups =(id, f)=>this.childGroups[id][Math.min(f, this.childGroups[id].length-1)];
    
    this.paths.forEach(path=>{
      path.update(frame, actionID, pathContainer, groupMatrix);
    });
    
    let childGroups = null;
    if(this.hasActionList[actionID]) {
      childGroups = getChildGroups(actionID, frame);
    }
    pathContainer.actionList.forEach(action=>{
      if(!this.hasActionList[action.id]) return;
      if(action.pastFrame == action.currentFrame) return;
      if(action.pastFrame <= action.currentFrame) {
        for(let targetFrame = action.currentFrame; targetFrame >= action.pastFrame; --targetFrame) {
          let targetGroups = getChildGroups(action.id, targetFrame);
          if(!targetGroups) continue;
          childGroups = targetGroups;
          break;
        }
      } else {
        for(let targetFrame = action.pastFrame; targetFrame >= action.currentFrame; --targetFrame) {
          let targetGroups = getChildGroups(action.id, targetFrame);
          if(!targetGroups) continue;
          
          for(let targetFrame = action.currentFrame; targetFrame >= 0; --targetFrame) {
            targetGroups = getChildGroups(action.id, targetFrame);
            if(!targetGroups) continue;
            childGroups = targetGroups;
            break;
          }
          break;
        }
      }
    });
    if(!!childGroups) {
      this.resultGroups = childGroups;
    }
    
    this.resultGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].update(pathContainer, groupSprite, flexi);
    });
    
    if(flexi.length > 0) {
      this.paths.forEach(path=>{
        path.resultPath.pathDataList.forEach(d=>{
          if(!d.pos || d.pos.length == 0) return;
          let points = d.pos;
          let pointsNum = points.length;
          for(let i = 0; i < pointsNum; i += 2) {
            if(flexi.length == 1) {
              let id = flexi[0];
              if(pathContainer.groups[id].strength == 0) continue;
              pathContainer.groups[id].effectSprite.getMatrix().applyToPoint(points, i);
              continue;
            }
            
            let x = points[i];
            let y = points[i+1];
            
            let ratioList = [];
            let sum = 0;
            flexi.forEach(id=>{
              let val = pathContainer.groups[id].calc(x, y);
              sum += val;
              ratioList.push(val);
            });
            
            if(sum == 0) continue;
            
            points[i] = 0;
            points[i+1] = 0;
            
            flexi.forEach((id, j)=>{
              pathContainer.groups[id].effectSprite.getMatrix().multAndAddPoint(1 - ratioList[j]/sum, x, y, points, i);
            });
          }
        });
      });
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, isMask = false) {
    if(!this.visible) {
      return;
    }
    
    let isFoundMask = false;
    
    if(!isMask && !!this.maskIdToUse) {
      let mask = pathContainer.groups[this.maskIdToUse];
      if(!!mask) {
        isFoundMask = true;
        context.save();
        mask.draw(pathContainer, context, true);
      } else {
        console.error("group is not found : " + this.maskIdToUse);
      }
    }
    
    let path2D = isMask? (new Path2D()):null;
    let isUsed = false;
    
    this.paths.forEach(path=>{
      
      isUsed = true;
      
      let isFoundMaskPath = false;
      
      if(!isMask && !!path.maskIdToUse) {
        let maskPath = pathContainer.groups[path.maskIdToUse];
        if(!!maskPath) {
          isFoundMaskPath = true;
          context.save();
          maskPath.draw(pathContainer, context, true);
        } else {
          console.error("mask is not found : " + path.maskIdToUse);
        }
      }
      
      if(!isMask) {
        path2D = new Path2D();
      }
      
      path.draw(pathContainer, context, path2D, isMask);
      
      if(isFoundMaskPath) {
        context.restore();
      }
    });
    
    this.resultGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].draw(pathContainer, context, isMask);
    });
    
    if(isMask && isUsed) {
      context.clip(path2D);
    }
    
    path2D = null;
    
    if(isFoundMask) {
      context.restore();
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   */
  debugDraw(pathContainer, context) {
    if(!this.visible) {
      return;
    }
    
    if(!!this.maskIdToUse) {
      let mask = pathContainer.groups[this.maskIdToUse];
      if(!!mask) {
        mask.debugDraw(pathContainer, context);
      } else {
        console.error("group is not found : " + this.maskIdToUse);
      }
    }
    
    this.paths.forEach(path=>{
      if(!!path.maskIdToUse) {
        let maskPath = pathContainer.groups[path.maskIdToUse];
        if(!!maskPath) {
          maskPath.debugDraw(pathContainer, context);
        } else {
          console.error("mask is not found : " + path.maskIdToUse);
        }
      }
      path.debugDraw(pathContainer, context);
    });
    
    this.resultGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};


class BoneObj extends Sprite {
  constructor(uid, id, paths, childGroups, hasAction) {
    super();
    this.visible = true;              // display when true
    this.uid = uid;                   // uniq id
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.hasActionList = [];          // if true, have action
    
    this.parentID = -1;                // parent bone id
    this.isParentPin = false;          // parent bone is pin bone
    this.feedback = false;             // receive feedback from other bones
    this.strength = 0;                 // scope of influence of bone
    this.effectSprite = new Sprite();  // actual effect sprite
    this.isReady = false;              // can be used for calculation
    
    if(hasAction) {
      this.childGroups.forEach((val, i)=>(this.hasActionList[i] = true));
      this.resultGroups = childGroups[0][0];
    } else {
      this.resultGroups = childGroups;
    }
    
    if(!!paths && paths.length > 0) {
      let pathDataList = paths[0].getPathDataList();
      let x0 = pathDataList[0].pos[0];
      let y0 = pathDataList[0].pos[1];
      let x1 = pathDataList[1].pos[0];
      let y1 = pathDataList[1].pos[1];
      let distX = x1 - x0;
      let distY = y1 - y0;
      let distance = Math.sqrt(distX*distX + distY*distY);
      let angle = Math.atan2(distY, distX);
      this.defState = {  // default bone state
        x0, y0,
        x1, y1,
        distance,
        angle,
      };
      this.currentState = {  // current bone state
        pos: [x0, y0, x1, y1],
        distance,
        angle,
      };
    }
  };
  
  addAction(childGroups, frame, actionID) {
    if( childGroups.length == 0 ) return;
    if( this.hasActionList.length == 0 ) {
      if( JSON.stringify(this.childGroups) == JSON.stringify(childGroups) ) return;
      
      // init action data
      this.childGroups = [[this.childGroups]];   // list of group id
      this.hasActionList[0] = true;
    }
    if( !this.hasActionList[actionID] ) {
      this.childGroups[actionID] = [this.childGroups[0][0].concat()];
      this.hasActionList[actionID] = true;
    }
    
    let isEmpty = true;
    for(let i = this.childGroups[actionID].length - 1; i >= 0; --i) {
      if(typeof this.childGroups[actionID][i] === "undefined") continue;
      if(JSON.stringify(childGroups) == JSON.stringify(this.childGroups[actionID][i])) break;
      this.childGroups[actionID][frame] = childGroups;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.childGroups[actionID][frame] = undefined;
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Object} data - data to set
   */
  setJSONData(pathContainer, data) {
    if(!pathContainer || !data) return;
    PathCtr.loadState("BONE:" + this.id);
    
    let bone = pathContainer.getBone(data.parent);
    if("parent" in data && !!bone) {
      this.parentID = bone.uid;
      PathCtr.loadState("  parentID:" + this.parentID + "(" + data.parent + ")");
    }
    
    if("isParentPin" in data && (typeof data.isParentPin === "boolean")) {
      this.isParentPin = data.isParentPin;
      PathCtr.loadState("  isParentPin:" + this.isParentPin);
    }
    
    if("feedback" in data && (typeof data.feedback === "boolean")) {
      this.feedback = data.feedback;
      PathCtr.loadState("  feedback:" + this.feedback);
    }
    
    if("strength" in data && Number.isFinite(data.strength)) {
      this.strength = data.strength;
      PathCtr.loadState("  strength:" + this.strength);
    }
    
    if("isSmartBone" in data && (typeof data.isSmartBone === "boolean")) {
      this.isSmartBone = data.isSmartBone;
      PathCtr.loadState("  isSmartBone:" + this.isSmartBone);
    }
    
    if("smartBase" in data && Number.isFinite(data.smartBase)) {
      this.smartBase = data.smartBase/180 * Math.PI;
      PathCtr.loadState("  smartBase:" + this.smartBase);
    }
    
    if("smartMax" in data && Number.isFinite(data.smartMax)) {
      this.smartMax = data.smartMax/180 * Math.PI;
      PathCtr.loadState("  smartMax:" + this.smartMax);
    }
    
  };
  
  /**
   * @param {Integer} totalFrames - action total frames
   */
  getSmartFrame(totalFrames) {
    if(!this.isSmartBone) {
      console.error("It is not bone: " + this.id);
      return 0;
    }
    
    let angle = -this.currentState.angle;
    angle -= this.smartBase;
    
    if(angle < 0) angle += Math.PI*2;
    if(angle > this.smartMax) angle = this.smartMax;
    return ((angle/this.smartMax * (totalFrames-2))^0) + 1;
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  preprocessing(pathContainer) {
    this.reset();
    if(!this.defState) return;
    
    let pathDataList = this.paths[0].getPathDataList(pathContainer.actionList[pathContainer.currentActionID].currentFrame, pathContainer.currentActionID);
    
    if(pathDataList.length != 2) {
      this.isReady = true;
      return;
    }
    
    this.isReady = false;
    
    let currentPos = this.currentState.pos;
    let x0 = currentPos[0] = pathDataList[0].pos[0];
    let y0 = currentPos[1] = pathDataList[0].pos[1];
    let x1 = currentPos[2] = pathDataList[1].pos[0];
    let y1 = currentPos[3] = pathDataList[1].pos[1];
    let distX = x1 - x0;
    let distY = y1 - y0;
    this.currentState.distance = Math.sqrt(distX*distX + distY*distY);
    this.currentState.angle = Math.atan2(distY, distX);
    this.x = this.anchorX = this.defState.x0;
    this.y = this.anchorY = this.defState.y0;
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  control(pathContainer) {
    // do nothing.
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  diff(pathContainer) {
    if(!this.defState || this.isReady) return;
    this.isReady = true;
    this.effectSprite.reset();
    
    let currentPos = this.currentState.pos;
    let parentID = this.parentID;
    while(parentID >= 0) {
      let bone = pathContainer.groups[parentID];
      bone.diff(pathContainer);
      if(this.isParentPin) {
        let x = bone.x - bone.anchorX;
        let y = bone.y - bone.anchorY;
        currentPos[0] += x;
        currentPos[1] += y;
        currentPos[2] += x;
        currentPos[3] += y;
      } else {
        bone.getMatrix().applyToArray(currentPos);
      }
      parentID = bone.parentID;
    }
    this.getMatrix().applyToArray(currentPos);
    
    let x0 = this.effectSprite.x = currentPos[0];
    let y0 = this.effectSprite.y = currentPos[1];
    let x1 = currentPos[2];
    let y1 = currentPos[3];
    let distX = x1 - x0;
    let distY = y1 - y0;
    let distance = this.currentState.distance = Math.sqrt(distX*distX + distY*distY);
    let angle = this.currentState.angle = Math.atan2(distY, distX);
    
    this.effectSprite.anchorX = this.defState.x0;
    this.effectSprite.anchorY = this.defState.y0;
    this.effectSprite.scaleY = distance / this.defState.distance;
    this.effectSprite.rotation = angle - this.defState.angle;
  };
    
  /**
   * @param {Array} points
   */
  calc(x0, y0) {
    let strength = this.strength;
    if(strength == 0) return 0;
    
    let currentPos = this.currentState.pos;
    let x1 = this.defState.x0;
    let y1 = this.defState.y0;
    let x2 = this.defState.x1;
    let y2 = this.defState.y1;
    let a = x2 - x1;
    let b = y2 - y1;
    let r2 = a*a + b*b;
    let tt = -(a*(x1-x0)+b*(y1-y0));
    let dist = 0;
    if( tt < 0 ) {
      dist = (x1-x0)*(x1-x0) + (y1-y0)*(y1-y0);
    } else if( tt > r2 ) {
      dist = (x2-x0)*(x2-x0) + (y2-y0)*(y2-y0);
    } else {
      let f1 = a*(y1-y0)-b*(x1-x0);
      dist = (f1*f1)/r2;
    }
    
    return dist * strength;
  };
  
  update() {
    // do nothing.
  };
  
  draw() {
    // do nothing.
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   */
  debugDraw(pathContainer, context) {
    if(!this.visible || !DebugPath.isShowBones) {
      return;
    }
    let ratio = pathContainer.pathRatio;
    let tau = Math.PI*2;
    
    this.paths.forEach(path=>{
      let currentPos = this.currentState.pos;
      let x0 = currentPos[0] * ratio;
      let y0 = currentPos[1] * ratio;
      let x1 = currentPos[2] * ratio;
      let y1 = currentPos[3] * ratio;
      
      context.lineJoin = "round";
      context.lineCap = "round";
      
      let path2D = new Path2D();
      path2D.arc(x0, y0, DebugPath.bonePointSize, 0, tau);
      path2D.moveTo(x0, y0);
      path2D.lineTo(x1, y1);
      context.lineWidth = DebugPath.boneLineSize;
      context.strokeStyle = DebugPath.boneColor;
      context.stroke(path2D);
      
      let dist = this.strength * ratio;
      path2D = new Path2D();
      path2D.arc(x0, y0, dist, 0, tau);
      path2D.arc(x1, y1, dist, 0, tau);
      context.fillStyle = DebugPath.strengthPointColor;
      context.fill(path2D, "nonzero");
      
      path2D = new Path2D();
      path2D.moveTo(x0, y0);
      path2D.lineTo(x1, y1);
      context.lineWidth = dist*2;
      context.strokeStyle = DebugPath.strengthLineColor;
      context.stroke(path2D);
      path2D = null;
      
      /*
      let x = this.currentState.pos[0];
      let y = this.currentState.pos[1];
      let effX = (this.effectSprite.x) * ratio;
      let effY = (this.effectSprite.y) * ratio;
      let ancX = (this.effectSprite.anchorX) * ratio;
      let ancY = (this.effectSprite.anchorY) * ratio;
      path2D = new Path2D();
      path2D.arc(effX, effY, DebugPath.bonePointSize*2, 0, tau);
      path2D.arc(ancX, ancY, DebugPath.bonePointSize*3, 0, tau);
      context.lineWidth = 1;
      context.strokeStyle = "rgb(255, 0, 0)";
      context.stroke(path2D);
      
      let ang = this.effectSprite.rotation;
      let scale = this.effectSprite.scaleY;
      path2D = new Path2D();
      path2D.moveTo(ancX, ancY);
      path2D.lineTo(Math.cos(ang)*20 + ancX, Math.sin(ang)*20 + ancY);
      context.lineWidth = scale * scale * 5;
      context.strokeStyle = "rgb(255, 0, 0)";
      context.stroke(path2D);
      */
    });
    
    this.resultGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};


class PathContainer extends Sprite {
  constructor() {
    super();
    this.visible = true;          // display when true
    this.originalWidth = 0;       // original svg width
    this.originalHeight = 0;      // original svg height
    this.displayWidth = 0;        // display width
    this.displayHeight = 0;       // display height
    this.pathRatio = 0;           // ratio of the path to draw
    this.context = null;          // CanvasRenderingContext2D ( canvas.getContext("2d") )
    this.rootGroups = [];         // root group IDs
    this.groups = [];             // list of groups
    this.masks = {};              // list of mask name and group ID
    this.bones = [];              // list of bone ID
    this.actionList = [];         // action info list
    this.currentActionID = -1;    // current action ID
  };
  
  /**
   * @param {String} name
   * @return {GroupObj}
   */
  getGroup(name) {
    return this.groups.find(data=>data.id == name);
  };
  
  /**
   * @param {String} name
   * @return {BoneObj}
   */
  getBone(name) {
    let group = this.getGroup(name);
    if(!!group && this.bones.includes(group.uid)) {
      return this.groups[group.uid];
    }
    return undefined;
  };
  
  /**
   * @param {String} actionName
   * @param {String} actionID
   * @param {Integer} totalFrames
   * @return {Action}
   */
  addAction(actionName, actionID, totalFrames) {
    if(actionID < 0) actionID = this.actionList.length;
    return this.actionList[actionID] = {
      name: actionName,
      id: actionID,
      totalFrames: totalFrames,
      pastFrame: 0,
      currentFrame: 0,
    };
  };
  
  /**
   * @param {Number} width - reference width
   * @param {Number} height - reference height
   */
  setSize(width, height) {
    if(this.originalWidth > this.originalHeight) {
      this.displayWidth = width;
      this.displayHeight = width * this.originalHeight/this.originalWidth;
      this.pathRatio = width;
    } else {
      this.displayWidth = height * this.originalWidth/this.originalHeight;
      this.displayHeight = height;
      this.pathRatio = height;
    }
  };
  
  /**
   * @param {Integer} frame
   * @param {String} actionName
   */
  update(frame, actionName = PathCtr.defaultActionName) {
    if(!this.visible || !this.rootGroups) {
      return;
    }
    
    let action = this.actionList.find(data=>data.name == actionName);
    if(!action) {
      console.error("target action is not found: " + actionName);
      return;
    }
    action.pastFrame = action.currentFrame;
    action.currentFrame = frame;
    
    this.currentActionID = action.id;
    
    this.groups.forEach(group=>{
      group.preprocessing(this);
    });
    this.bones.forEach(id=>{
      let bone = this.groups[id];
      bone.control(this);
      bone.diff(this);
    });
    
    this.actionList.forEach(targetAction=>{
      if(!targetAction.smartBoneID) return;
      targetAction.pastFrame = targetAction.currentFrame;
      targetAction.currentFrame = this.groups[targetAction.smartBoneID].getSmartFrame(targetAction.totalFrames);
    });
    
    this.rootGroups.forEach(id=>{
      this.groups[id].update(this, (new Sprite().setSprite(this)));
    });
  };
  
  draw() {
    if(!this.visible || !this.rootGroups) {
      return;
    }
    if(!this.context) {
      console.error("context is not found");
      return;
    }
    
    this.rootGroups.forEach(id=>{
      this.groups[id].draw(this, this.context);
    });
    
    if(typeof DebugPath !== "undefined" && DebugPath.isDebugDraw()) {
      this.rootGroups.forEach(id=>{
        this.groups[id].debugDraw(this, this.context);
      });
    }
  };
};


/**
 * BinaryLoader
 * Singleton
 */
var BinaryLoader = {
  /**
   * @param {ArrayBuffer} buffer
   * @return {PathContainer}
   */
  init: function(buffer) {
    if(!buffer) {
      console.error("array buffer is not found");
      return null;
    }
    let pathContainer = PathCtr.initTarget = new PathContainer();
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare getting function --
    
    let getUint8  =()=>{let ret = dv.getUint8(sumLength); sumLength += 1; return ret};
    let getUint16 =()=>{let ret = dv.getUint16(sumLength); sumLength += 2; return ret};
    let getUint32 =()=>{let ret = dv.getUint32(sumLength); sumLength += 4; return ret};
    let getFloat32=()=>{let ret = dv.getFloat32(sumLength); sumLength += 4; return ret};
    let getPos    =()=>{let ret = dv.getInt16(sumLength)/PathCtr.binDataPosRange; sumLength += 2; return ret};
    let getString=()=>{
      let num = getUint8();
      let ret = "";
      for(let i = 0; i < num; ++i) {
        ret += String.fromCharCode(getUint16());
      }
      return ret;
    };
    let getColor=()=>{
      if(getUint8() == 0) {
        return "transparent";
      }
      return "rgb(" + getUint8() + ", " + getUint8() + ", " + getUint8() + ")";
    };
    
    let getArray=(lengFunc, getFunc)=>{
      let ret = Array(lengFunc());
      let num = ret.length;
      for(let i = 0; i < num;) {
        let count = getUint16();
        if(count == 0) {
          count = getUint16();
          if(count == 0) {
            console.error("data format error");
            break;
          }
          i += count;
          continue;
        }
        let val = getFunc();
        if(Array.isArray(val)) {
          for(let j = 0; j < count; ++j) {
            ret[i + j] = val.concat();
          }
        } else {
          for(let j = 0; j < count; ++j) {
            ret[i + j] = val;
          }
        }
        i += count;
      }
      return ret;
    };
    
    let getAction=func=>getArray(getUint8, ()=>getArray(getUint16, ()=>func()));
    
    let getPathData=()=>{
      let retNum = getUint16();
      let ret = [];
      for(let i = 0; i < retNum; ++i) {
        let type = getUint8();
        switch(type) {
          case 0:  // M
            ret.push({type:"M", pos:[getPos(), getPos()]});
            break;
          case 1:  // L
            ret.push({type:"L", pos:[getPos(), getPos()]});
            break;
          case 2:  // C
            ret.push({type:"C", pos:[getPos(), getPos(), getPos(), getPos(), getPos(), getPos()]});
            break;
          case 3:  // Z
            ret.push({type:"Z"});
            break;
          default:
            console.error("unknown type : " + type);
            break;
        }
      }
      return ret;
    }
    
    let getPathDiff=()=>getArray(getUint16, ()=>getArray(getUint16, getPos));
    
    let getPath=()=>{
      let maskIdToUse = getUint16() - 1;
      if(maskIdToUse < 0) maskIdToUse = null;
      let fillRule = (getUint8() == 0 ? "nonzero" : "evenodd");
      
      let pathDataList = getPathData();
      
      let hasAction = getUint8();
      if(!hasAction) {
        let lineWidth = getFloat32();
        let fillStyle = getColor();
        let strokeStyle = getColor();
        let pathDiffList = getPathDiff();
        return new PathObj(
          maskIdToUse,
          pathDataList,
          pathDiffList,
          fillRule,
          fillStyle,
          lineWidth,
          strokeStyle,
        );
      }
      
      let lineWidth = getAction(getFloat32);
      let fillStyle = getAction(getColor);
      let strokeStyle = getAction(getColor);
      let pathDiffList = getAction(getPathDiff);
      
      let pathObj = new PathObj(
        maskIdToUse,
        pathDataList,
        pathDiffList,
        fillRule,
        fillStyle,
        lineWidth,
        strokeStyle,
      );
      pathObj.lineWidth.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.fillStyle.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.strokeStyle.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.pathDiffList.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      return pathObj;
    };
    
    let getGroup=i=>{
      let name = getString();
      
      let maskIdToUse = getUint16() - 1;
      if(maskIdToUse < 0) maskIdToUse = null;
      let paths = getArray(getUint16, getPath);
      
      let hasAction = (getUint8() > 0);
      let childGroups;
      if(hasAction) {
        childGroups = getAction(()=>getArray(getUint8, getUint16));
      } else {
        childGroups = getArray(getUint8, getUint16);
      }
      
      if(name.startsWith(PathCtr.defaultBoneName)) {
        return new BoneObj(
          i,
          name,
          paths,
          childGroups,
          hasAction
        );
      } else {
        return new GroupObj(
          i,
          name,
          paths,
          childGroups,
          hasAction,
          maskIdToUse
        );
      }
    };
    
    
    // --acquisition processing--
    
    pathContainer.originalWidth = pathContainer.displayWidth = getUint16();
    pathContainer.originalHeight = pathContainer.displayHeight = getUint16();
    
    let actionListNum = getUint8();
    if(actionListNum > 0) {
      for(let i = 0; i < actionListNum; ++i) {
        pathContainer.addAction(getString(), getUint8(), getUint16());
      }
    }
    
    pathContainer.rootGroups = getArray(getUint8, getUint16);
    
    let groupsNum = getUint16();
    for(let i = 0; i < groupsNum; ++i) {
      PathCtr.debugPrint("count : " + i);
      PathCtr.debugPrint(i);
      PathCtr.debugPrint(sumLength);
      
      let group = getGroup(i);
      pathContainer.groups[i] = group;
      if(BoneObj.prototype.isPrototypeOf(group)) {
        pathContainer.bones.push(group.uid);
      }
      PathCtr.debugPrint(group);
    }
    
    PathCtr.initTarget = null;
    
    return pathContainer;
  },
  
  /**
   * @param {String} filePath - binary file path
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(filePath, completeFunc = null) {
    if(!filePath) {
      console.error("filePath not found");
      return;
    }
    
    let request = new XMLHttpRequest();
    request.onload = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if(target.status != 200 && target.status != 0) return;
      
      let buffer = request.response;
      let pathContainer = BinaryLoader.init(buffer);
      PathCtr.loadState("loading completed");
      PathCtr.loadState(pathContainer);
      
      PathCtr.loadComplete(pathContainer);
      if(!!completeFunc) {
        completeFunc();
      }
    };
    request.open("GET", filePath, true);
    request.responseType = "arraybuffer";
    request.send();
  },
};


/**
 * BoneLoader
 * Singleton
 */
var BoneLoader = {
  /**
   * @param {String} filePath - binary file path
   */
  load: function(filePath, pathContainer) {
    let request = new XMLHttpRequest();
    
    request.onload = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if(target.status != 200 && target.status != 0) return;
      
      let ret = JSON.parse(target.responseText);
      if(!!ret.bones) {
        Object.keys(ret.bones).forEach(id=>{
          let bone = pathContainer.getBone(id);
          if(!bone) {
            console.error("bone is not found : " + id);
            return;
          }
          bone.setJSONData(pathContainer, ret.bones[id]);
        });
      }
      if(!!ret.flexi) {
        Object.keys(ret.flexi).forEach(name=>{
          let group = pathContainer.getGroup(name);
          if(!group) {
            console.error("group is not found : " + name);
            return;
          }
          group.setFlexiBones(pathContainer, ret.flexi[name]);
        });
      }
      
      if(!!ret.smartAction) {
        Object.keys(ret.smartAction).forEach(name=>{
          let action = pathContainer.actionList.find(data=>data.name == name);
          if(!action) {
            console.error("smart action is not found : " + name);
            return;
          }
          let boneName = ret.smartAction[name];
          let bone = pathContainer.getBone(boneName);
          if(!bone) {
            console.error("smart bone is not found : " + boneName);
            return;
          }
          action.smartBoneID = bone.uid;
          PathCtr.loadState("smartAction: " + name + " - " + boneName);
        });
      }
      
      PathCtr.loadState("bones JSON load complete.");
      PathCtr.loadState(pathContainer);
    }
    request.open("GET", filePath, true);
    request.send();
  },
}
/**
 * SVGLoader
 * Singleton
 */
var SVGLoader = {
  
  FILE_KIND_BASE: "BASE",
  FILE_KIND_BONE: "BONE",
  FILE_KIND_SMRT: "SMRT",
  initKind: "",
  groupNameToIDList: null,
  
  /**
   * @param {String} maskStr - mask attribute of element
   * @return {GroupObj} - mask group
   */
  getMaskId: function(maskStr) {
    if(!maskStr) return null;
    let maskID = maskStr.replace(/^url\(#/, "").replace(/\)$/, "");
    if(!!PathCtr.initTarget.masks[maskID]) {
      return PathCtr.initTarget.masks[maskID];
    }
    console.error("unknown mask name : " + maskStr);
    return null;
  },
  
  /**
   * @param {String} dataAttribute - d attribute of path element
   * @return {Array} - list of path data
   */
  makePathDataList: function(dataAttribute) {
    let ret = [];
    
    let data;
    if(dataAttribute.indexOf(",") < 0) {
      data = dataAttribute.split(/ /);
    } else {
      data = dataAttribute.replace(/([MCZ])/g,",$1,").replace(/[^,]-/g,",-").split(/[, ]/);
    }
    
    let baseX = PathCtr.initTarget.originalWidth;
    let baseY = PathCtr.initTarget.originalHeight;
    let base = (baseX > baseY)? baseX : baseY;
    let getX=()=>parseFloat(data.shift())/base;
    let getY=()=>parseFloat(data.shift())/base;
    
    while(data.length > 0) {
      let type = data.shift();
      switch(type) {
        case "M":
          // USEGE : path2D.moveTo(pos[0], pos[1])
          ret.push({type:"M", pos:[getX(), getY()]});
          break;
        case "C":
          // USEGE : path2D.bezierCurveTo(pos[0], pos[1], pos[2], pos[3], pos[4], pos[5])
          ret.push({type:"C", pos:[getX(), getY(), getX(), getY(), getX(), getY()]});
          break;
        case "Z":
          // USEGE : path2D.closePath()
          ret.push({type:"Z"});
          break;
        case "":
          // do nothing.
          break;
        default:
          console.error("unknown type : " + type);
          console.log(type);
          break;
      }
    }
    return ret;
  },
  
  /**
   * @param {HTMLElement} pathDOM - path element
   * @param {CSSStyleDeclaration} style - window.getComputedStyle(pathDOM)
   * @return {PathObj}
   */
  makePath: function(pathDOM, style) {
    //PathCtr.debugPrint("makePath");
    //PathCtr.debugPrint(style.fill);
    let fillStyle = style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    let lineWidth = 0;
    let strokeStyle = style.stroke;
    if(strokeStyle == "none") {
      strokeStyle = "transparent";
    } else {
      lineWidth = parseFloat(style.strokeWidth.match(/([\d\.]+)/)[1]);
    }
    
    let pathDataList = this.makePathDataList(pathDOM.getAttribute("d"));
    let pathDiffList = [];
    pathDataList.forEach(d=>pathDiffList.push((!d.pos)? undefined : d.pos.slice().fill(0)));
    
    return new PathObj(
      this.getMaskId(pathDOM.getAttribute("mask")),
      pathDataList,
      pathDiffList,
      style.fillRule,
      fillStyle,
      lineWidth,
      strokeStyle,
    );
  },
  
  /**
   * @param {PathObj} path
   * @param {HTMLElement} pathDOM - path element
   * @param {CSSStyleDeclaration} style - window.getComputedStyle(pathDOM)
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   */
  addActionPath: function(path, pathDOM, style, frame, actionID) {
    let fillStyle = (!pathDOM)? "none" : style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    let lineWidth = 0;
    let strokeStyle = (!pathDOM)? "none" : style.stroke;
    if(strokeStyle == "none") {
      strokeStyle = "transparent";
    } else {
      lineWidth = parseFloat(style.strokeWidth.match(/([\d\.]+)/)[1]);
    }
    
    let pathDataList = null;
    if(!!pathDOM) {
      pathDataList = this.makePathDataList(pathDOM.getAttribute("d"));
    }
    
    path.addAction(
      pathDataList,
      fillStyle,
      lineWidth,
      strokeStyle,
      frame,
      actionID,
    );
  },
  
  /**
   * @param {String} dataAttribute - d attribute of path element
   * @return {Array} - list of path data
   */
  makeBonePathDataList: function(dataAttribute) {
    let ret = [];
    
    let data;
    if(dataAttribute.indexOf(",") < 0) {
      data = dataAttribute.split(/ /);
    } else {
      data = dataAttribute.replace(/([MCZ])/g,",$1,").replace(/[^,]-/g,",-").split(/[, ]/);
    }
    
    let baseX = PathCtr.initTarget.originalWidth;
    let baseY = PathCtr.initTarget.originalHeight;
    let base = (baseX > baseY)? baseX : baseY;
    let getX=()=>parseFloat(data.shift())/base;
    let getY=()=>parseFloat(data.shift())/base;
    
    let posData = [];
    while(data.length > 0 && posData.length < 3) {
      let type = data.shift();
      switch(type) {
        case "M":
          posData.push([getX(), getY()]);
          break;
        case "C":
          data.shift();
          data.shift();
          data.shift();
          data.shift();
          posData.push([getX(), getY()]);
          break;
        case "":
          // do nothing.
          break;
        default:
          console.error("unknown type : " + type);
          console.log(type);
          break;
      }
    }
    
    let dist1X = posData[1][0] - posData[0][0];
    let dist1Y = posData[1][1] - posData[0][1];
    let dist1 = dist1X * dist1X + dist1Y * dist1Y;
    
    let dist2X = posData[2][0] - posData[0][0];
    let dist2Y = posData[2][1] - posData[0][1];
    let dist2 = dist2X * dist2X + dist2Y * dist2Y;
    
    if(dist1 > dist2) {
      ret.push({type:"M", pos:[posData[0][0] + dist2X/2, posData[0][1] + dist2Y/2]});
      ret.push({type:"L", pos:[posData[1][0], posData[1][1]]});
    } else {
      ret.push({type:"M", pos:[posData[0][0] + dist1X/2, posData[0][1] + dist1Y/2]});
      ret.push({type:"L", pos:[posData[2][0], posData[2][1]]});
    }
    
    return ret;
  },
  
  /**
   * @param {HTMLElement} pathDOM - path element
   * @return {PathObj}
   */
  makeBonePath: function(pathDOM) {
    let pathDataList = this.makeBonePathDataList(pathDOM.getAttribute("d"));
    let pathDiffList = [];
    pathDataList.forEach(d=>pathDiffList.push((!d.pos)? undefined : d.pos.slice().fill(0)));
    return new PathObj(
      this.getMaskId(pathDOM.getAttribute("mask")),
      pathDataList,
      pathDiffList,
      "nonzero",
      "transparent",
      2,
      "rgb(0, 255, 0)",
    );
  },
  
  /**
   * @param {PathObj} path
   * @param {HTMLElement} pathDOM - path element
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   */
  addBoneActionPath: function(path, pathDOM, frame, actionID) {
    let pathDataList = null;
    if(!!pathDOM) {
      pathDataList = this.makeBonePathDataList(pathDOM.getAttribute("d"));
    }
    
    path.addAction(
      pathDataList,
      "transparent",
      2,
      "rgb(0, 255, 0)",
      frame,
      actionID,
    );
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   * @return {GroupObj}
   */
  makeGroup: function(groupDOM) {
    let name = groupDOM.getAttribute("id");
    let paths = [];
    let childGroups = [];
    let children = Array.prototype.slice.call(groupDOM.children);
    let isBone = name.startsWith(PathCtr.defaultBoneName);
    let isPathSkip = (!isBone && this.initKind === this.FILE_KIND_BONE);
    
    if(isPathSkip) {
      PathCtr.loadState("  path skip load : " + name);
    }
    
    children.forEach(child=>{
      let tagName = child.tagName;
      PathCtr.debugPrint("make group : " + name + " : " + tagName);
      switch(tagName) {
        case "path":
          if(isPathSkip) break;
          if(isBone) {
            paths.push(this.makeBonePath(child));
          } else {
            paths.push(this.makePath(child, window.getComputedStyle(child)));
          }
          break;
        case "mask":
          // do nothing.
          break;
        case "clipPath":
          // TODO
          break;
        case "g":
          childGroups.push(SVGLoader.groupNameToIDList[child.getAttribute("id")]);
          this.makeGroup(child);
          break;
        default:
          console.error("unknown element");
          console.log(child);
          break;
      }
    });
    
    let uid = SVGLoader.groupNameToIDList[name];
    let ret;
    if(isBone) {
      ret = new BoneObj(
        uid,
        name,
        paths,
        childGroups,
        false,
      );
      PathCtr.initTarget.bones.push(SVGLoader.groupNameToIDList[name]);
    } else {
      ret = new GroupObj(
        uid,
        name,
        paths,
        childGroups,
        false,
        this.getMaskId(groupDOM.getAttribute("mask"))
      );
    }
    
    PathCtr.initTarget.groups[uid] = ret;
    
    return ret;
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   * @param {String} name - group name
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   */
  addActionGroup: function(groupDOM, name, frame, actionID) {
    let id = SVGLoader.groupNameToIDList[name];
    let targetGroup = PathCtr.initTarget.groups[id];
    let childGroups = [];
    let dataIndex = 0;
    let isBone = PathCtr.initTarget.bones.includes(id);
    let isPathSkip = (!isBone && this.initKind === this.FILE_KIND_BONE);
    
    if(isPathSkip) {
      PathCtr.loadState("  path skip load : " + name);
    }
    
    if(!!groupDOM) {
      let children = Array.prototype.slice.call(groupDOM.children);
      children.forEach(child=>{
        let name = child.tagName;
        switch(name) {
          case "path":
            if(isPathSkip) break;
            if(isBone) {
              this.addBoneActionPath(targetGroup.paths[dataIndex++], child, frame, actionID);
            } else {
              this.addActionPath(targetGroup.paths[dataIndex++], child, window.getComputedStyle(child), frame, actionID);
            }
            break;
          case "mask":
          case "clipPath":
            break;
          case "g":
            childGroups.push(SVGLoader.groupNameToIDList[child.getAttribute("id")]);
            break;
          default:
            console.error("unknown element");
            console.log(child);
            break;
        }
      });
    } else {
      let children = Array.prototype.slice.call(targetGroup.paths);
      children.forEach(child=>{
        this.addActionPath(child, null, null, frame, actionID);
      });
    }
    targetGroup.addAction(childGroups, frame, actionID);
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   * @return {PathContainer}
   */
  init: function(groupsDOM) {
    if(!groupsDOM) {
      console.error("groups dom is not found");
      return null;
    }
    
    PathCtr.loadState("init");
    
    let pathContainer = PathCtr.initTarget = new PathContainer();
    
    pathContainer.originalWidth = pathContainer.displayWidth = parseInt(groupsDOM.getAttribute("width").replace("px", ""));
    pathContainer.originalHeight = pathContainer.displayHeight = parseInt(groupsDOM.getAttribute("height").replace("px", ""));
    
    let groups = Array.prototype.slice.call(groupsDOM.getElementsByTagName("g"));
    groups.forEach(group=>{
      let name = group.getAttribute("id");
      if(SVGLoader.groupNameToIDList[name] != null) {
        console.error("group ID is duplicated : " + name);
        return;
      }
      SVGLoader.groupNameToIDList[name] = Object.keys(SVGLoader.groupNameToIDList).length;
    });
    
    let masks = Array.prototype.slice.call(groupsDOM.getElementsByTagName("mask"));
    masks.forEach(mask=>{
      let maskChildren = Array.prototype.slice.call(mask.children);
      maskChildren.forEach(child=>{
        if( child.tagName == "use" ) {
          pathContainer.masks[mask.getAttribute("id")] = SVGLoader.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
        } else {
          console.error("unknown mask data");
          console.log(child);
        }
      });
    });
    
    let children = Array.prototype.slice.call(groupsDOM.children);
    children.forEach(child=>{
      if(child.tagName != "g") return;
      let group = this.makeGroup(child);
      if(!group) return;
      pathContainer.rootGroups.push(SVGLoader.groupNameToIDList[group.id]);
    });
    PathCtr.initTarget = null;
    
    return pathContainer;
  },
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Array} groupsDOMList - group elements array
   * @param {String} actionName
   */
  addActionFromList: function(pathContainer, groupsDOMList, actionID = 0) {
    if(!pathContainer) {
      console.error("path container is not found");
      return;
    }
    if(!groupsDOMList) {
      console.error("groups dom list is not found");
      return;
    }
    
    PathCtr.initTarget = pathContainer;
    
    PathCtr.loadState("check id");
    let actionGroup = {};
    let groupsDOMArr = Array.prototype.slice.call(groupsDOMList);
    let baseDom = groupsDOMArr[0];
    let baseGroups = baseDom.getElementsByTagName("g");
    let frame = 0;
    groupsDOMArr.forEach(targetDom=>{
      let targetGroups = targetDom.getElementsByTagName("g");
      let targetIds = [].map.call(targetGroups, group=>group.getAttribute("id"));
      Array.prototype.forEach.call(targetIds, id=>{
        if(SVGLoader.groupNameToIDList[id] != null) return;
        SVGLoader.groupNameToIDList[id] = Object.keys(SVGLoader.groupNameToIDList).length;
        this.makeGroup(targetDom.getElementById(id));
      });
      let masks = Array.prototype.slice.call(targetDom.getElementsByTagName("mask"));
      masks.forEach(mask=>{
        let maskID = mask.getAttribute("id");
        if(pathContainer.masks[maskID]) return;
        let maskChildren = Array.prototype.slice.call(mask.children);
        maskChildren.forEach(child=>{
          if( child.tagName == "use" ) {
            pathContainer.masks[maskID] = SVGLoader.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
          } else {
            console.error("unknown mask data");
            console.log(child);
          }
        });
      });
    });
    
    PathCtr.loadState(pathContainer);
    PathCtr.loadState("check diff");
    groupsDOMArr.forEach(targetDom=>{
      Object.keys(SVGLoader.groupNameToIDList).forEach(name=>{
        let base = baseDom.getElementById(name);
        if( !base || !targetDom || !base.isEqualNode(targetDom.getElementById(name)) ) {
          actionGroup[name] = true;
        }
      });
    });
    
    groupsDOMArr.forEach((targetDom, frame)=>{
      if(frame == 0) return;
      if(frame % 10 == 0) PathCtr.loadState("add action : " + actionID + " - " + frame);
      Object.keys(actionGroup).forEach(key=>{
        this.addActionGroup(targetDom.getElementById(key), key, frame, actionID);
      });
    });
    
    PathCtr.initTarget = null;
  },
  
  /**
   * @param {Array} fileInfoList - [ [ kind, totalFrames, actionName, filePath ], ... ]
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(fileInfoList, completeFunc = null) {
    if(!fileInfoList || !Array.isArray(fileInfoList) || !Array.isArray(fileInfoList[0])) {
      console.error("fileInfoList format is woring");
      console.log(fileInfoList);
      return;
    }
    if(fileInfoList[0][0] != SVGLoader.FILE_KIND_BASE) {
      console.error("action kind \"" + SVGLoader.FILE_KIND_BASE + "\" is missing in fileInfoList");
      return;
    }
    
    let pathContainer = null;
    let fileIndex = 0;
    let domList = [];
    let getFrameNum=i=>("00000".substr(0, 5 - i.toString().length) + i + ".svg");
    
    SVGLoader.groupNameToIDList = {};
    
    let loadFile=fileInfo=>{
      this.initKind = fileInfo[0];
      let totalFrames = fileInfo[1];
      let actionName = fileInfo[2];
      let filePath = fileInfo[3];
      
      let loadFrame = 1;
      let request = new XMLHttpRequest();
      let loadSVG = request.onload = function(e) {
        let target = e.target;
        if(target.readyState != 4) return;
        if(target.status != 200 && target.status != 0) return;
        
        let ret = target.responseText;
        let div = document.createElement("div");
        div.setAttribute("style", "display:none;");
        div.innerHTML = ret;
        let svg = div.firstElementChild;
        document.body.append(div);
        domList[parseInt(ret.match(/id="Frame_(\d+)"/)[1]) - 1] = svg;
        div = svg = null;
        
        delete request;
        if(loadFrame <= totalFrames) {
          if(loadFrame % 10 == 0) PathCtr.loadState("load file : " + loadFrame);
          request = new XMLHttpRequest();
          request.open("GET", filePath + getFrameNum(loadFrame++), true);
          request.onreadystatechange = loadSVG;
          request.send();
          return;
        }
        
        if(!pathContainer) {
          pathContainer = SVGLoader.init(domList[0]);
        }
        
        let action = pathContainer.addAction(actionName, -1, totalFrames);
        
        SVGLoader.addActionFromList(pathContainer, domList, action.id);
        PathCtr.loadState("loading completed");
        PathCtr.loadState(pathContainer);
        
        domList.forEach(dom=>dom.parentNode.remove());
        domList.length = 0;
        
        this.initKind = "";
        
        if(++fileIndex < fileInfoList.length) {
          loadFile(fileInfoList[fileIndex]);
        } else {
          SVGLoader.groupNameToIDList = null;
          PathCtr.loadComplete(pathContainer);
          if(!!completeFunc) {
            completeFunc();
          }
        }
      };
      request.open("GET", filePath + getFrameNum(loadFrame++), true);
      request.send();
    };
    
    loadFile(fileInfoList[fileIndex]);
  },
  
  /**
   * @param {PathContainer} pathContainer
   * @return {ArrayBuffer}
   */
  toBin: function(pathContainer) {
    if(!pathContainer) {
      console.error("path container is not found");
      return null;
    }
    
    let buffer = new ArrayBuffer(1000000000);
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare setting function --
    let setUint8  =val=>{dv.setUint8(sumLength, val); sumLength += 1};
    let setUint16 =val=>{dv.setUint16(sumLength, val); sumLength += 2};
    let setUint32 =val=>{dv.setUint32(sumLength, val); sumLength += 4};
    let setFloat32=val=>{dv.setFloat32(sumLength, val); sumLength += 4};
    let setPos    =val=>{dv.setInt16(sumLength, val*PathCtr.binDataPosRange); sumLength += 2};
    let setString=str=>{
      setUint8(str.length);
      [].map.call(str, c=>setUint16(c.charCodeAt(0)));
    };
    let setColor=str=>{
      if(str == "transparent") {
        setUint8(0);  // A
      } else {
        let colorArr = str.match(/(\d+), (\d+), (\d+)/);
        setUint8(1);  // A
        setUint8(colorArr[1]);  // R
        setUint8(colorArr[2]);  // G
        setUint8(colorArr[3]);  // B
      }
    };
    let setArray=(arr, setLengFunc, setFunc)=>{
      let num = arr.length;
      setLengFunc(num);
      for(let i = 0; i < num;) {
        let val = arr[i];
        let j = 1;
        if(typeof val === "undefined") {
          setUint16(0);
          for(; j < num; ++j) {
            if(typeof arr[i + j] !== "undefined") break;
          }
          setUint16(j);
          i += j;
          continue;
        }
        for(; j < num; ++j) {
          if(typeof arr[i + j] === "undefined" || JSON.stringify(val) != JSON.stringify(arr[i + j])) break;
        }
        setUint16(j);
        i += j;
        setFunc(val);
      }
    };
    
    let setAction=(ids, func)=>{
      setArray(ids, setUint8, frames=>{
        setArray(frames, setUint16, func);
      });
    };
    
    let setPathData=pathDataList=>{
      setUint16(pathDataList.length);
      pathDataList.forEach(d=>{
        switch(d.type) {
          case "M":
            setUint8(0);
            setPos(d.pos[0]);
            setPos(d.pos[1]);
            break;
          case "L":
            setUint8(1);
            setPos(d.pos[0]);
            setPos(d.pos[1]);
            break;
          case "C":
            setUint8(2);
            for(let i = 0; i < 6; ++i) {
              setPos(d.pos[i]);
            }
            break;
          case "Z":
            setUint8(3);
            break;
          default:
            console.error("unknown type");
            break;
        }
      });
    };
    
    let setPathDiff=pathDiff=>{
      setArray(pathDiff, setUint16, posArray=>{
        setArray(posArray, setUint16, setPos);
      });
    };
    
    let setPath=path=>{
      setUint16(path.maskIdToUse == null? 0 : path.maskIdToUse+1);
      setUint8(path.fillRule == "nonzero" ? 0 : 1);
      
      setPathData(path.defPath.pathDataList);
      
      let hasAction = (path.hasActionList.length > 0);
      if(hasAction) {
        setUint8(1);
        setAction(path.lineWidth, setFloat32);
        setAction(path.fillStyle, setColor);
        setAction(path.strokeStyle, setColor);
        setAction(path.pathDiffList, setPathDiff);
      } else {
        setUint8(0);
        setFloat32(path.lineWidth);
        setColor(path.fillStyle);
        setColor(path.strokeStyle);
        setPathDiff(path.pathDiffList);
      }
    };
    
    let setGroup=group=>{
      setString(group.id);
      setUint16(group.maskIdToUse == null? 0 : group.maskIdToUse+1);
      setArray(group.paths, setUint16, setPath);
      
      let hasAction = (group.hasActionList.length > 0);
      if(hasAction) {
        setUint8(1);
        setAction(group.childGroups, childGroups=>{
          setArray(childGroups, setUint8, setUint16);
        });
      } else {
        setUint8(0);
        setArray(group.childGroups, setUint8, setUint16);
      }
    };
    
    
    // -- storage processing --
    
    setUint16(pathContainer.originalWidth);
    setUint16(pathContainer.originalHeight);
    
    setUint8(pathContainer.actionList.length);
    pathContainer.actionList.forEach(action=>{
      setString(action.name);
      setUint8(action.id);
      setUint16(action.totalFrames);
    });
    
    setArray(pathContainer.rootGroups, setUint8, setUint16);
    
    let groupsNum = pathContainer.groups.length;
    setUint16(groupsNum);
    pathContainer.groups.forEach(group=>{
      PathCtr.loadState("count : " + groupsNum--);
      PathCtr.debugPrint(sumLength);
      setGroup(group);
      PathCtr.debugPrint(group);
    });
    
    delete dv;
    return buffer.slice(0, sumLength);
  },
  
  /**
   * @param {PathContainer} pathContainer
   */
  outputBin: function(pathContainer) {
    if(!pathContainer) return;
    
    let buffer = SVGLoader.toBin(PathCtr.pathContainer);
    
    var a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    console.log(a);
    
    var blob = new Blob([buffer], {type: "octet/stream"}),
    url = window.URL.createObjectURL(blob);
    
    a.href = url;
    a.download = "path_data.bin";
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  },
};
