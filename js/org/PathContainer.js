
class PathContainer {
  constructor() {
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
    this.actionList = null;       // action info list
    this.sprite = new Sprite();   // used to transform the path
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
   * @param {GroupObj} group - GroupObj to be draw
   * @param {Boolean} isMask - when true, draw as a mask
   * @param {Sprite} sprite - used to transform the path
   */
  drawGroup(group, sprite, isMask) {
    if(!this.context) {
      console.error("context is not found");
      return;
    }
    
    let isFoundMask = false;
    let groupSprite = sprite.comp(group);
    
    
    if(!isMask && !!group.maskIdToUse) {
      let mask = this.groups[group.maskIdToUse];
      if(!!mask) {
        isFoundMask = true;
        this.context.save();
        this.drawGroup(mask, groupSprite, true);
      } else {
        console.error("group is not found : " + group.maskIdToUse);
      }
    }
    
    let path2D = isMask? (new Path2D()):null;
    let isUsed = false;
    
    group.paths.forEach(path=>{
      
      isUsed = true;
      
      let isFoundMaskPath = false;
      
      if(!isMask && !!path.maskIdToUse) {
        let maskPath = this.groups[path.maskIdToUse];
        if(!!maskPath) {
          isFoundMaskPath = true;
          this.context.save();
          this.drawGroup(maskPath, groupSprite, true);
        } else {
          console.error("mask is not found : " + path.maskIdToUse);
        }
      }
      
      if(!isMask) {
        path2D = new Path2D();
      }
      
      path.draw(groupSprite.matrix, this.context, path2D, isMask);
      
      if(isFoundMaskPath) {
        this.context.restore();
      }
    });
    
    group.getChildGroups().forEach(childGroup=>{
      this.drawGroup(this.groups[childGroup], groupSprite, isMask);
    });
    
    if(isMask && isUsed) {
      this.context.clip(path2D);
    }
    
    path2D = null;
    
    if(isFoundMask) {
      this.context.restore();
    }
  };
  
  /**
   * @param {Integer} frame
   * @param {String} actionName
   */
  draw(frame, actionName = PathCtr.defaultActionName) {
    if(!this.rootGroups) {
      console.error("root groups is not found");
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
    
    let getSprite=()=>(new Sprite().setSprite(this.sprite));
    
    let path2D = new Path2D();
    let clipArray = getSprite().matrix.applyToArray([0, 0, 0, scaleY, scaleX, scaleY, scaleX, 0], this.pathRatio);
    path2D.moveTo(clipArray[0], clipArray[1]);
    path2D.lineTo(clipArray[2], clipArray[3]);
    path2D.lineTo(clipArray[4], clipArray[5]);
    path2D.lineTo(clipArray[6], clipArray[7]);
    if(PathCtr.isDebug) {
      this.context.lineWidth = 5;
      this.context.strokeStyle = "black";
      this.context.stroke(path2D);
    }
    this.context.clip(path2D);
    path2D = null;
    
    this.rootGroups.forEach(id=>{
      this.drawGroup(this.groups[id], getSprite(), false);
    });
  };
};

