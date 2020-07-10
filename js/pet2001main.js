//
// Copyright (c) 2014 Thomas Skibo.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//    notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//    notice, this list of conditions and the following disclaimer in the
//    documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY AUTHOR AND CONTRIBUTORS ``AS IS'' AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.  IN NO EVENT SHALL AUTHOR OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
// OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
// OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
// SUCH DAMAGE.
//

// pet2001main.js

// Modified and extended by (c) Norbert Landsteiner, 2017-2020

var pet2001;

var petCtrl = (function() {

	// basic emulation

	var	config = {
		VIDRAM_ADDR:     0x8000,
		VIDRAM_SIZE:     0x0400,
		IO_ADDR:         0xe800,
		IO_SIZE:         0x0800,
		ROM_ADDR:        0xC000,
		ROM_SIZE:        0x3800,
		RAM_SIZE:        0x2000,
		MAX_RAM_SIZE:    0x8000,
		ROM_VERSION:        2,
		SCREEN_COLOR:    'green',
		KEYBOARD_REPEAT: false,
		KEYBOARD_PET:    true
	};

	var	petIntervalTime = 17, // 60Hz = 16.666
		petIntervalHandle = null,
		petKeys = new PetKeys('petKeyboard'),
		lastUpdate = 0,
		getTicks = // a function to return ticks in ms
			window.performance? function() { return Math.floor(performance.now()); }:
			Date.now? Date.now:
			function() { return new Date().getTime(); };
			

	function petIntervalFunc() {
		var	now = getTicks(),
			dt = lastUpdate? now - lastUpdate : petIntervalTime;
		pet2001.cycle(dt*1000);
		lastUpdate = now;
	}

	function run() {
		var petContext = document.getElementById(UIids.screenCanvas).getContext("2d");
		pet2001 = new Pet2001(petContext, config);
		petIntervalHandle = window.setInterval(petIntervalFunc, petIntervalTime);
	}
	

	// UI and control

	var UIids = {
			'screenCanvas': 'petScreenCanvas',
			'dragAndDropTarget': 'petScreen',
			'kbdFocusTarget': 'petScreen',
			'touchClickTarget': 'petScreen',
			'screenCtxMenuTarget': 'petScreen',
			'CS2001LabelsParent': 'petScreen',
			'CS2001Labels': 'cs2001labels',
			'btnPause': 'btnPause',
			'selectRom': 'menuRom',
			'selectRam': 'menuRam',
			'selectScreenColor': 'menuScreenColor',
      'selectKeyRepeat': 'menuKeyRepeat',
      'selectKeyboardPET': 'menuRealKeyboard',
			'fileUpload': 'fileInput',
			'downloadLink': 'downloadLinkPane',
			'downloadLinkParent': 'downloadLinkParent',
			'dialogRenumber': 'renumberDialog',
			'dialogRenumberLineNumber': 'renumberDialogLineNumber',
			'dialogRenumberStep': 'renumberDialogStep',
			'dialogRenumberMessage': 'renumberDialogMessage',
			'dialogTextExport': 'textExport',
			'dialogTextExportContent': 'textExportContent',
			'dialogTextExportTextarea': 'textExportClipboard',
			'dialogTextExportTitle': 'textExportTitle',
			'dialogTextExportMemCtrl': 'memExportCtrl',
			'dialogTextExportEscapeCtrl': 'textExportEscapeCtrl',
			'dialogTextExportCbxEscapeHex': 'textExportCbxEscapeHex',
			'dialogTextExportCbxEscapeLabels': 'textExportCbxEscapeLabels',
			'dialogTextExportMemSelectMode': 'memExportType',
			'dialogTextExportMemStart': 'memExportStart',
			'dialogTextExportMemEnd': 'memExportEnd',
			'dialogTextExportCaseCtrl': 'textExportCaseCtrl',
			'dialogTextExportCbxLowerCase': 'textExportCbxLowerCase',
			'dialogSrcExport': 'srcExport',
			'dialogSrcExportContent': 'srcExportContent',
			'dialogSrcExportTextarea': 'srcExportClipboard',
			'dialogSrcExportLineNumber': 'srcExportLineNumber',
			'dialogSrcExportStep': 'srcExportLineStep',
			'dialogSrcExportCbxUpperCase': 'srcExportCbxUpperCase',
			'dialogSrcExportCbxTrim': 'srcExportCbxTrim',
			'dialogSrcExportSelectEscapeFormat': 'srcExportEscapeFormat',
			'dialogUrlExport': 'urlExport',
			'dialogUrlExportContent': 'urlExportContent',
			'dialogUrlExportTitle': 'urlExportTitle',
			'dialogUrlExportCtrl': 'urlExportCtrl',
			'dialogUrlExportSelectEncoding': 'urlExportEncodingSelect',
			'dialogUrlExportSelectFormat': 'urlExportFormatSelect',
			'dialogUrlExportCbxAutoRun': 'urlExportCbxAutorun',
			'dialogUrlExportLinkPane': 'urlExportLinkPane',
			'dialogImgExport': 'imgExport',
			'dialogImgExportContent': 'imgExportContent',
			'dialogImgExportImgWrapper': 'imgExportImgWrapper',
			'dialogDirectory': 'directoryDialog',
			'dialogDirectoryTitle': 'directoryTitle',
			'dialogDirectoryList': 'directoryList',
			'dialogDirectorySelectRam': 'directoryRamSelect',
			'dialogDirectoryCbxAsBasic': 'directoryCbxAsBasic',
			'dialogDirectoryCbxAutoRun': 'directoryCbxAutorun',
			'btnDiskDirectory': 'btnDiskDirectory',
			'btnTapeDirector': 'btnTapeDirectory',
			'dialogConfirm': 'confirmDialog',
			'dialogConfirmText': 'confirmDialogText',
			'dialogConfirmBtnOK': 'confirmDialogBtnOK',
			'dialogMountFile': 'mountDialog',
			'prgLibrary': 'prgLibrary',
			'prgLibraryIframe': 'prgLibraryContent',
      'help': 'petHelp',
      'dialogControls': 'controlsDialog'
		},
		UIclasses = {
			'dragdrop': 'dragdrop',
			'directoryListFileName': 'directoryListName',
			'directoryListFileSize': 'directoryListSize',
			'directoryListItem': 'directoryListItem',
			'directoryListItemOdd': 'directoryListItemOdd',
			'directoryListItemEven': 'directoryListItemEven',
			'screenCtxMenu': 'petCtxMenu',
			'screenCtxMenuSeparator': 'petCtxMenuSeparator',
			'ctxMenuShield': 'petCtxMenuShield'
		},
		UIstrings = {
			'resume': 'Resume',
			'pause': ' Pause ',
			'rightClickToSave': 'Right-click me to save...',
			'renumberMsgMinLineNumber': 'Please enter a positive line number.',
			'renumberMsgMinStep': 'Please enter a positive number of steps.',
			'renumberMsgMaxLineNumber': 'Highest valid line number is 63999.',
			'renumberMsgMaxStep': 'Highest valid step is 1000.',
			'exportBasicMsgNoPrg': 'No BASIC program found.',
			'listingNoPrgFound': '-- no program found --',
			'exportTitleBasicHexDump': 'BASIC Program (Hex-Dump)',
			'exportTitleBasicEscapedListing': 'Escaped BASIC Listing',
			'exportTitleBasicPortableListing': 'Portable BASIC Listing (PETSCII special characters as CHR$())',
			'exportTitleScreenDump': 'Screen Contents',
			'urlExportTitleScreen': 'Export Screen-URL',
			'urlExportTitleBasic': 'Export BASIC Program as URL',
			'urlExportMsgRightClickToCopy': '(right-click link to copy)',
			'urlExportMsgNoPrg': 'Sorry, no BASIC program found.',
			'directoryListTitleT64': 'Tape Contents',
			'directoryListTitleDisk': 'Disk',
			'dialogReset': 'Reset and load &amp; run the mounted file?'
		},
		forcedBasicLoadDriveString = '8',
		configDefaults;

	function adjustMenus() {
		if (typeof config === 'object') {
			if (typeof config.ROM_VERSION !== 'undefined') adjustSelect(UIids.selectRom, config.ROM_VERSION);
			if (typeof config.RAM_SIZE !== 'undefined') adjustSelect(UIids.selectRam, Math.floor(config.RAM_SIZE/1024));
			if (typeof config.KEYBOARD_REPEAT !== 'undefined') adjustSelect(UIids.selectKeyRepeat, '' + config.KEYBOARD_REPEAT);
			if (typeof config.KEYBOARD_PET !== 'undefined') adjustSelect(UIids.selectKeyboardPET, '' + config.KEYBOARD_PET);
			if (typeof config.SCREEN_COLOR !== 'undefined') adjustSelect(UIids.selectScreenColor, config.SCREEN_COLOR);
		}
	}


	function enableUI() {
    setKeyRepeat(config.KEYBOARD_REPEAT);
    setPETKeyboard(config.KEYBOARD_PET);
		window.onkeypress = petKeys.onKeyPress;
		window.addEventListener('keydown', petKeys.onKeyDown, false);
		window.addEventListener('keyup', petKeys.onKeyUp, false);
		// enableDragAndDropLoader(document.getElementById(UIids.dragAndDropTarget));
    // createScreenContextMenu();
		enableVisibilityChangeDetection();
	}

	function resetButton(resetConfig) {
		if (resetConfig) {
			for (var p in configDefaults) config[p] = configDefaults[p];
			resetToConfig();
			if (history.pushState && (window.location.search.length > 1 || window.location.hash.length > 1) && document.title.indexOf('(') > 0) history.pushState({}, document.title, window.location.pathname);
			setTitle();
		}
		else reset();
	}

	function resetToConfig() {
		pause(true);
		if (typeof config.KEYBOARD_REPEAT !== 'undefined') setKeyRepeat(config.KEYBOARD_REPEAT);
		if (typeof config.KEYBOARD_PET !== 'undefined') setKeyRepeat(config.KEYBOARD_PET);
		if (typeof config.SCREEN_COLOR !== 'undefined') setColor(config.SCREEN_COLOR);
		if (typeof config.RAM_SIZE !== 'undefined') pet2001.setRamSize(config.RAM_SIZE, true);
		if (typeof config.ROM_VERSION !== 'undefined') pet2001.setRomVers(config.ROM_VERSION, true);
		adjustMenus();
		reset();
	}

	function reset() {
		lastUpdate = 0;
		pet2001.reset();
		petKeys.reset();
		hideCS2001Labels();
		pause(false);
	}

	function pause(val) {
		var running = petIntervalHandle != null,
			noVal = typeof val === 'undefined';
		if (running && (noVal || val == true)) {
			window.clearInterval(petIntervalHandle);
			petIntervalHandle = null;
			document.getElementById(UIids.btnPause).value = UIstrings.resume;
			lastUpdate = 0;
		}
		else if (!running && (noVal || val == false)) {
			petIntervalHandle = window.setInterval(petIntervalFunc, petIntervalTime);
			document.getElementById(UIids.btnPause).value = UIstrings.pause;
		}
		return running;
	}

	function romSelection() {
		var vers = document.getElementById(UIids.selectRom).value;
		pet2001.setRomVers(vers);
	}

	function ramsizeSelection() {
		var size = document.getElementById(UIids.selectRam).value;
		pet2001.setRamSize(parseInt(size,10) * 1024);
	}

	function setColor(clr) {
		pet2001.video.setColor(clr);
	}

	function setKeyRepeat(v) {
		var repeat = (typeof v === 'string')? v.toLowerCase() === 'true':Boolean(v);
		petKeys.setKeyRepeat(repeat);
	}

	function setRamSize(size, callback, noreset) {
		var sizes = [8, 16, 32];
		size = parseFloat(size);
		for (var i = 0, max = sizes.length-1; i <= max; i++) {
			if (sizes[i] >= size) {
				size = sizes[i];
				break;
			}
			if (i === max) size = sizes[max];
		}
		adjustSelect(UIids.selectRam, size);
		pet2001.setRamSize(size * 1024, noreset);
		if (typeof callback === 'function') waitForCursor(callback);
	}

	function setRomVersion(vers, callback, noreset) {
		vers = parseInt(vers, 10);
		if (vers != pet2001.getRomVers() && vers >= 1 && vers <= 2) {
			adjustSelect(UIids.selectRom, vers);
			pet2001.setRomVers(vers, noreset);
		}
		if (typeof callback === 'function') waitForCursor(callback);
	}

	function adjustSelect(id, v) {
		var select = document.getElementById(id);
		if (select) {
			var options = select.options;
			for (var i = 0; i < options.length; i++) {
				if (options[i].value == v) {
					select.selectedIndex = i;
					break;
				}
			}
		}
	}

	// scroll management for overlays

	var ScrollUtility = (function() {
		var scrollX, scrollY,
			isCSS1Compat = ((document.compatMode || "") === 'CSS1Compat'),
			supportPageOffset = (typeof window.pageXOffset !== 'undefined');

		function store() {
			scrollX = supportPageOffset ? window.pageXOffset
				: isCSS1Compat ? document.documentElement.scrollLeft
					: document.body.scrollLeft || 0;
			scrollY = supportPageOffset ? window.pageYOffset
				: isCSS1Compat ? document.documentElement.scrollTop
					: document.body.scrollTop || 0;
		}

		function restore() {
			window.scrollTo(scrollX, scrollY);
		}

		function disableBodyScrolling() {
			store();
			var html = document.getElementsByTagName('html')[0],
				body = document.getElementsByTagName('body')[0],
				offsetWidth = body.offsetWidth;
			html.style.overflow  = 'hidden';
			html.style.webkitScrollOverflow = 'touch';
			body.style.webkitScrollOverflow = 'touch';
			// compensate for scroll bar
			var hOffset = body.offsetWidth - offsetWidth;
			if (hOffset > 0) body.style.paddingRight = hOffset + 'px';
			// readjust scroll position
			restore();
		}

		function enableBodyScrolling() {
			var html = document.getElementsByTagName('html')[0],
				body = document.getElementsByTagName('body')[0];
			html.style.overflow  = 'auto';
			html.style.webkitScrollOverflow = '';
			body.style.webkitScrollOverflow = '';
			body.style.paddingRight = 0;
			restore();
		}

		return {
			'disableBodyScrolling': disableBodyScrolling,
			'enableBodyScrolling': enableBodyScrolling,
			'store': store,
			'restore': restore
		};
	})();

	var popupRunStateFlag;

	function prepareForPopup() {
		popupRunStateFlag = pause(true);
		petKeys.disable(true);
		ScrollUtility.disableBodyScrolling();
	}

	function resumeFromPopup() {
		ScrollUtility.enableBodyScrolling();
		if (popupRunStateFlag) pause(false);
		petKeys.disable(false);
		if (window.focus) window.focus();
	}


	// confirm dialog

	var confirmDialogCallback;

	function showConfirmDialog(txt, callback) {
		var dialog = document.getElementById(UIids.dialogConfirm),
			dialogText = document.getElementById(UIids.dialogConfirmText),
			okBtn = document.getElementById(UIids.dialogConfirmBtnOK);
		dialogText.innerHTML = txt;
		confirmDialogCallback = callback;
		prepareForPopup();
		dialog.hidden = false;
		if (okBtn && okBtn.focus) okBtn.focus();
	}

	function closeConfirmDialog(confirmation) {
		var dialog = document.getElementById(UIids.dialogConfirm);
		dialog.hidden = true;
		resumeFromPopup();
		if (confirmation && confirmDialogCallback) confirmDialogCallback();
		confirmDialogCallback = null;
	}

	function switchCharacterSet() {
		var addr = 0xE84C, //59468
			byte = pet2001.hw.read(addr),
			isUcGfx = (byte & 2) == 0,
			charsetOld = isUcGfx? 'upper case / graphics':'upper case/lower case',
			charsetNew = isUcGfx? 'upper case / lower case':'upper case/graphics',
			newVal = isUcGfx? byte | 2:byte & 253;
		showConfirmDialog(
			'Switch character set to ' + charsetNew.toUpperCase() + '?<br /><br />' +
			'The PET 2001 is currently in ' + charsetOld + ' mode.<br />' +
			'This will be the same as typing "POKE ' + addr + ',' + (newVal & 14) + '".',
			function() { pet2001.hw.write(addr, newVal); }
		);
	}

  // Popup controls

  function showControlsDialog() {
		var dialog = document.getElementById(UIids.dialogControls);
		prepareForPopup();
		dialog.hidden = false;
	}

  function closeControlsDialog() {
		var dialog = document.getElementById(UIids.dialogControls);
		resumeFromPopup();
		dialog.hidden = true;
	}

  function quitButton() {
    window.close();
  }

	// import / export
	
	function showMountDialog() {
    closeControlsDialog();
		var dialog = document.getElementById(UIids.dialogMountFile);
		prepareForPopup();
		dialog.hidden = false;
	}
	
	function closeMountDialog(v) {
		var dialog = document.getElementById(UIids.dialogMountFile);
		resumeFromPopup();
		loadFile();
		dialog.hidden = true;
	}

	function petExport(select) {
		var idx = select.selectedIndex;
		select.selectedIndex = 0;
		if (idx > 0) {
			var opt = select.options[idx].value;
			switch(opt) {
				case 'screen as text': showTextExport('Screen Text (Unicode)', pet2001.video.exportText(false)); break;
				case 'image': showScreenshot(true); break;
				case 'image marginless': showScreenshot(false); break;
				case 'hardcopy': showHardCopy(); break;
				case 'screen as hex': showTextExport('Screen Memory', pet2001.video.exportText(true)); break;
				case 'screen as basic': exportScreenAsProgram(); break;
				case 'basic as prg': exportBasicAsPrg(); break;
				case 'list basic':
				case 'list basic escaped':
				case 'hex-dump basic':
				case 'hex-dump':
				case 'disassembly':
					exportMemory(opt); break;
				case 'link-basic':
				case 'link-screen':
					exportUrl(opt); break;
				case 'renumber': showRenumberDialog(); break;
				case 'charset': switchCharacterSet(); break;
			}
		}
	}

	function loadFile(infile, callback) { // modified to take optional arguments, NL, 2017
		var file = infile || document.getElementById(UIids.fileUpload).files[0];

		if (!file) return;
		if ((/\.d64$/i).test(file.name)) {
			PetUtils.D64.readDiskImage(file);
		}
		else if ((/\.t64$/i).test(file.name)) {
			PetUtils.T64.readImage(file);
		}
		else {
			setMountedMedia();
			var fread = new FileReader();
			fread.readAsArrayBuffer(file);
			fread.onload = function(levent) {
				if ((/\.(te?xt|bas?)$/i).test(file.name)) {
					var parsed = PetUtils.txt2Basic(levent.target.result,
						0x0401, false, pet2001.getRomVers() == 1);
					if (parsed.error) alert('Parse Error\n'+parsed.error);
					else {
						pet2001.ieeeLoadData(0x401, parsed.prg);
						setMountedMedia('txt', file.name);
						if (typeof callback === 'function') callback();
					}
				}
				else if ((/\.p[0-9]{2}$/i).test(file.name)) {
					var parsed = PetUtils.parseP00(new DataView(levent.target.result));
					if (parsed.error) alert('Parse Error\n'+parsed.error);
					else {
						setMountedMedia('bin', file.name);
						pet2001.ieeeLoadData(parsed.addr, parsed.prg);
						if (typeof callback === 'function') callback();
					}
				}
				else {
					var data = new DataView(levent.target.result),
						size = levent.target.result.byteLength,
						addr = data.getUint8(0) | (data.getUint8(1) << 8),
						bytes = Array(size - 2);
					for (var i = 0; i < size - 2; i++) bytes[i] = data.getUint8(i + 2);
					pet2001.ieeeLoadData(addr, bytes);
					setMountedMedia('bin', file.name);
					if (typeof callback === 'function') callback();
				}
			}
		}
	}

	function saveFile(filename, data, optShowAsLink) {
		var link = window.document.createElement('a');
		link.href = "data:application/octet-stream;base64," + btoa(data);
		if (typeof link.download !== 'undefined') {
			if (!filename) {
				if (optShowAsLink) { // default filename (override in OS dialog)
					filename = 'PET-program.prg';
				}
				else { // ask user and sanitize
					filename = prompt('Filename:', 'PET-program.prg');
					if (!filename) return;
					filename = filename.replace(/[\/\\]/g, '_');
					if (!RegExp(/\.prg$/i).test(filename)) filename = filename.replace(/\.\w*$/, '') + '.prg';
				}
			}
			link.download = filename;
			if (!optShowAsLink) { // save in downloads directory by default
				document.body.appendChild(link);
				link.click();
				document.body.removeChild(link);
				return;
			}
		}
		// show the link (right-click to save)
		var el = document.getElementById(UIids.downloadLink),
			content = document.getElementById(UIids.downloadLinkParent);
		if (el && content) {
			prepareForPopup();
			link.innerText = UIstrings.rightClickToSave;
			while (content.firstChild) content.removeChild(content.firstChild);
			content.appendChild(link);
			el.hidden = false;
		}
	}

	function hideDownloadLink() {
		document.getElementById(UIids.downloadLink).hidden = true;
		resumeFromPopup();
	}

	function runText(txt, resetAndLoad) {
		if (!(/^[0-9]/).test(txt)) {
			if (!(/[\r\n]$/).test(txt)) txt += '\n';
			petKeys.reset();
			petKeys.type(txt);
		}
		else {
			var parsed = PetUtils.txt2Basic(txt, 0x0401, false, pet2001.getRomVers() == 1);
			if (parsed.error) alert('Parse Error\n'+parsed.error);
			else {
				if (resetAndLoad) {
					pet2001.reset();
					petKeys.reset();
					pet2001.ieeeLoadData(0x401, parsed.prg);
					autoLoad('', false, true);
				}
				else {
					pet2001.hw.writeRam(0x401, parsed.prg, parsed.prg.length);
					petKeys.reset();
					petKeys.type(['run']);
					var el = document.getElementById(UIids.dragAndDropTarget);
					if (el && el.focus) el.focus();
				}
			}
		}
	}

	function renumber(startLineNo, step) {
		function setPointer(ptrAddr, word) {
			pet2001.hw.write(ptrAddr, word & 0xFF);
			pet2001.hw.write(ptrAddr + 1, (word >> 8) & 0xFF);
		}

		var txttab = pet2001.getRomVers() == 1? 0x7C:0x28,
			maxRAM = pet2001.hw.getRamSize(),
			mem = [],
			basicStart, result, endAddr;
		pet2001.hw.readRam(0, mem, maxRAM);
		basicStart = mem[txttab] | (mem[txttab + 1] << 8);
		result = PetUtils.renumber(mem, basicStart, startLineNo, step);
		endAddr = result.addr;
		if (endAddr > 0) {
			pet2001.hw.writeRam(basicStart, mem.slice(basicStart, endAddr), endAddr - basicStart);
			// reset pointers
			setPointer(txttab, basicStart);
			setPointer(txttab +  2, endAddr);
			setPointer(txttab +  4, endAddr);
			setPointer(txttab +  6, endAddr);
			setPointer(txttab +  8, maxRAM);
			setPointer(txttab + 10, maxRAM);
			setPointer(txttab + 12, maxRAM);
		}
		return result.message;
	}

	function showRenumberDialog() {
		var dialog = document.getElementById(UIids.dialogRenumber),
			lineNumberInput = document.getElementById(UIids.dialogRenumberLineNumber),
			stepInput = document.getElementById(UIids.dialogRenumberStep),
			message = document.getElementById(UIids.dialogRenumberMessage);
		if (dialog) {
			prepareForPopup();
			dialog.hidden = false;
			if (message) message.innerHTML = '&nbsp;';
			if (stepInput) stepInput.value = 10;
			if (lineNumberInput) {
				lineNumberInput.value = 100;
				//lineNumberInput.focus();
			}
		}
	}

	function closeRenumberDialog(execute) {
		var dialog = document.getElementById(UIids.dialogRenumber);
		if (execute) {
			var message = document.getElementById(UIids.dialogRenumberMessage),
				lineNumberInput = document.getElementById(UIids.dialogRenumberLineNumber),
				stepInput = document.getElementById(UIids.dialogRenumberStep),
				lineNumber = parseInt(lineNumberInput.value, 10),
				step = parseInt(stepInput.value, 10),
				keepVisible = true;
			if (isNaN(lineNumber) || lineNumber < 0) {
				message.innerHTML = UIstrings.renumberMsgMinLineNumber;
				lineNumberInput.value = 100;
			}
			if (isNaN(lineNumber) || isNaN(step) || lineNumber < 0 || step < 1) {
				message.innerHTML = UIstrings.renumberMsgMinStep;
				stepInput.value = 10;
			}
			else if (lineNumber > 63999) {
				message.innerHTML = UIstrings.renumberMsgMaxLineNumber;
				lineNumberInput.value = 100;
			}
			else if (step > 1000) {
				message.innerHTML = UIstrings.renumberMsgMaxStep;
				stepInput.value = 10;
			}
			else {
				var response = renumber(lineNumber, step);
				if (response) message.innerHTML = response;
				else keepVisible = false;
			}
			if (keepVisible) return;
		}
		dialog.hidden = true;
		resumeFromPopup();
	}

	function exportBasicAsPrg() {
		var mem = [], maxRAM = pet2001.hw.getRamSize();
		pet2001.hw.readRam(0, mem, maxRAM);
		var data = PetUtils.convertToPrg(mem, 0x401);
		if (data) {
			saveFile('', data, true);
		}
		else {
			alert(UIstrings.exportBasicMsgNoPrg);
		}
	}

	function exportMemory(job) {
		var mem = [], maxRAM = pet2001.hw.getRamSize();
		pet2001.hw.readRam(0, mem, maxRAM);
		if (job == 'hex-dump basic') {
			showTextExport(UIstrings.exportTitleBasicHexDump, PetUtils.hexDumpBasic(mem) || UIstrings.listingNoPrgFound);
		}
		else if (job == 'hex-dump' || job == 'disassembly') {
			memSnapshot = mem;
			showTextExport('', '', job);
		}
		else if (job == 'list basic escaped') {
			memSnapshot = mem;
			showTextExport(UIstrings.exportTitleBasicEscapedListing, '', job, true);
		}
		else {
			showTextExport(UIstrings.exportTitleBasicPortableListing, PetUtils.basic2Txt(mem, 0x401) || UIstrings.listingNoPrgFound, '', true);
		}
	}

	function showTextExport(title, txt, job, showCaseOption) {
		var el = document.getElementById(UIids.dialogTextExport),
			ta = document.getElementById(UIids.dialogTextExportTextarea),
			ti = document.getElementById(UIids.dialogTextExportTitle),
			me = document.getElementById(UIids.dialogTextExportMemCtrl),
			escCtrl = document.getElementById(UIids.dialogTextExportEscapeCtrl),
			caseOptions = document.getElementById(UIids.dialogTextExportCaseCtrl);
		if (el && ta) {
			prepareForPopup();
			caseOptions.hidden = !showCaseOption;
			if (showCaseOption && document.getElementById(UIids.dialogTextExportCbxLowerCase).checked)
				txt = txt.toLowerCase();
			ta.value = txt;
			if (title) {
				ti.innerHTML = title;
				ti.hidden = false;
			}
			else {
				ti.hidden = true;
			}
			if (job == 'list basic escaped') {
				me.hidden = true;
				escCtrl.hidden = false;
				updateEscapedListing();
			}
			else if (job) {
				adjustSelect(UIids.dialogTextExportMemSelectMode, job);
				document.getElementById(UIids.dialogTextExportMemStart).value = '0000';
				document.getElementById(UIids.dialogTextExportMemEnd).value = (memSnapshot.length-1).toString(16).toUpperCase();
				me.hidden = false;
				escCtrl.hidden = true;
			}
			else {
				me.hidden = escCtrl.hidden = true;
			}
			el.hidden = false;
			if (!me.hidden) {
				var fld = document.getElementById(UIids.dialogTextExportMemStart);
				fld.select();
				fld.focus();
			}
			else {
				ta.select();
				ta.focus();
			}
			var content = document.getElementById(UIids.dialogTextExportContent);
			content.style.marginTop = Math.max(2, Math.floor((window.innerHeight - content.offsetHeight) / 2)) + 'px';
		}
		else {
			return txt;
		}
	}

	function updateTextExportCase() {
		var ta = document.getElementById(UIids.dialogTextExportTextarea),
			cbx = document.getElementById(UIids.dialogTextExportCbxLowerCase);
		if (cbx.checked) ta.value = ta.value.toLowerCase();
		else ta.value = ta.value.toUpperCase();
	}

	var memSnapshot = [];

	function updateEscapedListing() {
		var useHex = document.getElementById(UIids.dialogTextExportCbxEscapeHex).checked,
			useLabels = document.getElementById(UIids.dialogTextExportCbxEscapeLabels).checked,
			ta = document.getElementById(UIids.dialogTextExportTextarea),
			txt = PetUtils.basic2Txt(memSnapshot, 0x401, true, useHex, useLabels);
		if (!txt) txt = UIstrings.listingNoPrgFound;
		else if (document.getElementById(UIids.dialogTextExportCbxLowerCase).checked) txt = txt.toLowerCase();
		ta.value = txt;
		ta.select();
		ta.focus();
	}

	function updateTextExport() {
		function to4DigitsHex(n) {
			s = n.toString(16).toUpperCase();
			while (s.length < 4) s = '0'+s;
			return s;
		}
		var select = document.getElementById(UIids.dialogTextExportMemSelectMode),
			ta = document.getElementById(UIids.dialogTextExportTextarea),
			ctrlStart = document.getElementById(UIids.dialogTextExportMemStart),
			ctrlEnd = document.getElementById(UIids.dialogTextExportMemEnd),
			start = parseInt(ctrlStart.value, 16),
			end = parseInt(ctrlEnd.value, 16),
			ROM_ADDR = pet2001.hw.getRomAddr();

		// set bounds to either RAM or ROM ranges (defaults to full RAM range)
		if (!isNaN(start) && start >= ROM_ADDR) {
			var IO_ADDR = pet2001.hw.getIOAddr(),
				IO_SIZE = pet2001.hw.getIOSize(),
				loROMbtm = ROM_ADDR,
				loROMtop = IO_ADDR - 1,
				hiROMbtm = IO_ADDR + IO_SIZE,
				hiROMtop = 0xFFFF;
			if (memSnapshot.length < ROM_ADDR) {
				for (var i = loROMbtm; i <= loROMtop; i++ ) memSnapshot[i] = pet2001.hw.read(i);
				for (var i = hiROMbtm; i <= hiROMtop; i++ ) memSnapshot[i] = pet2001.hw.read(i);
			}
			if (start > hiROMtop || (start > loROMtop && start < hiROMbtm)) start = hiROMbtm;
			if (start <= loROMtop) {
				if (isNaN(end) || end <= start || end > loROMtop) end = loROMtop;
			}
			else {
				if (isNaN(end) || end <= start || end > hiROMtop) end = hiROMtop;
			}
		}
		else {
			var maxRAM = pet2001.hw.getRamSize()-1;
			if (isNaN(start) || start > maxRAM) start = 0;
			if (isNaN(end) || end < start || end > maxRAM) end = maxRAM;
		}
		// update controls
		ctrlStart.value = to4DigitsHex(start);
		ctrlEnd.value = to4DigitsHex(end);
		// update output
		switch(select.options[select.selectedIndex].value) {
			case 'hex-dump':
				ta.value = PetUtils.hexDump(memSnapshot, start, end); break;
			case 'disassembly':
				ta.value = PetUtils.disassemble(memSnapshot, start, end); break;
		}
		ta.select();
		ta.focus();
	}

	function hideTextExport() {
		var el =  document.getElementById(UIids.dialogTextExport);
		if (el) {
			el.hidden = true;
			el.value='';
		}
		memSnapshot.length = 0;
		resumeFromPopup();
	}

	function exportScreenText(asHexDump, asBasicSrc) {
		if (asBasicSrc) {
			exportScreenAsProgram();
			return;
		}
		showTextExport(UIstrings.exportTitleScreenDump, pet2001.video.exportText(asHexDump));
	}

	function exportScreenAsProgram() {
		var el = document.getElementById(UIids.dialogSrcExport),
			panel = document.getElementById(UIids.dialogSrcExportContent);
		if (el && panel) {
			PetUtils.ScreenGenerator.load(pet2001.video.vidram);
			prepareForPopup();
			el.hidden = false;
			generateScreenAsProgram();
			panel.style.marginTop = Math.max(2, Math.floor((panel.offsetParent.offsetHeight - panel.offsetHeight) / 2) - 32) + 'px';
		}
	}

	var currentDataLinkOpt;

	function exportUrl(opt) {
		var el = document.getElementById(UIids.dialogUrlExport),
			panel = document.getElementById(UIids.dialogUrlExportContent);
			title = document.getElementById(UIids.dialogUrlExportTitle);
		title.innerHTML = (opt === 'link-screen'? UIstrings.urlExportTitleScreen:UIstrings.urlExportTitleBasic);
		currentDataLinkOpt = opt;
		generateDataLink();
		el.hidden = false;
		prepareForPopup();
		panel.style.marginTop = Math.max(2, Math.floor((panel.offsetParent.offsetHeight - panel.offsetHeight) / 2) - 32) + 'px';
	}

	function generateDataLink() {
		var encodingSelect = document.getElementById(UIids.dialogUrlExportSelectEncoding),
			formatSelect = document.getElementById(UIids.dialogUrlExportSelectFormat),
			linkPane = document.getElementById(UIids.dialogUrlExportLinkPane),
			ctrlPane = document.getElementById(UIids.dialogUrlExportCtrl),
			autorun = document.getElementById(UIids.dialogUrlExportCbxAutoRun).checked,
			encodingIndex = encodingSelect.selectedIndex,
			formatIndex = formatSelect.selectedIndex,
			base64 = Boolean(encodingIndex >= 0 && encodingSelect.options[encodingIndex].value === 'base64'),
			asFragment = Boolean(formatIndex >= 0 && formatSelect.options[formatIndex].value === 'fragment'),
			url = currentDataLinkOpt == 'link-basic'?
				getBasicUrl(base64, autorun, asFragment):
				getScreenUrl(base64, autorun, asFragment);
		if (url) {
			url = url.replace(/&/g, '&amp;');
			url = '<a href="'+url+'">'+url+'</a><br /><br />' + UIstrings.urlExportMsgRightClickToCopy;
			linkPane.innerHTML = url;
			ctrlPane.hidden = false;
		}
		else {
			linkPane.innerHTML = '<em>' + UIstrings.urlExportMsgNoPrg + '</em>';
			ctrlPane.hidden = true;
		}
	}

	function hideUrlExport() {
		document.getElementById(UIids.dialogUrlExport).hidden = true;
		resumeFromPopup();
	}

	function getBasicUrl(base64, autorun, asFragment) {
		var mem = [], maxRAM = pet2001.hw.getRamSize();
		pet2001.hw.readRam(0, mem, maxRAM);
		var txt = PetUtils.basic2Txt(mem, 0x401, true);
		if (!txt) return '';
		return getDataUrl(txt, base64, autorun, asFragment);
	}

	function getScreenUrl(base64, autorun, asFragment) {
		PetUtils.ScreenGenerator.load(pet2001.video.vidram);
		return getDataUrl(PetUtils.ScreenGenerator.generate(100, 10, true, true), base64, autorun, asFragment);
	}

	function getDataUrl(txt, base64, autorun, asFragment) {
		txt = txt.replace(/\u03C0/g, '\\pi');
		var sep = asFragment? '#':'?',
			url = location.origin + location.pathname + sep +'data=' + (base64? 'base64:' + btoa(txt):encodeURIComponent(txt));
		if (typeof autorun === 'undefined' || autorun) url += '&autorun=true';
		return url;
	}

	function generateScreenAsProgram() {
		var ta = document.getElementById(UIids.dialogSrcExportTextarea),
			elLineNumber = document.getElementById(UIids.dialogSrcExportLineNumber),
			elLineStep = document.getElementById(UIids.dialogSrcExportStep),
			elUpperCase = document.getElementById(UIids.dialogSrcExportCbxUpperCase),
			elTrim = document.getElementById(UIids.dialogSrcExportCbxTrim),
			selectEscapeFormat = document.getElementById(UIids.dialogSrcExportSelectEscapeFormat),
			lineNumber, step, toUpperCase, trim, escapeFmt, useEscapes, useHex, useLabels;
		if (elLineNumber) {
			lineNumber = elLineNumber.value.replace(/\..*/, '').replace(/[^0-9]/g, '');
			lineNumber = parseInt(lineNumber);
			if (!lineNumber || isNaN(lineNumber)) lineNumber = 1000;
			elLineNumber.value = lineNumber;
		}
		if (elLineStep) {
			step = elLineStep.value.replace(/\..*/, '').replace(/[^0-9]/g, '');
			step = parseInt(step);
			if (!step || isNaN(step)) step = 10;
			elLineStep.value = step;
		}
		toUpperCase = elUpperCase? elUpperCase.checked:true;
		trim = elTrim? elTrim.checked:true;
		escapeFmt = selectEscapeFormat.options[selectEscapeFormat.selectedIndex].value;
		useEscapes =  escapeFmt !== 'portable';
		useHex = escapeFmt.indexOf('hex') >= 0;
		useLabels = escapeFmt.indexOf('labels') >= 0;
		ta.value = PetUtils.ScreenGenerator.generate(lineNumber, step, toUpperCase, trim, useEscapes, useHex, useLabels);
		ta.select();
		ta.focus();
	}

	function hideScreenAsProgram() {
		PetUtils.ScreenGenerator.unload();
		document.getElementById(UIids.dialogSrcExport).hidden=true;
		resumeFromPopup();
	}

	function showScreenshot(withMargins) {
		var dataUrl = pet2001.video.exportImage(withMargins);
		if (dataUrl) showImageExport(dataUrl);
	}

	function showHardCopy(rasterSize, dotSize) {
		var dataUrl = pet2001.video.exportHardCopy(rasterSize, dotSize);
		if (dataUrl) showImageExport(dataUrl);
	}

	function showImageExport(dataUrl) {
		var el = document.getElementById(UIids.dialogImgExport),
			parentEl = document.getElementById(UIids.dialogImgExportImgWrapper);
		if (el && parentEl) {
			while (parentEl.firstChild) parentEl.removeChild(parentEl.firstChild);
			var img = new Image();
			img.src = dataUrl;
			parentEl.appendChild(img);
			prepareForPopup();
			el.hidden = false;
			img.onload = function() {
				var content = document.getElementById(UIids.dialogImgExportContent);
				content.style.marginTop = Math.max(2, Math.floor((window.innerHeight - content.offsetHeight) / 2)) + 'px';
			};
		}
	}

	function hideImageExport() {
		document.getElementById(UIids.dialogImgExport).hidden=true;
		resumeFromPopup();
	}

	function toggleHelp(optId) {
		var el = document.getElementById(UIids.help);
		if (el) {
			if (el.hidden) {
				prepareForPopup();
				el.hidden = false;
				if (optId) {
					var target = document.getElementById(optId);
					if (target) target.scrollIntoView();
				}
				document.body.classList.add('helpMode');
			}
			else {
				resumeFromPopup();
				el.hidden = true;
				document.body.classList.remove('helpMode');
			}
		}
	}

	function enableDragAndDropLoader(el) {
		function dropStart(event) {
			stopEvent(event);
			el.className = UIclasses.dragdrop;
		}
		function dropEnd(event) {
			stopEvent(event);
			el.className='';
		}
		function stopEvent(event) {
			event.preventDefault();
			event.returnValue = false;
		}
		function dropHandler(event) {
			dropEnd(event);
			if (event.dataTransfer.files.length) {
				var file = event.dataTransfer.files[0], formatFound = false,
					filename = file.name.replace(/^.*[\\\/]/, '');
				if ((/\.(pro?g|pet|p[0-9]{2})$/i).test(filename)) {
					pet2001.reset();
					loadFile(file, event.shiftKey? function() {autoLoad('*', false, false);}:autoLoad);
					setMountedMedia('bin', filename);
					formatFound = true;
				}
				else if ((/\.d64$/i).test(filename)) {
					PetUtils.D64.readDiskImage(file);
					formatFound = true;
				}
				else if ((/\.(te?xt|bas?)$/i).test(filename)) {
					pet2001.reset();
					loadFile(file, function() {autoLoad('*', false, false);});
					setMountedMedia('txt', filename);
					formatFound = true;
				}
				else if ((/\.t64$/i).test(file.name)) {
					PetUtils.T64.readImage(file);
					formatFound = true;
				}
				if (formatFound) {
					try { // reset html file input (just in case)
						document.getElementById('loadfile').value = '';
					}
					catch(ex) {}
				}
			}
		}
		if (el && typeof FileReader !== 'undefined') {
			el.addEventListener('dragover', stopEvent, false);
			el.addEventListener('dragenter', dropStart, false);
			el.addEventListener('dragleave', dropEnd, false);
			el.addEventListener('drop', dropHandler, false);
		}
	}

	function autoLoad(fname, forceBasicStart, run) {
		waitForCursor(function() {autoRun(fname, forceBasicStart, run);});
	}

	function autoRun(fname, forceBasicStart, run) {
		fname = fname? switchStringCase(fname) : '*';
		if (forceBasicStart) fname = forcedBasicLoadDriveString + ':' + fname; // drive 1
		var cmds = ['load "' + fname + '",8'];
		if (run !== false) cmds.push('run');
		petKeys.type(cmds);
		var el = document.getElementById(UIids.kbdFocusTarget);
		if (el && el.focus) el.focus();
	}

	function switchStringCase(s) {
		var t = '';
		for (var i=0; i<s.length; i++) {
			var c = s.charAt(i);
			if (c >= 'A' && c <= 'Z') t += c.toLowerCase();
			else if (c >= 'a' && c <= 'z') t += c.toUpperCase();
			else t += c;
		}
		return t;
	}

	// wait for the cursor to become active

	function waitForCursor(callback) {
		var hw = pet2001.hw, cursorOnFlag = pet2001.getRomVers() == 1? 548:167;
		function waitForIt() {
			if (hw.read(cursorOnFlag)) setTimeout(waitForIt, 20);
			else if (typeof callback === 'function') callback();
		}
		waitForIt();
	}

	// media (d64/t64) directories (NL, 2017-2018)

	var dirList, mountType;

	function displayDirectoryList(mode, dir, mediaName, presetAsBasic, presetAutorun) {
    closeControlsDialog();

    if (!dir || dir.length == 0) {
			console.warn('no directory information available.');
			return;
		}
		var displayPane = document.getElementById(UIids.dialogDirectory),
			list = document.getElementById(UIids.dialogDirectoryList),
			title = document.getElementById(UIids.dialogDirectoryTitle);
		if (!displayPane || !list) return;
		while (list.firstChild) list.removeChild(list.firstChild);
		dirList = [];
		for (var i=0; i<dir.length; i++) {
			var e = dir[i];
			if (!e.display) continue;
			var	li = document.createElement('li'),
				input = document.createElement('input'),
				label = document.createElement('label'),
				name = document.createElement('span'),
				size = document.createElement('span');
			input.type = 'radio';
			input.name = 'directoryItemSelection';
			input.id = '_directoryItem_' + i;
			input.value = e.index;
			label.setAttribute('for', input.id);
			name.className = UIclasses.directoryListFileName;
			name.innerText = e.name;
			size.className = UIclasses.directoryListFileSize;
			size.innerText = e.size + ' K';
			label.appendChild(name);
			label.appendChild(size);
			li.className = UIclasses.directoryListItem +' '+ (i %2 ?
				UIclasses.directoryListItemOdd : UIclasses.directoryListItemEven);
			li.appendChild(input);
			li.appendChild(label);
			list.appendChild(li);
			dirList.push(input);
		}
		if (title) {
			if (mode === 'T64') {
				title.innerText = UIstrings.directoryListTitleT64;
			}
			else {
				var t = document.createElement('strong');
				t.innerText = mediaName;
				title.innerHTML = UIstrings.directoryListTitleDisk + ': ' + t.outerHTML;
			}
		}
		adjustSelect(UIids.dialogDirectorySelectRam, Math.round(pet2001.getRamSize()/1024));
		if (typeof presetAsBasic !== 'undefined') {
			var cbx = document.getElementById(UIids.dialogDirectoryCbxAsBasic);
			if (cbx) cbx.checked = presetAsBasic;
		}
		if (typeof presetAutorun !== 'undefined') {
			cbx = document.getElementById(UIids.dialogDirectoryCbxAutoRun);
			if (cbx) cbx.checked = presetAutorun;
		}
		prepareForPopup();
		displayPane.hidden = false;
		if (list.focus) list.focus();
		setMountedMedia(mode, mediaName);
	}

	function setMountedMedia(type, name) {
		var iconType;
		if (type) {
			switch(type.toLowerCase()) {
				case 'd64':
					iconType = 'disk'; mountType = 'D64'; break;
				case 't64':
					iconType = 'tape'; mountType = 'T64'; break;
				case 'ba':
				case 'bas':
				case 'text':
				case 'txt':
					iconType = 'bas'; mountType = 'BAS'; break;
				default:
					iconType = 'bin';
					mountType = (/^p[0-9]+i/).test(type)? 'BAS':'BIN';
					break;
			}
		}
		else {
			iconType = 'none';
			mountType = '';
		}
		var icon = document.querySelector('svg#fileIcon use');
		if (icon) icon.setAttribute('xlink:href', '#icon-'+iconType);
		var label = document.getElementById('mountedFileName');
		if (label) label.textContent = name? '"'+name+'"' : 'none.';
		
		var el =  document.getElementById(UIids.btnDiskDirectory);
		el.hidden = mountType !== 'D64';
		el =  document.getElementById(UIids.btnTapeDirector);
		el.hidden = mountType !== 'T64';
	}

	function activateMountedMedia() {
    closeControlsDialog();
		switch(mountType) {
			case 'D64': PetUtils.D64.displayDirectory(); break;
			case 'T64': PetUtils.T64.displayDirectory(); break;
			case 'BIN':
			case 'BAS':
				showConfirmDialog(UIstrings.dialogReset, function() {
					reset();
					if (mountType !== 'BAS') {
						setKeyRepeat(false);
						adjustSelect(UIids.selectKeyRepeat, 'false');
					}
					autoLoad('*', false, true);
				});
				break;
		}
	}

	function loadSelectedDirectoryIndex(autorrun, forceBasicStart, reset) {
		var index = -1;
		for (var i = 0; i < dirList.length; i++) {
			if (dirList[i].checked) {
				index = parseInt(dirList[i].value, 10);
				break;
			}
		}
		if (index < 0) index = 0;
		var minRamSelect = document.getElementById(UIids.dialogDirectorySelectRam),
			minRam = minRamSelect? parseInt(minRamSelect.options[minRamSelect.selectedIndex].value):0,
			loader =  mountType === 'T64'?  PetUtils.T64:PetUtils.D64;
		loader.loadFile(index, forceBasicStart, autorrun, reset, minRam);
		closeDirectoryList();
	}

	function closeDirectoryList() {
		if (dirList) dirList.length = 0;
		var el = document.getElementById(UIids.dialogDirectory);
		if (el) el.hidden = true;
		resumeFromPopup();
	}

	function loadFromMountedMedia(filename) {
		if (!mountType) return;
		filename = String(filename || '*').replace(/0xff/g, '\u03C0');
		var file,
			forceBasicStart = false,
			matches = (/^([0-9]):(.*)$/).exec(filename);
		if (matches) {
			filename = matches[2];
			if (matches[1] == forcedBasicLoadDriveString) forceBasicStart = true;
		}
		if (mountType === 'D64') file = PetUtils.D64.getFile(filename);
		else if (mountType === 'T64') file = PetUtils.T64.getFile(filename);
		if (file && file.bytes.length)
			pet2001.ieeeLoadData(forceBasicStart? 0x0401:file.address, file.bytes);
	}

	// special display for Computer Space 2001

	function showCS2001Labels() {
		var el = document.getElementById(UIids.CS2001LabelsParent);
		if (el) {
			var labels = document.createElement('div');
			labels.id = UIids.CS2001Labels;
			el.appendChild(labels);
		}
	}

	function hideCS2001Labels() {
		var el = document.getElementById(UIids.CS2001Labels);
		if (el && el.parentNode) el.parentNode.removeChild(el);
	}

	// touch-active cursor, position cursor on screen click (NL, 2017)

	var cursorbase,
		screenClickMsgShown = true; // disabled for being annoying

	function observeScreenClicks(v) {
		var el = document.getElementById(UIids.touchClickTarget);
		cursorbase = document.getElementById(UIids.screenCanvas);
		if (!el || !cursorbase) return;
		if (v) {
			if (!screenClickMsgShown) {
				alert('Set the cursor position by simply tapping or clicking the screen. \u2014 It is recommended to deactivate this option while running programs, as it may interfere with INPUT statements and other prompts with an active cursor.');
				screenClickMsgShown = true;
			}
			if (typeof el.onpointerdown !== 'undefined') {
				el.addEventListener('pointerdown', screenClick, false);
			}
			else {
				el.addEventListener('mousedown', screenClick, false);
				el.addEventListener('touchstart', screenClick, false);
			}
		}
		else {
			if (typeof el.onpointerdown !== 'undefined') {
				el.removeEventListener('pointerdown', screenClick, false);
			}
			else {
				el.removeEventListener('mousedown', screenClick);
				el.removeEventListener('touchstart', screenClick, false);
			}
		}
	}

	function screenClick(event) {
		event.preventDefault();
		event.stopPropagation();
		if (petKeys.busy()) return;

		var hw = pet2001.hw, cursorOnFlag;

		if (pet2001.getRomVers() == 1) {
			cursorOnFlag = 548;
		}
		else  {
			cursorOnFlag = 167;
		}
		if (hw.read(cursorOnFlag) != 0) return;

		var	MARGIN = 5,
			bb = cursorbase.getBoundingClientRect(),
			x, y, row, col;
		if (event.type === 'touchstart') {
			var touch = event.touches[0];
			x = touch.pageX;
			y = touch.pageY;
		}
		else {
			x = event.pageX;
			y = event.pageY;
		}
		row = Math.max(0, Math.floor((y-window.pageYOffset-bb.top-MARGIN)/16));
		col = Math.max(0, Math.floor((x-window.pageXOffset-bb.left-MARGIN)/16));
		setCursor(row, col);
	}

	function setCursor(row, col) {
		var hw = pet2001.hw,
			crsrBlinkFlag, crsrChar, quoteFlag, rvsFlag, insertCnt,
			curScreenLine, curLineCol, startOfLinePtr, maxLineLength,
			lsbVideoTable, hsbVideoTable;

		if (row < 0) row = 0;
		else if (row > 24) row = 24;
		if (col < 0) col = 0;
		else if (col > 39) col = 39;

		if (pet2001.getRomVers() == 1) {
			curScreenLine = 0xF5;
			curLineCol = 0xE2;
			startOfLinePtr = 0xE0;
			maxLineLength = 0xF2;
			hsbVideoTable = 0x0229;
			lsbVideoTable = 0xE7BC;
			crsrBlinkFlag = 0x0227;
			crsrChar = 0x0226;
			quoteFlag = 0xEA;
			insertCnt = 0xFB;
			rvsFlag = 0x020E;
		}
		else {
			curScreenLine = 0xD8;
			curLineCol = 0xC6;
			startOfLinePtr = 0xC4;
			maxLineLength = 0xD5;
			hsbVideoTable = 0xE0;
			lsbVideoTable = 0xE748;
			crsrBlinkFlag = 0xAA;
			crsrChar = 0xA9;
			quoteFlag = 0xCD;
			rvsFlag = 0x9F;
			insertCnt = 0xDC;
		}
		// unblink
		if (hw.read(crsrBlinkFlag)) {
			hw.write(crsrBlinkFlag, 0);
			pet2001.video.forcedWrite(
				hw.read(startOfLinePtr) + (hw.read(startOfLinePtr+1)<<8)
					+ hw.read(curLineCol) - hw.getVideoAddr(),
				hw.read(crsrChar)
			);
		}
		// clear input mode flags
		hw.write(quoteFlag, 0);
		hw.write(rvsFlag, 0);
		hw.write(insertCnt, 0);
		// is target row a long line (more than 40 chars)?
		if (row > 0 && (hw.read(hsbVideoTable + row) & 0x80) == 0) {
			row--;
			col += 40;
		}
		// set cursor like ROM routine
		// compare 0xE5DB (ROM1) and 0xE25D (ROM2)
		hw.write(curScreenLine, row);
		hw.write(startOfLinePtr+1, hw.read(hsbVideoTable+row) | 0x80);
		hw.write(startOfLinePtr, hw.read(lsbVideoTable+row));
		if (row < 24 && (hw.read(hsbVideoTable+1+row) & 0x80) == 0) {
			hw.write(maxLineLength, 79);
		}
		else {
			hw.write(maxLineLength, 39);
		}
		// as in ROM, won't work for long lines
		/*
		if (col>=40) {
			hw.write(curLineCol, col-40);
		}
		else {
			hw.write(curLineCol, col);
		}
		*/
		// since we compensated for long lines above, write col as-is
		hw.write(curLineCol, col);
	}

	// context menu

	var screenCtxMenu, ctxMenuShield, ctxScrollX, ctxScrollY;

	function createScreenContextMenu() {
		var data = [
			{ 'label': 'Copy As Text', 'task': 'copy' },
			//{ 'label': 'Paste', 'task': 'paste', 'sepAfter': true },
			{ 'label': 'Export Screen As Image&hellip;', 'task': 'screen as img' },
			{ 'label': 'Export Screen As Text&hellip;', 'task': 'screen as text' },
			{ 'label': 'Hex-Dump Video Memory&hellip;', 'task': 'screen as hex', 'sepAfter': true },
			{ 'label': 'Switch Screen Color', 'task': 'switch color' },
			{ 'label': 'Switch Character Set&hellip;', 'task': 'switch characterset' }
		];
		if (!document.queryCommandSupported('copy') && !navigator.clipboard) data.shift();
		var menuRoot = document.createElement('ul');
		for (var i=0; i<data.length; i++) {
			var dataItem = data[i],
				menuItem = document.createElement('li');
			if (dataItem.sepAfter) menuItem.className = UIclasses.screenCtxMenuSeparator;
			menuItem.setAttribute('data-task', dataItem.task);
			menuItem.innerHTML = dataItem.label;
			menuRoot.appendChild(menuItem);
		}
		screenCtxMenu = document.createElement('menu');
		screenCtxMenu.className = UIclasses.screenCtxMenu;
		screenCtxMenu.appendChild(menuRoot);
		ctxMenuShield = document.createElement('div');
		ctxMenuShield.className = UIclasses.ctxMenuShield;
		ctxMenuShield.addEventListener('contextmenu', hideScreenCtxMenu, true);
		ctxMenuShield.addEventListener('click', hideScreenCtxMenu, false);
		document.getElementById(UIids.screenCtxMenuTarget).addEventListener('contextmenu', showScreenCtxMenu, false);
	}

	function showScreenCtxMenu(event) {
		var x = 0, y = 0;
		if (event.pageX || event.pageY) {
			x = event.pageX;
			y = event.pageY;
		}
		else if (event.clientX || event.clientY) {
			x = event.clientX + document.body.scrollLeft +  document.documentElement.scrollLeft;
			y = event.clientY + document.body.scrollTop +  document.documentElement.scrollTop;
		}
		else return;
		var body = document.getElementsByTagName('body')[0];
		y = Math.max(0, y - 24);
		screenCtxMenu.style.left = (x + 1) + 'px';
		screenCtxMenu.style.top = y + 'px';
		body.appendChild(ctxMenuShield);
		body.appendChild(screenCtxMenu);
		var rect = screenCtxMenu.getBoundingClientRect();
			w = rect.width,
			h = rect.height,
			maxx = window.innerWidth + window.scrollX + 20,
			maxy = window.innerHeight + window.scrollY - 24;
		if (x + w > maxx && x - w > 0) screenCtxMenu.style.left = (x - w - 1) + 'px';
		if (y + h >= maxy) screenCtxMenu.style.top = Math.max(0, maxy - h) + 'px';
		window.addEventListener('click', screenCtxMenuHandler, true);
		event.preventDefault();
		event.returnValue = false;
		ctxScrollLock(true);
		return false;
	}

	function hideScreenCtxMenu(event) {
		ctxScrollLock(false);
		window.removeEventListener('click', screenCtxMenuHandler, true);
		if (screenCtxMenu.parentNode) screenCtxMenu.parentNode.removeChild(screenCtxMenu);
		if (ctxMenuShield.parentNode) ctxMenuShield.parentNode.removeChild(ctxMenuShield);
		event.preventDefault();
		event.stopPropagation();
		if (event.stopImmediatePropagation) event.stopImmediatePropagation();
		event.cancelBuble = false;
		event.returnValue = false;
		return false;
	}

	function screenCtxMenuHandler(event) {
		var target = event.target || this;
		var task = target.nodeType === 1 && target.nodeName === 'LI' &&
			screenCtxMenu.contains(target) && target.getAttribute('data-task');
		hideScreenCtxMenu(event);
		if (task) {
			switch (task) {
				case 'copy':
					clipboardCopy(pet2001.video.exportText(false)); break;
				case 'paste':
					clipboardPaste(event); break;
				case 'screen as img':
					showScreenshot(true); break;
				case 'screen as text':
					showTextExport('Screen Text (Unicode)', pet2001.video.exportText(false)); break;
				case 'screen as hex':
					showTextExport('Screen Memory', pet2001.video.exportText(true)); break;
				case 'switch characterset':
					switchCharacterSet(); break;
				case 'switch color':
					var clr = pet2001.video.getColor() === 'green'? 'white':'green';
					pet2001.video.setColor(clr);
					adjustSelect(UIids.selectScreenColor, clr);
			}
		}
		return false;
	}

	function ctxScrollHandler(event) {
		event.preventDefault();
		event.stopPropagation();
		window.scrollTo(ctxScrollX, ctxScrollY);
		event.returnValue = false;
		return false;
	}

	function ctxScrollLock(enable) {
		if (enable) {
			ctxScrollX = window.scrollX;
			ctxScrollY = window.scrollY;
			window.addEventListener('scroll', ctxScrollHandler, false);
			window.addEventListener('mousewheel', ctxScrollHandler, false);
		}
		else {
			window.removeEventListener('scroll', ctxScrollHandler);
			window.removeEventListener('mousewheel', ctxScrollHandler);
		}
	}

	function clipboardCopy(text) {
		if (navigator.clipboard && navigator.clipboard.writeText) {
			navigator.clipboard.writeText(text);
			return;
		}
		var ta = document.createElement('textarea'),
			s = ta.style,
			body = document.getElementsByTagName('body')[0];
		s.border = s.margin= s.padding = 0;
		s.position = 'absolute';
		s.left = '-9999px';
		s.top = '0px';
		ta.value = text;
		body.appendChild(ta);
		ta.focus();
		ta.select();
		try {
			document.execCommand('copy');
		}
		catch (e) {}
		body.removeChild(ta);
		var el = document.getElementById(UIids.kbdFocusTarget);
		if (el && el.focus) el.focus();
	}

	function clipboardPaste(event) {
		if (event) event.preventDefault();
		var text;
		if (navigator.clipboard && navigator.clipboard.readText) {
			text = navigator.clipboard.readText();
			if (text) {
				petKeys.type(text);
				return;
			}
		}
		if (event.clipboardData) {
			text = event.clipboardData.getData('text/plain');
		}
		else if (window.clipboardData) {
			text =  window.clipboardData.getData('Text');
		}
		if (text) petKeys.type(text);
	}


	// visibility API handling

	var visibilityHidden, visibilityChangeEvent, visibilityChangeRunStateFlag;

	function enableVisibilityChangeDetection() {
		if (visibilityHidden) return;
		if (typeof document.hidden!=='undefined') {
			visibilityHidden='hidden';
			visibilityChangeEvent='visibilitychange';
		}
		else if (typeof document.mozHidden!=='undefined') {
			visibilityHidden='mozHidden';
			visibilityChangeEvent='mozvisibilitychange';
		}
		else if (typeof document.msHidden!=='undefined') {
			visibilityHidden='msHidden';
			visibilityChangeEvent='msvisibilitychange';
		}
		else if (typeof document.webkitHidden!=='undefined') {
			visibilityHidden='webkitHidden';
			visibilityChangeEvent='webkitvisibilitychange';
		}
		if (visibilityHidden) document.addEventListener(visibilityChangeEvent, handleVisibilityChange, false);
	}

	function disableVisibilityChangeDetection() {
		if (visibilityHidden) document.removeEventListener(visibilityChangeEvent, handleVisibilityChange);
		visibilityHidden='';
	}

	function handleVisibilityChange() {
		if (document[visibilityHidden]) {
			visibilityChangeRunStateFlag = pause(true);
		}
		else {
			if (visibilityChangeRunStateFlag) pause(false);
		}
	}

	// prg-library

	function showPrgLibrary(url, separateWindow) {
		if (separateWindow) {
			window.open(url);
			return;
		}
		var el = document.getElementById(UIids.prgLibrary),
			iframe = document.getElementById(UIids.prgLibraryIframe);
		if (!el || !iframe) return;
		prepareForPopup();
		if (navigator.userAgent.match(/(iPod|iPhone|iPad|iOS)/)) iframe.parentNode.className = 'ios';
		iframe.src = url;
		el.hidden = false;
		if (iframe.focus) iframe.focus();
	}

	function prgLibraryScrollToYiOS(y) {
		var iframe = document.getElementById(UIids.prgLibraryIframe);
		if (iframe) iframe.parentNode.scrollTop = y || 0;
	}

	function hidePrgLibrary() {
		resumeFromPopup();
		document.getElementById(UIids.prgLibrary).hidden = true;
	}

	function loadFromPrgLibrary(params, createHistoryEntry) {
		hidePrgLibrary();
		for (var p in configDefaults) config[p] = configDefaults[p];
		var autorun = parseSetupParams(params, config);
		resetToConfig();
		waitForCursor(function() {
			var loadedTitle = parsePrgParams(params, autorun);
			if (history.pushState && createHistoryEntry) {
				setTitle(loadedTitle);
				history.pushState({}, document.title, params);
			}
			else setTitle();
		});
	}

	// params and setup handling

	function historyPopStateHandler(event) {
		loadFromPrgLibrary(getQuery(), false);
	}

	function setTitle(subtitle) {
		var t = String(document.title).replace(/ \(.+/, '');
		if (subtitle) {
			subtitle = subtitle.replace(/\.(?:prg|pet|txt|bas?|p[0-9]+)$/, '');
			if (subtitle) t += ' (' + subtitle + ')';
		}
		document.title = t;
	}

	function getQuery() {
		if (window.location.search.length > 1)  return window.location.search;
		if (window.location.hash.length > 1) return '?' + window.location.hash.substring(1);
		return '';
	}

	// check url parameters on start up

	function parseSetupParams(query, configObj) {
		var opts = {
			'boolean': {
				'true': true,
				'on': true,
				'yes': true,
				'y': true,
				'1': true,
				'false': false,
				'off': false,
				'no': false,
				'n': false,
				'0': false
			},
			'screenColors': {
				'green': 'green',
				'white': 'white',
				'blue': 'white'
			},
			'ram': {
				'8': 8*1024,
				'16': 16*1024,
				'32': 32*1024
			},
			'rom': {
				'1': 1,
				'1.0': 1,
				'old': 1,
				'2': 2,
				'2.0': 2,
				'new': 2
			},
			'kbd': {
				'repeat': true,
				'edit': true,
				'editing': true,
				'norepeat': false,
				'games': false,
				'gaming': false
			}
		};

		var matches, v, autorun = false;

		function getValueFor(val, opt) {
			return opt[val.toLowerCase()];
		}

		matches = (/[?&](?:keyboard|kbd)(?:mode)?=([^&]+)/i).exec(query);
		if (matches) {
			v = getValueFor(matches[1], opts.kbd);
			if (typeof v !== 'undefined') configObj.KEYBOARD_REPEAT = v;
		}
		matches = (/[?&](?:repeat)=([^&]+)/i).exec(query);
		if (matches) {
			v = getValueFor(matches[1], opts.boolean);
			if (typeof v !== 'undefined') configObj.KEYBOARD_REPEAT = v;
		}
		matches = (/[?&](?:clr|colou?r|screen)=([^&]+)/i).exec(query);
		if (matches) {
			v = getValueFor(matches[1], opts.screenColors);
			if (typeof v !== 'undefined') configObj.SCREEN_COLOR = v;
		}
		matches = (/[?&](?:rom)=([^&]+)/i).exec(query);
		if (matches) {
			v = getValueFor(matches[1], opts.rom);
			if (typeof v !== 'undefined') configObj.ROM_VERSION = v;
		}
		matches = (/[?&](?:ram)=([0-9]+)/i).exec(query);
		if (matches) {
			v = getValueFor(matches[1], opts.ram);
			if (typeof v !== 'undefined') configObj.RAM_SIZE = v;
		}
		matches = (/[?&](?:autorun)=([^&]+)/i).exec(query);
		if (matches) {
			v = getValueFor(matches[1], opts.boolean);
			if (typeof v !== 'undefined') autorun = v;
		}
		return autorun;
	}

	function parsePrgParams(query, autorun) {
		var prgPath = './prgs/',
			defaultExtension = '.prg',
			matches;

		// load program from url
		matches = (/[?&](prg|prog|progr|program|run|load)=([^&]+)/i).exec(query);
		if (matches) {
			var	run = (matches[1] == 'run') || autorun,
				fileName = unescape(matches[2]).replace(/[^\u0020-\u00ff]/g, '').replace(/\\/g, '').replace(/^[\/\.]+/, ''),
				parts = fileName.split('/'), dirName;
			if ((/\.d64$/i).test(parts[0])) {
				dirName=parts[0];
				if (dirName) {
					fileName='';
					for (var i=1; i<parts.length; i++) {
						var p = parts[i].replace(/^\.+/, '');
						if (p) {
							fileName=p;
							break;
						}
					}
					var forceBasicStart = (/[?&](is|as)?basic=(1|true|yes|y|on)\b/i).test(query);
					PetUtils.D64.loadDiskImage(dirName, fileName, forceBasicStart, run);
					return fileName || dirName;
				}
			}
			else {
				fileName=parts[0];
				if (fileName) {
					var sysName = fileName.replace(/\.\w+$/, '');
					if (fileName == sysName) fileName += defaultExtension;
					var xhr = new XMLHttpRequest();
					xhr.open('GET', prgPath + encodeURIComponent(fileName) + '?uid=' + Date.now().toString(36), true);
					if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
					if (xhr.overrideMimeType) xhr.overrideMimeType('text/plain; charset=x-user-defined');
					xhr.onload = function xhr_onload() {
						if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
							if ((/\.(te?xt|bas?)$/i).test(fileName)) {
								var parsed = PetUtils.txt2Basic(xhr.response);
								if (parsed.error) alert('Parse Error\n'+parsed.error);
								else {
									pet2001.ieeeLoadData(0x401, parsed.prg);
									setMountedMedia('txt', fileName);
									autoLoad(sysName.toUpperCase(), false, run);
								}
							}
							else if ((/\.p[0-9]{2}$/i).test(fileName)) {
								var parsed = PetUtils.parseP00(new DataView(xhr.response));
								if (parsed.error) alert('Parse Error\n'+parsed.error);
								else {
									pet2001.ieeeLoadData(parsed.addr, parsed.prg);
									setMountedMedia('bin', fileName);
									autoLoad(parsed.name.toUpperCase() || sysName, false, run);
								}
							}
							else {
								var	data = new DataView(xhr.response);
									size = data.byteLength,
									addr = data.getUint8(0) + data.getUint8(1) * 256,
									bytes = Array(size - 2);
								for (var i = 0; i < size - 2; i++) bytes[i] = data.getUint8(i + 2);
								pet2001.ieeeLoadData(addr, bytes);
								setMountedMedia('bin', fileName);
								autoLoad(sysName.toUpperCase(), false);
								if ((/^computerspace2001$/i).test(sysName)) showCS2001Labels();
							}
						}
						else {
							xhr.onerror();
						}
					};
					xhr.onerror = function xhr_onerror() {
						var msg = 'PET: Unable to load file "'+fileName+'"';
						if (xhr.status) msg += ' ('+xhr.status+')';
						msg +=  (xhr.statusText? ': '+xhr.statusText:'.');
						console.warn(msg);
					};
					xhr.send(null);
				}
			}
			return fileName;
		}
		// load disk image from url
		matches = (/[?&](?:disk|dsk|floppy|d64)=([^&]+)/i).exec(query);
		if (matches) {
			var	fileName = unescape(matches[1]).replace(/[^\u0020-\u00ff]/g, '').replace(/\\/g, ''),
				parts = fileName.split('/'), dirName;
			if ((/\.d64$/i).test(parts[0])) {
				dirName=parts[0];
				fileName='';
				for (var i=1; i<parts.length; i++) {
					if (parts[i]) {
						fileName=parts[i];
						break;
					}
				}
				var forceBasicStart = (/[?&](is|as)?basic=(1|true|yes|y|on)\b/i).test(query);
				PetUtils.D64.loadDiskImage(dirName, fileName, forceBasicStart, autorun);
			}
			return fileName || dirName;
		}
		// load t64 image from url
		matches = (/[?&]t64=([^&]+)/i).exec(query);
		if (matches) {
			var	fileName = unescape(matches[1]).replace(/[^\u0020-\u00ff]/g, '').replace(/\\/g, '').replace(/\//g, '');
			if (!(/\.t64$/i).test(fileName)) filename+='.t64';
			PetUtils.T64.loadImage(fileName);
			return fileName;
		}
		// load code from url parameter
		var urldata, fname, code, execute;
		matches = (/[?&](data|execute|exec)=([^&]+)/i).exec(query);
		if (matches) {
			execute = (/^exec/i).test(matches[1]);
			urldata = matches[2];
			var fnmatches = (/[?&](file|f)?name=([^&]+)/i).exec(query);
			if (fnmatches) fname = fnmatches[2].toUpperCase();
		}
		if (urldata) {
			matches = null;
			try {
				code = decodeURIComponent(urldata.replace(/%25([0-9A-F]{2})/g, '%$2'));

				// base64: either a simple prefix "base64:" or a regular data-URI (MIME: text/plain, text/basic, application/text, application/basic, application/octet-stream)
				matches = (/^((?:data:)?(?:text\/plain|text\/basic|application\/text|application\/basic|application\/octet-stream);base64,|base64:)(.*)$/i).exec(urldata);
				if (matches) code = atob(matches[2]);
			}
			catch (e) {
				alert('Failed to decode URL-data, ' + (matches? 'base64':'URL-encoding') + '.\n' + e.message);
				return;
			}
			code = code.replace(/\r\n?/g, '\n').replace(/\\pi/gi, '\u03C0');
			if ((/^[^0-9]/).test(code) && execute) {
				// direct mode
				if (!(/[\r\n]$/).test(code)) code += '\n';
				waitForCursor(function() {
					petKeys.reset();
					petKeys.type(code.toLowerCase());
				});
			}
			else if (code) {
				var parsed = PetUtils.txt2Basic(code,
					0x0401, false, pet2001.getRomVers() == 1);
				if (parsed.error) {
					alert('Parse error in URL-data (BASIC).\n'+parsed.error);
				}
				else {
					try {
						if (fname) fname = decodeURIComponent(fname).toUpperCase();
					}
					catch (e) {
						console.warn('Failed to decode filename: ' + e.message);
						fname = '';
					}
					pet2001.ieeeLoadData(0x401, parsed.prg);
					setMountedMedia('txt', 'URL-Data.');
					autoLoad(fname || 'URL-DATA', false, autorun || execute);
				}
			}
			return 'URL-data';
		}

		// should we display the help, instead?
		matches = (/^[?&]help(?:[\/:=-](\w+))?/).exec(query);
		if (matches) {
			var helpTopic = matches[1];
			if (helpTopic && helpTopic.indexOf('petHelpTopic') < 0 && helpTopic.length > 1)
				helpTopic = 'petHelpTopic' + helpTopic.charAt(0).toUpperCase() + helpTopic.substring(1);
			toggleHelp(helpTopic);
		}
	}

  function setPETKeyboard(v) {
		var real = (typeof v === 'string') ? v.toLowerCase() === 'true':Boolean(v);
		petKeys.setPETKeyboard(real);
	}

	// parse setup and run

	function startCore() {
		adjustMenus();
		run();
		enableUI();
	}

	function init() {
		var query, autorun;

		configDefaults = {};
		for (var p in config) configDefaults[p] = config[p];
		query = getQuery();
		if (query) autorun = parseSetupParams(query, config);

		startCore();

    if (query) {
			var loadedTitle = parsePrgParams(query, autorun);
			if (loadedTitle) setTitle(loadedTitle);
		}
		window.addEventListener('popstate', historyPopStateHandler, false);
	}

	if (document.readyState === 'loading') {
		// wait for page to become interactive
		document.addEventListener('DOMContentLoaded', init, false);
	}
	else {
		// DOM is available (page loaded or interactive)
		init();
	}

	return {
		'kbdOnMouseDown': petKeys.onMouseDown,
		'kbdOnMouseUp': petKeys.onMouseUp,
		'kbdOnMouseOut': petKeys.onMouseOut,
		'resetButton': resetButton,
		'pauseButton': pause,
		'petExport': petExport,
		'setColor': setColor,
		'setKeyRepeat': setKeyRepeat,
		'romSelection': romSelection,
		'ramsizeSelection': ramsizeSelection,
		'saveFile': saveFile,
		'observeScreenClicks': observeScreenClicks,
		'updateTextExport': updateTextExport,
		'updateEscapedListing': updateEscapedListing,
		'updateTextExportCase': updateTextExportCase,
		'hideTextExport': hideTextExport,
		'closeDirectoryList': closeDirectoryList,
		'loadSelectedDirectoryIndex': loadSelectedDirectoryIndex,
		'generateDataLink': generateDataLink,
		'generateScreenAsProgram': generateScreenAsProgram,
		'hideScreenAsProgram': hideScreenAsProgram,
		'closeRenumberDialog': closeRenumberDialog,
		'hideImageExport': hideImageExport,
		'showPrgLibrary': showPrgLibrary,
		'hidePrgLibrary': hidePrgLibrary,
		'hideUrlExport': hideUrlExport,
		'hideDownloadLink': hideDownloadLink,
		'closeConfirmDialog': closeConfirmDialog,
		'autoLoad': autoLoad,
		'setRamSize': setRamSize,
		'displayDirectoryList': displayDirectoryList,
		'waitForCursor': waitForCursor,
		'renumber': renumber,
		'switchCharacterSet': switchCharacterSet,
		'toggleHelp': toggleHelp,
		'showMountDialog': showMountDialog,
		'closeMountDialog': closeMountDialog,
		'setMountedMedia': setMountedMedia,
		'loadFromPrgLibrary': loadFromPrgLibrary,
		'loadFromMountedMedia': loadFromMountedMedia,
		'activateMountedMedia': activateMountedMedia,
		'prgLibraryScrollToYiOS': prgLibraryScrollToYiOS,
		'showControlsDialog': showControlsDialog,
		'closeControlsDialog': closeControlsDialog,
    'quitButton': quitButton,
    'setPETKeyboard': setPETKeyboard
  };

})();
