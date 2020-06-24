
/**
 * BinaryLoader
 * Singleton
 */
var BinaryLoader = {
  /**
   * @param {ArrayBuffer} buffer
   * @return {PathContainer}
   */
  init: function(buffer) {
    if(!buffer) {
      console.error("array buffer is not found");
      return null;
    }
    let pathContainer = PathCtr.initTarget = new PathContainer();
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare getting function --
    
    let getUint8  =()=>{let ret = dv.getUint8(sumLength); sumLength += 1; return ret};
    let getUint16 =()=>{let ret = dv.getUint16(sumLength); sumLength += 2; return ret};
    let getUint32 =()=>{let ret = dv.getUint32(sumLength); sumLength += 4; return ret};
    let getFloat32=()=>{let ret = dv.getFloat32(sumLength); sumLength += 4; return ret};
    let getPos    =()=>{let ret = dv.getInt16(sumLength)/PathCtr.binDataPosRange; sumLength += 2; return ret};
    let getString=()=>{
      let num = getUint8();
      let ret = "";
      for(let i = 0; i < num; ++i) {
        ret += String.fromCharCode(getUint16());
      }
      return ret;
    };
    let getColor=()=>{
      if(getUint8() == 0) {
        return "transparent";
      }
      return "rgb(" + getUint8() + ", " + getUint8() + ", " + getUint8() + ")";
    };
    
    let getArray=(lengFunc, getFunc)=>{
      let ret = [];
      let num = lengFunc();
      for(let i = 0; i < num;) {
        let count = getUint16();
        if(count == 0) {
          count = getUint16();
          if(count == 0) {
            console.error("data format error");
            break;
          }
          i += count;
          continue;
        }
        let val = getFunc();
        if(Array.isArray(val)) {
          for(let j = 0; j < count; ++j) {
            ret[i + j] = val.concat();
          }
        } else {
          for(let j = 0; j < count; ++j) {
            ret[i + j] = val;
          }
        }
        i += count;
      }
      return ret;
    };
    
    let getAction=func=>getArray(getUint8, ()=>getArray(getUint16, ()=>func()));
    
    let getPathData=()=>{
      let retNum = getUint16();
      let ret = [];
      for(let i = 0; i < retNum; ++i) {
        let type = getUint8();
        switch(type) {
          case 0:  // M
            ret.push({type:"M", pos:[getPos(), getPos()]});
            break;
          case 1:  // C
            ret.push({type:"C", pos:[getPos(), getPos(), getPos(), getPos(), getPos(), getPos()]});
            break;
          case 2:  // Z
            ret.push({type:"Z"});
            break;
          default:
            console.error("unknown type : " + type);
            break;
        }
      }
      return ret;
    }
    
    let getPath=()=>{
      let maskIdToUse = getUint16();
      let fillRule = (getUint8() == 0 ? "nonzero" : "evenodd");
      
      let hasAction = getUint8();
      if(!hasAction) {
        let lineWidth = getFloat32();
        let fillStyle = getColor();
        let strokeStyle = getColor();
        let pathDataList = getPathData();
        return new PathObj(
          pathDataList,
          maskIdToUse,
          fillRule,
          fillStyle,
          lineWidth,
          strokeStyle,
        );
      }
      
      let lineWidth = getAction(getFloat32);
      let fillStyle = getAction(getColor);
      let strokeStyle = getAction(getColor);
      let pathDataList = getAction(getPathData);
      
      let pathObj = new PathObj(
        pathDataList,
        maskIdToUse,
        fillRule,
        fillStyle,
        lineWidth,
        strokeStyle,
      );
      pathObj.lineWidth.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.fillStyle.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.strokeStyle.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      pathObj.pathDataList.forEach((val, i)=>(pathObj.hasActionList[i] = true));
      return pathObj;
    };
    
    let getGroup=i=>{
      let name = getString();
      pathContainer.groupNameToIDList[name] = i;
      
      let maskIdToUse = getUint16();
      let paths = getArray(getUint16, getPath);
      
      let hasAction = (getUint8() > 0);
      let childGroups;
      if(hasAction) {
        childGroups = getAction(()=>getArray(getUint8, getUint16));
      } else {
        childGroups = getArray(getUint8, getUint16);
      }
      
      if(name.startsWith(PathCtr.defaultBoneName)) {
        return new BoneObj(
          name,
          paths,
          childGroups,
          hasAction
        );
      } else {
        return new GroupObj(
          name,
          paths,
          childGroups,
          hasAction,
          maskIdToUse
        );
      }
    };
    
    
    // --acquisition processing--
    
    pathContainer.originalWidth = pathContainer.displayWidth = getUint16();
    pathContainer.originalHeight = pathContainer.displayHeight = getUint16();
    
    let actionListNum = getUint8();
    if(actionListNum > 0) {
      pathContainer.actionList = {};
      for(let i = 0; i < actionListNum; ++i) {
        pathContainer.actionList[getString()] = {
          id : getUint8(),
          totalFrames : getUint16(),
        };
      }
    }
    
    pathContainer.rootGroups = getArray(getUint8, getUint16);
    
    let groupsNum = getUint16();
    for(let i = 0; i < groupsNum; ++i) {
      PathCtr.debugPrint("count : " + i);
      PathCtr.debugPrint(i);
      PathCtr.debugPrint(sumLength);
      pathContainer.groups[i] = getGroup(i);
      if(BoneObj.prototype.isPrototypeOf(pathContainer.groups[i])) {
        pathContainer.bones.push(i);
      }
      PathCtr.debugPrint(pathContainer.groups[i]);
    }
    
    PathCtr.initTarget = null;
    
    return pathContainer;
  },
  
  /**
   * @param {String} filePath - binary file path
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(filePath, completeFunc = null) {
    if(!filePath) {
      console.error("filePath not found");
      return;
    }
    
    let request = new XMLHttpRequest();
    request.onload = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if(target.status != 200 && target.status != 0) return;
      
      let buffer = request.response;
      let pathContainer = BinaryLoader.init(buffer);
      PathCtr.loadState("loading completed");
      PathCtr.loadState(pathContainer);
      
      PathCtr.loadComplete(pathContainer);
      if(!!completeFunc) {
        completeFunc();
      }
    };
    request.open("GET", filePath, true);
    request.responseType = "arraybuffer";
    request.send();
  },
};

