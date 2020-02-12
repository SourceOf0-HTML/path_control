var PathCtr = {
  
  defaultActionName : "base",  // default action name
  initTarget: null,  // instance to be initialized
  currentFrame : 0,  // current frame
  currentActionID : -1,  // current action ID
  binDataPosRange : 20000, // correction value of coordinates when saving to binary data
  
  isDebug : false,
  debugPrint: function() {
    if(!this.isDebug) return;
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
  
  /**
   * PathObj constructor (no action data)
   */
  PathObj: function(pathDataList, maskIdToUse, fillRule, fillStyle, lineWidth, strokeStyle) {
    this.maskIdToUse = maskIdToUse;    // ID of the mask to use
    this.pathDataList = pathDataList;  // path data array
    this.fillRule = fillRule;          // "nonzero" or "evenodd"
    this.fillStyle = fillStyle;        // fillColor ( context2D.fillStyle )
    this.lineWidth = lineWidth;        // strokeWidth ( context2D.lineWidth )
    this.strokeStyle = strokeStyle;    // strokeColor ( context2D.strokeStyle )
    this.hasActionList = [];           // if true, have action
  },
  
  /**
   * GroupObj constructor
   */
  GroupObj: function(id, paths, childGroups, maskIdToUse) {
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.hasActionList = [];          // if true, have action
  },
  
  /**
   * PathContainer constructor
   */
  PathContainer : function() {
    this.originalWidth = 0;       // original svg width
    this.originalHeight = 0;      // original svg height
    this.displayWidth = 0;        // display width
    this.displayHeight = 0;       // display height
    this.context = null;          // CanvasRenderingContext2D ( canvas.getContext("2d") )
    this.rootGroups = [];         // root group IDs
    this.groups = [];             // list of groups
    this.groupNameToIDList = {};  // list of group name and group ID
    this.masks = {};              // list of mask name and group ID
    this.actionList = null;       // action info list
  },
  
  /**
   * @param maskStr : mask attribute of element
   * @return string of mask group ID
   */
  getMaskId: function(maskStr) {
    if(!maskStr) return null;
    let maskID = maskStr.replace(/^url\(#/, "").replace(/\)$/, "");
    if(!!this.initTarget.masks[maskID]) {
      return this.initTarget.masks[maskID];
    }
    console.error("unknown mask name : " + maskStr);
    return null;
  },
  
  /**
   * @param dataDOM : d attribute of path element
   * @return list of path data
   */
  makePathDataList: function(dataDOM) {
    let ret = [];
    
    let data;
    if(dataDOM.indexOf(",") < 0) {
      data = dataDOM.split(/ /);
    } else {
      data = dataDOM.replace(/([MCZ])/g,",$1,").replace(/[^,]-/g,",-").split(/[, ]/);
    }
    
    let baseX = this.initTarget.originalWidth;
    let baseY = this.initTarget.originalHeight;
    let getX=()=>parseFloat(data.shift())/baseX;
    let getY=()=>parseFloat(data.shift())/baseY;
    
    while(data.length > 0) {
      let type = data.shift();
      switch(type) {
        case "M":
          // USEGE : path2D.moveTo(pos[0], pos[1])
          ret.push({type:"M", pos:[getX(), getY()]});
          break;
        case "C":
          // USEGE : path2D.bezierCurveTo(pos[0], pos[1], pos[2], pos[3], pos[4], pos[5])
          ret.push({type:"C", pos:[getX(), getY(), getX(), getY(), getX(), getY()]});
          break;
        case "Z":
          // USEGE : path2D.closePath()
          ret.push({type:"Z"});
          break;
        case "":
          // do nothing.
          break;
        default:
          console.error("unknown type : " + type);
          console.log(type);
          break;
      }
    }
    return ret;
  },
  
  /**
   * @param pathDOM : path element
   * @param style   : CSSStyleDeclaration ( window.getComputedStyle(pathDOM) )
   * @return PathObj
   */
  makePath: function(pathDOM, style) {
    //PathCtr.debugPrint("makePath");
    //PathCtr.debugPrint(style.fill);
    let fillStyle = style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    let lineWidth = 0;
    let strokeStyle = style.stroke;
    if(strokeStyle == "none") {
      lineWidth = parseFloat(style.strokeWidth.match(/([\d\.]+)/)[1]);
      strokeStyle = "transparent";
    }
    return new this.PathObj(
      this.makePathDataList(pathDOM.getAttribute("d")),
      this.getMaskId(pathDOM.getAttribute("mask")),
      style.fillRule,
      fillStyle,
      lineWidth,
      strokeStyle,
    );
  },
  
  /**
   * @param path : PathObj
   * @param pathDOM : path element
   * @param style : CSSStyleDeclaration ( window.getComputedStyle(pathDOM) )
   * @param frame : frame number
   * @param actionID : action ID
   */
  addActionPath: function(path, pathDOM, style, frame, actionID) {
    let fillRule = (!pathDOM)? "nonzero" : style.fillRule;
    let fillStyle = (!pathDOM)? "none" : style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    let lineWidth = 0;
    let strokeStyle = (!pathDOM)? "none" : style.stroke;
    if(strokeStyle == "none") {
      strokeStyle = "transparent";
    } else {
      lineWidth = parseFloat(style.strokeWidth.match(/([\d\.]+)/)[1]);
    }
    
    let pathDataList = null;
    if(!!pathDOM) {
      pathDataList = this.makePathDataList(pathDOM.getAttribute("d"));
    } else if(!path.hasActionList[actionID]) {
      pathDataList = path.pathDataList.concat();
    } else {
      pathDataList = path.pathDataList[0][0].concat();
    }
    
    path.addAction(
      pathDataList,
      fillRule,
      fillStyle,
      lineWidth,
      strokeStyle,
      frame,
      actionID,
    );
  },
  
  /**
   * @param groupDOM : group element
   * @return GroupObj
   */
  makeGroup: function(groupDOM) {
    let name = groupDOM.getAttribute("id");
    let paths = [];
    let childGroups = [];
    let children = Array.prototype.slice.call(groupDOM.children);
    
    children.forEach(child=>{
      let tagName = child.tagName;
      PathCtr.debugPrint("make group : " + name + " : " + tagName);
      switch(tagName) {
        case "path":
          paths.push( this.makePath(child, window.getComputedStyle(child)) );
          break;
        case "mask":
          // do nothing.
          break;
        case "clipPath":
          // TODO
          break;
        case "g":
          childGroups.push(this.initTarget.groupNameToIDList[child.getAttribute("id")]);
          this.makeGroup(child);
          break;
        default:
          console.error("unknown element");
          console.log(child);
          break;
      }
    });
    
    let ret = new this.GroupObj(
      name,
      paths,
      childGroups,
      this.getMaskId(groupDOM.getAttribute("mask"))
    );
    
    this.initTarget.groups[this.initTarget.groupNameToIDList[name]] = ret;
    
    return ret;
  },
  
  /**
   * @param groupDOM : group element
   * @param name : group name
   * @param frame : frame number
   * @param actionID : action ID
   */
  addActionGroup: function(groupDOM, name, frame, actionID) {
    let targetGroup = this.initTarget.groups[this.initTarget.groupNameToIDList[name]];
    let childGroups = [];
    let dataIndex = 0;
    
    if(!!groupDOM) {
      let children = Array.prototype.slice.call(groupDOM.children);
      children.forEach(child=>{
        let name = child.tagName;
        switch(name) {
          case "path":
            this.addActionPath(targetGroup.paths[dataIndex++], child, window.getComputedStyle(child), frame, actionID);
            break;
          case "mask":
          case "clipPath":
            break;
          case "g":
            childGroups.push(this.initTarget.groupNameToIDList[child.getAttribute("id")]);
            break;
          default:
            console.error("unknown element");
            console.log(child);
            break;
        }
      });
    } else {
      let children = Array.prototype.slice.call(targetGroup.paths);
      children.forEach(child=>{
        this.addActionPath(child, null, null, frame, actionID);
      });
    }
    targetGroup.addAction(childGroups, frame, actionID);
  },
  
  /**
   * @param groupsDOM : group elements
   * @return PathContainer
   */
  initFromSvg: function(groupsDOM) {
    if(!groupsDOM) {
      console.error("groups dom is not found");
      return null;
    }
    
    console.log("init");
    
    let pathContainer = this.initTarget = new this.PathContainer();
    
    pathContainer.originalWidth = pathContainer.displayWidth = parseInt(groupsDOM.getAttribute("width").replace("px", ""));
    pathContainer.originalHeight = pathContainer.displayHeight = parseInt(groupsDOM.getAttribute("height").replace("px", ""));
    
    let groups = Array.prototype.slice.call(groupsDOM.getElementsByTagName("g"));
    groups.forEach(group=>{
      let name = group.getAttribute("id");
      if(pathContainer.groupNameToIDList[name] != null) {
        console.error("group ID is duplicated : " + name);
        return;
      }
      pathContainer.groupNameToIDList[name] = Object.keys(pathContainer.groupNameToIDList).length;
    });
    
    let masks = Array.prototype.slice.call(groupsDOM.getElementsByTagName("mask"));
    masks.forEach(mask=>{
      let maskChildren = Array.prototype.slice.call(mask.children);
      maskChildren.forEach(child=>{
        if( child.tagName == "use" ) {
          pathContainer.masks[mask.getAttribute("id")] = pathContainer.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
        } else {
          console.error("unknown mask data");
          console.log(child);
        }
      });
    });
    
    let children = Array.prototype.slice.call(groupsDOM.children);
    children.forEach(child=>{
      if(child.tagName != "g") return;
      let group = this.makeGroup(child);
      pathContainer.rootGroups.push(pathContainer.groupNameToIDList[group.id]);
    });
    this.initTarget = null;
    
    return pathContainer;
  },
  
  /**
   * @param pathContainer : PathContainer
   * @param groupsDOMList : group elements array
   * @param actionName : action name
   */
  addActionFromSvgList: function(pathContainer, groupsDOMList, actionID = 0) {
    if(!pathContainer) {
      console.error("path container is not found");
      return;
    }
    if(!groupsDOMList) {
      console.error("groups dom list is not found");
      return;
    }
    
    this.initTarget = pathContainer;
    
    console.log("check id");
    let actionGroup = {};
    let groupsDOMArr = Array.prototype.slice.call(groupsDOMList);
    let baseDom = groupsDOMArr[0];
    let baseGroups = baseDom.getElementsByTagName("g");
    let frame = 0;
    groupsDOMArr.forEach(targetDom=>{
      let targetGroups = targetDom.getElementsByTagName("g");
      let targetIds = [].map.call(targetGroups, group=>group.getAttribute("id"));
      Array.prototype.forEach.call(targetIds, id=>{
        if(pathContainer.groupNameToIDList[id] != null) return;
        pathContainer.groupNameToIDList[id] = Object.keys(pathContainer.groupNameToIDList).length;
        this.makeGroup(targetDom.getElementById(id));
      });
      let masks = Array.prototype.slice.call(targetDom.getElementsByTagName("mask"));
      masks.forEach(mask=>{
        let maskID = mask.getAttribute("id");
        if(pathContainer.masks[maskID]) return;
        let maskChildren = Array.prototype.slice.call(mask.children);
        maskChildren.forEach(child=>{
          if( child.tagName == "use" ) {
            pathContainer.masks[maskID] = pathContainer.groupNameToIDList[child.getAttribute("xlink:href").slice(1)];
          } else {
            console.error("unknown mask data");
            console.log(child);
          }
        });
      });
    });
    
    console.log(pathContainer);
    console.log("check diff");
    groupsDOMArr.forEach(targetDom=>{
      Object.keys(pathContainer.groupNameToIDList).forEach(name=>{
        let base = baseDom.getElementById(name);
        if( !base || !targetDom || !base.isEqualNode(targetDom.getElementById(name)) ) {
          actionGroup[name] = true;
        }
      });
    });
    
    groupsDOMArr.forEach((targetDom, frame)=>{
      if(frame == 0) return;
      console.log("add action : " + actionID + " - " + frame);
      Object.keys(actionGroup).forEach(key=>{
        this.addActionGroup(targetDom.getElementById(key), key, frame, actionID);
      });
    });
    
    this.initTarget = null;
  },
  
  /**
   * @param buffer : ArrayBuffer
   * @return PathContainer
   */
  initFromBin: function(buffer) {
    if(!buffer) {
      console.error("array buffer is not found");
      return null;
    }
    let pathContainer = new this.PathContainer();
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare getting function --
    
    let getUint8  =()=>{let ret = dv.getUint8(sumLength); sumLength += 1; return ret};
    let getUint16 =()=>{let ret = dv.getUint16(sumLength); sumLength += 2; return ret};
    let getUint32 =()=>{let ret = dv.getUint32(sumLength); sumLength += 4; return ret};
    let getFloat32=()=>{let ret = dv.getFloat32(sumLength); sumLength += 4; return ret};
    let getPos    =()=>{let ret = dv.getInt16(sumLength)/this.binDataPosRange; sumLength += 2; return ret};
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
        return new this.PathObj(
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
      
      let pathObj = new this.PathObj(
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
      let id = getString();
      pathContainer.groupNameToIDList[id] = i;
      
      let maskIdToUse = getUint16();
      let paths = getArray(getUint16, getPath);
      
      let hasAction = getUint8();
      if(!hasAction) {
        let childGroups = getArray(getUint8, getUint16);
        
        let group = new this.GroupObj(
          id,
          paths,
          childGroups,
          maskIdToUse
        );
        return group;
      }
      
      let group = new this.GroupObj(
        id,
        paths,
        [],
        maskIdToUse
      );
      
      group.childGroups = getAction(()=>getArray(getUint8, getUint16));
      group.childGroups.forEach((val, i)=>(group.hasActionList[i] = true));
      
      return group;
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
      PathCtr.debugPrint(pathContainer.groups[i]);
    }
    
    return pathContainer;
  },
  
  /**
   * @param pathContainer : PathContainer
   * @return ArrayBuffer
   */
  dataTobin: function(pathContainer) {
    if(!pathContainer) {
      console.error("path container is not found");
      return null;
    }
    
    let buffer = new ArrayBuffer(1000000000);
    let dv = new DataView(buffer);
    let sumLength = 0;
    
    // -- prepare setting function --
    let setUint8  =val=>{dv.setUint8(sumLength, val); sumLength += 1};
    let setUint16 =val=>{dv.setUint16(sumLength, val); sumLength += 2};
    let setUint32 =val=>{dv.setUint32(sumLength, val); sumLength += 4};
    let setFloat32=val=>{dv.setFloat32(sumLength, val); sumLength += 4};
    let setPos    =val=>{dv.setInt16(sumLength, val*this.binDataPosRange); sumLength += 2};
    let setString=str=>{
      setUint8(str.length);
      [].map.call(str, c=>setUint16(c.charCodeAt(0)));
    };
    let setColor=str=>{
      if(str == "transparent") {
        setUint8(0);  // A
      } else {
        let colorArr = str.match(/(\d+), (\d+), (\d+)/);
        setUint8(1);  // A
        setUint8(colorArr[1]);  // R
        setUint8(colorArr[2]);  // G
        setUint8(colorArr[3]);  // B
      }
    };
    let setArray=(arr, lengFunc, setFunc)=>{
      let num = arr.length;
      lengFunc(num);
      for(let i = 0; i < num;) {
        let val = arr[i];
        let j = 1;
        if(typeof(val) == "undefined") {
          setUint16(0);
          for(; j < num; ++j) {
            if(typeof(arr[i + j]) != "undefined") break;
          }
          setUint16(j);
          i += j;
          continue;
        }
        for(; j < num; ++j) {
          if(typeof(arr[i + j]) == "undefined" || JSON.stringify(val) != JSON.stringify(arr[i + j])) break;
        }
        setUint16(j);
        i += j;
        setFunc(val);
      }
    };
    
    let setAction=(ids, func)=>{
      setArray(ids, setUint8, frames=>{
        setArray(frames, setUint16, func);
      });
    };
    
    let setPathData=pathDataList=>{
      setUint16(pathDataList.length);
      pathDataList.forEach(d=>{
        switch(d.type) {
          case "M":
            setUint8(0);
            setPos(d.pos[0]);
            setPos(d.pos[1]);
            break;
          case "C":
            setUint8(1);
            for(let i = 0; i < 6; ++i) {
              setPos(d.pos[i]);
            }
            break;
          case "Z":
            setUint8(2);
            break;
          default:
            console.error("unknown type");
            console.log(d);
            break;
        }
      });
    };
    
    let setPath=path=>{
      setUint16(path.maskIdToUse);
      setUint8(path.fillRule == "nonzero" ? 0 : 1);
      
      let hasAction = (path.hasActionList.length > 0);
      if(!hasAction) {
        setUint8(0);
        setFloat32(path.lineWidth);
        setColor(path.fillStyle);
        setColor(path.strokeStyle);
        setPathData(path.pathDataList);
        return;
      }
      setUint8(1);
      
      setAction(path.lineWidth, setFloat32);
      setAction(path.fillStyle, setColor);
      setAction(path.strokeStyle, setColor);
      setAction(path.pathDataList, setPathData);
    };
    
    let setGroup=group=>{
      setString(group.id);
      setUint16(group.maskIdToUse);
      setArray(group.paths, setUint16, setPath);
      
      let hasAction = (group.hasActionList.length > 0);
      if(!hasAction) {
        setUint8(0);
        setArray(group.childGroups, setUint8, setUint16);
        return;
      }
      setUint8(1);
      
      setAction(group.childGroups, childGroups=>{
        setArray(childGroups, setUint8, setUint16);
      });
    };
    
    
    // -- storage processing --
    
    setUint16(pathContainer.originalWidth);
    setUint16(pathContainer.originalHeight);
    
    setUint8(Object.keys(pathContainer.actionList).length);
    Object.keys(pathContainer.actionList).forEach(key=>{
      setString(key);
      setUint8(pathContainer.actionList[key].id);
      setUint16(pathContainer.actionList[key].totalFrames);
    });
    
    setArray(pathContainer.rootGroups, setUint8, setUint16);
    
    let groupsNum = pathContainer.groups.length;
    setUint16(groupsNum);
    pathContainer.groups.forEach(group=>{
      console.log("count : " + groupsNum--);
      PathCtr.debugPrint(sumLength);
      setGroup(group);
      PathCtr.debugPrint(group);
    });
    
    delete dv;
    return buffer.slice(0, sumLength);
  },
  
  /**
   * @param fileInfoList : [ [ filePath, totalFrames, actionName ], ... ]
   * @param completeFunc : callback when loading complete
   */
  svgFilesLoad: function(fileInfoList, completeFunc) {
    if(!fileInfoList || !Array.isArray(fileInfoList) || !Array.isArray(fileInfoList[0])) {
      console.error("fileInfoList format is woring");
      console.log(fileInfoList);
      return;
    }
    if(fileInfoList[0][2] != PathCtr.defaultActionName) {
      console.error("action name \"" + PathCtr.defaultActionName + "\" is missing in fileInfoList");
      return;
    }
    
    let pathContainer = null;
    let fileIndex = 0;
    let domList = [];
    let getFrameNum=i=>("00000".substr(0, 5 - i.toString().length) + i + ".svg");
    
    let loadFile=fileInfo=>{
      let filePath = fileInfo[0];
      let totalFrames = fileInfo[1];
      let actionName = fileInfo[2];
      
      let loadFrame = 1;
      let request = new XMLHttpRequest();
      let loadSVG = request.onload = function(e) {
        let target = e.target;
        if(target.readyState != 4) return;
        if(target.status != 200 && target.status != 0) return;
        
        let ret = target.responseText;
        let div = document.createElement("div");
        div.setAttribute("style", "display:none;");
        div.innerHTML = ret;
        let svg = div.firstElementChild;
        document.body.append(div);
        domList[parseInt(ret.match(/id="Frame_(\d+)"/)[1]) - 1] = svg;
        div = svg = null;
        
        delete request;
        if(loadFrame <= totalFrames) {
          console.log("load file : " + loadFrame);
          request = new XMLHttpRequest();
          request.open("GET", filePath + getFrameNum(loadFrame++), true);
          request.onreadystatechange = loadSVG;
          request.send();
          return;
        }
        
        if(!pathContainer) {
          pathContainer = PathCtr.initFromSvg(domList[0]);
          pathContainer.actionList = {};
        }
        
        let actionID = Object.keys(pathContainer.actionList).length;
        
        pathContainer.actionList[actionName] = {
          id : actionID,
          totalFrames : totalFrames,
        };
        
        PathCtr.addActionFromSvgList(pathContainer, domList, actionID);
        console.log("loading completed");
        console.log(pathContainer);
        
        domList.forEach(dom=>dom.parentNode.remove());
        domList.length = 0;
        
        if(++fileIndex < fileInfoList.length) {
          loadFile(fileInfoList[fileIndex]);
        } else {
          completeFunc(pathContainer);
        }
      };
      request.open("GET", filePath + getFrameNum(loadFrame++), true);
      request.send();
    };
    
    loadFile(fileInfoList[fileIndex]);
  },
  
  /**
   * @param filePath : binary file path
   * @param completeFunc : callback when loading complete
   */
  binFileLoad: function(filePath, completeFunc) {
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
      let pathContainer = PathCtr.initFromBin(buffer);
      console.log("loading completed");
      
      completeFunc(pathContainer);
    };
    request.open("GET", filePath, true);
    request.responseType = "arraybuffer";
    request.send();
  },
};

PathCtr.PathObj.prototype = {
  
  /**
   * PathObj (after add action data)
   */
  addAction: function(pathDataList, fillRule, fillStyle, lineWidth, strokeStyle, frame, actionID) {
    if( this.hasActionList.length == 0 ) {
      // init action data
      this.pathDataList = [[this.pathDataList]];  // path data array
      this.fillStyle = [[this.fillStyle]];        // fillColor ( context2D.fillStyle )
      this.lineWidth = [[this.lineWidth]];        // strokeWidth ( context2D.lineWidth )
      this.strokeStyle = [[this.strokeStyle]];    // strokeColor ( context2D.strokeStyle )
      this.hasActionList[0] = true;
    }
    if( !this.hasActionList[actionID] ) {
      this.pathDataList[actionID] = [this.pathDataList[0][0]];
      this.fillStyle[actionID] = [this.fillStyle[0][0]];
      this.lineWidth[actionID] = [this.lineWidth[0][0]];
      this.strokeStyle[actionID] = [this.strokeStyle[0][0]];
      this.hasActionList[actionID] = true;
    }
    this.pathDataList[actionID][frame] = pathDataList;
    this.fillStyle[actionID][frame] = fillStyle;
    this.lineWidth[actionID][frame] = lineWidth;
    this.strokeStyle[actionID][frame] = strokeStyle;
  },
  
  /**
   * @param displayWidth : display width
   * @param displayHeight : display height
   * @param path2D : Path2D
   * @param d : PathData
   */
  drawPath: function(displayWidth, displayHeight, path2D, d) {
    let pos = d.pos;
    switch(d.type) {
      case "M":
        path2D.moveTo(pos[0]*displayWidth, pos[1]*displayHeight);
        break;
      case "C":
        path2D.bezierCurveTo(pos[0]*displayWidth, pos[1]*displayHeight, pos[2]*displayWidth, pos[3]*displayHeight, pos[4]*displayWidth, pos[5]*displayHeight);
        break;
      case "Z":
        path2D.closePath();
        break;
      default:
        console.error("unknown type");
        break;
    }
  },
  
  /**
   * @param context : CanvasRenderingContext2D ( canvas.getContext("2d") )
   * @param path2D : Path2D
   * @param lineWidth : strokeWidth ( context2D.lineWidth )
   * @param displayHeight : strokeColor ( context2D.strokeStyle )
   */
  drawStroke: function(context, path2D, lineWidth, strokeStyle) {
    if( !lineWidth ) return;
    context.lineWidth = lineWidth;
    context.strokeStyle = strokeStyle;
    context.stroke(path2D);
  },
  
  /**
   * @param context : CanvasRenderingContext2D ( canvas.getContext("2d") )
   * @param path2D : Path2D
   * @param fillStyle : strokeColor ( context2D.strokeStyle )
   */
  drawFill: function(context, path2D, fillStyle) {
    context.fillStyle = fillStyle;
    context.fill(path2D, this.fillRule);
  },
  
  /**
   * @param displayWidth : display width
   * @param displayHeight : display height
   * @param context : CanvasRenderingContext2D ( canvas.getContext("2d") )
   * @param path2D : Path2D
   * @param isMask : when true, draw as a mask
   */
  draw: function(displayWidth, displayHeight, context, path2D, isMask) {
    let actionID = PathCtr.currentActionID;
    let frame = PathCtr.currentFrame;
    
    if( this.hasActionList.length == 0) {
      this.pathDataList.forEach(d=>this.drawPath(displayWidth, displayHeight, path2D, d));
      if(isMask) return;
      this.drawStroke(context, path2D, this.lineWidth, this.strokeStyle);
      this.drawFill(context, path2D, this.fillStyle);
      return;
    } else if( !this.hasActionList[actionID] ) {
      actionID = 0;
      frame = 0;
    }
    
    this.pathDataList[actionID][Math.min(frame, this.pathDataList[actionID].length)].forEach(d=>this.drawPath(displayWidth, displayHeight, path2D, d));
    if(isMask) return;
    this.drawStroke(context, path2D, this.lineWidth[actionID][Math.min(frame, this.lineWidth[actionID].length)], this.strokeStyle[actionID][Math.min(frame, this.strokeStyle[actionID].length)]);
    this.drawFill(context, path2D, this.fillStyle[actionID][Math.min(frame, this.fillStyle[actionID].length)]);
  },
}

PathCtr.GroupObj.prototype = {
  /**
   * GroupObj (after add action data)
   */
  addAction: function(childGroups, frame, actionID) {
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
  },
  
  /**
   * @return group id array
   */
  getChildGroups: function() {
    if( this.childGroups.length == 0 ) return this.childGroups;
    if( this.hasActionList.length == 0 ) {
      return this.childGroups;
    }
    
    let actionID = PathCtr.currentActionID;
    
    if( this.childGroups[actionID] == null || this.childGroups[actionID][PathCtr.currentFrame] == null ) {
      return this.childGroups[0][0];
    }
    
    return this.childGroups[actionID][PathCtr.currentFrame];
  },
}

PathCtr.PathContainer.prototype = {
  
  /**
   * @param width : reference width
   * @param height : reference height
   */
  setFitSize: function(width, height) {
    if(this.originalWidth > this.originalHeight) {
      this.displayWidth = width;
      this.displayHeight = width * this.originalHeight/this.originalWidth;
    } else {
      this.displayWidth = height * this.originalWidth/this.originalHeight;
      this.displayHeight = height;
    }
  },
  
  /**
   * @param group  : GroupObj to be draw
   * @param isMask : when true, draw as a mask
   */
  drawGroup: function(group, isMask) {
    if(!this.context) {
      console.error("context is not found");
      return;
    }
    
    let isFoundMask = false;
    
    if(!isMask && !!group.maskIdToUse) {
      let mask = this.groups[group.maskIdToUse];
      if(!!mask) {
        isFoundMask = true;
        this.context.save();
        this.drawGroup(mask, true);
      } else {
        console.error("group is not found : " + group.maskIdToUse);
      }
    }
    
    let path2D = isMask? (new Path2D()):null;
    let isUsed = false;
    
    group.paths.forEach(path=>{
      
      isUsed = true;
      
      let isFoundMaskPath = false;
      
      if(!isMask && !!path.maskIdToUse) {
        let maskPath = this.groups[path.maskIdToUse];
        if(!!maskPath) {
          isFoundMaskPath = true;
          this.context.save();
          this.drawGroup(maskPath, true);
        } else {
          console.error("mask is not found : " + path.maskIdToUse);
        }
      }
      
      if(!isMask) {
        path2D = new Path2D();
      }
      
      path.draw(this.displayWidth, this.displayHeight, this.context, path2D, isMask);
      
      if(isFoundMaskPath) {
        this.context.restore();
      }
    });
    
    group.getChildGroups().forEach(childGroup=>{
      this.drawGroup(this.groups[childGroup], isMask);
    });
    
    if(isMask && isUsed) {
      this.context.clip(path2D);
    }
    
    path2D = null;
    
    if(isFoundMask) {
      this.context.restore();
    }
  },
  
  /**
   * @param frame : frame number
   * @param actionName : action name
   */
  draw: function(frame, actionName = PathCtr.defaultActionName) {
    if(!this.rootGroups) {
      console.error("root groups is not found");
      return;
    }
    
    PathCtr.currentFrame = frame;
    PathCtr.currentActionID = Object.keys(this.actionList).indexOf(actionName);
    
    let path2D = new Path2D();
    path2D.rect(0, 0, this.displayWidth, this.displayHeight);
    this.context.clip(path2D);
    path2D = null;
    
    this.rootGroups.forEach(id=>{
      this.drawGroup(this.groups[id], false);
    });
  },
};

