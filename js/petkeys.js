////////////////////////////
//
// Copyright (c) 2014 Thomas Skibo.
// All rights reserved.
//
// Redistribution and use in source and binary forms, with or without
// modification, are permitted provided that the following conditions
// are met:
// 1. Redistributions of source code must retain the above copyright
//	  notice, this list of conditions and the following disclaimer.
// 2. Redistributions in binary form must reproduce the above copyright
//	  notice, this list of conditions and the following disclaimer in the
//	  documentation and/or other materials provided with the distribution.
//
// THIS SOFTWARE IS PROVIDED BY AUTHOR AND CONTRIBUTORS ``AS IS'' AND
// ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
// ARE DISCLAIMED.	IN NO EVENT SHALL AUTHOR OR CONTRIBUTORS BE LIABLE
// FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
// DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS
// OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
// HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
// LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
// OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
// SUCH DAMAGE.
//
// Modified by Norbert Landsteiner (NL), 2017-2020

// petkeys.js
var PetKeys = function(kbdElementId) {

  var petkeysDisabled = false, ignoreEsc = false, noRepeat = false, realPETKeyboard = false;
  var keyrows = [0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff];
  var keyboardElement = document.getElementById(kbdElementId);

  // changes for visible feeback and shiftkey-support; NL 2017
  var isShift=false, isLeftShift=false, isRightShift=false, keyMask, shiftMask, isKeyDown=false, lastKeyCode = 0;

  (function init() {
    keyMask=document.createElement('div');
    keyMask.style.position='absolute';
    keyMask.style.backgroundColor='rgba(0,0,0,0.225)';
    keyMask.style.pointerEvents='none';
    keyMask.style.padding='0';
    keyMask.style.margin='0';
    keyMask.style.zIndex=1000;
    shiftMask=document.createElement('div');
    shiftMask.style.position='absolute';
    shiftMask.style.width=shiftMask.style.height='48px';
    shiftMask.style.backgroundColor='rgba(0,0,0,0.225)';
    shiftMask.style.pointerEvents='none';
    shiftMask.style.padding='0';
    shiftMask.style.margin='0';
    shiftMask.style.zIndex=1000;
  })();

  function setKeyMask(row, col, ignoreShift) {
    var isShiftKey = (row == 4 && (col == 0 || col == 10)),
      isCursor = (row == 0 && (col == 13 || col == 14)),
      mask = isShiftKey? shiftMask:keyMask;
    document.body.appendChild(mask);
    if (isShiftKey) {
      isShift=!isShift;
    }
    else {
      if (row == 4 && (col == 5 || col == 6)) { // space key
        mask.style.width='96px';
        if (col==6) col--;
      }
      else {
        mask.style.width='48px';
      }
      if ((row == 2 || row == 3) && col == 10) { // return key
        mask.style.height='96px';
        if (row==3) row--;
      }
      else {
        mask.style.height= '48px';
      }
      if (!ignoreShift && isShift && !isCursor) setTimeout(releaseShiftKey,0);
    }
    mask.style.left=Math.floor(keyboardElement.offsetLeft+13+col*48.5)+'px';
    mask.style.top=Math.floor(keyboardElement.offsetTop+13+row*48.5)+'px';
  }

  function releaseKeyMask(ignoreShift) {
    if (keyMask.parentNode) keyMask.parentNode.removeChild(keyMask);
    if (!ignoreShift && !isShift && shiftMask.parentNode) shiftMask.parentNode.removeChild(shiftMask);
  }

  function releaseShiftKey() {
    isShift=false;
    isLeftShift=false;
    isRightShift=false;
    if (shiftMask.parentNode) shiftMask.parentNode.removeChild(shiftMask);
  }

  function reset() {
    if (petkeyKeypressTimeoutHandle) clearTimeout(petkeyKeypressTimeoutHandle);
    petkeyKeypressTimeoutHandle = null;
    petkeyKeyQueue.length = 0;
    if (autoTypeTimer) clearTimeout(autoTypeTimer);
    isShift=false;
    isLeftShift=false;
    isRightShift=false;
    kbdTouches = {};
    petkeyReleaseAll();
  }

  function petSetShiftKey(down, right) {
    if (right)
      isRightShift = down;
    else
      isLeftShift = down;

    var bit = (right)? 0x20:0x01;
    if (down)
      keyrows[8] &= 0xff-bit;
    else
      keyrows[8] |= bit;
    pet2001.setKeyrows(keyrows);
  }

  // end of edit

  function petKeypress(col, row, shift) {
    // Press the key
    if ((col & 1) != 0)
      keyrows[row * 2 + 1] &= ~(1 << (col >> 1));
    else
      keyrows[row * 2] &= ~(1 << (col >> 1));

    // Press the left shift key if shift.
    if (shift)
      keyrows[8] = (keyrows[8] | 0x20) & 0xfe;
    else
      keyrows[8] |= 0x21;

    // Space key is a double-wide and return is double-height
    if (row == 4 && col == 5)
      keyrows[8] &= 0xf7;
    else if (row == 4 && col == 6)
      keyrows[9] &= 0xfb;
    else if (row == 2 && col == 10)
      keyrows[6] &= 0xdf;
    else if (row == 3 && col == 10)
      keyrows[4] &= 0xdf;

    pet2001.setKeyrows(keyrows);
  }

  function petKeyrelease(col, row, shift) {
    // Release the key
    if ((col & 1) != 0)
      keyrows[row * 2 + 1] |= 1 << (col >> 1);
    else
      keyrows[row * 2] |= 1 << (col >> 1);

    // Release the both shift keys if shift.
    if (shift)
      keyrows[8] |= 0x21;

    // Space key is a double-wide and return is double-height.
    if (row == 4 && col == 5)
      keyrows[8] |= 0x08;
    else if (row == 4 && col == 6)
      keyrows[9] |= 0x04;
    else if (row == 2 && col == 10)
      keyrows[6] |= 0x20;
    else if (row == 3 && col == 10)
      keyrows[4] |= 0x20;

    pet2001.setKeyrows(keyrows);
  }

  // Call this to clear all keys
  //
  function petkeyReleaseAll() {
    for (var i = 0; i < 10; i++)
      keyrows[i] = 0xff;

    pet2001.setKeyrows(keyrows);
    releaseKeyMask(); // NL 2017
  }
  //////////////////////////// Mouse Events /////////////////////////////////

  // onMouseDown event handler.
  //
  function petkeyOnMouseDown(img, event) {
    var x, y;

    if (event.pageX || event.pageY) {
      x = event.pageX;
      y = event.pageY;
    }
    else {
      x = event.clientX + document.body.scrollLeft +
        document.documentElement.scrollLeft;
      y = event.clientY + document.body.scrollTop +
        document.documentElement.scrollTop;
    }
    x -= img.offsetLeft;
    y -= img.offsetTop;

    if (((x >= 13 && x < 547) || (x >= 594 && x < 788)) &&
      (y >= 13 && y < 257)) {
      var col = Math.floor((x - 13) / 48.5);
      var row = Math.floor((y - 13) / 48.5);
      setKeyMask(row, col); // NL 2017
      petKeypress(col, row, event.shiftKey || isShift);
      isKeyDown=true;
    }
  }

  function petkeyOnMouseUp(img, event) {
    petkeyReleaseAll();
    isKeyDown=false;
  }

  ////////////////////////////// Touch events ///////////////////////////////
  // mod. NL, 2017
  var kbdTouches = {};
  keyboardElement.addEventListener('touchstart', function (event) {
    if (noRepeat) { // immediate multitouch
      if (event.changedTouches) {
        for (var i=0; i<event.changedTouches.length; i++) {
          var touch = event.changedTouches[i], id = touch.identifier;
          if (!kbdTouches[id]) {
            var x = touch.pageX - keyboardElement.offsetLeft;
            var y = touch.pageY - keyboardElement.offsetTop;
            if (((x >= 13 && x < 547) || (x >= 594 && x < 788)) &&
              (y >= 13 && y < 257)) {
              var col = Math.floor((x - 13) / 48.5);
              var row = Math.floor((y - 13) / 48.5);
              var isShiftKey=(row == 4 && (col == 0 || col == 10));
              kbdTouches[id] = {row: row, col: col, shift: isShiftKey};
              setKeyMask(row, col, true);
              petKeypress(col, row, isShift || isShiftKey);
            }
          }
        }
      }
    }
    else { // keyboard-like interaction
      var touch = event.touches[0];
      var x = touch.pageX - keyboardElement.offsetLeft;
      var y = touch.pageY - keyboardElement.offsetTop;
      // console.log("onTouchStart() called! x=%d y=%d", x, y);

      if (((x >= 13 && x < 547) || (x >= 594 && x < 788)) &&
        (y >= 13 && y < 257)) {
        var col = Math.floor((x - 13) / 48.5);
        var row = Math.floor((y - 13) / 48.5);
        setKeyMask(row, col);
        petKeypress(col, row, isShift);
        petKeypress(col, row, isShift);
      }
    }
    event.preventDefault();
  }, false);

  keyboardElement.addEventListener('touchend', function (event) {
    if (noRepeat && event.changedTouches) { // immediate multitouch
      for (var i=0; i<event.changedTouches.length; i++) {
        var id=event.changedTouches[i].identifier, t = kbdTouches[id];
        if (t) {
          petKeyrelease(t.col, t.row, isShift || t.shift);
          if (t.shift) {
            releaseShiftKey();
          }
          else {
            releaseKeyMask(true);
          }
          delete kbdTouches[id];
        }
      }
    }
    else {
      petkeyOnMouseUp();
    }
    event.preventDefault();
  }, false);

  ///////////////////////////// Keyboard events ////////////////////////////
  // mod NL 2017 for esc (ASCII 27) = stop key
  var ascii_to_pet_row = [
      -1,-1,-1,-1,-1,-1,-1,-1,     0,-1,-1,-1,-1, 3,-1,-1,    //   0 - 15
      -1,-1,-1,-1,-1,-1,-1,-1,    -1,-1,-1, 4,-1,-1,-1,-1,    //  16 - 31
       4, 0, 0, 0, 0, 0, 0, 0,     0, 0, 2, 3, 3, 4, 4, 1,    //  31 - 47
       4, 3, 3, 3, 2, 2, 2, 1,     1, 1, 2, 3, 4, 4, 4, 3,    //  48 - 63
       4,-1,-1,-1,-1,-1,-1,-1,    -1,-1,-1,-1,-1,-1,-1,-1,    //  64 - 79
      -1,-1,-1,-1,-1,-1,-1,-1,    -1,-1,-1, 4, 0, 4, 1, 0,    //  80 - 95
      -1, 2, 3, 3, 2, 1, 2, 2,     2, 1, 2, 2, 2, 3, 3, 1,    //  96 - 111
       1, 1, 1, 2, 1, 1, 3, 1,     3, 1, 3, -1,-1,-1,-1,-1    // 112 - 127
  ];

  var ascii_to_pet_col = [
      -1,-1,-1,-1,-1,-1,-1,-1,    15,-1,-1,-1,-1,10,-1,-1,    //   0 - 15
      -1,-1,-1,-1,-1,-1,-1,-1,    -1,-1,-1, 9,-1,-1,-1,-1,    //  16 - 31
       6, 0, 1, 2, 3, 4, 6, 5,     8, 9,15,15, 7,14,13,15,    //  31 - 47
      12,12,13,14,12,13,14,12,    13,14, 9, 8, 7,15, 8, 9,    //  48 - 63
       2,-1,-1,-1,-1,-1,-1,-1,    -1,-1,-1,-1,-1,-1,-1,-1,    //  64 - 79
      -1,-1,-1,-1,-1,-1,-1,-1,    -1,-1,-1, 3, 7, 4,10,10,    //  80 - 95
      -1, 0, 4, 2, 2, 2, 3, 4,     5, 7, 6, 7, 8, 6, 5, 8,    //  96 - 111
       9, 0, 3, 1, 4, 6, 3, 1,     1, 5, 0, -1,-1,-1,-1,-1     // 112 - 127
  ];

  var petkeyKeypressTimeoutHandle = null,
    petkeyKeypressTimeoutDelay = 40,
    petkeyKeyQueue = [],
    autoTypeDelay = 66,
    autoTypeTimer;

  function petkeyKeypressTimeout() {
    petkeyReleaseAll();

    // Are there queued keypresses?	 Press and set another timeout.
    if (petkeyKeyQueue.length > 0) {
      var codes = petkeyKeyQueue.shift();
      if (codes)
        petKeypress(codes[0], codes[1], codes[2]);

      petkeyKeypressTimeoutHandle =
        setTimeout(petkeyKeypressTimeout, petkeyKeypressTimeoutDelay);
    }
    else
      petkeyKeypressTimeoutHandle = null;
  }

  // onKeyPress event handler. (mod NL)
  //
  function petkeyOnKeyPress(event) {

    if (petkeysDisabled || event.metaKey || event.ctrlKey)
      return true;

    var code = event.charCode != 0 ? event.charCode : event.keyCode, shift = false;

    if (event.location === 3 || event.keyLocation === 3) { // numeric key pad
      if (code === 44) code = 46; // comma to decimal dot 
      else if (code === 13) code = 61; // enter to =
      shift = event.shiftKey;
    }
    else if (code === 27) {  // esc mapped to run/stop
      if (ignoreEsc) return true;
      shift = event.shiftKey;
    }
    else if (event.shiftKey && code >= 0x41 && code <= 0x5a) {    // 65 - 90
      // transform A-Z to SHIFT a-z
      code += 0x20;
      shift = true;
    }

    if (code === 0x03C0) {
      // pi
      petKeyAction(10, 1, true);
    }
    else if (code > 0 && code < 128 && ascii_to_pet_row[code] >= 0) {
      petKeyAction(ascii_to_pet_col[code], ascii_to_pet_row[code], shift);
    }
    else if (code === 174) { // (R) => reverse
      petKeyAction(1, 4, false);
    }
    else if (code === 182 || code === 184) { // reverse off
      petKeyAction(1, 4, true);
    }

    event.returnValue = false;
    return false;
  }

  function petKeyAction(col, row, shift) {

    if (typeof col === 'undefined' || typeof row === 'undefined') return;
    if (noRepeat) {
      petKeypress(col, row, shift);
    }
    else if (petkeyKeypressTimeoutHandle == null) {
      // No.	Press key and set timeout.
      petKeypress(col, row, shift);

      petkeyKeypressTimeoutHandle =
        setTimeout(petkeyKeypressTimeout, petkeyKeypressTimeoutDelay);
    }
    else {
      // Yes.	 Queue a "blank" to and then the keypress.	The
      // "blank" releases the previous key and is needed when you
      // are pressing the same key again.	 Sometimes, it seems the
      // PET needs it even if you aren't pressing the the same key
      // again so I don't bother comparing with the previous key.
      //
      petkeyKeyQueue.push(0);
      petkeyKeyQueue.push([col, row, shift]);
    }
  }

  // keydown event handler (NL)
  var keyDownExceptions = {
    8: true, 9: true, 36: true, 37: true,
    38: true, 39: true, 40: true, 45: true,
    46: true, 192: true
  };

  // keydown for real chiclet event handler
  // Functions keys used instead of the weird keys on the real chiclet keyboard (only useful with special Teensy keyboard controller)
  var eventCodeChiclet = {

    'Numpad0':        {0: 12, 1: 4},
    'NumpadDecimal':  {0: 13, 1: 4},
    'NumpadSubtract': {0: 14, 1: 4},
    'Equal':          {0: 15, 1: 4},
    'Numpad1':        {0: 12, 1: 3},
    'Numpad2':        {0: 13, 1: 3},
    'Numpad3':        {0: 14, 1: 3},
    'Numpad4':        {0: 12, 1: 2},
    'Numpad5':        {0: 13, 1: 2},
    'Numpad6':        {0: 14, 1: 2},
    'Numpad7':        {0: 12, 1: 1},
    'Numpad8':        {0: 13, 1: 1},
    'Numpad9':        {0: 14, 1: 1},
    'NumpadDivide':   {0: 15, 1: 1},

    'F13':            {0:  0, 1: 0},
    'F14':            {0:  1, 1: 0},
    'F15':            {0:  2, 1: 0},
    'F16':            {0:  3, 1: 0},
    'F17':            {0:  4, 1: 0},
    'F18':            {0:  6, 1: 0},
    'F19':            {0:  8, 1: 0},
    'F20':            {0:  9, 1: 0},
    'F21':            {0:  9, 1: 2},
    'F22':            {0:  9, 1: 3},
    'F23':            {0:  2, 1: 4},
    'F24':            {0:  8, 1: 4},

    'Home':           {0: 12, 1: 0},
    'ArrowRight':     {0: 14, 1: 0},
    'ArrowDown':      {0: 13, 1: 0},
    'Minus':          {0: 10, 1: 0},
    'Quote':          {0:  5, 1: 0},
    'Backslash':      {0:  7, 1: 0},
    'Backquote':      {0:  1, 1: 4},
    'PageUp':         {0:  7, 1: 4},

    'Comma':          {0:  7, 1: 3},
    'Semicolon':      {0:  8, 1: 3},
    'BracketLeft':    {0:  3, 1: 4},
    'BracketRight':   {0:  4, 1: 4}
  }

  function petkeyOnKeyDown(event) {

    // console.log("petkeyOnKeyDown = " + event.code + ", " + event.keyCode + ", " + event.charCode);
    // console.log("petkeyOnKeyDown - event.shiftKey = " + (event.shiftKey?"True":"False"));

    if (petkeysDisabled || event.metaKey || event.ctrlKey) {
      return true;
    }

    if (realPETKeyboard) {
      if (eventCodeChiclet[event.code]) {
        petKeyAction(eventCodeChiclet[event.code][0], eventCodeChiclet[event.code][1], event.shiftKey);
        event.preventDefault();
        return true;
      }
    }

    var keyCode = event.keyCode;

    if (event.keyIdentifier === 'Shift' || event.key === 'Shift' || keyCode === 16) {
      petSetShiftKey(true, (event.location || event.keyLocation) == 2);
      if (isLeftShift && isRightShift) {
        petCtrl.showControlsDialog();
        isLeftShift=false;
        isRightShift=false;
      }
      return true;
    }

    if (noRepeat) {
      if (keyCode === lastKeyCode) {
        event.preventDefault();
        event.returnValue = false;
        return false;
      }
      else if (lastKeyCode !== 0) {
        petkeyReleaseAll();
      }
    }
    
    if (keyCode && !event.charCode) {
      if (keyDownExceptions[keyCode] || (keyCode==27 && !ignoreEsc)) {
        switch (keyCode) {
          case  8: //BACKSPACE
          case 45: //INSERT
          case 46: //DELETE
            petKeyAction(15, 0, (keyCode==45) || event.shiftKey); break;
          case  9: //TAB => up arrow / TAB + ALT => left arrow
            petKeyAction(10, event.altKey? 0:1, event.shiftKey); break;
          case 36: //HOME
            petKeyAction(12, 0, event.shiftKey); break;
          case 37: //LEFT
            petKeyAction(14, 0, true); break;
          case 38: //UP
            petKeyAction(13, 0, true); break;
          case 39: //RIGHT
            petKeyAction(14, 0, false); break;
          case 40: //DOWN
            petKeyAction(13, 0, false); break;
          case 192://CARET as dead key => left arrow
            petKeyAction(10, 1, event.shiftKey); break;
          case 27: //ESC => STOP
            petKeyAction( 9, 4, event.shiftKey); break;
        }
        event.preventDefault();
      }
    }
    lastKeyCode = keyCode;

    return true;
  }

  function petkeyOnKeyUp(event) {

    if (event.keyIdentifier === 'Shift' || event.key === 'Shift' || event.keyCode === 16) {
      petSetShiftKey(false, (event.location || event.keyLocation) == 2);
      return true;
    }
    if (noRepeat) petkeyReleaseAll();
    lastKeyCode = 0;
  }

  function petkeyOnMouseOut() {
    if (isKeyDown) petkeyOnMouseUp();
  }

  function petkeysDisable(v) {
    petkeysDisabled = Boolean(v);
  }

  function setKeyRepeat(v) {
    noRepeat = !v;
    lastKeyCode = 0;
  }
  
  function setPETKeyboard(v) {
    realPETKeyboard = v;
  }

  var typing = false;

  function autoType(toType) {
    var txt, i = 0;
    if (Object.prototype.toString.call(toType) === '[object Array]') {
      txt = toType.join('\n') + '\n';
    }
    else {
      txt = String(toType);
    }
    var max = txt.length - 1, lastChar, repeated = false;
    function type() {
      petkeyReleaseAll();
      if (i <= max) {
        var cc = txt.charCodeAt(i++);
        if (!repeated && cc === lastChar) {
          i--;
          repeated = true;
          autoTypeTimer = setTimeout(type, autoTypeDelay);
          return;
        }
        repeated = false;
        lastChar = cc;
        if (cc === 10) cc = 13;
        else if (cc === 13 && i < txt.length && txt.charCodeAt(i) === 10) i++;
        if (cc === 0x7B) { // parse '{...}'
          cc = txt.charCodeAt(i++);
          var s = '';
          while (i <= max && cc && cc != 0x7D) {
            s += String.fromCharCode(cc);
            cc = txt.charCodeAt(i++);
          }
          var t = PetUtils.markupToPetscii(s), shift = false;
          cc = 0;
          if (t >= 0) {
            if (t === 0xFF) petKeyAction(10, 1, true);
            else if (t >= 0x80) {
              t &= 0x7F;
              shift = true;
            }
            if (t < 0x20) {
              if (t === 0x0D) cc = 13;
              else if (t === 0x11) //DOWN
                petKeyAction(13, 0, shift);
              else if (t === 0x12) //RVS
                petKeyAction(1, 4, shift);
              else if (t === 0x13) //HOME
                petKeyAction(12, 0, shift);
              else if (t === 0x14) //DEL
                petKeyAction(15, 0, shift);
              else if (t === 0x1D) //RIGHT
                petKeyAction(14, 0, shift);
            }
            else if (t < 0x60) cc = t
            else if (t < 0x80) cc = t - 0x20;
          }
          if (cc) petkeyOnKeyPress({'charCode': cc, 'shiftKey': shift});
        }
        else if (cc) petkeyOnKeyPress({'charCode': cc});
        autoTypeTimer = setTimeout(type, autoTypeDelay);
      }
      else {
        typing = false;
      }
    }
    typing = true;
    type();
  }

  function busy() {
    return petkeysDisabled || typing || petkeyKeyQueue.length > 0;
  }

  return {
    'onMouseDown': petkeyOnMouseDown,
    'onMouseUp': petkeyOnMouseUp,
    'onMouseOut': petkeyOnMouseOut,
    'onKeyPress': petkeyOnKeyPress,
    'onKeyDown': petkeyOnKeyDown,
    'onKeyUp': petkeyOnKeyUp,
    'disable': petkeysDisable,
    'setKeyRepeat': setKeyRepeat,
    'reset': reset,
    'type': autoType,
    'busy': busy,
    'setPETKeyboard': setPETKeyboard
  };

};
