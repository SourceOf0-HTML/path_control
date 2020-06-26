
class BoneObj extends GroupObj {
  constructor(id, paths, childGroups, hasAction) {
    super(id, paths, childGroups, hasAction, "");
    this.parentID = -1;
    this.flexi = [];
    this.feedback = false;
    this.strength = 0;
    
    if(!!paths && paths.length > 0) {
      let pathDataList = paths[0].getPathDataList();
      this.defPos = {
        x1: pathDataList[0].pos[0],
        y1: pathDataList[0].pos[1],
        x2: pathDataList[1].pos[0],
        y2: pathDataList[1].pos[1],
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
      path2D.arc(pos[0], pos[1], 2, 0, Math.PI*2);
      path.draw(pathContainer, context, path2D, false);
      path2D = null;
    });
    
    this.getChildGroups().forEach(childGroup=>{
      pathContainer.groups[childGroup].draw(pathContainer, context, false);
    });
  };
};

