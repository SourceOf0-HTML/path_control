--! @file bn_outputCsv.lua

-- **************************************************
-- Provide Moho with the name of this script object
-- **************************************************

ScriptName = "BN_OutputCsv"

-- **************************************************
-- General information about this script
-- **************************************************

BN_OutputCsv = {}

--! Returns the name of the script.
--! @retval LM_String
function BN_OutputCsv:Name()
	return "BUN Output Csv"
end

--! Returns the version of the script.
--! @retval LM_String
function BN_OutputCsv:Version()
	return "1.0"
end

--! Returns a localized description of the script's functionality.
--! @retval LM_String
function BN_OutputCsv:Description()
	return "Output Csv"
end

--! Returns name of creator.
--! @retval LM_String
function BN_OutputCsv:Creator()
	return "BUN"
end

--! Returns the localized label.
--! @retval LM_String
function BN_OutputCsv:UILabel()
	return "Output Csv"
end

-- **************************************************
-- Recurring values
-- **************************************************

BN_OutputCsv.csvName = "filelist.csv"
BN_OutputCsv.rootPath = "./resource/"

-- **************************************************
-- The guts of this script
-- **************************************************

--! Returns false if the user is in the middle of an action, otherwise returns true.
--! @param ScriptInterface moho
--! @retval bool
function BN_OutputCsv:IsEnabled(moho)
	if (moho.layer:LayerType() ~= MOHO.LT_BONE) then
		return false
	end
	if (moho:Skeleton() == nil) then
		return false
	end
	return true
end

--! Setup alert info.
--! @param String text
function BN_OutputCsv:SetupAlert(text)
	LM.GUI.Alert(LM.GUI.ALERT_WARNING,
		text,
		nil,
		nil,
		MOHO.Localize("/Scripts/OK=OK"),
		nil,
		nil)
end

--! Runs this script.
--! @param ScriptInterface moho
function BN_OutputCsv:Run(moho)
	self.moho = moho
	self.layer = moho.layer
	local layer = self.layer
	
	if (layer:LayerType() ~= MOHO.LT_BONE) then
		self:SetupAlert("ボーンレイヤーを選択してから実行してください")
		return
	end
	
	self.skel = moho:Skeleton()
	if (self.skel == nil) then
		self:SetupAlert("ボーンが見つかりません")
		return
	end
	
	path = LM.GUI.SaveFile("CSVファイルの保存先を指定してください")
	if (path == "") then
		return
	end
	
	local docName = moho.document:Name()
	self.prefix = string.sub(docName, 0, string.len(docName)-5) .. "_"
	self.info = {}
	self:SetActionInfo()
	
	fp = io.open(BN_OutputCsv.csvName,"w")
	if (fp == nil) then
		self:SetupAlert(BN_OutputCsv.csvName .. "の保存に失敗しました。\nファイルを開いている場合は閉じてから実行してください。")
	else
		fp:write(self:OutputCsv())
		io.close(fp)
		self:SetupAlert(BN_OutputCsv.csvName .. "を保存しました")
	end
end

--! Set action info at json.
function BN_OutputCsv:SetActionInfo()
	local layer = self.layer
	
	if (layer:CountActions() == 0) then
		return
	end
	
	local currentAction = self.layer:CurrentAction()
	if (currentAction == "") then
		currentAction = NULL
	end
	
	for i = 0, layer:CountActions()-1 do
		local actionName = layer:ActionName(i)
		local dataName = self.prefix .. actionName
		
		local data = {}
		data["actionName"] = actionName
		data["path"] = self.rootPath .. dataName .. "/" .. dataName .. "_"
		
		layer:ActivateAction(actionName)
		if (layer:IsSmartBoneAction(actionName)) then
			local bone = self.skel:BoneByName(actionName)
			if (bone == nil) then
				bone = self.skel:BoneByName(string.sub(actionName, 0, string.len(actionName)-2))
			end
			
			local animAngle = bone.fAnimAngle
			local whenEndKey = 0
			for i = 0, animAngle:CountKeys()-1 do
				whenEndKey = math.max(whenEndKey, animAngle:GetKeyWhen(i))
			end
			
			data["type"] = "SMRT"
			data["frames"] = whenEndKey
		else
			data["type"] = "BONE"
			data["frames"] = layer:AnimDuration()
		end
		
		self.info[actionName] = data
	end
	
	layer:ActivateAction(currentAction)
end

--! Sort table and return iterator
--! @param Table targetTable
--! @param Integer indentCount
--! @retval Function
function pairsByKeys(targetTable, func)
	local temp = {}
	for n in pairs(targetTable) do temp[#temp+1] = n end
	
	table.sort(temp, func)
	local i = 0
	return function()
		i = i + 1
		return temp[i], targetTable[temp[i]]
	end
end

--! Output csv
--! @retval String
function BN_OutputCsv:OutputCsv()
	local dataName = self.prefix .. "base"
	
	local ret = ""
	ret = ret .. "BASE, "
	ret = ret .. "1, "
	ret = ret .. "base, "
	ret = ret .. self.rootPath .. dataName .. "/" .. dataName .. "_\n"
	
	for key, val in pairsByKeys(self.info) do
		ret = ret .. val["type"] .. ", "
		ret = ret .. val["frames"] .. ", "
		ret = ret .. val["actionName"] .. ", "
		ret = ret .. val["path"] .. "\n"
	end
	return ret
end
