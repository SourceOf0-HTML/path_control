
class GroupObj {
  constructor(id, paths, childGroups, maskIdToUse) {
    this.pathContainer = PathCtr.initTarget;  // parent path container
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.hasActionList = [];          // if true, have action
    this.sprite = new Sprite();       // used to transform the path
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
   * @return {Array} - group id array
   */
  getChildGroups() {
    if( this.childGroups.length == 0 ) return this.childGroups;
    if( this.hasActionList.length == 0 ) {
      return this.childGroups;
    }
    
    let actionID = PathCtr.currentActionID;
    
    if( this.childGroups[actionID] == null || this.childGroups[actionID][PathCtr.currentFrame] == null ) {
      return this.childGroups[0][0];
    }
    
    return this.childGroups[actionID][PathCtr.currentFrame];
  };
};

