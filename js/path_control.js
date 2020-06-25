
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
      
      this.subContext.clearRect(0, 0, this.viewWidth, this.viewHeight);
      this.pathContainer.draw(frameNumber);
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
    
    let update =()=> {
      this.cancelRequestAnimation();
      this.requestAnimationIDs.push(window.requestAnimationFrame(draw));
      this.setTimeoutIDs.push(window.setTimeout(update, fixFrameTime*1000));
    };
    
    //this.debugPrint("base : ", frameTime, frameTime * 10, frameTime * 0.1);
    this.setTimeoutIDs.push(window.setTimeout(update, fixFrameTime*1000));
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
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   * @param {Path2D} path2D
   * @param {PathData} d
   */
  drawPath(pathContainer, matrix, path2D, d) {
    let pos;
    switch(d.type) {
      case "M":
        pos = matrix.applyToArray(d.pos, pathContainer.pathRatio);
        path2D.moveTo(pos[0], pos[1]);
        break;
      case "L":
        pos = matrix.applyToArray(d.pos, pathContainer.pathRatio);
        path2D.lineTo(pos[0], pos[1]);
        break;
      case "C":
        pos = matrix.applyToArray(d.pos, pathContainer.pathRatio);
        path2D.bezierCurveTo(pos[0], pos[1], pos[2], pos[3], pos[4], pos[5]);
        break;
      case "Z":
        path2D.closePath();
        break;
      default:
        console.error("unknown type");
        break;
    }
  };
  
  /**
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Number} lineWidth - strokeWidth ( context2D.lineWidth )
   * @param {String} strokeStyle - strokeColor ( context2D.strokeStyle )
   */
  drawStroke(context, path2D, lineWidth, strokeStyle) {
    if( !lineWidth ) return;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeStyle;
    context.stroke(path2D);
  };
  
  /**
   * @param {CanvasRenderingContext2D} context -  canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {String} fillStyle - strokeColor ( context2D.strokeStyle )
   */
  drawFill(context, path2D, fillStyle) {
    context.fillStyle = fillStyle;
    context.fill(path2D, this.fillRule);
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Matrix} matrix - used to transform the path
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Path2D} path2D
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, matrix, context, path2D, isMask) {
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    
    if( this.hasActionList.length == 0) {
      this.pathDataList.forEach(d=>this.drawPath(matrix, path2D, d));
      if(isMask) return;
      this.drawStroke(context, path2D, this.lineWidth, this.strokeStyle);
      this.drawFill(context, path2D, this.fillStyle);
      return;
    } else if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    
    this.pathDataList[actionID][Math.min(frame, this.pathDataList[actionID].length)].forEach(d=>this.drawPath(pathContainer, matrix, path2D, d));
    if(isMask) return;
    this.drawStroke(context, path2D, this.lineWidth[actionID][Math.min(frame, this.lineWidth[actionID].length)], this.strokeStyle[actionID][Math.min(frame, this.strokeStyle[actionID].length)]);
    this.drawFill(context, path2D, this.fillStyle[actionID][Math.min(frame, this.fillStyle[actionID].length)]);
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
   * @return {Array} - group id array
   */
  getChildGroups() {
    if( this.childGroups.length == 0 ) return this.childGroups;
    if( this.hasActionList.length == 0 ) {
      return this.childGroups;
    }
    
    let actionID = PathCtr.currentActionID;
    
    if( this.childGroups[actionID] == null || this.childGroups[actionID][PathCtr.currentFrame] == null ) {
      return this.childGroups[0][0];
    }
    
    return this.childGroups[actionID][PathCtr.currentFrame];
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Boolean} isMask - when true, draw as a mask
   * @param {Sprite} sprite - used to transform the path
   */
  draw(pathContainer, context, sprite, isMask) {
    if(!context) {
      console.error("context is not found");
      return;
    }
    if(!this.visible) {
      return;
    }
    
    let isFoundMask = false;
    let groupSprite = sprite.compSprite(this);
    
    if(!isMask && !!this.maskIdToUse) {
      let mask = pathContainer.groups[this.maskIdToUse];
      if(!!mask) {
        isFoundMask = true;
        context.save();
        mask.draw(pathContainer, context, groupSprite, true);
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
          maskPath.draw(pathContainer, context, groupSprite, true);
        } else {
          console.error("mask is not found : " + path.maskIdToUse);
        }
      }
      
      if(!isMask) {
        path2D = new Path2D();
      }
      
      path.draw(pathContainer, groupSprite.matrix, context, path2D, isMask);
      
      if(isFoundMaskPath) {
        context.restore();
      }
    });
    
    this.getChildGroups().forEach(childGroup=>{
      pathContainer.groups[childGroup].draw(pathContainer, context, groupSprite, isMask);
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
    this.TWO_PI = Math.PI*2;
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
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Sprite} sprite - used to transform the path
   */
  draw(pathContainer, context, sprite) {
    if(!context) {
      console.error("context is not found");
      return;
    }
    if(typeof DebugPath === "undefined" || !DebugPath.isShowBones || !this.visible) {
      return;
    }
    
    let groupSprite = sprite.compSprite(this);
    this.paths.forEach(path=>{
      let path2D = new Path2D();
      //let pos = groupSprite.matrix.applyToArray(path.pathDataList[0].pos, pathContainer.pathRatio);
      //path.arc(pos[0], pos[1], 2, 0, this.TWO_PI);
      path.draw(pathContainer, groupSprite.matrix, context, path2D, false);
      path2D = null;
    });
    
    this.getChildGroups().forEach(childGroup=>{
      pathContainer.groups[childGroup].draw(pathContainer, context, groupSprite, false);
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
  draw(frame, actionName = PathCtr.defaultActionName) {
    if(!this.visible || !this.rootGroups) {
      return;
    }
    
    PathCtr.currentFrame = frame;
    PathCtr.currentActionID = Object.keys(this.actionList).indexOf(actionName);
    
    let width = this.displayWidth;
    let height = this.displayHeight;
    let scaleX, scaleY;
    if(width > height) {
      scaleX = 1;
      scaleY = height / width;
    } else {
      scaleX = width / height;
      scaleY = 1;
    }
    
    let getSprite=()=>(new Sprite().setSprite(this));
    
    this.rootGroups.forEach(id=>{
      this.groups[id].draw(this, this.context, getSprite(), false);
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

