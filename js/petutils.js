/*
	PET utilities, Norbert Landsteiner, 2017-2020; www.masswerk.at/pet/
	Contains
	a Basic source to tokenized prg parser,
	a parser for D64 image files,
	a facility to generate BASIC source to print a given snapshot of screen RAM,
	facilities to hex-dump BASIC programs or arbritrary memory ranges
	a 6502 disassembler
*/

"use strict";

var PetUtils = (function() {

// internal utility

function hex(n, l) {
	var s = n.toString(16).toUpperCase();
	while (s.length < l) s = '0' + s;
	return s;
}

function quoteWildCardExpr(expr) {
	return expr.replace(/([\[\]\+\-\(\)\|\\.\$\^\{\}])/g ,'\\$1').replace(/([?*])/g, '.$1')
}

var petsciiLabels = {
	0x93: 'CLEAR',
	0x13: 'HOME',
	0x11: 'DOWN',
	0x91: 'UP',
	0x9D: 'LEFT',
	0x1D: 'RIGHT',
	0x12: 'RVS ON',
	0x92: 'RVS OFF',
	0x94: 'INST'
};


var	reIsDec = /^[0-9]+$/,
	reIsHex = /^\$[0-9A-F]+$/,
	reIsAlpha = /^[A-Z]+$/,
	reMarkupIgnored = /[^$A-Z0-9]/g;

function markupToPetscii(s) {
	var s = s.toUpperCase().replace(reMarkupIgnored, '');
	if (reIsDec.test(s)) {
		return parseInt(s, 10) & 0xFF;
	}
	else if (reIsHex.test(s)) {
		return parseInt(s.substring(1), 16) & 0xFF;
	}
	else if (reIsAlpha.test(s)) {
		switch(s) {
			case 'CLEAR':
			case 'CLEARSCREEN':
			case 'CLEARSCR':
			case 'CLEARHOME':
			case 'CLRHM':
			case 'CLRH':
			case 'CLR':
			case 'CLH':
			case 'CLS':
			case 'CS':
			case 'SC':
				return 0x93;
			case 'HOME':
			case 'HOM':
			case 'HM':
			case 'CHOME':
			case 'CRSRHOME':
			case 'CH':
				return 0x13;
			case 'CRSRDOWN':
			case 'CRSRDWN':
			case 'DOWN':
			case 'DWN':
			case 'DN':
			case 'CD':
				return 0x11;
			case 'CRSRUP':
			case 'UP':
			case 'CU':
				return 0x91;
			case 'CRSRLEFT':
			case 'CRSRLFT':
			case 'LEFT':
			case 'LFT':
			case 'CL':
				return 0x9D;
			case 'CRSRRIGHT':
			case 'CRSRRGT':
			case 'RIGHT':
			case 'RGHT':
			case 'RGT':
			case 'CR':
				return 0x1D;
			case 'RVSON':
			case 'RVS':
			case 'RVON':
			case 'RON':
				return 0x12;
			case 'RVSOFF':
			case 'RVOFF':
			case 'ROFF':
			case 'ROF':
				return 0x92;
			case 'PI':
				return 0xFF;
			case 'SPACE':
			case 'SPC':
			case 'SP':
			case 'BLANK':
			case 'BL':
				return 0x20;
			case 'INSERT':
			case 'INST':
			case 'INS':
				return 0x94;
		}
	}
	return -1;
}

// parse a plain text listing to tokenized BASIC

function txt2Basic(txt, address, asPrgFile, isPetRom1) {
	// normalize arguments
	var src, startAddr;
	switch (Object.prototype.toString.call(txt)) {
		case '[object Array]':
		case '[object Uint8Array]':
			src = txt;
			break;
		case '[object ArrayBuffer]':
			txt = new DataView(txt);
		case '[object DataView]':
			var src = [], size = txt.byteLength;
			for (var i = 0; i < size; i++) src[i] = txt.getUint8(i);
			break;
		case '[object String]':
			var src = [];
			txt = txt.replace(/[“”„«»]/g, '"').replace(/[‘’‹›]/g, '\'');
			for (var i = 0; i < txt.length; i++) {
				if (txt.charAt(i) === 'π' || txt.charAt(i) === '∏') {
					src.push(0xFF);
				}
				else {
					var c = txt.charCodeAt(i);
					if (c <= 0xFF) src.push(c);
				}
			}
			break;
		default:
			return {
				'prg': [],
				'error': 'illegal input: '+Object.prototype.toString.call(txt)+'.'
			};
	}

	// unescape PETSCII from {ddd} or {$hh} or {label}
	src = function(stream) {
		var q = [], i = 0, max = stream.length - 1;
		while (i <= max) {
			var c = stream[i++];
			if (c === 0x7B) { // {
				var s = '';
				c = stream[i++];
				while (i <= max && c && c !== 0x7D) {
					s += String.fromCharCode(c);
					c = stream[i++];
				}
				var t = markupToPetscii(s);
				if (t >= 0) q.push(t);
			}
			else q.push(c);
		}
		return q;
	}(src);

	// start address defaults to PET
	startAddr = (address && !isNaN(address))?
		Number(address) & 0xFFFF
		: 0x0401;

	// defs and setup
	var	tokens = [
			0x45,0x4E,0xC4, //end
			0x46,0x4F,0xD2, //for
			0x4E,0x45,0x58,0xD4, //next
			0x44,0x41,0x54,0xC1, //data
			0x49,0x4E,0x50,0x55,0x54,0xA3, //input#
			0x49,0x4E,0x50,0x55,0xD4, //input
			0x44,0x49,0xCD, //dim
			0x52,0x45,0x41,0xC4, //read
			0x4C,0x45,0xD4, //let
			0x47,0x4F,0x54,0xCF, //goto
			0x52,0x55,0xCE, //run
			0x49,0xC6, //if
			0x52,0x45,0x53,0x54,0x4F,0x52,0xC5, //restore
			0x47,0x4F,0x53,0x55,0xC2, //gosub
			0x52,0x45,0x54,0x55,0x52,0xCE, //return
			0x52,0x45,0xCD, //rem
			0x53,0x54,0x4F,0xD0, //stop
			0x4F,0xCE, //on
			0x57,0x41,0x49,0xD4, //wait
			0x4C,0x4F,0x41,0xC4, //load
			0x53,0x41,0x56,0xC5, //save
			0x56,0x45,0x52,0x49,0x46,0xD9, //verify
			0x44,0x45,0xC6, //def
			0x50,0x4F,0x4B,0xC5, //poke
			0x50,0x52,0x49,0x4E,0x54,0xA3, //print#
			0x50,0x52,0x49,0x4E,0xD4, //print
			0x43,0x4F,0x4E,0xD4, //cont
			0x4C,0x49,0x53,0xD4, //list
			0x43,0x4C,0xD2, //clr
			0x43,0x4D,0xC4, //cmd
			0x53,0x59,0xD3, //sys
			0x4F,0x50,0x45,0xCE, //open
			0x43,0x4C,0x4F,0x53,0xC5, //close
			0x47,0x45,0xD4, //get
			0x4E,0x45,0xD7, //new
			0x54,0x41,0x42,0xA8, //tab(
			0x54,0xCF, //to
			0x46,0xCE, //fn
			0x53,0x50,0x43,0xA8, //spc(
			0x54,0x48,0x45,0xCE, //then
			0x4E,0x4F,0xD4, //not
			0x53,0x54,0x45,0xD0, //step
			0xAB, //plus
			0xAD, //minus
			0xAA, //multiply
			0xAF, //divide
			0xDE, //power
			0x41,0x4E,0xC4, //and
			0x4F,0xD2, //on
			0xBE, //greater
			0xBD, //equal
			0xBC, //less
			0x53,0x47,0xCE, //sgn
			0x49,0x4E,0xD4, //int
			0x41,0x42,0xD3, //abs
			0x55,0x53,0xD2, //usr
			0x46,0x52,0xC5, //fre
			0x50,0x4F,0xD3, //pos
			0x53,0x51,0xD2, //sqr
			0x52,0x4E,0xC4, //rnd
			0x4C,0x4F,0xC7, //log
			0x45,0x58,0xD0, //exp
			0x43,0x4F,0xD3, //cos
			0x53,0x49,0xCE, //sin
			0x54,0x41,0xCE, //tan
			0x41,0x54,0xCE, //atn
			0x50,0x45,0x45,0xCB, //peek
			0x4C,0x45,0xCE, //len
			0x53,0x54,0x52,0xA4, //str$
			0x56,0x41,0xCC, //val
			0x41,0x53,0xC3, //asc
			0x43,0x48,0x52,0xA4, //chr$
			0x4C,0x45,0x46,0x54,0xA4, //left$
			0x52,0x49,0x47,0x48,0x54,0xA4, //right$
			0x4D,0x49,0x44,0xA4, //mid$
			0x47,0xCF, //go
			0x00
		],
		lineLengthMax = 88,
		lineNumberMax = 63999,
		lines = {},
		error = '',
		idx = 0,
		srcLength = src.length,
		sl = 1,
		isLC = false,
		raw = 0,
		bigEndien = true,
		eof = false;

	// no "go" on PET 2001, ROM 1.0
	if (isPetRom1) tokens.splice(tokens.length-3, 2);

	function getCh() {
		for (;;) {
			if (idx >= srcLength) {
				raw = 0;
				eof = true;
				return 0;
			}
			var c = src[idx++];
			if ((bigEndien && c === 3 && src[idx] === 0xC0)
				|| (!bigEndien && c === 0xC0 && src[idx] === 3)
				|| (c === 0xCF && src[idx] === 0x80)) {
				idx++;
				c = 0xFF; // pi
			}
			else if (c === 0x7E || c === 0xDE)
				c = 0xFF; // copies of pi in PETSCII
			else if (c === 9) // tab
				c = 0x20;
			else if (c === 0x0D || c === 0x0A) {
				var cr = false;
				if (c === 0x0D) {
					if (src[idx] === 0x0A) idx++;
					cr = true;
				}
				else if (c === 0x0A) cr = true;
				if (cr) c = 0;
			}
			raw = c;
			if (isLC) {
				if (c >= 0x61 && c <= 0x7A) c &= 0xDF;
				else if (c >= 0x41 && c <= 0x5A) c |= 0x80;
			}
			eof = idx >= srcLength;
			return c;
		}
	}

	function gotCharCaseAdjusted() {
		if (raw >= 0x41 && raw <= 0x5A) {
			isLC = false;
			return raw;
		}
		else if (raw >= 0x61 && raw <= 0x7A) {
			isLC = true;
			return raw & 0xDF;
		}
		return raw;
	}

	//skip BOM
	if (src[0] == 0xEF && src[1] == 0xBB && src[2] == 0xBF) idx = 3;
	else if (src[0] == 0xFF && src[1] == 0xFE) idx = 2;
	else if (src[0] == 0xFE && src[1] == 0xFF) { idx = 2; bigEndien = false; }

	// parse loop
	while (idx < srcLength) {
		var c, ln = 0, dataFlag = false, tokenized = [], direct = true;
		// get line number
		c = getCh();
		while ((c >= 0x30 && c <= 0x39) || c === 0x20) {
			if (!c) break;
			if (c !== 0x20) ln = ln * 10 + c - 0x30;
			direct = false;
			c = getCh();
		}
		if (ln >= lineNumberMax) {
			error = 'line '+sl+': syntax error (illegal line number).';
			break;
		}
		if (direct) {
			while (c === 0x20) getCh();
			if (c !== 0) {
				error = 'line '+sl+': illegal direct mode (missing line number).';
				break;
			}
		}
		else {
			// tokenize line content
			while (c) {
				c = gotCharCaseAdjusted();
				// parse and tokenize like CBM BASIC
				if (c >= 0x80) {
					if (c === 0xFF) tokenized.push(c);
				}
				else if (c) {
					if (c === 0x20) tokenized.push(c);
					else if (c === 0x22) { //quote
						tokenized.push(c)
						c = getCh();
						while (c) {
							tokenized.push(c);
							if (c === 0x22) break;
							c = getCh();
						}
						if (!c && !eof) idx--;
					}
					else if (dataFlag) {
						tokenized.push(c);
					}
					else if (c === 0x3F) { //"?"
						c = 0x99;
						tokenized.push(c);
					}
					else if (c >= 0x30 && c < 0x3C) {
						tokenized.push(c);
					}
					else {
						// evaluate tokens
						var ptr = idx, b = c, cmd = 0, cnt = 0;
						for (;;) {
							var d = tokens[cnt] - c;
							if (d == 0) {
								c = getCh();
								cnt++;
							}
							else if (Math.abs(d) == 0x80) {
								c = 0x80 | cmd;
								break;
							}
							else {
								c = b;
								idx = ptr;
								while ((tokens[cnt++] & 0x80) == 0);
								if (tokens[cnt] == 0) break;
								cmd++;
							}
						}
						tokenized.push(c);
						if (c === 0x3A) dataFlag = false; //":"
						else if (c === 0x83) dataFlag = true; //"DATA"
						else if (c === 0x8F) {//"REM"
							c = getCh();
							while (c) {
								tokenized.push(c);
								c = getCh();
							}
							if (!eof) idx--;
						}
					}
				}
				c = getCh();
			}
			if (tokenized.length > lineLengthMax) {
				error = 'line '+sl+': string too long.';
				break;
			}
			lines[ln] = tokenized;
		}
		sl++;
	}

	// generate linked lines
	var	lns = [],
		prg = [],
		pc = startAddr;
	for (var n in lines) lns.push(n);
	lns.sort(function(a,b) { return a-b; });
	for (var i = 0; i < lns.length; i++) {
		var n = lns[i], tk = lines[n], tl = tk.length;
		if (tl) {
			var link = pc + tl + 5;
			prg.push(link & 0xFF);
			prg.push((link >> 8)  & 0xFF);
			prg.push(n & 0xFF);
			prg.push((n >> 8)  & 0xFF);
			for (var t = 0; t < tk.length; t++) prg.push(tk[t]);
			prg.push(0);
			pc = link;
		}
	}
	if (prg.length) {
		prg.push(0);
		prg.push(0);
		if (asPrgFile) prg.splice(0, 0, startAddr & 0xFF, (startAddr >> 8)  & 0xFF);
	}
	return { 'prg': prg, 'error': error };
}

// generate a plain text listing from tokenized BASIC

function basic2Txt(mem, startAddress, escapePetscii, escapeAsHex, usePetsciiLabels) {
	var	tokens = [
			"END", "FOR", "NEXT", "DATA", "INPUT#", "INPUT", "DIM", "READ", "LET",
			"GOTO", "RUN", "IF", "RESTORE", "GOSUB", "RETURN", "REM", "STOP", "ON",
			"WAIT", "LOAD", "SAVE", "VERIFY", "DEF", "POKE", "PRINT#", "PRINT",
			"CONT", "LIST", "CLR", "CMD", "SYS", "OPEN", "CLOSE", "GET", "NEW",
			"TAB(", "TO", "FN", "SPC(", "THEN", "NOT", "STEP", "+", "-", "*", "/",
			"^", "AND", "OR", ">", "=", "<", "SGN", "INT", "ABS", "USR", "FRE",
			"POS", "SQR", "RND", "LOG", "EXP", "COS", "SIN", "TAN", "ATN", "PEEK",
			"LEN", "STR$", "VAL", "ASC", "CHR$", "LEFT$", "RIGHT$", "MID$", "GO"
		],
		lines = [],
		addr = (!startAddress || isNaN(startAddress))? 0x0401:Number(startAddress) | 0,
		maxMem = mem.length;
	escapePetscii = !!escapePetscii;
	escapeAsHex = !!escapeAsHex;
	usePetsciiLabels = !!usePetsciiLabels;
	while (addr < maxMem) {
		var lineLink = mem[addr++] + (mem[addr++]<<8);
		if (!lineLink) break;
		var	ln = String(mem[addr++] + (mem[addr++]<<8)) + ' ',
			isPrint = false,
			isStringFn = false,
			parenCnt = 0,
			c = mem[addr++];
		while (c) {
			if (c === 0xFF) {
				ln += '\u03C0';
			}
			else if (c & 0x80) {
				var t = tokens[c ^ 0x80];
				if (t) {
					ln += t;
					if (t === 'REM') {
						c = mem[addr++];
						while(c) {
							if (c >= 0x20 && c < 0x80) ln += String.fromCharCode(c);
							else if (c === 0xFF) ln += '\u03C0';
							else if (escapePetscii) ln += '{'+c+'}';
							c = mem[addr++];
						}
						break;
					}
					if (/^PRINT/.test(t)) isPrint = true;
					else if (/^(?:MID|LEFT|RIGHT)\$|LEN|VAL|ASC$/.test(t)) {
						isStringFn = true;
						parenCnt = 0;
					}
				}
			}
			else if (c === 0x22) {
				var s= '', q = false, sep = (isPrint && !isStringFn)? ';':'+';
				c = mem[addr++];
				for (;;) {
					if (c === 0x22 || c === 0) {
						if (q) s += '"';
						q = false;
						if (!c) addr--;
						break;
					}
					else if (c === 0xFF) {
						if (!q) {
							if (s) s += sep;
							s += '"';
							q = true;
						}
						s += (escapePetscii && usePetsciiLabels)? '{PI}':'\u03C0';
					}
					else if (c >= 0x20 && c < 0x80) {
						if (!q) {
							if (s) s += sep;
							s += '"';
							q = true;
						}
						s += String.fromCharCode(c);
					}
					else if (escapePetscii) {
						if (!q) {
							s += '"';
							q = true;
						}
						if (usePetsciiLabels && petsciiLabels[c]) {
							s += '{' + petsciiLabels[c] + '}';
						}
						else {
							s += '{' + (escapeAsHex? '$' + hex(c,2) : c) + '}';
						}
					}
					else {
						if (q) {
							s += '"';
							q = false;
						}
						if (s) s += sep;
						s += 'CHR$(' + c + ')';
					}
					c = mem[addr++];
				}
				ln += s? s : '""';
			}
			else {
				ln += String.fromCharCode(c);
				if (c === 0x3A) isPrint = isStringFn = false; //colon
				else if (isStringFn) {
					if (c === 0x28) parenCnt++; //left parenthesis
					else if (c === 0x29 && --parenCnt === 0) isStringFn = false; //right parenthesis
				}
			}
			c = mem[addr++];
		}
		lines.push(ln);
		addr = lineLink;
	}
	return lines.join('\n') || '';
}


// renumber BASIC in provided memory slice (0..max)
// processes GOTO, GOSUB, GO TO, ON GOTO|GOSUB|GO TO, THEN

function renumberBasic(mem, basicStart, startNo, step) {

	basicStart = (!basicStart || isNaN(basicStart))? 0x0401:Number(basicStart) | 0;
	startNo = (typeof startNo === 'undefined' || isNaN(startNo) || startNo < 0)? 100:Number(startNo) | 0;
	step = (!step || isNaN(step))? 10:Number(step) | 0;

	var lineNoTable = {},
		lines = [],
		maxLineNo = 36999;

	// parse and split lines to chunks of blobs and line targets
	// stores parsed chunks in array lines,
	// generates a reference of old and new line numbers in lineNoTable.
	function parseSplit() {
		var	addr = basicStart,
			lineNo = startNo,
			maxMem = mem.length,
			chunks,
			blob;

		// scans for a jump target,
		// generates a target entry and a new blob in current chunks,
		// any leading blanks are added to the current blob
		function parseLineTarget(maybeList) {
			while (mem[addr] === 0x20) {
				blob.push(0x20);
				addr++;
			}
			// parse ASCII to string, ignoring any blanks
			var n = '',
				c = mem[addr];
			while ((c >= 0x30 && c <= 0x39) || c === 0x20) {
				if (c !== 0x20) n += String.fromCharCode(c);
				c = mem[++addr];
			}
			// if we found a number, push chunks and open a new blob
			if (n !== '') {
				chunks.push({'type': 'blob', 'val': blob});
				chunks.push({'type': 'target', 'val': n});
				blob = [];
				// scan for any comma (ON GOTO|GOSUB|GO TO)
				if (maybeList && c === 0x2C) {
					blob.push(0x2C);
					addr++;
					parseLineTarget(true);
				}
			}
		}

		while (addr < maxMem) {
			var lineLink = mem[addr++] + (mem[addr++]<<8);
			if (!lineLink) break;
			chunks = [];
			blob = [];
			var	ln = String(mem[addr++] + (mem[addr++]<<8)),
				b = mem[addr++],
				line = {
					'ln': ln,
					'chunks': chunks
				};
			lineNoTable[ln] = lineNo;
			lineNo += step;
			while (b) {
				blob.push(b);
				switch(b) {
					case 0x8F: // REM (read rest of line)
						while (mem[addr]) blob.push(mem[addr++]);
						break;
					case 0x22: // quote (read up to next quote)
						var c = mem[addr++];
						while (c) {
							blob.push(c);
							if (c === 0x22) break;
							c = mem[addr++];
						}
						break;
					case 0x89: // GOTO
					case 0x8D: // GOSUB
						parseLineTarget(true);
						break;
					case 0xA7: // THEN
						parseLineTarget(false);
						break;
					case 0xCB: // GO (read ahead and test for TO)
						var t = addr;
						while (mem[t] == 0x20) t++;
						if (mem[t] !== 0xA4) break;
						while (addr <= t) blob.push(mem[addr++]);
						parseLineTarget(true);
						break;
				}
				b = mem[addr++];
			}
			if (blob.length) chunks.push({'type': 'blob', 'val': blob});
			lines.push(line);
			addr = lineLink;
		}
	}

	// reassamble BASIC code from line chunks using new line numbers from lineNoTable
	function reassembleLines() {
		var addr = basicStart;
		for (var i = 0, max = lines.length; i < max; i++) {
			var currLine = lines[i],
				currNo = lineNoTable[currLine.ln],
				linkAddr = addr;
			mem[addr++] = 0;
			mem[addr++] = 0;
			mem[addr++] = currNo & 0xFF;
			mem[addr++] = (currNo >> 8) & 0xFF;
			for (var j = 0; j < currLine.chunks.length; j++) {
				var chunk = currLine.chunks[j];
				if (chunk.type === 'blob') {
					var blob = chunk.val;
					for (var k = 0; k < blob.length; k++) mem[addr++] = blob[k];
				}
				else if (chunk.type === 'target') {
					var s = '';
					if (chunk.val) {
						var n = lineNoTable[chunk.val];
						s = typeof n !== 'undefined'? n.toString(10):chunk.val;
					}
					for (var k = 0; k < s.length; k++) mem[addr++] = s.charCodeAt(k);
				}
			}
			mem[addr++] = 0;
			mem[linkAddr++] = addr & 0xFF;
			mem[linkAddr] = (addr >> 8) & 0xFF;
		}
		mem[addr++] = 0;
		mem[addr++] = 0;
		return addr;
	}

	parseSplit();
	// check, if we are still in the range of legal line numbers
	if (lines.length) {
		var topLineNo = lineNoTable[lines[lines.length - 1].ln];
		if (topLineNo > maxLineNo) return {
			'addr': -1,
			'message': 'Out of range. Top line number is ' + topLineNo +' (' + maxLineNo + ' allowed).'
		};
	}
	var endAddr = reassembleLines();
	return { 'addr': endAddr };
}


// generate BASIC print statements from screen memory
// requires function hex() and object petsciiLabels

var ScreenGenerator = (function() {
	var screen;

	function load(bytes) {
		screen = bytes.slice();
	}

	function unload() {
		screen = null;
	}

	function generate(lineNumber, step, toUpperCase, trim, escapePetscii, escapeAsHex, usePetsciiLabels) {
		if (!screen) return '';
		// normalize arguments
		lineNumber = (lineNumber && !isNaN(lineNumber))? Number(lineNumber):1000;
		step = (step && !isNaN(step))? Number(step):10;
		toUpperCase = typeof toUpperCase === 'undefined' || Boolean(toUpperCase);
		trim = typeof trim === 'undefined' || Boolean(trim);
		escapePetscii = !!escapePetscii;
		escapeAsHex = !!escapeAsHex;
		usePetsciiLabels = !!usePetsciiLabels;

		var	rows = 25, cols = 40,
			lineLengthMax = 80, //BASIC input buffer is 88, but VICE has problems
			screenLines = [],
			lines = [],
			line = '',
			buffer = '',
			rvs = false,
			quoted = false,
			chr = toUpperCase? 'CHR$(':'chr$(';

		function petsciiEscape(c) {
			var s = '{' +
				(usePetsciiLabels && petsciiLabels[c]? petsciiLabels[c]:
					escapeAsHex? '$' + hex(c,2) : c) +
				'}';
			return toUpperCase? s:s.toLowerCase();
		}

		function charOut(c, toCode) {
			if (toCode) {
				if (escapePetscii) {
					if (c === 0x22) {
						if (buffer) {
							lineAdd('"' + buffer + '";');
							buffer = '';
						}
						lineAdd(chr + 0x22 +');');
						lineAdd(chr + 0x22 +');');
						c = 0x9D;
					}
					buffer += petsciiEscape(c);
				}
				else {
					if (c === 0x22) {
						quoted = !quoted;
					}
					else if (quoted) {
						lineAdd(chr + 0x22 +');');
						lineAdd(chr + 0x9D +');');
						quoted = false;
					}
					if (buffer) {
						lineAdd('"' + buffer + '";');
						buffer = '';
					}
					lineAdd(chr + c +');');
				}
			}
			else buffer += String.fromCharCode(c);
		}

		function lineAdd(chunk) {
			if (line.length + chunk.length <= lineLengthMax) {
				line += chunk;
			}
			else {
				lines.push(line);
				line = String(lineNumber) + ' ?' + chunk;
				lineNumber += step;
			}
		}

		function lineFlush() {
			if (buffer) {
				if (!/^[0-9]+ \?$/.test(line) && line.length + buffer.length > lineLengthMax) {
					lines.push(line);
					line = String(lineNumber) + ' ?';
					lineNumber += step;
				}
				line += '"' + buffer + '";';
				buffer = '';
			}
			lines.push(line);
			line = String(lineNumber) + ' ?';
			lineNumber += step;
		}

		// split screen contents into lines
		for (var i = 0, m = rows * cols; i < m; i += cols)
			screenLines.push(screen.slice(i, i + cols));
		// trim right-hand white-space
		if (trim) {
			var bottom = true;
			for (var r = rows-1; r >= 0; r--) {
				var l = cols, s = screenLines[r];
				for (var c = cols-1; c >= 0 && s[c] === 0x20; c--) l--;
				if (bottom && l === 0) screenLines.length--;
				else {
					if (l !== cols) s.length = l;
					bottom = false;
				}
			}
		}
		else if (screenLines[rows-1][cols-1] == 0x20) {
			screenLines[rows-1].length--;
		}

		// generate BASIC source text
		var r0 = 0;
		// initialize first line
		// generate either a home (trimmed text) or clear screen command
		line = String(lineNumber) + ' ?';
		line += escapePetscii? '"'+petsciiEscape(147)+'"':chr + '147)';
		if (screenLines[0].length) line += ';';
		else r0++;
		lineNumber += step;
		lineFlush();  // start a new line
		for (var r = r0, rl = screenLines.length - 1; r <= rl; r++) {
			var s = screenLines[r];
			for (var c=0; c < s.length; c++) {
				var sc = s[c];
				// handle revers video
				if (sc & 0x80) {
					if (!rvs) {
						charOut(18, true);
						rvs = true;
					}
					sc ^= 0x80;
				}
				else if (rvs) {
					charOut(146, true);
					rvs = false;
				}
				// to PETSCII
				if (sc < 0x20) sc |= 0x40;
				else if (sc >= 0x40 && sc < 0x60) sc |= 0x80;
				else if (sc >= 0x60) sc += 0x40;
				// to ASCII printable
				if (sc === 0x22) charOut(0x22, true); //quote
				else if (sc === 0xDE) charOut(0x03C0); //π
				else if (toUpperCase) {
					if (sc < 0x60) charOut(sc);
					else charOut(sc, true);
				}
				else {
					if (sc <= 0x40 || sc > 0x5A && sc < 0x60) charOut(sc);
					else if (sc <= 0x5A) charOut(sc + 0x20);
					else if (sc >= 0xC1 && sc <= 0xDA) charOut(sc & 0x7F);
					else charOut(sc, true);
				}
			}
			if (r === rl && rvs) charOut(146, true);
			lineFlush();
			// line-length < cols? remove last semicolon
			if (r != rows -1 && s.length < cols) {
				lines[lines.length - 1] = lines[lines.length - 1].replace(/;$/, '');
				rvs = quoted = false;
			}
		}
		lineNumber -= step;
		var keyDummy = lineNumber + ' get k$:if k$="" goto ' + lineNumber
			+ ':rem wait for keypress';
		lines.push(toUpperCase? keyDummy.toUpperCase():keyDummy);
		return lines.join('\n');
	}

	return {
		'load': load,
		'unload': unload,
		'generate': generate
	};
})();


// memory dumps

function hexDump(mem, addr, end, oldStyle) {
	function dump() {
		if (addr % 8 === 0) {
			if (out) out += '  ' + charsPrefix + chars + '\n';
			out +=  addrPrefix + hex(addr, 4) + addrPostfix;
			chars = '';
		}
		var c = mem[addr++];
		out += ' ' + hex(c, 2);
		chars += (c >= 0x20 && c <= 0x60)? String.fromCharCode(c):'.';
		return c;
	}
	if (addr >= mem.length) return 'Error: Start address out of bounds.';
	if (addr > end) return 'Error: End address lower than start address.';
	var	out = '', chars='',
		addrPrefix = oldStyle? ':':'',
		addrPostfix = oldStyle? '':':',
		charsPrefix = oldStyle? ';':'',
		offset = addr % 8;
	if (offset) {
		out = addrPrefix + hex(addr - offset, 4) + addrPostfix;
		for (var i = 0; i < offset; i++) {
			out += '   ';
			chars += ' ';
		}
	}
	while (addr <= end) dump();
	if (chars) {
		while (addr++ % 8 !== 0) out += '   ';
		out += '  ' + charsPrefix + chars;
	}
	return out;
}

function hexDumpBasic(mem, oldStyle) {
	function dump() {
		if (addr % 8 === 0) {
			if (out) out += '  ' + charsPrefix + chars + '\n';
			out +=  addrPrefix + hex(addr, 4) + addrPostfix;
			chars = '';
		}
		var c = mem[addr++] || 0;
		out += ' ' + hex(c, 2);
		chars += (c >= 0x20 && c <= 0x60)? String.fromCharCode(c):'.';
		return c;
	}
	var	addr = 0x400, out = '', chars='',
		addrPrefix = oldStyle? ':':'',
		addrPostfix = oldStyle? '':':',
		charsPrefix = oldStyle? ';':'',
		maxMem = mem.length,
		noughts = 1;
	dump();
	while (addr < maxMem) {
		if (dump() === 0) {
			if (++noughts === 3) break;
		}
		else {
			noughts = 0;
		}
	}
	if (chars) {
		while (addr++ % 8 !== 0) out += '   ';
		out += '  ' + chars;
	}
	return out;
}

// generate PRG file from memory, from start-address up to end-of-basic marker (0x00 0x00 0x00)

function convertToPrg(mem, startAddress) {
	var	addr = (!startAddress || isNaN(startAddress))? 0x0401:Number(startAddress) | 0,
		leadIn = String.fromCharCode(startAddress & 0xff) + String.fromCharCode((startAddress >> 8) & 0xff),
		out = '';

	function putChr() {
		var c = mem[addr++] || 0;
		out += String.fromCharCode(c);
		return c;
	}

	for (;;) {
		if (putChr() + (putChr()<<8) === 0) break;
		do {} while (putChr());
	}
	return (out.length > 2)? leadIn + out : '';
}

// 6502 disassembler

var	opctab= [
		['BRK','imp'], ['ORA','inx'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['ORA','zpg'], ['ASL','zpg'], [   '','imp'],
		['PHP','imp'], ['ORA','imm'], ['ASL','acc'], [   '','imp'],
		[   '','imp'], ['ORA','abs'], ['ASL','abs'], [   '','imp'],
		['BPL','rel'], ['ORA','iny'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['ORA','zpx'], ['ASL','zpx'], [   '','imp'],
		['CLC','imp'], ['ORA','aby'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['ORA','abx'], ['ASL','abx'], [   '','imp'],
		['JSR','abs'], ['AND','inx'], [   '','imp'], [   '','imp'],
		['BIT','zpg'], ['AND','zpg'], ['ROL','zpg'], [   '','imp'],
		['PLP','imp'], ['AND','imm'], ['ROL','acc'], [   '','imp'],
		['BIT','abs'], ['AND','abs'], ['ROL','abs'], [   '','imp'],
		['BMI','rel'], ['AND','iny'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['AND','zpx'], ['ROL','zpx'], [   '','imp'],
		['SEC','imp'], ['AND','aby'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['AND','abx'], ['ROL','abx'], [   '','imp'],
		['RTI','imp'], ['EOR','inx'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['EOR','zpg'], ['LSR','zpg'], [   '','imp'],
		['PHA','imp'], ['EOR','imm'], ['LSR','acc'], [   '','imp'],
		['JMP','abs'], ['EOR','abs'], ['LSR','abs'], [   '','imp'],
		['BVC','rel'], ['EOR','iny'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['EOR','zpx'], ['LSR','zpx'], [   '','imp'],
		['CLI','imp'], ['EOR','aby'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['EOR','abx'], ['LSR','abx'], [   '','imp'],
		['RTS','imp'], ['ADC','inx'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['ADC','zpg'], ['ROR','zpg'], [   '','imp'],
		['PLA','imp'], ['ADC','imm'], ['ROR','acc'], [   '','imp'],
		['JMP','ind'], ['ADC','abs'], ['ROR','abs'], [   '','imp'],
		['BVS','rel'], ['ADC','iny'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['ADC','zpx'], ['ROR','zpx'], [   '','imp'],
		['SEI','imp'], ['ADC','aby'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['ADC','abx'], ['ROR','abx'], [   '','imp'],
		[   '','imp'], ['STA','inx'], [   '','imp'], [   '','imp'],
		['STY','zpg'], ['STA','zpg'], ['STX','zpg'], [   '','imp'],
		['DEY','imp'], [   '','imp'], ['TXA','imp'], [   '','imp'],
		['STY','abs'], ['STA','abs'], ['STX','abs'], [   '','imp'],
		['BCC','rel'], ['STA','iny'], [   '','imp'], [   '','imp'],
		['STY','zpx'], ['STA','zpx'], ['STX','zpy'], [   '','imp'],
		['TYA','imp'], ['STA','aby'], ['TXS','imp'], [   '','imp'],
		[   '','imp'], ['STA','abx'], [   '','imp'], [   '','imp'],
		['LDY','imm'], ['LDA','inx'], ['LDX','imm'], [   '','imp'],
		['LDY','zpg'], ['LDA','zpg'], ['LDX','zpg'], [   '','imp'],
		['TAY','imp'], ['LDA','imm'], ['TAX','imp'], [   '','imp'],
		['LDY','abs'], ['LDA','abs'], ['LDX','abs'], [   '','imp'],
		['BCS','rel'], ['LDA','iny'], [   '','imp'], [   '','imp'],
		['LDY','zpx'], ['LDA','zpx'], ['LDX','zpy'], [   '','imp'],
		['CLV','imp'], ['LDA','aby'], ['TSX','imp'], [   '','imp'],
		['LDY','abx'], ['LDA','abx'], ['LDX','aby'], [   '','imp'],
		['CPY','imm'], ['CMP','inx'], [   '','imp'], [   '','imp'],
		['CPY','zpg'], ['CMP','zpg'], ['DEC','zpg'], [   '','imp'],
		['INY','imp'], ['CMP','imm'], ['DEX','imp'], [   '','imp'],
		['CPY','abs'], ['CMP','abs'], ['DEC','abs'], [   '','imp'],
		['BNE','rel'], ['CMP','iny'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['CMP','zpx'], ['DEC','zpx'], [   '','imp'],
		['CLD','imp'], ['CMP','aby'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['CMP','abx'], ['DEC','abx'], [   '','imp'],
		['CPX','imm'], ['SBC','inx'], [   '','imp'], [   '','imp'],
		['CPX','zpg'], ['SBC','zpg'], ['INC','zpg'], [   '','imp'],
		['INX','imp'], ['SBC','imm'], ['NOP','imp'], [   '','imp'],
		['CPX','abs'], ['SBC','abs'], ['INC','abs'], [   '','imp'],
		['BEQ','rel'], ['SBC','iny'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['SBC','zpx'], ['INC','zpx'], [   '','imp'],
		['SED','imp'], ['SBC','aby'], [   '','imp'], [   '','imp'],
		[   '','imp'], ['SBC','abx'], ['INC','abx'], [   '','imp']
	],
	steptab = {
		'imp':1,
		'acc':1,
		'imm':2,
		'abs':3,
		'abx':3,
		'aby':3,
		'zpg':2,
		'zpx':2,
		'zpy':2,
		'ind':3,
		'inx':2,
		'iny':2,
		'rel':2
	};

function disassemble(mem, start, end, addressToSymbolDict) {
	/*
	addressToSymbolDict: object, optional -- dictionary of symbolic addresses
	example: {
		0x401: 'BASIC',
		0x8000: 'SCREEN',
		...
	}
	*/
	var symbolsSeen = {}, symbolicLabels = {}, targets = [], labels = {},
	    labelColumnWidth = 8, blanks = '            ',
	    terminateLabelsByColon = false,
	    maxMem = mem.length;

	if (!addressToSymbolDict || typeof addressToSymbolDict === 'object')
		addressToSymbolDict = {};

	function addressString(a, l) {
		if (addressToSymbolDict[a]) { symbolsSeen[a] = true; return addressToSymbolDict[a]; }
		if (addressToSymbolDict[a-1]) { symbolsSeen[a-1] = true; return addressToSymbolDict[a-1]+'+1'; }
		return labels[a] || '$'+hex(a, l);
	}

	function list(addr, addrStr, opc, disas) {
		var label = labels[addr] || addressToSymbolDict[addr] || '';
		if (terminateLabelsByColon && label) label += ':';
		listing += addrStr + blanks.substring(0, 6-addrStr.length)
			+ opc + blanks.substring(0, 11-opc.length)
			+ label + blanks.substring(0, labelColumnWidth-label.length)
			+ disas+'\n';
	}

	function getMem(a) {
		return (a < maxMem)? mem[a] || 0:0;
	}

	function disassembleStep() {
		var	addr = hex(pc, 4),
			instr = getMem(pc),
			opc = hex(instr, 2),
			disas = opctab[instr][0] || '.byte $' + opc,
			adm = opctab[instr][1],
			step = steptab[adm],
			op;
		if (step == 2) {
			op = getMem(pc+1);
			opc += ' ' + hex(op, 2);
		}
		else if (step == 3) {
			op = (getMem(pc+2)<<8) | getMem(pc+1);
			opc += ' ' + hex(getMem(pc+1), 2) + ' ' + hex(getMem(pc+2));
		}
		else {
			opc+='';
		}
		// format and output to listing
		switch (adm) {
			case 'imm':
				disas+=' #$'+hex(op, 2);
				break;
			case 'zpg':
				disas+=' '+addressString(op, 2);
				break;
			case 'acc':
				disas+=' A';
				break;
			case 'abs':
				disas+=' '+addressString(op, 4);
				break;
			case 'zpx':
				disas+=' '+addressString(op, 2)+',X';
				break;
			case 'zpy':
				disas+=' '+addressString(op, 2)+',Y';
				break;
			case 'abx':
				disas+=' '+addressString(op, 4)+',X';
				break;
			case 'aby':
				disas+=' '+addressString(op, 4)+',Y';
				break;
			case 'iny':
				disas+=' ('+addressString(op, 2)+'),Y';
				break;
			case 'inx':
				disas+=' ('+addressString(op, 2)+',X)';
				break;
			case 'rel':
				var offset = getMem(pc+1), target = pc+2;
				if (offset & 128) {
					target -= (offset ^ 255)+1;
				}
				else {
					target += offset;
				}
				target &= 0xFFFF;
				disas += ' '+ (labels[target] || addressString(target, 4));
				break;
			case 'ind' :
				disas+=' ('+addressString(op, 4)+')';
				break;
		}
		list(pc, addr, opc, disas);
		pc = pc+step;
	}

	function collectTargets() {
		var ot = opctab[getMem(pc)], instr = ot[0];
		switch (instr) {
			case 'BPL':
			case 'BMI':
			case 'BVC':
			case 'BVS':
			case 'BCC':
			case 'BCS':
			case 'BNE':
			case 'BEQ':
				var offset = getMem(pc+1) || 0, target = pc+2;
				if (offset & 128) {
					target -= (offset ^ 255)+1;
				}
				else {
					target += offset;
				}
				addLabel(target & 0xFFFF);
				break;
			case 'JMP':
			case 'JSR':
				addLabel((getMem(pc+2)<<8) | getMem(pc+1));
				break;
		}
		if (addressToSymbolDict[pc]) symbolicLabels[addressToSymbolDict[pc]] = true;
		pc += steptab[ot[1]];
	}

	function addLabel(target) {
		if (!addressToSymbolDict[target] && !labels[target] && target >= start  && target <= end
			&& (target < 0x8000
			|| (target >= 0xC000 && target <= 0xE7FF)
			|| (target >= 0xF000 && target <= 0xFFFF))) labels[target] = 'L'+hex(target, 4);
	}

	function scanSymbolLengths(obj) {
		var  max = 0;
		for (var s in obj) {
			var l = s.length;
			if (l > max) max = l;
		}
		max += (max % 2)? 3:2;
		if (max > labelColumnWidth) {
			labelColumnWidth = max;
			while (blanks.length < max) blanks += ' ';
		}
	}

	var pc, listing = '';
	if (!start) start = 0;
	if (!end) end = 0;
	if (isNaN(start) || start < 0) return 'Error: Start address not a valid value.';
	if (isNaN(end) || end < 0) return 'Error: End address not a valid value.';
	start &= 0xFFFF;
	end &= 0xFFFF;
	if (end < start) end = maxMem-1;

	pc = start;
	while (pc <= end) collectTargets();
	scanSymbolLengths(symbolicLabels);

	list(-1, '','','* = '+hex(start, 4));
	pc = start;
	while (pc <= end) disassembleStep();
	list(-1, '','','.end');

	var symbolList = [];
	for (var a in symbolsSeen) {
		var n = Number(a), s = addressToSymbolDict[a];
		if (!symbolicLabels[s]) symbolList.push(s + ' = $' + hex(n, n <= 0xFF? 2:4));
	}
	if (symbolList.length) {
		listing = symbolList.join('\n') + '\n\n' + listing;
	}

	return listing;
}

// P00 single file archives

function parseP00(data) {
	var signature = [0x43, 0x36, 0x34, 0x46, 0x69, 0x6C, 0x65, 0]; // "C64File"
	if (data.byteLength < 0x1C) return { 'prg': null, 'addr': 0, 'name': '', 'error': 'Not a P00 file: file too short.' };
	for (var i = 0, l = signature.length; i < l; i++) {
		if (data.getUint8(i) !== signature[i]) return { 'prg': null, 'addr': 0, 'name': '', 'error': 'Not a P00 file: file signature mismatch.' };
	}
	var fName = '';
	for (var i = 8; i < 0x17; i++) {
		var c = data.getUint8(i);
		if (c === 0) break;
		//if (c >= 0x20 && c < 0x80) fName += String.fromCharCode(c);
		//else if (c >= 0xA0) fName += ' ';
		if (c >= 0x20 && c < 0xFF) fName += String.fromCharCode(c);
		else if (c === 0xFF) fName += '\u03C0';
	}
	var addr = data.getUint8(0x1A) | (data.getUint8(0x1B) << 8),
		bytes = [];
	for (var i = 0x1c, l = data.byteLength; i < l; i++) bytes.push(data.getUint8(i));
	return { 'prg': bytes, 'addr': addr, 'name': fName, 'error': null };
}

// D64 disk image parser

var D64 = (function() {

	var prgPath = 'prgs/',
		data = null,
		dsize = 0,
		sectorsSeen = [],
		dir = [],
		diskImgName,
		diskName,
		diskId,
		diskDosType;

	var trackMap = { // #track: [sectors, byte-offset]
			'1':  [21, 0x00000],
			'2':  [21, 0x01500],
			'3':  [21, 0x02A00],
			'4':  [21, 0x03F00],
			'5':  [21, 0x05400],
			'6':  [21, 0x06900],
			'7':  [21, 0x07E00],
			'8':  [21, 0x09300],
			'9':  [21, 0x0A800],
			'10': [21, 0x0BD00],
			'11': [21, 0x0D200],
			'12': [21, 0x0E700],
			'13': [21, 0x0FC00],
			'14': [21, 0x11100],
			'15': [21, 0x12600],
			'16': [21, 0x13B00],
			'17': [21, 0x15000],
			'18': [19, 0x16500],
			'19': [19, 0x17800],
			'20': [19, 0x18B00],
			'21': [19, 0x19E00],
			'22': [19, 0x1B100],
			'23': [19, 0x1C400],
			'24': [19, 0x1D700],
			'25': [18, 0x1EA00],
			'26': [18, 0x1FC00],
			'27': [18, 0x20E00],
			'28': [18, 0x22000],
			'29': [18, 0x23200],
			'30': [18, 0x24400],
			'31': [17, 0x25600],
			'32': [17, 0x26700],
			'33': [17, 0x27800],
			'34': [17, 0x28900],
			'35': [17, 0x29A00],
			'36': [17, 0x2AB00], // non-standard
			'37': [17, 0x2BC00],
			'38': [17, 0x2CD00],
			'39': [17, 0x2DE00],
			'40': [17, 0x2EF00],
			'41': [17, 0x30000], // extended non-standard
			'42': [17, 0x31100]
		},
		typeMap = ['DEL','SEQ','PRG','USR','REL'],
		typeFilter = {
			'DEL': false,
			'SEQ': false,
			'PRG': true,
			'USR': false,
			'REL': false
		};

	function loadDiskImage(diskImageName, fileName, asBasic, autorun) {
		if (!diskImageName) return;
		diskImageName = String(diskImageName).replace(/\//g, '');
		if (diskImageName === '') return;
		diskImgName = diskImageName;
		var xhr = new XMLHttpRequest();
		xhr.open('GET', prgPath + encodeURIComponent(diskImageName) + '?uid=' + Date.now().toString(36), true);
		if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
		if (xhr.overrideMimeType) xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onload = function xhr_onload() {
			if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
				data = new DataView(xhr.response);
				dsize = data.byteLength;
				if (dsize) {
					parseDirectory();
					if (fileName) {
						if (typeof autorun === 'undefined') autorun = true;
						petCtrl.setMountedMedia('d64', diskImageName);
						loadFile(fileName.toUpperCase(), asBasic, autorun);
					}
					else {
						displayDirectory(asBasic);
					}
				}
				else {
					data = null;
					console.warn('File "'+diskImageName+'" is empty.');
				}
			}
			else {
				xhr.onerror();
			}
		}
		xhr.onerror = function xhr_onerror() {
			var msg = 'PET: Unable to load file "'+diskImageName+'"';
			if (xhr.status) msg += ' ('+xhr.status+')';
			msg +=  (xhr.statusText? ': '+xhr.statusText:'.');
			console.warn(msg);
		}
		xhr.send(null);
	}

	function readDiskImage(file, presetAsBasic) {
		diskImgName = file.name;
		if (diskImgName.indexOf('\\')) diskImgName = diskImgName.replace(/^.*\\/, '');
		if (diskImgName.indexOf('/')) diskImgName = diskImgName.replace(/^.*\//, '');
		if (!diskImgName) diskImgName = '*';
		var fread = new FileReader();
		fread.readAsArrayBuffer(file);
		fread.onload = function(levent) {
			data = new DataView(levent.target.result);
			dsize = levent.target.result.byteLength;
			if (dsize) {
				parseDirectory();
				displayDirectory(presetAsBasic);
			}
		}
	}

	function parseDirectory() {
		dir.length = sectorsSeen.length = 0;
		var offset;
		// get disk name, id
		offset = getSectorOffset(18, 0);
		diskDosType = String.fromCharCode(data.getUint8(offset + 0xA5)) + String.fromCharCode(data.getUint8(offset + 0xA6));
		if (!diskDosType) diskDosType = '2A';
		offset += diskDosType === '2P'? 0xA4:0x90;
		diskName = '';
		var fnc = 0;
		for (var n = offset, max = offset + 16; n < max; n++) {
			var ch = data.getUint8(n);
			if (ch !== 0xA0) fnc++;
			diskName += String.fromCharCode(ch);
		}
		diskId = String.fromCharCode(data.getUint8(offset + 0x12)) + String.fromCharCode(data.getUint8(offset + 0x13));
		if (!fnc) {
			diskName = diskImgName.toUpperCase().replace(/\.D64$/, '');
			if (diskName.length > 16) diskName = diskName.substring(0, 16);
			while (diskName.length < 16) diskName += '\u00A0';
		}
		// read & parse directory
		sectorsSeen.length = 0;
		var t=18, s=1, idx=0;
		while (t) {
			offset = getSectorOffset(t, s);
			if (offset < 0) return;
			t =  data.getUint8(offset);
			s =  data.getUint8(offset+1);
			for (var i = 0; i < 0xff; i+=0x20) {
				var entry = {},
					c = offset + i,
					fname = '',
					rawType = data.getUint8(c+2),
					type = rawType&7,
					locked = rawType&0x40 == 0x40,
					splat = rawType&0x80 != 0x80;
				entry.type = typeMap[type] || '???';
				entry.track = data.getUint8(c+3);
				entry.sector = data.getUint8(c+4);
				entry.blocks = data.getUint8(c+0x1e)+data.getUint8(c+0x1f)*256,
				entry.fsize = entry.blocks*254;
				entry.size = (entry.fsize/1024).toFixed(2);
				entry.locked = locked;
				entry.splat = splat;
				entry.index = idx++;
				for (var n = c+5, l = c+21; n < l; n++) {
					var ch = data.getUint8(n);
					if (ch == 0) break;
					if (ch === 0xFF) fname += '\u03C0';
					else if (ch >= 0x20 && ch != 0xa0) fname += String.fromCharCode(ch);
					
				}
				if (fname == '' && type == 0 && entry.fsize == 0) break;
				entry.name = fname;
				entry.display = (!typeFilter || (typeof typeMap[type] !== 'undefined' && typeFilter[typeMap[type]]));
				dir.push(entry);
			}
		}
	}

	function getFile(entry) {
		var index = -1;
		if (typeof entry === 'string') {
			// directory is either "$[drive]" (old drives)
			// or "$[drive:][search][=type]" (1541, etc)
			var matches = entry.match(/^\$(([0-9])?|(([0-9])\:)?(.*?)(=(.*))?)$/);
			if (matches) {
				var drive = matches[2] || matches [4],
					search = matches[5] || '',
					type = matches[7];
				return { 'address': 0x0401, 'bytes': getDirectoryFile(search, type), 'name': '$' };
			}
			if (entry === '*') {
				index = 0;
			}
			else {
				entry = entry.replace(/^[0-9]:/, ''); // discard drive number
				var re = new RegExp( '^' + quoteWildCardExpr(entry) + '$');
				for (var i=0; i<dir.length; i++) {
					if (re.test(dir[i].name)) {
						index = i;
						break;
					}
				}
			}
		}
		else if (typeof entry === 'number') {
			index = entry;
		}
		if (index < 0 || index >= dir.length) {
			console.warn('disk image error: no such file ("'+entry+'").');
			return false;
		}
		sectorsSeen.length = 0;
		var f = dir[index], bytes = [], t = f.track, s = f.sector;
		while (t) {
			var offset = getSectorOffset(t, s);
			if (offset < 0) return;
			t =  data.getUint8(offset);
			s =  data.getUint8(offset+1);
			for (var j = offset+2, l = offset+256; j < l; j++) bytes.push(data.getUint8(j));
		}
		var addr = bytes.shift() + bytes.shift()*256;
		return { 'address': addr, 'bytes': bytes, 'name': f.name };
	}

	function loadFile(entry, forceBasicStart, autorun, reset, minRam) {
		forceBasicStart = typeof forceBasicStart === 'undefined'? false: Boolean(forceBasicStart);
		var file = getFile(entry);
		if (!file) return;
		if (typeof minRam === 'number') {
			if (minRam < 1024) minRam *= 1024;
		}
		else {
			minRam = 0;
		}
		var addr = forceBasicStart? 0x0401:file.address,
			ramRequired = Math.max(minRam, addr + file.bytes.length + 0x200),
			loadAndRun = function() {
				petCtrl.autoLoad(file.name, forceBasicStart, autorun);
			};
		if (ramRequired >= pet2001.getRamSize()) {
			petCtrl.setRamSize(ramRequired/1024, loadAndRun);
		}
		else if (reset) {
			pet2001.reset();
			petCtrl.waitForCursor(loadAndRun);
		}
		else loadAndRun();
	}

	function getSectorOffset(track, sector) {
		var t = trackMap[track];
		if (t && t[0]>sector && dsize >= t[1]+256*(sector+1)) {
			if (sectorsSeen[track]) {
				if (sectorsSeen[track][sector]) {
					console.error('disk image error: circular track link at track '+track+', sector '+sector+'.');
					return -1;
				}
			}
			else {
				sectorsSeen[track] = [];
			}
			sectorsSeen[track][sector] = true;
			return t[1] + 256 * sector;
		}
		console.error('disk image error: no such track or sector, track '+track+', sector '+sector+'.');
		return -1;
	}

	function displayDirectory(presetAsBasic) {
		petCtrl.displayDirectoryList('D64', dir, diskImgName, presetAsBasic);
	}

	function getDirectoryFile(nameFilter, typeFilter) {
		function pushLine(ln, s) {
			var link = addr + s.length + 5;
			code.push(link & 0xff, link >> 8, ln & 0xff, ln >> 8);
			for (var n = 0; n < s.length; n++) {
				var c = s.charCodeAt(n);
				code.push(c == 0x03C0? 0xff:c);
			}
			code.push(0);
			addr = link;
		}
		var code = [],
			addr = 0x0401,
			filterRE,
			typeRE,
			hideDEL = true;
		if (data && diskImgName) {
			if (nameFilter) {
				var parts = nameFilter.split(/,/g);
				for (var i = 0; i < parts.length; i++) {
					parts[i] = quoteWildCardExpr(parts[i]);
				}
				filterRE = new RegExp( '^' + (parts.length > 1? '('+parts.join('|')+')':parts[0]) + '$');
			}
			if (typeFilter) {
				typeFilter = typeFilter.replace(/[^A-W]/gi, '');
				hideDEL = !(/D/i).test(typeFilter);
				if (typeFilter) typeRE = new RegExp('^[' + typeFilter +']');
			}
			pushLine(0, '\u0012"' + diskName + '" ' + diskId + ' ' + diskDosType);
			for (var i = 0; i < dir.length; i++) {
				var entry = dir[i];
				if (hideDEL && entry.type === 'DEL') continue;
				if (typeRE && !typeRE.test(entry.type)) continue;
				if (filterRE && !filterRE.test(entry.name)) continue;
				var s = '"' + entry.name + '"';
				while(s.length < 18) s += ' ';
				s += entry.splat? '*':' ';
				s += entry.type;
				s += entry.locked? '<':' ';
				for (var n = entry.blocks <= 0? 0:Math.floor(Math.log10(entry.blocks)); n < 3; n++) s = ' ' + s;
				pushLine(entry.blocks, s);
			}
			pushLine(0, 'BYTES FREE.');
			code.push(0, 0);
		}
		return code;
	}

	function unload() {
		dir.length = 0;
		diskImgName = '';
		data = null;
	}

	return {
		'readDiskImage': readDiskImage,
		'loadDiskImage': loadDiskImage,
		'loadFile': loadFile,
		'unload': unload,
		'displayDirectory': displayDirectory,
		'getFile': getFile
	};

})();

// T64 parser

var T64 = (function() {
	var prgPath = 'prgs/',
		data = null,
		dsize = 0,
		dir = [],
		tapeImgName, tapeName, signature, tapeVersion;

	var fileTypes = {
			'0': 'FRE',   // free
			'1': 'PRG',
			//'2': 'SAV', // memory snapshot, v. 10x
			'2': 'HDR',   // file with header, v. 200
			'3': 'SAV',   // memory snapshot
			'4': 'BLK',   // tape block
			'5': 'SEQ'    // stream
		},
		typeFilter = {
			'1': true // prgs
		};

	function loadImage(imageName) {
		if (!imageName) return;
		imageName = String(imageName).replace(/^.*[\/\\]/, '');
		if (imageName === '') return;
		tapeImgName = imageName;
		tapeName = imageName.toUpperCase().replace(/\.T64$/, '');
		var xhr = new XMLHttpRequest();
		xhr.open('GET', prgPath + encodeURIComponent(imageName) + '?uid=' + Date.now().toString(36), true);
		if (typeof Uint8Array != 'undefined') xhr.responseType = 'arraybuffer';
		if (xhr.overrideMimeType) xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onload = function xhr_onload() {
			if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
				data = new DataView(xhr.response);
				dsize = data.byteLength;
				if (dsize) {
					parseTape();
					displayDirectory();
				}
				else {
					data = null;
					console.warn('File "'+imageName+'" is empty.');
				}
			}
			else {
				xhr.onerror();
			}
		}
		xhr.onerror = function xhr_onerror() {
			var msg = 'PET: Unable to load file "'+imageName+'"';
			if (xhr.status) msg += ' ('+xhr.status+')';
			msg +=  (xhr.statusText? ': '+xhr.statusText:'.');
			console.warn(msg);
		}
		xhr.send(null);
	}

	function readImage(file) {
		tapeImgName = file.name.replace(/^.*[\/\\]/, '');
		tapeName = file.name.toUpperCase().replace(/\.T64$/, '').replace(/^.*[\/\\]/, '');
		if (!tapeName) tapeName = '*';
		var fread = new FileReader();
		fread.readAsArrayBuffer(file);
		fread.onload = function(levent) {
			data = new DataView(levent.target.result);
			dsize = levent.target.result.byteLength;
			if (dsize) {
				parseTape();
				displayDirectory();
			}
		}
	}

	function parseTape() {
		var maxEntries, totalEntries, archiveName = '';
		dir.length = 0;
		signature = '';
		if (dsize < 64 || data.getUint8(0) !== 0x43 || data.getUint8(1) !== 0x36 || data.getUint8(2) !== 0x34) {
			console.warn('Not a T64 file.');
			return;
		}
		for (var i = 0; i < 0x20; i++) {
			var b = data.getUint8(i);
			if (b > 31) signature += String.fromCharCode(b);
		}
		tapeVersion = data.getUint8(0x20) | (data.getUint8(0x21) << 8);
		maxEntries = data.getUint8(0x22) | (data.getUint8(0x23) << 8);
		totalEntries = data.getUint8(0x24) | (data.getUint8(0x25) << 8);
		for (var i = 0x28; i < 0x40; i++) {
			var b = data.getUint8(i);
			if (b > 31) archiveName += String.fromCharCode(b);
		}
		archiveName = archiveName.replace(/[\x20\xA0]+$/, '');
		if (archiveName && archiveName !=='ASS PRESENTS:') tapeName = archiveName;
		if (tapeName.length > 16) tapeName = diskName.substring(0, 16);
		while (tapeName.length < 16) tapeName += '\u00A0';
		if (totalEntries > maxEntries) totalEntries = maxEntries;
		for (var n = 0; n < totalEntries; n++) {
			var ofs = 0x40 + n * 0x20,
				type = data.getUint8(ofs),
				type1541Raw = data.getUint8(ofs+1),
				startAddr = data.getUint8(ofs+2) | (data.getUint8(ofs+3) << 8),
				endAddr = data.getUint8(ofs+4) | (data.getUint8(ofs+5) << 8),
				fileOffset = data.getUint8(ofs+8) | (data.getUint8(ofs+9) << 8) | (data.getUint8(ofs+10) << 16) | (data.getUint8(ofs+11) << 24),
				fileName = '',
				type1541 = type1541Raw & 7,
				locked1541 = type1541Raw&0x40 === 0x40,
				splat1541 = type1541Raw&0x80 !== 0x80;
			for (var i = ofs + 0x10, l = ofs + 0x20; i < l; i++) {
				var b = data.getUint8(i);
				if (b === 0xFF) fileName += '\u03C0';
				else if (b > 31) fileName += String.fromCharCode(b);
			}
			fileName = fileName.replace(/[\x20\xA0]+$/, '');
			
			dir.push({
				'type': type,
				'type1541': type1541,
				'locked1541': locked1541,
				'splat1541': splat1541,
				'start': startAddr,
				'end': endAddr,
				'offset': fileOffset,
				'name': fileName,
				'fsize': endAddr - startAddr,
				'size': ((endAddr - startAddr)/1024).toFixed(2),
				'index': n,
				'display': !!typeFilter[type]
			});
		}
		if (dir.length) {
			var list = [];
			for (var n = 0, l = dir.length; n < l; n++) {
				var entry = dir[n];
				if (entry.type > 0 || entry.offset > 0) {
					list.push(entry);
				}
			}
			if (list.length) {
				list.sort(function(a,b) {
					return a.offset - b.offset;
				});
				for (var i = 0, l = list.length-1; i <= l; i++) {
					var entry = list[i],
						nextOffset = i < l? list[i+1].offset:dsize;
					if (entry.type > 0) {
						var diff = nextOffset - entry.offset;
						if (diff < entry.fsize) {
							entry.end = entry.start + diff;
							entry.fsize = diff;
							entry.size = (diff/1024).toFixed(2);
							console.log('Corrected files size for tape entry #'+entry.index+'.');
						}
					}
				}
			}
			dir = list;
		}
	}

	function displayDirectory() {
		/*
		function hex(n) {
			return '$'+n.toString(16).toUpperCase();
		}
		var s = 'Signature: '+signature + '\n' +
			'Tape Version: '+ hex(tapeVersion) + '\n' +
			'Tape Name: "' + tapeName + '"\n' +
			'-----------\n';
		for (var i = 0; i<dir.length; i++) {
			var item = dir[i];
			s+= ' type: ' +item.type +' ('+fileTypes[item.type]+')\n';
			s+= ' type1541: ' +hex(item.type1541,2)+'\n';
			if (item.type > 0) {
				s+=' name:   "'+item.name+'"\n';
				s+=' start:  '+hex(item.start)+'\n';
				s+=' end:    '+hex(item.end)+'\n';
				s+=' offset: '+hex(item.end)+'\n';
				s+=' size:   '+item.size+'K\n';
			}
			s+='-----------\n';
		}
		console.log(s);
		*/
		petCtrl.displayDirectoryList('T64', dir, tapeImgName, true, false);
	}

	function getFile(entry) {
		var index = -1;
		if (typeof entry === 'string') {
			var matches = entry.match(/^\$(([0-9])?|(([0-9])\:)?(.*?)(=(.*))?)$/);
			if (matches) {
				var drive = matches[2] || matches [4],
					search = matches[5] || '',
					type = matches[7];
				return { 'address': 0x0401, 'bytes': getDirectoryFile(search, type), 'name': '$' };
			}
			if (entry === '*') {
				index = 0;
			}
			else {
				entry = entry.replace(/^[0-9]:/, ''); // discard drive number
				var re = new RegExp( '^' + quoteWildCardExpr(entry) +'$');
				for (var i=0; i<dir.length; i++) {
					if (re.test(dir[i].name)) {
						index = i;
						break;
					}
				}
			}
		}
		else if (typeof entry === 'number') {
			index = entry;
		}
		if (index < 0 || index >= dir.length) {
			console.warn('tape image error: no such file ("'+entry+'").');
			return false;
		}
		if (dir[index].type !== 1) {
			alert('Sorry, can\'t load.\nRequested item is not a regular program file.');
			return;
		}
		var item = dir[index],
			offset = item.offset,
			end = offset + item.fsize,
			bytes = [];
		if (end > dsize) {
			console.warn('tape image error: out of bounds. (file end: '+end +', tape length: '+dsize+')');
			return;
		}
		for (var i = offset; i < end; i++) bytes.push(data.getUint8(i));
		return { 'address': item.start, 'bytes': bytes, 'name': item.name };
	}

	function loadFile(entry, forceBasicStart, autorun, reset, minRam) {
		forceBasicStart = typeof forceBasicStart === 'undefined'? false: Boolean(forceBasicStart);
		var file = getFile(entry);
		if (!file) return;
		if (typeof minRam === 'number') {
			if (minRam < 1024) minRam *= 1024;
		}
		else {
			minRam = 0;
		}
		var addr = forceBasicStart? 0x0401:file.address,
			ramRequired = Math.max(minRam, addr + file.bytes.length + 0x200),
			loadAndRun = function() {
				petCtrl.autoLoad(file.name, forceBasicStart,  autorun);
			};
		if (ramRequired >= pet2001.getRamSize()) {
			petCtrl.setRamSize(ramRequired/1024, loadAndRun);
		}
		else if (reset) {
			pet2001.reset();
			petCtrl.waitForCursor(loadAndRun);
		}
		else loadAndRun();
	}

	// compile a floppy disk like directory
	function getDirectoryFile(nameFilter, typeFilter) {
		function pushLine(ln, s) {
			var link = addr + s.length + 5;
			code.push(link & 0xff, link >> 8, ln & 0xff, ln >> 8);
			for (var n = 0; n < s.length; n++) {
				var c = s.charCodeAt(n);
				code.push(c == 0x03C0? 0xff:c);
			}
			code.push(0);
			addr = link;
		}
		var code = [],
			addr = 0x0401,
			filterRE,
			typeRE,
			typeMap1541 = ['DEL','SEQ','PRG','USR','REL'],
			hideDEL = true;
		if (data && tapeName) {
			if (nameFilter) {
				var parts = nameFilter.split(/,/g);
				for (var i = 0; i < parts.length; i++) {
					parts[i] = quoteWildCardExpr(parts[i]);
				}
				filterRE = new RegExp( '^' + (parts.length > 1? '('+parts.join('|')+')':parts[0]) + '$');
			}
			if (typeFilter) {
				typeFilter = typeFilter.replace(/[^A-W]/gi, '');
				hideDEL = !(/D/i).test(typeFilter);
				if (typeFilter) typeRE = new RegExp('^[' + typeFilter +']');
			}
			pushLine(0, '\u0012"' + tapeName + '" T64 '+hex(tapeVersion>>8,2));
			for (var i = 0; i < dir.length; i++) {
				var entry = dir[i],
					type = typeMap1541[entry.type1451] || fileTypes[entry.type] || '???',
					blockSize = Math.ceil(entry.fsize/254);
				if (hideDEL && type === 'DEL') continue;
				if (typeRE && !typeRE.test(type)) continue;
				if (filterRE && !filterRE.test(entry.name)) continue;
				var s = '"' + entry.name + '"';
				while(s.length < 18) s += ' ';
				s += entry.splat1451? '*':' ';
				s += type;
				s += entry.locked1451? '<':' ';
				for (var n = blockSize <= 0? 0:Math.floor(Math.log10(blockSize)); n < 3; n++) s = ' ' + s;
				pushLine(blockSize, s);
			}
			pushLine(0, 'BYTES FREE.');
			code.push(0, 0);
		}
		return code;
	}

	function unload() {
		dir.length = 0;
		tapeName = '';
		data = null;
	}

	return {
		'readImage': readImage,
		'loadImage': loadImage,
		'loadFile': loadFile,
		'getFile': getFile,
		'unload': unload,
		'displayDirectory': displayDirectory
	};
})();

return {
	'txt2Basic': txt2Basic,
	'basic2Txt': basic2Txt,
	'markupToPetscii': markupToPetscii,
	'convertToPrg': convertToPrg,
	'ScreenGenerator': ScreenGenerator,
	'hexDump': hexDump,
	'hexDumpBasic': hexDumpBasic,
	'disassemble': disassemble,
	'renumber': renumberBasic,
	'D64': D64,
	'T64': T64,
	'parseP00': parseP00
};
})();