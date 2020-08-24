
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
   * @param {Object} data
   */
  setCustomFunc(data) {
    if(typeof data.initFuncStr !== "undefined") {
      this.customInit = new Function("pathContainer", data.initFuncStr);
      this.customInit();
      this.customInit = undefined;
    }
    if(typeof data.controlFuncStr !== "undefined") {
      this.control = new Function("pathContainer", data.controlFuncStr);
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
   * @param {Array} pos
   */
  setCurrentPos(pos) {
    let currentPos = this.currentState.pos;
    currentPos[0] = pos[0];
    currentPos[1] = pos[1];
    currentPos[2] = pos[2];
    currentPos[3] = pos[3];
    this.calcCurrentState();
  };
  
  calcCurrentState() {
    let currentPos = this.currentState.pos;
    let distX = currentPos[2] - currentPos[0];
    let distY = currentPos[3] - currentPos[1];
    let dist = this.currentState.distance = Math.sqrt(distX*distX + distY*distY);
    let angle = this.currentState.angle = Math.atan2(distY, distX);
    
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
   */
  control(pathContainer) {
    // do nothing.
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
    this.setCurrentPos(data);
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  calcInverseKinematics(pathContainer) {
    if(!pathContainer.mouseX && !pathContainer.mouseY) return;
    
    let reach =(bone, x1, y1)=> {
      let currentPos = bone.currentState.pos;
      let distX = currentPos[2] - currentPos[0];
      let distY = currentPos[3] - currentPos[1];
      let distance = Math.sqrt(distX*distX + distY*distY);
      let x0 = currentPos[0];
      let y0 = currentPos[1];
      let angle = Math.atan2(y1 - y0, x1 - x0);
      let x = currentPos[2] = x0 + Math.cos(angle) * distance;
      let y = currentPos[3] = y0 + Math.sin(angle) * distance;
      return {
        x: x1 - (x - x0),
        y: y1 - (y - y0)
      };
    };
    
    let boneIDs = [this.uid];
    let parentID = this.parentID;
    let bone = this;
    let pos = reach(this, pathContainer.mouseX, pathContainer.mouseY);
    while(typeof parentID !== "undefined") {
      bone = pathContainer.groups[parentID];
      pos = reach(bone, pos.x, pos.y);
      if(!bone.feedback) break;
      boneIDs.unshift(parentID);
      parentID = bone.parentID;
    }
    
    boneIDs.forEach(parentID=> {
      let target = pathContainer.groups[parentID];
      let dx = bone.currentState.pos[2] - target.currentState.pos[0];
      let dy = bone.currentState.pos[3] - target.currentState.pos[1];
      target.currentState.pos[0] += dx;
      target.currentState.pos[1] += dy;
      target.currentState.pos[2] += dx;
      target.currentState.pos[3] += dy;
      target.calcCurrentState();
      bone = target;
    });
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  calcForwardKinematics(pathContainer) {
    let parentID = this.parentID;
    let currentPos = this.currentState.pos;
    let bone = this;
    
    if(typeof parentID !== "undefined") {
      let target = pathContainer.groups[parentID];
      if(bone.isParentPin) {
        let x = target.effectSprite.x - target.effectSprite.anchorX;
        let y = target.effectSprite.y - target.effectSprite.anchorY;
        currentPos[0] += x;
        currentPos[1] += y;
        currentPos[2] += x;
        currentPos[3] += y;
      } else {
        target.effectSprite.getMatrix().applyToArray(currentPos);
      }
      parentID = target.parentID;
      bone = target;
    }
    this.calcCurrentState();
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  calc(pathContainer) {
    if(this.id == "bone4_head") {
      this.calcInverseKinematics(pathContainer);
    } else {
      this.calcForwardKinematics(pathContainer);
    }
    
    if(!!this.flexi) {
      this.paths[0].calcFlexi(pathContainer, this.flexi);
      
      let pathDataList = this.paths[0].resultPathList;
      this.currentState.pos[0] = pathDataList[0].pos[0];
      this.currentState.pos[1] = pathDataList[0].pos[1];
      this.currentState.pos[2] = pathDataList[1].pos[0];
      this.currentState.pos[3] = pathDataList[1].pos[1];
      this.calcCurrentState();
    }
    
    if(!!this.flexiPoint) {
      let pathDataList = this.paths[0].resultPathList;
      let dataIndex = this.flexiPoint.dataIndex;
      PathObj.calcFlexiPoints(pathContainer, this.flexiPoint.bones, pathDataList[dataIndex].pos, 0, 2);
      let tx = pathDataList[dataIndex].pos[0] - this.currentState.pos[dataIndex * 2 + 0];
      let ty = pathDataList[dataIndex].pos[1] - this.currentState.pos[dataIndex * 2 + 1];
      this.currentState.pos[0] += tx;
      this.currentState.pos[1] += ty;
      this.currentState.pos[2] += tx;
      this.currentState.pos[3] += ty;
      this.calcCurrentState();
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

