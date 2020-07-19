
class BoneObj extends GroupObj {
  constructor(id, paths, childGroups, hasAction) {
    super(id, paths, childGroups, hasAction, "");
    this.parentID = -1;                // parent bone id
    this.isParentPin = false;          // parent bone is pin bone
    this.feedback = false;             // receive feedback from other bones
    this.strength = 0;                 // scope of influence of bone
    this.effectSprite = new Sprite();  // actual effect sprite
    this.isReady = false;              // can be used for calculation
    
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
        x0, y0,
        x1, y1,
        distance,
        angle,
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
   * @param {Array} points - bone pos
   */
  diff(points) {
    let x0 = this.effectSprite.x = this.currentState.x0 = points[0];
    let y0 = this.effectSprite.y = this.currentState.y0 = points[1];
    let x1 = this.currentState.x1 = points[2];
    let y1 = this.currentState.y1 = points[3];
    
    let distX = x1 - x0;
    let distY = y1 - y0;
    let distance = this.currentState.distance = Math.sqrt(distX*distX + distY*distY);
    let angle = this.currentState.angle = Math.atan2(distY, distX);
    
    this.effectSprite.anchorX = this.defState.x0;
    this.effectSprite.anchorY = this.defState.y0;
    this.effectSprite.scaleY = distance / this.defState.distance;
    this.effectSprite.rotation = angle - this.defState.angle;
    this.isReady = true;
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
  control(pathContainer) {
    if(!this.defState) return;
    
    this.isReady = false;
    
    let pathDataList = this.paths[0].getPathDataList(PathCtr.currentFrame, PathCtr.currentActionID);
    
    if(this.parentID >= 0 || pathDataList.length != 2) return;
    
    this.effectSprite.reset();
    
    let points = pathDataList[0].pos.concat(pathDataList[1].pos);
    this.getMatrix(pathDataList[0].pos[0], pathDataList[0].pos[1]).applyToArray(points);
    
    this.diff(points);
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  preprocessing(pathContainer) {
    if(!this.defState || this.isReady) return;
    
    let pathDataList = this.paths[0].getPathDataList(PathCtr.currentFrame, PathCtr.currentActionID);
    
    if(pathDataList.length != 2) return;
    
    this.effectSprite.reset();
    
    let points = pathDataList[0].pos.concat(pathDataList[1].pos);
    this.getMatrix(pathDataList[0].pos[0], pathDataList[0].pos[1]).applyToArray(points);
    
    if(this.parentID >= 0) {
      let bone = pathContainer.groups[this.parentID];
      bone.preprocessing(pathContainer);
      if(this.isParentPin) {
        let effect = bone.effectSprite;
        let x = effect.x - effect.anchorX;
        let y = effect.y - effect.anchorY;
        points[0] += x;
        points[1] += y;
        points[2] += x;
        points[3] += y;
      } else {
        bone.effectSprite.getMatrix().applyToArray(points);
      }
    }
    this.diff(points);
  };
  
  /**
   * @param {Array} points
   */
  calc(x0, y0) {
    let strength = this.strength;
    if(strength == 0) return 0;
    
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
      let x0 = this.currentState.x0 * ratio;
      let y0 = this.currentState.y0 * ratio;
      let x1 = this.currentState.x1 * ratio;
      let y1 = this.currentState.y1 * ratio;
      
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
    });
    
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    this.resultGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};

