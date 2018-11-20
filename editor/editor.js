(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * Created by qinning on 2017/12/2.
 */

var Grid = cc.LayerColor.extend({

    col: 0,
    row: 0,

    editing: false,
    used: false,

    ctor: function (color, width, height, col, row) {
        this._super(color, width, height);
        this.ignoreAnchor = false;
        //this.type = type;
        this.col = col;
        this.row = row;
    },

    setColor: function (color) {
        this._super(color);
    }
});

module.exports = Grid;
},{}],2:[function(require,module,exports){

var ColorConfigs = [
    cc.color(250, 147, 50),
    cc.color(90, 181, 110),
    cc.color(83, 183, 209),
    cc.color(243, 77, 151),
    cc.color(153, 95, 206),
    cc.color(57, 103, 249),
    cc.color(255, 65, 66),
    cc.color(232, 59, 20),
    cc.color(84, 235, 43),
    cc.color(50, 84, 117),
    cc.color(127, 127, 127)
];

var EditorScene = cc.Scene.extend({

    CONTENT_WIDTH: 600,
    CONTENT_HEIGHT: 600,

    COL: 50,
    ROW: 50,

    GRID_WIDTH: 9,
    GRID_HEIGHT: 9,

    GAP_WIDTH: 3,
    GAP_HEIGHT: 3,

    brickRects: null,

    obstacleRects: null,

    _isBrick: true,

    _brickItem: null,

    ctor: function () {
        this._super();

        this.brickRects = [];
        this.obstacleRects = [];

        this.currentRects = this.brickRects;
        this.selectColor = ColorConfigs[0];
        this.selectColorIndex = 0;
        this.initGrids();
        this.initButtons();
        this.initColorButtons();
    },

    initButtons: function () {
        // Bugs Item
        var brickItem = new cc.MenuItemFont("Brick", this.onBrickTypeChange, this);
        var saveItem = new cc.MenuItemFont("Save", this.onSave, this);
        var deleteItem = new cc.MenuItemFont("Delete", this.onDelete, this);
        var refreshItem = new cc.MenuItemFont("Refresh", this.onRefresh, this);
        var addItem = new cc.MenuItemFont("Add", this.onAdd, this);
        var reduceItem = new cc.MenuItemFont("Reduce", this.onReduce, this);
        var menu = new cc.Menu(brickItem, saveItem, deleteItem, refreshItem, addItem, reduceItem);

        menu.alignItemsHorizontally();
        this.addChild(menu);
        menu.setPosition(cc.p(cc.winSize.width * 0.5, cc.winSize.height - 20));
        this._brickItem = brickItem;

        this._gridLabel = new cc.LabelTTF("", "Arial", 24);
        this.addChild(this._gridLabel);

        this._gridLabel.setAnchorPoint(cc.p(0, 0.5));

        this._gridLabel.setPosition(cc.p(10, cc.winSize.height - 80));

        this._gridLabel.setString(this.COL + "x" + this.ROW);
    },

    initColorButtons: function () {
        var items = [];
        for (var i = 0; i < ColorConfigs.length; ++i) {
            var colorItem = new cc.MenuItemFont(" O ", this.onSelectColor, this);
            colorItem.setColor(ColorConfigs[i]);
            colorItem.setTag(i);
            items.push(colorItem);
        }
        var menu = new cc.Menu(items);
        menu.alignItemsHorizontally();
        menu.setPosition(cc.p(cc.winSize.width * 0.5, cc.winSize.height - 55));
        this.addChild(menu);
    },

    onSelectColor: function (sender) {
        this.selectColor = ColorConfigs[sender.getTag()];
        this.selectColorIndex = sender.getTag();
    },

    resetOldView: function () {
        for (var localCol = 0; localCol < this.COL; ++localCol) {
            for (var localRow = 0; localRow < this.ROW; ++localRow) {
                var grid = this.grids[localCol][localRow];
                grid.removeFromParent();
            }
        }
        this.grids = [];
    },

    updateView: function () {
        var width = this.CONTENT_WIDTH / this.COL;
        var height = this.CONTENT_HEIGHT / this.ROW;
        this.GRID_WIDTH = width * 0.75;
        this.GRID_HEIGHT = height * 0.75;
        this.GAP_WIDTH = width - this.GRID_WIDTH;
        this.GAP_HEIGHT = height - this.GRID_HEIGHT;

        this.initGrids();

        this.brickRects = [];
        this.obstacleRects = [];
        this.currentRects = this.brickRects;
        this._isBrick = true;
        this._brickItem.setString("Brick");

        this._gridLabel.setString(this.COL + "x" + this.ROW);
    },

    onAdd: function () {
        this.resetOldView();
        this.COL += 4;
        this.ROW += 4;
        this.updateView();
    },

    onReduce: function () {
        this.resetOldView();
        this.COL -= 4;
        this.ROW -= 4;
        this.updateView();
    },

    onSave: function () {
        var obj = {
            pixelWidth: this.CONTENT_WIDTH,
            pixelHeight: this.CONTENT_HEIGHT,
            width: this.COL,
            height: this.ROW,
            bricks: this.brickRects,
            obstacles: this.obstacleRects
        };

        cc.log("results:" + JSON.stringify(obj));

        alert(JSON.stringify(obj));
    },

    onDelete: function () {
        this.deleteLatestRect();
    },

    onRefresh: function () {
        this.reset();
    },

    onBrickTypeChange: function () {
        this._isBrick = !this._isBrick;
        if (!this._isBrick) {
            this._brickItem.setString("Obstacle");
            this.currentRects = this.obstacleRects;
        } else {
            this._brickItem.setString("Brick");
            this.currentRects = this.brickRects;
        }
    },

    initGrids: function () {
        this.grids = [];
        var Grid = require("../entity/Grid");
        for (var localCol = 0; localCol < this.COL; ++localCol) {
            this.grids.push([]);
            for (var localRow = 0; localRow < this.ROW; ++localRow) {
                var grid = new Grid(cc.color.GRAY, this.GRID_WIDTH, this.GRID_HEIGHT, localCol, localRow);
                this.addChild(grid);
                grid.setPosition(this.getGridPos(localCol, localRow));
                this.grids[localCol].push(grid);

                if (localCol === Math.floor(this.COL / 2) ||
                    localCol === Math.floor(this.COL / 2) - 1 ||
                    localRow === Math.floor(this.ROW / 2) ||
                    localRow === Math.floor(this.ROW / 2) - 1
                ) {
                    grid.setColor(cc.color(90, 90, 90));
                }
            }
        }
    },

    reset: function () {
        for (var localCol = 0; localCol < this.COL; ++localCol) {
            for (var localRow = 0; localRow < this.ROW; ++localRow) {
                this.grids[localCol][localRow].editing = false;
                this.grids[localCol][localRow].setColor(cc.color.GRAY);
                this.grids[localCol][localRow].used = false;

                if (localCol === Math.floor(this.COL / 2) ||
                    localCol === Math.floor(this.COL / 2) - 1 ||
                    localRow === Math.floor(this.ROW / 2) ||
                    localRow === Math.floor(this.ROW / 2) - 1
                ) {
                    this.grids[localCol][localRow].setColor(cc.color(90, 90, 90));
                }
            }
        }
        this.brickRects = [];
        this.obstacleRects = [];
        this.currentRects = this.brickRects;
        this._isBrick = true;
        this._brickItem.setString("Brick");
    },

    onEnter:function () {
        this._super();
        cc.eventManager.addListener({
            event: cc.EventListener.TOUCH_ONE_BY_ONE,
            swallowTouches: true,
            onTouchBegan: this.onTouchBegan.bind(this),
            onTouchMoved: this.onTouchMoved.bind(this),
            onTouchEnded: this.onTouchEnded.bind(this),
            onTouchCancelled: this.onTouchCancelled.bind(this)
        }, this);

        //cc.eventManager.addListener({
        //    event: cc.EventListener.KEYBOARD,
        //    onKeyReleased: function (keyCode, event) {
        //        if (keyCode === cc.KEY.backspace) {
        //            //cc.director.end();
        //            this.deleteLatestRect();
        //        }
        //    }.bind(this)
        //}, this);
    },

    onExit: function () {
        this._super();
    },

    getGridPos: function (localCol, localRow) {
        var gridSize = this.getGridSize();
        return cc.p((gridSize.width + this.GAP_WIDTH) * (localCol + 0.5),
            (gridSize.height + this.GAP_HEIGHT) * (localRow + 0.5));
    },

    getGridSize: function () {
        return cc.size(this.GRID_WIDTH, this.GRID_HEIGHT);
    },

    getFullGridSize: function () {
        return cc.size(this.GRID_WIDTH + this.GAP_WIDTH, this.GRID_HEIGHT + this.GAP_HEIGHT);
    },

    onTouchBegan:function(touch, event) {
        var grid = this.getClosestGrid(touch);
        if (grid.used) {
            return false;
        }
        this.firstGrid = grid;
        grid.setColor(this.getCurrentColor());
        return true;
    },

    onTouchMoved:function(touch, event) {
        this.touchDraw(touch);
        return true;
    },

    onTouchEnded:function(touch, event) {
        this.touchDraw(touch);

        if (this.firstGrid && this.lastGrid) {
            var region = this.getRegion(this.firstGrid, this.lastGrid);
            var index = this.selectColorIndex + 1;
            if (!this._isBrick) {
                index = 0;
            }
            this.currentRects.push([region.minCol, region.minRow,
                region.maxCol - region.minCol + 1, region.maxRow - region.minRow + 1, index]);

            this.markOccupied();
            for (var localCol = 0; localCol < this.COL; ++localCol) {
                for (var localRow = 0; localRow < this.ROW; ++localRow) {
                    this.grids[localCol][localRow].editing = false;
                }
            }
        }

        this.firstGrid = null;
        this.lastGrid = null;
    },

    markOccupied: function () {
        var region = this.getRegion(this.firstGrid, this.lastGrid);

        for (var localCol = region.minCol; localCol <= region.maxCol; ++localCol) {
            for (var localRow = region.minRow; localRow <= region.maxRow; ++localRow) {
                this.grids[localCol][localRow].used = true;
            }
        }
    },

    isOccupied: function (grid) {
        var region = this.getRegion(this.firstGrid, grid);
        for (var localCol = region.minCol; localCol <= region.maxCol; ++localCol) {
            for (var localRow = region.minRow; localRow <= region.maxRow; ++localRow) {
                if (this.grids[localCol][localRow].used) {
                    return true;
                }
            }
        }
        return false;
    },

    touchDraw: function (touch) {
        if (!this.firstGrid) {
            return false;
        }
        var grid = this.getClosestGrid(touch);

        if (!grid) {
            return false;
        }

        if (grid === this.lastGrid) {
            return false;
        }

        if (this.isOccupied(grid)) {
            return false;
        }
        this.lastGrid = grid;
        this.clearRect();
        this.drawRect(grid);
        return true;
    },

    deleteLatestRect: function () {
        var rect = this.currentRects.pop();
        if (rect) {
            for (var localCol = rect[0]; localCol < rect[0] + rect[2]; ++localCol) {
                for (var localRow = rect[1]; localRow < rect[1] + rect[3]; ++localRow) {
                    var grid = this.grids[localCol][localRow];
                    grid.setColor(cc.color.GRAY);
                    grid.used = false;
                }
            }
        }
    },

    clearRect: function () {
        for (var localCol = 0; localCol < this.COL; ++localCol) {
            for (var localRow = 0; localRow < this.ROW; ++localRow) {
                var grid = this.grids[localCol][localRow];
                if (grid.editing && !grid.used) {
                    grid.setColor(cc.color.GRAY);
                    grid.editing = false;
                }
            }
        }
    },

    drawRect: function (grid) {
        var region = this.getRegion(this.firstGrid, grid);

        for (var localCol = region.minCol; localCol <= region.maxCol; ++localCol) {
            for (var localRow = region.minRow; localRow <= region.maxRow; ++localRow) {
                this.grids[localCol][localRow].editing = true;
                this.grids[localCol][localRow].setColor(this.getCurrentColor());
            }
        }
    },

    getRegion: function (grid1, grid2) {
        var minRow = Math.min(grid1.row, grid2.row);
        var maxRow = Math.max(grid1.row, grid2.row);
        var minCol = Math.min(grid1.col, grid2.col);
        var maxCol = Math.max(grid1.col, grid2.col);
        return {
            minRow: minRow,
            maxRow: maxRow,
            minCol: minCol,
            maxCol: maxCol
        };
    },

    onTouchCancelled:function(touch, event) {
    },

    getClosestGrid: function (touch) {
        var localPos = this.convertToNodeSpace(touch.getLocation());
        var gridSize = this.getFullGridSize();

        cc.log("localPos:" + JSON.stringify(localPos));

        var row = Math.floor(localPos.x / gridSize.width);
        var col = Math.floor(localPos.y / gridSize.height);

        cc.log("row:" + row + ",col:" + col);

        return this.grids[row][col];
    },

    getCurrentColor: function () {
        if (this._isBrick) {
            return this.selectColor;
        } else {
            return cc.color.WHITE;
        }
    }
    //
    //drawRect: function(region, color, clear) {
    //    if (clear){
    //        this._drawNode.clear();
    //    }
    //    if (region == null) {
    //        return;
    //    }
    //    var min = region.getMin();
    //    var max = region.getMax();
    //    max.x += 1;
    //    max.y += 1;
    //    this._drawNode.drawSegment(cc.p(min.x, min.y),
    //        cc.p(min.x, max.y), 1, color);
    //    this._drawNode.drawSegment(cc.p(min.x, max.y),
    //        cc.p(max.x, max.y), 1, color);
    //    this._drawNode.drawSegment(cc.p(max.x, max.y),
    //        cc.p(max.x, min.y), 1, color);
    //    this._drawNode.drawSegment(cc.p(max.x, min.y),
    //        cc.p(min.x, min.y), 1, color);
    //},
    //
    //drawRectFill: function (region, color) {
    //    if (region == null) {
    //        return;
    //    }
    //    this._drawNode.drawRect(region.getMin(), region.getMax(), color, 1, color);
    //}
});

module.exports = EditorScene;
},{"../entity/Grid":1}],3:[function(require,module,exports){
/**
 * A brief explanation for "project.json":
 * Here is the content of project.json file, this is the global configuration for your game, you can modify it to customize some behavior.
 * The detail of each field is under it.
 {
    "project_type": "javascript",
    // "project_type" indicate the program language of your project, you can ignore this field

    "debugMode"     : 1,
    // "debugMode" possible values :
    //      0 - No message will be printed.
    //      1 - cc.error, cc.assert, cc.warn, cc.log will print in console.
    //      2 - cc.error, cc.assert, cc.warn will print in console.
    //      3 - cc.error, cc.assert will print in console.
    //      4 - cc.error, cc.assert, cc.warn, cc.log will print on canvas, available only on web.
    //      5 - cc.error, cc.assert, cc.warn will print on canvas, available only on web.
    //      6 - cc.error, cc.assert will print on canvas, available only on web.

    "showFPS"       : true,
    // Left bottom corner fps information will show when "showFPS" equals true, otherwise it will be hide.

    "frameRate"     : 60,
    // "frameRate" set the wanted frame rate for your game, but the real fps depends on your game implementation and the running environment.

    "id"            : "gameCanvas",
    // "gameCanvas" sets the id of your canvas element on the web page, it's useful only on web.

    "renderMode"    : 0,
    // "renderMode" sets the renderer type, only useful on web :
    //      0 - Automatically chosen by engine
    //      1 - Forced to use canvas renderer
    //      2 - Forced to use WebGL renderer, but this will be ignored on mobile browsers

    "engineDir"     : "frameworks/cocos2d-html5/",
    // In debug mode, if you use the whole engine to develop your game, you should specify its relative path with "engineDir",
    // but if you are using a single engine file, you can ignore it.

    "modules"       : ["cocos2d"],
    // "modules" defines which modules you will need in your game, it's useful only on web,
    // using this can greatly reduce your game's resource size, and the cocos console tool can package your game with only the modules you set.
    // For details about modules definitions, you can refer to "../../frameworks/cocos2d-html5/modulesConfig.json".

    "jsList"        : [
    ]
    // "jsList" sets the list of js files in your game.
 }
 *
 */

cc.game.onStart = function() {
    if (!cc.sys.isNative && document.getElementById("cocosLoading"))
        document.body.removeChild(document.getElementById("cocosLoading"));

    cc.view.enableRetina(false);
    cc.view.adjustViewPort(true);

    /*
    var LogicMan = require("./common/model/LogicMan");
    LogicMan.getInstance().init();

    var Utils = require("./common/util/Utils");
    if (cc.sys.isNative) {
        var width = 0;
        var height = 0;
        if (!!GameBridge.getConfig().horizontalGame) {
            height = 640;
            if (Utils.isPad()) {
                height = 768;
            }
            width = height * cc.winSize.width / cc.winSize.height;
            cc.log("cc.winSize.width:" + cc.winSize.width);
            cc.log("cc.winSize.height:" + cc.winSize.height);

        } else {
            height = 1136;
            if (Utils.isPad()) {
                height = 1024;
            }
            width = height * cc.winSize.width / cc.winSize.height;
        }
        cc.log("width:" + width);
        cc.log("height:" + height);
        cc.view.setDesignResolutionSize(width, height, cc.ResolutionPolicy.SHOW_ALL);
    } else {
        if (!!GameBridge.getConfig().horizontalGame) {
            cc.view.setDesignResolutionSize(960, 640, cc.ResolutionPolicy.SHOW_ALL);
        } else {
            cc.view.setDesignResolutionSize(640, 960, cc.ResolutionPolicy.SHOW_ALL);
        }
    }

    // The game will be resized when browser size change
    cc.BuilderReader.setResourcePath("res/");
    cc.view.resizeWithBrowserSize(true);

    game.dialogManager.createOverlay();

    if (cc.sys.isNative) {
        game.local.reload();
        cc.director.runScene(new GameBridge.getMenuScene());
    } else {
        cc.loader.loadJson("res/resource_list/resource_list.json", function (error, result) {
            if (!error) {
                cc.LoaderScene.preload(result, function () {
                    game.local.reload();
                    cc.director.runScene(GameBridge.getMenuScene());
                }, this);
            }
        });
    }
    */
    cc.view.resizeWithBrowserSize(true);
    cc.view.setDesignResolutionSize(600, 700, cc.ResolutionPolicy.SHOW_ALL);
    cc.LoaderScene.preload([], function () {
        var EditorScene = require("./editor/scene/EditorScene");
        cc.director.runScene(new EditorScene());
    });
};
cc.game.run();

},{"./editor/scene/EditorScene":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImVkaXRvci9lbnRpdHkvR3JpZC5qcyIsImVkaXRvci9zY2VuZS9FZGl0b3JTY2VuZS5qcyIsImVkaXRvckxvYWRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzViQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiLyoqXG4gKiBDcmVhdGVkIGJ5IHFpbm5pbmcgb24gMjAxNy8xMi8yLlxuICovXG5cbnZhciBHcmlkID0gY2MuTGF5ZXJDb2xvci5leHRlbmQoe1xuXG4gICAgY29sOiAwLFxuICAgIHJvdzogMCxcblxuICAgIGVkaXRpbmc6IGZhbHNlLFxuICAgIHVzZWQ6IGZhbHNlLFxuXG4gICAgY3RvcjogZnVuY3Rpb24gKGNvbG9yLCB3aWR0aCwgaGVpZ2h0LCBjb2wsIHJvdykge1xuICAgICAgICB0aGlzLl9zdXBlcihjb2xvciwgd2lkdGgsIGhlaWdodCk7XG4gICAgICAgIHRoaXMuaWdub3JlQW5jaG9yID0gZmFsc2U7XG4gICAgICAgIC8vdGhpcy50eXBlID0gdHlwZTtcbiAgICAgICAgdGhpcy5jb2wgPSBjb2w7XG4gICAgICAgIHRoaXMucm93ID0gcm93O1xuICAgIH0sXG5cbiAgICBzZXRDb2xvcjogZnVuY3Rpb24gKGNvbG9yKSB7XG4gICAgICAgIHRoaXMuX3N1cGVyKGNvbG9yKTtcbiAgICB9XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBHcmlkOyIsIlxudmFyIENvbG9yQ29uZmlncyA9IFtcbiAgICBjYy5jb2xvcigyNTAsIDE0NywgNTApLFxuICAgIGNjLmNvbG9yKDkwLCAxODEsIDExMCksXG4gICAgY2MuY29sb3IoODMsIDE4MywgMjA5KSxcbiAgICBjYy5jb2xvcigyNDMsIDc3LCAxNTEpLFxuICAgIGNjLmNvbG9yKDE1MywgOTUsIDIwNiksXG4gICAgY2MuY29sb3IoNTcsIDEwMywgMjQ5KSxcbiAgICBjYy5jb2xvcigyNTUsIDY1LCA2NiksXG4gICAgY2MuY29sb3IoMjMyLCA1OSwgMjApLFxuICAgIGNjLmNvbG9yKDg0LCAyMzUsIDQzKSxcbiAgICBjYy5jb2xvcig1MCwgODQsIDExNyksXG4gICAgY2MuY29sb3IoMTI3LCAxMjcsIDEyNylcbl07XG5cbnZhciBFZGl0b3JTY2VuZSA9IGNjLlNjZW5lLmV4dGVuZCh7XG5cbiAgICBDT05URU5UX1dJRFRIOiA2MDAsXG4gICAgQ09OVEVOVF9IRUlHSFQ6IDYwMCxcblxuICAgIENPTDogNTAsXG4gICAgUk9XOiA1MCxcblxuICAgIEdSSURfV0lEVEg6IDksXG4gICAgR1JJRF9IRUlHSFQ6IDksXG5cbiAgICBHQVBfV0lEVEg6IDMsXG4gICAgR0FQX0hFSUdIVDogMyxcblxuICAgIGJyaWNrUmVjdHM6IG51bGwsXG5cbiAgICBvYnN0YWNsZVJlY3RzOiBudWxsLFxuXG4gICAgX2lzQnJpY2s6IHRydWUsXG5cbiAgICBfYnJpY2tJdGVtOiBudWxsLFxuXG4gICAgY3RvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zdXBlcigpO1xuXG4gICAgICAgIHRoaXMuYnJpY2tSZWN0cyA9IFtdO1xuICAgICAgICB0aGlzLm9ic3RhY2xlUmVjdHMgPSBbXTtcblxuICAgICAgICB0aGlzLmN1cnJlbnRSZWN0cyA9IHRoaXMuYnJpY2tSZWN0cztcbiAgICAgICAgdGhpcy5zZWxlY3RDb2xvciA9IENvbG9yQ29uZmlnc1swXTtcbiAgICAgICAgdGhpcy5zZWxlY3RDb2xvckluZGV4ID0gMDtcbiAgICAgICAgdGhpcy5pbml0R3JpZHMoKTtcbiAgICAgICAgdGhpcy5pbml0QnV0dG9ucygpO1xuICAgICAgICB0aGlzLmluaXRDb2xvckJ1dHRvbnMoKTtcbiAgICB9LFxuXG4gICAgaW5pdEJ1dHRvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQnVncyBJdGVtXG4gICAgICAgIHZhciBicmlja0l0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiQnJpY2tcIiwgdGhpcy5vbkJyaWNrVHlwZUNoYW5nZSwgdGhpcyk7XG4gICAgICAgIHZhciBzYXZlSXRlbSA9IG5ldyBjYy5NZW51SXRlbUZvbnQoXCJTYXZlXCIsIHRoaXMub25TYXZlLCB0aGlzKTtcbiAgICAgICAgdmFyIGRlbGV0ZUl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiRGVsZXRlXCIsIHRoaXMub25EZWxldGUsIHRoaXMpO1xuICAgICAgICB2YXIgcmVmcmVzaEl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiUmVmcmVzaFwiLCB0aGlzLm9uUmVmcmVzaCwgdGhpcyk7XG4gICAgICAgIHZhciBhZGRJdGVtID0gbmV3IGNjLk1lbnVJdGVtRm9udChcIkFkZFwiLCB0aGlzLm9uQWRkLCB0aGlzKTtcbiAgICAgICAgdmFyIHJlZHVjZUl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiUmVkdWNlXCIsIHRoaXMub25SZWR1Y2UsIHRoaXMpO1xuICAgICAgICB2YXIgbWVudSA9IG5ldyBjYy5NZW51KGJyaWNrSXRlbSwgc2F2ZUl0ZW0sIGRlbGV0ZUl0ZW0sIHJlZnJlc2hJdGVtLCBhZGRJdGVtLCByZWR1Y2VJdGVtKTtcblxuICAgICAgICBtZW51LmFsaWduSXRlbXNIb3Jpem9udGFsbHkoKTtcbiAgICAgICAgdGhpcy5hZGRDaGlsZChtZW51KTtcbiAgICAgICAgbWVudS5zZXRQb3NpdGlvbihjYy5wKGNjLndpblNpemUud2lkdGggKiAwLjUsIGNjLndpblNpemUuaGVpZ2h0IC0gMjApKTtcbiAgICAgICAgdGhpcy5fYnJpY2tJdGVtID0gYnJpY2tJdGVtO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbCA9IG5ldyBjYy5MYWJlbFRURihcIlwiLCBcIkFyaWFsXCIsIDI0KTtcbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLl9ncmlkTGFiZWwpO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbC5zZXRBbmNob3JQb2ludChjYy5wKDAsIDAuNSkpO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbC5zZXRQb3NpdGlvbihjYy5wKDEwLCBjYy53aW5TaXplLmhlaWdodCAtIDgwKSk7XG5cbiAgICAgICAgdGhpcy5fZ3JpZExhYmVsLnNldFN0cmluZyh0aGlzLkNPTCArIFwieFwiICsgdGhpcy5ST1cpO1xuICAgIH0sXG5cbiAgICBpbml0Q29sb3JCdXR0b25zOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBpdGVtcyA9IFtdO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IENvbG9yQ29uZmlncy5sZW5ndGg7ICsraSkge1xuICAgICAgICAgICAgdmFyIGNvbG9ySXRlbSA9IG5ldyBjYy5NZW51SXRlbUZvbnQoXCIgTyBcIiwgdGhpcy5vblNlbGVjdENvbG9yLCB0aGlzKTtcbiAgICAgICAgICAgIGNvbG9ySXRlbS5zZXRDb2xvcihDb2xvckNvbmZpZ3NbaV0pO1xuICAgICAgICAgICAgY29sb3JJdGVtLnNldFRhZyhpKTtcbiAgICAgICAgICAgIGl0ZW1zLnB1c2goY29sb3JJdGVtKTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgbWVudSA9IG5ldyBjYy5NZW51KGl0ZW1zKTtcbiAgICAgICAgbWVudS5hbGlnbkl0ZW1zSG9yaXpvbnRhbGx5KCk7XG4gICAgICAgIG1lbnUuc2V0UG9zaXRpb24oY2MucChjYy53aW5TaXplLndpZHRoICogMC41LCBjYy53aW5TaXplLmhlaWdodCAtIDU1KSk7XG4gICAgICAgIHRoaXMuYWRkQ2hpbGQobWVudSk7XG4gICAgfSxcblxuICAgIG9uU2VsZWN0Q29sb3I6IGZ1bmN0aW9uIChzZW5kZXIpIHtcbiAgICAgICAgdGhpcy5zZWxlY3RDb2xvciA9IENvbG9yQ29uZmlnc1tzZW5kZXIuZ2V0VGFnKCldO1xuICAgICAgICB0aGlzLnNlbGVjdENvbG9ySW5kZXggPSBzZW5kZXIuZ2V0VGFnKCk7XG4gICAgfSxcblxuICAgIHJlc2V0T2xkVmlldzogZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IDA7IGxvY2FsQ29sIDwgdGhpcy5DT0w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gMDsgbG9jYWxSb3cgPCB0aGlzLlJPVzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgIHZhciBncmlkID0gdGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddO1xuICAgICAgICAgICAgICAgIGdyaWQucmVtb3ZlRnJvbVBhcmVudCgpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuZ3JpZHMgPSBbXTtcbiAgICB9LFxuXG4gICAgdXBkYXRlVmlldzogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgd2lkdGggPSB0aGlzLkNPTlRFTlRfV0lEVEggLyB0aGlzLkNPTDtcbiAgICAgICAgdmFyIGhlaWdodCA9IHRoaXMuQ09OVEVOVF9IRUlHSFQgLyB0aGlzLlJPVztcbiAgICAgICAgdGhpcy5HUklEX1dJRFRIID0gd2lkdGggKiAwLjc1O1xuICAgICAgICB0aGlzLkdSSURfSEVJR0hUID0gaGVpZ2h0ICogMC43NTtcbiAgICAgICAgdGhpcy5HQVBfV0lEVEggPSB3aWR0aCAtIHRoaXMuR1JJRF9XSURUSDtcbiAgICAgICAgdGhpcy5HQVBfSEVJR0hUID0gaGVpZ2h0IC0gdGhpcy5HUklEX0hFSUdIVDtcblxuICAgICAgICB0aGlzLmluaXRHcmlkcygpO1xuXG4gICAgICAgIHRoaXMuYnJpY2tSZWN0cyA9IFtdO1xuICAgICAgICB0aGlzLm9ic3RhY2xlUmVjdHMgPSBbXTtcbiAgICAgICAgdGhpcy5jdXJyZW50UmVjdHMgPSB0aGlzLmJyaWNrUmVjdHM7XG4gICAgICAgIHRoaXMuX2lzQnJpY2sgPSB0cnVlO1xuICAgICAgICB0aGlzLl9icmlja0l0ZW0uc2V0U3RyaW5nKFwiQnJpY2tcIik7XG5cbiAgICAgICAgdGhpcy5fZ3JpZExhYmVsLnNldFN0cmluZyh0aGlzLkNPTCArIFwieFwiICsgdGhpcy5ST1cpO1xuICAgIH0sXG5cbiAgICBvbkFkZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlc2V0T2xkVmlldygpO1xuICAgICAgICB0aGlzLkNPTCArPSA0O1xuICAgICAgICB0aGlzLlJPVyArPSA0O1xuICAgICAgICB0aGlzLnVwZGF0ZVZpZXcoKTtcbiAgICB9LFxuXG4gICAgb25SZWR1Y2U6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5yZXNldE9sZFZpZXcoKTtcbiAgICAgICAgdGhpcy5DT0wgLT0gNDtcbiAgICAgICAgdGhpcy5ST1cgLT0gNDtcbiAgICAgICAgdGhpcy51cGRhdGVWaWV3KCk7XG4gICAgfSxcblxuICAgIG9uU2F2ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgb2JqID0ge1xuICAgICAgICAgICAgcGl4ZWxXaWR0aDogdGhpcy5DT05URU5UX1dJRFRILFxuICAgICAgICAgICAgcGl4ZWxIZWlnaHQ6IHRoaXMuQ09OVEVOVF9IRUlHSFQsXG4gICAgICAgICAgICB3aWR0aDogdGhpcy5DT0wsXG4gICAgICAgICAgICBoZWlnaHQ6IHRoaXMuUk9XLFxuICAgICAgICAgICAgYnJpY2tzOiB0aGlzLmJyaWNrUmVjdHMsXG4gICAgICAgICAgICBvYnN0YWNsZXM6IHRoaXMub2JzdGFjbGVSZWN0c1xuICAgICAgICB9O1xuXG4gICAgICAgIGNjLmxvZyhcInJlc3VsdHM6XCIgKyBKU09OLnN0cmluZ2lmeShvYmopKTtcblxuICAgICAgICBhbGVydChKU09OLnN0cmluZ2lmeShvYmopKTtcbiAgICB9LFxuXG4gICAgb25EZWxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5kZWxldGVMYXRlc3RSZWN0KCk7XG4gICAgfSxcblxuICAgIG9uUmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfSxcblxuICAgIG9uQnJpY2tUeXBlQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lzQnJpY2sgPSAhdGhpcy5faXNCcmljaztcbiAgICAgICAgaWYgKCF0aGlzLl9pc0JyaWNrKSB7XG4gICAgICAgICAgICB0aGlzLl9icmlja0l0ZW0uc2V0U3RyaW5nKFwiT2JzdGFjbGVcIik7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRSZWN0cyA9IHRoaXMub2JzdGFjbGVSZWN0cztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2JyaWNrSXRlbS5zZXRTdHJpbmcoXCJCcmlja1wiKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFJlY3RzID0gdGhpcy5icmlja1JlY3RzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluaXRHcmlkczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmdyaWRzID0gW107XG4gICAgICAgIHZhciBHcmlkID0gcmVxdWlyZShcIi4uL2VudGl0eS9HcmlkXCIpO1xuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IDA7IGxvY2FsQ29sIDwgdGhpcy5DT0w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZHMucHVzaChbXSk7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IDA7IGxvY2FsUm93IDwgdGhpcy5ST1c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JpZCA9IG5ldyBHcmlkKGNjLmNvbG9yLkdSQVksIHRoaXMuR1JJRF9XSURUSCwgdGhpcy5HUklEX0hFSUdIVCwgbG9jYWxDb2wsIGxvY2FsUm93KTtcbiAgICAgICAgICAgICAgICB0aGlzLmFkZENoaWxkKGdyaWQpO1xuICAgICAgICAgICAgICAgIGdyaWQuc2V0UG9zaXRpb24odGhpcy5nZXRHcmlkUG9zKGxvY2FsQ29sLCBsb2NhbFJvdykpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdLnB1c2goZ3JpZCk7XG5cbiAgICAgICAgICAgICAgICBpZiAobG9jYWxDb2wgPT09IE1hdGguZmxvb3IodGhpcy5DT0wgLyAyKSB8fFxuICAgICAgICAgICAgICAgICAgICBsb2NhbENvbCA9PT0gTWF0aC5mbG9vcih0aGlzLkNPTCAvIDIpIC0gMSB8fFxuICAgICAgICAgICAgICAgICAgICBsb2NhbFJvdyA9PT0gTWF0aC5mbG9vcih0aGlzLlJPVyAvIDIpIHx8XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsUm93ID09PSBNYXRoLmZsb29yKHRoaXMuUk9XIC8gMikgLSAxXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyaWQuc2V0Q29sb3IoY2MuY29sb3IoOTAsIDkwLCA5MCkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICByZXNldDogZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IDA7IGxvY2FsQ29sIDwgdGhpcy5DT0w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gMDsgbG9jYWxSb3cgPCB0aGlzLlJPVzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddLnNldENvbG9yKGNjLmNvbG9yLkdSQVkpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS51c2VkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICBpZiAobG9jYWxDb2wgPT09IE1hdGguZmxvb3IodGhpcy5DT0wgLyAyKSB8fFxuICAgICAgICAgICAgICAgICAgICBsb2NhbENvbCA9PT0gTWF0aC5mbG9vcih0aGlzLkNPTCAvIDIpIC0gMSB8fFxuICAgICAgICAgICAgICAgICAgICBsb2NhbFJvdyA9PT0gTWF0aC5mbG9vcih0aGlzLlJPVyAvIDIpIHx8XG4gICAgICAgICAgICAgICAgICAgIGxvY2FsUm93ID09PSBNYXRoLmZsb29yKHRoaXMuUk9XIC8gMikgLSAxXG4gICAgICAgICAgICAgICAgKSB7XG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS5zZXRDb2xvcihjYy5jb2xvcig5MCwgOTAsIDkwKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnJpY2tSZWN0cyA9IFtdO1xuICAgICAgICB0aGlzLm9ic3RhY2xlUmVjdHMgPSBbXTtcbiAgICAgICAgdGhpcy5jdXJyZW50UmVjdHMgPSB0aGlzLmJyaWNrUmVjdHM7XG4gICAgICAgIHRoaXMuX2lzQnJpY2sgPSB0cnVlO1xuICAgICAgICB0aGlzLl9icmlja0l0ZW0uc2V0U3RyaW5nKFwiQnJpY2tcIik7XG4gICAgfSxcblxuICAgIG9uRW50ZXI6ZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zdXBlcigpO1xuICAgICAgICBjYy5ldmVudE1hbmFnZXIuYWRkTGlzdGVuZXIoe1xuICAgICAgICAgICAgZXZlbnQ6IGNjLkV2ZW50TGlzdGVuZXIuVE9VQ0hfT05FX0JZX09ORSxcbiAgICAgICAgICAgIHN3YWxsb3dUb3VjaGVzOiB0cnVlLFxuICAgICAgICAgICAgb25Ub3VjaEJlZ2FuOiB0aGlzLm9uVG91Y2hCZWdhbi5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25Ub3VjaE1vdmVkOiB0aGlzLm9uVG91Y2hNb3ZlZC5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25Ub3VjaEVuZGVkOiB0aGlzLm9uVG91Y2hFbmRlZC5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25Ub3VjaENhbmNlbGxlZDogdGhpcy5vblRvdWNoQ2FuY2VsbGVkLmJpbmQodGhpcylcbiAgICAgICAgfSwgdGhpcyk7XG5cbiAgICAgICAgLy9jYy5ldmVudE1hbmFnZXIuYWRkTGlzdGVuZXIoe1xuICAgICAgICAvLyAgICBldmVudDogY2MuRXZlbnRMaXN0ZW5lci5LRVlCT0FSRCxcbiAgICAgICAgLy8gICAgb25LZXlSZWxlYXNlZDogZnVuY3Rpb24gKGtleUNvZGUsIGV2ZW50KSB7XG4gICAgICAgIC8vICAgICAgICBpZiAoa2V5Q29kZSA9PT0gY2MuS0VZLmJhY2tzcGFjZSkge1xuICAgICAgICAvLyAgICAgICAgICAgIC8vY2MuZGlyZWN0b3IuZW5kKCk7XG4gICAgICAgIC8vICAgICAgICAgICAgdGhpcy5kZWxldGVMYXRlc3RSZWN0KCk7XG4gICAgICAgIC8vICAgICAgICB9XG4gICAgICAgIC8vICAgIH0uYmluZCh0aGlzKVxuICAgICAgICAvL30sIHRoaXMpO1xuICAgIH0sXG5cbiAgICBvbkV4aXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc3VwZXIoKTtcbiAgICB9LFxuXG4gICAgZ2V0R3JpZFBvczogZnVuY3Rpb24gKGxvY2FsQ29sLCBsb2NhbFJvdykge1xuICAgICAgICB2YXIgZ3JpZFNpemUgPSB0aGlzLmdldEdyaWRTaXplKCk7XG4gICAgICAgIHJldHVybiBjYy5wKChncmlkU2l6ZS53aWR0aCArIHRoaXMuR0FQX1dJRFRIKSAqIChsb2NhbENvbCArIDAuNSksXG4gICAgICAgICAgICAoZ3JpZFNpemUuaGVpZ2h0ICsgdGhpcy5HQVBfSEVJR0hUKSAqIChsb2NhbFJvdyArIDAuNSkpO1xuICAgIH0sXG5cbiAgICBnZXRHcmlkU2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY2Muc2l6ZSh0aGlzLkdSSURfV0lEVEgsIHRoaXMuR1JJRF9IRUlHSFQpO1xuICAgIH0sXG5cbiAgICBnZXRGdWxsR3JpZFNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGNjLnNpemUodGhpcy5HUklEX1dJRFRIICsgdGhpcy5HQVBfV0lEVEgsIHRoaXMuR1JJRF9IRUlHSFQgKyB0aGlzLkdBUF9IRUlHSFQpO1xuICAgIH0sXG5cbiAgICBvblRvdWNoQmVnYW46ZnVuY3Rpb24odG91Y2gsIGV2ZW50KSB7XG4gICAgICAgIHZhciBncmlkID0gdGhpcy5nZXRDbG9zZXN0R3JpZCh0b3VjaCk7XG4gICAgICAgIGlmIChncmlkLnVzZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpcnN0R3JpZCA9IGdyaWQ7XG4gICAgICAgIGdyaWQuc2V0Q29sb3IodGhpcy5nZXRDdXJyZW50Q29sb3IoKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBvblRvdWNoTW92ZWQ6ZnVuY3Rpb24odG91Y2gsIGV2ZW50KSB7XG4gICAgICAgIHRoaXMudG91Y2hEcmF3KHRvdWNoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIG9uVG91Y2hFbmRlZDpmdW5jdGlvbih0b3VjaCwgZXZlbnQpIHtcbiAgICAgICAgdGhpcy50b3VjaERyYXcodG91Y2gpO1xuXG4gICAgICAgIGlmICh0aGlzLmZpcnN0R3JpZCAmJiB0aGlzLmxhc3RHcmlkKSB7XG4gICAgICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24odGhpcy5maXJzdEdyaWQsIHRoaXMubGFzdEdyaWQpO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5zZWxlY3RDb2xvckluZGV4ICsgMTtcbiAgICAgICAgICAgIGlmICghdGhpcy5faXNCcmljaykge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY3VycmVudFJlY3RzLnB1c2goW3JlZ2lvbi5taW5Db2wsIHJlZ2lvbi5taW5Sb3csXG4gICAgICAgICAgICAgICAgcmVnaW9uLm1heENvbCAtIHJlZ2lvbi5taW5Db2wgKyAxLCByZWdpb24ubWF4Um93IC0gcmVnaW9uLm1pblJvdyArIDEsIGluZGV4XSk7XG5cbiAgICAgICAgICAgIHRoaXMubWFya09jY3VwaWVkKCk7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IDA7IGxvY2FsQ29sIDwgdGhpcy5DT0w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IDA7IGxvY2FsUm93IDwgdGhpcy5ST1c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmZpcnN0R3JpZCA9IG51bGw7XG4gICAgICAgIHRoaXMubGFzdEdyaWQgPSBudWxsO1xuICAgIH0sXG5cbiAgICBtYXJrT2NjdXBpZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlZ2lvbiA9IHRoaXMuZ2V0UmVnaW9uKHRoaXMuZmlyc3RHcmlkLCB0aGlzLmxhc3RHcmlkKTtcblxuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IHJlZ2lvbi5taW5Db2w7IGxvY2FsQ29sIDw9IHJlZ2lvbi5tYXhDb2w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gcmVnaW9uLm1pblJvdzsgbG9jYWxSb3cgPD0gcmVnaW9uLm1heFJvdzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS51c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpc09jY3VwaWVkOiBmdW5jdGlvbiAoZ3JpZCkge1xuICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24odGhpcy5maXJzdEdyaWQsIGdyaWQpO1xuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IHJlZ2lvbi5taW5Db2w7IGxvY2FsQ29sIDw9IHJlZ2lvbi5tYXhDb2w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gcmVnaW9uLm1pblJvdzsgbG9jYWxSb3cgPD0gcmVnaW9uLm1heFJvdzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd10udXNlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICB0b3VjaERyYXc6IGZ1bmN0aW9uICh0b3VjaCkge1xuICAgICAgICBpZiAoIXRoaXMuZmlyc3RHcmlkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGdyaWQgPSB0aGlzLmdldENsb3Nlc3RHcmlkKHRvdWNoKTtcblxuICAgICAgICBpZiAoIWdyaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChncmlkID09PSB0aGlzLmxhc3RHcmlkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pc09jY3VwaWVkKGdyaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sYXN0R3JpZCA9IGdyaWQ7XG4gICAgICAgIHRoaXMuY2xlYXJSZWN0KCk7XG4gICAgICAgIHRoaXMuZHJhd1JlY3QoZ3JpZCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBkZWxldGVMYXRlc3RSZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5jdXJyZW50UmVjdHMucG9wKCk7XG4gICAgICAgIGlmIChyZWN0KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IHJlY3RbMF07IGxvY2FsQ29sIDwgcmVjdFswXSArIHJlY3RbMl07ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IHJlY3RbMV07IGxvY2FsUm93IDwgcmVjdFsxXSArIHJlY3RbM107ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdyaWQgPSB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd107XG4gICAgICAgICAgICAgICAgICAgIGdyaWQuc2V0Q29sb3IoY2MuY29sb3IuR1JBWSk7XG4gICAgICAgICAgICAgICAgICAgIGdyaWQudXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjbGVhclJlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yICh2YXIgbG9jYWxDb2wgPSAwOyBsb2NhbENvbCA8IHRoaXMuQ09MOyArK2xvY2FsQ29sKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IDA7IGxvY2FsUm93IDwgdGhpcy5ST1c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JpZCA9IHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XTtcbiAgICAgICAgICAgICAgICBpZiAoZ3JpZC5lZGl0aW5nICYmICFncmlkLnVzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC5zZXRDb2xvcihjYy5jb2xvci5HUkFZKTtcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIGRyYXdSZWN0OiBmdW5jdGlvbiAoZ3JpZCkge1xuICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24odGhpcy5maXJzdEdyaWQsIGdyaWQpO1xuXG4gICAgICAgIGZvciAodmFyIGxvY2FsQ29sID0gcmVnaW9uLm1pbkNvbDsgbG9jYWxDb2wgPD0gcmVnaW9uLm1heENvbDsgKytsb2NhbENvbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgbG9jYWxSb3cgPSByZWdpb24ubWluUm93OyBsb2NhbFJvdyA8PSByZWdpb24ubWF4Um93OyArK2xvY2FsUm93KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddLmVkaXRpbmcgPSB0cnVlO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS5zZXRDb2xvcih0aGlzLmdldEN1cnJlbnRDb2xvcigpKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBnZXRSZWdpb246IGZ1bmN0aW9uIChncmlkMSwgZ3JpZDIpIHtcbiAgICAgICAgdmFyIG1pblJvdyA9IE1hdGgubWluKGdyaWQxLnJvdywgZ3JpZDIucm93KTtcbiAgICAgICAgdmFyIG1heFJvdyA9IE1hdGgubWF4KGdyaWQxLnJvdywgZ3JpZDIucm93KTtcbiAgICAgICAgdmFyIG1pbkNvbCA9IE1hdGgubWluKGdyaWQxLmNvbCwgZ3JpZDIuY29sKTtcbiAgICAgICAgdmFyIG1heENvbCA9IE1hdGgubWF4KGdyaWQxLmNvbCwgZ3JpZDIuY29sKTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG1pblJvdzogbWluUm93LFxuICAgICAgICAgICAgbWF4Um93OiBtYXhSb3csXG4gICAgICAgICAgICBtaW5Db2w6IG1pbkNvbCxcbiAgICAgICAgICAgIG1heENvbDogbWF4Q29sXG4gICAgICAgIH07XG4gICAgfSxcblxuICAgIG9uVG91Y2hDYW5jZWxsZWQ6ZnVuY3Rpb24odG91Y2gsIGV2ZW50KSB7XG4gICAgfSxcblxuICAgIGdldENsb3Nlc3RHcmlkOiBmdW5jdGlvbiAodG91Y2gpIHtcbiAgICAgICAgdmFyIGxvY2FsUG9zID0gdGhpcy5jb252ZXJ0VG9Ob2RlU3BhY2UodG91Y2guZ2V0TG9jYXRpb24oKSk7XG4gICAgICAgIHZhciBncmlkU2l6ZSA9IHRoaXMuZ2V0RnVsbEdyaWRTaXplKCk7XG5cbiAgICAgICAgY2MubG9nKFwibG9jYWxQb3M6XCIgKyBKU09OLnN0cmluZ2lmeShsb2NhbFBvcykpO1xuXG4gICAgICAgIHZhciByb3cgPSBNYXRoLmZsb29yKGxvY2FsUG9zLnggLyBncmlkU2l6ZS53aWR0aCk7XG4gICAgICAgIHZhciBjb2wgPSBNYXRoLmZsb29yKGxvY2FsUG9zLnkgLyBncmlkU2l6ZS5oZWlnaHQpO1xuXG4gICAgICAgIGNjLmxvZyhcInJvdzpcIiArIHJvdyArIFwiLGNvbDpcIiArIGNvbCk7XG5cbiAgICAgICAgcmV0dXJuIHRoaXMuZ3JpZHNbcm93XVtjb2xdO1xuICAgIH0sXG5cbiAgICBnZXRDdXJyZW50Q29sb3I6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgaWYgKHRoaXMuX2lzQnJpY2spIHtcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlbGVjdENvbG9yO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIGNjLmNvbG9yLldISVRFO1xuICAgICAgICB9XG4gICAgfVxuICAgIC8vXG4gICAgLy9kcmF3UmVjdDogZnVuY3Rpb24ocmVnaW9uLCBjb2xvciwgY2xlYXIpIHtcbiAgICAvLyAgICBpZiAoY2xlYXIpe1xuICAgIC8vICAgICAgICB0aGlzLl9kcmF3Tm9kZS5jbGVhcigpO1xuICAgIC8vICAgIH1cbiAgICAvLyAgICBpZiAocmVnaW9uID09IG51bGwpIHtcbiAgICAvLyAgICAgICAgcmV0dXJuO1xuICAgIC8vICAgIH1cbiAgICAvLyAgICB2YXIgbWluID0gcmVnaW9uLmdldE1pbigpO1xuICAgIC8vICAgIHZhciBtYXggPSByZWdpb24uZ2V0TWF4KCk7XG4gICAgLy8gICAgbWF4LnggKz0gMTtcbiAgICAvLyAgICBtYXgueSArPSAxO1xuICAgIC8vICAgIHRoaXMuX2RyYXdOb2RlLmRyYXdTZWdtZW50KGNjLnAobWluLngsIG1pbi55KSxcbiAgICAvLyAgICAgICAgY2MucChtaW4ueCwgbWF4LnkpLCAxLCBjb2xvcik7XG4gICAgLy8gICAgdGhpcy5fZHJhd05vZGUuZHJhd1NlZ21lbnQoY2MucChtaW4ueCwgbWF4LnkpLFxuICAgIC8vICAgICAgICBjYy5wKG1heC54LCBtYXgueSksIDEsIGNvbG9yKTtcbiAgICAvLyAgICB0aGlzLl9kcmF3Tm9kZS5kcmF3U2VnbWVudChjYy5wKG1heC54LCBtYXgueSksXG4gICAgLy8gICAgICAgIGNjLnAobWF4LngsIG1pbi55KSwgMSwgY29sb3IpO1xuICAgIC8vICAgIHRoaXMuX2RyYXdOb2RlLmRyYXdTZWdtZW50KGNjLnAobWF4LngsIG1pbi55KSxcbiAgICAvLyAgICAgICAgY2MucChtaW4ueCwgbWluLnkpLCAxLCBjb2xvcik7XG4gICAgLy99LFxuICAgIC8vXG4gICAgLy9kcmF3UmVjdEZpbGw6IGZ1bmN0aW9uIChyZWdpb24sIGNvbG9yKSB7XG4gICAgLy8gICAgaWYgKHJlZ2lvbiA9PSBudWxsKSB7XG4gICAgLy8gICAgICAgIHJldHVybjtcbiAgICAvLyAgICB9XG4gICAgLy8gICAgdGhpcy5fZHJhd05vZGUuZHJhd1JlY3QocmVnaW9uLmdldE1pbigpLCByZWdpb24uZ2V0TWF4KCksIGNvbG9yLCAxLCBjb2xvcik7XG4gICAgLy99XG59KTtcblxubW9kdWxlLmV4cG9ydHMgPSBFZGl0b3JTY2VuZTsiLCIvKipcbiAqIEEgYnJpZWYgZXhwbGFuYXRpb24gZm9yIFwicHJvamVjdC5qc29uXCI6XG4gKiBIZXJlIGlzIHRoZSBjb250ZW50IG9mIHByb2plY3QuanNvbiBmaWxlLCB0aGlzIGlzIHRoZSBnbG9iYWwgY29uZmlndXJhdGlvbiBmb3IgeW91ciBnYW1lLCB5b3UgY2FuIG1vZGlmeSBpdCB0byBjdXN0b21pemUgc29tZSBiZWhhdmlvci5cbiAqIFRoZSBkZXRhaWwgb2YgZWFjaCBmaWVsZCBpcyB1bmRlciBpdC5cbiB7XG4gICAgXCJwcm9qZWN0X3R5cGVcIjogXCJqYXZhc2NyaXB0XCIsXG4gICAgLy8gXCJwcm9qZWN0X3R5cGVcIiBpbmRpY2F0ZSB0aGUgcHJvZ3JhbSBsYW5ndWFnZSBvZiB5b3VyIHByb2plY3QsIHlvdSBjYW4gaWdub3JlIHRoaXMgZmllbGRcblxuICAgIFwiZGVidWdNb2RlXCIgICAgIDogMSxcbiAgICAvLyBcImRlYnVnTW9kZVwiIHBvc3NpYmxlIHZhbHVlcyA6XG4gICAgLy8gICAgICAwIC0gTm8gbWVzc2FnZSB3aWxsIGJlIHByaW50ZWQuXG4gICAgLy8gICAgICAxIC0gY2MuZXJyb3IsIGNjLmFzc2VydCwgY2Mud2FybiwgY2MubG9nIHdpbGwgcHJpbnQgaW4gY29uc29sZS5cbiAgICAvLyAgICAgIDIgLSBjYy5lcnJvciwgY2MuYXNzZXJ0LCBjYy53YXJuIHdpbGwgcHJpbnQgaW4gY29uc29sZS5cbiAgICAvLyAgICAgIDMgLSBjYy5lcnJvciwgY2MuYXNzZXJ0IHdpbGwgcHJpbnQgaW4gY29uc29sZS5cbiAgICAvLyAgICAgIDQgLSBjYy5lcnJvciwgY2MuYXNzZXJ0LCBjYy53YXJuLCBjYy5sb2cgd2lsbCBwcmludCBvbiBjYW52YXMsIGF2YWlsYWJsZSBvbmx5IG9uIHdlYi5cbiAgICAvLyAgICAgIDUgLSBjYy5lcnJvciwgY2MuYXNzZXJ0LCBjYy53YXJuIHdpbGwgcHJpbnQgb24gY2FudmFzLCBhdmFpbGFibGUgb25seSBvbiB3ZWIuXG4gICAgLy8gICAgICA2IC0gY2MuZXJyb3IsIGNjLmFzc2VydCB3aWxsIHByaW50IG9uIGNhbnZhcywgYXZhaWxhYmxlIG9ubHkgb24gd2ViLlxuXG4gICAgXCJzaG93RlBTXCIgICAgICAgOiB0cnVlLFxuICAgIC8vIExlZnQgYm90dG9tIGNvcm5lciBmcHMgaW5mb3JtYXRpb24gd2lsbCBzaG93IHdoZW4gXCJzaG93RlBTXCIgZXF1YWxzIHRydWUsIG90aGVyd2lzZSBpdCB3aWxsIGJlIGhpZGUuXG5cbiAgICBcImZyYW1lUmF0ZVwiICAgICA6IDYwLFxuICAgIC8vIFwiZnJhbWVSYXRlXCIgc2V0IHRoZSB3YW50ZWQgZnJhbWUgcmF0ZSBmb3IgeW91ciBnYW1lLCBidXQgdGhlIHJlYWwgZnBzIGRlcGVuZHMgb24geW91ciBnYW1lIGltcGxlbWVudGF0aW9uIGFuZCB0aGUgcnVubmluZyBlbnZpcm9ubWVudC5cblxuICAgIFwiaWRcIiAgICAgICAgICAgIDogXCJnYW1lQ2FudmFzXCIsXG4gICAgLy8gXCJnYW1lQ2FudmFzXCIgc2V0cyB0aGUgaWQgb2YgeW91ciBjYW52YXMgZWxlbWVudCBvbiB0aGUgd2ViIHBhZ2UsIGl0J3MgdXNlZnVsIG9ubHkgb24gd2ViLlxuXG4gICAgXCJyZW5kZXJNb2RlXCIgICAgOiAwLFxuICAgIC8vIFwicmVuZGVyTW9kZVwiIHNldHMgdGhlIHJlbmRlcmVyIHR5cGUsIG9ubHkgdXNlZnVsIG9uIHdlYiA6XG4gICAgLy8gICAgICAwIC0gQXV0b21hdGljYWxseSBjaG9zZW4gYnkgZW5naW5lXG4gICAgLy8gICAgICAxIC0gRm9yY2VkIHRvIHVzZSBjYW52YXMgcmVuZGVyZXJcbiAgICAvLyAgICAgIDIgLSBGb3JjZWQgdG8gdXNlIFdlYkdMIHJlbmRlcmVyLCBidXQgdGhpcyB3aWxsIGJlIGlnbm9yZWQgb24gbW9iaWxlIGJyb3dzZXJzXG5cbiAgICBcImVuZ2luZURpclwiICAgICA6IFwiZnJhbWV3b3Jrcy9jb2NvczJkLWh0bWw1L1wiLFxuICAgIC8vIEluIGRlYnVnIG1vZGUsIGlmIHlvdSB1c2UgdGhlIHdob2xlIGVuZ2luZSB0byBkZXZlbG9wIHlvdXIgZ2FtZSwgeW91IHNob3VsZCBzcGVjaWZ5IGl0cyByZWxhdGl2ZSBwYXRoIHdpdGggXCJlbmdpbmVEaXJcIixcbiAgICAvLyBidXQgaWYgeW91IGFyZSB1c2luZyBhIHNpbmdsZSBlbmdpbmUgZmlsZSwgeW91IGNhbiBpZ25vcmUgaXQuXG5cbiAgICBcIm1vZHVsZXNcIiAgICAgICA6IFtcImNvY29zMmRcIl0sXG4gICAgLy8gXCJtb2R1bGVzXCIgZGVmaW5lcyB3aGljaCBtb2R1bGVzIHlvdSB3aWxsIG5lZWQgaW4geW91ciBnYW1lLCBpdCdzIHVzZWZ1bCBvbmx5IG9uIHdlYixcbiAgICAvLyB1c2luZyB0aGlzIGNhbiBncmVhdGx5IHJlZHVjZSB5b3VyIGdhbWUncyByZXNvdXJjZSBzaXplLCBhbmQgdGhlIGNvY29zIGNvbnNvbGUgdG9vbCBjYW4gcGFja2FnZSB5b3VyIGdhbWUgd2l0aCBvbmx5IHRoZSBtb2R1bGVzIHlvdSBzZXQuXG4gICAgLy8gRm9yIGRldGFpbHMgYWJvdXQgbW9kdWxlcyBkZWZpbml0aW9ucywgeW91IGNhbiByZWZlciB0byBcIi4uLy4uL2ZyYW1ld29ya3MvY29jb3MyZC1odG1sNS9tb2R1bGVzQ29uZmlnLmpzb25cIi5cblxuICAgIFwianNMaXN0XCIgICAgICAgIDogW1xuICAgIF1cbiAgICAvLyBcImpzTGlzdFwiIHNldHMgdGhlIGxpc3Qgb2YganMgZmlsZXMgaW4geW91ciBnYW1lLlxuIH1cbiAqXG4gKi9cblxuY2MuZ2FtZS5vblN0YXJ0ID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCFjYy5zeXMuaXNOYXRpdmUgJiYgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb2Nvc0xvYWRpbmdcIikpXG4gICAgICAgIGRvY3VtZW50LmJvZHkucmVtb3ZlQ2hpbGQoZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJjb2Nvc0xvYWRpbmdcIikpO1xuXG4gICAgY2Mudmlldy5lbmFibGVSZXRpbmEoZmFsc2UpO1xuICAgIGNjLnZpZXcuYWRqdXN0Vmlld1BvcnQodHJ1ZSk7XG5cbiAgICAvKlxuICAgIHZhciBMb2dpY01hbiA9IHJlcXVpcmUoXCIuL2NvbW1vbi9tb2RlbC9Mb2dpY01hblwiKTtcbiAgICBMb2dpY01hbi5nZXRJbnN0YW5jZSgpLmluaXQoKTtcblxuICAgIHZhciBVdGlscyA9IHJlcXVpcmUoXCIuL2NvbW1vbi91dGlsL1V0aWxzXCIpO1xuICAgIGlmIChjYy5zeXMuaXNOYXRpdmUpIHtcbiAgICAgICAgdmFyIHdpZHRoID0gMDtcbiAgICAgICAgdmFyIGhlaWdodCA9IDA7XG4gICAgICAgIGlmICghIUdhbWVCcmlkZ2UuZ2V0Q29uZmlnKCkuaG9yaXpvbnRhbEdhbWUpIHtcbiAgICAgICAgICAgIGhlaWdodCA9IDY0MDtcbiAgICAgICAgICAgIGlmIChVdGlscy5pc1BhZCgpKSB7XG4gICAgICAgICAgICAgICAgaGVpZ2h0ID0gNzY4O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2lkdGggPSBoZWlnaHQgKiBjYy53aW5TaXplLndpZHRoIC8gY2Mud2luU2l6ZS5oZWlnaHQ7XG4gICAgICAgICAgICBjYy5sb2coXCJjYy53aW5TaXplLndpZHRoOlwiICsgY2Mud2luU2l6ZS53aWR0aCk7XG4gICAgICAgICAgICBjYy5sb2coXCJjYy53aW5TaXplLmhlaWdodDpcIiArIGNjLndpblNpemUuaGVpZ2h0KTtcblxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgaGVpZ2h0ID0gMTEzNjtcbiAgICAgICAgICAgIGlmIChVdGlscy5pc1BhZCgpKSB7XG4gICAgICAgICAgICAgICAgaGVpZ2h0ID0gMTAyNDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpZHRoID0gaGVpZ2h0ICogY2Mud2luU2l6ZS53aWR0aCAvIGNjLndpblNpemUuaGVpZ2h0O1xuICAgICAgICB9XG4gICAgICAgIGNjLmxvZyhcIndpZHRoOlwiICsgd2lkdGgpO1xuICAgICAgICBjYy5sb2coXCJoZWlnaHQ6XCIgKyBoZWlnaHQpO1xuICAgICAgICBjYy52aWV3LnNldERlc2lnblJlc29sdXRpb25TaXplKHdpZHRoLCBoZWlnaHQsIGNjLlJlc29sdXRpb25Qb2xpY3kuU0hPV19BTEwpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmICghIUdhbWVCcmlkZ2UuZ2V0Q29uZmlnKCkuaG9yaXpvbnRhbEdhbWUpIHtcbiAgICAgICAgICAgIGNjLnZpZXcuc2V0RGVzaWduUmVzb2x1dGlvblNpemUoOTYwLCA2NDAsIGNjLlJlc29sdXRpb25Qb2xpY3kuU0hPV19BTEwpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY2Mudmlldy5zZXREZXNpZ25SZXNvbHV0aW9uU2l6ZSg2NDAsIDk2MCwgY2MuUmVzb2x1dGlvblBvbGljeS5TSE9XX0FMTCk7XG4gICAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBUaGUgZ2FtZSB3aWxsIGJlIHJlc2l6ZWQgd2hlbiBicm93c2VyIHNpemUgY2hhbmdlXG4gICAgY2MuQnVpbGRlclJlYWRlci5zZXRSZXNvdXJjZVBhdGgoXCJyZXMvXCIpO1xuICAgIGNjLnZpZXcucmVzaXplV2l0aEJyb3dzZXJTaXplKHRydWUpO1xuXG4gICAgZ2FtZS5kaWFsb2dNYW5hZ2VyLmNyZWF0ZU92ZXJsYXkoKTtcblxuICAgIGlmIChjYy5zeXMuaXNOYXRpdmUpIHtcbiAgICAgICAgZ2FtZS5sb2NhbC5yZWxvYWQoKTtcbiAgICAgICAgY2MuZGlyZWN0b3IucnVuU2NlbmUobmV3IEdhbWVCcmlkZ2UuZ2V0TWVudVNjZW5lKCkpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIGNjLmxvYWRlci5sb2FkSnNvbihcInJlcy9yZXNvdXJjZV9saXN0L3Jlc291cmNlX2xpc3QuanNvblwiLCBmdW5jdGlvbiAoZXJyb3IsIHJlc3VsdCkge1xuICAgICAgICAgICAgaWYgKCFlcnJvcikge1xuICAgICAgICAgICAgICAgIGNjLkxvYWRlclNjZW5lLnByZWxvYWQocmVzdWx0LCBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAgICAgICAgIGdhbWUubG9jYWwucmVsb2FkKCk7XG4gICAgICAgICAgICAgICAgICAgIGNjLmRpcmVjdG9yLnJ1blNjZW5lKEdhbWVCcmlkZ2UuZ2V0TWVudVNjZW5lKCkpO1xuICAgICAgICAgICAgICAgIH0sIHRoaXMpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KTtcbiAgICB9XG4gICAgKi9cbiAgICBjYy52aWV3LnJlc2l6ZVdpdGhCcm93c2VyU2l6ZSh0cnVlKTtcbiAgICBjYy52aWV3LnNldERlc2lnblJlc29sdXRpb25TaXplKDYwMCwgNzAwLCBjYy5SZXNvbHV0aW9uUG9saWN5LlNIT1dfQUxMKTtcbiAgICBjYy5Mb2FkZXJTY2VuZS5wcmVsb2FkKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBFZGl0b3JTY2VuZSA9IHJlcXVpcmUoXCIuL2VkaXRvci9zY2VuZS9FZGl0b3JTY2VuZVwiKTtcbiAgICAgICAgY2MuZGlyZWN0b3IucnVuU2NlbmUobmV3IEVkaXRvclNjZW5lKCkpO1xuICAgIH0pO1xufTtcbmNjLmdhbWUucnVuKCk7XG4iXX0=
