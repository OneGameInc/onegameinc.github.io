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
    }
};

module.exports = GameBridge;