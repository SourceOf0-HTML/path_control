
class GroupObj extends Sprite {
  constructor(uid, id, paths, childGroups, maskIdToUse) {
    super();
    this.visible = true;              // display when true
    this.uid = uid;                   // uniq id
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = new ActionContainer(childGroups, val=>Array.isArray(val) && val.some(v=>Number.isFinite(v)));  // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.flexi = [];                  // ID of a flexi-bonded target
  };
  
  addAction(childGroups, frame, actionID) {
    this.childGroups.addAction(childGroups, actionID, frame);
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
   * @param {Array} flexiIDs - used to transform with flexi bone IDs
   */
  update(pathContainer, sprite, flexiIDs = []) {
    let actionID = pathContainer.currentActionID;
    let frame = pathContainer.actionList[actionID].currentFrame;
    let groupSprite = sprite.compSprite(this);
    let flexi = flexiIDs.concat(this.flexi);
    let groupMatrix = groupSprite.getMatrix();
    
    this.paths.forEach(path=>{
      path.update(frame, actionID, pathContainer, groupMatrix);
    });
    
    let childGroups = this.childGroups.update(pathContainer, actionID, frame);
    
    this.childGroups.result.forEach(childGroup=> {
      pathContainer.groups[childGroup].update(pathContainer, groupSprite, flexi);
    });
    
    if(flexi.length <= 0) return;
    this.paths.forEach(path=>path.calcFlexi(pathContainer, flexi));
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Boolean} isMask - when true, draw as a mask
   */
  draw(pathContainer, context, isMask = false) {
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
    
    this.childGroups.result.forEach(childGroup=>{
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
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   */
  debugDraw(pathContainer, context) {
    if(!this.visible) {
      return;
    }
    
    if(!!this.maskIdToUse) {
      let mask = pathContainer.groups[this.maskIdToUse];
      if(!!mask) {
        mask.debugDraw(pathContainer, context);
      } else {
        console.error("group is not found : " + this.maskIdToUse);
      }
    }
    
    this.paths.forEach(path=>{
      if(!!path.maskIdToUse) {
        let maskPath = pathContainer.groups[path.maskIdToUse];
        if(!!maskPath) {
          maskPath.debugDraw(pathContainer, context);
        } else {
          console.error("mask is not found : " + path.maskIdToUse);
        }
      }
      path.debugDraw(pathContainer, context);
    });
    
    this.childGroups.result.forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};

