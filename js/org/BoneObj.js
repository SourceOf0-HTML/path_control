
class BoneObj extends GroupObj {
  constructor(id, paths, childGroups, hasAction) {
    super(id, paths, childGroups, hasAction, "");
    this.parentID = -1;
    this.flexi = [];
    this.feedback = false;
    this.strength = 0;
    this.effectState = new Sprite();
    
    if(!!paths && paths.length > 0) {
      let pathDataList = paths[0].getPathDataList();
      let x0 = pathDataList[0].pos[0];
      let y0 = pathDataList[0].pos[1];
      let x1 = pathDataList[1].pos[0];
      let y1 = pathDataList[1].pos[1];
      this.defState = {
        x0, y0,
        x1, y1,
        angle: Math.atan2(y1-y0, x1-x0),
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
      PathCtr.loadState("parentID:" + this.parentID);
    }
    
    this.flexi.length = 0;
    if("flexi" in data && Array.isArray(data.flexi)) {
      data.flexi.forEach(name=> {
        if(name in pathContainer.groupNameToIDList) {
          this.flexi.push(pathContainer.groupNameToIDList[name]);
        }
      });
      PathCtr.loadState("flexi:" + this.flexi.toString());
    }
    
    if("feedback" in data && (typeof data.feedback === "boolean")) {
      this.feedback = data.feedback;
      PathCtr.loadState("feedback:" + this.feedback);
    }
    
    if("strength" in data && Number.isFinite(data.strength)) {
      this.strength = data.strength;
      PathCtr.loadState("strength:" + this.strength);
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  preprocessing(pathContainer) {
    this.reset();
    
    if(!this.defState) return;
    
    let pathDataList = this.paths[0].getPathDataList(PathCtr.currentFrame, PathCtr.currentActionID);
    if(pathDataList.length == 2) {
      let defX = this.defState.x;
      let defY = this.defState.y;
      let x0 = pathDataList[0].pos[0];
      let y0 = pathDataList[0].pos[1];
      let x1 = pathDataList[1].pos[0];
      let y1 = pathDataList[1].pos[1];
      this.effectState.x = x0;
      this.effectState.y = y0;
      this.effectState.anchorX = this.defState.x0;
      this.effectState.anchorY = this.defState.y0;
      this.effectState.rotation = Math.atan2(y1-y0, x1-x0) - this.defState.angle;
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   */
  calc(pathContainer) {
    if(!this.defState) return;
    
    if(this.parentID >= 0) {
      let group = pathContainer.groups[this.parentID];
      this.addSprite(group.effectState);
    }
    
    this.flexi.forEach(id=>{
      let group = pathContainer.groups[id];
      group.addSprite(this.effectState);
    });
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   */
  draw(pathContainer, context) {
    if(!context) {
      console.error("context is not found");
      return;
    }
    if(typeof DebugPath === "undefined" || !DebugPath.isShowBones || !this.visible) {
      return;
    }
    
    this.paths.forEach(path=>{
      let path2D = new Path2D();
      let pos = path.resultPath.pathData[0].pos;
      let ratio = pathContainer.pathRatio;
      path2D.arc(pos[0]*ratio, pos[1]*ratio, 2, 0, Math.PI*2);
      path.draw(pathContainer, context, path2D, false);
      path2D = null;
    });
    
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    this.getChildGroups(frame, actionID).forEach(childGroup=>{
      pathContainer.groups[childGroup].draw(pathContainer, context, false);
    });
  };
};

