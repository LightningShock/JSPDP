/*
	Copyright 2011 Brandon Lockaby
	
	This file is part of JSPDP.
	https://github.com/brandon-lockaby/JSPDP

    JSPDP is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    JSPDP is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with JSPDP.  If not, see <http://www.gnu.org/licenses/>.

*/

JSPDP.Cursor = function() {
};

JSPDP.Cursor.EAction = {
	Rest: 0,
	Up: 1,
	Down: 2,
	Left: 3,
	Right: 4,
	Swap1: 5,
	Swap2: 6,
	Lift: 7,
	LENGTH: 8
};

var proto = (JSPDP.Cursor.prototype = new JSPDP.TableauUI());

proto.init = function(settings) {
	JSPDP.TableauUI.prototype.init.call(this, settings);
	
	this.position = {
		row: 0,
		col: 0
	};
	
	this.action = JSPDP.Cursor.EAction.Rest;
	this.lastAction = JSPDP.Cursor.EAction.Rest;
	this.lastActionRepeatCount = 0;
	
	// subscribe to events
	this.tableau.onActionPhase.subscribe(this.handleActionPhase.bind(this));
	if(this.tableau.onRise) {
		this.tableau.onRise.subscribe(this.handleRise.bind(this));
	}
	if(this.tableau.onRow) {
		this.tableau.onRow.subscribe(this.handleRow.bind(this));
	}
	
	// set up for rendering
	this.canvas = this.createCanvas();
	this.ctx = this.canvas.getContext('2d');
	
	return this;
};

proto.moveTo = function(row, col) {
	if(!this.tableau.bounds(row, col)) return false;
	this.position.row = row;
	this.position.col = col;
	this.moved = true;
	this.action = this.lastAction = this.lastActionRepeatCount = 0;
	return true;
};

proto.startAction = function(action) {
	this.action = action;
};

proto.stopAction = function(action) {
	if(this.action == action) {
		this.action = 0;
	}
};

// event handlers

proto.handleActionPhase = function() {
	var action = this.action;
	
	// handle repeating action

	if(this.lastAction == this.action) {
		++this.lastActionRepeatCount;
		if(action != JSPDP.Cursor.EAction.Lift && this.lastActionRepeatCount < 16) {
			action = 0;
		}
		else if(action == JSPDP.Cursor.EAction.Swap1 || action == JSPDP.Cursor.EAction.Swap2) {
			action = 0;
		}
	} else {
		this.lastAction = this.action;
		this.lastActionRepeatCount = 0;
	}
	
	// perform action
	
	if(!action) return;

	var old_pos = {
		row: this.position.row,
		col: this.position.col
	};
	
	var ea = JSPDP.Cursor.EAction;
	switch(action) {
		case ea.Up:
			this.position.row++;
			break;
		case ea.Down:
			this.position.row--;
			break;
		case ea.Left:
			this.position.col--;
			break;
		case ea.Right:
			this.position.col++;
			break;
		case ea.Swap1:
		case ea.Swap2:
			this.tableau.swap(this.position.row, this.position.col, true);
			break;
		case ea.Lift:
			if(this.tableau instanceof JSPDP.RisingTableau) {
				this.tableau.lift();
			}
			break;
	}
	
	// constrain position
	
	var top_row = this.tableau.dimensions.height - 1 - Math.ceil(this.tableau.riseOffset);
	
	if(this.position.row < 0)
		this.position.row = 0;
	else if(this.position.row > top_row) {
		this.position.row = top_row;
	}
	
	if(this.position.col < 0)
		this.position.col = 0;
	else if(this.position.col >= this.tableau.dimensions.width - 1)
		this.position.col = this.tableau.dimensions.width - 2;
		
	// flag this as having moved
	
	if(this.position.row != old_pos.row || this.position.col != old_pos.col) {
		this.moved = true;
	}
};

proto.handleRise = function() {
	var top_row = this.tableau.dimensions.height - 1 - Math.ceil(this.tableau.riseOffset);
	if(this.position.row > top_row) {
		this.position.row = top_row;
		this.moved = true;
	}
};

proto.handleRow = function() {
	this.position.row++;
	var top_row = this.tableau.dimensions.height - 1 - Math.ceil(this.tableau.riseOffset);
	if(this.position.row > top_row)
		this.position.row = top_row;
	this.moved = true;
};

// rendering

proto.moved = false;

proto.refresh = function() {
	this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
	var canvas_pos = this.canvasPos(this.position.row, this.position.col);
	this.ctx.drawImage(this.theme.cursorImage, canvas_pos.x, canvas_pos.y);
};

proto.update = function() {
	if(this.moved) {
		this.refresh(); // todo: clear a smaller area?
		this.moved = false;
		return true;
	}
	return false;
};

proto.draw = function(ctx) {
	ctx.drawImage(this.canvas, 0, this.riseOffset());
};
