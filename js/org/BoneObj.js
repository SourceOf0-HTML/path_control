
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

