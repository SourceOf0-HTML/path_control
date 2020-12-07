/**
 * path_control v0.8.0
 * 
 * Copyright (c) 2020 BUN
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 **/

let path_control = ` 

/**
 * InputInfo
 * Singleton
 */
var InputInfo = {
  
  /* -- mouse info -- */
  isMouseDownLeft: false,
  isMouseDownMiddle: false,
  isMouseDownRight: false,
  isMouseDownBack: false,
  isMouseDownForward: false,
  mouseX: 0,
  mouseY: 0,
  
  /* -- touch info -- */
  touches: [],
  
  /* -- common pointer info -- */
  isValidPointer: false,
  pointerX: 0,
  pointerY: 0,
  
  
  /**
   * @param {Number} x - reference mouse x
   * @param {Number} y - reference mouse y
   */
  setMousePos: function(x, y) {
    this.pointerX = this.mouseX = x;
    this.pointerY = this.mouseY = y;
  },
  
  /**
   * @param {Number} mouseButton - kind of mouse button
   * @param {Boolean} isDown - is mouse down
   */
  setMouseState: function(mouseButton, isDown) {
    switch(mouseButton) {
      case 0:
        this.isMouseDownLeft = isDown;
        break;
      case 1:
        this.isMouseDownMiddle = isDown;
        break;
      case 2:
        this.isMouseDownRight = isDown;
        break;
      case 3:
        this.isMouseDownBack = isDown;
        break;
      case 4:
        this.isMouseDownForward = isDown;
        break;
        
      default:
        break;
    }
  },
  
  /**
   * @param {Number} touches - touches info
   */
  setTouch: function(touches) {
    this.touches = touches;
    if(this.touches.length == 0) {
      this.isValidPointer = false;
      return;
    }
    this.isValidPointer = true;
    this.pointerX = this.touches[0].pageX;
    this.pointerY = this.touches[0].pageY;
  },
};

/**
 * PathCtr
 * Singleton
 */
var PathCtr = {
  defaultCanvasContainerID: "path-container",  // default canvas container element name
  defaultActionName: "base",
  initTarget: null,  // instance to be initialized
  
  pathContainers: [],
  canvas: null,
  subCanvas: null,
  context: null,
  subContext: null,
  viewWidth: 0,
  viewHeight: 0,
  
  fixFrameTime: 1 / 24,
  prevTimestamp: 0,
  average: 0,
  
  requestAnimationIDs: [],
  setTimeoutIDs: [],
  
  cancelRequestAnimation: function() {
    if(PathCtr.requestAnimationIDs.length > 1 || PathCtr.setTimeoutIDs.length > 1) {
      console.error("requestAnimationIDs:" + PathCtr.requestAnimationIDs.length + ", " + PathCtr.setTimeoutIDs.length);
    }
    PathCtr.requestAnimationIDs.forEach(cancelAnimationFrame);
    PathCtr.requestAnimationIDs.length = 0;
    PathCtr.setTimeoutIDs.forEach(clearTimeout);
    PathCtr.setTimeoutIDs.length = 0;
  },
  
  /**
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  setSize: function(viewWidth, viewHeight) {
    PathCtr.canvas.width = PathCtr.subCanvas.width = PathCtr.viewWidth = viewWidth;
    PathCtr.canvas.height = PathCtr.subCanvas.height = PathCtr.viewHeight = viewHeight;
    PathCtr.pathContainers.forEach(pathContainer=> {
      pathContainer.setSize(viewWidth, viewHeight);
    });
    PathCtr.update();
  },
  
  loadComplete: function() {
    let pathContainer = PathCtr.initTarget;
    if(pathContainer.index != null) {
      PathCtr.pathContainers[pathContainer.index] = pathContainer;
    } else {
      PathCtr.pathContainers.push(pathContainer);
    }
    pathContainer.context = PathWorker.isWorker? PathCtr.context : PathCtr.subContext;
    PathCtr.setSize(PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.initTarget = null;
    PathWorker.loadPrint(pathContainer);
    if(typeof DebugPath !== "undefined") {
      DebugPath.init(pathContainer);
    }
    pathContainer.visible = true;
    if(typeof setup !== "undefined") setup(pathContainer);
  },
  
  draw: function(timestamp) {
    if(typeof DebugPath !== "undefined" && DebugPath.isStop) {
      if(!DebugPath.isStep) return;
      DebugPath.isStep = false;
      PathCtr.pathContainers.forEach(pathContainer=> {
        let action = pathContainer.actionList[pathContainer.currentActionID];
        console.log("STEP: " + action.name + " - " + action.currentFrame);
      });
    }
    
    if(typeof timestamp === "undefined") return;
    
    let elapsed = (timestamp - PathCtr.prevTimestamp) / 1000;
    PathCtr.average = (PathCtr.average + elapsed) / 2;
    //PathWorker.debugPrint((PathCtr.average * 100000)^0);
    
    if(PathCtr.pathContainers.length <= 0) {
      PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.context.fillStyle = "#000000";
      PathCtr.context.font = "20px Arial";
      PathCtr.context.fillText(PathWorker.loadState, 20, PathCtr.viewHeight - 20);
      return;
    }
    
    let frameTime = 1 / 24;
    
    if(PathWorker.isWorker) {
      PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.pathContainers.forEach(pathContainer=> pathContainer.draw());
      if(timestamp - PathCtr.prevTimestamp < frameTime*500) return;
    } else {
      PathCtr.subContext.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.pathContainers.forEach(pathContainer=> pathContainer.draw());
      PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.context.putImageData(PathCtr.subContext.getImageData(0, 0, PathCtr.viewWidth, PathCtr.viewHeight), 0, 0);
    }
    
    PathCtr.pathContainers.forEach(pathContainer=> pathContainer.step());
    
    PathCtr.prevTimestamp = timestamp;
    if(PathCtr.average > frameTime * 2) {
      PathCtr.fixFrameTime *= 0.99;
      PathWorker.debugPrint("up");
    } else if(PathCtr.average < frameTime * 0.5) {
      PathCtr.fixFrameTime *= 1.01;
      PathWorker.debugPrint("down");
    } else {
      PathCtr.fixFrameTime = (frameTime + PathCtr.fixFrameTime) / 2;
    }
    
    PathCtr.pathContainers.forEach(pathContainer=> pathContainer.update());
  },
  
  update: function() {
    PathCtr.cancelRequestAnimation();
    PathCtr.requestAnimationIDs.push(requestAnimationFrame(PathCtr.draw));
    PathCtr.setTimeoutIDs.push(setTimeout(PathCtr.update, PathCtr.fixFrameTime*1000));
  },
  
  /**
   * @param {OffscreenCanvas or Canvas} canvas
   * @param {OffscreenCanvas or Canvas} subCanvas
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  init: function(canvas, subCanvas, viewWidth, viewHeight) {
    if(!canvas || !subCanvas) {
      console.error("canvas is not found.");
      return;
    }
    
    PathCtr.canvas = canvas;
    PathCtr.context = canvas.getContext("2d");
    
    PathCtr.subCanvas = subCanvas;
    PathCtr.subContext = subCanvas.getContext("2d");
    
    if(!PathCtr.context || !PathCtr.subContext) {
      console.error("context is not found.");
      return;
    }
    
    canvas.width = subCanvas.width = PathCtr.viewWidth = viewWidth;
    canvas.height = subCanvas.height = PathCtr.viewHeight = viewHeight;
    PathCtr.update();
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
   * @param {Matrix} m2 - Matrix
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
  
  transformFromMatrix(m2) { return this.transform(m2.a, m2.b, m2.c, m2.d, m2.e, m2.f) };
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


class ActionContainer {
  constructor(data, checkFunc) {
    this.data = data;
    this.checkFunc = checkFunc;
    this.hasAction = Array.isArray(data) && data.some(val=>Array.isArray(val) && val.some(checkFunc));
    this.result = this.hasAction? data[0][0] : data;
  };
  
  setData(data, actionID = 0, frame = 0) {
    if(this.hasAction) {
      this.addAction(data, actionID, frame);
      return;
    }
    this.data = data;
    this.hasAction = Array.isArray(data) && data.some(val=>Array.isArray(val) && val.some(this.checkFunc));
    this.result = this.hasAction? data[0][0] : data;
  };
  
  addAction(data, actionID, frame) {
    if(!this.hasAction) {
      if( JSON.stringify(this.data) == JSON.stringify(data) ) return;
      
      // init action data
      this.data = [[this.data]];
      this.hasAction = true;
    }
    if(typeof this.data[actionID] === "undefined") {
      this.data[actionID] = [this.data[0][0].concat()];
    }
    
    let isEmpty = true;
    for(let i = this.data[actionID].length - 1; i >= 0; --i) {
      if(typeof this.data[actionID][i] === "undefined") continue;
      if(JSON.stringify(data) == JSON.stringify(this.data[actionID][i])) break;
      this.data[actionID][frame] = data;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.data[actionID][frame] = undefined;
    }
  };
  
  hasActionID(actionID) {
    if(!this.hasAction) return false;
    return typeof this.data[actionID] !== "undefined";
  };
  
  getData(actionID = 0, frame = 0) {
    if(!this.hasAction) return this.data;
    return this.data[actionID][Math.min(frame, this.data[actionID].length-1)];
  };
  
  getAvailableData(actionID = 0, frame = 0) {
    if(!this.hasAction) {
      return this.data;
    }
    if(!this.hasActionID(actionID)) {
      return this.data[0][0];
    }
    
    for(let targetFrame = frame; targetFrame >= 0; --targetFrame) {
      let targetData = this.getData(actionID, targetFrame);
      if(typeof targetData !== "undefined") return targetData;
    }
    return undefined;
  };
  
  update(pathContainer, actionID = 0, frame = 0) {
    if(!this.hasAction) return;
    
    if(!this.hasActionID(actionID)) {
      actionID = 0;
      frame = 0;
    }
    
    let output =(action, val)=> {
      if(!PathCtr.isOutputDebugPrint) return;
      if(this.result == val) return;
      ;
    };
    let data = null;
    
    this.data.forEach((actionDataList, targetActionID)=> {
      let action = pathContainer.actionList[targetActionID];
      let pastFrame = action.pastFrame;
      let currentFrame = action.currentFrame;
      
      if(pastFrame == currentFrame) return;
      
      if(pastFrame <= currentFrame) {
        for(let targetFrame = Math.min(currentFrame, actionDataList.length-1); targetFrame >= pastFrame; --targetFrame) {
          let targetData = actionDataList[targetFrame];
          if(typeof targetData === "undefined") continue;
          data = targetData;
          if(this.result != data) PathWorker.debugPrint(action.name, action.pastFrame, action.currentFrame, data);
          break;
        }
      } else {
        for(let targetFrame = Math.min(pastFrame, actionDataList.length-1); targetFrame >= currentFrame; --targetFrame) {
          let targetData = actionDataList[targetFrame];
          if(typeof targetData === "undefined") continue;
          
          for(let targetFrame = Math.min(currentFrame, actionDataList.length-1); targetFrame >= 0; --targetFrame) {
            let targetData = actionDataList[targetFrame];
            if(typeof targetData === "undefined") continue;
            data = targetData;
            if(this.result != data) PathWorker.debugPrint(action.name, action.pastFrame, action.currentFrame, data);
            break;
          }
          break;
        }
      }
    });
    
    if(!!data && this.result != data) {
      this.result = data;
    }
  };
};


class PathObj {
  constructor(maskIdToUse, pathDataList, pathDiffList, fillRule, fillStyle, lineWidth, strokeStyle) {
    this.maskIdToUse = maskIdToUse;    // ID of the mask to use
    this.fillRule = fillRule;          // "nonzero" or "evenodd"
    this.pathDiffList = new ActionContainer(pathDiffList, val=>Array.isArray(val) && val.some(v=>Array.isArray(v)));  // diff pos data array
    this.fillStyle = new ActionContainer(fillStyle, val=>typeof val === "string");  // fillColor ( context2D.fillStyle )
    this.lineWidth = new ActionContainer(lineWidth, val=>Number.isFinite(val));  // strokeWidth ( context2D.lineWidth )
    this.strokeStyle = new ActionContainer(strokeStyle, val=>typeof val === "string");  // strokeColor ( context2D.strokeStyle )
    this.resultPathList = pathDataList;  // path data for drawing
    this.defPathList = pathDataList;     // default path data
  };
  
  addAction(pathDataList, fillStyle, lineWidth, strokeStyle, frame, actionID) {
    if(!pathDataList) {
      pathDataList = this.defPathList.concat();
    } else if(this.defPathList.length != pathDataList.length) {
      console.error("The number of paths does not match.");
      console.log(this.defPathList);
      console.log(pathDataList);
      pathDataList = this.defPathList.concat();
    }
    
    let pathDiffList = [];
    this.defPathList.forEach((d, i)=>{
      if(d.type != pathDataList[i].type) {
        console.error("type does not match.");
        console.log(this.defPathList);
        console.log(pathDataList);
        return;
      }
      if(!d.pos) return;
      pathDiffList[i] = [];
      d.pos.forEach((val, j)=>{
        pathDiffList[i].push(pathDataList[i].pos[j] - val);
      });
    });
    
    this.pathDiffList.addAction(pathDiffList, actionID, frame);
    this.fillStyle.addAction(fillStyle, actionID, frame);
    this.lineWidth.addAction(lineWidth, actionID, frame);
    this.strokeStyle.addAction(strokeStyle, actionID, frame);
  };
  
  /**
   * @param {Array} pathDiffList
   * @return {Array} - pathDataList
   */
  makeData(pathDiffList) {
    let ret = [];
    this.defPathList.forEach((d, i)=>{
      ret.push({
        type: d.type,
        pos: (!d.pos)? undefined : d.pos.map((val, j)=>val+pathDiffList[i][j]),
      });
    });
    return ret;
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getPathDataList(frame = 0, actionID = 0) {
    return this.makeData(this.pathDiffList.getAvailableData(actionID, frame));
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getMergePathDataList(pathContainer, frame = 0, actionID = 0) {
    if(!this.pathDiffList.hasAction) {
      return this.makeData(this.pathDiffList.getData());
    }
    
    if(!this.pathDiffList.hasActionID(actionID)) {
      actionID = 0;
      frame = 0;
    }
    
    let pathDataList = this.makeData(this.pathDiffList.getAvailableData(actionID, frame));
    if(pathContainer.actionList.length == 1) {
      return pathDataList;
    }
    
    pathContainer.actionList.forEach(action=>{
      if(actionID == action.id) return;
      if(!this.pathDiffList.hasActionID(action.id)) return;
      this.pathDiffList.getAvailableData(action.id, action.currentFrame).forEach((list, i)=>{
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
   * @param {PathContainer} pathContainer
   * @param {Array} flexiIDs - used to transform with flexi bone IDs
   * @param {Array} points - target points
   */
  static calcFlexiPoints(pathContainer, flexiIDs, points, index = 0, pointsNum = points.length) {
    if(!points || points.length > index + pointsNum || pointsNum < 2) return;
    for(let i = index; i < index + pointsNum; i += 2) {
      if(flexiIDs.length == 1) {
        let id = flexiIDs[0];
        if(pathContainer.groups[id].strength == 0) continue;
        pathContainer.groups[id].effectSprite.getMatrix().applyToPoint(points, i);
        continue;
      }
      
      let x = points[i];
      let y = points[i+1];
      
      let ratioList = [];
      let sum = 0;
      flexiIDs.forEach(id=>{
        let val = pathContainer.groups[id].getInfluence(x, y);
        sum += val;
        ratioList.push(val);
      });
      
      if(sum == 0) continue;
      
      points[i] = 0;
      points[i+1] = 0;
      
      flexiIDs.forEach((id, j)=>{
        pathContainer.groups[id].effectSprite.getMatrix().multAndAddPoint(1 - ratioList[j]/sum, x, y, points, i);
      });
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Array} flexiIDs - used to transform with flexi bone IDs
   */
  calcFlexi(pathContainer, flexiIDs) {
    this.resultPathList.forEach(d=> {
      if(!d.pos || d.pos.length == 0) return;
      PathObj.calcFlexiPoints(pathContainer, flexiIDs, d.pos);
    });
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   */
  update(frame, actionID, pathContainer, matrix) {
    let pathDataList = this.getMergePathDataList(pathContainer, frame, actionID);
    
    pathDataList.forEach(d=>{
      if(!!d.pos) matrix.applyToArray(d.pos);
    });
    
    this.resultPathList = pathDataList;
    
    this.fillStyle.update(pathContainer, actionID, frame);
    this.lineWidth.update(pathContainer, actionID, frame);
    this.strokeStyle.update(pathContainer, actionID, frame);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, path2D, isMask) {
    this.resultPathList.forEach(d=>{
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
    if(!!this.lineWidth.result) {
      context.lineJoin = "round";
      context.lineCap = "round";
      context.lineWidth = this.lineWidth.result;
      context.strokeStyle = this.strokeStyle.result;
      context.stroke(path2D);
    }
    context.fillStyle = this.fillStyle.result;
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
    
    this.resultPathList.forEach(d=>{
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
  constructor(uid, id, paths, childGroups, maskIdToUse) {
    super();
    this.visible = true;              // display when true
    this.uid = uid;                   // uniq id
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = new ActionContainer(childGroups, val=>Array.isArray(val) && val.some(v=>Number.isFinite(v)));  // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.flexi = [];                  // ID of a flexi-bonded target
  };
  
  addAction(childGroups, frame, actionID) {
    this.childGroups.addAction(childGroups, actionID, frame);
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  preprocessing(pathContainer) {
    this.reset();
    
    let actionID = pathContainer.currentActionID;
    this.childGroups.update(pathContainer, actionID, pathContainer.actionList[actionID].currentFrame);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Sprite} sprite - used to transform the path
   * @param {Array} flexiIDs - used to transform with flexi bone IDs
   */
  update(pathContainer, sprite, flexiIDs = []) {
    let actionID = pathContainer.currentActionID;
    let frame = pathContainer.actionList[actionID].currentFrame;
    let groupSprite = sprite.compSprite(this);
    let flexi = flexiIDs.concat(this.flexi);
    let groupMatrix = groupSprite.getMatrix();
    
    this.paths.forEach(path=> {
      path.update(frame, actionID, pathContainer, groupMatrix);
    });
    
    this.childGroups.result.forEach(childGroup=> {
      pathContainer.groups[childGroup].update(pathContainer, groupSprite, flexi);
    });
    
    if(flexi.length <= 0) return;
    this.paths.forEach(path=>path.calcFlexi(pathContainer, flexi));
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
    
    this.childGroups.result.forEach(childGroup=>{
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
    
    this.childGroups.result.forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};


class BoneObj extends Sprite {
  constructor(uid, id, paths, childGroups) {
    super();
    this.visible = true;              // display when true
    this.uid = uid;                   // uniq id
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    
    this.effectSprite = new Sprite();  // actual effect sprite
    
    if(!!paths && paths.length > 0) {
      BoneObj.setPath(this, paths[0]);
    }
  };
  
  /**
   * @param {Number} x0
   * @param {Number} y0
   * @param {Number} x1
   * @param {Number} y1
   */
  static getDistAndAngle(name, x0, y0, x1, y1) {
    let distX = x1 - x0;
    let distY = y1 - y0;
    if(distX == 0 && distY == 0) {
      return {
        x0, y0, x1, y1,
        distance: 0,
        angle: 0,
      };
    }
    return {
      x0, y0, x1, y1,
      distance: Math.sqrt(distX*distX + distY*distY),
      angle: Math.atan2(distY, distX),
    };
  };
  
  /**
   * @param {BoneObj} bone - target bone
   * @param {Array} paths - path data array
   */
  static setPath(bone, path) {
    let pathDataList = path.getPathDataList();
    let state = BoneObj.getDistAndAngle(bone.id + ":setPath", pathDataList[0].pos[0], pathDataList[0].pos[1], pathDataList[1].pos[0], pathDataList[1].pos[1]);
    bone.defState = state;  // default bone state
    bone.currentState = {  // current bone state
      pos: [state.x0, state.y0, state.x1, state.y1],
      distance: state.distance,
      angle: state.angle,
    };
  };
  
  /**
   * @param {Number} x
   * @param {Number} y
   */
  initIK(x = 0, y = 0) {
    this.posIK = {
      enable: false,
      x: x,
      y: y,
    };
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  calcCurrentState(pathContainer) {
    let currentPos = this.currentState.pos;
    if("flexi" in this) {
      this.paths[0].calcFlexi(pathContainer, this.flexi);
      let pathDataList = this.paths[0].resultPathList;
      currentPos[0] = pathDataList[0].pos[0];
      currentPos[1] = pathDataList[0].pos[1];
      currentPos[2] = pathDataList[1].pos[0];
      currentPos[3] = pathDataList[1].pos[1];
    }
    if("flexiPoint" in this) {
      let dataIndex = this.flexiPoint.dataIndex;
      let resultPos = this.paths[0].resultPathList[dataIndex].pos.concat();
      PathObj.calcFlexiPoints(pathContainer, this.flexiPoint.bones, resultPos, 0, 2);
      let tx = resultPos[0] - currentPos[dataIndex * 2 + 0];
      let ty = resultPos[1] - currentPos[dataIndex * 2 + 1];
      currentPos[0] += tx;
      currentPos[1] += ty;
      currentPos[2] += tx;
      currentPos[3] += ty;
    }
    let state = BoneObj.getDistAndAngle(this.id + ":calcCurrentState", currentPos[0], currentPos[1], currentPos[2], currentPos[3]);
    this.currentState.distance = state.distance;
    this.currentState.angle = state.angle;
    
    let sprite = this.effectSprite;
    sprite.x = currentPos[0];
    sprite.y = currentPos[1];
    sprite.anchorX = this.defState.x0;
    sprite.anchorY = this.defState.y0;
    sprite.scaleY = state.distance / this.defState.distance;
    if(isNaN(sprite.scaleY)) sprite.scaleY = 1;
    sprite.rotation = state.angle - this.defState.angle;
 };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Number} angle
   */
  rotateCurrentState(pathContainer, angle) {
    let dist = this.currentState.distance;
    let currentPos = this.currentState.pos;
    currentPos[2] = currentPos[0] + Math.cos(angle) * dist;
    currentPos[3] = currentPos[1] + Math.sin(angle) * dist;
    this.calcCurrentState(pathContainer);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Number} angle
   * @return {Number} - angle
   */
  limitAngle(pathContainer, angle) {
    if(typeof angle === "undefined") {
      let currentPos = this.currentState.pos;
      angle = Math.atan2(currentPos[3] - currentPos[1], currentPos[2] - currentPos[0]);
      if(isNaN(angle)) angle = 0;
    }
    if(!("maxAngle" in this || "minAngle" in this)) return angle;
    let parentAngle = ("parentID" in this) ? pathContainer.groups[this.parentID].currentState.angle : 0;
    
    let amendAngle =val=> {
      let PI = Math.PI;
      let TAU = PI * 2;
      while(val < -PI) val += TAU;
      while(val >= PI) val -= TAU;
      return val;
    };
    
    let targetAngle = amendAngle(angle - parentAngle);
    
    if("maxAngle" in this) {
      let maxAngle = amendAngle(this.maxAngle);
      if(targetAngle > maxAngle) {
        return maxAngle + parentAngle;
      }
    }
    if("minAngle" in this) {
      let minAngle = amendAngle(this.minAngle);
      if(targetAngle < minAngle) {
        return minAngle + parentAngle;
      }
    }
    return angle;
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  preprocessing(pathContainer) {
    if(!this.defState) return;
    
    let pathDataList = this.paths[0].resultPathList = this.paths[0].getPathDataList(pathContainer.actionList[pathContainer.currentActionID].currentFrame, pathContainer.currentActionID);
    if(pathDataList.length != 2) return;
    
    let data = [pathDataList[0].pos[0], pathDataList[0].pos[1], pathDataList[1].pos[0], pathDataList[1].pos[1]];
    this.getMatrix(data[0], data[1]).applyToArray(data);
    
    let currentPos = this.currentState.pos;
    currentPos[0] = data[0];
    currentPos[1] = data[1];
    currentPos[2] = data[2];
    currentPos[3] = data[3];
    this.calcCurrentState(pathContainer);
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  calcInverseKinematics(pathContainer) {
    let reach =(tempState, x, y, targetBone)=> {
      let tempPos = tempState.pos;
      let state = BoneObj.getDistAndAngle(this.id + ":calcInverseKinematics", tempPos[0], tempPos[1], tempPos[2], tempPos[3]);
      let orgAngle = Math.atan2(y - tempPos[1], x - tempPos[0]);
      if(isNaN(orgAngle)) orgAngle = 0;
      
      let distAngle = state.angle - targetBone.currentState.angle;
      let amdAngle = targetBone.limitAngle(pathContainer, orgAngle - distAngle);
      
      targetBone.rotateCurrentState(pathContainer, amdAngle);
      
      let resultAngle = amdAngle + distAngle;
      let amdX = tempPos[2] = tempPos[0] + Math.cos(resultAngle) * state.distance;
      let amdY = tempPos[3] = tempPos[1] + Math.sin(resultAngle) * state.distance;
      tempState.resultAngle = resultAngle - distAngle;
      
      return {
        x: x - (tempPos[2] - tempPos[0]),
        y: y - (tempPos[3] - tempPos[1]),
        amdX: amdX,
        amdY: amdY,
      };
    };
    
    let amendAngle =(index, level = 0)=> {
      let resultState = reach(tempList[0], this.posIK.x, this.posIK.y, pathContainer.groups[boneIDs[0]]);
      for(let i = 1; i < index; ++i) {
        resultState = reach(tempList[i], resultState.x, resultState.y, pathContainer.groups[boneIDs[i]]);
        let dx = resultState.amdX - tempList[i-1].pos[0];
        let dy = resultState.amdY - tempList[i-1].pos[1];
        
        for(let j = 0; j < i; ++j) {
          let temp = tempList[j];
          temp.pos[0] += dx;
          temp.pos[1] += dy;
          temp.pos[2] += dx;
          temp.pos[3] += dy;
        }
        amendAngle(i, level+1);
      }
    };
    
    let boneIDs = [this.uid];
    let tempList = [{
      pos: this.currentState.pos.concat(),
      defPos: this.currentState.pos.concat(),
    }];
    let bone = this;
    while("parentID" in bone) {
      let parentID = bone.parentID;
      let target = pathContainer.groups[parentID];
      if(target.fixed) break;
      tempList.push({
        pos: [
          target.currentState.pos[0],
          target.currentState.pos[1],
          bone.currentState.pos[0],
          bone.currentState.pos[1]
        ],
        defPos: target.currentState.pos.concat(),
      });
      boneIDs.push(parentID);
      bone = target;
    }
    
    let boneNum = boneIDs.length;
    amendAngle(boneNum);
    for(let i = boneNum-2; i >= 0; --i) {
      let temp = tempList[i];
      let dx = tempList[i+1].pos[2] - temp.pos[0];
      let dy = tempList[i+1].pos[3] - temp.pos[1];
      temp.pos[0] += dx;
      temp.pos[1] += dy;
      temp.pos[2] += dx;
      temp.pos[3] += dy;
    }
    
    let diffX = 0;
    let diffY = 0;
    for(let i = boneNum-1; i >= 0; --i) {
      let target = pathContainer.groups[boneIDs[i]];
      let currentPos = target.currentState.pos;
      let temp = tempList[i];
      let dx = temp.pos[0] - temp.defPos[0] + diffX;
      let dy = temp.pos[1] - temp.defPos[1] + diffY;
      
      let oldX = currentPos[0] = temp.defPos[0] + dx;
      let oldY = currentPos[1] = temp.defPos[1] + dy;
      currentPos[2] = temp.defPos[2] + dx;
      currentPos[3] = temp.defPos[3] + dy;
      target.rotateCurrentState(pathContainer, temp.resultAngle);
      diffX += currentPos[0] - oldX;
      diffY += currentPos[1] - oldY;
    }
  };
  
  /** 
   * @param {PathContainer} pathContainer
   */
  calcForwardKinematics(pathContainer) {
    if(!("parentID" in this)) return;
    
    let currentPos = this.currentState.pos;
    let target = pathContainer.groups[this.parentID];
    target.effectSprite.getMatrix().applyToArray(currentPos);
    this.calcCurrentState(pathContainer);
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  calc(pathContainer) {
    this.calcForwardKinematics(pathContainer);
    if("posIK" in this && this.posIK.enable) {
      this.calcInverseKinematics(pathContainer);
    }
  };
  
  /**
   * @param {Array} points
   */
  getInfluence(x0, y0) {
    let strength = this.strength;
    if(!strength) return 0;
    
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
      
      let dist = this.strength * ratio / 10;
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
    
    this.childGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};


class PathContainer extends Sprite {
  constructor(name, width, height) {
    super();
    this.name = name;             // paths name
    this.index = null;            // layer index
    this.visible = false;         // display when true
    this.originalWidth = width;   // original svg width
    this.originalHeight = height; // original svg height
    this.displayWidth = width;    // display width
    this.displayHeight = height;  // display height
    this.pathRatio = 0;           // ratio of the path to draw
    this.context = null;          // CanvasRenderingContext2D ( canvas.getContext("2d") )
    this.rootGroups = [];         // root group IDs
    this.groups = [];             // list of groups
    this.bones = [];              // list of bone ID
    this.actionList = [];         // action info list
    
    this.currentActionID = 0;     // current action ID
    this.currentFrame = 0;        // current frame number of action
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
   * @return {Action}
   */
  getAction(actionName) {
    return this.actionList.find(data=>data.name == actionName);
  };
  
  /**
   * @param {String} actionName
   * @param {Integer} frame
   */
  setAction(actionName, frame) {
    let action = this.actionList.find(data=>data.name == actionName);
    if(!action) {
      console.error("target action is not found: " + actionName);
      return;
    }
    this.currentActionID = action.id;
    
    if(typeof frame !== "undefined" && frame >= 0) {
      action.currentFrame = this.currentFrame = frame % action.totalFrames;
    }
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
  
  resetAction() {
    this.actionList.forEach(data=> {
      data.currentFrame = 0;
    });
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
  
  step() {
    let action = this.actionList[this.currentActionID];
    this.currentFrame = (this.currentFrame + 1) % action.totalFrames;
  }
  
  update() {
    if(!this.visible || !this.rootGroups) {
      return;
    }
    
    let action = this.actionList[this.currentActionID];
    action.pastFrame = action.currentFrame;
    action.currentFrame = this.currentFrame;
    
    this.groups.forEach(group=> {
      group.preprocessing(this);
    });
    
    if(typeof control !== "undefined") control(this);
    
    let offset = this.groups.length;
    let bonesMap = this.bones.map((id, i)=> {
      let bone = this.groups[id];
      let ret = { id: id, priority: -1, name: bone.id };
      if(!bone.defState) return ret;
      
      let priority = offset - id + offset * 2;
      let childNum = 0;
      this.bones.forEach(targetID=> {
        if(this.groups[targetID].parentID == bone.uid) {
          childNum += 1;
        }
      });
      
      if("parentID" in bone) {
        if(childNum == 0) {
          priority += offset * 2;
        } else {
          priority += offset;
        }
      } else if(childNum == 0) {
        priority += offset * 3;
      }
      
      ret.priority = priority;
      return ret;
    });
    
    bonesMap.forEach(boneData=> {
      let bone = this.groups[boneData.id];
      if(!("posIK" in bone) || !bone.posIK.enable) return;
      let pri = boneData.priority = bone.uid + offset;
      while("parentID" in bone) {
        let targetData = bonesMap.find(data=> data.id == bone.parentID);
        targetData.priority = --pri;
        bone = this.groups[bone.parentID];
        if(bone.fixed) break;
      }
    });
    
    bonesMap.sort((a, b)=> {
      if(a.priority < 0) return 1;
      if(b.priority < 0) return -1;
      if(a.priority > b.priority) return 1;
      if(a.priority < b.priority) return -1;
      return 0;
    });
    
    bonesMap.some(boneData=> {
      if(boneData.priority < 0) return true;
      this.groups[boneData.id].calc(this);
    });
    
    this.actionList.forEach(targetAction=> {
      if(targetAction.id == action.id) return;
      targetAction.pastFrame = targetAction.currentFrame;
      if("smartBoneID" in targetAction) {
        let bone = this.groups[targetAction.smartBoneID];
        let angle = -bone.currentState.angle;
        let range = targetAction.endAngle - targetAction.startAngle;
        if(range >= 0) {
          angle -= targetAction.startAngle;
          if(angle < 0) angle += Math.PI*2;
          if(angle > range) {
            targetAction.currentFrame = 0;
          } else {
            targetAction.currentFrame = ((angle/range * (targetAction.smartFrames-1))^0) + 1;
          }
        } else {
          angle -= targetAction.endAngle;
          if(angle < 0) angle += Math.PI*2;
          if(angle >= -range) {
            targetAction.currentFrame = 0;
          } else {
            targetAction.currentFrame = targetAction.smartFrames + ((angle/range * (targetAction.smartFrames-1))^0);
          }
        }
      }
    });
    
    if(typeof update !== "undefined") update(this);
    
    this.rootGroups.forEach(id=> {
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
  bonePropList: {
    parentID: 1,
    isPin: 2,
    fixed: 3,
    strength: 4,
    maxAngle: 5,
    minAngle: 6,
  },
  
  binDataPosRange: 30000, // correction value of coordinates when saving to binary data
  
  /**
   * @param {ArrayBuffer} buffer
   * @return {PathContainer}
   */
  init: function(buffer) {
    if(!buffer) {
      console.error("array buffer is not found");
      return null;
    }
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare getting function --
    
    let getUint8  =()=>{let ret = dv.getUint8(sumLength); sumLength += 1; return ret};
    let getUint16 =()=>{let ret = dv.getUint16(sumLength); sumLength += 2; return ret};
    let getUint32 =()=>{let ret = dv.getUint32(sumLength); sumLength += 4; return ret};
    let getFloat32=()=>{let ret = dv.getFloat32(sumLength); sumLength += 4; return ret};
    let getPos    =()=>{let ret = dv.getInt16(sumLength)/BinaryLoader.binDataPosRange; sumLength += 2; return ret};
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
    
    let getAction=func=> {
      if(getUint8()) {
        return getArray(getUint8, ()=>getArray(getUint16, ()=>func()));
      } else {
        return func();
      }
    };
    
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
      let fillRule = (getUint8() ? "evenodd" : "nonzero");
      
      let pathDataList = getPathData();
      
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
      return pathObj;
    };
    
    let getGroup=i=>{
      let name = getString();
      
      let maskIdToUse = getUint16() - 1;
      if(maskIdToUse < 0) maskIdToUse = null;
      let paths = getArray(getUint16, getPath);
      let flexi = getArray(getUint8, getUint16);
      
      let ret;
      if(name.startsWith(PathCtr.defaultBoneName)) {
        ret = new BoneObj(
          i,
          name,
          paths,
          getArray(getUint8, getUint16)
        );
        let kind = getUint8();
        while(kind > 0) {
          switch(kind) {
            case BinaryLoader.bonePropList["parentID"]:
              ret.parentID = getUint16();
              break;
            case BinaryLoader.bonePropList["isPin"]:
              ret.isPin = true;
              break;
            case BinaryLoader.bonePropList["fixed"]:
              ret.fixed = true;
              break;
            case BinaryLoader.bonePropList["strength"]:
              ret.strength = getFloat32();
              break;
            case BinaryLoader.bonePropList["maxAngle"]:
              ret.maxAngle = getFloat32() / 180 * Math.PI;
              break;
            case BinaryLoader.bonePropList["minAngle"]:
              ret.minAngle = getFloat32() / 180 * Math.PI;
              break;
          };
          kind = getUint8();
        }
        
        if(getUint8()) {
          ret.flexiPoint = {
            dataIndex: getUint8(),
            bones: getArray(getUint8, getUint16),
          };
        }
      } else {
        ret = new GroupObj(
          i,
          name,
          paths,
          getAction(()=>getArray(getUint8, getUint16)),
          maskIdToUse
        );
      }
      
      if(flexi.length > 0) {
        ret.flexi = flexi;
      }
      return ret;
    };
    
    
    // --acquisition processing--
    
    let pathContainer = PathCtr.initTarget = new PathContainer(getString(), getUint16(), getUint16());
    
    let actionListNum = getUint8();
    if(actionListNum > 0) {
      for(let i = 0; i < actionListNum; ++i) {
        let action = pathContainer.addAction(getString(), getUint8(), getUint16());
        if(getUint8()) {
          action.smartBoneID = getUint16();
          action.smartFrames = getUint16();
          action.startAngle = getFloat32() / 180 * Math.PI;
          action.endAngle = getFloat32() / 180 * Math.PI;
        }
      }
    }
    
    pathContainer.rootGroups = getArray(getUint8, getUint16);
    
    let groupsNum = getUint16();
    for(let i = 0; i < groupsNum; ++i) {
      PathWorker.debugPrint("count : " + i);
      PathWorker.debugPrint(i);
      PathWorker.debugPrint(sumLength);
      
      let group = getGroup(i);
      pathContainer.groups[i] = group;
      if(BoneObj.prototype.isPrototypeOf(group)) {
        pathContainer.bones.push(group.uid);
      }
      PathWorker.debugPrint(group);
    }
    
    return pathContainer;
  },
  
  /**
   * @param {String} filePath - binary file path
   * @param {Integer} index - paths layer index
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(filePath, index, completeFunc = null) {
    if(!filePath) {
      console.error("filePath not found");
      return;
    }
    let request = new XMLHttpRequest();
    request.onreadystatechange = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if((target.status != 200 && target.status != 0) || !target.response) {
        console.error("failed to read file: " + filePath);
        console.error(target.statusText);
        return;
      }
      
      let buffer = request.response;
      let pathContainer = BinaryLoader.init(buffer);
      pathContainer.index = index;
      
      PathWorker.loadPrint("loading completed");
      
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
 * PathWorker
 * Singleton
 */
var PathWorker = {
  debugPrint: function(){},
  loadPrint: function(){},
  
  /**
   * @param {Boolean} isOn
   */
  setDebugPrint: function(isOn) {
    PathWorker.debugPrint = isOn? console.debug : function(){};
  },
  
  /**
   * @param {Boolean} isOn
   */
  setLoadPrint: function(isOn) {
    PathWorker.loadPrint = isOn? console.log : function(){};
  },
  
  loadState: "",
  instance: null,
  isWorker: false,
  
  /**
   * @param {Object} obj
   */
  postMessage: function(obj) {
    if(PathWorker.isWorker) {
      PathWorker.instance.postMessage(obj);
    } else {
      window.dispatchEvent(new CustomEvent("message", {bubbles: true, detail: obj}));
    }
  },
  
  init: function() {
    PathWorker.instance.addEventListener("message", function(e) {
      let data = !e.data? e.detail : e.data;
      switch(data.cmd) {
        case "init":
          PathWorker.loadPrint("init");
          PathCtr.defaultBoneName = data.defaultBoneName;
          PathCtr.init(data.canvas, data.subCanvas, data.viewWidth, data.viewHeight);
          return false;
          
        case "load-complete":
          PathWorker.loadState = "";
          PathCtr.loadComplete();
          PathWorker.postMessage({cmd: "main-init-complete"});
          return false;
          
        case "load-bin":
          BinaryLoader.load(data.path, data.index, ()=>{
            PathCtr.loadComplete();
            PathWorker.postMessage({cmd: "main-init-complete"});
          });
          return false;
          
        case "load-bone":
          PathWorker.loadState = "load bone";
          PathWorker.loadPrint(PathWorker.loadState);
          BoneLoader.load(data.filePathList, PathCtr.pathContainers[PathCtr.pathContainers.length-1]);
          return false;
          
          
          /* ---- input ---- */
          
        case "resize-canvas":
          PathCtr.setSize(data.viewWidth, data.viewHeight);
          return false;
          
        case "change-action":
          PathCtr.pathContainers[0].setAction(data.name, data.frame);
          return false;
          
        case "mouse-move":
          InputInfo.setMousePos(data.x, data.y);
          return false;
          
        case "mouse-enter":
          InputInfo.isValidPointer = true;
          return false;
          
        case "mouse-leave":
          InputInfo.isValidPointer = false;
          return false;
          
        case "touch-move":
          InputInfo.setTouch(data.touches);
          return false;
          
        case "keyup":
          if(typeof DebugPath !== "undefined") {
            DebugPath.keyUp(PathCtr.pathContainers[0], data.code);
          }
          return false;
          
        case "set-control":
          importScripts(data.path);
          return false;
          
          
          /* ---- output ---- */
          
        case "output-path-container":
          DebugPath.outputJSON(PathCtr.pathContainers[0]);
          return false;
          
        case "output-bin":
          DebugPath.outputBin(PathCtr.pathContainers[0]);
          return false;
          
          
          /* ---- create data ---- */
          
        case "create-path-container":
          PathWorker.loadState = "init path container";
          PathWorker.loadPrint(PathWorker.loadState);
          PathCtr.initTarget = new PathContainer(data.name, data.width, data.height);
          PathCtr.initTarget.index = data.index;
          return false;
          
        case "add-action":
          PathWorker.loadState = "load action: " + data.actionName + " - " + data.totalFrames;
          PathWorker.loadPrint(PathWorker.loadState);
          PathCtr.initTarget.addAction(data.actionName, data.frame, data.totalFrames);
          return false;
          
        case "add-root-group":
          PathCtr.initTarget.rootGroups.push(data.id);
          return false;
          
        case "new-group":
          PathWorker.loadState = "new group: " + data.uid + " - " + data.name;
          PathWorker.loadPrint(PathWorker.loadState);
          PathCtr.initTarget.groups[data.uid] = new GroupObj(
            data.uid,
            data.name,
            [],
            [],
            data.maskID
          );
          return false;
          
        case "new-bone":
          PathWorker.loadState = "new bone: " + data.uid + " - " + data.name;
          PathWorker.loadPrint(PathWorker.loadState);
          PathCtr.initTarget.groups[data.uid] = new BoneObj(
            data.uid,
            data.name,
            [],
            []
          );
          PathCtr.initTarget.bones.push(data.uid);
          return false;
          
        case "add-group-action":
          PathWorker.loadState = "add action: " + data.actionName + " - " + data.frame;
          PathWorker.loadPrint(PathWorker.loadState);
          if(!PathCtr.initTarget.bones.includes(data.uid)) {
            PathCtr.initTarget.groups[data.uid].addAction(
              data.childGroups,
              data.frame,
              PathCtr.initTarget.getAction(data.actionName).id
            );
          }
          return false;
          
        case "set-child-group-id":
          if(PathCtr.initTarget.bones.includes(data.uid)) {
            PathCtr.initTarget.groups[data.uid].childGroups = data.childGroups;
          } else {
            PathCtr.initTarget.groups[data.uid].childGroups.setData(data.childGroups);
          }
          return false;
          
        case "new-path":
          PathCtr.initTarget.groups[data.uid].paths.push(new PathObj(
            data.maskID,
            data.pathDataList,
            data.pathDiffList,
            data.fillRule,
            data.fillStyle,
            data.lineWidth,
            data.strokeStyle
          ));
          return false;
          
        case "new-bone-path":
          PathCtr.initTarget.groups[data.uid].paths.push(new PathObj(
            null,
            data.pathDataList,
            data.pathDiffList,
            "nonzero",
            "transparent",
            2,
            "rgb(0, 255, 0)"
          ));
          if(PathCtr.initTarget.groups[data.uid].paths.length == 1) {
            let bone = PathCtr.initTarget.groups[data.uid];
            BoneObj.setPath(bone, bone.paths[0]);
          }
          return false;
          
        case "add-path-action":
          PathCtr.initTarget.groups[data.uid].paths[data.pathID].addAction(
            data.pathDataList,
            data.fillStyle,
            data.lineWidth,
            data.strokeStyle,
            data.frame,
            PathCtr.initTarget.getAction(data.actionName).id
          );
          return false;
          
        case "add-bone-path-action":
          PathCtr.initTarget.groups[data.uid].paths[data.pathID].addAction(
            data.pathDataList,
            "transparent",
            2,
            "rgb(0, 255, 0)",
            data.frame,
            PathCtr.initTarget.getAction(data.actionName).id
          );
          return false;
          
        case "set-unvisible-path-action":
          PathCtr.initTarget.groups[data.uid].paths.forEach(path=>{
            path.addAction(
              null,
              "transparent",
              0,
              "transparent",
              data.frame,
              PathCtr.initTarget.getAction(data.actionName).id
            );
          });
          return false;
          
          
        default:
          if(!e.bubbles) console.error("unknown command: " + data.cmd);
          return true;
      };
    }, false);
  },
};

PathWorker.isWorker = typeof DedicatedWorkerGlobalScope !== "undefined";
if(PathWorker.isWorker) {
  PathWorker.instance = this;
  PathWorker.init();
} else {
  PathWorker.instance = window;
  PathWorker.init();
  PathMain.initWorker();
}

` 

/**
 * PathMain
 * Singleton
 */
var PathMain = {
  debugPrint: function(){},
  loadPrint: function(){},
  
  /**
   * @param {Boolean} isOn
   */
  setDebugPrint: function(isOn) {
    PathMain.debugPrint = isOn? console.debug : function(){};
  },
  
  /**
   * @param {Boolean} isOn
   */
  setLoadPrint: function(isOn) {
    PathMain.loadPrint = isOn? console.log : function(){};
  },
  
  defaultBoneName: "bone",
  isUseMin: false,
  
  worker: null,
  useWorker: false,
  
  canvas: null,
  subCanvas: null,
  completeInitFunc: null,
  completeLoadFunc: null,
  
  /**
   * @param {Object} obj
   * @param {Array} opt - postMessage option
   */
  postMessage: function(obj, opt) {
    if(PathMain.useWorker) {
      PathMain.worker.postMessage(obj, opt);
    } else {
      window.dispatchEvent(new CustomEvent("message", {bubbles: true, detail: obj}));
    }
  },
  
  initWorker: function() {
    let canvas = PathMain.canvas;
    let subCanvas = PathMain.subCanvas;
    let viewWidth = document.documentElement.clientWidth;
    let viewHeight = document.documentElement.clientHeight;
    canvas.width = subCanvas.width = viewWidth;
    canvas.height = subCanvas.height = viewHeight;
    
    canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + viewWidth + "px;height:" + viewHeight + "px;");
    
    PathMain.worker.addEventListener("message", function(e) {
      let data = !e.data? e.detail : e.data;
      switch(data.cmd) {
        case "main-init-complete":
          if(!!PathMain.completeLoadFunc) {
            PathMain.completeLoadFunc();
            PathMain.completeLoadFunc = null;
          }
          return false;
          
        case "main-bone-load-complete":
          if(!!PathMain.completeBoneLoadFunc) {
            PathMain.completeBoneLoadFunc();
            PathMain.completeBoneLoadFunc = null;
          }
          return false;
          
        case "main-confirm":
          if(confirm(data.message)) {
            PathMain.postMessage({cmd: data.callback});
          }
          return false;
          
        case "main-download":
          PathMain.downloadData(data.type, data.fileName, data.data);
          return false;
          
        default:
          if(!e.bubbles) console.error("unknown command: " + data.cmd);
          return true;
      }
    }, false);
    
    window.addEventListener("resize", function() {
      let viewWidth = document.documentElement.clientWidth;
      let viewHeight = document.documentElement.clientHeight;
      PathMain.canvas.setAttribute("style", "position:fixed;z-index:-1;left:0;top:0;width:" + PathMain.viewWidth + "px;height:" + PathMain.viewHeight + "px;");
      PathMain.postMessage({
        cmd: "resize-canvas", 
        viewWidth: viewWidth,
        viewHeight: viewHeight,
      });
    });
    
    document.addEventListener("mousemove", function(e) {
      PathMain.postMessage({
        cmd: "mouse-move", 
        x: e.clientX,
        y: e.clientY,
      });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener("mouseenter", function(e) {
      PathMain.postMessage({
        cmd: "mouse-enter", 
      });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener("mouseleave", function(e) {
      PathMain.postMessage({
        cmd: "mouse-leave", 
      });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener("touchmove", function(e) {
      let touches = [];
      for(let i = 0; i < e.touches.length; ++i) {
        let touch = e.touches[i];
        touches.push({
          identifier: touch.identifier,
          pageX: touch.pageX,
          pageY: touch.pageY,
        });
      }
      PathMain.postMessage({
        cmd: "touch-move", 
        touches: touches,
      });
      e.preventDefault();
    }, { passive: false });
    
    document.addEventListener("keyup", function(e) {
      PathMain.postMessage({
        cmd: "keyup", 
        code: e.code,
      });
    });
    
    let targetCanvas = PathMain.canvas;
    let targetSubCanvas = PathMain.subCanvas;
    if(PathMain.useWorker) {
      targetCanvas = targetCanvas.transferControlToOffscreen();
      targetSubCanvas = targetSubCanvas.transferControlToOffscreen();
    }
    
    PathMain.postMessage({
      cmd: "init",
      viewWidth: viewWidth,
      viewHeight: viewHeight,
      canvas: targetCanvas,
      subCanvas: targetSubCanvas,
      defaultBoneName: PathMain.defaultBoneName,
    }, [ targetCanvas, targetSubCanvas ]);
    
    if(!!PathMain.completeInitFunc) {
      PathMain.completeInitFunc();
      PathMain.completeInitFunc = null;
    }
  },
  
  /**
   * @param {String} type
   * @param {String} fileName
   * @param {String} data
   */
  downloadData: function(type, fileName, data) {
    let a = document.createElement("a");
    document.body.appendChild(a);
    a.style = "display: none";
    
    let blob = new Blob([data], {type: type});
    
    a.href = window.URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    a.remove();
  },
  
  outputBin: function() {
    PathMain.postMessage({cmd: "output-bin"});
  },
  
  /**
   * @param {Array} filePathList - json file path list
   * @param {Function} completeFunc - callback when loading complete
   */
  loadBone: function(filePathList, completeFunc) {
    if(!Array.isArray(filePathList)) {
      console.error("filePathList is not array data.");
      console.log(filePathList);
      return;
    }
    
    PathMain.completeBoneLoadFunc = completeFunc;
    let pathList = filePathList.map(path=> new URL(path, window.location.href).href);
    PathMain.postMessage({cmd: "load-bone", filePathList: pathList});
  },
  
  /**
   * @param {String} jsPath - file path to webworker
   * @param {Function} completeFunc - callback when initialization is complete
   */
  init: function(jsPath = null, completeFunc = null) {
    let container = document.getElementById("path-container");
    if(!container) {
      console.error("CanvasContainer is not found.");
      return;
    }
    
    let canvas = PathMain.canvas = document.createElement("canvas");
    canvas.className = "main-canvas";
    container.appendChild(canvas);
    
    let subCanvas = PathMain.subCanvas = document.createElement("canvas");
    subCanvas.className = "sub-canvas";
    subCanvas.setAttribute("style", "display:none;");
    container.appendChild(subCanvas);
    
    PathMain.completeInitFunc = completeFunc;
    PathMain.useWorker = !!Worker && !!canvas.transferControlToOffscreen;
    
    let blob = new Blob([path_control], {type: "text/javascript"});
    let filePath = window.URL.createObjectURL(blob);
    if(PathMain.useWorker) {
      PathMain.worker = new Worker(filePath);
      if(!!jsPath) {
        PathMain.postMessage({
          cmd: "set-control",
          path: new URL(jsPath, window.location.href).href,
        });
      }
      PathMain.initWorker();
    } else {
      console.warn("this browser is not supported");
      PathMain.worker = window;
      
      if(!!jsPath) {
        let subScript = document.createElement("script");
        subScript.src = jsPath;
        document.body.appendChild(subScript);
      }
      
      let mainScript = document.createElement("script");
      mainScript.src = filePath;
      document.body.appendChild(mainScript);
    }
  },
  
  /**
   * @param {String} path - file path info
   * @param {Integer} index - paths layer index
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(path, index, completeFunc = null) {
    PathMain.completeLoadFunc = completeFunc;
    PathMain.postMessage({
      cmd: "load-bin",
      index: index,
      path: new URL(path, window.location.href).href,
    });
  },
};
