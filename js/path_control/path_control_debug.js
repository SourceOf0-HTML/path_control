/**
 * path_control v0.6.0
 * 
 * Copyright (c) 2020 BUN
 * 
 * This software is released under the MIT License.
 * https://opensource.org/licenses/MIT
 **/

let path_control=` 

/**
 * PathCtr
 * Singleton
 */
var PathCtr = {
  isOutputDebugPrint: false,
  debugPrint: function() {
    if(!PathCtr.isOutputDebugPrint) return;
    //console.log("Func : " + PathCtr.debugPrint.caller.name);
    console.log.apply(null, arguments);
  },
  
  isOutputLoadState: true,
  loadState: function() {
    if(!PathCtr.isOutputLoadState) return;
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
  
  
  defaultCanvasContainerID: "path-container",  // default canvas container element name
  defaultActionName: "base",
  initTarget: null,  // instance to be initialized
  binDataPosRange: 20000, // correction value of coordinates when saving to binary data
  
  pathContainer: null,
  canvas: null,
  subCanvas: null,
  context: null,
  subContext: null,
  viewWidth: 0,
  viewHeight: 0,
  
  actionName: "base",
  frameNumber: 0,
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
    if(!!PathCtr.pathContainer) PathCtr.pathContainer.setSize(viewWidth, viewHeight);
    PathCtr.update();
  },
  
  loadComplete: function() {
    PathCtr.pathContainer = PathCtr.initTarget;
    PathCtr.pathContainer.context = PathWorker.isWorker? PathCtr.context:PathCtr.subContext;
    PathCtr.setSize(PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.initTarget = null;
    PathCtr.loadState(PathCtr.pathContainer);
    if(typeof DebugPath !== "undefined") {
      DebugPath.init(PathCtr.pathContainer);
    }
    setup(PathCtr.pathContainer);
    PathCtr.update();
  },
  
  draw: function(timestamp) {
    if(typeof DebugPath !== "undefined" && DebugPath.isStop) {
      if(!DebugPath.isStep) return;
      DebugPath.isStep = false;
      console.log("STEP: " + PathCtr.actionName + " - " + PathCtr.frameNumber);
    }
    
    if(typeof timestamp === "undefined") return;
    
    let elapsed = (timestamp - PathCtr.prevTimestamp) / 1000;
    PathCtr.average = (PathCtr.average + elapsed) / 2;
    //PathCtr.debugPrint((PathCtr.average * 100000)^0);
    
    if(!PathCtr.pathContainer) return;
    
    let frameTime = 1 / 24;
    let totalFrames = 1;
    let action = PathCtr.pathContainer.getAction(PathCtr.actionName);
    if(!!action) {
      totalFrames = action.totalFrames;
    } else {
      PathCtr.actionName = "base";
      action = PathCtr.pathContainer.getAction(PathCtr.actionName);
      if(!!action) totalFrames = action.totalFrames;
    }
    
    if(PathWorker.isWorker) {
      PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.pathContainer.draw();
      if(timestamp - PathCtr.prevTimestamp < frameTime*500) return;
    } else {
      PathCtr.subContext.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.pathContainer.draw();
      PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
      PathCtr.context.putImageData(PathCtr.subContext.getImageData(0, 0, PathCtr.viewWidth, PathCtr.viewHeight), 0, 0);
    }
    
    PathCtr.frameNumber = PathCtr.frameNumber % totalFrames + 1;
    
    PathCtr.prevTimestamp = timestamp;
    if(PathCtr.average > frameTime * 2) {
      PathCtr.fixFrameTime *= 0.99;
      PathCtr.debugPrint("up");
    } else if(PathCtr.average < frameTime * 0.5) {
      PathCtr.fixFrameTime *= 1.01;
      PathCtr.debugPrint("down");
    } else {
      PathCtr.fixFrameTime = (frameTime + PathCtr.fixFrameTime) / 2;
    }
    
    PathCtr.pathContainer.update(PathCtr.frameNumber, PathCtr.actionName);
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
      PathCtr.debugPrint(action.name, action.pastFrame, action.currentFrame, val);
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
          output(action, data);
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
            output(action, data);
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
   * @param {BoneObj} bone - target bone
   * @param {Array} paths - path data array
   */
  static setPath(bone, path) {
    let pathDataList = path.getPathDataList();
    let x0 = pathDataList[0].pos[0];
    let y0 = pathDataList[0].pos[1];
    let x1 = pathDataList[1].pos[0];
    let y1 = pathDataList[1].pos[1];
    let distX = x1 - x0;
    let distY = y1 - y0;
    let distance = Math.sqrt(distX*distX + distY*distY);
    let angle = Math.atan2(distY, distX);
    bone.defState = {  // default bone state
      x0, y0,
      x1, y1,
      distance,
      angle,
    };
    bone.currentState = {  // current bone state
      pos: [x0, y0, x1, y1],
      distance,
      angle,
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
    let distX = currentPos[2] - currentPos[0];
    let distY = currentPos[3] - currentPos[1];
    let angle = this.currentState.angle = Math.atan2(distY, distX);
    let dist = this.currentState.distance = Math.sqrt(distX*distX + distY*distY);
    
    let sprite = this.effectSprite;
    sprite.x = currentPos[0];
    sprite.y = currentPos[1];
    sprite.anchorX = this.defState.x0;
    sprite.anchorY = this.defState.y0;
    sprite.scaleY = dist / this.defState.distance;
    sprite.rotation = angle - this.defState.angle;
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
      let distX = tempPos[2] - tempPos[0];
      let distY = tempPos[3] - tempPos[1];
      let angle = Math.atan2(distY, distX);
      let dist = Math.sqrt(distX*distX + distY*distY);
      let orgAngle = Math.atan2(y - tempPos[1], x - tempPos[0]);
      let distAngle = angle - targetBone.currentState.angle;
      let amdAngle = targetBone.limitAngle(pathContainer, orgAngle - distAngle);
      
      targetBone.rotateCurrentState(pathContainer, amdAngle);
      
      let resultAngle = amdAngle + distAngle;
      let amdX = tempPos[2] = tempPos[0] + Math.cos(resultAngle) * dist;
      let amdY = tempPos[3] = tempPos[1] + Math.sin(resultAngle) * dist;
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
      if(!bone.feedback) break;
      let parentID = bone.parentID;
      let target = pathContainer.groups[parentID];
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
    if(this.isParentPin) {
      let x = target.effectSprite.x - target.effectSprite.anchorX;
      let y = target.effectSprite.y - target.effectSprite.anchorY;
      currentPos[0] += x;
      currentPos[1] += y;
      currentPos[2] += x;
      currentPos[3] += y;
      this.calcCurrentState(pathContainer);
      return;
    }
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
    
    this.childGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};


class PathContainer extends Sprite {
  constructor(width, height) {
    super();
    this.visible = true;          // display when true
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
   * @return {Action}
   */
  getAction(actionName) {
    return this.actionList.find(data=>data.name == actionName);
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
   * @param {Number} x - reference mouse x
   * @param {Number} y - reference mouse y
   */
  setMouse(x, y) {
    this.mouseX = x / this.pathRatio;
    this.mouseY = y / this.pathRatio;
  }
  
  /**
   * @param {Integer} frame
   * @param {String} actionName
   */
  update(frame, actionName = PathCtr.defaultActionName) {
    if(!this.visible || !this.rootGroups) {
      return;
    }
    
    let action = this.getAction(actionName);
    if(!action) {
      console.error("target action is not found: " + actionName);
      return;
    }
    action.pastFrame = action.currentFrame;
    action.currentFrame = frame;
    
    this.currentActionID = action.id;
    
    this.groups.forEach(group=> {
      group.preprocessing(this);
    });
    
    control(this);
    
    let offset = this.groups.length;
    let bonesMap = this.bones.map((id, i)=> {
      let bone = this.groups[id];
      let ret = { id: id, priority: -1, name: bone.id };
      if(!bone.defState) return ret;
      
      let priority = id + offset * 2;
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
        if(!bone.feedback) break;
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
        targetAction.currentFrame = this.groups[targetAction.smartBoneID].getSmartFrame(targetAction.totalFrames);
      }
    });
    
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
    isParentPin: 2,
    feedback: 3,
    strength: 4,
    maxAngle: 5,
    minAngle: 6,
    isSmartBone: 7,
    smartBase: 8,
    smartMax: 9,
  },
  
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
            case BinaryLoader.bonePropList["isParentPin"]:
              ret.isParentPin = true;
              break;
            case BinaryLoader.bonePropList["feedback"]:
              ret.feedback = true;
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
            case BinaryLoader.bonePropList["isSmartBone"]:
              ret.isSmartBone = true;
              break;
            case BinaryLoader.bonePropList["smartBase"]:
              ret.smartBase = getFloat32() / 180 * Math.PI;
              break;
            case BinaryLoader.bonePropList["smartMax"]:
              let rad = getFloat32();
              ret.smartMax = rad / 180 * Math.PI;
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
    
    let pathContainer = PathCtr.initTarget = new PathContainer(getUint16(), getUint16());
    
    let actionListNum = getUint8();
    if(actionListNum > 0) {
      for(let i = 0; i < actionListNum; ++i) {
        let action = pathContainer.addAction(getString(), getUint8(), getUint16());
        if(getUint8()) {
          action.smartBoneID = getUint16();
        }
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
    request.onreadystatechange = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if((target.status != 200 && target.status != 0) || !target.response) {
        console.error("failed to read file: " + target.responseURL);
        console.error(target.statusText);
        return;
      }
      
      let buffer = request.response;
      let pathContainer = BinaryLoader.init(buffer);
      PathCtr.loadState("loading completed");
      
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
          PathCtr.loadState("init");
          PathCtr.defaultBoneName = data.defaultBoneName;
          PathCtr.init(data.canvas, data.subCanvas, data.viewWidth, data.viewHeight);
          return false;
          
        case "load-complete":
          PathCtr.loadComplete();
          PathWorker.postMessage({cmd: "main-init-complete"});
          return false;
          
        case "load-bin":
          BinaryLoader.load(data.path, ()=>{
            PathCtr.loadComplete();
            PathWorker.postMessage({cmd: "main-init-complete"});
          });
          return false;
          
        case "load-bone":
          BoneLoader.load(data.path, PathCtr.pathContainer);
          return false;
          
          
          /* ---- input ---- */
          
        case "resize-canvas":
          PathCtr.setSize(data.viewWidth, data.viewHeight);
          return false;
          
        case "change-action":
          PathCtr.actionName = data.name;
          if(typeof data.frame !== "undefined" && data.frame >= 0) {
            PathCtr.frameNumber = data.frame;
          }
          return false;
          
        case "move-mouse":
          if(!!PathCtr.pathContainer) {
            PathCtr.pathContainer.setMouse(data.x, data.y);
          }
          return false;
          
        case "keyup":
          if(typeof DebugPath !== "undefined") {
            DebugPath.keyUp(PathCtr.pathContainer, data.code);
          }
          return false;
          
        case "set-control":
          importScripts(data.path);
          return false;
          
          
          /* ---- output ---- */
          
        case "output-path-container":
          DebugPath.outputJSON(PathCtr.pathContainer);
          return false;
          
        case "output-bin":
          DebugPath.outputBin(PathCtr.pathContainer);
          return false;
          
          
          /* ---- create data ---- */
          
        case "create-path-container":
          PathCtr.loadState("init path container");
          PathCtr.initTarget = new PathContainer(data.width, data.height);
          return false;
          
        case "add-action":
          PathCtr.loadState("load action: " + data.actionName + " - " + data.totalFrames);
          PathCtr.initTarget.addAction(data.actionName, data.frame, data.totalFrames);
          return false;
          
        case "add-root-group":
          PathCtr.initTarget.rootGroups.push(data.id);
          return false;
          
        case "new-group":
          PathCtr.initTarget.groups[data.uid] = new GroupObj(
            data.uid,
            data.name,
            [],
            [],
            data.maskID
          );
          return false;
          
        case "new-bone":
          PathCtr.initTarget.groups[data.uid] = new BoneObj(
            data.uid,
            data.name,
            [],
            []
          );
          PathCtr.initTarget.bones.push(data.uid);
          return false;
          
        case "add-group-action":
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
    let setJSONData =(bone, data)=> {
      if(!bone || !data) return;
      PathCtr.loadState("BONE: " + bone.id);
      
      let parentBone = pathContainer.getBone(data.parent);
      if("parent" in data && !!parentBone) {
        bone.parentID = parentBone.uid;
        PathCtr.loadState("  parentID: " + bone.parentID + "(" + data.parent + ")");
      }
      
      if("isParentPin" in data && (typeof data.isParentPin === "boolean")) {
        bone.isParentPin = data.isParentPin;
        PathCtr.loadState("  isParentPin: " + bone.isParentPin);
      }
      
      if("feedback" in data && (typeof data.feedback === "boolean")) {
        bone.feedback = data.feedback;
        PathCtr.loadState("  feedback: " + bone.feedback);
      }
      
      if("strength" in data && Number.isFinite(data.strength)) {
        bone.strength = data.strength;
        PathCtr.loadState("  strength: " + bone.strength);
      }
      
      if("maxAngle" in data && Number.isFinite(data.maxAngle)) {
        bone.maxAngle = data.maxAngle/180 * Math.PI;
        PathCtr.loadState("  maxAngle: " + bone.maxAngle);
      }
      
      if("minAngle" in data && Number.isFinite(data.minAngle)) {
        bone.minAngle = data.minAngle/180 * Math.PI;
        PathCtr.loadState("  minAngle: " + bone.minAngle);
      }
      
      
      if("smartBase" in data && Number.isFinite(data.smartBase)) {
        bone.smartBase = data.smartBase/180 * Math.PI;
        PathCtr.loadState("  smartBase: " + bone.smartBase);
      }
      
      if("smartMax" in data && Number.isFinite(data.smartMax)) {
        bone.smartMax = data.smartMax/180 * Math.PI;
        PathCtr.loadState("  smartMax: " + bone.smartMax);
      }
      
      if("smartAction" in data && (typeof data.smartAction === "string")) {
        let action = pathContainer.actionList.find(action=>action.name == data.smartAction);
        if(!action) {
          console.error("smart action is not found : " + data.smartAction);
          return;
        }
        bone.isSmartBone = true;
        action.smartBoneID = bone.uid;
        PathCtr.loadState("  isSmartBone: " + bone.isSmartBone);
        PathCtr.loadState("    smartAction: " + action.name);
      }
      
      
      if("flexiPoint" in data && (typeof data.flexiPoint === "object")) {
        let dataIndex = data.flexiPoint.dataIndex;
        let boneNameList = data.flexiPoint.bones;
        if(!Number.isFinite(dataIndex) || !Array.isArray(boneNameList)) return;
        if(dataIndex >= 2) return;
        
        PathCtr.loadState("  flexiPoint:");
        PathCtr.loadState("    dataIndex: " + dataIndex);
        let bones = [];
        boneNameList.forEach(name=> {
          let bone = pathContainer.getBone(name);
          if(!!bone) {
            bones.push(bone.uid);
            PathCtr.loadState("    bone: " + name);
          }
        });
        bone.flexiPoint = {
          dataIndex: dataIndex,
          bones: bones,
        };
      }
    };
    
    request.onload = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if(target.status != 200 && target.status != 0) return;
      
      let ret = JSON.parse(target.responseText);
      if("bones" in ret && (typeof ret.bones === "object")) {
        Object.keys(ret.bones).forEach(id=>{
          let bone = pathContainer.getBone(id);
          if(!bone) {
            console.error("bone is not found : " + id);
            return;
          }
          setJSONData(bone, ret.bones[id]);
        });
      }
      
      if("flexi" in ret && (typeof ret.flexi === "object")) {
        Object.keys(ret.flexi).forEach(name=> {
          let group = pathContainer.getGroup(name);
          if(!group) {
            console.error("group is not found : " + name);
            return;
          }
          let groupNameList = ret.flexi[name];
          if(!groupNameList || !Array.isArray(groupNameList) || groupNameList.length == 0) return;
          PathCtr.loadState("FLEXI GROUP: " + group.id);
          
          group.flexi = [];
          PathCtr.loadState("  flexi:");
          groupNameList.forEach(name=> {
            let bone = pathContainer.getBone(name);
            if(!!bone) {
              group.flexi.push(bone.uid);
              PathCtr.loadState("    " + name);
            }
          });
        });
      }
      
      let amendBonePos =(id, actionID, frame, boneIDs)=> {
        if(boneIDs.includes(id)) return;
        boneIDs.push(id);
        
        let bone = pathContainer.groups[id];
        if(!bone.defState) return;
        
        let pathDiffList = bone.paths[0].pathDiffList;
        if(!pathDiffList.hasActionID(actionID)) return;
        
        let pathDiffListData = pathDiffList.data[actionID][frame];
        if(typeof pathDiffListData === "undefined") return;
        
        let pathDataList = bone.paths[0].getPathDataList(frame, actionID);
        
        let parentID = bone.parentID;
        if(typeof parentID !== "undefined") {
          let target = pathContainer.groups[parentID];
          amendBonePos(parentID, actionID, frame, boneIDs);
          if(bone.isParentPin) {
            let diffX = target.anchorX - target.defState.x0;
            let diffY = target.anchorY - target.defState.y0;
            pathDiffListData[0][0] -= diffX;
            pathDiffListData[0][1] -= diffY;
            pathDiffListData[1][0] -= diffX;
            pathDiffListData[1][1] -= diffY;
          } else {
            let diffX = target.x - target.defState.x1;
            let diffY = target.y - target.defState.y1;
            let data = [pathDataList[0].pos[0] - diffX, pathDataList[0].pos[1] - diffY, pathDataList[1].pos[0] - diffX, pathDataList[1].pos[1] - diffY];
            target.effectSprite.x = target.effectSprite.anchorX = data[0];
            target.effectSprite.y = target.effectSprite.anchorY = data[1];
            target.effectSprite.getMatrix().applyToArray(data);
            pathDiffListData[0][0] = data[0] - bone.defState.x0;
            pathDiffListData[0][1] = data[1] - bone.defState.y0;
            pathDiffListData[1][0] = data[2] - bone.defState.x1;
            pathDiffListData[1][1] = data[3] - bone.defState.y1;
          }
        }
      };
      
      pathContainer.actionList.forEach(action=> {
        let actionID = action.id;
        for(let frame = 1; frame < action.totalFrames; ++frame) {
          pathContainer.bones.forEach(id=> {
            let bone = pathContainer.groups[id];
            if(!bone.defState) return;
            
            let pathDiffList = bone.paths[0].pathDiffList;
            if(!pathDiffList.hasActionID(actionID)) {
              if(frame != 1) return;
            } else {
              let pathDiffListData = pathDiffList.data[actionID][frame];
              if(typeof pathDiffListData === "undefined") return;
            }
            
            let pathDataList = bone.paths[0].getPathDataList(frame, actionID);
            
            let x0 = bone.anchorX = pathDataList[0].pos[0];
            let y0 = bone.anchorY = pathDataList[0].pos[1];
            let x1 = bone.x = pathDataList[1].pos[0];
            let y1 = bone.y = pathDataList[1].pos[1];
            bone.effectSprite.rotation = bone.defState.angle - Math.atan2(y1 - y0, x1 - x0);
          });
          let boneIDs = [];
          pathContainer.bones.forEach(id=>amendBonePos(id, actionID, frame, boneIDs));
        }
      });
      
      pathContainer.bones.forEach(id=> {
        let bone = pathContainer.groups[id];
        bone.reset();
        if(!bone.defState) return;
        let pathDataList = bone.paths[0].getPathDataList(0, 0);
        let x0 = pathDataList[0].pos[0];
        let y0 = pathDataList[0].pos[1];
        let x1 = pathDataList[1].pos[0];
        let y1 = pathDataList[1].pos[1];
        let distX = x1 - x0;
        let distY = y1 - y0;
        bone.effectSprite.reset();
        bone.defState.x0 = x0;
        bone.defState.y0 = y0;
        bone.defState.x1 = x1;
        bone.defState.y1 = y1;
        bone.defState.distance = Math.sqrt(distX*distX + distY*distY);
        bone.defState.angle = Math.atan2(distY, distX);
      });
      
      PathCtr.loadState("bones JSON load complete.");
      PathCtr.loadState(pathContainer);
      PathWorker.postMessage({cmd: "main-bone-load-complete"});
    }
    request.open("GET", filePath, true);
    request.send();
  },
};
/**
 * DebugPath
 * Singleton
 */
var DebugPath = {
  isStop: false,
  isStep: false,
  isShowBones: false,
  
  bonePointSize: 2,
  boneLineSize: 2,
  boneColor: "rgb(0, 255, 0)",
  strengthPointColor: "rgba(0, 255, 0, 0.005)",
  strengthLineColor: "rgba(0, 255, 0, 0.2)",
  
  isShowPoints: false,
  pointSize: 2,
  pointColor: "rgb(255, 0, 0)",
  
  isShowControls: false,
  controlSize: 1,
  controlColor: "rgb(255, 255, 0)",
  
  actionIndex: 0,
  
  /**
   * @param {PathContainer} pathContainer
   */
  init: function(pathContainer) {
    /*
    if(!pathContainer) return;
    
    let bone = pathContainer.getGroup("bone1_clothes");
    if(!bone) return;
    bone.control = function(pathContainer) {
      if(typeof pathContainer.mouseX === "undefined") return;
      this.rotation = Math.atan2(pathContainer.mouseX - this.currentState.pos[0] - pathContainer.x, - pathContainer.mouseY + this.currentState.pos[1]);
    };
    */
  },
  
  /**
   * @param {PathContainer} pathContainer
   * @param {String} code - code when fired keyup event
   */
  keyUp: function(pathContainer, code) {
    let setAction =name=> {
      console.log(name);
      PathCtr.actionName = name;
    };
    switch(code) {
      case "Space":
        this.isStop = !this.isStop;
        console.log(this.isStop? "--STOP--":"--START--");
        break;
      case "ArrowRight":
        this.isStep = true;
        break;
      case "ArrowDown":
        this.actionIndex = (this.actionIndex + 1) % PathCtr.pathContainer.actionList.length;
        setAction(PathCtr.pathContainer.actionList[this.actionIndex].name);
        break;
      case "ArrowUp":
        if(--this.actionIndex < 0) this.actionIndex = PathCtr.pathContainer.actionList.length - 1;
        setAction(PathCtr.pathContainer.actionList[this.actionIndex].name);
        break;
      case "KeyD":
        PathCtr.isOutputDebugPrint = !PathCtr.isOutputDebugPrint;
        break;
      case "KeyL":
        PathCtr.isOutputLoadState = !PathCtr.isOutputLoadState;
        break;
      case "KeyB":
        this.isShowBones = !this.isShowBones;
        break;
      case "KeyC":
        this.isShowControls = !this.isShowControls;
        break;
      case "KeyP":
        this.isShowPoints = !this.isShowPoints;
        break;
      case "KeyO":
        postMessage({cmd: "main-confirm", callback: "output-path-container", message: "現在の状態をJSONに出力します"});
        break;
    }
  },
  
  isDebugDraw: function() {
    return this.isShowBones || this.isShowPoints || this.isShowControls;
  },
  
  outputJSON: function(pathContainer) {
    postMessage({
      cmd: "main-download",
      type: "application/json",
      fileName: "pathContainer.json",
      data: JSON.stringify(pathContainer, (key, val)=>{
        if(key.includes("result")) return undefined;
        if(key.includes("current")) return undefined;
        if(key.includes("past")) return undefined;
        if(key == "m") return undefined;
        return val;
      }, 2),
    });
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
    let setUint8  =val=> {dv.setUint8(sumLength, val); sumLength += 1};
    let setUint16 =val=> {dv.setUint16(sumLength, val); sumLength += 2};
    let setUint32 =val=> {dv.setUint32(sumLength, val); sumLength += 4};
    let setFloat32=val=> {dv.setFloat32(sumLength, val); sumLength += 4};
    let setPos    =val=> {dv.setInt16(sumLength, val*PathCtr.binDataPosRange); sumLength += 2};
    let setString =str=> {
      setUint8(str.length);
      [].map.call(str, c=>setUint16(c.charCodeAt(0)));
    };
    let setColor =str=> {
      if(str == "transparent") {
        setUint8(0);  // A
      } else {
        let colorArr = str.match(/(\\d+), (\\d+), (\\d+)/);
        setUint8(1);  // A
        setUint8(colorArr[1]);  // R
        setUint8(colorArr[2]);  // G
        setUint8(colorArr[3]);  // B
      }
    };
    let setArray =(arr, setLengFunc, setFunc)=> {
      if(!Array.isArray(arr)) {
        setLengFunc(0);
        return;
      }
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
    
    let setAction =(actionContainer, func)=> {
      if(actionContainer.hasAction) {
        setUint8(1);
        setArray(actionContainer.data, setUint8, frames=> {
          setArray(frames, setUint16, func);
        });
      } else {
        setUint8(0);
        func(actionContainer.data);
      }
    };
    
    let setPathData =pathDataList=> {
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
    
    let setPathDiff =pathDiff=> {
      setArray(pathDiff, setUint16, posArray=> {
        setArray(posArray, setUint16, setPos);
      });
    };
    
    let setPath =path=> {
      setUint16(path.maskIdToUse == null? 0 : path.maskIdToUse+1);
      setUint8(path.fillRule == "nonzero" ? 0 : 1);
      
      setPathData(path.defPathList);
      
      setAction(path.lineWidth, setFloat32);
      setAction(path.fillStyle, setColor);
      setAction(path.strokeStyle, setColor);
      setAction(path.pathDiffList, setPathDiff);
    };
    
    let setGroup =group=> {
      setString(group.id);
      setUint16(group.maskIdToUse == null? 0 : group.maskIdToUse+1);
      setArray(group.paths, setUint16, setPath);
      setArray(group.flexi, setUint8, setUint16);
      
      if(BoneObj.prototype.isPrototypeOf(group)) {
        setArray(group.childGroups, setUint8, setUint16);
        Object.keys(BinaryLoader.bonePropList).map(propName=> {
          if(!(propName in group)) return;
          setUint8(BinaryLoader.bonePropList[propName]);
          switch(propName) {
            case "parentID": setUint16(group.parentID); break;
            case "isParentPin": break;
            case "feedback": break;
            case "strength": setFloat32(group.strength); break;
            case "maxAngle": setFloat32(group.maxAngle / Math.PI * 180); break;
            case "minAngle": setFloat32(group.minAngle / Math.PI * 180); break;
            case "isSmartBone": break;
            case "smartBase": setFloat32(group.smartBase / Math.PI * 180); break;
            case "smartMax": setFloat32(group.smartMax / Math.PI * 180); break;
          };
        });
        setUint8(0);
        
        if(!!group.flexiPoint) {
          setUint8(1);
          setUint8(group.flexiPoint.dataIndex);
          setArray(group.flexiPoint.bones, setUint8, setUint16);
        } else {
          setUint8(0);
        }
      } else {
        setAction(group.childGroups, childGroups=> {
          setArray(childGroups, setUint8, setUint16);
        });
      }
    };
    
    
    // -- storage processing --
    
    setUint16(pathContainer.originalWidth);
    setUint16(pathContainer.originalHeight);
    
    setUint8(pathContainer.actionList.length);
    pathContainer.actionList.forEach(action=> {
      setString(action.name);
      setUint8(action.id);
      setUint16(action.totalFrames);
      if("smartBoneID" in action) {
        setUint8(1);
        setUint16(action.smartBoneID);
      } else {
        setUint8(0);
      }
    });
    
    setArray(pathContainer.rootGroups, setUint8, setUint16);
    
    let groupsNum = pathContainer.groups.length;
    setUint16(groupsNum);
    pathContainer.groups.forEach(group=>{
      PathCtr.loadState("count : " + groupsNum--);
      setGroup(group);
    });
    
    dv = null;
    return buffer.slice(0, sumLength);
  },
  
  /**
   * @param {PathContainer} pathContainer
   */
  outputBin: function(pathContainer) {
    if(!pathContainer) return;
    let data = this.toBin(PathCtr.pathContainer);
    postMessage({
      cmd: "main-download",
      type: "octet/stream",
      fileName: "path_data.bin",
      data: data,
    }, [data]);
  },
};
` 

/**
 * PathMain
 * Singleton
 */
var PathMain = {
  defaultBoneName: "bone",
  isUseMin: false,
  
  worker: null,
  useWorker: false,
  
  path: null,
  canvas: null,
  subCanvas: null,
  completeFunc: null,
  
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
        case "main-bone-load-complete":
          PathMain.completeFunc();
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
    
    window.addEventListener("mousemove", function(e) {
      PathMain.postMessage({
        cmd: "move-mouse", 
        x: e.clientX,
        y: e.clientY,
      });
      e.preventDefault();
    }, { passive: false });
    
    window.addEventListener("touchmove", function(e) {
      PathMain.postMessage({
        cmd: "move-mouse", 
        x: e.touches[0].pageX,
        y: e.touches[0].pageY,
      });
      e.preventDefault();
    }, { passive: false });
    
    window.addEventListener("keyup", function(e) {
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
    
    if(!!PathMain.path) {
      PathMain.postMessage({cmd: "load-bin", path: PathMain.path});
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
    console.log(a);
    
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
   * @param {String} path - file path info
   * @param {Function} completeFunc - callback when loading complete
   */
  loadBone: function(path, completeFunc) {
    PathMain.completeFunc = completeFunc;
    //console.log(new URL(path, window.location.href).href);
    PathMain.postMessage({cmd: "load-bone", path: new URL(path, window.location.href).href});
  },
  
  /**
   * @param {String} path - file path info
   * @param {Function} completeFunc - callback when loading complete
   * @param {String} jsPath - file path to webworker
   * @param {Boolean} isDebug - use debug mode when true
   */
  init: function(path, completeFunc = null, jsPath = null, isDebug = false) {
    let container = document.getElementById("path-container");
    if(!container) {
      console.error("CanvasContainer is not found.");
      return;
    }
    
    if(!!path) {
      PathMain.path = new URL(path, window.location.href).href;
    }
    
    PathMain.completeFunc = completeFunc;
    
    let currentPath = document.currentScript.src;
    let blob = new Blob([path_control], {type: "text/javascript"});
    let filePath = window.URL.createObjectURL(blob);
    
    let canvas = PathMain.canvas = document.createElement("canvas");
    canvas.className = "main-canvas";
    container.appendChild(canvas);
    
    let subCanvas = PathMain.subCanvas = document.createElement("canvas");
    subCanvas.className = "sub-canvas";
    subCanvas.setAttribute("style", "display:none;");
    container.appendChild(subCanvas);
    
    PathMain.useWorker = !!Worker && !!canvas.transferControlToOffscreen;
    
    if(PathMain.useWorker) {
      PathMain.worker = new Worker(filePath);
      PathMain.initWorker();
      if(!!jsPath) {
        PathMain.postMessage({
          cmd: "set-control",
          path: new URL(jsPath, window.location.href).href,
        });
      }
    } else {
      console.log("this browser is not supported");
      PathMain.worker = window;
      
      let mainScript = document.createElement("script");
      mainScript.src = filePath;
      document.body.appendChild(mainScript);
      
      if(!!jsPath) {
        let subScript = document.createElement("script");
        subScript.src = jsPath;
        document.body.appendChild(subScript);
      }
    }
  },
};
