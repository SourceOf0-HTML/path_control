
/**
 * BinaryLoader
 * Singleton
 */
var BinaryLoader = {
  bonePropList: {
    parentID: 1,
    isPin: 2,
    feedback: 3,
    strength: 4,
    maxAngle: 5,
    minAngle: 6,
  },
  
  binDataPosRange: 30000, // correction value of coordinates when saving to binary data
  
  /**
   * @param {ArrayBuffer} buffer
   * @return {PathContainer}
   */
  init: function(buffer) {
    if(!buffer) {
      console.error("array buffer is not found");
      return null;
    }
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare getting function --
    
    let getUint8  =()=>{let ret = dv.getUint8(sumLength); sumLength += 1; return ret};
    let getUint16 =()=>{let ret = dv.getUint16(sumLength); sumLength += 2; return ret};
    let getUint32 =()=>{let ret = dv.getUint32(sumLength); sumLength += 4; return ret};
    let getFloat32=()=>{let ret = dv.getFloat32(sumLength); sumLength += 4; return ret};
    let getPos    =()=>{let ret = dv.getInt16(sumLength)/BinaryLoader.binDataPosRange; sumLength += 2; return ret};
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
      let ret = Array(lengFunc());
      let num = ret.length;
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
    
    let getAction=func=> {
      if(getUint8()) {
        return getArray(getUint8, ()=>getArray(getUint16, ()=>func()));
      } else {
        return func();
      }
    };
    
    let getPathData=()=>{
      let retNum = getUint16();
      let ret = [];
      for(let i = 0; i < retNum; ++i) {
        let type = getUint8();
        switch(type) {
          case 0:  // M
            ret.push({type:"M", pos:[getPos(), getPos()]});
            break;
          case 1:  // L
            ret.push({type:"L", pos:[getPos(), getPos()]});
            break;
          case 2:  // C
            ret.push({type:"C", pos:[getPos(), getPos(), getPos(), getPos(), getPos(), getPos()]});
            break;
          case 3:  // Z
            ret.push({type:"Z"});
            break;
          default:
            console.error("unknown type : " + type);
            break;
        }
      }
      return ret;
    }
    
    let getPathDiff=()=>getArray(getUint16, ()=>getArray(getUint16, getPos));
    
    let getPath=()=>{
      let maskIdToUse = getUint16() - 1;
      if(maskIdToUse < 0) maskIdToUse = null;
      let fillRule = (getUint8() ? "evenodd" : "nonzero");
      
      let pathDataList = getPathData();
      
      let lineWidth = getAction(getFloat32);
      let fillStyle = getAction(getColor);
      let strokeStyle = getAction(getColor);
      let pathDiffList = getAction(getPathDiff);
      let pathObj = new PathObj(
        maskIdToUse,
        pathDataList,
        pathDiffList,
        fillRule,
        fillStyle,
        lineWidth,
        strokeStyle,
      );
      return pathObj;
    };
    
    let getGroup=i=>{
      let name = getString();
      
      let maskIdToUse = getUint16() - 1;
      if(maskIdToUse < 0) maskIdToUse = null;
      let paths = getArray(getUint16, getPath);
      let flexi = getArray(getUint8, getUint16);
      
      let ret;
      if(name.startsWith(PathCtr.defaultBoneName)) {
        ret = new BoneObj(
          i,
          name,
          paths,
          getArray(getUint8, getUint16)
        );
        let kind = getUint8();
        while(kind > 0) {
          switch(kind) {
            case BinaryLoader.bonePropList["parentID"]:
              ret.parentID = getUint16();
              break;
            case BinaryLoader.bonePropList["isPin"]:
              ret.isPin = true;
              break;
            case BinaryLoader.bonePropList["feedback"]:
              ret.feedback = true;
              break;
            case BinaryLoader.bonePropList["strength"]:
              ret.strength = getFloat32();
              break;
            case BinaryLoader.bonePropList["maxAngle"]:
              ret.maxAngle = getFloat32() / 180 * Math.PI;
              break;
            case BinaryLoader.bonePropList["minAngle"]:
              ret.minAngle = getFloat32() / 180 * Math.PI;
              break;
          };
          kind = getUint8();
        }
        
        if(getUint8()) {
          ret.flexiPoint = {
            dataIndex: getUint8(),
            bones: getArray(getUint8, getUint16),
          };
        }
      } else {
        ret = new GroupObj(
          i,
          name,
          paths,
          getAction(()=>getArray(getUint8, getUint16)),
          maskIdToUse
        );
      }
      
      if(flexi.length > 0) {
        ret.flexi = flexi;
      }
      return ret;
    };
    
    
    // --acquisition processing--
    
    let pathContainer = PathCtr.initTarget = new PathContainer(getString(), getUint16(), getUint16());
    
    let actionListNum = getUint8();
    if(actionListNum > 0) {
      for(let i = 0; i < actionListNum; ++i) {
        let action = pathContainer.addAction(getString(), getUint8(), getUint16());
        if(getUint8()) {
          action.smartBoneID = getUint16();
          action.smartFrames = getUint16();
          action.startAngle = getFloat32() / 180 * Math.PI;
          action.endAngle = getFloat32() / 180 * Math.PI;
        }
      }
    }
    
    pathContainer.rootGroups = getArray(getUint8, getUint16);
    
    let groupsNum = getUint16();
    for(let i = 0; i < groupsNum; ++i) {
      PathCtr.debugPrint("count : " + i);
      PathCtr.debugPrint(i);
      PathCtr.debugPrint(sumLength);
      
      let group = getGroup(i);
      pathContainer.groups[i] = group;
      if(BoneObj.prototype.isPrototypeOf(group)) {
        pathContainer.bones.push(group.uid);
      }
      PathCtr.debugPrint(group);
    }
    
    return pathContainer;
  },
  
  /**
   * @param {String} filePath - binary file path
   * @param {Integer} index - paths layer index
   * @param {Function} completeFunc - callback when loading complete
   */
  load: function(filePath, index, completeFunc = null) {
    if(!filePath) {
      console.error("filePath not found");
      return;
    }
    let request = new XMLHttpRequest();
    request.onreadystatechange = function(e) {
      let target = e.target;
      if(target.readyState != 4) return;
      if((target.status != 200 && target.status != 0) || !target.response) {
        console.error("failed to read file: " + target.responseURL);
        console.error(target.statusText);
        return;
      }
      
      let buffer = request.response;
      let pathContainer = BinaryLoader.init(buffer);
      pathContainer.index = index;
      
      PathCtr.loadState("loading completed");
      
      if(!!completeFunc) {
        completeFunc();
      }
    };
    
    request.open("GET", filePath, true);
    request.responseType = "arraybuffer";
    request.send();
  },
};

