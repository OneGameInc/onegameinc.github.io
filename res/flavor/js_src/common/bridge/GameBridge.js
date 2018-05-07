var GameBridge = {
    getMenuScene: function () {
        var MenuScene = require("../../notesquare/scene/MenuScene");
        return new MenuScene();
    },

    getConfig: function () {
        return require("../../notesquare/config/Config");
    },

    getPopupMan: function () {
        return require("../../notesquare/model/PopupMan");
    }
};

module.exports = GameBridge;