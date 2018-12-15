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
    cc.color(252, 178, 0),
    cc.color(81, 229, 12),
    cc.color(27, 226, 255),
    cc.color(255, 252, 29),
    cc.color(255, 56, 56),
    cc.color(248, 70, 255),
    cc.color(255, 129, 17),
    cc.color(57, 103, 249),
    cc.color(90, 181, 110)
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

        this.xOffset = (cc.winSize.width - this.CONTENT_WIDTH) * 0.5;
        this.yOffset = (cc.winSize.height - this.CONTENT_HEIGHT) * 0.5;

        this.brickRects = [];
        this.obstacleRects = [];

        this.currentRects = this.brickRects;
        this.selectColor = ColorConfigs[0];
        this.selectColorIndex = 0;

        this.gridNode = new cc.Node();
        this.addChild(this.gridNode);
        this.gridNode.x = this.xOffset;

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

        this._gridLabel.setPosition(cc.p(cc.winSize.width * 0.5, cc.winSize.height - 80));

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

        //alert(JSON.stringify(obj));
        var blob = new Blob([JSON.stringify(obj)]);
        var tag = document.createElement("a");
        tag.download = "level.json";
        tag.href = URL.createObjectURL(blob);
        tag.click();
        URL.revokeObjectURL(blob);
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
                this.gridNode.addChild(grid);
                grid.setPosition(this.getGridPos(localCol, localRow));
                this.grids[localCol].push(grid);
                this.markGrayHint(grid, localCol, localRow);
                grid._color = grid.color;
            }
        }
    },

    markGrayHint: function (grid, localCol, localRow) {
        var grayColor = cc.color(90, 90, 90);
        var isLeft = (this.COL / localCol) > 2;
        var isBottom = (this.ROW / localRow) > 2;
        if (localCol === Math.floor(this.COL / 2) ||
            localCol === Math.floor(this.COL / 2) - 1 ||
            localRow === Math.floor(this.ROW / 2) ||
            localRow === Math.floor(this.ROW / 2) - 1
        ) {
            grid.setColor(grayColor);
        }

        var iii = isLeft ? 4 : 0;

        if (localCol % 5 === iii) {
            grid.setColor(grayColor);
        }

        var jjj = isBottom ? 4 : 0;

        if (localRow % 5 === jjj) {
            grid.setColor(grayColor);
        }

        //iii = isLeft ? 9 : 0;
        //jjj = isBottom ? 9 : 0;
        //
        //if (localCol % 10 === iii && localRow % 10 === jjj) {
        //    grid.setColor(cc.color.YELLOW);
        //}
    },

    reset: function () {
        for (var localCol = 0; localCol < this.COL; ++localCol) {
            for (var localRow = 0; localRow < this.ROW; ++localRow) {
                this.grids[localCol][localRow].editing = false;
                this.grids[localCol][localRow].setColor(cc.color.GRAY);
                this.grids[localCol][localRow].used = false;

                this.markGrayHint(this.grids[localCol][localRow], localCol, localRow);
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
        }, this.gridNode);

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
                    grid.setColor(grid._color);
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
                    grid.setColor(grid._color);
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
        var localPos = this.gridNode.convertToNodeSpace(touch.getLocation());
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
    cc.view.setDesignResolutionSize(1000, 700, cc.ResolutionPolicy.SHOW_ALL);
    cc.LoaderScene.preload([], function () {
        var EditorScene = require("./editor/scene/EditorScene");
        cc.director.runScene(new EditorScene());
    });
};
cc.game.run();

},{"./editor/scene/EditorScene":2}]},{},[3])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImVkaXRvci9lbnRpdHkvR3JpZC5qcyIsImVkaXRvci9zY2VuZS9FZGl0b3JTY2VuZS5qcyIsImVkaXRvckxvYWRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1ZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ3JlYXRlZCBieSBxaW5uaW5nIG9uIDIwMTcvMTIvMi5cbiAqL1xuXG52YXIgR3JpZCA9IGNjLkxheWVyQ29sb3IuZXh0ZW5kKHtcblxuICAgIGNvbDogMCxcbiAgICByb3c6IDAsXG5cbiAgICBlZGl0aW5nOiBmYWxzZSxcbiAgICB1c2VkOiBmYWxzZSxcblxuICAgIGN0b3I6IGZ1bmN0aW9uIChjb2xvciwgd2lkdGgsIGhlaWdodCwgY29sLCByb3cpIHtcbiAgICAgICAgdGhpcy5fc3VwZXIoY29sb3IsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmlnbm9yZUFuY2hvciA9IGZhbHNlO1xuICAgICAgICAvL3RoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMuY29sID0gY29sO1xuICAgICAgICB0aGlzLnJvdyA9IHJvdztcbiAgICB9LFxuXG4gICAgc2V0Q29sb3I6IGZ1bmN0aW9uIChjb2xvcikge1xuICAgICAgICB0aGlzLl9zdXBlcihjb2xvcik7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gR3JpZDsiLCJcbnZhciBDb2xvckNvbmZpZ3MgPSBbXG4gICAgY2MuY29sb3IoMjUyLCAxNzgsIDApLFxuICAgIGNjLmNvbG9yKDgxLCAyMjksIDEyKSxcbiAgICBjYy5jb2xvcigyNywgMjI2LCAyNTUpLFxuICAgIGNjLmNvbG9yKDI1NSwgMjUyLCAyOSksXG4gICAgY2MuY29sb3IoMjU1LCA1NiwgNTYpLFxuICAgIGNjLmNvbG9yKDI0OCwgNzAsIDI1NSksXG4gICAgY2MuY29sb3IoMjU1LCAxMjksIDE3KSxcbiAgICBjYy5jb2xvcig1NywgMTAzLCAyNDkpLFxuICAgIGNjLmNvbG9yKDkwLCAxODEsIDExMClcbl07XG5cbnZhciBFZGl0b3JTY2VuZSA9IGNjLlNjZW5lLmV4dGVuZCh7XG5cbiAgICBDT05URU5UX1dJRFRIOiA2MDAsXG4gICAgQ09OVEVOVF9IRUlHSFQ6IDYwMCxcblxuICAgIENPTDogNTAsXG4gICAgUk9XOiA1MCxcblxuICAgIEdSSURfV0lEVEg6IDksXG4gICAgR1JJRF9IRUlHSFQ6IDksXG5cbiAgICBHQVBfV0lEVEg6IDMsXG4gICAgR0FQX0hFSUdIVDogMyxcblxuICAgIGJyaWNrUmVjdHM6IG51bGwsXG5cbiAgICBvYnN0YWNsZVJlY3RzOiBudWxsLFxuXG4gICAgX2lzQnJpY2s6IHRydWUsXG5cbiAgICBfYnJpY2tJdGVtOiBudWxsLFxuXG4gICAgY3RvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zdXBlcigpO1xuXG4gICAgICAgIHRoaXMueE9mZnNldCA9IChjYy53aW5TaXplLndpZHRoIC0gdGhpcy5DT05URU5UX1dJRFRIKSAqIDAuNTtcbiAgICAgICAgdGhpcy55T2Zmc2V0ID0gKGNjLndpblNpemUuaGVpZ2h0IC0gdGhpcy5DT05URU5UX0hFSUdIVCkgKiAwLjU7XG5cbiAgICAgICAgdGhpcy5icmlja1JlY3RzID0gW107XG4gICAgICAgIHRoaXMub2JzdGFjbGVSZWN0cyA9IFtdO1xuXG4gICAgICAgIHRoaXMuY3VycmVudFJlY3RzID0gdGhpcy5icmlja1JlY3RzO1xuICAgICAgICB0aGlzLnNlbGVjdENvbG9yID0gQ29sb3JDb25maWdzWzBdO1xuICAgICAgICB0aGlzLnNlbGVjdENvbG9ySW5kZXggPSAwO1xuXG4gICAgICAgIHRoaXMuZ3JpZE5vZGUgPSBuZXcgY2MuTm9kZSgpO1xuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuZ3JpZE5vZGUpO1xuICAgICAgICB0aGlzLmdyaWROb2RlLnggPSB0aGlzLnhPZmZzZXQ7XG5cbiAgICAgICAgdGhpcy5pbml0R3JpZHMoKTtcbiAgICAgICAgdGhpcy5pbml0QnV0dG9ucygpO1xuICAgICAgICB0aGlzLmluaXRDb2xvckJ1dHRvbnMoKTtcbiAgICB9LFxuXG4gICAgaW5pdEJ1dHRvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQnVncyBJdGVtXG4gICAgICAgIHZhciBicmlja0l0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiQnJpY2tcIiwgdGhpcy5vbkJyaWNrVHlwZUNoYW5nZSwgdGhpcyk7XG4gICAgICAgIHZhciBzYXZlSXRlbSA9IG5ldyBjYy5NZW51SXRlbUZvbnQoXCJTYXZlXCIsIHRoaXMub25TYXZlLCB0aGlzKTtcbiAgICAgICAgdmFyIGRlbGV0ZUl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiRGVsZXRlXCIsIHRoaXMub25EZWxldGUsIHRoaXMpO1xuICAgICAgICB2YXIgcmVmcmVzaEl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiUmVmcmVzaFwiLCB0aGlzLm9uUmVmcmVzaCwgdGhpcyk7XG4gICAgICAgIHZhciBhZGRJdGVtID0gbmV3IGNjLk1lbnVJdGVtRm9udChcIkFkZFwiLCB0aGlzLm9uQWRkLCB0aGlzKTtcbiAgICAgICAgdmFyIHJlZHVjZUl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiUmVkdWNlXCIsIHRoaXMub25SZWR1Y2UsIHRoaXMpO1xuICAgICAgICB2YXIgbWVudSA9IG5ldyBjYy5NZW51KGJyaWNrSXRlbSwgc2F2ZUl0ZW0sIGRlbGV0ZUl0ZW0sIHJlZnJlc2hJdGVtLCBhZGRJdGVtLCByZWR1Y2VJdGVtKTtcblxuICAgICAgICBtZW51LmFsaWduSXRlbXNIb3Jpem9udGFsbHkoKTtcbiAgICAgICAgdGhpcy5hZGRDaGlsZChtZW51KTtcbiAgICAgICAgbWVudS5zZXRQb3NpdGlvbihjYy5wKGNjLndpblNpemUud2lkdGggKiAwLjUsIGNjLndpblNpemUuaGVpZ2h0IC0gMjApKTtcbiAgICAgICAgdGhpcy5fYnJpY2tJdGVtID0gYnJpY2tJdGVtO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbCA9IG5ldyBjYy5MYWJlbFRURihcIlwiLCBcIkFyaWFsXCIsIDI0KTtcbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLl9ncmlkTGFiZWwpO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbC5zZXRBbmNob3JQb2ludChjYy5wKDAsIDAuNSkpO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbC5zZXRQb3NpdGlvbihjYy5wKGNjLndpblNpemUud2lkdGggKiAwLjUsIGNjLndpblNpemUuaGVpZ2h0IC0gODApKTtcblxuICAgICAgICB0aGlzLl9ncmlkTGFiZWwuc2V0U3RyaW5nKHRoaXMuQ09MICsgXCJ4XCIgKyB0aGlzLlJPVyk7XG4gICAgfSxcblxuICAgIGluaXRDb2xvckJ1dHRvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGl0ZW1zID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgQ29sb3JDb25maWdzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB2YXIgY29sb3JJdGVtID0gbmV3IGNjLk1lbnVJdGVtRm9udChcIiBPIFwiLCB0aGlzLm9uU2VsZWN0Q29sb3IsIHRoaXMpO1xuICAgICAgICAgICAgY29sb3JJdGVtLnNldENvbG9yKENvbG9yQ29uZmlnc1tpXSk7XG4gICAgICAgICAgICBjb2xvckl0ZW0uc2V0VGFnKGkpO1xuICAgICAgICAgICAgaXRlbXMucHVzaChjb2xvckl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtZW51ID0gbmV3IGNjLk1lbnUoaXRlbXMpO1xuICAgICAgICBtZW51LmFsaWduSXRlbXNIb3Jpem9udGFsbHkoKTtcbiAgICAgICAgbWVudS5zZXRQb3NpdGlvbihjYy5wKGNjLndpblNpemUud2lkdGggKiAwLjUsIGNjLndpblNpemUuaGVpZ2h0IC0gNTUpKTtcbiAgICAgICAgdGhpcy5hZGRDaGlsZChtZW51KTtcbiAgICB9LFxuXG4gICAgb25TZWxlY3RDb2xvcjogZnVuY3Rpb24gKHNlbmRlcikge1xuICAgICAgICB0aGlzLnNlbGVjdENvbG9yID0gQ29sb3JDb25maWdzW3NlbmRlci5nZXRUYWcoKV07XG4gICAgICAgIHRoaXMuc2VsZWN0Q29sb3JJbmRleCA9IHNlbmRlci5nZXRUYWcoKTtcbiAgICB9LFxuXG4gICAgcmVzZXRPbGRWaWV3OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGxvY2FsQ29sID0gMDsgbG9jYWxDb2wgPCB0aGlzLkNPTDsgKytsb2NhbENvbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgbG9jYWxSb3cgPSAwOyBsb2NhbFJvdyA8IHRoaXMuUk9XOyArK2xvY2FsUm93KSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyaWQgPSB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd107XG4gICAgICAgICAgICAgICAgZ3JpZC5yZW1vdmVGcm9tUGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ncmlkcyA9IFtdO1xuICAgIH0sXG5cbiAgICB1cGRhdGVWaWV3OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuQ09OVEVOVF9XSURUSCAvIHRoaXMuQ09MO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5DT05URU5UX0hFSUdIVCAvIHRoaXMuUk9XO1xuICAgICAgICB0aGlzLkdSSURfV0lEVEggPSB3aWR0aCAqIDAuNzU7XG4gICAgICAgIHRoaXMuR1JJRF9IRUlHSFQgPSBoZWlnaHQgKiAwLjc1O1xuICAgICAgICB0aGlzLkdBUF9XSURUSCA9IHdpZHRoIC0gdGhpcy5HUklEX1dJRFRIO1xuICAgICAgICB0aGlzLkdBUF9IRUlHSFQgPSBoZWlnaHQgLSB0aGlzLkdSSURfSEVJR0hUO1xuXG4gICAgICAgIHRoaXMuaW5pdEdyaWRzKCk7XG5cbiAgICAgICAgdGhpcy5icmlja1JlY3RzID0gW107XG4gICAgICAgIHRoaXMub2JzdGFjbGVSZWN0cyA9IFtdO1xuICAgICAgICB0aGlzLmN1cnJlbnRSZWN0cyA9IHRoaXMuYnJpY2tSZWN0cztcbiAgICAgICAgdGhpcy5faXNCcmljayA9IHRydWU7XG4gICAgICAgIHRoaXMuX2JyaWNrSXRlbS5zZXRTdHJpbmcoXCJCcmlja1wiKTtcblxuICAgICAgICB0aGlzLl9ncmlkTGFiZWwuc2V0U3RyaW5nKHRoaXMuQ09MICsgXCJ4XCIgKyB0aGlzLlJPVyk7XG4gICAgfSxcblxuICAgIG9uQWRkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmVzZXRPbGRWaWV3KCk7XG4gICAgICAgIHRoaXMuQ09MICs9IDQ7XG4gICAgICAgIHRoaXMuUk9XICs9IDQ7XG4gICAgICAgIHRoaXMudXBkYXRlVmlldygpO1xuICAgIH0sXG5cbiAgICBvblJlZHVjZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlc2V0T2xkVmlldygpO1xuICAgICAgICB0aGlzLkNPTCAtPSA0O1xuICAgICAgICB0aGlzLlJPVyAtPSA0O1xuICAgICAgICB0aGlzLnVwZGF0ZVZpZXcoKTtcbiAgICB9LFxuXG4gICAgb25TYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvYmogPSB7XG4gICAgICAgICAgICBwaXhlbFdpZHRoOiB0aGlzLkNPTlRFTlRfV0lEVEgsXG4gICAgICAgICAgICBwaXhlbEhlaWdodDogdGhpcy5DT05URU5UX0hFSUdIVCxcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLkNPTCxcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy5ST1csXG4gICAgICAgICAgICBicmlja3M6IHRoaXMuYnJpY2tSZWN0cyxcbiAgICAgICAgICAgIG9ic3RhY2xlczogdGhpcy5vYnN0YWNsZVJlY3RzXG4gICAgICAgIH07XG5cbiAgICAgICAgY2MubG9nKFwicmVzdWx0czpcIiArIEpTT04uc3RyaW5naWZ5KG9iaikpO1xuXG4gICAgICAgIC8vYWxlcnQoSlNPTi5zdHJpbmdpZnkob2JqKSk7XG4gICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KG9iaildKTtcbiAgICAgICAgdmFyIHRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICB0YWcuZG93bmxvYWQgPSBcImxldmVsLmpzb25cIjtcbiAgICAgICAgdGFnLmhyZWYgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICB0YWcuY2xpY2soKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChibG9iKTtcbiAgICB9LFxuXG4gICAgb25EZWxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5kZWxldGVMYXRlc3RSZWN0KCk7XG4gICAgfSxcblxuICAgIG9uUmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfSxcblxuICAgIG9uQnJpY2tUeXBlQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lzQnJpY2sgPSAhdGhpcy5faXNCcmljaztcbiAgICAgICAgaWYgKCF0aGlzLl9pc0JyaWNrKSB7XG4gICAgICAgICAgICB0aGlzLl9icmlja0l0ZW0uc2V0U3RyaW5nKFwiT2JzdGFjbGVcIik7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRSZWN0cyA9IHRoaXMub2JzdGFjbGVSZWN0cztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2JyaWNrSXRlbS5zZXRTdHJpbmcoXCJCcmlja1wiKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFJlY3RzID0gdGhpcy5icmlja1JlY3RzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluaXRHcmlkczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmdyaWRzID0gW107XG4gICAgICAgIHZhciBHcmlkID0gcmVxdWlyZShcIi4uL2VudGl0eS9HcmlkXCIpO1xuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IDA7IGxvY2FsQ29sIDwgdGhpcy5DT0w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZHMucHVzaChbXSk7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IDA7IGxvY2FsUm93IDwgdGhpcy5ST1c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JpZCA9IG5ldyBHcmlkKGNjLmNvbG9yLkdSQVksIHRoaXMuR1JJRF9XSURUSCwgdGhpcy5HUklEX0hFSUdIVCwgbG9jYWxDb2wsIGxvY2FsUm93KTtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWROb2RlLmFkZENoaWxkKGdyaWQpO1xuICAgICAgICAgICAgICAgIGdyaWQuc2V0UG9zaXRpb24odGhpcy5nZXRHcmlkUG9zKGxvY2FsQ29sLCBsb2NhbFJvdykpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdLnB1c2goZ3JpZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXJrR3JheUhpbnQoZ3JpZCwgbG9jYWxDb2wsIGxvY2FsUm93KTtcbiAgICAgICAgICAgICAgICBncmlkLl9jb2xvciA9IGdyaWQuY29sb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbWFya0dyYXlIaW50OiBmdW5jdGlvbiAoZ3JpZCwgbG9jYWxDb2wsIGxvY2FsUm93KSB7XG4gICAgICAgIHZhciBncmF5Q29sb3IgPSBjYy5jb2xvcig5MCwgOTAsIDkwKTtcbiAgICAgICAgdmFyIGlzTGVmdCA9ICh0aGlzLkNPTCAvIGxvY2FsQ29sKSA+IDI7XG4gICAgICAgIHZhciBpc0JvdHRvbSA9ICh0aGlzLlJPVyAvIGxvY2FsUm93KSA+IDI7XG4gICAgICAgIGlmIChsb2NhbENvbCA9PT0gTWF0aC5mbG9vcih0aGlzLkNPTCAvIDIpIHx8XG4gICAgICAgICAgICBsb2NhbENvbCA9PT0gTWF0aC5mbG9vcih0aGlzLkNPTCAvIDIpIC0gMSB8fFxuICAgICAgICAgICAgbG9jYWxSb3cgPT09IE1hdGguZmxvb3IodGhpcy5ST1cgLyAyKSB8fFxuICAgICAgICAgICAgbG9jYWxSb3cgPT09IE1hdGguZmxvb3IodGhpcy5ST1cgLyAyKSAtIDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBncmlkLnNldENvbG9yKGdyYXlDb2xvcik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaWlpID0gaXNMZWZ0ID8gNCA6IDA7XG5cbiAgICAgICAgaWYgKGxvY2FsQ29sICUgNSA9PT0gaWlpKSB7XG4gICAgICAgICAgICBncmlkLnNldENvbG9yKGdyYXlDb2xvcik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgampqID0gaXNCb3R0b20gPyA0IDogMDtcblxuICAgICAgICBpZiAobG9jYWxSb3cgJSA1ID09PSBqamopIHtcbiAgICAgICAgICAgIGdyaWQuc2V0Q29sb3IoZ3JheUNvbG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vaWlpID0gaXNMZWZ0ID8gOSA6IDA7XG4gICAgICAgIC8vampqID0gaXNCb3R0b20gPyA5IDogMDtcbiAgICAgICAgLy9cbiAgICAgICAgLy9pZiAobG9jYWxDb2wgJSAxMCA9PT0gaWlpICYmIGxvY2FsUm93ICUgMTAgPT09IGpqaikge1xuICAgICAgICAvLyAgICBncmlkLnNldENvbG9yKGNjLmNvbG9yLllFTExPVyk7XG4gICAgICAgIC8vfVxuICAgIH0sXG5cbiAgICByZXNldDogZnVuY3Rpb24gKCkge1xuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IDA7IGxvY2FsQ29sIDwgdGhpcy5DT0w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gMDsgbG9jYWxSb3cgPCB0aGlzLlJPVzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS5lZGl0aW5nID0gZmFsc2U7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddLnNldENvbG9yKGNjLmNvbG9yLkdSQVkpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS51c2VkID0gZmFsc2U7XG5cbiAgICAgICAgICAgICAgICB0aGlzLm1hcmtHcmF5SGludCh0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd10sIGxvY2FsQ29sLCBsb2NhbFJvdyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5icmlja1JlY3RzID0gW107XG4gICAgICAgIHRoaXMub2JzdGFjbGVSZWN0cyA9IFtdO1xuICAgICAgICB0aGlzLmN1cnJlbnRSZWN0cyA9IHRoaXMuYnJpY2tSZWN0cztcbiAgICAgICAgdGhpcy5faXNCcmljayA9IHRydWU7XG4gICAgICAgIHRoaXMuX2JyaWNrSXRlbS5zZXRTdHJpbmcoXCJCcmlja1wiKTtcbiAgICB9LFxuXG4gICAgb25FbnRlcjpmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX3N1cGVyKCk7XG4gICAgICAgIGNjLmV2ZW50TWFuYWdlci5hZGRMaXN0ZW5lcih7XG4gICAgICAgICAgICBldmVudDogY2MuRXZlbnRMaXN0ZW5lci5UT1VDSF9PTkVfQllfT05FLFxuICAgICAgICAgICAgc3dhbGxvd1RvdWNoZXM6IHRydWUsXG4gICAgICAgICAgICBvblRvdWNoQmVnYW46IHRoaXMub25Ub3VjaEJlZ2FuLmJpbmQodGhpcyksXG4gICAgICAgICAgICBvblRvdWNoTW92ZWQ6IHRoaXMub25Ub3VjaE1vdmVkLmJpbmQodGhpcyksXG4gICAgICAgICAgICBvblRvdWNoRW5kZWQ6IHRoaXMub25Ub3VjaEVuZGVkLmJpbmQodGhpcyksXG4gICAgICAgICAgICBvblRvdWNoQ2FuY2VsbGVkOiB0aGlzLm9uVG91Y2hDYW5jZWxsZWQuYmluZCh0aGlzKVxuICAgICAgICB9LCB0aGlzLmdyaWROb2RlKTtcblxuICAgICAgICAvL2NjLmV2ZW50TWFuYWdlci5hZGRMaXN0ZW5lcih7XG4gICAgICAgIC8vICAgIGV2ZW50OiBjYy5FdmVudExpc3RlbmVyLktFWUJPQVJELFxuICAgICAgICAvLyAgICBvbktleVJlbGVhc2VkOiBmdW5jdGlvbiAoa2V5Q29kZSwgZXZlbnQpIHtcbiAgICAgICAgLy8gICAgICAgIGlmIChrZXlDb2RlID09PSBjYy5LRVkuYmFja3NwYWNlKSB7XG4gICAgICAgIC8vICAgICAgICAgICAgLy9jYy5kaXJlY3Rvci5lbmQoKTtcbiAgICAgICAgLy8gICAgICAgICAgICB0aGlzLmRlbGV0ZUxhdGVzdFJlY3QoKTtcbiAgICAgICAgLy8gICAgICAgIH1cbiAgICAgICAgLy8gICAgfS5iaW5kKHRoaXMpXG4gICAgICAgIC8vfSwgdGhpcyk7XG4gICAgfSxcblxuICAgIG9uRXhpdDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zdXBlcigpO1xuICAgIH0sXG5cbiAgICBnZXRHcmlkUG9zOiBmdW5jdGlvbiAobG9jYWxDb2wsIGxvY2FsUm93KSB7XG4gICAgICAgIHZhciBncmlkU2l6ZSA9IHRoaXMuZ2V0R3JpZFNpemUoKTtcbiAgICAgICAgcmV0dXJuIGNjLnAoKGdyaWRTaXplLndpZHRoICsgdGhpcy5HQVBfV0lEVEgpICogKGxvY2FsQ29sICsgMC41KSxcbiAgICAgICAgICAgIChncmlkU2l6ZS5oZWlnaHQgKyB0aGlzLkdBUF9IRUlHSFQpICogKGxvY2FsUm93ICsgMC41KSk7XG4gICAgfSxcblxuICAgIGdldEdyaWRTaXplOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBjYy5zaXplKHRoaXMuR1JJRF9XSURUSCwgdGhpcy5HUklEX0hFSUdIVCk7XG4gICAgfSxcblxuICAgIGdldEZ1bGxHcmlkU2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY2Muc2l6ZSh0aGlzLkdSSURfV0lEVEggKyB0aGlzLkdBUF9XSURUSCwgdGhpcy5HUklEX0hFSUdIVCArIHRoaXMuR0FQX0hFSUdIVCk7XG4gICAgfSxcblxuICAgIG9uVG91Y2hCZWdhbjpmdW5jdGlvbih0b3VjaCwgZXZlbnQpIHtcbiAgICAgICAgdmFyIGdyaWQgPSB0aGlzLmdldENsb3Nlc3RHcmlkKHRvdWNoKTtcbiAgICAgICAgaWYgKGdyaWQudXNlZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHRoaXMuZmlyc3RHcmlkID0gZ3JpZDtcbiAgICAgICAgZ3JpZC5zZXRDb2xvcih0aGlzLmdldEN1cnJlbnRDb2xvcigpKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIG9uVG91Y2hNb3ZlZDpmdW5jdGlvbih0b3VjaCwgZXZlbnQpIHtcbiAgICAgICAgdGhpcy50b3VjaERyYXcodG91Y2gpO1xuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9LFxuXG4gICAgb25Ub3VjaEVuZGVkOmZ1bmN0aW9uKHRvdWNoLCBldmVudCkge1xuICAgICAgICB0aGlzLnRvdWNoRHJhdyh0b3VjaCk7XG5cbiAgICAgICAgaWYgKHRoaXMuZmlyc3RHcmlkICYmIHRoaXMubGFzdEdyaWQpIHtcbiAgICAgICAgICAgIHZhciByZWdpb24gPSB0aGlzLmdldFJlZ2lvbih0aGlzLmZpcnN0R3JpZCwgdGhpcy5sYXN0R3JpZCk7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSB0aGlzLnNlbGVjdENvbG9ySW5kZXggKyAxO1xuICAgICAgICAgICAgaWYgKCF0aGlzLl9pc0JyaWNrKSB7XG4gICAgICAgICAgICAgICAgaW5kZXggPSAwO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgdGhpcy5jdXJyZW50UmVjdHMucHVzaChbcmVnaW9uLm1pbkNvbCwgcmVnaW9uLm1pblJvdyxcbiAgICAgICAgICAgICAgICByZWdpb24ubWF4Q29sIC0gcmVnaW9uLm1pbkNvbCArIDEsIHJlZ2lvbi5tYXhSb3cgLSByZWdpb24ubWluUm93ICsgMSwgaW5kZXhdKTtcblxuICAgICAgICAgICAgdGhpcy5tYXJrT2NjdXBpZWQoKTtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsQ29sID0gMDsgbG9jYWxDb2wgPCB0aGlzLkNPTDsgKytsb2NhbENvbCkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gMDsgbG9jYWxSb3cgPCB0aGlzLlJPVzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgICAgICB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd10uZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICAgIHRoaXMuZmlyc3RHcmlkID0gbnVsbDtcbiAgICAgICAgdGhpcy5sYXN0R3JpZCA9IG51bGw7XG4gICAgfSxcblxuICAgIG1hcmtPY2N1cGllZDogZnVuY3Rpb24gKCkge1xuICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24odGhpcy5maXJzdEdyaWQsIHRoaXMubGFzdEdyaWQpO1xuXG4gICAgICAgIGZvciAodmFyIGxvY2FsQ29sID0gcmVnaW9uLm1pbkNvbDsgbG9jYWxDb2wgPD0gcmVnaW9uLm1heENvbDsgKytsb2NhbENvbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgbG9jYWxSb3cgPSByZWdpb24ubWluUm93OyBsb2NhbFJvdyA8PSByZWdpb24ubWF4Um93OyArK2xvY2FsUm93KSB7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddLnVzZWQgPSB0cnVlO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIGlzT2NjdXBpZWQ6IGZ1bmN0aW9uIChncmlkKSB7XG4gICAgICAgIHZhciByZWdpb24gPSB0aGlzLmdldFJlZ2lvbih0aGlzLmZpcnN0R3JpZCwgZ3JpZCk7XG4gICAgICAgIGZvciAodmFyIGxvY2FsQ29sID0gcmVnaW9uLm1pbkNvbDsgbG9jYWxDb2wgPD0gcmVnaW9uLm1heENvbDsgKytsb2NhbENvbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgbG9jYWxSb3cgPSByZWdpb24ubWluUm93OyBsb2NhbFJvdyA8PSByZWdpb24ubWF4Um93OyArK2xvY2FsUm93KSB7XG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS51c2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfSxcblxuICAgIHRvdWNoRHJhdzogZnVuY3Rpb24gKHRvdWNoKSB7XG4gICAgICAgIGlmICghdGhpcy5maXJzdEdyaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB2YXIgZ3JpZCA9IHRoaXMuZ2V0Q2xvc2VzdEdyaWQodG91Y2gpO1xuXG4gICAgICAgIGlmICghZ3JpZCkge1xuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKGdyaWQgPT09IHRoaXMubGFzdEdyaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh0aGlzLmlzT2NjdXBpZWQoZ3JpZCkpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmxhc3RHcmlkID0gZ3JpZDtcbiAgICAgICAgdGhpcy5jbGVhclJlY3QoKTtcbiAgICAgICAgdGhpcy5kcmF3UmVjdChncmlkKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIGRlbGV0ZUxhdGVzdFJlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlY3QgPSB0aGlzLmN1cnJlbnRSZWN0cy5wb3AoKTtcbiAgICAgICAgaWYgKHJlY3QpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsQ29sID0gcmVjdFswXTsgbG9jYWxDb2wgPCByZWN0WzBdICsgcmVjdFsyXTsgKytsb2NhbENvbCkge1xuICAgICAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gcmVjdFsxXTsgbG9jYWxSb3cgPCByZWN0WzFdICsgcmVjdFszXTsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgICAgICB2YXIgZ3JpZCA9IHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XTtcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC5zZXRDb2xvcihncmlkLl9jb2xvcik7XG4gICAgICAgICAgICAgICAgICAgIGdyaWQudXNlZCA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBjbGVhclJlY3Q6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yICh2YXIgbG9jYWxDb2wgPSAwOyBsb2NhbENvbCA8IHRoaXMuQ09MOyArK2xvY2FsQ29sKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IDA7IGxvY2FsUm93IDwgdGhpcy5ST1c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JpZCA9IHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XTtcbiAgICAgICAgICAgICAgICBpZiAoZ3JpZC5lZGl0aW5nICYmICFncmlkLnVzZWQpIHtcbiAgICAgICAgICAgICAgICAgICAgZ3JpZC5zZXRDb2xvcihncmlkLl9jb2xvcik7XG4gICAgICAgICAgICAgICAgICAgIGdyaWQuZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBkcmF3UmVjdDogZnVuY3Rpb24gKGdyaWQpIHtcbiAgICAgICAgdmFyIHJlZ2lvbiA9IHRoaXMuZ2V0UmVnaW9uKHRoaXMuZmlyc3RHcmlkLCBncmlkKTtcblxuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IHJlZ2lvbi5taW5Db2w7IGxvY2FsQ29sIDw9IHJlZ2lvbi5tYXhDb2w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gcmVnaW9uLm1pblJvdzsgbG9jYWxSb3cgPD0gcmVnaW9uLm1heFJvdzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS5lZGl0aW5nID0gdHJ1ZTtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd10uc2V0Q29sb3IodGhpcy5nZXRDdXJyZW50Q29sb3IoKSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZ2V0UmVnaW9uOiBmdW5jdGlvbiAoZ3JpZDEsIGdyaWQyKSB7XG4gICAgICAgIHZhciBtaW5Sb3cgPSBNYXRoLm1pbihncmlkMS5yb3csIGdyaWQyLnJvdyk7XG4gICAgICAgIHZhciBtYXhSb3cgPSBNYXRoLm1heChncmlkMS5yb3csIGdyaWQyLnJvdyk7XG4gICAgICAgIHZhciBtaW5Db2wgPSBNYXRoLm1pbihncmlkMS5jb2wsIGdyaWQyLmNvbCk7XG4gICAgICAgIHZhciBtYXhDb2wgPSBNYXRoLm1heChncmlkMS5jb2wsIGdyaWQyLmNvbCk7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBtaW5Sb3c6IG1pblJvdyxcbiAgICAgICAgICAgIG1heFJvdzogbWF4Um93LFxuICAgICAgICAgICAgbWluQ29sOiBtaW5Db2wsXG4gICAgICAgICAgICBtYXhDb2w6IG1heENvbFxuICAgICAgICB9O1xuICAgIH0sXG5cbiAgICBvblRvdWNoQ2FuY2VsbGVkOmZ1bmN0aW9uKHRvdWNoLCBldmVudCkge1xuICAgIH0sXG5cbiAgICBnZXRDbG9zZXN0R3JpZDogZnVuY3Rpb24gKHRvdWNoKSB7XG4gICAgICAgIHZhciBsb2NhbFBvcyA9IHRoaXMuZ3JpZE5vZGUuY29udmVydFRvTm9kZVNwYWNlKHRvdWNoLmdldExvY2F0aW9uKCkpO1xuICAgICAgICB2YXIgZ3JpZFNpemUgPSB0aGlzLmdldEZ1bGxHcmlkU2l6ZSgpO1xuXG4gICAgICAgIGNjLmxvZyhcImxvY2FsUG9zOlwiICsgSlNPTi5zdHJpbmdpZnkobG9jYWxQb3MpKTtcblxuICAgICAgICB2YXIgcm93ID0gTWF0aC5mbG9vcihsb2NhbFBvcy54IC8gZ3JpZFNpemUud2lkdGgpO1xuICAgICAgICB2YXIgY29sID0gTWF0aC5mbG9vcihsb2NhbFBvcy55IC8gZ3JpZFNpemUuaGVpZ2h0KTtcblxuICAgICAgICBjYy5sb2coXCJyb3c6XCIgKyByb3cgKyBcIixjb2w6XCIgKyBjb2wpO1xuXG4gICAgICAgIHJldHVybiB0aGlzLmdyaWRzW3Jvd11bY29sXTtcbiAgICB9LFxuXG4gICAgZ2V0Q3VycmVudENvbG9yOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGlmICh0aGlzLl9pc0JyaWNrKSB7XG4gICAgICAgICAgICByZXR1cm4gdGhpcy5zZWxlY3RDb2xvcjtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBjYy5jb2xvci5XSElURTtcbiAgICAgICAgfVxuICAgIH1cbiAgICAvL1xuICAgIC8vZHJhd1JlY3Q6IGZ1bmN0aW9uKHJlZ2lvbiwgY29sb3IsIGNsZWFyKSB7XG4gICAgLy8gICAgaWYgKGNsZWFyKXtcbiAgICAvLyAgICAgICAgdGhpcy5fZHJhd05vZGUuY2xlYXIoKTtcbiAgICAvLyAgICB9XG4gICAgLy8gICAgaWYgKHJlZ2lvbiA9PSBudWxsKSB7XG4gICAgLy8gICAgICAgIHJldHVybjtcbiAgICAvLyAgICB9XG4gICAgLy8gICAgdmFyIG1pbiA9IHJlZ2lvbi5nZXRNaW4oKTtcbiAgICAvLyAgICB2YXIgbWF4ID0gcmVnaW9uLmdldE1heCgpO1xuICAgIC8vICAgIG1heC54ICs9IDE7XG4gICAgLy8gICAgbWF4LnkgKz0gMTtcbiAgICAvLyAgICB0aGlzLl9kcmF3Tm9kZS5kcmF3U2VnbWVudChjYy5wKG1pbi54LCBtaW4ueSksXG4gICAgLy8gICAgICAgIGNjLnAobWluLngsIG1heC55KSwgMSwgY29sb3IpO1xuICAgIC8vICAgIHRoaXMuX2RyYXdOb2RlLmRyYXdTZWdtZW50KGNjLnAobWluLngsIG1heC55KSxcbiAgICAvLyAgICAgICAgY2MucChtYXgueCwgbWF4LnkpLCAxLCBjb2xvcik7XG4gICAgLy8gICAgdGhpcy5fZHJhd05vZGUuZHJhd1NlZ21lbnQoY2MucChtYXgueCwgbWF4LnkpLFxuICAgIC8vICAgICAgICBjYy5wKG1heC54LCBtaW4ueSksIDEsIGNvbG9yKTtcbiAgICAvLyAgICB0aGlzLl9kcmF3Tm9kZS5kcmF3U2VnbWVudChjYy5wKG1heC54LCBtaW4ueSksXG4gICAgLy8gICAgICAgIGNjLnAobWluLngsIG1pbi55KSwgMSwgY29sb3IpO1xuICAgIC8vfSxcbiAgICAvL1xuICAgIC8vZHJhd1JlY3RGaWxsOiBmdW5jdGlvbiAocmVnaW9uLCBjb2xvcikge1xuICAgIC8vICAgIGlmIChyZWdpb24gPT0gbnVsbCkge1xuICAgIC8vICAgICAgICByZXR1cm47XG4gICAgLy8gICAgfVxuICAgIC8vICAgIHRoaXMuX2RyYXdOb2RlLmRyYXdSZWN0KHJlZ2lvbi5nZXRNaW4oKSwgcmVnaW9uLmdldE1heCgpLCBjb2xvciwgMSwgY29sb3IpO1xuICAgIC8vfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gRWRpdG9yU2NlbmU7IiwiLyoqXG4gKiBBIGJyaWVmIGV4cGxhbmF0aW9uIGZvciBcInByb2plY3QuanNvblwiOlxuICogSGVyZSBpcyB0aGUgY29udGVudCBvZiBwcm9qZWN0Lmpzb24gZmlsZSwgdGhpcyBpcyB0aGUgZ2xvYmFsIGNvbmZpZ3VyYXRpb24gZm9yIHlvdXIgZ2FtZSwgeW91IGNhbiBtb2RpZnkgaXQgdG8gY3VzdG9taXplIHNvbWUgYmVoYXZpb3IuXG4gKiBUaGUgZGV0YWlsIG9mIGVhY2ggZmllbGQgaXMgdW5kZXIgaXQuXG4ge1xuICAgIFwicHJvamVjdF90eXBlXCI6IFwiamF2YXNjcmlwdFwiLFxuICAgIC8vIFwicHJvamVjdF90eXBlXCIgaW5kaWNhdGUgdGhlIHByb2dyYW0gbGFuZ3VhZ2Ugb2YgeW91ciBwcm9qZWN0LCB5b3UgY2FuIGlnbm9yZSB0aGlzIGZpZWxkXG5cbiAgICBcImRlYnVnTW9kZVwiICAgICA6IDEsXG4gICAgLy8gXCJkZWJ1Z01vZGVcIiBwb3NzaWJsZSB2YWx1ZXMgOlxuICAgIC8vICAgICAgMCAtIE5vIG1lc3NhZ2Ugd2lsbCBiZSBwcmludGVkLlxuICAgIC8vICAgICAgMSAtIGNjLmVycm9yLCBjYy5hc3NlcnQsIGNjLndhcm4sIGNjLmxvZyB3aWxsIHByaW50IGluIGNvbnNvbGUuXG4gICAgLy8gICAgICAyIC0gY2MuZXJyb3IsIGNjLmFzc2VydCwgY2Mud2FybiB3aWxsIHByaW50IGluIGNvbnNvbGUuXG4gICAgLy8gICAgICAzIC0gY2MuZXJyb3IsIGNjLmFzc2VydCB3aWxsIHByaW50IGluIGNvbnNvbGUuXG4gICAgLy8gICAgICA0IC0gY2MuZXJyb3IsIGNjLmFzc2VydCwgY2Mud2FybiwgY2MubG9nIHdpbGwgcHJpbnQgb24gY2FudmFzLCBhdmFpbGFibGUgb25seSBvbiB3ZWIuXG4gICAgLy8gICAgICA1IC0gY2MuZXJyb3IsIGNjLmFzc2VydCwgY2Mud2FybiB3aWxsIHByaW50IG9uIGNhbnZhcywgYXZhaWxhYmxlIG9ubHkgb24gd2ViLlxuICAgIC8vICAgICAgNiAtIGNjLmVycm9yLCBjYy5hc3NlcnQgd2lsbCBwcmludCBvbiBjYW52YXMsIGF2YWlsYWJsZSBvbmx5IG9uIHdlYi5cblxuICAgIFwic2hvd0ZQU1wiICAgICAgIDogdHJ1ZSxcbiAgICAvLyBMZWZ0IGJvdHRvbSBjb3JuZXIgZnBzIGluZm9ybWF0aW9uIHdpbGwgc2hvdyB3aGVuIFwic2hvd0ZQU1wiIGVxdWFscyB0cnVlLCBvdGhlcndpc2UgaXQgd2lsbCBiZSBoaWRlLlxuXG4gICAgXCJmcmFtZVJhdGVcIiAgICAgOiA2MCxcbiAgICAvLyBcImZyYW1lUmF0ZVwiIHNldCB0aGUgd2FudGVkIGZyYW1lIHJhdGUgZm9yIHlvdXIgZ2FtZSwgYnV0IHRoZSByZWFsIGZwcyBkZXBlbmRzIG9uIHlvdXIgZ2FtZSBpbXBsZW1lbnRhdGlvbiBhbmQgdGhlIHJ1bm5pbmcgZW52aXJvbm1lbnQuXG5cbiAgICBcImlkXCIgICAgICAgICAgICA6IFwiZ2FtZUNhbnZhc1wiLFxuICAgIC8vIFwiZ2FtZUNhbnZhc1wiIHNldHMgdGhlIGlkIG9mIHlvdXIgY2FudmFzIGVsZW1lbnQgb24gdGhlIHdlYiBwYWdlLCBpdCdzIHVzZWZ1bCBvbmx5IG9uIHdlYi5cblxuICAgIFwicmVuZGVyTW9kZVwiICAgIDogMCxcbiAgICAvLyBcInJlbmRlck1vZGVcIiBzZXRzIHRoZSByZW5kZXJlciB0eXBlLCBvbmx5IHVzZWZ1bCBvbiB3ZWIgOlxuICAgIC8vICAgICAgMCAtIEF1dG9tYXRpY2FsbHkgY2hvc2VuIGJ5IGVuZ2luZVxuICAgIC8vICAgICAgMSAtIEZvcmNlZCB0byB1c2UgY2FudmFzIHJlbmRlcmVyXG4gICAgLy8gICAgICAyIC0gRm9yY2VkIHRvIHVzZSBXZWJHTCByZW5kZXJlciwgYnV0IHRoaXMgd2lsbCBiZSBpZ25vcmVkIG9uIG1vYmlsZSBicm93c2Vyc1xuXG4gICAgXCJlbmdpbmVEaXJcIiAgICAgOiBcImZyYW1ld29ya3MvY29jb3MyZC1odG1sNS9cIixcbiAgICAvLyBJbiBkZWJ1ZyBtb2RlLCBpZiB5b3UgdXNlIHRoZSB3aG9sZSBlbmdpbmUgdG8gZGV2ZWxvcCB5b3VyIGdhbWUsIHlvdSBzaG91bGQgc3BlY2lmeSBpdHMgcmVsYXRpdmUgcGF0aCB3aXRoIFwiZW5naW5lRGlyXCIsXG4gICAgLy8gYnV0IGlmIHlvdSBhcmUgdXNpbmcgYSBzaW5nbGUgZW5naW5lIGZpbGUsIHlvdSBjYW4gaWdub3JlIGl0LlxuXG4gICAgXCJtb2R1bGVzXCIgICAgICAgOiBbXCJjb2NvczJkXCJdLFxuICAgIC8vIFwibW9kdWxlc1wiIGRlZmluZXMgd2hpY2ggbW9kdWxlcyB5b3Ugd2lsbCBuZWVkIGluIHlvdXIgZ2FtZSwgaXQncyB1c2VmdWwgb25seSBvbiB3ZWIsXG4gICAgLy8gdXNpbmcgdGhpcyBjYW4gZ3JlYXRseSByZWR1Y2UgeW91ciBnYW1lJ3MgcmVzb3VyY2Ugc2l6ZSwgYW5kIHRoZSBjb2NvcyBjb25zb2xlIHRvb2wgY2FuIHBhY2thZ2UgeW91ciBnYW1lIHdpdGggb25seSB0aGUgbW9kdWxlcyB5b3Ugc2V0LlxuICAgIC8vIEZvciBkZXRhaWxzIGFib3V0IG1vZHVsZXMgZGVmaW5pdGlvbnMsIHlvdSBjYW4gcmVmZXIgdG8gXCIuLi8uLi9mcmFtZXdvcmtzL2NvY29zMmQtaHRtbDUvbW9kdWxlc0NvbmZpZy5qc29uXCIuXG5cbiAgICBcImpzTGlzdFwiICAgICAgICA6IFtcbiAgICBdXG4gICAgLy8gXCJqc0xpc3RcIiBzZXRzIHRoZSBsaXN0IG9mIGpzIGZpbGVzIGluIHlvdXIgZ2FtZS5cbiB9XG4gKlxuICovXG5cbmNjLmdhbWUub25TdGFydCA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghY2Muc3lzLmlzTmF0aXZlICYmIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29jb3NMb2FkaW5nXCIpKVxuICAgICAgICBkb2N1bWVudC5ib2R5LnJlbW92ZUNoaWxkKGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiY29jb3NMb2FkaW5nXCIpKTtcblxuICAgIGNjLnZpZXcuZW5hYmxlUmV0aW5hKGZhbHNlKTtcbiAgICBjYy52aWV3LmFkanVzdFZpZXdQb3J0KHRydWUpO1xuXG4gICAgLypcbiAgICB2YXIgTG9naWNNYW4gPSByZXF1aXJlKFwiLi9jb21tb24vbW9kZWwvTG9naWNNYW5cIik7XG4gICAgTG9naWNNYW4uZ2V0SW5zdGFuY2UoKS5pbml0KCk7XG5cbiAgICB2YXIgVXRpbHMgPSByZXF1aXJlKFwiLi9jb21tb24vdXRpbC9VdGlsc1wiKTtcbiAgICBpZiAoY2Muc3lzLmlzTmF0aXZlKSB7XG4gICAgICAgIHZhciB3aWR0aCA9IDA7XG4gICAgICAgIHZhciBoZWlnaHQgPSAwO1xuICAgICAgICBpZiAoISFHYW1lQnJpZGdlLmdldENvbmZpZygpLmhvcml6b250YWxHYW1lKSB7XG4gICAgICAgICAgICBoZWlnaHQgPSA2NDA7XG4gICAgICAgICAgICBpZiAoVXRpbHMuaXNQYWQoKSkge1xuICAgICAgICAgICAgICAgIGhlaWdodCA9IDc2ODtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHdpZHRoID0gaGVpZ2h0ICogY2Mud2luU2l6ZS53aWR0aCAvIGNjLndpblNpemUuaGVpZ2h0O1xuICAgICAgICAgICAgY2MubG9nKFwiY2Mud2luU2l6ZS53aWR0aDpcIiArIGNjLndpblNpemUud2lkdGgpO1xuICAgICAgICAgICAgY2MubG9nKFwiY2Mud2luU2l6ZS5oZWlnaHQ6XCIgKyBjYy53aW5TaXplLmhlaWdodCk7XG5cbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGhlaWdodCA9IDExMzY7XG4gICAgICAgICAgICBpZiAoVXRpbHMuaXNQYWQoKSkge1xuICAgICAgICAgICAgICAgIGhlaWdodCA9IDEwMjQ7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aWR0aCA9IGhlaWdodCAqIGNjLndpblNpemUud2lkdGggLyBjYy53aW5TaXplLmhlaWdodDtcbiAgICAgICAgfVxuICAgICAgICBjYy5sb2coXCJ3aWR0aDpcIiArIHdpZHRoKTtcbiAgICAgICAgY2MubG9nKFwiaGVpZ2h0OlwiICsgaGVpZ2h0KTtcbiAgICAgICAgY2Mudmlldy5zZXREZXNpZ25SZXNvbHV0aW9uU2l6ZSh3aWR0aCwgaGVpZ2h0LCBjYy5SZXNvbHV0aW9uUG9saWN5LlNIT1dfQUxMKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAoISFHYW1lQnJpZGdlLmdldENvbmZpZygpLmhvcml6b250YWxHYW1lKSB7XG4gICAgICAgICAgICBjYy52aWV3LnNldERlc2lnblJlc29sdXRpb25TaXplKDk2MCwgNjQwLCBjYy5SZXNvbHV0aW9uUG9saWN5LlNIT1dfQUxMKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNjLnZpZXcuc2V0RGVzaWduUmVzb2x1dGlvblNpemUoNjQwLCA5NjAsIGNjLlJlc29sdXRpb25Qb2xpY3kuU0hPV19BTEwpO1xuICAgICAgICB9XG4gICAgfVxuXG4gICAgLy8gVGhlIGdhbWUgd2lsbCBiZSByZXNpemVkIHdoZW4gYnJvd3NlciBzaXplIGNoYW5nZVxuICAgIGNjLkJ1aWxkZXJSZWFkZXIuc2V0UmVzb3VyY2VQYXRoKFwicmVzL1wiKTtcbiAgICBjYy52aWV3LnJlc2l6ZVdpdGhCcm93c2VyU2l6ZSh0cnVlKTtcblxuICAgIGdhbWUuZGlhbG9nTWFuYWdlci5jcmVhdGVPdmVybGF5KCk7XG5cbiAgICBpZiAoY2Muc3lzLmlzTmF0aXZlKSB7XG4gICAgICAgIGdhbWUubG9jYWwucmVsb2FkKCk7XG4gICAgICAgIGNjLmRpcmVjdG9yLnJ1blNjZW5lKG5ldyBHYW1lQnJpZGdlLmdldE1lbnVTY2VuZSgpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICBjYy5sb2FkZXIubG9hZEpzb24oXCJyZXMvcmVzb3VyY2VfbGlzdC9yZXNvdXJjZV9saXN0Lmpzb25cIiwgZnVuY3Rpb24gKGVycm9yLCByZXN1bHQpIHtcbiAgICAgICAgICAgIGlmICghZXJyb3IpIHtcbiAgICAgICAgICAgICAgICBjYy5Mb2FkZXJTY2VuZS5wcmVsb2FkKHJlc3VsdCwgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgICAgICAgICBnYW1lLmxvY2FsLnJlbG9hZCgpO1xuICAgICAgICAgICAgICAgICAgICBjYy5kaXJlY3Rvci5ydW5TY2VuZShHYW1lQnJpZGdlLmdldE1lbnVTY2VuZSgpKTtcbiAgICAgICAgICAgICAgICB9LCB0aGlzKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSk7XG4gICAgfVxuICAgICovXG4gICAgY2Mudmlldy5yZXNpemVXaXRoQnJvd3NlclNpemUodHJ1ZSk7XG4gICAgY2Mudmlldy5zZXREZXNpZ25SZXNvbHV0aW9uU2l6ZSgxMDAwLCA3MDAsIGNjLlJlc29sdXRpb25Qb2xpY3kuU0hPV19BTEwpO1xuICAgIGNjLkxvYWRlclNjZW5lLnByZWxvYWQoW10sIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIEVkaXRvclNjZW5lID0gcmVxdWlyZShcIi4vZWRpdG9yL3NjZW5lL0VkaXRvclNjZW5lXCIpO1xuICAgICAgICBjYy5kaXJlY3Rvci5ydW5TY2VuZShuZXcgRWRpdG9yU2NlbmUoKSk7XG4gICAgfSk7XG59O1xuY2MuZ2FtZS5ydW4oKTtcbiJdfQ==
