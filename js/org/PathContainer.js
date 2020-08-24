
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
    
    let bonesMap = this.bones.map((id, i)=> {
      let bone = this.groups[id];
      let ret = { id: id, priority: -1 };
      if(!bone.defState) return ret;
      
      let offset = this.groups.length;
      let priority = 0;
      let childNum = 0;
      this.bones.forEach(targetID=> {
        if(this.groups[targetID].parentID == bone.uid) {
          childNum += 1;
        } else {
          priority += 1;
        }
      });
      
      if(typeof bone.parentID === "undefined") {
        if(childNum == 0) {
          priority += offset * 2;
        } else {
          priority = 0;
        }
      } else if(childNum == 0) {
        priority += offset;
      }
      
      ret.priority = priority;
      return ret;
    });
    
    bonesMap.forEach(boneData=> {
      let bone = this.groups[boneData.id];
      if(!bone.flexiPoint) return;
      let ret = boneData.priority;
      bone.flexiPoint.bones.forEach(id=> {
        let targetPri = bonesMap.find(data=> data.id == id).priority;
        if(ret <= targetPri) ret = targetPri + 1;
      });
      boneData.priority = ret;
    });
    
    bonesMap.sort((a, b)=> {
      if(b.priority < 0) return -1;
      if(a.priority > b.priority) return 1;
      if(a.priority < b.priority) return -1;
      return 0;
    });
    
    bonesMap.some(boneData=> {
      if(boneData.priority < 0) return true;
      this.groups[boneData.id].control(this);
    });
    this.groups.forEach(group=> {
      group.preprocessing(this);
    });
    bonesMap.some(boneData=> {
      if(boneData.priority < 0) return true;
      this.groups[boneData.id].calc(this);
    });
    
    this.actionList.forEach(targetAction=> {
      if(targetAction.id == action.id) return;
      targetAction.pastFrame = targetAction.currentFrame;
      if(!targetAction.smartBoneID) return;
      targetAction.currentFrame = this.groups[targetAction.smartBoneID].getSmartFrame(targetAction.totalFrames);
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

