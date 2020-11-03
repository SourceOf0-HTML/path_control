/**
 * DebugPath
 * Singleton
 */
var DebugPath = {
  isStop: false,
  isStep: false,
  isShowBones: false,
  
  bonePointSize: 2,
  boneLineSize: 2,
  boneColor: "rgb(0, 255, 0)",
  strengthPointColor: "rgba(0, 255, 0, 0.005)",
  strengthLineColor: "rgba(0, 255, 0, 0.2)",
  
  isShowPoints: false,
  pointSize: 2,
  pointColor: "rgb(255, 0, 0)",
  
  isShowControls: false,
  controlSize: 1,
  controlColor: "rgb(255, 255, 0)",
  
  actionIndex: 0,
  
  /**
   * @param {PathContainer} pathContainer
   */
  init: function(pathContainer) {
    // do nothing.
  },
  
  /**
   * @param {PathContainer} pathContainer
   * @param {String} code - code when fired keyup event
   */
  keyUp: function(pathContainer, code) {
    let setAction =name=> {
      console.log(name);
      pathContainer.setAction(name);
    };
    switch(code) {
      case "Space":
        this.isStop = !this.isStop;
        console.log(this.isStop? "--STOP--":"--START--");
        break;
      case "ArrowRight":
        this.isStep = true;
        break;
      case "ArrowDown":
        this.actionIndex = (this.actionIndex + 1) % pathContainer.actionList.length;
        setAction(pathContainer.actionList[this.actionIndex].name);
        break;
      case "ArrowUp":
        if(--this.actionIndex < 0) this.actionIndex = pathContainer.actionList.length - 1;
        setAction(pathContainer.actionList[this.actionIndex].name);
        break;
      case "KeyD":
        PathCtr.isOutputDebugPrint = !PathCtr.isOutputDebugPrint;
        break;
      case "KeyL":
        PathCtr.isOutputLoadState = !PathCtr.isOutputLoadState;
        break;
      case "KeyB":
        this.isShowBones = !this.isShowBones;
        break;
      case "KeyC":
        this.isShowControls = !this.isShowControls;
        break;
      case "KeyP":
        this.isShowPoints = !this.isShowPoints;
        break;
      case "KeyO":
        postMessage({cmd: "main-confirm", callback: "output-path-container", message: "現在の状態をJSONに出力します"});
        break;
    }
  },
  
  isDebugDraw: function() {
    return this.isShowBones || this.isShowPoints || this.isShowControls;
  },
  
  outputJSON: function(pathContainer) {
    postMessage({
      cmd: "main-download",
      type: "application/json",
      fileName: "pathContainer.json",
      data: JSON.stringify(pathContainer, (key, val)=>{
        if(key.includes("result")) return undefined;
        if(key.includes("current")) return undefined;
        if(key.includes("past")) return undefined;
        if(key == "m") return undefined;
        return val;
      }, 2),
    });
  },
  
  /**
   * @param {PathContainer} pathContainer
   * @return {ArrayBuffer}
   */
  toBin: function(pathContainer) {
    if(!pathContainer) {
      console.error("path container is not found");
      return null;
    }
    
    let buffer = new ArrayBuffer(1000000000);
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare setting function --
    let setUint8  =val=> {dv.setUint8(sumLength, val); sumLength += 1};
    let setUint16 =val=> {dv.setUint16(sumLength, val); sumLength += 2};
    let setUint32 =val=> {dv.setUint32(sumLength, val); sumLength += 4};
    let setFloat32=val=> {dv.setFloat32(sumLength, val); sumLength += 4};
    let setPos    =val=> {dv.setInt16(sumLength, val*BinaryLoader.binDataPosRange); sumLength += 2};
    let setString =str=> {
      setUint8(str.length);
      [].map.call(str, c=>setUint16(c.charCodeAt(0)));
    };
    let setColor =str=> {
      if(str == "transparent") {
        setUint8(0);  // A
      } else {
        let colorArr = str.match(/(\\d+), (\\d+), (\\d+)/);
        setUint8(1);  // A
        setUint8(colorArr[1]);  // R
        setUint8(colorArr[2]);  // G
        setUint8(colorArr[3]);  // B
      }
    };
    let setArray =(arr, setLengFunc, setFunc)=> {
      if(!Array.isArray(arr)) {
        setLengFunc(0);
        return;
      }
      let num = arr.length;
      setLengFunc(num);
      for(let i = 0; i < num;) {
        let val = arr[i];
        let j = 1;
        if(typeof val === "undefined") {
          setUint16(0);
          for(; j < num; ++j) {
            if(typeof arr[i + j] !== "undefined") break;
          }
          setUint16(j);
          i += j;
          continue;
        }
        for(; j < num; ++j) {
          if(typeof arr[i + j] === "undefined" || JSON.stringify(val) != JSON.stringify(arr[i + j])) break;
        }
        setUint16(j);
        i += j;
        setFunc(val);
      }
    };
    
    let setAction =(actionContainer, func)=> {
      if(actionContainer.hasAction) {
        setUint8(1);
        setArray(actionContainer.data, setUint8, frames=> {
          setArray(frames, setUint16, func);
        });
      } else {
        setUint8(0);
        func(actionContainer.data);
      }
    };
    
    let setPathData =pathDataList=> {
      setUint16(pathDataList.length);
      pathDataList.forEach(d=>{
        switch(d.type) {
          case "M":
            setUint8(0);
            setPos(d.pos[0]);
            setPos(d.pos[1]);
            break;
          case "L":
            setUint8(1);
            setPos(d.pos[0]);
            setPos(d.pos[1]);
            break;
          case "C":
            setUint8(2);
            for(let i = 0; i < 6; ++i) {
              setPos(d.pos[i]);
            }
            break;
          case "Z":
            setUint8(3);
            break;
          default:
            console.error("unknown type");
            break;
        }
      });
    };
    
    let setPathDiff =pathDiff=> {
      setArray(pathDiff, setUint16, posArray=> {
        setArray(posArray, setUint16, setPos);
      });
    };
    
    let setPath =path=> {
      setUint16(path.maskIdToUse == null? 0 : path.maskIdToUse+1);
      setUint8(path.fillRule == "nonzero" ? 0 : 1);
      
      setPathData(path.defPathList);
      
      setAction(path.lineWidth, setFloat32);
      setAction(path.fillStyle, setColor);
      setAction(path.strokeStyle, setColor);
      setAction(path.pathDiffList, setPathDiff);
    };
    
    let setGroup =group=> {
      setString(group.id);
      setUint16(group.maskIdToUse == null? 0 : group.maskIdToUse+1);
      setArray(group.paths, setUint16, setPath);
      setArray(group.flexi, setUint8, setUint16);
      
      if(BoneObj.prototype.isPrototypeOf(group)) {
        setArray(group.childGroups, setUint8, setUint16);
        Object.keys(BinaryLoader.bonePropList).map(propName=> {
          if(!(propName in group)) return;
          setUint8(BinaryLoader.bonePropList[propName]);
          switch(propName) {
            case "parentID": setUint16(group.parentID); break;
            case "isPin": break;
            case "fixed": break;
            case "strength": setFloat32(group.strength); break;
            case "maxAngle": setFloat32(group.maxAngle / Math.PI * 180); break;
            case "minAngle": setFloat32(group.minAngle / Math.PI * 180); break;
          };
        });
        setUint8(0);
        
        if(!!group.flexiPoint) {
          setUint8(1);
          setUint8(group.flexiPoint.dataIndex);
          setArray(group.flexiPoint.bones, setUint8, setUint16);
        } else {
          setUint8(0);
        }
      } else {
        setAction(group.childGroups, childGroups=> {
          setArray(childGroups, setUint8, setUint16);
        });
      }
    };
    
    
    // -- storage processing --
    
    setString(pathContainer.name);
    setUint16(pathContainer.originalWidth);
    setUint16(pathContainer.originalHeight);
    
    setUint8(pathContainer.actionList.length);
    pathContainer.actionList.forEach(action=> {
      setString(action.name);
      setUint8(action.id);
      setUint16(action.totalFrames);
      if("smartBoneID" in action) {
        setUint8(1);
        setUint16(action.smartBoneID);
        setUint16(action.smartFrames);
        setFloat32(action.startAngle / Math.PI * 180);
        setFloat32(action.endAngle / Math.PI * 180);
      } else {
        setUint8(0);
      }
    });
    
    setArray(pathContainer.rootGroups, setUint8, setUint16);
    
    let groupsNum = pathContainer.groups.length;
    setUint16(groupsNum);
    pathContainer.groups.forEach(group=>{
      PathCtr.loadState("count : " + groupsNum--);
      setGroup(group);
    });
    
    dv = null;
    return buffer.slice(0, sumLength);
  },
  
  /**
   * @param {PathContainer} pathContainer
   */
  outputBin: function(pathContainer) {
    if(!pathContainer) return;
    let data = this.toBin(pathContainer);
    postMessage({
      cmd: "main-download",
      type: "octet/stream",
      fileName: "path_data.bin",
      data: data,
    }, [data]);
  },
};
