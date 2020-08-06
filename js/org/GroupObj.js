
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
   * @param {PathContainer} pathContainer
   */
  preprocessing(pathContainer) {
    this.reset();
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Sprite} sprite - used to transform the path
   */
  update(pathContainer, sprite, flexiIDList = []) {
    let actionID = pathContainer.currentActionID;
    let frame = pathContainer.actionList[actionID].currentFrame;
    let groupSprite = sprite.compSprite(this);
    let flexi = flexiIDList.concat(this.flexi);
    let groupMatrix = groupSprite.getMatrix();
    
    this.paths.forEach(path=>{
      path.update(frame, actionID, pathContainer, groupMatrix);
    });
    
    let childGroups = this.childGroups.update(pathContainer, actionID, frame);
    
    this.childGroups.result.forEach(childGroup=>{
      pathContainer.groups[childGroup].update(pathContainer, groupSprite, flexi);
    });
    
    if(flexi.length <= 0) return;
    
    this.paths.forEach(path=> {
      path.resultPathList.forEach(d=>{
        if(!d.pos || d.pos.length == 0) return;
        let points = d.pos;
        let pointsNum = points.length;
        for(let i = 0; i < pointsNum; i += 2) {
          if(flexi.length == 1) {
            let id = flexi[0];
            if(pathContainer.groups[id].strength == 0) continue;
            pathContainer.groups[id].effectSprite.getMatrix().applyToPoint(points, i);
            continue;
          }
          
          let x = points[i];
          let y = points[i+1];
          
          let ratioList = [];
          let sum = 0;
          flexi.forEach(id=>{
            let val = pathContainer.groups[id].calc(x, y);
            sum += val;
            ratioList.push(val);
          });
          
          if(sum == 0) continue;
          
          points[i] = 0;
          points[i+1] = 0;
          
          flexi.forEach((id, j)=>{
            pathContainer.groups[id].effectSprite.getMatrix().multAndAddPoint(1 - ratioList[j]/sum, x, y, points, i);
          });
        }
      });
    });
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

