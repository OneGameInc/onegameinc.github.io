var GameBridge = {
    getMenuScene: function () {
        var MenuScene = require("../../riseup/scene/MenuScene");
        return new MenuScene();
    },

    getConfig: function () {
        return require("../../riseup/config/Config");
    },

    getPopupMan: function () {
        return require("../../riseup/model/PopupMan");
    },

    getGameMan: function () {
        return require("../../riseup/model/GameMan").getInstance();
    }
};

module.exports = GameBridge;