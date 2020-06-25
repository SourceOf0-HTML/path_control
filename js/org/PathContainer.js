
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

