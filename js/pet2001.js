//
// Copyright (c) 2012,2014 Thomas Skibo.
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
// minor syntactical tweaks by Norbert Landsteiner 2017-2020.
//
// pet2001.js
//
//      Container for cpu, hw, io.

function Pet2001(context, _configObj) {
    var video = new Pet2001Video(context, _configObj);
    var hw = new Pet2001hw(video, _configObj);
    var cpu = new Cpu6502(hw);
    var romVers = 2;

	if (typeof _configObj === 'object' && _configObj.ROM_VERSION)
		romVers = _configObj.ROM_VERSION;

    this.reset = function() {
        hw.reset();
        cpu.reset();
    };

    this.cycle = function(n) {
        while (n-- > 0) {
            hw.cycle();
            cpu.cycle();
        }
    };

    this.setRamSize = function(size, noreset) {
        hw.setRamsize(size);
        if (!noreset) this.reset();
    };

    this.getRamSize = function() { return hw.getRamSize(); };

    this.setRomVers = function(vers, noreset) {
        romVers = vers;
        var romImage = (vers == 2) ? PetRoms.rom2 : PetRoms.rom1;
        hw.writeRom(hw.getRomAddr(), romImage, romImage.length);
        if (!noreset) this.reset();
    };

    this.getRomVers = function() { return romVers; };

    this.setKeyrows = function(keyrows) {
        hw.setKeyrows(keyrows);
    };

    // Load a program into IEEE input buffer.
    this.ieeeLoadData = function(addr, bytes) {
        hw.ieeeLoadData(addr, bytes);
    };

    // This method creates a string which serves as a snapshot of all
    // the PET state (CPU, memory, I/O, video).  Although not used (yet),
    // at some point it would be fun to save sessions away on a server
    // or locally (but it's too big for a cookie).
    //
    this.save = function() {
        return romVers.toString() + "|" + cpu.save() + '|' +
            hw.save() + '|' + video.save();
    };

    // Restore the PET to a snapshot created by the save() method.
    this.load = function(s) {
        var l = s.split('|');

        cpu.load(l[1]);
        hw.load(l[2]);
        video.load(l[3]);
        this.setRomVers(parseInt(l[0]));
    };

    this.blankTimeoutFunc = function() {
        video.blankTimeoutFunc();
    };

    this.setRomVers(romVers);
    this.video=video; // mod (Norbert Landsteiner, 2017)
    this.hw=hw;
    this.cpu=cpu;
}
