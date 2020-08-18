
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
    
    this.bones.forEach(id=>{
      this.groups[id].control(this);
    });
    this.groups.forEach(group=>{
      group.preprocessing(this);
    });
    this.bones.forEach(id=>{
      this.groups[id].calcInverseKinematics(this);
    });
    this.bones.forEach(id=>{
      this.groups[id].calcForwardKinematics(this);
    });
    
    this.actionList.forEach(targetAction=>{
      if(targetAction.id == action.id) return;
      targetAction.pastFrame = targetAction.currentFrame;
      if(!targetAction.smartBoneID) return;
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

