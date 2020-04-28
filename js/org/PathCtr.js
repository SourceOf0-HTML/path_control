
/**
 * PathCtr
 * Singleton
 */
var PathCtr = {
  defaultActionName : "base",  // default action name
  defaultBoneName : "bone",  // default main bone name
  initTarget: null,  // instance to be initialized
  currentFrame : 0,  // current frame
  currentActionID : -1,  // current action ID
  binDataPosRange : 20000, // correction value of coordinates when saving to binary data
  
  isDebug : true,
  debugPrint: function() {
    if(!this.isDebug) return;
    //console.log("Func : " + this.debugPrint.caller.name);
    for(let i = 0; i < arguments.length; ++i) {
      console.log(arguments[i]);
    }
  },
};

