
class GroupObj extends Sprite {
  constructor(uid, id, paths, childGroups, hasAction, maskIdToUse) {
    super();
    this.visible = true;              // display when true
    this.uid = uid;                   // uniq id
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.hasActionList = [];          // if true, have action
    this.flexi = [];                  // ID of a flexi-bonded target
    
    if(hasAction) {
      this.childGroups.forEach((val, i)=>(this.hasActionList[i] = true));
      this.resultGroups = childGroups[0][0];
    } else {
      this.resultGroups = childGroups;
    }
  };
  
  addAction(childGroups, frame, actionID) {
    if( childGroups.length == 0 ) return;
    if( this.hasActionList.length == 0 ) {
      if( JSON.stringify(this.childGroups) == JSON.stringify(childGroups) ) return;
      
      // init action data
      this.childGroups = [[this.childGroups]];   // list of group id
      this.hasActionList[0] = true;
    }
    if( !this.hasActionList[actionID] ) {
      this.childGroups[actionID] = [this.childGroups[0][0].concat()];
      this.hasActionList[actionID] = true;
    }
    
    let isEmpty = true;
    for(let i = this.childGroups[actionID].length - 1; i >= 0; --i) {
      if(typeof this.childGroups[actionID][i] === "undefined") continue;
      if(JSON.stringify(childGroups) == JSON.stringify(this.childGroups[actionID][i])) break;
      this.childGroups[actionID][frame] = childGroups;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.childGroups[actionID][frame] = undefined;
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Array} nameList - bone name list
   */
  setFlexiBones(pathContainer, nameList) {
    if(!nameList || !Array.isArray(nameList) || nameList.length == 0) return;
    PathCtr.loadState("GROUP:" + this.id);
    
    this.flexi.length = 0;
    
    nameList.forEach(name=> {
      let bone = pathContainer.getBone(name);
      if(!!bone) {
        PathCtr.loadState("  flexi:");
        this.flexi.push(bone.uid);
        PathCtr.loadState("    " + name);
      }
    });
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
    
    let getChildGroups =(id, f)=>this.childGroups[id][Math.min(f, this.childGroups[id].length-1)];
    
    this.paths.forEach(path=>{
      path.update(frame, actionID, pathContainer, groupMatrix);
    });
    
    let childGroups = null;
    if(this.hasActionList[actionID]) {
      childGroups = getChildGroups(actionID, frame);
    }
    pathContainer.actionList.forEach(action=>{
      if(!this.hasActionList[action.id]) return;
      if(action.pastFrame == action.currentFrame) return;
      if(action.pastFrame <= action.currentFrame) {
        for(let targetFrame = action.currentFrame; targetFrame >= action.pastFrame; --targetFrame) {
          let targetGroups = getChildGroups(action.id, targetFrame);
          if(!targetGroups) continue;
          childGroups = targetGroups;
          break;
        }
      } else {
        for(let targetFrame = action.pastFrame; targetFrame >= action.currentFrame; --targetFrame) {
          let targetGroups = getChildGroups(action.id, targetFrame);
          if(!targetGroups) continue;
          
          for(let targetFrame = action.currentFrame; targetFrame >= 0; --targetFrame) {
            targetGroups = getChildGroups(action.id, targetFrame);
            if(!targetGroups) continue;
            childGroups = targetGroups;
            break;
          }
          break;
        }
      }
    });
    if(!!childGroups) {
      this.resultGroups = childGroups;
    }
    
    this.resultGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].update(pathContainer, groupSprite, flexi);
    });
    
    if(flexi.length > 0) {
      this.paths.forEach(path=>{
        path.resultPath.pathDataList.forEach(d=>{
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
    }
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
    
    this.resultGroups.forEach(childGroup=>{
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
    
    this.resultGroups.forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};

