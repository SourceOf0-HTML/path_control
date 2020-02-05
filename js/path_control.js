var PathCtr = {
  
  defaultAction: "base",  // default action name
  initTarget: null,  // instance to be initialized
  currentFrame : 0,  // current frame
  currentActionName : "",  // current action name
  binDataPosRange : 20000, // correction value of coordinates when saving to binary data
  
  isDebug : false,
  debugPrint: function() {
    if(!this.isDebug) return;
    for(var i = 0; i < arguments.length; ++i) {
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
    this.id = id;      // g tag ID
    this.paths = paths;               // list of PathObj
    this.childGroups = childGroups;   // list of group id
    this.maskIdToUse = maskIdToUse;   // ID of the mask to use
    this.actionList = null;           // action name list
  },
  
  /**
   * PathContainer constructor
   */
  PathContainer : function() {
    this.originalWidth = 0;   // original svg width
    this.originalHeight = 0;  // original svg height
    this.displayWidth = 0;    // display width
    this.displayHeight = 0;   // display height
    this.context = null;      // CanvasRenderingContext2D ( canvas.getContext("2d") )
    this.rootGroups = [];     // root group IDs
    this.groups = {};         // list of groups
    this.masks = {};          // list of defined mask IDs
  },
  
  /**
   * @param maskStr : mask attribute of element
   * @return string of mask ID
   */
  getMaskId: function(maskStr) {
    if(!maskStr) {
      return "";
    } else {
      return maskStr.replace(/^url\(#/, "").replace(/\)$/, "");
    }
  },
  
  /**
   * @param dataDOM : d attribute of path element
   * @return list of path data
   */
  makePathDataList: function(dataDOM) {
    var ret = [];
    
    var data;
    if(dataDOM.indexOf(",") < 0) {
      data = dataDOM.split(/ /);
    } else {
      data = dataDOM.replace(/([MCZ])/g,",$1,").replace(/[^,]-/g,",-").split(/[, ]/);
    }
    
    var baseX = this.initTarget.originalWidth;
    var baseY = this.initTarget.originalHeight;
    var getX=()=>parseFloat(data.shift())/baseX;
    var getY=()=>parseFloat(data.shift())/baseY;
    
    while(data.length > 0) {
      var type = data.shift();
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
    var fillStyle = style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    var lineWidth = 0;
    var strokeStyle = style.stroke;
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
    var fillRule = (!pathDOM)? "nonzero" : style.fillRule;
    var fillStyle = (!pathDOM)? "none" : style.fill;
    if(fillStyle == "none") {
      fillStyle = "transparent";
    }
    
    var lineWidth = 0;
    var strokeStyle = (!pathDOM)? "none" : style.stroke;
    if(strokeStyle == "none") {
      strokeStyle = "transparent";
    } else {
      lineWidth = parseFloat(style.strokeWidth.match(/([\d\.]+)/)[1]);
    }
    
    var pathDataList = null;
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
    var id = groupDOM.getAttribute("id");
    var paths = [];
    var childGroups = [];
    var children = Array.prototype.slice.call(groupDOM.children);
    
    children.forEach(child=>{
      var name = child.tagName;
      PathCtr.debugPrint("make group : " + id + " : " + name);
      switch(name) {
        case "path":
          paths.push( this.makePath(child, window.getComputedStyle(child)) );
          break;
        case "mask":
          var mackChildren = Array.prototype.slice.call(child.children);
          mackChildren.forEach(maskChild=>{
            if( maskChild.tagName == "use" ) {
              this.initTarget.masks[child.getAttribute("id")] = maskChild.getAttribute("xlink:href").slice(1);
            } else {
              console.error("unknown mask data");
              console.log(maskChild);
            }
          });
          break;
        case "clipPath":
          // TODO
          break;
        case "g":
          childGroups.push(child.getAttribute("id"));
          this.makeGroup(child);
          break;
        default:
          console.error("unknown element");
          console.log(child);
          break;
      }
    });
    
    var ret = new this.GroupObj(
      id,
      paths,
      childGroups,
      this.getMaskId(groupDOM.getAttribute("mask"))
    );
    
    this.initTarget.groups[id] = ret;
    
    return ret;
  },
  
  /**
   * @param groupDOM : group element
   * @param id : group ID
   * @param frame : frame number
   * @param actionName : action name
   */
  addActionGroup: function(groupDOM, id, frame, actionName) {
    var targetGroup = this.initTarget.groups[id];
    var childGroups = [];
    var dataIndex = 0;
    
    if(!!groupDOM) {
      var children = Array.prototype.slice.call(groupDOM.children);
      children.forEach(child=>{
        var name = child.tagName;
        switch(name) {
          case "path":
            this.addActionPath(targetGroup.paths[dataIndex++], child, window.getComputedStyle(child), frame, actionName);
            break;
          case "mask":
          case "clipPath":
            break;
          case "g":
            childGroups.push(child.getAttribute("id"));
            break;
          default:
            console.error("unknown element");
            console.log(child);
            break;
        }
      });
    } else {
      var children = Array.prototype.slice.call(targetGroup.paths);
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
    
    var ret = this.initTarget = new this.PathContainer();
    
    this.initTarget.originalWidth = this.initTarget.displayWidth = parseInt(groupsDOM.getAttribute("width").replace("px", ""));
    this.initTarget.originalHeight = this.initTarget.displayHeight = parseInt(groupsDOM.getAttribute("height").replace("px", ""));
    
    var children = Array.prototype.slice.call(groupsDOM.children);
    children.forEach(child=>{
      if(child.tagName != "g") return;
      var group = this.makeGroup(child);
      ret.rootGroups.push(group.id);
    });
    this.initTarget = null;
    
    return ret;
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
    var actionGroup = {};
    var groupsDOMArr = Array.prototype.slice.call(groupsDOMList);
    var baseDom = groupsDOMArr[0];
    var baseGroups = baseDom.getElementsByTagName("g");
    var ids = [].map.call(baseGroups, group=>group.getAttribute("id"));
    var frame = 0;
    groupsDOMArr.forEach(targetDom=>{
      var targetGroups = targetDom.getElementsByTagName("g");
      var targetIds = [].map.call(targetGroups, group=>group.getAttribute("id"));
      Array.prototype.forEach.call(targetIds, id=>{
        if(ids.includes(id)) return;
        ids.push(id);
        this.makeGroup(targetDom.getElementById(id));
      });
    });
    
    console.log("check diff");
    groupsDOMArr.forEach(targetDom=>{
      ids.forEach(id=>{
        var base = baseDom.getElementById(id);
        if( !base || !targetDom || !base.isEqualNode(targetDom.getElementById(id)) ) {
          actionGroup[id] = true;
        }
      });
    });
    
    groupsDOMArr.forEach((targetDom, frame)=>{
      if(frame == 0) return;
      console.log("add action : " + frame);
      Object.keys(actionGroup).forEach(key=>{
        this.addActionGroup(targetDom.getElementById(key), key, frame, actionName);
      });
      ++frame;
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
    var pathContainer = new this.PathContainer();
    var dv = new DataView(buffer);
    var sumLength = 0;
    var groupIDs = { 0 : "" };
    
    // -- prepare getting function --
    
    var getUint8  =()=>{var ret = dv.getUint8(sumLength); sumLength += 1; return ret};
    var getUint16 =()=>{var ret = dv.getUint16(sumLength); sumLength += 2; return ret};
    var getUint32 =()=>{var ret = dv.getUint32(sumLength); sumLength += 4; return ret};
    var getFloat32=()=>{var ret = dv.getFloat32(sumLength); sumLength += 4; return ret};
    var getPos    =()=>{var ret = dv.getInt16(sumLength)/this.binDataPosRange; sumLength += 2; return ret};
    var getString=()=>{
      var num = getUint8();
      var ret = "";
      for(var i = 0; i < num; ++i) {
        ret += String.fromCharCode(getUint16());
      }
      return ret;
    };
    var getColor=()=>{
      var a = getUint8();
      if(a == 0) {
        return "transparent";
      }
      var str = "rgb(" + getUint8() + ", " + getUint8() + ", " + getUint8() + ")";
      return str;
    };
    
    var getArray=(lengFunc, getFunc)=>{
      var ret = [];
      var num = lengFunc();
      for(var i = 0; i < num;) {
        var count = getUint16();
        if(count == 0) {
          count = getUint16();
          if(count == 0) {
            console.error("data format error");
            break;
          }
          i += count;
          continue;
        }
        var val = getFunc();
        if(Array.isArray(val)) {
          for(var j = 0; j < count; ++j) {
            ret[i + j] = val.concat();
          }
        } else {
          for(var j = 0; j < count; ++j) {
            ret[i + j] = val;
          }
        }
        i += count;
      }
      return ret;
    };
    
    var getGroupID=()=>groupIDs[getUint16()];
    
    var getAction=(func)=>{
      return getArray(getUint8, ()=>getArray(getUint16, ()=>func()));
    };
    
    var getPathData=()=>{
      var retNum = getUint16();
      var ret = [];
      for(var i = 0; i < retNum; ++i) {
        var type = getUint8();
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
    
    var getPath=()=>{
      var maskIdToUse = getGroupID();
      var fillRule = (getUint8() == 0 ? "nonzero" : "evenodd");
      
      var actionListNum = getUint8();
      
      if(actionListNum == 0) {
        var lineWidth = getFloat32();
        var fillStyle = getColor();
        var strokeStyle = getColor();
        var pathDataList = getPathData();
        return new this.PathObj(
          pathDataList,
          maskIdToUse,
          fillRule,
          fillStyle,
          lineWidth,
          strokeStyle,
        );
      }
      
      var actionList = {};
      for(var i = 0; i < actionListNum; ++i) {
        actionList[getString()] = getUint8();
      }
      
      var lineWidth = getAction(getFloat32);
      var fillStyle = getAction(getColor);
      var strokeStyle = getAction(getColor);
      var pathDataList = getAction(getPathData);
      
      var pathObj = new this.PathObj(
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
    
    var getGroup=()=>{
      var id = getGroupID();
      var maskIdToUse = getGroupID();
      
      var paths = getArray(getUint16, getPath);
      
      var actionListNum = getUint8();
      if(actionListNum == 0) {
        var childGroups = getArray(getUint8, getGroupID);
        
        var group = new this.GroupObj(
          id,
          paths,
          childGroups,
          maskIdToUse
        );
        return group;
      }
      
      var group = new this.GroupObj(
        id,
        paths,
        [],
        maskIdToUse
      );
      
      var actionList = {};
      var actionNameList = [];
      for(var i = 0; i < actionListNum; ++i) {
        var actionName = getString();
        actionList[actionName] = getUint8();
        actionNameList.push(actionName);
      }
      group.actionList = actionList;
      
      group.childGroups = getAction(()=>getArray(getUint8, getGroupID));
      return group;
    };
    
    
    // --acquisition processing--
    
    pathContainer.originalWidth = pathContainer.displayWidth = getUint16();
    pathContainer.originalHeight = pathContainer.displayHeight = getUint16();
    
    var groupIDNum = getUint16();
    for(var i = 0; i < groupIDNum; ++i) {
      groupIDs[i+1] = getString();
    }
    
    for(var i = getUint8(); i > 0; --i) {
      pathContainer.masks[getGroupID()] = getGroupID();
    }
    
    pathContainer.rootGroups = getArray(getUint8, getGroupID);
    
    var groupsNum = getUint16();
    for(var i = 0; i < groupsNum; ++i) {
      var id = groupIDs[i+1];
      PathCtr.debugPrint("count : " + i);
      PathCtr.debugPrint(id);
      PathCtr.debugPrint(sumLength);
      pathContainer.groups[id] = getGroup();
      PathCtr.debugPrint(pathContainer.groups[id]);
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
    
    var buffer = new ArrayBuffer(1000000000);
    var dv = new DataView(buffer);
    var sumLength = 0;
    var groupIDs = { "" : 0 };
    
    // -- prepare setting function --
    var setUint8  =val=>{dv.setUint8(sumLength, val); sumLength += 1};
    var setUint16 =val=>{dv.setUint16(sumLength, val); sumLength += 2};
    var setUint32 =val=>{dv.setUint32(sumLength, val); sumLength += 4};
    var setFloat32=val=>{dv.setFloat32(sumLength, val); sumLength += 4};
    var setPos    =val=>{dv.setInt16(sumLength, val*this.binDataPosRange); sumLength += 2};
    var setString=str=>{
      setUint8(str.length);
      var arr = [].map.call(str, c=>setUint16(c.charCodeAt(0)));
    };
    var setColor=str=>{
      if(str == "transparent") {
        setUint8(0);  // A
      } else {
        var colorArr = str.match(/(\d+), (\d+), (\d+)/);
        setUint8(1);  // A
        setUint8(colorArr[1]);  // R
        setUint8(colorArr[2]);  // G
        setUint8(colorArr[3]);  // B
      }
    };
    var setArray=(arr, lengFunc, setFunc)=>{
      var num = arr.length;
      lengFunc(num);
      for(var i = 0; i < num;) {
        var val = arr[i];
        var j = 1;
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
    
    var setAction=(ids, func)=>{
      setArray(ids, setUint8, frames=>{
        setArray(frames, setUint16, func);
      });
    };
    
    var setGroupID=val=>setUint16(groupIDs[val]);
    
    var setPathData=pathDataList=>{
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
            for(var i = 0; i < 6; ++i) {
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
    
    var setPath=path=>{
      setGroupID(path.maskIdToUse);
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
    
    var setGroup=group=>{
      setGroupID(group.id);
      setGroupID(group.maskIdToUse);
      setArray(group.paths, setUint16, setPath);
      
      if(!group.actionList) {
        setUint8(0);
        setArray(group.childGroups, setUint8, setGroupID);
        return;
      }
      
      setUint8(Object.keys(group.actionList).length);
      Object.keys(group.actionList).forEach(key=>{
        setString(key);
        setUint8(group.actionList[key]);
      });
      
      setAction(group.childGroups, childGroups=>{
        setArray(childGroups, setUint8, setGroupID);
      });
    };
    
    
    // -- storage processing --
    
    setUint16(pathContainer.originalWidth);
    setUint16(pathContainer.originalHeight);
    
    var groupsNum = Object.keys(pathContainer.groups).length;
    var maskNum = Object.keys(pathContainer.masks).length;
    setUint16(groupsNum + maskNum);
    Object.keys(pathContainer.groups).forEach(key=>{
      groupIDs[key] = Object.keys(groupIDs).length;
      setString(key);
    });
    Object.keys(pathContainer.masks).forEach(key=>{
      groupIDs[key] = Object.keys(groupIDs).length;
      setString(key);
    });
    
    setUint8(maskNum);
    Object.keys(pathContainer.masks).forEach(key=>{
      setGroupID(key);
      setGroupID(pathContainer.masks[key]);
    });
    
    setArray(pathContainer.rootGroups, setUint8, setGroupID);
    
    setUint16(groupsNum);
    Object.keys(pathContainer.groups).forEach(key=>{
      console.log("count : " + groupsNum--);
      PathCtr.debugPrint(key);
      PathCtr.debugPrint(sumLength);
      setGroup(pathContainer.groups[key]);
      PathCtr.debugPrint(pathContainer.groups[key]);
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
      var actionID = Object.keys(this.actionList).length;
      this.actionList[actionName] = actionID;
      this.pathDataList[actionID] = [this.pathDataList[0][0]];
      this.fillStyle[actionID] = [this.fillStyle[0][0]];
      this.lineWidth[actionID] = [this.lineWidth[0][0]];
      this.strokeStyle[actionID] = [this.strokeStyle[0][0]];
    }
    var actionID = this.actionList[actionName];
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
    var drawPath =d=>{
      var pos = d.pos;
      var ratioX = displayWidth
      var ratioY = displayHeight;
      switch(d.type) {
        case "M":
          path2D.moveTo(pos[0]*ratioX, pos[1]*ratioY);
          break;
        case "C":
          path2D.bezierCurveTo(pos[0]*ratioX, pos[1]*ratioY, pos[2]*ratioX, pos[3]*ratioY, pos[4]*ratioX, pos[5]*ratioY);
          break;
        case "Z":
          path2D.closePath();
          break;
        default:
          console.error("unknown type");
          break;
      }
    };
    var drawStroke =(lineWidth, strokeStyle)=>{
      if( !lineWidth ) return;
      context.lineWidth = lineWidth;
      context.strokeStyle = strokeStyle;
      context.stroke(path2D);
    };
    var drawFill =(fillStyle)=>{
      context.fillStyle = fillStyle;
      context.fill(path2D, this.fillRule);
    };
    if( !!this.actionList ) {
      var actionID = this.actionList[PathCtr.currentActionName];
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
      // init action data
      this.childGroups = [[this.childGroups]];   // list of group id
      this.actionList = {};                      // action name list
      this.actionList[PathCtr.defaultAction] = 0;
    }
    if( !this.actionList.hasOwnProperty(actionName) ) {
      var actionID = Object.keys(this.actionList).length;
      this.actionList[actionName] = actionID;
      this.childGroups[actionID] = [];
      this.childGroups[actionID][0] = this.childGroups[0][0].concat();
    }
    var actionID = this.actionList[actionName];
    this.childGroups[actionID][frame] = childGroups;
  },
  
  /**
   * @return group id array
   */
  getChildGroups: function() {
    if( this.childGroups.length == 0 ) return this.childGroups;
    if( !this.actionList ) {
      return this.childGroups;
    }
    
    var actionID = this.actionList[PathCtr.currentActionName];
    
    if( !this.childGroups[actionID] ) {
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
   * @param id           : mask ID to search
   * @return mask GroupObj
   */
  getMaskGroup: function(id) {
    var refId = this.masks[id];
    if(!!refId) {
      return this.groups[refId];
    } else {
      console.error("mask is not found : " + id);
    }
    return null;
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
    
    var isFoundMask = false;
    
    if(!isMask && !!group.maskIdToUse) {
      var mask = this.getMaskGroup(group.maskIdToUse);
      if(!!mask) {
        isFoundMask = true;
        this.context.save();
        this.drawGroup(mask, true);
      } else {
        console.error("group is not found : " + group.maskIdToUse);
      }
    }
    
    var path2D = isMask? (new Path2D()):0;
    var isUsed = false;
    
    group.paths.forEach(path=>{
      
      isUsed = true;
      
      var isFoundMaskPath = false;
      
      if(!isMask && !!path.maskIdToUse) {
        var maskPath = this.getMaskGroup(path.maskIdToUse);
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
    
    var frameGroup = group.getChildGroups();
    if(!!frameGroup) {
      frameGroup.forEach(childGroup=>{
        this.drawGroup(this.groups[childGroup], isMask);
      });
    }
    
    if(isMask && isUsed) {
      this.context.clip(path2D);
    }
    
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
    
    var path2D = new Path2D();
    path2D.rect(0, 0, this.displayWidth, this.displayHeight);
    this.context.clip(path2D);
    
    this.rootGroups.forEach(id=>{
      this.drawGroup(this.groups[id], false);
    });
  },
};

