
class BoneObj extends GroupObj {
  constructor(id, paths, childGroups, hasAction) {
    super(id, paths, childGroups, hasAction, "");
    this.parentID = -1;
    this.flexi = [];
    this.feedback = false;
    this.strength = 0;
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Object} data - data to set
   */
  setJSONData(pathContainer, data) {
    if(!pathContainer || !data) return;
    console.log("BONE:" + this.id);
    
    if("parent" in data && data.parent in pathContainer.groupNameToIDList) {
      this.parentID = pathContainer.groupNameToIDList[data.parent];
      console.log("parentID:" + this.parentID);
    }
    
    this.flexi.length = 0;
    if("flexi" in data && Array.isArray(data.flexi)) {
      data.flexi.forEach(name=> {
        if(name in pathContainer.groupNameToIDList) {
          this.flexi.push(pathContainer.groupNameToIDList[name]);
        }
      });
      console.log("flexi:" + this.flexi.toString());
    }
    
    if("feedback" in data && (typeof data.feedback === "boolean")) {
      this.feedback = data.feedback;
      console.log("feedback:" + this.feedback);
    }
    
    if("strength" in data && Number.isFinite(data.strength)) {
      this.strength = data.strength;
      console.log("strength:" + this.strength);
    }
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {CanvasRenderingContext2D} context - canvas.getContext("2d")
   * @param {Sprite} sprite - used to transform the path
   */
  draw(pathContainer, context, sprite) {
    if(!context) {
      console.error("context is not found");
      return;
    }
    if(typeof DebugPath === "undefined" || !DebugPath.isShowBones || !this.visible) {
      return;
    }
    
    let groupSprite = sprite.compSprite(this);
    this.paths.forEach(path=>{
      let path2D = new Path2D();
      path.draw(pathContainer, groupSprite.matrix, context, path2D, false);
      path2D = null;
    });
    
    this.getChildGroups().forEach(childGroup=>{
      pathContainer.groups[childGroup].draw(pathContainer, context, groupSprite, false);
    });
  };
};

