set CORE_SRC=temp\core_source.js
del %CORE_SRC%
type org\PathCtr.js >> %CORE_SRC%
type org\Matrix.js >> %CORE_SRC%
type org\Sprite.js >> %CORE_SRC%
type org\ActionContainer.js >> %CORE_SRC%
type org\PathObj.js >> %CORE_SRC%
type org\GroupObj.js >> %CORE_SRC%
type org\BoneObj.js >> %CORE_SRC%
type org\PathContainer.js >> %CORE_SRC%
type org\BinaryLoader.js >> %CORE_SRC%
type org\PathWorker.js >> %CORE_SRC%

set DEBUG_SRC=temp\debug_source.js
del %DEBUG_SRC%
type %CORE_SRC% >> %DEBUG_SRC%
type org\BoneLoader.js >> %DEBUG_SRC%
type org\DebugPath.js >> %DEBUG_SRC%


set DIR_PATH=..\js\path_control\

set BIN_FILE=%DIR_PATH%path_control.js
del %BIN_FILE%
echo let path_control = ` >> %BIN_FILE%
type %CORE_SRC% >> %BIN_FILE%
echo ` >> %BIN_FILE%
type path_main.js >> %BIN_FILE%

set BIN_DEBUG_FILE=%DIR_PATH%path_control_debug.js
del %BIN_DEBUG_FILE%
echo let path_control=` >> %BIN_DEBUG_FILE%
type %DEBUG_SRC% >> %BIN_DEBUG_FILE%
echo ` >> %BIN_DEBUG_FILE%
type path_main.js >> %BIN_DEBUG_FILE%

set SVG_FILE=%DIR_PATH%path_control_svg.js
del %SVG_FILE%
echo let path_control = ` >> %SVG_FILE%
type %DEBUG_SRC% >> %SVG_FILE%
echo ` >> %SVG_FILE%
echo let path_load_svg_worker = ` >> %SVG_FILE%
type path_load_svg_worker.js >> %SVG_FILE%
echo ` >> %SVG_FILE%
type path_main.js >> %SVG_FILE%
type path_svg_loader.js >> %SVG_FILE%

