
class BoneObj extends GroupObj {
  constructor(id, paths, childGroups, hasAction) {
    super(id, paths, childGroups, hasAction, "");
  };
  
  /**
   * @param {PathContainer} pathContainer
   * @param {Sprite} sprite - used to transform the path
   */
  draw(pathContainer, context, sprite) {
    if(!context) {
      console.error("context is not found");
      return;
    }
    if(!this.visible) {
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

