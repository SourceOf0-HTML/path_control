set DIR_PATH=..\js\path_control\

set OUTPUT_FILE=%DIR_PATH%path_control.js
del %OUTPUT_FILE%
type org\PathCtr.js >> %OUTPUT_FILE%
type org\Matrix.js >> %OUTPUT_FILE%
type org\Sprite.js >> %OUTPUT_FILE%
type org\ActionContainer.js >> %OUTPUT_FILE%
type org\PathObj.js >> %OUTPUT_FILE%
type org\GroupObj.js >> %OUTPUT_FILE%
type org\BoneObj.js >> %OUTPUT_FILE%
type org\PathContainer.js >> %OUTPUT_FILE%
type org\BinaryLoader.js >> %OUTPUT_FILE%
type org\PathWorker.js >> %OUTPUT_FILE%

set DEBUG_FILE=%DIR_PATH%path_control_debug.js
del %DEBUG_FILE%
type %OUTPUT_FILE% >> %DEBUG_FILE%
type org\BoneLoader.js >> %DEBUG_FILE%
type org\DebugPath.js >> %DEBUG_FILE%


set MAIN_FILE=%DIR_PATH%path_main.js
del %MAIN_FILE%
type path_main.js >> %MAIN_FILE%

set MAIN_SVG_FILE=%DIR_PATH%path_main_svg.js
del %MAIN_SVG_FILE%
type %MAIN_FILE%  >> %MAIN_SVG_FILE%
type path_svg_loader.js >> %MAIN_SVG_FILE%


set SVG_LOAD_WORKER_FILE=%DIR_PATH%path_load_svg_worker.js
del %SVG_LOAD_WORKER_FILE%
type path_load_svg_worker.js >> %SVG_LOAD_WORKER_FILE%
