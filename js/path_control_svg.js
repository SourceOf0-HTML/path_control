
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
  currentFrame: 0,
  currentActionID: -1,
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
      if(!canvas.parentNode) {
        this.cancelRequestAnimation();
        return;
      }
      
      if(typeof(timestamp) == "undefined") return;
      
      let elapsed = (timestamp - prevTimestamp) / 1000;
      //this.debugPrint(elapsed, average, fixFrameTime);
      average = (average + elapsed) / 2;
      prevTimestamp = timestamp;
      
      if(!this.pathContainer) return;
      
      canvas.width = subCanvas.width = this.viewWidth;
      canvas.height = subCanvas.height = this.viewHeight;
      
      this.pathContainer.update(frameNumber);
      
      this.subContext.clearRect(0, 0, this.viewWidth, this.viewHeight);
      this.pathContainer.draw();
      frameNumber = (frameNumber + 1) % totalFrames;
      
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
   * @param {Number} x
   * @param {Number} y
   * @param {Number} ratioX
   * @param {Number} ratioY
   * @return {{x: Number, y: Number}}
   */
  applyToPoint(x, y, ratioX = 1, ratioY = ratioX) {
    return {
      x: (x * this.a + y * this.c + this.e) * ratioX,
      y: (x * this.b + y * this.d + this.f) * ratioY
    };
  };
  
  /**
   * @param {Array} points
   * @return {Array}
   */
  applyToArray(points, ratioX = 1, ratioY = ratioX) {
    let ret = [];
    let pointsNum = points.length;
    for(let i = 0; i < pointsNum; ) {
      let p = this.applyToPoint(points[i++], points[i++]);
      ret.push(p.x * ratioX, p.y * ratioY);
    }
    return ret;
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
  
  get matrix() {
    let sx = this.scaleX;
    let sy = this.scaleY;
    let r = this.rotation;
    return this.m.reset().translate(this.x, this.y).rotate(r).scale(sx, sy).translate(-this.anchorX, -this.anchorY);
  };
};


class PathObj {
  constructor(pathDataList, maskIdToUse, fillRule, fillStyle, lineWidth, strokeStyle) {
    this.maskIdToUse = maskIdToUse;    // ID of the mask to use
    this.pathDataList = pathDataList;  // path data array
    this.fillRule = fillRule;          // "nonzero" or "evenodd"
    this.fillStyle = fillStyle;        // fillColor ( context2D.fillStyle )
    this.lineWidth = lineWidth;        // strokeWidth ( context2D.lineWidth )
    this.strokeStyle = strokeStyle;    // strokeColor ( context2D.strokeStyle )
    this.hasActionList = [];           // if true, have action
    this.resultPath = {};              // path data for drawing
  };
  
  addAction(pathDataList, fillRule, fillStyle, lineWidth, strokeStyle, frame, actionID) {
    if( this.hasActionList.length == 0 ) {
      // init action data
      this.pathDataList = [[this.pathDataList]];  // path data array
      this.fillStyle = [[this.fillStyle]];        // fillColor ( context2D.fillStyle )
      this.lineWidth = [[this.lineWidth]];        // strokeWidth ( context2D.lineWidth )
      this.strokeStyle = [[this.strokeStyle]];    // strokeColor ( context2D.strokeStyle )
    }
    if( !this.hasActionList[actionID] ) {
      this.pathDataList[actionID] = [this.pathDataList[0][0]];
      this.fillStyle[actionID] = [this.fillStyle[0][0]];
      this.lineWidth[actionID] = [this.lineWidth[0][0]];
      this.strokeStyle[actionID] = [this.strokeStyle[0][0]];
      this.hasActionList[actionID] = true;
    }
    this.pathDataList[actionID][frame] = pathDataList;
    this.fillStyle[actionID][frame] = fillStyle;
    this.lineWidth[actionID][frame] = lineWidth;
    this.strokeStyle[actionID][frame] = strokeStyle;
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - pathDataList
   */
  getPathDataList(frame = 0, actionID = 0) {
    if( this.hasActionList.length == 0 ) {
      return this.pathDataList;
    }
    if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    return this.pathDataList[actionID][Math.min(frame, this.pathDataList[actionID].length)];
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   */
  update(frame, actionID, pathContainer, matrix) {
    let updatePath =d=> {
      switch(d.type) {
        case "M":
          this.resultPath.pathData.push({type:"M", pos:matrix.applyToArray(d.pos)});
          break;
        case "L":
          this.resultPath.pathData.push({type:"L", pos:matrix.applyToArray(d.pos)});
          break;
        case "C":
          this.resultPath.pathData.push({type:"C", pos:matrix.applyToArray(d.pos)});
          break;
        case "Z":
          this.resultPath.pathData.push({type:"Z"});
          break;
        default:
          console.error("unknown type");
          break;
      }
    };
    
    this.resultPath = {
      pathData: []
    };
    
    if( this.hasActionList.length == 0) {
      this.pathDataList.forEach(updatePath);
      this.resultPath.lineWidth = this.lineWidth;
      this.resultPath.strokeStyle = this.strokeStyle;
      this.resultPath.fillStyle = this.fillStyle;
      return;
    } else if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    
    this.pathDataList[actionID][Math.min(frame, this.pathDataList[actionID].length)].forEach(updatePath);
    this.resultPath.lineWidth = this.lineWidth[actionID][Math.min(frame, this.lineWidth[actionID].length)];
    this.resultPath.strokeStyle = this.strokeStyle[actionID][Math.min(frame, this.strokeStyle[actionID].length)];
    this.resultPath.fillStyle = this.fillStyle[actionID][Math.min(frame, this.fillStyle[actionID].length)];
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, path2D, isMask) {
    this.resultPath.pathData.forEach(d=>{
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
};


class GroupObj extends Sprite {
  constructor(id, paths, childGroups, hasAction, maskIdToUse) {
    super();
    this.visible = true;              // display when true
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.hasActionList = [];          // if true, have action
    
    if(hasAction) {
      this.childGroups.forEach((val, i)=>(this.hasActionList[i] = true));
    }
  };
  
  addAction(childGroups, frame, actionID) {
    if( childGroups.length == 0 ) return;
    if( this.hasActionList.length == 0 ) {
      if( JSON.stringify(childGroups) == JSON.stringify(this.childGroups) ) return;
      
      // init action data
      this.childGroups = [[this.childGroups]];   // list of group id
      this.hasActionList[0] = true;
    }
    if( !this.hasActionList[actionID] ) {
      this.childGroups[actionID] = [this.childGroups[0][0].concat()];
      this.hasActionList[actionID] = true;
    }
    this.childGroups[actionID][frame] = childGroups;
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - group id array
   */
  getChildGroups(frame, actionID) {
    if( this.childGroups.length == 0 ) return this.childGroups;
    if( this.hasActionList.length == 0 ) {
      return this.childGroups;
    }
    if( this.childGroups[actionID] == null || this.childGroups[actionID][frame] == null ) {
      return this.childGroups[0][0];
    }
    return this.childGroups[actionID][frame];
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
  update(pathContainer, sprite) {
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    let groupSprite = sprite.compSprite(this);
    this.paths.forEach(path=>{
      path.update(frame, actionID, pathContainer, groupSprite.matrix);
    });
    this.getChildGroups(frame, actionID).forEach(childGroup=>{
      pathContainer.groups[childGroup].update(pathContainer, groupSprite);
    });
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, isMask) {
    if(!context) {
      console.error("context is not found");
      return;
    }
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
    
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    this.getChildGroups(frame, actionID).forEach(childGroup=>{
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
};


class BoneObj extends GroupObj {
  constructor(id, paths, childGroups, hasAction) {
    super(id, paths, childGroups, hasAction, "");
    this.parentID = -1;
    this.flexi = [];
    this.feedback = false;
    this.strength = 0;
    this.effectState = new Sprite();
    
    if(!!paths && paths.length > 0) {
      let pathDataList = paths[0].getPathDataList();
      let x0 = pathDataList[0].pos[0];
      let y0 = pathDataList[0].pos[1];
      let x1 = pathDataList[1].pos[0];
      let y1 = pathDataList[1].pos[1];
      this.defState = {
        x0, y0,
        x1, y1,
        angle: Math.atan2(y1-y0, x1-x0),
      };
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Object} data - data to set
   */
  setJSONData(pathContainer, data) {
    if(!pathContainer || !data) return;
    PathCtr.loadState("BONE:" + this.id);
    
    if("parent" in data && data.parent in pathContainer.groupNameToIDList) {
      this.parentID = pathContainer.groupNameToIDList[data.parent];
      PathCtr.loadState("parentID:" + this.parentID);
    }
    
    this.flexi.length = 0;
    if("flexi" in data && Array.isArray(data.flexi)) {
      data.flexi.forEach(name=> {
        if(name in pathContainer.groupNameToIDList) {
          this.flexi.push(pathContainer.groupNameToIDList[name]);
        }
      });
      PathCtr.loadState("flexi:" + this.flexi.toString());
    }
    
    if("feedback" in data && (typeof data.feedback === "boolean")) {
      this.feedback = data.feedback;
      PathCtr.loadState("feedback:" + this.feedback);
    }
    
    if("strength" in data && Number.isFinite(data.strength)) {
      this.strength = data.strength;
      PathCtr.loadState("strength:" + this.strength);
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  preprocessing(pathContainer) {
    this.reset();
    
    if(!this.defState) return;
    
    let pathDataList = this.paths[0].getPathDataList(PathCtr.currentFrame, PathCtr.currentActionID);
    if(pathDataList.length == 2) {
      let defX = this.defState.x;
      let defY = this.defState.y;
      let x0 = pathDataList[0].pos[0];
      let y0 = pathDataList[0].pos[1];
      let x1 = pathDataList[1].pos[0];
      let y1 = pathDataList[1].pos[1];
      this.effectState.x = x0;
      this.effectState.y = y0;
      this.effectState.anchorX = this.defState.x0;
      this.effectState.anchorY = this.defState.y0;
      this.effectState.rotation = Math.atan2(y1-y0, x1-x0) - this.defState.angle;
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  calc(pathContainer) {
    if(!this.defState) return;
    
    if(this.parentID >= 0) {
      let group = pathContainer.groups[this.parentID];
      this.addSprite(group.effectState);
    }
    
    this.flexi.forEach(id=>{
      let group = pathContainer.groups[id];
      group.addSprite(this.effectState);
    });
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   */
  draw(pathContainer, context) {
    if(!context) {
      console.error("context is not found");
      return;
    }
    if(typeof DebugPath === "undefined" || !DebugPath.isShowBones || !this.visible) {
      return;
    }
    
    this.paths.forEach(path=>{
      let path2D = new Path2D();
      let pos = path.resultPath.pathData[0].pos;
      let ratio = pathContainer.pathRatio;
      path2D.arc(pos[0]*ratio, pos[1]*ratio, 2, 0, Math.PI*2);
      path.draw(pathContainer, context, path2D, false);
      path2D = null;
    });
    
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    this.getChildGroups(frame, actionID).forEach(childGroup=>{
      pathContainer.groups[childGroup].draw(pathContainer, context, false);
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
    this.groupNameToIDList = {};  // list of group name and group ID
    this.masks = {};              // list of mask name and group ID
    this.bones = [];              // list of bone ID
    this.actionList = null;       // action info list
  };
  
  /**
   * @param {String} name
   * @return {GroupObj}
   */
  getGroup(name) {
    return this.groups[this.groupNameToIDList[name]];
  };
  
  /**
   * @param {String} name
   * @return {BoneObj}
   */
  getBone(name) {
    let id = this.groupNameToIDList[name];
    if(this.bones.includes(id)) {
      return this.groups[id];
    }
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
    
    PathCtr.currentFrame = frame;
    PathCtr.currentActionID = Object.keys(this.actionList).indexOf(actionName);
    
    this.groups.forEach(group=>{
      group.preprocessing(this);
    });
    this.bones.forEach(id=>{
      this.groups[id].calc(this);
    });
    this.rootGroups.forEach(id=>{
      this.groups[id].update(this, (new Sprite().setSprite(this)), false);
    });
  };
  
  draw() {
    if(!this.visible || !this.rootGroups) {
      return;
    }
    
    this.rootGroups.forEach(id=>{
      this.groups[id].draw(this, this.context, false);
    });
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
      let ret = [];
      let num = lengFunc();
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
    
    let getPath=()=>{
      let maskIdToUse = getUint16();
      let fillRule = (getUint8() == 0 ? "nonzero" : "evenodd");
      
      let hasAction = getUint8();
      if(!hasAction) {
        let lineWidth = getFloat32();
        let fillStyle = getColor();
        let strokeStyle = getColor();
        let pathDataList = getPathData();
        return new PathObj(
          pathDataList,
          maskIdToUse,
          fillRule,
          fillStyle,
          lineWidth,
          strokeStyle,
        );
      }
      
      let lineWidth = getAction(getFloat32);
      let fillStyle = getAction(getColor);
      let strokeStyle = getAction(getColor);
      let pathDataList = getAction(getPathData);
      
      let pathObj = new PathObj(
        pathDataList,
        maskIdToUse,
        fillRule,
        fillStyle,
        lineWidth,
        strokeStyle,
      );
      pathObj.lineWidth.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.fillStyle.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.strokeStyle.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.pathDataList.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      return pathObj;
    };
    
    let getGroup=i=>{
      let name = getString();
      pathContainer.groupNameToIDList[name] = i;
      
      let maskIdToUse = getUint16();
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
          name,
          paths,
          childGroups,
          hasAction
        );
      } else {
        return new GroupObj(
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
      pathContainer.actionList = {};
      for(let i = 0; i < actionListNum; ++i) {
        pathContainer.actionList[getString()] = {
          id : getUint8(),
          totalFrames : getUint16(),
        };
      }
    }
    
    pathContainer.rootGroups = getArray(getUint8, getUint16);
    
    let groupsNum = getUint16();
    for(let i = 0; i < groupsNum; ++i) {
      PathCtr.debugPrint("count : " + i);
      PathCtr.debugPrint(i);
      PathCtr.debugPrint(sumLength);
      pathContainer.groups[i] = getGroup(i);
      if(BoneObj.prototype.isPrototypeOf(pathContainer.groups[i])) {
        pathContainer.bones.push(i);
      }
      PathCtr.debugPrint(pathContainer.groups[i]);
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
 * SVGLoader
 * Singleton
 */
var SVGLoader = {
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
    return new PathObj(
      this.makePathDataList(pathDOM.getAttribute("d")),
      this.getMaskId(pathDOM.getAttribute("mask")),
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
    let fillRule = (!pathDOM)? "nonzero" : style.fillRule;
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
    } else {
      pathDataList = path.pathDataList[0][0].concat();
    }
    
    path.addAction(
      pathDataList,
      fillRule,
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
    return new PathObj(
      this.makeBonePathDataList(pathDOM.getAttribute("d")),
      this.getMaskId(pathDOM.getAttribute("mask")),
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
    } else {
      pathDataList = path.pathDataList[0][0].concat();
    }
    
    path.addAction(
      pathDataList,
      "nonzero",
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
    
    children.forEach(child=>{
      let tagName = child.tagName;
      PathCtr.debugPrint("make group : " + name + " : " + tagName);
      switch(tagName) {
        case "path":
          if(isBone) {
            paths.push( this.makeBonePath(child) );
          } else {
            paths.push( this.makePath(child, window.getComputedStyle(child)) );
          }
          break;
        case "mask":
          // do nothing.
          break;
        case "clipPath":
          // TODO
          break;
        case "g":
          childGroups.push(PathCtr.initTarget.groupNameToIDList[child.getAttribute("id")]);
          this.makeGroup(child);
          break;
        default:
          console.error("unknown element");
          console.log(child);
          break;
      }
    });
    
    let ret;
    if(isBone) {
      ret = new BoneObj(
        name,
        paths,
        childGroups,
        false,
      );
      PathCtr.initTarget.bones.push(PathCtr.initTarget.groupNameToIDList[name]);
    } else {
      ret = new GroupObj(
        name,
        paths,
        childGroups,
        false,
        this.getMaskId(groupDOM.getAttribute("mask"))
      );
    }
    
    PathCtr.initTarget.groups[PathCtr.initTarget.groupNameToIDList[name]] = ret;
    
    return ret;
  },
  
  /**
   * @param {HTMLElement} groupDOM - group element
   * @param {String} name - group name
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   */
  addActionGroup: function(groupDOM, name, frame, actionID) {
    let id = PathCtr.initTarget.groupNameToIDList[name];
    let targetGroup = PathCtr.initTarget.groups[id];
    let childGroups = [];
    let dataIndex = 0;
    let isBone = PathCtr.initTarget.bones.includes(id);
    
    if(!!groupDOM) {
      let children = Array.prototype.slice.call(groupDOM.children);
      children.forEach(child=>{
        let name = child.tagName;
        switch(name) {
          case "path":
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
            childGroups.push(PathCtr.initTarget.groupNameToIDList[child.getAttribute("id")]);
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
      if(pathContainer.groupNameToIDList[name] != null) {
        console.error("group ID is duplicated : " + name);
        return;
      }
      pathContainer.groupNameToIDList[name] = Object.keys(pathContainer.groupNameToIDList).length;
    });
    
    let masks = Array.prototype.slice.call(groupsDOM.getElementsByTagName("mask"));
    masks.forEach(mask=>{
      let maskChildren = Array.prototype.slice.call(mask.children);
      maskChildren.forEach(child=>{
        if( child.tagName == "use" ) {
          pathContainer.masks[mask.getAttribute("id")] = pathContainer.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
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
      pathContainer.rootGroups.push(pathContainer.groupNameToIDList[group.id]);
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
        if(pathContainer.groupNameToIDList[id] != null) return;
        pathContainer.groupNameToIDList[id] = Object.keys(pathContainer.groupNameToIDList).length;
        this.makeGroup(targetDom.getElementById(id));
      });
      let masks = Array.prototype.slice.call(targetDom.getElementsByTagName("mask"));
      masks.forEach(mask=>{
        let maskID = mask.getAttribute("id");
        if(pathContainer.masks[maskID]) return;
        let maskChildren = Array.prototype.slice.call(mask.children);
        maskChildren.forEach(child=>{
          if( child.tagName == "use" ) {
            pathContainer.masks[maskID] = pathContainer.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
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
      Object.keys(pathContainer.groupNameToIDList).forEach(name=>{
        let base = baseDom.getElementById(name);
        if( !base || !targetDom || !base.isEqualNode(targetDom.getElementById(name)) ) {
          actionGroup[name] = true;
        }
      });
    });
    
    groupsDOMArr.forEach((targetDom, frame)=>{
      if(frame == 0) return;
      PathCtr.loadState("add action : " + actionID + " - " + frame);
      Object.keys(actionGroup).forEach(key=>{
        this.addActionGroup(targetDom.getElementById(key), key, frame, actionID);
      });
    });
    
    PathCtr.initTarget = null;
  },
  
  /**
   * @param {Array} fileInfoList - [ [ filePath, totalFrames, actionName ], ... ]
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(fileInfoList, completeFunc = null) {
    if(!fileInfoList || !Array.isArray(fileInfoList) || !Array.isArray(fileInfoList[0])) {
      console.error("fileInfoList format is woring");
      console.log(fileInfoList);
      return;
    }
    if(fileInfoList[0][2] != PathCtr.defaultActionName) {
      console.error("action name \"" + PathCtr.defaultActionName + "\" is missing in fileInfoList");
      return;
    }
    
    let pathContainer = null;
    let fileIndex = 0;
    let domList = [];
    let getFrameNum=i=>("00000".substr(0, 5 - i.toString().length) + i + ".svg");
    
    let loadFile=fileInfo=>{
      let filePath = fileInfo[0];
      let totalFrames = fileInfo[1];
      let actionName = fileInfo[2];
      
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
          PathCtr.loadState("load file : " + loadFrame);
          request = new XMLHttpRequest();
          request.open("GET", filePath + getFrameNum(loadFrame++), true);
          request.onreadystatechange = loadSVG;
          request.send();
          return;
        }
        
        if(!pathContainer) {
          pathContainer = SVGLoader.init(domList[0]);
          pathContainer.actionList = {};
        }
        
        let actionID = Object.keys(pathContainer.actionList).length;
        
        pathContainer.actionList[actionName] = {
          id : actionID,
          totalFrames : totalFrames,
        };
        
        SVGLoader.addActionFromList(pathContainer, domList, actionID);
        PathCtr.loadState("loading completed");
        PathCtr.loadState(pathContainer);
        
        domList.forEach(dom=>dom.parentNode.remove());
        domList.length = 0;
        
        if(++fileIndex < fileInfoList.length) {
          loadFile(fileInfoList[fileIndex]);
        } else {
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
    let setArray=(arr, lengFunc, setFunc)=>{
      let num = arr.length;
      lengFunc(num);
      for(let i = 0; i < num;) {
        let val = arr[i];
        let j = 1;
        if(typeof(val) == "undefined") {
          setUint16(0);
          for(; j < num; ++j) {
            if(typeof(arr[i + j]) != "undefined") break;
          }
          setUint16(j);
          i += j;
          continue;
        }
        for(; j < num; ++j) {
          if(typeof(arr[i + j]) == "undefined" || JSON.stringify(val) != JSON.stringify(arr[i + j])) break;
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
    
    let setPath=path=>{
      setUint16(path.maskIdToUse);
      setUint8(path.fillRule == "nonzero" ? 0 : 1);
      
      let hasAction = (path.hasActionList.length > 0);
      if(hasAction) {
        setUint8(1);
        setAction(path.lineWidth, setFloat32);
        setAction(path.fillStyle, setColor);
        setAction(path.strokeStyle, setColor);
        setAction(path.pathDataList, setPathData);
      } else {
        setUint8(0);
        setFloat32(path.lineWidth);
        setColor(path.fillStyle);
        setColor(path.strokeStyle);
        setPathData(path.pathDataList);
      }
    };
    
    let setGroup=group=>{
      setString(group.id);
      setUint16(group.maskIdToUse);
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
    
    setUint8(Object.keys(pathContainer.actionList).length);
    Object.keys(pathContainer.actionList).forEach(key=>{
      setString(key);
      setUint8(pathContainer.actionList[key].id);
      setUint16(pathContainer.actionList[key].totalFrames);
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
      Object.keys(ret).forEach(id=>{
        let bone = pathContainer.getBone(id);
        if(!bone) {
          console.error("bone is not found : " + id);
          return;
        }
        bone.setJSONData(pathContainer, ret[id]);
      });
      
      PathCtr.loadState("bones JSON load complete.");
      PathCtr.loadState(pathContainer);
    }
    request.open("GET", filePath, true);
    request.send();
  },
}
