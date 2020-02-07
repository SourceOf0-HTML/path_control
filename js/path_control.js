var PathCtr = {
  
  defaultAction: "base",  // default action name
  initTarget: null,  // instance to be initialized
  currentFrame : 0,  // current frame
  currentActionName : "",  // current action name
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
    this.actionList = null;            // action name list
  },
  
  /**
   * GroupObj constructor
   */
  GroupObj: function(id, paths, childGroups, maskIdToUse) {
    this.id = id;                     // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.actionList = null;           // action name list
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
          // USEGE : path2D.moveTo(pos[1], pos[2])
          ret.push(["M", getX(), getY()]);
          break;
        case "C":
          // USEGE : path2D.bezierCurveTo(pos[1], pos[2], pos[3], pos[4], pos[5], pos[6])
          ret.push(["C", getX(), getY(), getX(), getY(), getX(), getY()]);
          break;
        case "Z":
          // USEGE : path2D.closePath()
          ret.push(["Z"]);
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
   * @param actionName : action name
   */
  addActionPath: function(path, pathDOM, style, frame, actionName) {
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
    } else if(!path.actionList) {
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
      actionName,
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
   * @param actionName : action name
   */
  addActionGroup: function(groupDOM, name, frame, actionName) {
    let targetGroup = this.initTarget.groups[this.initTarget.groupNameToIDList[name]];
    let childGroups = [];
    let dataIndex = 0;
    
    if(!!groupDOM) {
      let children = Array.prototype.slice.call(groupDOM.children);
      children.forEach(child=>{
        let name = child.tagName;
        switch(name) {
          case "path":
            this.addActionPath(targetGroup.paths[dataIndex++], child, window.getComputedStyle(child), frame, actionName);
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
        this.addActionPath(child, null, null, frame, actionName);
      });
    }
    targetGroup.addAction(childGroups, frame, actionName);
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
  addActionFromSvgList: function(pathContainer, groupsDOMList, actionName = this.defaultAction) {
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
      console.log("add action : " + frame);
      Object.keys(actionGroup).forEach(key=>{
        this.addActionGroup(targetDom.getElementById(key), key, frame, actionName);
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
      let a = getUint8();
      if(a == 0) {
        return "transparent";
      }
      let str = "rgb(" + getUint8() + ", " + getUint8() + ", " + getUint8() + ")";
      return str;
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
    
    let getAction=(func)=>{
      return getArray(getUint8, ()=>getArray(getUint16, ()=>func()));
    };
    
    let getPathData=()=>{
      let retNum = getUint16();
      let ret = [];
      for(let i = 0; i < retNum; ++i) {
        let type = getUint8();
        switch(type) {
          case 0:  // M
            ret.push(["M", getPos(), getPos()]);
            break;
          case 1:  // C
            ret.push(["C", getPos(), getPos(), getPos(), getPos(), getPos(), getPos()]);
            break;
          case 2:  // Z
            ret.push(["Z"]);
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
      
      let actionListNum = getUint8();
      
      if(actionListNum == 0) {
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
      
      let actionList = {};
      for(let i = 0; i < actionListNum; ++i) {
        actionList[getString()] = getUint8();
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
      pathObj.actionList = actionList;
      return pathObj;
    };
    
    let getGroup=i=>{
      let id = getString();
      pathContainer.groupNameToIDList[id] = i;
      
      let maskIdToUse = getUint16();
      let paths = getArray(getUint16, getPath);
      
      let actionListNum = getUint8();
      if(actionListNum == 0) {
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
      
      let actionList = {};
      let actionNameList = [];
      for(let i = 0; i < actionListNum; ++i) {
        let actionName = getString();
        actionList[actionName] = getUint8();
        actionNameList.push(actionName);
      }
      group.actionList = actionList;
      
      group.childGroups = getAction(()=>getArray(getUint8, getUint16));
      return group;
    };
    
    
    // --acquisition processing--
    
    pathContainer.originalWidth = pathContainer.displayWidth = getUint16();
    pathContainer.originalHeight = pathContainer.displayHeight = getUint16();
    
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
      let arr = [].map.call(str, c=>setUint16(c.charCodeAt(0)));
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
      pathDataList.forEach(posData=>{
        switch(posData[0]) {
          case "M":
            setUint8(0);
            setPos(posData[1]);
            setPos(posData[2]);
            break;
          case "C":
            setUint8(1);
            for(let i = 1; i < 7; ++i) {
              setPos(posData[i]);
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
      if(!path.actionList) {
        setUint8(0);
        setFloat32(path.lineWidth);
        setColor(path.fillStyle);
        setColor(path.strokeStyle);
        setPathData(path.pathDataList);
        return;
      }
      setUint8(Object.keys(path.actionList).length);
      Object.keys(path.actionList).forEach(key=>{
        setString(key);
        setUint8(path.actionList[key]);
      });
      
      setAction(path.lineWidth, setFloat32);
      setAction(path.fillStyle, setColor);
      setAction(path.strokeStyle, setColor);
      setAction(path.pathDataList, setPathData);
    };
    
    let setGroup=group=>{
      setString(group.id);
      setUint16(group.maskIdToUse);
      setArray(group.paths, setUint16, setPath);
      
      if(!group.actionList) {
        setUint8(0);
        setArray(group.childGroups, setUint8, setUint16);
        return;
      }
      
      setUint8(Object.keys(group.actionList).length);
      Object.keys(group.actionList).forEach(key=>{
        setString(key);
        setUint8(group.actionList[key]);
      });
      
      setAction(group.childGroups, childGroups=>{
        setArray(childGroups, setUint8, setUint16);
      });
    };
    
    
    // -- storage processing --
    
    setUint16(pathContainer.originalWidth);
    setUint16(pathContainer.originalHeight);
    
    setArray(pathContainer.rootGroups, setUint8, setUint16);
    
    let groupsNum = pathContainer.groups.length;
    setUint16(groupsNum);
    pathContainer.groups.forEach(group=>{
      console.log("count : " + groupsNum--);
      PathCtr.debugPrint(sumLength);
      setGroup(group);
      PathCtr.debugPrint(group);
    });
    
    return buffer.slice(0, sumLength);
  },
};

PathCtr.PathObj.prototype = {
  
  /**
   * PathObj (after add action data)
   */
  addAction: function(pathDataList, fillRule, fillStyle, lineWidth, strokeStyle, frame, actionName) {
    if( !actionName ) {
      console.error("please specify a action name");
      return;
    }
    
    if( !this.actionList ) {
      // init action data
      this.pathDataList = [[this.pathDataList]];  // path data array
      this.fillStyle = [[this.fillStyle]];        // fillColor ( context2D.fillStyle )
      this.lineWidth = [[this.lineWidth]];        // strokeWidth ( context2D.lineWidth )
      this.strokeStyle = [[this.strokeStyle]];    // strokeColor ( context2D.strokeStyle )
      this.actionList = {};                       // action name list
      this.actionList[PathCtr.defaultAction] = 0;
    }
    if( !this.actionList.hasOwnProperty(actionName) ) {
      let actionID = Object.keys(this.actionList).length;
      this.actionList[actionName] = actionID;
      this.pathDataList[actionID] = [this.pathDataList[0][0]];
      this.fillStyle[actionID] = [this.fillStyle[0][0]];
      this.lineWidth[actionID] = [this.lineWidth[0][0]];
      this.strokeStyle[actionID] = [this.strokeStyle[0][0]];
    }
    let actionID = this.actionList[actionName];
    this.pathDataList[actionID][frame] = pathDataList;
    this.fillStyle[actionID][frame] = fillStyle;
    this.lineWidth[actionID][frame] = lineWidth;
    this.strokeStyle[actionID][frame] = strokeStyle;
  },
  
  /**
   * @param displayWidth : display width
   * @param displayHeight : display height
   * @param context : CanvasRenderingContext2D ( canvas.getContext("2d") )
   * @param path2D : Path2D
   * @param isMask : when true, draw as a mask
   */
  draw: function(displayWidth, displayHeight, context, path2D, isMask){
    let drawPath=posData=>{
      let i = 0;
      switch(posData[i]) {
        case "M":
          path2D.moveTo(posData[++i]*displayWidth, posData[++i]*displayHeight);
          break;
        case "C":
          path2D.bezierCurveTo(posData[++i]*displayWidth, posData[++i]*displayHeight, posData[++i]*displayWidth, posData[++i]*displayHeight, posData[++i]*displayWidth, posData[++i]*displayHeight);
          break;
        case "Z":
          path2D.closePath();
          break;
        default:
          console.error("unknown type");
          break;
      }
    };
    let drawStroke =(lineWidth, strokeStyle)=>{
      if( !lineWidth ) return;
      context.lineWidth = lineWidth;
      context.strokeStyle = strokeStyle;
      context.stroke(path2D);
    };
    let drawFill =(fillStyle)=>{
      context.fillStyle = fillStyle;
      context.fill(path2D, this.fillRule);
    };
    if( !!this.actionList ) {
      let actionID = this.actionList[PathCtr.currentActionName];
      if( !actionID ) actionID = 0;
      
      frame = Math.min(PathCtr.currentFrame, this.lineWidth[actionID].length);
      
      this.pathDataList[actionID][frame].forEach(drawPath);
      
      if(isMask) return;
      drawStroke(this.lineWidth[actionID][frame], this.strokeStyle[actionID][frame]);
      drawFill(this.fillStyle[actionID][frame]);
      return;
    }
    
    this.pathDataList.forEach(drawPath);
    
    if(isMask) return;
    
    drawStroke(this.lineWidth, this.strokeStyle);
    drawFill(this.fillStyle);
  },
}

PathCtr.GroupObj.prototype = {
  /**
   * GroupObj (after add action data)
   */
  addAction: function(childGroups, frame, actionName) {
    if( !actionName ) {
      console.error("please specify a action name");
      return;
    }
    if( childGroups.length == 0 ) return;
    if( !this.actionList ) {
      if( JSON.stringify(childGroups) == JSON.stringify(this.childGroups) ) return;
      
      // init action data
      this.childGroups = [[this.childGroups]];   // list of group id
      this.actionList = {};                      // action name list
      this.actionList[PathCtr.defaultAction] = 0;
    }
    if( !this.actionList.hasOwnProperty(actionName) ) {
      let actionID = Object.keys(this.actionList).length;
      this.actionList[actionName] = actionID;
      this.childGroups[actionID] = [this.childGroups[0][0].concat()];
    }
    this.childGroups[this.actionList[actionName]][frame] = childGroups;
  },
  
  /**
   * @return group id array
   */
  getChildGroups: function() {
    if( this.childGroups.length == 0 ) return this.childGroups;
    if( !this.actionList ) {
      return this.childGroups;
    }
    
    let actionID = this.actionList[PathCtr.currentActionName];
    
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
  draw: function(frame, actionName = PathCtr.defaultAction) {
    if(!this.rootGroups) {
      console.error("root groups is not found");
      return;
    }
    
    PathCtr.currentFrame = frame;
    PathCtr.currentActionName = actionName;
    
    let path2D = new Path2D();
    path2D.rect(0, 0, this.displayWidth, this.displayHeight);
    this.context.clip(path2D);
    path2D = null;
    
    this.rootGroups.forEach(id=>{
      this.drawGroup(this.groups[id], false);
    });
  },
};

