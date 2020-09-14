
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

