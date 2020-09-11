
class ActionContainer {
  constructor(data, checkFunc) {
    this.data = data;
    this.checkFunc = checkFunc;
    this.hasAction = Array.isArray(data) && data.some(val=>Array.isArray(val) && val.some(checkFunc));
    this.result = this.hasAction? data[0][0] : data;
  };
  
  setData(data, actionID = 0, frame = 0) {
    if(this.hasAction) {
      this.addAction(data, actionID, frame);
      return;
    }
    this.data = data;
    this.hasAction = Array.isArray(data) && data.some(val=>Array.isArray(val) && val.some(this.checkFunc));
    this.result = this.hasAction? data[0][0] : data;
  };
  
  addAction(data, actionID, frame) {
    if(!this.hasAction) {
      if( JSON.stringify(this.data) == JSON.stringify(data) ) return;
      
      // init action data
      this.data = [[this.data]];
      this.hasAction = true;
    }
    if(typeof this.data[actionID] === "undefined") {
      this.data[actionID] = [this.data[0][0].concat()];
    }
    
    let isEmpty = true;
    for(let i = this.data[actionID].length - 1; i >= 0; --i) {
      if(typeof this.data[actionID][i] === "undefined") continue;
      if(JSON.stringify(data) == JSON.stringify(this.data[actionID][i])) break;
      this.data[actionID][frame] = data;
      isEmpty = false;
      break;
    }
    if(isEmpty) {
      this.data[actionID][frame] = undefined;
    }
  };
  
  hasActionID(actionID) {
    if(!this.hasAction) return false;
    return typeof this.data[actionID] !== "undefined";
  };
  
  getData(actionID = 0, frame = 0) {
    if(!this.hasAction) return this.data;
    return this.data[actionID][Math.min(frame, this.data[actionID].length-1)];
  };
  
  getAvailableData(actionID = 0, frame = 0) {
    if(!this.hasAction) {
      return this.data;
    }
    if(!this.hasActionID(actionID)) {
      return this.data[0][0];
    }
    
    for(let targetFrame = frame; targetFrame >= 0; --targetFrame) {
      let targetData = this.getData(actionID, targetFrame);
      if(typeof targetData !== "undefined") return targetData;
    }
    return undefined;
  };
  
  update(pathContainer, actionID = 0, frame = 0) {
    if(!this.hasAction) return;
    
    if(!this.hasActionID(actionID)) {
      actionID = 0;
      frame = 0;
    }
    
    let output =(action, val)=> {
      if(!PathCtr.isOutputDebugPrint) return;
      if(this.result == val) return;
      PathCtr.debugPrint(action.name, action.pastFrame, action.currentFrame, val);
    };
    let data = null;
    
    this.data.forEach((actionDataList, targetActionID)=> {
      let action = pathContainer.actionList[targetActionID];
      let pastFrame = action.pastFrame;
      let currentFrame = action.currentFrame;
      
      if(pastFrame == currentFrame) return;
      
      if(pastFrame <= currentFrame) {
        for(let targetFrame = Math.min(currentFrame, actionDataList.length-1); targetFrame >= pastFrame; --targetFrame) {
          let targetData = actionDataList[targetFrame];
          if(typeof targetData === "undefined") continue;
          data = targetData;
          output(action, data);
          break;
        }
      } else {
        for(let targetFrame = Math.min(pastFrame, actionDataList.length-1); targetFrame >= currentFrame; --targetFrame) {
          let targetData = actionDataList[targetFrame];
          if(typeof targetData === "undefined") continue;
          
          for(let targetFrame = Math.min(currentFrame, actionDataList.length-1); targetFrame >= 0; --targetFrame) {
            let targetData = actionDataList[targetFrame];
            if(typeof targetData === "undefined") continue;
            data = targetData;
            output(action, data);
            break;
          }
          break;
        }
      }
    });
    
    if(!!data && this.result != data) {
      this.result = data;
    }
  };
};

