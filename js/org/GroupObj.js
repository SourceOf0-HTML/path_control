
class GroupObj extends Sprite {
  constructor(id, paths, childGroups, hasAction, maskIdToUse) {
    super();
    this.visible = true;              // display when true
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.hasActionList = [];          // if true, have action
    this.flexi = [];                  // ID of a flexi-bonded target
    
    if(hasAction) {
      this.childGroups.forEach((val, i)=>(this.hasActionList[i] = true));
    }
  };
  
  addAction(childGroups, frame, actionID) {
    if( childGroups.length == 0 ) return;
    if( this.hasActionList.length == 0 ) {
      if( JSON.stringify(childGroups) == JSON.stringify(this.childGroups) ) return;
      
      // init action data
      this.childGroups = [[this.childGroups]];   // list of group id
      this.hasActionList[0] = true;
    }
    if( !this.hasActionList[actionID] ) {
      this.childGroups[actionID] = [this.childGroups[0][0].concat()];
      this.hasActionList[actionID] = true;
    }
    this.childGroups[actionID][frame] = childGroups;
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
      if(name in pathContainer.groupNameToIDList) {
        let id = pathContainer.groupNameToIDList[name];
        if(pathContainer.bones.includes(id)) {
          //this.flexi.unshift(id);
          this.flexi.push(id);
        }
      }
    });
    PathCtr.loadState("flexi:" + this.flexi.toString());
  };
  
  /**
   * @param {Integer} frame - frame number
   * @param {Integer} actionID - action ID
   * @return {Array} - group id array
   */
  getChildGroups(frame, actionID) {
    if( this.childGroups.length == 0 ) return this.childGroups;
    if( this.hasActionList.length == 0 ) {
      return this.childGroups;
    }
    if( this.childGroups[actionID] == null || this.childGroups[actionID][frame] == null ) {
      return this.childGroups[0][0];
    }
    return this.childGroups[actionID][frame];
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
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    //let actionID = 0;
    //let frame = 0;
    let groupSprite = sprite.compSprite(this);
    let flexi = flexiIDList.concat(this.flexi);
    let groupMatrix = groupSprite.getMatrix();
    
    this.paths.forEach(path=>{
      path.update(frame, actionID, pathContainer, groupMatrix);
    });
    this.getChildGroups(frame, actionID).forEach(childGroup=>{
      pathContainer.groups[childGroup].update(pathContainer, groupSprite, flexi);
    });
    
    this.paths.forEach(path=>{
      path.resultPath.pathData.forEach(d=>{
        if(!d.pos || d.pos.length == 0) return;
        let points = d.pos;
        let pointsNum = points.length;
        for(let i = 0; i < pointsNum; i += 2) {
          let x = points[i];
          let y = points[i+1];
          
          if(flexi.length == 1) {
            let id = flexi[0];
            if(pathContainer.groups[id].strength == 0) continue;
            let pos = pathContainer.groups[id].effectSprite.getMatrix().applyToPoint(x, y);
            points[i] = pos.x;
            points[i+1] = pos.y;
            continue;
          }
          
          let ratioList = [];
          flexi.forEach(id=>{
            ratioList.push(pathContainer.groups[id].calc(x, y));
          });
          
          let sum = 0;
          ratioList.forEach(val=>{sum += val});
          if(sum == 0) continue;
          
          points[i] = 0;
          points[i+1] = 0;
          
          let matrix = new Matrix();
          flexi.forEach((id, j)=>{
            let ratio = ratioList[j];
            let bone = pathContainer.groups[id];
            let pos = bone.effectSprite.getMatrix().mult(1 - ratio/sum).applyToPoint(x, y);
            points[i] += pos.x;
            points[i+1] += pos.y;
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
    
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    this.getChildGroups(frame, actionID).forEach(childGroup=>{
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
    
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    this.getChildGroups(frame, actionID).forEach(childGroup=>{
      pathContainer.groups[childGroup].debugDraw(pathContainer, context);
    });
  };
};

