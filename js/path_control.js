
/**
 * PathCtr
 * Static Class
 */
class PathCtr {
  static isOutputDebugPrint = false;
  static debugPrint() {
    if(!PathCtr.isOutputDebugPrint) return;
    //console.log("Func : " + PathCtr.debugPrint.caller.name);
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  };
  
  static isOutputLoadState = true;
  static loadState() {
    if(!PathCtr.isOutputLoadState) return;
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  };
  
  static defaultCanvasContainerID = "path-container";  // default canvas container element name
  static defaultActionName = "base";
  static initTarget = null;  // instance to be initialized
  static binDataPosRange = 20000; // correction value of coordinates when saving to binary data
  
  static pathContainer = null;
  static canvas = null;
  static context = null;
  static viewWidth = 0;
  static viewHeight = 0;
  
  static fixFrameTime = 1 / 24;
  static frameNumber = 0;
  static prevTimestamp = 0;
  static average = 0;
  static updateEvent = new Event("update");
  
  static requestAnimationIDs = [];
  static setTimeoutIDs = [];
  
  static cancelRequestAnimation() {
    if(PathCtr.requestAnimationIDs.length > 1 || PathCtr.setTimeoutIDs.length > 1) {
      PathCtr.debugPrint("requestAnimationIDs:" + PathCtr.requestAnimationIDs.length + ", " + PathCtr.setTimeoutIDs.length);
    }
    PathCtr.requestAnimationIDs.forEach(cancelAnimationFrame);
    PathCtr.requestAnimationIDs.length = 0;
    PathCtr.setTimeoutIDs.forEach(clearTimeout);
    PathCtr.setTimeoutIDs.length = 0;
  };
  
  /**
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  static setSize(viewWidth, viewHeight) {
    PathCtr.canvas.width = PathCtr.viewWidth = viewWidth;
    PathCtr.canvas.height = PathCtr.viewHeight = viewHeight;
    if(!!PathCtr.pathContainer) PathCtr.pathContainer.setSize(viewWidth, viewHeight);
    PathCtr.update();
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  static loadComplete(pathContainer) {
    PathCtr.pathContainer = PathCtr.initTarget;
    PathCtr.pathContainer.context = PathCtr.context;
    PathCtr.setSize(PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.initTarget = null;
  };
  
  static draw(timestamp) {
    if(typeof DebugPath !== "undefined" && DebugPath.isStop) {
      if(!DebugPath.isStep) return;
      DebugPath.isStep = false;
      console.log("--STEP--");
    }
    
    if(typeof timestamp === "undefined") return;
    
    let elapsed = (timestamp - PathCtr.prevTimestamp) / 1000;
    PathCtr.average = (PathCtr.average + elapsed) / 2;
    PathCtr.debugPrint((PathCtr.average * 100000)^0);
    
    if(!PathCtr.pathContainer) return;
    
    PathCtr.context.clearRect(0, 0, PathCtr.viewWidth, PathCtr.viewHeight);
    PathCtr.pathContainer.draw();
    
    let frameTime = 1 / 24;
    let totalFrames = 260;
    
    if(timestamp - PathCtr.prevTimestamp < frameTime*500) return;
    
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
    
    dispatchEvent(PathCtr.updateEvent);
  };
  
  static update() {
    PathCtr.cancelRequestAnimation();
    PathCtr.requestAnimationIDs.push(requestAnimationFrame(PathCtr.draw));
    PathCtr.setTimeoutIDs.push(setTimeout(PathCtr.update, PathCtr.fixFrameTime*1000));
  };
  
  /**
   * @param {offscreenCanvas} canvas
   * @param {Number} viewWidth
   * @param {Number} viewHeight
   */
  static init(canvas, viewWidth, viewHeight) {
    if(!canvas) {
      console.error("canvas is not found.");
      return;
    }
    
    PathCtr.canvas = canvas;
    PathCtr.context = canvas.getContext("2d");
    if(!PathCtr.context) {
      console.error("context is not found.");
      return;
    }
    
    canvas.width = PathCtr.viewWidth = viewWidth;
    canvas.height = PathCtr.viewHeight = viewHeight;
    
    addEventListener("update", function(e) {
      PathCtr.pathContainer.update(PathCtr.frameNumber, "walk");
    });
    
    PathCtr.setTimeoutIDs.push(setTimeout(PathCtr.update, PathCtr.fixFrameTime*1000));
  };
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
      if(targetData != undefined) return targetData;
    }
    return undefined;
  };
  
  update(pathContainer, actionID = 0, frame = 0) {
    if(!this.hasAction) return;
    
    if(!this.hasActionID(actionID)) {
      actionID = 0;
      frame = 0;
    }
    
    let data = this.getData(actionID, frame);
    
    this.data.forEach((actionDataList, targetActionID)=> {
      let action = pathContainer.actionList[targetActionID];
      let pastFrame = action.pastFrame;
      let currentFrame = action.currentFrame;
      
      if(pastFrame == currentFrame) return;
      
      if(pastFrame <= currentFrame) {
        for(let targetFrame = Math.min(currentFrame, actionDataList.length-1); targetFrame >= pastFrame; --targetFrame) {
          let targetData = actionDataList[targetFrame];
          if(targetData == undefined) continue;
          data = targetData;
          break;
        }
      } else {
        for(let targetFrame = Math.min(pastFrame, actionDataList.length-1); targetFrame >= currentFrame; --targetFrame) {
          let targetData = actionDataList[targetFrame];
          if(targetData == undefined) continue;
          
          for(let targetFrame = Math.min(currentFrame, actionDataList.length-1); targetFrame >= 0; --targetFrame) {
            let targetData = actionDataList[targetFrame];
            if(targetData == undefined) continue;
            data = targetData;
            break;
          }
          break;
        }
      }
    });
    
    if(!!data) {
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
      pathDataList = this.defPathList.slice();
    } else if(this.defPathList.length != pathDataList.length) {
      console.error("The number of paths does not match.");
      console.log(this.defPathList);
      console.log(pathDataList);
      pathDataList = this.defPathList.slice();
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
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getPathDataList(frame = 0, actionID = 0) {
    let ret = [];
    
    let makeData =(pathDiffList)=> {
      this.defPathList.forEach((d, i)=>{
        ret.push({
          type: d.type,
          pos: (!d.pos)? undefined : d.pos.map((val, j)=>val+pathDiffList[i][j]),
        });
      });
      return ret;
    }
    
    return makeData(this.pathDiffList.getAvailableData(actionID, frame));
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
      this.defPathList.forEach((d, i)=>{
        ret.push({
          type: d.type,
          pos: (!d.pos)? undefined : d.pos.map((val, j)=>val+pathDiffList[i][j]),
        });
      });
      return ret;
    }
    
    if(!this.pathDiffList.hasAction) {
      return makeData(this.pathDiffList.getData());
    }
    
    if(!this.pathDiffList.hasActionID(actionID)) {
      actionID = 0;
      frame = 0;
    }
    
    let pathDataList = makeData(this.pathDiffList.getAvailableData(actionID, frame));
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
    
    this.paths.forEach(path=>{
      path.update(frame, actionID, pathContainer, groupMatrix);
    });
    
    let childGroups = this.childGroups.update(pathContainer, actionID, frame);
    
    this.childGroups.result.forEach(childGroup=>{
      pathContainer.groups[childGroup].update(pathContainer, groupSprite, flexi);
    });
    
    if(flexi.length > 0) {
      this.paths.forEach(path=>{
        path.resultPathList.forEach(d=>{
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
    
    this.parentID = -1;                // parent bone id
    this.isParentPin = false;          // parent bone is pin bone
    this.feedback = false;             // receive feedback from other bones
    this.strength = 0;                 // scope of influence of bone
    this.effectSprite = new Sprite();  // actual effect sprite
    this.isReady = false;              // can be used for calculation
    
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
 * Static Class
 */
class BinaryLoader {
  /**
   * @param {ArrayBuffer} buffer
   * @return {PathContainer}
   */
  static init(buffer) {
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
      let fillRule = (getUint8() == 0 ? "nonzero" : "evenodd");
      
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
      
      if(name.startsWith(PathCtr.defaultBoneName)) {
        return new BoneObj(
          i,
          name,
          paths,
          getArray(getUint8, getUint16)
        );
      } else {
        return new GroupObj(
          i,
          name,
          paths,
          getAction(()=>getArray(getUint8, getUint16)),
          maskIdToUse
        );
      }
    };
    
    
    // --acquisition processing--
    
    let pathContainer = PathCtr.initTarget = new PathContainer(getUint16(), getUint16());
    
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
    
    return pathContainer;
  };
  
  /**
   * @param {String} filePath - binary file path
   * @param {Function} completeFunc - callback when loading complete
   */
  static load(filePath, completeFunc = null) {
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
  };
};


/**
 * BoneLoader
 * Static Class
 */
class BoneLoader {
  /**
   * @param {String} filePath - binary file path
   */
  static load(filePath, pathContainer) {
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
  };
};

/**
 * PathWorker
 * Worker events
 */
addEventListener("message", function(e) {
  let data = e.data;
  switch (data.cmd) {
    case "init":
      PathCtr.defaultBoneName = data.defaultBoneName;
      PathCtr.init(data.canvas, data.viewWidth, data.viewHeight);
      break;
      
    case "load-bin":
      BinaryLoader.load(data.path, ()=>{
        postMessage({cmd: "init-complete"});
      });
      break;
      
    case "load-bone":
      BoneLoader.load(data.path, PathCtr.pathContainer);
      break;
      
    case "resize-canvas":
      PathCtr.setSize(data.viewWidth, data.viewHeight);
      break;
      
    case "move-mouse":
      if(typeof DebugPath !== "undefined") {
        DebugPath.moveMouse(PathCtr.pathContainer, data.x, data.y);
      }
      break;
      
    case "keyup":
      if(typeof DebugPath !== "undefined") {
        DebugPath.keyUp(PathCtr.pathContainer, data.code);
      }
      break;
      
      
    case "output-path-container":
      DebugPath.outputJSON(PathCtr.pathContainer);
      break;
      
    case "output-bin":
      DebugPath.outputBin(PathCtr.pathContainer);
      break;
      
      
    case "create-path-container":
      PathCtr.loadState("init path container");
      PathCtr.initTarget = new PathContainer(data.width, data.height);
      break;
      
    case "add-action":
      PathCtr.loadState("load action: " + data.actionName + " - " + data.totalFrames);
      PathCtr.initTarget.addAction(data.actionName, data.frame, data.totalFrames);
      break;
      
    case "add-root-group":
      PathCtr.initTarget.rootGroups.push(data.id);
      break;
      
    case "new-group":
      PathCtr.initTarget.groups[data.uid] = new GroupObj(
        data.uid,
        data.name,
        [],
        [],
        data.maskID
      );
      break;
      
    case "new-bone":
      PathCtr.initTarget.groups[data.uid] = new BoneObj(
        data.uid,
        data.name,
        [],
        []
      );
      PathCtr.initTarget.bones.push(data.uid);
      break;
      
    case "add-group-action":
      if(!PathCtr.initTarget.bones.includes(data.uid)) {
        PathCtr.initTarget.groups[data.uid].addAction(
          data.childGroups,
          data.frame,
          PathCtr.initTarget.getAction(data.actionName).id
        );
      }
      break;
      
    case "set-child-group-id":
      if(PathCtr.initTarget.bones.includes(data.uid)) {
        PathCtr.initTarget.groups[data.uid].childGroups = data.childGroups;
      } else {
        PathCtr.initTarget.groups[data.uid].childGroups.setData(data.childGroups);
      }
      break;
      
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
      break;
      
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
      break;
      
    case "add-path-action":
      PathCtr.initTarget.groups[data.uid].paths[data.pathID].addAction(
        data.pathDataList,
        data.fillStyle,
        data.lineWidth,
        data.strokeStyle,
        data.frame,
        PathCtr.initTarget.getAction(data.actionName).id
      );
      break;
      
    case "add-bone-path-action":
      PathCtr.initTarget.groups[data.uid].paths[data.pathID].addAction(
        data.pathDataList,
        "transparent",
        2,
        "rgb(0, 255, 0)",
        data.frame,
        PathCtr.initTarget.getAction(data.actionName).id
      );
      break;
      
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
      break;
      
    case "load-complete":
      PathCtr.loadComplete();
      postMessage({cmd: "init-complete"});
      break;
      
      
    default:
      console.error("unknown command: " + data.cmd);
      break;
  };
}, false);
