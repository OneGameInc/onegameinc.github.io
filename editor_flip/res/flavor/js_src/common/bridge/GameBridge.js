var GameBridge = {
    getMenuScene: function () {
        var MenuScene = require("../../many_bricks/scene/MenuScene");
        return new MenuScene();
    },

    getConfig: function () {
        return require("../../many_bricks/config/Config");
    },

    getPopupMan: function () {
        return require("../../many_bricks/model/PopupMan");
    },

    getLoadingScene: function () {
        var LoadingScene = require("../../many_bricks/scene/LoadingScene");
        return new LoadingScene();
    },

    getGameMan: function () {
        var GameMan = require("../../many_bricks/model/GameMan");
        return GameMan.getInstance();
    }
};

module.exports = GameBridge;