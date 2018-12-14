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

        iii = isLeft ? 9 : 0;
        jjj = isBottom ? 9 : 0;

        if (localCol % 10 === iii && localRow % 10 === jjj) {
            grid.setColor(cc.color.YELLOW);
        }
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3Vzci9sb2NhbC9saWIvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsImVkaXRvci9lbnRpdHkvR3JpZC5qcyIsImVkaXRvci9zY2VuZS9FZGl0b3JTY2VuZS5qcyIsImVkaXRvckxvYWRlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1ZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIi8qKlxuICogQ3JlYXRlZCBieSBxaW5uaW5nIG9uIDIwMTcvMTIvMi5cbiAqL1xuXG52YXIgR3JpZCA9IGNjLkxheWVyQ29sb3IuZXh0ZW5kKHtcblxuICAgIGNvbDogMCxcbiAgICByb3c6IDAsXG5cbiAgICBlZGl0aW5nOiBmYWxzZSxcbiAgICB1c2VkOiBmYWxzZSxcblxuICAgIGN0b3I6IGZ1bmN0aW9uIChjb2xvciwgd2lkdGgsIGhlaWdodCwgY29sLCByb3cpIHtcbiAgICAgICAgdGhpcy5fc3VwZXIoY29sb3IsIHdpZHRoLCBoZWlnaHQpO1xuICAgICAgICB0aGlzLmlnbm9yZUFuY2hvciA9IGZhbHNlO1xuICAgICAgICAvL3RoaXMudHlwZSA9IHR5cGU7XG4gICAgICAgIHRoaXMuY29sID0gY29sO1xuICAgICAgICB0aGlzLnJvdyA9IHJvdztcbiAgICB9LFxuXG4gICAgc2V0Q29sb3I6IGZ1bmN0aW9uIChjb2xvcikge1xuICAgICAgICB0aGlzLl9zdXBlcihjb2xvcik7XG4gICAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gR3JpZDsiLCJcbnZhciBDb2xvckNvbmZpZ3MgPSBbXG4gICAgY2MuY29sb3IoMjUyLCAxNzgsIDApLFxuICAgIGNjLmNvbG9yKDgxLCAyMjksIDEyKSxcbiAgICBjYy5jb2xvcigyNywgMjI2LCAyNTUpLFxuICAgIGNjLmNvbG9yKDI1NSwgMjUyLCAyOSksXG4gICAgY2MuY29sb3IoMjU1LCA1NiwgNTYpLFxuICAgIGNjLmNvbG9yKDI0OCwgNzAsIDI1NSksXG4gICAgY2MuY29sb3IoMjU1LCAxMjksIDE3KSxcbiAgICBjYy5jb2xvcig1NywgMTAzLCAyNDkpLFxuICAgIGNjLmNvbG9yKDkwLCAxODEsIDExMClcbl07XG5cbnZhciBFZGl0b3JTY2VuZSA9IGNjLlNjZW5lLmV4dGVuZCh7XG5cbiAgICBDT05URU5UX1dJRFRIOiA2MDAsXG4gICAgQ09OVEVOVF9IRUlHSFQ6IDYwMCxcblxuICAgIENPTDogNTAsXG4gICAgUk9XOiA1MCxcblxuICAgIEdSSURfV0lEVEg6IDksXG4gICAgR1JJRF9IRUlHSFQ6IDksXG5cbiAgICBHQVBfV0lEVEg6IDMsXG4gICAgR0FQX0hFSUdIVDogMyxcblxuICAgIGJyaWNrUmVjdHM6IG51bGwsXG5cbiAgICBvYnN0YWNsZVJlY3RzOiBudWxsLFxuXG4gICAgX2lzQnJpY2s6IHRydWUsXG5cbiAgICBfYnJpY2tJdGVtOiBudWxsLFxuXG4gICAgY3RvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zdXBlcigpO1xuXG4gICAgICAgIHRoaXMueE9mZnNldCA9IChjYy53aW5TaXplLndpZHRoIC0gdGhpcy5DT05URU5UX1dJRFRIKSAqIDAuNTtcbiAgICAgICAgdGhpcy55T2Zmc2V0ID0gKGNjLndpblNpemUuaGVpZ2h0IC0gdGhpcy5DT05URU5UX0hFSUdIVCkgKiAwLjU7XG5cbiAgICAgICAgdGhpcy5icmlja1JlY3RzID0gW107XG4gICAgICAgIHRoaXMub2JzdGFjbGVSZWN0cyA9IFtdO1xuXG4gICAgICAgIHRoaXMuY3VycmVudFJlY3RzID0gdGhpcy5icmlja1JlY3RzO1xuICAgICAgICB0aGlzLnNlbGVjdENvbG9yID0gQ29sb3JDb25maWdzWzBdO1xuICAgICAgICB0aGlzLnNlbGVjdENvbG9ySW5kZXggPSAwO1xuXG4gICAgICAgIHRoaXMuZ3JpZE5vZGUgPSBuZXcgY2MuTm9kZSgpO1xuICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuZ3JpZE5vZGUpO1xuICAgICAgICB0aGlzLmdyaWROb2RlLnggPSB0aGlzLnhPZmZzZXQ7XG5cbiAgICAgICAgdGhpcy5pbml0R3JpZHMoKTtcbiAgICAgICAgdGhpcy5pbml0QnV0dG9ucygpO1xuICAgICAgICB0aGlzLmluaXRDb2xvckJ1dHRvbnMoKTtcbiAgICB9LFxuXG4gICAgaW5pdEJ1dHRvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgLy8gQnVncyBJdGVtXG4gICAgICAgIHZhciBicmlja0l0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiQnJpY2tcIiwgdGhpcy5vbkJyaWNrVHlwZUNoYW5nZSwgdGhpcyk7XG4gICAgICAgIHZhciBzYXZlSXRlbSA9IG5ldyBjYy5NZW51SXRlbUZvbnQoXCJTYXZlXCIsIHRoaXMub25TYXZlLCB0aGlzKTtcbiAgICAgICAgdmFyIGRlbGV0ZUl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiRGVsZXRlXCIsIHRoaXMub25EZWxldGUsIHRoaXMpO1xuICAgICAgICB2YXIgcmVmcmVzaEl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiUmVmcmVzaFwiLCB0aGlzLm9uUmVmcmVzaCwgdGhpcyk7XG4gICAgICAgIHZhciBhZGRJdGVtID0gbmV3IGNjLk1lbnVJdGVtRm9udChcIkFkZFwiLCB0aGlzLm9uQWRkLCB0aGlzKTtcbiAgICAgICAgdmFyIHJlZHVjZUl0ZW0gPSBuZXcgY2MuTWVudUl0ZW1Gb250KFwiUmVkdWNlXCIsIHRoaXMub25SZWR1Y2UsIHRoaXMpO1xuICAgICAgICB2YXIgbWVudSA9IG5ldyBjYy5NZW51KGJyaWNrSXRlbSwgc2F2ZUl0ZW0sIGRlbGV0ZUl0ZW0sIHJlZnJlc2hJdGVtLCBhZGRJdGVtLCByZWR1Y2VJdGVtKTtcblxuICAgICAgICBtZW51LmFsaWduSXRlbXNIb3Jpem9udGFsbHkoKTtcbiAgICAgICAgdGhpcy5hZGRDaGlsZChtZW51KTtcbiAgICAgICAgbWVudS5zZXRQb3NpdGlvbihjYy5wKGNjLndpblNpemUud2lkdGggKiAwLjUsIGNjLndpblNpemUuaGVpZ2h0IC0gMjApKTtcbiAgICAgICAgdGhpcy5fYnJpY2tJdGVtID0gYnJpY2tJdGVtO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbCA9IG5ldyBjYy5MYWJlbFRURihcIlwiLCBcIkFyaWFsXCIsIDI0KTtcbiAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLl9ncmlkTGFiZWwpO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbC5zZXRBbmNob3JQb2ludChjYy5wKDAsIDAuNSkpO1xuXG4gICAgICAgIHRoaXMuX2dyaWRMYWJlbC5zZXRQb3NpdGlvbihjYy5wKGNjLndpblNpemUud2lkdGggKiAwLjUsIGNjLndpblNpemUuaGVpZ2h0IC0gODApKTtcblxuICAgICAgICB0aGlzLl9ncmlkTGFiZWwuc2V0U3RyaW5nKHRoaXMuQ09MICsgXCJ4XCIgKyB0aGlzLlJPVyk7XG4gICAgfSxcblxuICAgIGluaXRDb2xvckJ1dHRvbnM6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGl0ZW1zID0gW107XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgQ29sb3JDb25maWdzLmxlbmd0aDsgKytpKSB7XG4gICAgICAgICAgICB2YXIgY29sb3JJdGVtID0gbmV3IGNjLk1lbnVJdGVtRm9udChcIiBPIFwiLCB0aGlzLm9uU2VsZWN0Q29sb3IsIHRoaXMpO1xuICAgICAgICAgICAgY29sb3JJdGVtLnNldENvbG9yKENvbG9yQ29uZmlnc1tpXSk7XG4gICAgICAgICAgICBjb2xvckl0ZW0uc2V0VGFnKGkpO1xuICAgICAgICAgICAgaXRlbXMucHVzaChjb2xvckl0ZW0pO1xuICAgICAgICB9XG4gICAgICAgIHZhciBtZW51ID0gbmV3IGNjLk1lbnUoaXRlbXMpO1xuICAgICAgICBtZW51LmFsaWduSXRlbXNIb3Jpem9udGFsbHkoKTtcbiAgICAgICAgbWVudS5zZXRQb3NpdGlvbihjYy5wKGNjLndpblNpemUud2lkdGggKiAwLjUsIGNjLndpblNpemUuaGVpZ2h0IC0gNTUpKTtcbiAgICAgICAgdGhpcy5hZGRDaGlsZChtZW51KTtcbiAgICB9LFxuXG4gICAgb25TZWxlY3RDb2xvcjogZnVuY3Rpb24gKHNlbmRlcikge1xuICAgICAgICB0aGlzLnNlbGVjdENvbG9yID0gQ29sb3JDb25maWdzW3NlbmRlci5nZXRUYWcoKV07XG4gICAgICAgIHRoaXMuc2VsZWN0Q29sb3JJbmRleCA9IHNlbmRlci5nZXRUYWcoKTtcbiAgICB9LFxuXG4gICAgcmVzZXRPbGRWaWV3OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGxvY2FsQ29sID0gMDsgbG9jYWxDb2wgPCB0aGlzLkNPTDsgKytsb2NhbENvbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgbG9jYWxSb3cgPSAwOyBsb2NhbFJvdyA8IHRoaXMuUk9XOyArK2xvY2FsUm93KSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyaWQgPSB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd107XG4gICAgICAgICAgICAgICAgZ3JpZC5yZW1vdmVGcm9tUGFyZW50KCk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5ncmlkcyA9IFtdO1xuICAgIH0sXG5cbiAgICB1cGRhdGVWaWV3OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciB3aWR0aCA9IHRoaXMuQ09OVEVOVF9XSURUSCAvIHRoaXMuQ09MO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gdGhpcy5DT05URU5UX0hFSUdIVCAvIHRoaXMuUk9XO1xuICAgICAgICB0aGlzLkdSSURfV0lEVEggPSB3aWR0aCAqIDAuNzU7XG4gICAgICAgIHRoaXMuR1JJRF9IRUlHSFQgPSBoZWlnaHQgKiAwLjc1O1xuICAgICAgICB0aGlzLkdBUF9XSURUSCA9IHdpZHRoIC0gdGhpcy5HUklEX1dJRFRIO1xuICAgICAgICB0aGlzLkdBUF9IRUlHSFQgPSBoZWlnaHQgLSB0aGlzLkdSSURfSEVJR0hUO1xuXG4gICAgICAgIHRoaXMuaW5pdEdyaWRzKCk7XG5cbiAgICAgICAgdGhpcy5icmlja1JlY3RzID0gW107XG4gICAgICAgIHRoaXMub2JzdGFjbGVSZWN0cyA9IFtdO1xuICAgICAgICB0aGlzLmN1cnJlbnRSZWN0cyA9IHRoaXMuYnJpY2tSZWN0cztcbiAgICAgICAgdGhpcy5faXNCcmljayA9IHRydWU7XG4gICAgICAgIHRoaXMuX2JyaWNrSXRlbS5zZXRTdHJpbmcoXCJCcmlja1wiKTtcblxuICAgICAgICB0aGlzLl9ncmlkTGFiZWwuc2V0U3RyaW5nKHRoaXMuQ09MICsgXCJ4XCIgKyB0aGlzLlJPVyk7XG4gICAgfSxcblxuICAgIG9uQWRkOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMucmVzZXRPbGRWaWV3KCk7XG4gICAgICAgIHRoaXMuQ09MICs9IDQ7XG4gICAgICAgIHRoaXMuUk9XICs9IDQ7XG4gICAgICAgIHRoaXMudXBkYXRlVmlldygpO1xuICAgIH0sXG5cbiAgICBvblJlZHVjZTogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlc2V0T2xkVmlldygpO1xuICAgICAgICB0aGlzLkNPTCAtPSA0O1xuICAgICAgICB0aGlzLlJPVyAtPSA0O1xuICAgICAgICB0aGlzLnVwZGF0ZVZpZXcoKTtcbiAgICB9LFxuXG4gICAgb25TYXZlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBvYmogPSB7XG4gICAgICAgICAgICBwaXhlbFdpZHRoOiB0aGlzLkNPTlRFTlRfV0lEVEgsXG4gICAgICAgICAgICBwaXhlbEhlaWdodDogdGhpcy5DT05URU5UX0hFSUdIVCxcbiAgICAgICAgICAgIHdpZHRoOiB0aGlzLkNPTCxcbiAgICAgICAgICAgIGhlaWdodDogdGhpcy5ST1csXG4gICAgICAgICAgICBicmlja3M6IHRoaXMuYnJpY2tSZWN0cyxcbiAgICAgICAgICAgIG9ic3RhY2xlczogdGhpcy5vYnN0YWNsZVJlY3RzXG4gICAgICAgIH07XG5cbiAgICAgICAgY2MubG9nKFwicmVzdWx0czpcIiArIEpTT04uc3RyaW5naWZ5KG9iaikpO1xuXG4gICAgICAgIC8vYWxlcnQoSlNPTi5zdHJpbmdpZnkob2JqKSk7XG4gICAgICAgIHZhciBibG9iID0gbmV3IEJsb2IoW0pTT04uc3RyaW5naWZ5KG9iaildKTtcbiAgICAgICAgdmFyIHRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJhXCIpO1xuICAgICAgICB0YWcuZG93bmxvYWQgPSBcImxldmVsLmpzb25cIjtcbiAgICAgICAgdGFnLmhyZWYgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGJsb2IpO1xuICAgICAgICB0YWcuY2xpY2soKTtcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTChibG9iKTtcbiAgICB9LFxuXG4gICAgb25EZWxldGU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5kZWxldGVMYXRlc3RSZWN0KCk7XG4gICAgfSxcblxuICAgIG9uUmVmcmVzaDogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLnJlc2V0KCk7XG4gICAgfSxcblxuICAgIG9uQnJpY2tUeXBlQ2hhbmdlOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHRoaXMuX2lzQnJpY2sgPSAhdGhpcy5faXNCcmljaztcbiAgICAgICAgaWYgKCF0aGlzLl9pc0JyaWNrKSB7XG4gICAgICAgICAgICB0aGlzLl9icmlja0l0ZW0uc2V0U3RyaW5nKFwiT2JzdGFjbGVcIik7XG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRSZWN0cyA9IHRoaXMub2JzdGFjbGVSZWN0cztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHRoaXMuX2JyaWNrSXRlbS5zZXRTdHJpbmcoXCJCcmlja1wiKTtcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFJlY3RzID0gdGhpcy5icmlja1JlY3RzO1xuICAgICAgICB9XG4gICAgfSxcblxuICAgIGluaXRHcmlkczogZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLmdyaWRzID0gW107XG4gICAgICAgIHZhciBHcmlkID0gcmVxdWlyZShcIi4uL2VudGl0eS9HcmlkXCIpO1xuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IDA7IGxvY2FsQ29sIDwgdGhpcy5DT0w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIHRoaXMuZ3JpZHMucHVzaChbXSk7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IDA7IGxvY2FsUm93IDwgdGhpcy5ST1c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICB2YXIgZ3JpZCA9IG5ldyBHcmlkKGNjLmNvbG9yLkdSQVksIHRoaXMuR1JJRF9XSURUSCwgdGhpcy5HUklEX0hFSUdIVCwgbG9jYWxDb2wsIGxvY2FsUm93KTtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWROb2RlLmFkZENoaWxkKGdyaWQpO1xuICAgICAgICAgICAgICAgIGdyaWQuc2V0UG9zaXRpb24odGhpcy5nZXRHcmlkUG9zKGxvY2FsQ29sLCBsb2NhbFJvdykpO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdLnB1c2goZ3JpZCk7XG4gICAgICAgICAgICAgICAgdGhpcy5tYXJrR3JheUhpbnQoZ3JpZCwgbG9jYWxDb2wsIGxvY2FsUm93KTtcbiAgICAgICAgICAgICAgICBncmlkLl9jb2xvciA9IGdyaWQuY29sb3I7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgbWFya0dyYXlIaW50OiBmdW5jdGlvbiAoZ3JpZCwgbG9jYWxDb2wsIGxvY2FsUm93KSB7XG4gICAgICAgIHZhciBncmF5Q29sb3IgPSBjYy5jb2xvcig5MCwgOTAsIDkwKTtcbiAgICAgICAgdmFyIGlzTGVmdCA9ICh0aGlzLkNPTCAvIGxvY2FsQ29sKSA+IDI7XG4gICAgICAgIHZhciBpc0JvdHRvbSA9ICh0aGlzLlJPVyAvIGxvY2FsUm93KSA+IDI7XG4gICAgICAgIGlmIChsb2NhbENvbCA9PT0gTWF0aC5mbG9vcih0aGlzLkNPTCAvIDIpIHx8XG4gICAgICAgICAgICBsb2NhbENvbCA9PT0gTWF0aC5mbG9vcih0aGlzLkNPTCAvIDIpIC0gMSB8fFxuICAgICAgICAgICAgbG9jYWxSb3cgPT09IE1hdGguZmxvb3IodGhpcy5ST1cgLyAyKSB8fFxuICAgICAgICAgICAgbG9jYWxSb3cgPT09IE1hdGguZmxvb3IodGhpcy5ST1cgLyAyKSAtIDFcbiAgICAgICAgKSB7XG4gICAgICAgICAgICBncmlkLnNldENvbG9yKGdyYXlDb2xvcik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgaWlpID0gaXNMZWZ0ID8gNCA6IDA7XG5cbiAgICAgICAgaWYgKGxvY2FsQ29sICUgNSA9PT0gaWlpKSB7XG4gICAgICAgICAgICBncmlkLnNldENvbG9yKGdyYXlDb2xvcik7XG4gICAgICAgIH1cblxuICAgICAgICB2YXIgampqID0gaXNCb3R0b20gPyA0IDogMDtcblxuICAgICAgICBpZiAobG9jYWxSb3cgJSA1ID09PSBqamopIHtcbiAgICAgICAgICAgIGdyaWQuc2V0Q29sb3IoZ3JheUNvbG9yKTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlpaSA9IGlzTGVmdCA/IDkgOiAwO1xuICAgICAgICBqamogPSBpc0JvdHRvbSA/IDkgOiAwO1xuXG4gICAgICAgIGlmIChsb2NhbENvbCAlIDEwID09PSBpaWkgJiYgbG9jYWxSb3cgJSAxMCA9PT0gampqKSB7XG4gICAgICAgICAgICBncmlkLnNldENvbG9yKGNjLmNvbG9yLllFTExPVyk7XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgcmVzZXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgZm9yICh2YXIgbG9jYWxDb2wgPSAwOyBsb2NhbENvbCA8IHRoaXMuQ09MOyArK2xvY2FsQ29sKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IDA7IGxvY2FsUm93IDwgdGhpcy5ST1c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd10uZWRpdGluZyA9IGZhbHNlO1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS5zZXRDb2xvcihjYy5jb2xvci5HUkFZKTtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd10udXNlZCA9IGZhbHNlO1xuXG4gICAgICAgICAgICAgICAgdGhpcy5tYXJrR3JheUhpbnQodGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddLCBsb2NhbENvbCwgbG9jYWxSb3cpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIHRoaXMuYnJpY2tSZWN0cyA9IFtdO1xuICAgICAgICB0aGlzLm9ic3RhY2xlUmVjdHMgPSBbXTtcbiAgICAgICAgdGhpcy5jdXJyZW50UmVjdHMgPSB0aGlzLmJyaWNrUmVjdHM7XG4gICAgICAgIHRoaXMuX2lzQnJpY2sgPSB0cnVlO1xuICAgICAgICB0aGlzLl9icmlja0l0ZW0uc2V0U3RyaW5nKFwiQnJpY2tcIik7XG4gICAgfSxcblxuICAgIG9uRW50ZXI6ZnVuY3Rpb24gKCkge1xuICAgICAgICB0aGlzLl9zdXBlcigpO1xuICAgICAgICBjYy5ldmVudE1hbmFnZXIuYWRkTGlzdGVuZXIoe1xuICAgICAgICAgICAgZXZlbnQ6IGNjLkV2ZW50TGlzdGVuZXIuVE9VQ0hfT05FX0JZX09ORSxcbiAgICAgICAgICAgIHN3YWxsb3dUb3VjaGVzOiB0cnVlLFxuICAgICAgICAgICAgb25Ub3VjaEJlZ2FuOiB0aGlzLm9uVG91Y2hCZWdhbi5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25Ub3VjaE1vdmVkOiB0aGlzLm9uVG91Y2hNb3ZlZC5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25Ub3VjaEVuZGVkOiB0aGlzLm9uVG91Y2hFbmRlZC5iaW5kKHRoaXMpLFxuICAgICAgICAgICAgb25Ub3VjaENhbmNlbGxlZDogdGhpcy5vblRvdWNoQ2FuY2VsbGVkLmJpbmQodGhpcylcbiAgICAgICAgfSwgdGhpcy5ncmlkTm9kZSk7XG5cbiAgICAgICAgLy9jYy5ldmVudE1hbmFnZXIuYWRkTGlzdGVuZXIoe1xuICAgICAgICAvLyAgICBldmVudDogY2MuRXZlbnRMaXN0ZW5lci5LRVlCT0FSRCxcbiAgICAgICAgLy8gICAgb25LZXlSZWxlYXNlZDogZnVuY3Rpb24gKGtleUNvZGUsIGV2ZW50KSB7XG4gICAgICAgIC8vICAgICAgICBpZiAoa2V5Q29kZSA9PT0gY2MuS0VZLmJhY2tzcGFjZSkge1xuICAgICAgICAvLyAgICAgICAgICAgIC8vY2MuZGlyZWN0b3IuZW5kKCk7XG4gICAgICAgIC8vICAgICAgICAgICAgdGhpcy5kZWxldGVMYXRlc3RSZWN0KCk7XG4gICAgICAgIC8vICAgICAgICB9XG4gICAgICAgIC8vICAgIH0uYmluZCh0aGlzKVxuICAgICAgICAvL30sIHRoaXMpO1xuICAgIH0sXG5cbiAgICBvbkV4aXQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdGhpcy5fc3VwZXIoKTtcbiAgICB9LFxuXG4gICAgZ2V0R3JpZFBvczogZnVuY3Rpb24gKGxvY2FsQ29sLCBsb2NhbFJvdykge1xuICAgICAgICB2YXIgZ3JpZFNpemUgPSB0aGlzLmdldEdyaWRTaXplKCk7XG4gICAgICAgIHJldHVybiBjYy5wKChncmlkU2l6ZS53aWR0aCArIHRoaXMuR0FQX1dJRFRIKSAqIChsb2NhbENvbCArIDAuNSksXG4gICAgICAgICAgICAoZ3JpZFNpemUuaGVpZ2h0ICsgdGhpcy5HQVBfSEVJR0hUKSAqIChsb2NhbFJvdyArIDAuNSkpO1xuICAgIH0sXG5cbiAgICBnZXRHcmlkU2l6ZTogZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gY2Muc2l6ZSh0aGlzLkdSSURfV0lEVEgsIHRoaXMuR1JJRF9IRUlHSFQpO1xuICAgIH0sXG5cbiAgICBnZXRGdWxsR3JpZFNpemU6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGNjLnNpemUodGhpcy5HUklEX1dJRFRIICsgdGhpcy5HQVBfV0lEVEgsIHRoaXMuR1JJRF9IRUlHSFQgKyB0aGlzLkdBUF9IRUlHSFQpO1xuICAgIH0sXG5cbiAgICBvblRvdWNoQmVnYW46ZnVuY3Rpb24odG91Y2gsIGV2ZW50KSB7XG4gICAgICAgIHZhciBncmlkID0gdGhpcy5nZXRDbG9zZXN0R3JpZCh0b3VjaCk7XG4gICAgICAgIGlmIChncmlkLnVzZWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICB0aGlzLmZpcnN0R3JpZCA9IGdyaWQ7XG4gICAgICAgIGdyaWQuc2V0Q29sb3IodGhpcy5nZXRDdXJyZW50Q29sb3IoKSk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBvblRvdWNoTW92ZWQ6ZnVuY3Rpb24odG91Y2gsIGV2ZW50KSB7XG4gICAgICAgIHRoaXMudG91Y2hEcmF3KHRvdWNoKTtcbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfSxcblxuICAgIG9uVG91Y2hFbmRlZDpmdW5jdGlvbih0b3VjaCwgZXZlbnQpIHtcbiAgICAgICAgdGhpcy50b3VjaERyYXcodG91Y2gpO1xuXG4gICAgICAgIGlmICh0aGlzLmZpcnN0R3JpZCAmJiB0aGlzLmxhc3RHcmlkKSB7XG4gICAgICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24odGhpcy5maXJzdEdyaWQsIHRoaXMubGFzdEdyaWQpO1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gdGhpcy5zZWxlY3RDb2xvckluZGV4ICsgMTtcbiAgICAgICAgICAgIGlmICghdGhpcy5faXNCcmljaykge1xuICAgICAgICAgICAgICAgIGluZGV4ID0gMDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHRoaXMuY3VycmVudFJlY3RzLnB1c2goW3JlZ2lvbi5taW5Db2wsIHJlZ2lvbi5taW5Sb3csXG4gICAgICAgICAgICAgICAgcmVnaW9uLm1heENvbCAtIHJlZ2lvbi5taW5Db2wgKyAxLCByZWdpb24ubWF4Um93IC0gcmVnaW9uLm1pblJvdyArIDEsIGluZGV4XSk7XG5cbiAgICAgICAgICAgIHRoaXMubWFya09jY3VwaWVkKCk7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IDA7IGxvY2FsQ29sIDwgdGhpcy5DT0w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IDA7IGxvY2FsUm93IDwgdGhpcy5ST1c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgICB0aGlzLmZpcnN0R3JpZCA9IG51bGw7XG4gICAgICAgIHRoaXMubGFzdEdyaWQgPSBudWxsO1xuICAgIH0sXG5cbiAgICBtYXJrT2NjdXBpZWQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIHJlZ2lvbiA9IHRoaXMuZ2V0UmVnaW9uKHRoaXMuZmlyc3RHcmlkLCB0aGlzLmxhc3RHcmlkKTtcblxuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IHJlZ2lvbi5taW5Db2w7IGxvY2FsQ29sIDw9IHJlZ2lvbi5tYXhDb2w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gcmVnaW9uLm1pblJvdzsgbG9jYWxSb3cgPD0gcmVnaW9uLm1heFJvdzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgIHRoaXMuZ3JpZHNbbG9jYWxDb2xdW2xvY2FsUm93XS51c2VkID0gdHJ1ZTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0sXG5cbiAgICBpc09jY3VwaWVkOiBmdW5jdGlvbiAoZ3JpZCkge1xuICAgICAgICB2YXIgcmVnaW9uID0gdGhpcy5nZXRSZWdpb24odGhpcy5maXJzdEdyaWQsIGdyaWQpO1xuICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IHJlZ2lvbi5taW5Db2w7IGxvY2FsQ29sIDw9IHJlZ2lvbi5tYXhDb2w7ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgIGZvciAodmFyIGxvY2FsUm93ID0gcmVnaW9uLm1pblJvdzsgbG9jYWxSb3cgPD0gcmVnaW9uLm1heFJvdzsgKytsb2NhbFJvdykge1xuICAgICAgICAgICAgICAgIGlmICh0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd10udXNlZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH0sXG5cbiAgICB0b3VjaERyYXc6IGZ1bmN0aW9uICh0b3VjaCkge1xuICAgICAgICBpZiAoIXRoaXMuZmlyc3RHcmlkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdmFyIGdyaWQgPSB0aGlzLmdldENsb3Nlc3RHcmlkKHRvdWNoKTtcblxuICAgICAgICBpZiAoIWdyaWQpIHtcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChncmlkID09PSB0aGlzLmxhc3RHcmlkKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodGhpcy5pc09jY3VwaWVkKGdyaWQpKSB7XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgdGhpcy5sYXN0R3JpZCA9IGdyaWQ7XG4gICAgICAgIHRoaXMuY2xlYXJSZWN0KCk7XG4gICAgICAgIHRoaXMuZHJhd1JlY3QoZ3JpZCk7XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH0sXG5cbiAgICBkZWxldGVMYXRlc3RSZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciByZWN0ID0gdGhpcy5jdXJyZW50UmVjdHMucG9wKCk7XG4gICAgICAgIGlmIChyZWN0KSB7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbENvbCA9IHJlY3RbMF07IGxvY2FsQ29sIDwgcmVjdFswXSArIHJlY3RbMl07ICsrbG9jYWxDb2wpIHtcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IHJlY3RbMV07IGxvY2FsUm93IDwgcmVjdFsxXSArIHJlY3RbM107ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGdyaWQgPSB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd107XG4gICAgICAgICAgICAgICAgICAgIGdyaWQuc2V0Q29sb3IoZ3JpZC5fY29sb3IpO1xuICAgICAgICAgICAgICAgICAgICBncmlkLnVzZWQgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgY2xlYXJSZWN0OiBmdW5jdGlvbiAoKSB7XG4gICAgICAgIGZvciAodmFyIGxvY2FsQ29sID0gMDsgbG9jYWxDb2wgPCB0aGlzLkNPTDsgKytsb2NhbENvbCkge1xuICAgICAgICAgICAgZm9yICh2YXIgbG9jYWxSb3cgPSAwOyBsb2NhbFJvdyA8IHRoaXMuUk9XOyArK2xvY2FsUm93KSB7XG4gICAgICAgICAgICAgICAgdmFyIGdyaWQgPSB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd107XG4gICAgICAgICAgICAgICAgaWYgKGdyaWQuZWRpdGluZyAmJiAhZ3JpZC51c2VkKSB7XG4gICAgICAgICAgICAgICAgICAgIGdyaWQuc2V0Q29sb3IoZ3JpZC5fY29sb3IpO1xuICAgICAgICAgICAgICAgICAgICBncmlkLmVkaXRpbmcgPSBmYWxzZTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9LFxuXG4gICAgZHJhd1JlY3Q6IGZ1bmN0aW9uIChncmlkKSB7XG4gICAgICAgIHZhciByZWdpb24gPSB0aGlzLmdldFJlZ2lvbih0aGlzLmZpcnN0R3JpZCwgZ3JpZCk7XG5cbiAgICAgICAgZm9yICh2YXIgbG9jYWxDb2wgPSByZWdpb24ubWluQ29sOyBsb2NhbENvbCA8PSByZWdpb24ubWF4Q29sOyArK2xvY2FsQ29sKSB7XG4gICAgICAgICAgICBmb3IgKHZhciBsb2NhbFJvdyA9IHJlZ2lvbi5taW5Sb3c7IGxvY2FsUm93IDw9IHJlZ2lvbi5tYXhSb3c7ICsrbG9jYWxSb3cpIHtcbiAgICAgICAgICAgICAgICB0aGlzLmdyaWRzW2xvY2FsQ29sXVtsb2NhbFJvd10uZWRpdGluZyA9IHRydWU7XG4gICAgICAgICAgICAgICAgdGhpcy5ncmlkc1tsb2NhbENvbF1bbG9jYWxSb3ddLnNldENvbG9yKHRoaXMuZ2V0Q3VycmVudENvbG9yKCkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSxcblxuICAgIGdldFJlZ2lvbjogZnVuY3Rpb24gKGdyaWQxLCBncmlkMikge1xuICAgICAgICB2YXIgbWluUm93ID0gTWF0aC5taW4oZ3JpZDEucm93LCBncmlkMi5yb3cpO1xuICAgICAgICB2YXIgbWF4Um93ID0gTWF0aC5tYXgoZ3JpZDEucm93LCBncmlkMi5yb3cpO1xuICAgICAgICB2YXIgbWluQ29sID0gTWF0aC5taW4oZ3JpZDEuY29sLCBncmlkMi5jb2wpO1xuICAgICAgICB2YXIgbWF4Q29sID0gTWF0aC5tYXgoZ3JpZDEuY29sLCBncmlkMi5jb2wpO1xuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgbWluUm93OiBtaW5Sb3csXG4gICAgICAgICAgICBtYXhSb3c6IG1heFJvdyxcbiAgICAgICAgICAgIG1pbkNvbDogbWluQ29sLFxuICAgICAgICAgICAgbWF4Q29sOiBtYXhDb2xcbiAgICAgICAgfTtcbiAgICB9LFxuXG4gICAgb25Ub3VjaENhbmNlbGxlZDpmdW5jdGlvbih0b3VjaCwgZXZlbnQpIHtcbiAgICB9LFxuXG4gICAgZ2V0Q2xvc2VzdEdyaWQ6IGZ1bmN0aW9uICh0b3VjaCkge1xuICAgICAgICB2YXIgbG9jYWxQb3MgPSB0aGlzLmdyaWROb2RlLmNvbnZlcnRUb05vZGVTcGFjZSh0b3VjaC5nZXRMb2NhdGlvbigpKTtcbiAgICAgICAgdmFyIGdyaWRTaXplID0gdGhpcy5nZXRGdWxsR3JpZFNpemUoKTtcblxuICAgICAgICBjYy5sb2coXCJsb2NhbFBvczpcIiArIEpTT04uc3RyaW5naWZ5KGxvY2FsUG9zKSk7XG5cbiAgICAgICAgdmFyIHJvdyA9IE1hdGguZmxvb3IobG9jYWxQb3MueCAvIGdyaWRTaXplLndpZHRoKTtcbiAgICAgICAgdmFyIGNvbCA9IE1hdGguZmxvb3IobG9jYWxQb3MueSAvIGdyaWRTaXplLmhlaWdodCk7XG5cbiAgICAgICAgY2MubG9nKFwicm93OlwiICsgcm93ICsgXCIsY29sOlwiICsgY29sKTtcblxuICAgICAgICByZXR1cm4gdGhpcy5ncmlkc1tyb3ddW2NvbF07XG4gICAgfSxcblxuICAgIGdldEN1cnJlbnRDb2xvcjogZnVuY3Rpb24gKCkge1xuICAgICAgICBpZiAodGhpcy5faXNCcmljaykge1xuICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2VsZWN0Q29sb3I7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gY2MuY29sb3IuV0hJVEU7XG4gICAgICAgIH1cbiAgICB9XG4gICAgLy9cbiAgICAvL2RyYXdSZWN0OiBmdW5jdGlvbihyZWdpb24sIGNvbG9yLCBjbGVhcikge1xuICAgIC8vICAgIGlmIChjbGVhcil7XG4gICAgLy8gICAgICAgIHRoaXMuX2RyYXdOb2RlLmNsZWFyKCk7XG4gICAgLy8gICAgfVxuICAgIC8vICAgIGlmIChyZWdpb24gPT0gbnVsbCkge1xuICAgIC8vICAgICAgICByZXR1cm47XG4gICAgLy8gICAgfVxuICAgIC8vICAgIHZhciBtaW4gPSByZWdpb24uZ2V0TWluKCk7XG4gICAgLy8gICAgdmFyIG1heCA9IHJlZ2lvbi5nZXRNYXgoKTtcbiAgICAvLyAgICBtYXgueCArPSAxO1xuICAgIC8vICAgIG1heC55ICs9IDE7XG4gICAgLy8gICAgdGhpcy5fZHJhd05vZGUuZHJhd1NlZ21lbnQoY2MucChtaW4ueCwgbWluLnkpLFxuICAgIC8vICAgICAgICBjYy5wKG1pbi54LCBtYXgueSksIDEsIGNvbG9yKTtcbiAgICAvLyAgICB0aGlzLl9kcmF3Tm9kZS5kcmF3U2VnbWVudChjYy5wKG1pbi54LCBtYXgueSksXG4gICAgLy8gICAgICAgIGNjLnAobWF4LngsIG1heC55KSwgMSwgY29sb3IpO1xuICAgIC8vICAgIHRoaXMuX2RyYXdOb2RlLmRyYXdTZWdtZW50KGNjLnAobWF4LngsIG1heC55KSxcbiAgICAvLyAgICAgICAgY2MucChtYXgueCwgbWluLnkpLCAxLCBjb2xvcik7XG4gICAgLy8gICAgdGhpcy5fZHJhd05vZGUuZHJhd1NlZ21lbnQoY2MucChtYXgueCwgbWluLnkpLFxuICAgIC8vICAgICAgICBjYy5wKG1pbi54LCBtaW4ueSksIDEsIGNvbG9yKTtcbiAgICAvL30sXG4gICAgLy9cbiAgICAvL2RyYXdSZWN0RmlsbDogZnVuY3Rpb24gKHJlZ2lvbiwgY29sb3IpIHtcbiAgICAvLyAgICBpZiAocmVnaW9uID09IG51bGwpIHtcbiAgICAvLyAgICAgICAgcmV0dXJuO1xuICAgIC8vICAgIH1cbiAgICAvLyAgICB0aGlzLl9kcmF3Tm9kZS5kcmF3UmVjdChyZWdpb24uZ2V0TWluKCksIHJlZ2lvbi5nZXRNYXgoKSwgY29sb3IsIDEsIGNvbG9yKTtcbiAgICAvL31cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVkaXRvclNjZW5lOyIsIi8qKlxuICogQSBicmllZiBleHBsYW5hdGlvbiBmb3IgXCJwcm9qZWN0Lmpzb25cIjpcbiAqIEhlcmUgaXMgdGhlIGNvbnRlbnQgb2YgcHJvamVjdC5qc29uIGZpbGUsIHRoaXMgaXMgdGhlIGdsb2JhbCBjb25maWd1cmF0aW9uIGZvciB5b3VyIGdhbWUsIHlvdSBjYW4gbW9kaWZ5IGl0IHRvIGN1c3RvbWl6ZSBzb21lIGJlaGF2aW9yLlxuICogVGhlIGRldGFpbCBvZiBlYWNoIGZpZWxkIGlzIHVuZGVyIGl0LlxuIHtcbiAgICBcInByb2plY3RfdHlwZVwiOiBcImphdmFzY3JpcHRcIixcbiAgICAvLyBcInByb2plY3RfdHlwZVwiIGluZGljYXRlIHRoZSBwcm9ncmFtIGxhbmd1YWdlIG9mIHlvdXIgcHJvamVjdCwgeW91IGNhbiBpZ25vcmUgdGhpcyBmaWVsZFxuXG4gICAgXCJkZWJ1Z01vZGVcIiAgICAgOiAxLFxuICAgIC8vIFwiZGVidWdNb2RlXCIgcG9zc2libGUgdmFsdWVzIDpcbiAgICAvLyAgICAgIDAgLSBObyBtZXNzYWdlIHdpbGwgYmUgcHJpbnRlZC5cbiAgICAvLyAgICAgIDEgLSBjYy5lcnJvciwgY2MuYXNzZXJ0LCBjYy53YXJuLCBjYy5sb2cgd2lsbCBwcmludCBpbiBjb25zb2xlLlxuICAgIC8vICAgICAgMiAtIGNjLmVycm9yLCBjYy5hc3NlcnQsIGNjLndhcm4gd2lsbCBwcmludCBpbiBjb25zb2xlLlxuICAgIC8vICAgICAgMyAtIGNjLmVycm9yLCBjYy5hc3NlcnQgd2lsbCBwcmludCBpbiBjb25zb2xlLlxuICAgIC8vICAgICAgNCAtIGNjLmVycm9yLCBjYy5hc3NlcnQsIGNjLndhcm4sIGNjLmxvZyB3aWxsIHByaW50IG9uIGNhbnZhcywgYXZhaWxhYmxlIG9ubHkgb24gd2ViLlxuICAgIC8vICAgICAgNSAtIGNjLmVycm9yLCBjYy5hc3NlcnQsIGNjLndhcm4gd2lsbCBwcmludCBvbiBjYW52YXMsIGF2YWlsYWJsZSBvbmx5IG9uIHdlYi5cbiAgICAvLyAgICAgIDYgLSBjYy5lcnJvciwgY2MuYXNzZXJ0IHdpbGwgcHJpbnQgb24gY2FudmFzLCBhdmFpbGFibGUgb25seSBvbiB3ZWIuXG5cbiAgICBcInNob3dGUFNcIiAgICAgICA6IHRydWUsXG4gICAgLy8gTGVmdCBib3R0b20gY29ybmVyIGZwcyBpbmZvcm1hdGlvbiB3aWxsIHNob3cgd2hlbiBcInNob3dGUFNcIiBlcXVhbHMgdHJ1ZSwgb3RoZXJ3aXNlIGl0IHdpbGwgYmUgaGlkZS5cblxuICAgIFwiZnJhbWVSYXRlXCIgICAgIDogNjAsXG4gICAgLy8gXCJmcmFtZVJhdGVcIiBzZXQgdGhlIHdhbnRlZCBmcmFtZSByYXRlIGZvciB5b3VyIGdhbWUsIGJ1dCB0aGUgcmVhbCBmcHMgZGVwZW5kcyBvbiB5b3VyIGdhbWUgaW1wbGVtZW50YXRpb24gYW5kIHRoZSBydW5uaW5nIGVudmlyb25tZW50LlxuXG4gICAgXCJpZFwiICAgICAgICAgICAgOiBcImdhbWVDYW52YXNcIixcbiAgICAvLyBcImdhbWVDYW52YXNcIiBzZXRzIHRoZSBpZCBvZiB5b3VyIGNhbnZhcyBlbGVtZW50IG9uIHRoZSB3ZWIgcGFnZSwgaXQncyB1c2VmdWwgb25seSBvbiB3ZWIuXG5cbiAgICBcInJlbmRlck1vZGVcIiAgICA6IDAsXG4gICAgLy8gXCJyZW5kZXJNb2RlXCIgc2V0cyB0aGUgcmVuZGVyZXIgdHlwZSwgb25seSB1c2VmdWwgb24gd2ViIDpcbiAgICAvLyAgICAgIDAgLSBBdXRvbWF0aWNhbGx5IGNob3NlbiBieSBlbmdpbmVcbiAgICAvLyAgICAgIDEgLSBGb3JjZWQgdG8gdXNlIGNhbnZhcyByZW5kZXJlclxuICAgIC8vICAgICAgMiAtIEZvcmNlZCB0byB1c2UgV2ViR0wgcmVuZGVyZXIsIGJ1dCB0aGlzIHdpbGwgYmUgaWdub3JlZCBvbiBtb2JpbGUgYnJvd3NlcnNcblxuICAgIFwiZW5naW5lRGlyXCIgICAgIDogXCJmcmFtZXdvcmtzL2NvY29zMmQtaHRtbDUvXCIsXG4gICAgLy8gSW4gZGVidWcgbW9kZSwgaWYgeW91IHVzZSB0aGUgd2hvbGUgZW5naW5lIHRvIGRldmVsb3AgeW91ciBnYW1lLCB5b3Ugc2hvdWxkIHNwZWNpZnkgaXRzIHJlbGF0aXZlIHBhdGggd2l0aCBcImVuZ2luZURpclwiLFxuICAgIC8vIGJ1dCBpZiB5b3UgYXJlIHVzaW5nIGEgc2luZ2xlIGVuZ2luZSBmaWxlLCB5b3UgY2FuIGlnbm9yZSBpdC5cblxuICAgIFwibW9kdWxlc1wiICAgICAgIDogW1wiY29jb3MyZFwiXSxcbiAgICAvLyBcIm1vZHVsZXNcIiBkZWZpbmVzIHdoaWNoIG1vZHVsZXMgeW91IHdpbGwgbmVlZCBpbiB5b3VyIGdhbWUsIGl0J3MgdXNlZnVsIG9ubHkgb24gd2ViLFxuICAgIC8vIHVzaW5nIHRoaXMgY2FuIGdyZWF0bHkgcmVkdWNlIHlvdXIgZ2FtZSdzIHJlc291cmNlIHNpemUsIGFuZCB0aGUgY29jb3MgY29uc29sZSB0b29sIGNhbiBwYWNrYWdlIHlvdXIgZ2FtZSB3aXRoIG9ubHkgdGhlIG1vZHVsZXMgeW91IHNldC5cbiAgICAvLyBGb3IgZGV0YWlscyBhYm91dCBtb2R1bGVzIGRlZmluaXRpb25zLCB5b3UgY2FuIHJlZmVyIHRvIFwiLi4vLi4vZnJhbWV3b3Jrcy9jb2NvczJkLWh0bWw1L21vZHVsZXNDb25maWcuanNvblwiLlxuXG4gICAgXCJqc0xpc3RcIiAgICAgICAgOiBbXG4gICAgXVxuICAgIC8vIFwianNMaXN0XCIgc2V0cyB0aGUgbGlzdCBvZiBqcyBmaWxlcyBpbiB5b3VyIGdhbWUuXG4gfVxuICpcbiAqL1xuXG5jYy5nYW1lLm9uU3RhcnQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIWNjLnN5cy5pc05hdGl2ZSAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvY29zTG9hZGluZ1wiKSlcbiAgICAgICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImNvY29zTG9hZGluZ1wiKSk7XG5cbiAgICBjYy52aWV3LmVuYWJsZVJldGluYShmYWxzZSk7XG4gICAgY2Mudmlldy5hZGp1c3RWaWV3UG9ydCh0cnVlKTtcblxuICAgIC8qXG4gICAgdmFyIExvZ2ljTWFuID0gcmVxdWlyZShcIi4vY29tbW9uL21vZGVsL0xvZ2ljTWFuXCIpO1xuICAgIExvZ2ljTWFuLmdldEluc3RhbmNlKCkuaW5pdCgpO1xuXG4gICAgdmFyIFV0aWxzID0gcmVxdWlyZShcIi4vY29tbW9uL3V0aWwvVXRpbHNcIik7XG4gICAgaWYgKGNjLnN5cy5pc05hdGl2ZSkge1xuICAgICAgICB2YXIgd2lkdGggPSAwO1xuICAgICAgICB2YXIgaGVpZ2h0ID0gMDtcbiAgICAgICAgaWYgKCEhR2FtZUJyaWRnZS5nZXRDb25maWcoKS5ob3Jpem9udGFsR2FtZSkge1xuICAgICAgICAgICAgaGVpZ2h0ID0gNjQwO1xuICAgICAgICAgICAgaWYgKFV0aWxzLmlzUGFkKCkpIHtcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSA3Njg7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICB3aWR0aCA9IGhlaWdodCAqIGNjLndpblNpemUud2lkdGggLyBjYy53aW5TaXplLmhlaWdodDtcbiAgICAgICAgICAgIGNjLmxvZyhcImNjLndpblNpemUud2lkdGg6XCIgKyBjYy53aW5TaXplLndpZHRoKTtcbiAgICAgICAgICAgIGNjLmxvZyhcImNjLndpblNpemUuaGVpZ2h0OlwiICsgY2Mud2luU2l6ZS5oZWlnaHQpO1xuXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBoZWlnaHQgPSAxMTM2O1xuICAgICAgICAgICAgaWYgKFV0aWxzLmlzUGFkKCkpIHtcbiAgICAgICAgICAgICAgICBoZWlnaHQgPSAxMDI0O1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgd2lkdGggPSBoZWlnaHQgKiBjYy53aW5TaXplLndpZHRoIC8gY2Mud2luU2l6ZS5oZWlnaHQ7XG4gICAgICAgIH1cbiAgICAgICAgY2MubG9nKFwid2lkdGg6XCIgKyB3aWR0aCk7XG4gICAgICAgIGNjLmxvZyhcImhlaWdodDpcIiArIGhlaWdodCk7XG4gICAgICAgIGNjLnZpZXcuc2V0RGVzaWduUmVzb2x1dGlvblNpemUod2lkdGgsIGhlaWdodCwgY2MuUmVzb2x1dGlvblBvbGljeS5TSE9XX0FMTCk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgaWYgKCEhR2FtZUJyaWRnZS5nZXRDb25maWcoKS5ob3Jpem9udGFsR2FtZSkge1xuICAgICAgICAgICAgY2Mudmlldy5zZXREZXNpZ25SZXNvbHV0aW9uU2l6ZSg5NjAsIDY0MCwgY2MuUmVzb2x1dGlvblBvbGljeS5TSE9XX0FMTCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBjYy52aWV3LnNldERlc2lnblJlc29sdXRpb25TaXplKDY0MCwgOTYwLCBjYy5SZXNvbHV0aW9uUG9saWN5LlNIT1dfQUxMKTtcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8vIFRoZSBnYW1lIHdpbGwgYmUgcmVzaXplZCB3aGVuIGJyb3dzZXIgc2l6ZSBjaGFuZ2VcbiAgICBjYy5CdWlsZGVyUmVhZGVyLnNldFJlc291cmNlUGF0aChcInJlcy9cIik7XG4gICAgY2Mudmlldy5yZXNpemVXaXRoQnJvd3NlclNpemUodHJ1ZSk7XG5cbiAgICBnYW1lLmRpYWxvZ01hbmFnZXIuY3JlYXRlT3ZlcmxheSgpO1xuXG4gICAgaWYgKGNjLnN5cy5pc05hdGl2ZSkge1xuICAgICAgICBnYW1lLmxvY2FsLnJlbG9hZCgpO1xuICAgICAgICBjYy5kaXJlY3Rvci5ydW5TY2VuZShuZXcgR2FtZUJyaWRnZS5nZXRNZW51U2NlbmUoKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgICAgY2MubG9hZGVyLmxvYWRKc29uKFwicmVzL3Jlc291cmNlX2xpc3QvcmVzb3VyY2VfbGlzdC5qc29uXCIsIGZ1bmN0aW9uIChlcnJvciwgcmVzdWx0KSB7XG4gICAgICAgICAgICBpZiAoIWVycm9yKSB7XG4gICAgICAgICAgICAgICAgY2MuTG9hZGVyU2NlbmUucHJlbG9hZChyZXN1bHQsIGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgZ2FtZS5sb2NhbC5yZWxvYWQoKTtcbiAgICAgICAgICAgICAgICAgICAgY2MuZGlyZWN0b3IucnVuU2NlbmUoR2FtZUJyaWRnZS5nZXRNZW51U2NlbmUoKSk7XG4gICAgICAgICAgICAgICAgfSwgdGhpcyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pO1xuICAgIH1cbiAgICAqL1xuICAgIGNjLnZpZXcucmVzaXplV2l0aEJyb3dzZXJTaXplKHRydWUpO1xuICAgIGNjLnZpZXcuc2V0RGVzaWduUmVzb2x1dGlvblNpemUoMTAwMCwgNzAwLCBjYy5SZXNvbHV0aW9uUG9saWN5LlNIT1dfQUxMKTtcbiAgICBjYy5Mb2FkZXJTY2VuZS5wcmVsb2FkKFtdLCBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHZhciBFZGl0b3JTY2VuZSA9IHJlcXVpcmUoXCIuL2VkaXRvci9zY2VuZS9FZGl0b3JTY2VuZVwiKTtcbiAgICAgICAgY2MuZGlyZWN0b3IucnVuU2NlbmUobmV3IEVkaXRvclNjZW5lKCkpO1xuICAgIH0pO1xufTtcbmNjLmdhbWUucnVuKCk7XG4iXX0=
