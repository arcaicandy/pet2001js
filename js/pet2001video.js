//
// Copyright (c) 2014 Thomas Skibo.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//	notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//	notice, this list of conditions and the following disclaimer in the
//	documentation and/or other materials provided with the distribution.
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
// Modified by Norbert Landsteiner (NL), 2107-2020

function Pet2001Video(ctx, _config) {
	var videoRamSize = typeof _config === 'object' && _config.VIDRAM_SIZE?
		_config.VIDRAM_SIZE:0x8000;

	this.vidram = new Array(videoRamSize);

	var	MARGIN = 5,
		WIDTH = 320*2,
		HEIGHT = 200*2,
		colorSets = {
			'white': {
				r: 0xf1,
				g: 0xf5,
				b: 0xf9,
				blur: 2,
				blurR: 0xa5,
				blurG: 0xdc,
				blurB: 0xf1,
				blurA: 0.95,
				imgCoordX: 3,
				imgCoordY: 3,
				imgCoordBlurX: 3,
				imgCoordBlurY: 11,
				label: 'white'
			},
			'green': {
				r: 0x80,
				g: 0xff,
				b: 0xca,
				blur: 2,
				blurR: 0x30,
				blurG: 0xce,
				blurB: 0x84,
				blurA: 0.96,
				imgCoordX: 11,
				imgCoordY: 3,
				imgCoordBlurX: 11,
				imgCoordBlurY: 11,
				label: 'green'
			}
		},
		FLICKER = false,
		ASPECT_RATIO = 1.0, //1.2,
		REFRESH_DELAY = 17, //milliscecs
		screenColor = colorSets['green'];


	if (typeof _config === 'object' && _config.SCREEN_COLOR && colorSets[_config.SCREEN_COLOR])
		screenColor = colorSets[_config.SCREEN_COLOR];

	// jpg img inluding an embeded color profile for managed screen colors
	var colorsetSrc = 'data:image/jpeg;base64,/9j/4QAYRXhpZgAASUkqAAgAAAAAAAAAAAAAAP/sABFEdWNreQABAAQAAABkAAD/4gxYSUNDX1BST0ZJTEUAAQEAAAxITGlubwIQAABtbnRyUkdCIFhZWiAHzgACAAkABgAxAABhY3NwTVNGVAAAAABJRUMgc1JHQgAAAAAAAAAAAAAAAAAA9tYAAQAAAADTLUhQICAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABFjcHJ0AAABUAAAADNkZXNjAAABhAAAAGx3dHB0AAAB8AAAABRia3B0AAACBAAAABRyWFlaAAACGAAAABRnWFlaAAACLAAAABRiWFlaAAACQAAAABRkbW5kAAACVAAAAHBkbWRkAAACxAAAAIh2dWVkAAADTAAAAIZ2aWV3AAAD1AAAACRsdW1pAAAD+AAAABRtZWFzAAAEDAAAACR0ZWNoAAAEMAAAAAxyVFJDAAAEPAAACAxnVFJDAAAEPAAACAxiVFJDAAAEPAAACAx0ZXh0AAAAAENvcHlyaWdodCAoYykgMTk5OCBIZXdsZXR0LVBhY2thcmQgQ29tcGFueQAAZGVzYwAAAAAAAAASc1JHQiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAABJzUkdCIElFQzYxOTY2LTIuMQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWFlaIAAAAAAAAPNRAAEAAAABFsxYWVogAAAAAAAAAAAAAAAAAAAAAFhZWiAAAAAAAABvogAAOPUAAAOQWFlaIAAAAAAAAGKZAAC3hQAAGNpYWVogAAAAAAAAJKAAAA+EAAC2z2Rlc2MAAAAAAAAAFklFQyBodHRwOi8vd3d3LmllYy5jaAAAAAAAAAAAAAAAFklFQyBodHRwOi8vd3d3LmllYy5jaAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkZXNjAAAAAAAAAC5JRUMgNjE5NjYtMi4xIERlZmF1bHQgUkdCIGNvbG91ciBzcGFjZSAtIHNSR0IAAAAAAAAAAAAAAC5JRUMgNjE5NjYtMi4xIERlZmF1bHQgUkdCIGNvbG91ciBzcGFjZSAtIHNSR0IAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZGVzYwAAAAAAAAAsUmVmZXJlbmNlIFZpZXdpbmcgQ29uZGl0aW9uIGluIElFQzYxOTY2LTIuMQAAAAAAAAAAAAAALFJlZmVyZW5jZSBWaWV3aW5nIENvbmRpdGlvbiBpbiBJRUM2MTk2Ni0yLjEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHZpZXcAAAAAABOk/gAUXy4AEM8UAAPtzAAEEwsAA1yeAAAAAVhZWiAAAAAAAEwJVgBQAAAAVx/nbWVhcwAAAAAAAAABAAAAAAAAAAAAAAAAAAAAAAAAAo8AAAACc2lnIAAAAABDUlQgY3VydgAAAAAAAAQAAAAABQAKAA8AFAAZAB4AIwAoAC0AMgA3ADsAQABFAEoATwBUAFkAXgBjAGgAbQByAHcAfACBAIYAiwCQAJUAmgCfAKQAqQCuALIAtwC8AMEAxgDLANAA1QDbAOAA5QDrAPAA9gD7AQEBBwENARMBGQEfASUBKwEyATgBPgFFAUwBUgFZAWABZwFuAXUBfAGDAYsBkgGaAaEBqQGxAbkBwQHJAdEB2QHhAekB8gH6AgMCDAIUAh0CJgIvAjgCQQJLAlQCXQJnAnECegKEAo4CmAKiAqwCtgLBAssC1QLgAusC9QMAAwsDFgMhAy0DOANDA08DWgNmA3IDfgOKA5YDogOuA7oDxwPTA+AD7AP5BAYEEwQgBC0EOwRIBFUEYwRxBH4EjASaBKgEtgTEBNME4QTwBP4FDQUcBSsFOgVJBVgFZwV3BYYFlgWmBbUFxQXVBeUF9gYGBhYGJwY3BkgGWQZqBnsGjAadBq8GwAbRBuMG9QcHBxkHKwc9B08HYQd0B4YHmQesB78H0gflB/gICwgfCDIIRghaCG4IggiWCKoIvgjSCOcI+wkQCSUJOglPCWQJeQmPCaQJugnPCeUJ+woRCicKPQpUCmoKgQqYCq4KxQrcCvMLCwsiCzkLUQtpC4ALmAuwC8gL4Qv5DBIMKgxDDFwMdQyODKcMwAzZDPMNDQ0mDUANWg10DY4NqQ3DDd4N+A4TDi4OSQ5kDn8Omw62DtIO7g8JDyUPQQ9eD3oPlg+zD88P7BAJECYQQxBhEH4QmxC5ENcQ9RETETERTxFtEYwRqhHJEegSBxImEkUSZBKEEqMSwxLjEwMTIxNDE2MTgxOkE8UT5RQGFCcUSRRqFIsUrRTOFPAVEhU0FVYVeBWbFb0V4BYDFiYWSRZsFo8WshbWFvoXHRdBF2UXiReuF9IX9xgbGEAYZRiKGK8Y1Rj6GSAZRRlrGZEZtxndGgQaKhpRGncanhrFGuwbFBs7G2MbihuyG9ocAhwqHFIcexyjHMwc9R0eHUcdcB2ZHcMd7B4WHkAeah6UHr4e6R8THz4faR+UH78f6iAVIEEgbCCYIMQg8CEcIUghdSGhIc4h+yInIlUigiKvIt0jCiM4I2YjlCPCI/AkHyRNJHwkqyTaJQklOCVoJZclxyX3JicmVyaHJrcm6CcYJ0kneierJ9woDSg/KHEooijUKQYpOClrKZ0p0CoCKjUqaCqbKs8rAis2K2krnSvRLAUsOSxuLKIs1y0MLUEtdi2rLeEuFi5MLoIuty7uLyQvWi+RL8cv/jA1MGwwpDDbMRIxSjGCMbox8jIqMmMymzLUMw0zRjN/M7gz8TQrNGU0njTYNRM1TTWHNcI1/TY3NnI2rjbpNyQ3YDecN9c4FDhQOIw4yDkFOUI5fzm8Ofk6Njp0OrI67zstO2s7qjvoPCc8ZTykPOM9Ij1hPaE94D4gPmA+oD7gPyE/YT+iP+JAI0BkQKZA50EpQWpBrEHuQjBCckK1QvdDOkN9Q8BEA0RHRIpEzkUSRVVFmkXeRiJGZ0arRvBHNUd7R8BIBUhLSJFI10kdSWNJqUnwSjdKfUrESwxLU0uaS+JMKkxyTLpNAk1KTZNN3E4lTm5Ot08AT0lPk0/dUCdQcVC7UQZRUFGbUeZSMVJ8UsdTE1NfU6pT9lRCVI9U21UoVXVVwlYPVlxWqVb3V0RXklfgWC9YfVjLWRpZaVm4WgdaVlqmWvVbRVuVW+VcNVyGXNZdJ114XcleGl5sXr1fD19hX7NgBWBXYKpg/GFPYaJh9WJJYpxi8GNDY5dj62RAZJRk6WU9ZZJl52Y9ZpJm6Gc9Z5Nn6Wg/aJZo7GlDaZpp8WpIap9q92tPa6dr/2xXbK9tCG1gbbluEm5rbsRvHm94b9FwK3CGcOBxOnGVcfByS3KmcwFzXXO4dBR0cHTMdSh1hXXhdj52m3b4d1Z3s3gReG54zHkqeYl553pGeqV7BHtje8J8IXyBfOF9QX2hfgF+Yn7CfyN/hH/lgEeAqIEKgWuBzYIwgpKC9INXg7qEHYSAhOOFR4Wrhg6GcobXhzuHn4gEiGmIzokziZmJ/opkisqLMIuWi/yMY4zKjTGNmI3/jmaOzo82j56QBpBukNaRP5GokhGSepLjk02TtpQglIqU9JVflcmWNJaflwqXdZfgmEyYuJkkmZCZ/JpomtWbQpuvnByciZz3nWSd0p5Anq6fHZ+Ln/qgaaDYoUehtqImopajBqN2o+akVqTHpTilqaYapoum/adup+CoUqjEqTepqaocqo+rAqt1q+msXKzQrUStuK4trqGvFq+LsACwdbDqsWCx1rJLssKzOLOutCW0nLUTtYq2AbZ5tvC3aLfguFm40blKucK6O7q1uy67p7whvJu9Fb2Pvgq+hL7/v3q/9cBwwOzBZ8Hjwl/C28NYw9TEUcTOxUvFyMZGxsPHQce/yD3IvMk6ybnKOMq3yzbLtsw1zLXNNc21zjbOts83z7jQOdC60TzRvtI/0sHTRNPG1EnUy9VO1dHWVdbY11zX4Nhk2OjZbNnx2nba+9uA3AXcit0Q3ZbeHN6i3ynfr+A24L3hROHM4lPi2+Nj4+vkc+T85YTmDeaW5x/nqegy6LzpRunQ6lvq5etw6/vshu0R7ZzuKO6070DvzPBY8OXxcvH/8ozzGfOn9DT0wvVQ9d72bfb794r4Gfio+Tj5x/pX+uf7d/wH/Jj9Kf26/kv+3P9t////7gAmQWRvYmUAZMAAAAABAwAVBAMGCg0AAA37AAAOHAAADk0AAA5u/9sAhAABAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAgICAgICAgICAgIDAwMDAwMDAwMDAQEBAQEBAQIBAQICAgECAgMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwP/wgARCAAQABADAREAAhEBAxEB/8QAcwABAQEAAAAAAAAAAAAAAAAACAUJAQADAQAAAAAAAAAAAAAAAAAEBwgFEAEAAAAAAAAAAAAAAAAAAAAgEQEAAAAAAAAAAAAAAAAAAAAgEgEAAAAAAAAAAAAAAAAAAAAgEwEAAAAAAAAAAAAAAAAAAAAg/9oADAMBAAIRAxEAAAHdEoU9YEOS3I+BAhpQ/9oACAEBAAEFAh//2gAIAQIAAQUCH//aAAgBAwABBQIf/9oACAECAgY/Ah//2gAIAQMCBj8CH//aAAgBAQEGPwIf/9oACAEBAwE/IR//2gAIAQIDAT8hH//aAAgBAwMBPyEf/9oADAMBAAIRAxEAABBob//aAAgBAQMBPxAf/9oACAECAwE/EB//2gAIAQMDAT8QH//Z';

	var	displayWidth = WIDTH+2*MARGIN,
		displayHeight = HEIGHT+2*MARGIN,
		maxPixel = displayWidth*displayHeight*4,
		rowOffset = 4*WIDTH,
		pOffset1 = 4,
		pOffset2 = rowOffset,
		pOffset3 = rowOffset+4,
		buffer, bufferCtx, bufferData, pixels,
		reqAnimFrame = window.requestAnimationFrame
			|| window.mozRequestAnimationFrame
			|| window.webkitRequestAnimationFrame
			|| window.oRequestAnimationFrame
			|| null,
		hasAnimFrame = Boolean(reqAnimFrame),
		charset = PetRoms.petCharRom1,
		screenCodeTag = 'rom1',
		blank = false,
		R, G, B;

	// video and color setup (NL 2017)
	(function init() {
		var canvas=ctx.canvas;
		canvas.style.backgroundColor='#000';
		canvas.style.width=displayWidth+'px';
		canvas.style.height=displayHeight+'px';
		//canvas.mozOpaque=true;
		canvas.width=displayWidth;
		canvas.height=displayHeight;
		buffer=document.createElement('canvas');
		buffer.width=WIDTH;
		buffer.height=HEIGHT;
		bufferCtx=buffer.getContext('2d');
		bufferData=bufferCtx.getImageData(0,0, WIDTH, HEIGHT);
		pixels=bufferData.data;
		getManagedColors();
		updateColors();
		if (ASPECT_RATIO && ASPECT_RATIO != 1.0) {
			var sy = 1, //(1 + ASPECT_RATIO) / 2,
				sx = 1/ASPECT_RATIO, //(1 + 1/ASPECT_RATIO) / 2,
				pn = canvas.parentNode,
				selectorRE = /^pet/i;
			canvas.style.transformOrigin = '0 0';
			canvas.style.transform = 'scale('+sx+','+sy+')';
			if (pn && (selectorRE.test(pn.id) || selectorRE.test(pn.className))) {
				var h = pn.offsetHeight, w = pn.offsetWidth;
				pn.style.height = (h * sy) + 'px';
				pn.style.width = (w * sx) + 'px';
			}
		}
		if (hasAnimFrame) {
			reqAnimFrame(updateVideo);
		}
		else {
			setTimeout(updateVideo, REFRESH_DELAY);
		}
	})();

	function getManagedColors() {
		var img, update;

		function imgHandler() {
			// extract managed colors from image
			// and mix them by weight (cw) with generic monitor colors
			var cw = 8,
				cf = cw + 1,
				canvas = document.createElement('canvas'),
				w = canvas.width = img.width,
				h = canvas.height = img.height;
			if (!w || !h) return;
			var ctx = canvas.getContext('2d');
			ctx.drawImage(img, 0, 0);
			var d = ctx.getImageData(0, 0, w, h).data;
			for (var clr in colorSets) {
				var c = colorSets[clr],
					p1 = c.imgCoordY*w*4 + c.imgCoordX*4,
					p2 = c.imgCoordBlurY*w*4 + c.imgCoordBlurX*4;
				c.r = ((c.r + d[p1  ]*cw) / cf) | 0;
				c.g = ((c.g + d[p1+1]*cw) / cf) | 0;
				c.b = ((c.b + d[p1+2]*cw) / cf) | 0;
				c.blurR = ((c.blurR + d[p2  ]*cw) / cf) | 0;
				c.blurG = ((c.blurG + d[p2+1]*cw) / cf) | 0;
				c.blurB = ((c.blurB + d[p2+2]*cw) / cf) | 0;
			}
			if (update) updateColors(this.vidram);
		}

		if (typeof colorsetSrc === 'string') {
			img = new Image();
			img.src = colorsetSrc;
			update = !img.complete;
			if (img.complete) imgHandler();
			else img.onload = imgHandler;
		}
	}

	this.setColor = function(clr) {
		if (typeof clr === 'string') {
			var c = colorSets[clr.toLowerCase()];
			if (c) {
				screenColor = c;
				updateColors(this.vidram);
			}
		}
	};

	this.getColor = function() { return screenColor.label; }

	function updateColors(vidram) {
		R = screenColor.r;
		G = screenColor.g;
		B = screenColor.b;
		ctx.shadowColor = 'rgba('
			+screenColor.blurR+','
			+screenColor.blurG+','
			+screenColor.blurB+','
			+screenColor.blurA+')';
		ctx.fillStyle='rgba(0,0,0,1)';
		ctx.fillRect(0,0, displayWidth, displayHeight);
		ctx.fillStyle='rgba(0,0,0,0.4)';
		ctx.shadowOffsetX=0;
		ctx.shadowOffsetY=0;
		blankScreen();
		if (vidram) redrawScreen(vidram);
	}

	// Draw a character from character ROM to canvas.
	// (changed for bitmapped display; NL 2017)
	function drawChar(addr, d8) {
		// Determine location from video memory address (offset)
		var col = (addr % 40 ) | 0,
			row = (addr / 40) | 0,
			romAddr = (d8 & 0x7f) * 8,
			p0 = row * rowOffset * 16 + col * 64 + 3; // top-left pixel, alpha value

		for (var y = 0; y < 8; y++) {
			var bits = charset[romAddr + y];

			// Inverse?
			if ((d8 & 0x80) != 0) bits ^= 0xff;

			// draw a byte at double resolution
			// (one line of 2 * 8 pixels twice, p: first pixel in current line)
			var p = p0 + y * rowOffset * 2;

			for (var x = 0; x < 8; x++) {
				if (((bits << x) & 0x80) != 0) {
					pixels[p]          = 220; // x,     y
					pixels[p+pOffset1] = 205; // x + 1, y
					pixels[p+pOffset2] =  75; // x,     y + 1
					pixels[p+pOffset3] =  55; // x + 1, y + 1
				}
				else {
					pixels[p]          = 0;
					pixels[p+pOffset1] = 0;
					pixels[p+pOffset2] = 0;
					pixels[p+pOffset3] = 0;
				}
				p += 8; // advance by 2 pixels to the right for next x
			}
		}
	}

	function updateVideo() {
		bufferCtx.putImageData(bufferData, 0, 0);
		ctx.shadowBlur=0;
		ctx.fillRect(0,0, displayWidth, displayHeight);
		ctx.shadowBlur=screenColor.blur;
		ctx.drawImage(buffer, 0, 0, WIDTH, HEIGHT, MARGIN, MARGIN, WIDTH, HEIGHT);
		if (FLICKER) ctx.canvas.style.opacity=0.985+0.015*Math.random();
		if (hasAnimFrame) {
			reqAnimFrame(updateVideo);
		}
		else {
			setTimeout(updateVideo, REFRESH_DELAY);
		}
	}

	// Redraw entire screen after removing blanking or changing char set.
	function redrawScreen(vidram) {
		for (var addr = 0; addr < 1000; addr++) drawChar(addr, vidram[addr]);
	}

	// Blank screen
	function blankScreen() {
		ctx.fillRect(0, 0, displayWidth, displayHeight);
		for (var i=0; i<maxPixel; i+=4) {
			pixels[i] = R;
			pixels[i+1] = G;
			pixels[i+2] = B;
			pixels[i+3] = 0;
		}
	}

	// Write to video ram.
	this.write = function(addr, d8) {
		this.vidram[addr] = d8;
		if (addr < 1000 && !blank) {
			drawChar(addr, d8);
		}
	};

	this.forcedWrite = function(addr, d8) {
		if (addr < 1000) {
			this.vidram[addr] = d8;
			drawChar(addr, d8);
		}
	};

	var blankTimeout = null;

	this.blankTimeoutFunc = function() {
		// console.log("screen blank time-out called");
		blankScreen();
		blankTimeout = null;
	};

	// Called in response to change in blanking signal.
	// Blanking of the screen is delayed by 100ms to avoid flickering
	// during scrolling.
	this.setVideoBlank = function(flag) {
		if (flag && !blank) {
			if (!blankTimeout) blankTimeout = setTimeout(this.blankTimeoutFunc, 100);
			blank = true;
		}
		else if (blank && !flag) {
			if (blankTimeout) {
				clearTimeout(blankTimeout);
				blankTimeout = null;
			}
			redrawScreen(this.vidram);
			blank = false;
		}
	};

	// Called in response to character set signal change.
	this.setCharset = function(flag) {
		charset = flag ? PetRoms.charRom2 : PetRoms.charRom1;
		screenCodeTag = flag ? 'rom2' : 'rom1';
		redrawScreen(this.vidram);
	};

	// Convert state of video into a string for saving (unused).
	this.save = function() {
		var s = (blank ? '1' : '0') + ',' +
			(this.charset == PetRoms.charRom1 ? '1' : '2') + ',';

		for (var i = 0; i < videoRamSize; i++)
			s += this.vidram[i].toString(16) + ',';

		return s;
	};

	// Restore state of video from string (unused).
	this.load = function(s) {
		var l = s.split(',');
		blank = (l[0] == '1');
		charset = (l[1] == '2' ? PetRoms.charRom2 : PetRoms.charRom1);
		screenCodeTag = (l[1] == '2')? 'rom2' : 'rom1';

		for (var i = 0; i < videoRamSize; i++)
			this.vidram[i] = parseInt(l[i + 2], 16);

		if (blank) blankScreen();
		else redrawScreen(this.vidram);
	};

	// text conversion and export (NL 2017)
	var screenCodesToUnicode = {
		rom1: {
			0x00: 0x0040,
			0x01: 0x0041, 0x02: 0x0042, 0x03: 0x0043, 0x04: 0x0044, 0x05: 0x0045,
			0x06: 0x0046, 0x07: 0x0047, 0x08: 0x0048, 0x09: 0x0049, 0x0A: 0x004A,
			0x0B: 0x004B, 0x0C: 0x004C, 0x0D: 0x004D, 0x0E: 0x004E, 0x0F: 0x004F,
			0x10: 0x0050, 0x11: 0x0051, 0x12: 0x0052, 0x13: 0x0053, 0x14: 0x0054,
			0x15: 0x0055, 0x16: 0x0056, 0x17: 0x0057, 0x18: 0x0058, 0x19: 0x0059,
			0x1A: 0x005A, 0x1B: 0x005B, 0x1C: 0x005C, 0x1D: 0x005D, 0x1E: 0x2191,
			0x1F: 0x2190, 0x20: 0x0020, 0x21: 0x0021, 0x22: 0x0022, 0x23: 0x0023,
			0x24: 0x0024, 0x25: 0x0025, 0x26: 0x0026, 0x27: 0x0027, 0x28: 0x0028,
			0x29: 0x0029, 0x2A: 0x002A, 0x2B: 0x002B, 0x2C: 0x002C, 0x2D: 0x002D,
			0x2E: 0x002E, 0x2F: 0x002F, 0x30: 0x0030, 0x31: 0x0031, 0x32: 0x0032,
			0x33: 0x0033, 0x34: 0x0034, 0x35: 0x0035, 0x36: 0x0036, 0x37: 0x0037,
			0x38: 0x0038, 0x39: 0x0039, 0x3A: 0x003A, 0x3B: 0x003B, 0x3C: 0x003C,
			0x3D: 0x003D, 0x3E: 0x003E, 0x3F: 0x003F, 0x40: 0x2500, 0x41: 0x2660,
			0x42: 0x2502, 0x43: 0x2500, 0x44: 0x2500, 0x45: 0x2594, 0x46: 0x2500,
			0x47: 0x2502, 0x48: 0x2502, 0x49: 0x256E, 0x4A: 0x2570, 0x4B: 0x256F,
			0x4C: 0x2599, 0x4D: 0x2572, 0x4E: 0x2571, 0x4F: 0x259B, 0x50: 0x259C,
			0x51: 0x25CF, 0x52: 0x2581, 0x53: 0x2665, 0x54: 0x258F, 0x55: 0x256D,
			0x56: 0x2573, 0x57: 0x25CB, 0x58: 0x2663, 0x59: 0x2595, 0x5A: 0x2666,
			0x5B: 0x253C, 0x5C: 0x258C, 0x5D: 0x2502, 0x5E: 0x03C0, 0x5F: 0x25E5,
			0x60: 0x0020, 0x61: 0x258C, 0x62: 0x2584, 0x63: 0x2594, 0x64: 0x2581,
			0x65: 0x258F, 0x66: 0x2592, 0x67: 0x2595, 0x68: 0x2584, 0x69: 0x25E4,
			0x6A: 0x2595, 0x6B: 0x251C, 0x6C: 0x2597, 0x6D: 0x2514, 0x6E: 0x2510,
			0x6F: 0x2582, 0x70: 0x250C, 0x71: 0x2534, 0x72: 0x252C, 0x73: 0x2524,
			0x74: 0x258E, 0x75: 0x258D, 0x76: 0x2590, 0x77: 0x2594, 0x78: 0x2580,
			0x79: 0x2583, 0x7A: 0x259F, 0x7B: 0x2596, 0x7C: 0x259D, 0x7D: 0x2518,
			0x7E: 0x2598, 0x7F: 0x259A, 0xCC: 0x259D, 0xCF: 0x2597, 0xD0: 0x2596,
			0xDF: 0x25E3, 0xE0: 0x2588, 0xE1: 0x2590, 0xE2: 0x2580, 0xE3: 0x2587,
			0xE4: 0x2580, 0xE5: 0x2598, 0xE6: 0x2592, 0xE7: 0x2589, 0xE9: 0x25E2,
			0xEA: 0x258A, 0xEC: 0x259B, 0xEF: 0x2580, 0xF4: 0x2590, 0xF5: 0x2590,
			0xF6: 0x258B, 0xF7: 0x2586, 0xF8: 0x2585, 0xF9: 0x2580, 0xFA: 0x2580,
			0xFB: 0x259C, 0xFC: 0x2599, 0xFE: 0x259F, 0xFF: 0x259E, 0xA0: 0x2588
		},
		rom2: {
			0x00: 0x0040,
			0x01: 0x0041, 0x02: 0x0042, 0x03: 0x0043, 0x04: 0x0044, 0x05: 0x0045,
			0x06: 0x0046, 0x07: 0x0047, 0x08: 0x0048, 0x09: 0x0049, 0x0A: 0x004A,
			0x0B: 0x004B, 0x0C: 0x004C, 0x0D: 0x004D, 0x0E: 0x004E, 0x0F: 0x004F,
			0x10: 0x0050, 0x11: 0x0051, 0x12: 0x0052, 0x13: 0x0053, 0x14: 0x0054,
			0x15: 0x0055, 0x16: 0x0056, 0x17: 0x0057, 0x18: 0x0058, 0x19: 0x0059,
			0x1A: 0x005A, 0x1B: 0x005B, 0x1C: 0x005C, 0x1D: 0x005D, 0x1E: 0x2191,
			0x1F: 0x2190, 0x20: 0x0020, 0x21: 0x0021, 0x22: 0x0022, 0x23: 0x0023,
			0x24: 0x0024, 0x25: 0x0025, 0x26: 0x0026, 0x27: 0x0027, 0x28: 0x0028,
			0x29: 0x0029, 0x2A: 0x002A, 0x2B: 0x002B, 0x2C: 0x002C, 0x2D: 0x002D,
			0x2E: 0x002E, 0x2F: 0x002F, 0x30: 0x0030, 0x31: 0x0031, 0x32: 0x0032,
			0x33: 0x0033, 0x34: 0x0034, 0x35: 0x0035, 0x36: 0x0036, 0x37: 0x0037,
			0x38: 0x0038, 0x39: 0x0039, 0x3A: 0x003A, 0x3B: 0x003B, 0x3C: 0x003C,
			0x3D: 0x003D, 0x3E: 0x003E, 0x3F: 0x003F, 0x40: 0x2500, 0x41: 0x0061,
			0x42: 0x0062, 0x43: 0x0063, 0x44: 0x0064, 0x45: 0x0065, 0x46: 0x0066,
			0x47: 0x0067, 0x48: 0x0068, 0x49: 0x0069, 0x4A: 0x006A, 0x4B: 0x006B,
			0x4C: 0x006C, 0x4D: 0x006D, 0x4E: 0x006E, 0x4F: 0x006F, 0x50: 0x0071,
			0x51: 0x0072, 0x52: 0x0072, 0x53: 0x0073, 0x54: 0x0074, 0x55: 0x0075,
			0x56: 0x0076, 0x57: 0x0077, 0x58: 0x0078, 0x59: 0x0079, 0x5A: 0x007A,
			0x5B: 0x253C, 0x5C: 0x258C, 0x5D: 0x2502, 0x5E: 0x2591, 0x5F: 0x25A7,
			0x60: 0x0020, 0x61: 0x258C, 0x62: 0x2584, 0x63: 0x2594, 0x64: 0x2581,
			0x65: 0x258F, 0x66: 0x2592, 0x67: 0x2595, 0x68: 0x2584, 0x69: 0x25A8,
			0x6A: 0x2595, 0x6B: 0x251C, 0x6C: 0x2597, 0x6D: 0x2514, 0x6E: 0x2510,
			0x6F: 0x2582, 0x70: 0x250C, 0x71: 0x2534, 0x72: 0x252C, 0x73: 0x2524,
			0x74: 0x258E, 0x75: 0x258D, 0x76: 0x2590, 0x77: 0x2594, 0x78: 0x2580,
			0x79: 0x2583, 0x7A: 0x2713, 0x7B: 0x2596, 0x7C: 0x259D, 0x7D: 0x2518,
			0x7E: 0x2598, 0x7F: 0x259A, 0xDE: 0x2591, 0xDF: 0x25A7, 0xE0: 0x2588,
			0xE1: 0x2590, 0xE2: 0x2580, 0xE3: 0x2587, 0xE4: 0x2580, 0xE5: 0x2598,
			0xE6: 0x2592, 0xE7: 0x2589, 0xE9: 0x25A8, 0xEA: 0x258A, 0xEC: 0x259B,
			0xEF: 0x2580, 0xF4: 0x2590, 0xF5: 0x2590, 0xF6: 0x258B, 0xF7: 0x2586,
			0xF8: 0x2585, 0xF9: 0x2580, 0xFB: 0x259C, 0xFC: 0x2599, 0xFE: 0x259F,
			0xFF: 0x259E, 0xA0: 0x2588
		}
	};

	this.exportText = function(asHexDump) {
		var s = '', ct = screenCodesToUnicode[screenCodeTag];
		if (asHexDump) {
			for (var r = 0; r < 25; r++) {
				for (var c = 0; c < 40; c+=8) {
					var l = [];
					for (var i=0; i<8; i++) {
						var v = this.vidram[r * 40 + c + i];
						l.push((v < 16? '$0':'$')+v.toString(16));
					}
					s += l.join(',').toUpperCase() + (c == 0? ' ;' + r +'\n':'\n');
				}
			}
			return s;
		}
		else {
			for (var r = 0; r < 25; r++) {
				var l = '';
				for (var c = r * 40, cm = c + 40; c < cm; c++) {
					var v = this.vidram[c];
					l += String.fromCharCode(ct[v] || ct[v & 127]);
				}
				s += l.replace(/ +$/, '') + '\n';
			}
			return s.replace(/\n+$/, '');
		}
	};

	this.exportImage = function(includeMargins) {
		var canvas = ctx.canvas;
		if (!canvas || !canvas.toDataURL) return null;
		if (includeMargins) {
			return canvas.toDataURL('image/png');
		}
		else {
			var tBuffer = document.createElement('canvas');
			tBuffer.width = WIDTH;
			tBuffer.height = HEIGHT;
			tBuffer.getContext('2d').drawImage(canvas, MARGIN, MARGIN, WIDTH, HEIGHT, 0, 0, WIDTH, HEIGHT);
			return tBuffer.toDataURL('image/png');
		}
	};

	this.exportHardCopy = function(rasterSize, dotSize) {
		/*
		  emulated printer raster-size (int): 1 <= rasterSize <= 3 (not too big for UI)
		  emulated printer dot-size (float): 1 <= dotSize <= rasterSize
		  raster-size defaults to 2,
		  dot-size defaults to 1.15 (at 2px raster-size)
		*/
		var rs = (!rasterSize || isNaN(rasterSize))? 2 :
				Math.max(1, Math.min(3, Math.round(rasterSize))),
			ds = (!dotSize || isNaN(dotSize))? Math.max(1, 1.15 * rs/2):
				Math.max(1, Math.min(rs, dotSize)),
			blockWidth = 8 * rs,
			w = 320 * rs,
			h = 200 * rs,
			tBuffer = document.createElement('canvas'),
			tCtx = tBuffer.getContext('2d');
		tBuffer.width = w;
		tBuffer.height = h;
		tCtx.fillStyle = '#fff';
		tCtx.fillRect(0, 0, w, h);
		tCtx.fillStyle = '#000';
		for (var row = 0; row < 25; row++) {
			for (var col = 0; col < 40; col++) {
				var d8 = this.vidram[row * 40 + col],
					romAddr = (d8 & 0x7f) * 8,
					px = col * blockWidth,
					py = row * blockWidth;
				for (var y = 0; y < 8; y++) {
					var bits = charset[romAddr++];
					if ((d8 & 0x80) != 0) bits ^= 0xff;
					for (var x = 0; x < 8; x++) {
						if (((bits << x) & 0x80) != 0) {
							tCtx.fillRect(px + x * rs, py + y * rs, ds, ds);
						}
					}
				}
			}
		}
		return tBuffer.toDataURL('image/png');
	};

}
